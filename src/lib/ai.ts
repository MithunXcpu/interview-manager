import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function summarizeEmail(emailBody: string, subject: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Summarize this email in 1-2 sentences. Focus on: who it's from, what they want, and any action items.

Subject: ${subject}

Email:
${emailBody}

Summary:`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === "text") {
    return content.text;
  }
  return "Could not summarize email.";
}

export async function generateEmailReply(
  emailBody: string,
  subject: string,
  context: {
    userName: string;
    companyName?: string;
    recruiterName?: string;
    bookingLink?: string;
    tone?: "professional" | "friendly" | "enthusiastic";
  }
): Promise<string> {
  const toneInstructions = {
    professional: "formal and professional",
    friendly: "friendly but professional",
    enthusiastic: "enthusiastic and eager",
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are helping ${context.userName} respond to a recruiter email. Write a ${toneInstructions[context.tone || "professional"]} reply.

${context.companyName ? `Company: ${context.companyName}` : ""}
${context.recruiterName ? `Recruiter: ${context.recruiterName}` : ""}
${context.bookingLink ? `Include this scheduling link naturally: ${context.bookingLink}` : ""}

Original Email Subject: ${subject}
Original Email:
${emailBody}

Write a reply that:
1. Thanks them for reaching out (if appropriate)
2. Shows interest in the opportunity
3. Addresses any questions they asked
4. ${context.bookingLink ? "Offers to schedule a call using the booking link" : "Asks about next steps or scheduling"}
5. Signs off professionally

Reply (just the email body, no subject):`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === "text") {
    return content.text;
  }
  return "";
}

export async function detectCompanyFromEmail(
  emailBody: string,
  from: string,
  subject: string
): Promise<{ companyName: string | null; recruiterName: string | null; isRecruiter: boolean }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Analyze this email and determine if it's from a recruiter about a job opportunity.

From: ${from}
Subject: ${subject}
Body: ${emailBody}

Respond in JSON format:
{
  "isRecruiter": true/false,
  "companyName": "Company Name" or null,
  "recruiterName": "Recruiter's First Name" or null
}

JSON:`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === "text") {
    try {
      return JSON.parse(content.text);
    } catch {
      return { companyName: null, recruiterName: null, isRecruiter: false };
    }
  }
  return { companyName: null, recruiterName: null, isRecruiter: false };
}

export async function generateAvailabilityMessage(
  slots: { day: string; times: string[] }[],
  bookingLink: string,
  recruiterName?: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Write a brief, professional message sharing availability for an interview call.

${recruiterName ? `Recruiter name: ${recruiterName}` : ""}
Booking link: ${bookingLink}

Available times:
${slots.map((s) => `${s.day}: ${s.times.join(", ")}`).join("\n")}

Write a short message (2-3 sentences) that:
1. Thanks them
2. Shares the availability or booking link
3. Is professional and friendly

Message:`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === "text") {
    return content.text;
  }
  return `I'm available at the following times. You can also book directly here: ${bookingLink}`;
}
