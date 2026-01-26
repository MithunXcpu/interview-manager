import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function getAuthUrl(state?: string) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function getAuthenticatedClient(accessToken: string, refreshToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return client;
}

export async function refreshAccessToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Gmail API helpers
export async function getGmailClient(accessToken: string, refreshToken?: string) {
  const auth = getAuthenticatedClient(accessToken, refreshToken);
  return google.gmail({ version: "v1", auth });
}

export async function listEmails(accessToken: string, refreshToken?: string, maxResults = 20) {
  const gmail = await getGmailClient(accessToken, refreshToken);
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "category:primary", // Focus on primary inbox
  });
  return response.data.messages || [];
}

export async function getEmail(accessToken: string, messageId: string, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  return response.data;
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  refreshToken?: string
) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });

  return response.data;
}

// Calendar API helpers
export async function getCalendarClient(accessToken: string, refreshToken?: string) {
  const auth = getAuthenticatedClient(accessToken, refreshToken);
  return google.calendar({ version: "v3", auth });
}

export async function listCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  refreshToken?: string
) {
  const calendar = await getCalendarClient(accessToken, refreshToken);
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return response.data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    conferenceData?: boolean; // Create Google Meet link
  },
  refreshToken?: string
) {
  const calendar = await getCalendarClient(accessToken, refreshToken);

  const eventData: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.start.toISOString(),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: "America/New_York",
    },
    attendees: event.attendees?.map((email) => ({ email })),
  };

  if (event.conferenceData) {
    eventData.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventData,
    conferenceDataVersion: event.conferenceData ? 1 : 0,
    sendUpdates: "all",
  });

  return response.data;
}

export async function getFreeBusy(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  refreshToken?: string
) {
  const calendar = await getCalendarClient(accessToken, refreshToken);
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });
  return response.data.calendars?.primary?.busy || [];
}
