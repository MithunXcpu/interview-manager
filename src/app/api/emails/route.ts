import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { listEmails, getEmail, sendEmail } from "@/lib/google";
import { detectCompanyFromEmail } from "@/lib/ai";

// Demo emails for when Google isn't connected
const DEMO_EMAILS = [
  {
    id: "demo-1",
    from: "Sarah Chen",
    fromEmail: "sarah.chen@google.com",
    subject: "RE: Senior Software Engineer Position at Google",
    preview: "Hi! Thanks for your interest in the role. I'd love to schedule a call...",
    body: `Hi!

Thanks for your interest in the Senior Software Engineer position at Google. Your background looks great!

I'd love to schedule a call to discuss the role and learn more about your experience. Would you have any availability this week for a 30-minute chat?

Looking forward to hearing from you!

Best,
Sarah Chen
Technical Recruiter, Google`,
    date: new Date().toISOString(),
    isRead: false,
    isRecruiterEmail: true,
    detectedCompany: "Google",
  },
  {
    id: "demo-2",
    from: "David Kim",
    fromEmail: "david@stripe.com",
    subject: "Following up - Full Stack Engineer role",
    preview: "Hey! Just wanted to follow up on our conversation from last week...",
    body: `Hey!

Just wanted to follow up on our conversation from last week. The team was really impressed with your technical assessment.

We'd like to move forward with the next round - a system design interview with one of our senior engineers.

What does your calendar look like next week?

Thanks,
David Kim
Stripe Recruiting`,
    date: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    isRecruiterEmail: true,
    detectedCompany: "Stripe",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const sync = searchParams.get("sync") === "true";

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If Google is connected, fetch real emails
    if (user.googleAccessToken && user.googleRefreshToken) {
      try {
        // Fetch emails from Gmail
        const gmailMessages = await listEmails(
          user.googleAccessToken,
          user.googleRefreshToken,
          20
        );

        // If sync requested, store emails in database
        if (sync && gmailMessages.length > 0) {
          for (const msg of gmailMessages) {
            if (!msg.id) continue;
            try {
              const fullEmail = await getEmail(
                user.googleAccessToken,
                msg.id,
                user.googleRefreshToken
              );

              if (fullEmail) {
                // Use AI to detect if it's a recruiter email
                const aiResult = await detectCompanyFromEmail(
                  fullEmail.body || fullEmail.snippet || "",
                  fullEmail.from,
                  fullEmail.subject
                );

                // Upsert email to database
                await db.email.upsert({
                  where: { gmailId: fullEmail.id },
                  update: {
                    subject: fullEmail.subject,
                    snippet: fullEmail.snippet,
                    body: fullEmail.body,
                    isRead: !fullEmail.labelIds?.includes("UNREAD"),
                    isRecruiterEmail: aiResult.isRecruiter,
                    detectedCompany: aiResult.companyName,
                  },
                  create: {
                    userId: user.id,
                    gmailId: fullEmail.id,
                    threadId: fullEmail.threadId,
                    from: fullEmail.from,
                    to: fullEmail.to || user.email,
                    subject: fullEmail.subject,
                    snippet: fullEmail.snippet,
                    body: fullEmail.body,
                    isRead: !fullEmail.labelIds?.includes("UNREAD"),
                    receivedAt: new Date(fullEmail.date),
                    isRecruiterEmail: aiResult.isRecruiter,
                    detectedCompany: aiResult.companyName,
                  },
                });
              }
            } catch (emailError) {
              console.error("Error processing email:", emailError);
            }
          }
        }

        // Fetch emails from database
        let whereClause: Record<string, unknown> = { userId: user.id };

        if (filter === "recruiters") {
          whereClause.isRecruiterEmail = true;
        } else if (filter === "unread") {
          whereClause.isRead = false;
        }

        const emails = await db.email.findMany({
          where: whereClause,
          orderBy: { receivedAt: "desc" },
          take: 50,
          include: {
            company: true,
          },
        });

        const transformedEmails = emails.map((email) => ({
          id: email.id,
          gmailId: email.gmailId,
          from: email.from.split("<")[0].trim(),
          fromEmail: email.from.match(/<(.+)>/)?.[1] || email.from,
          subject: email.subject,
          preview: email.snippet || "",
          body: email.body || email.snippet || "",
          date: email.receivedAt.toISOString(),
          isRead: email.isRead,
          isRecruiterEmail: email.isRecruiterEmail,
          detectedCompany: email.detectedCompany,
          companyId: email.companyId,
          company: email.company,
          threadId: email.threadId,
        }));

        return NextResponse.json({ emails: transformedEmails });
      } catch (gmailError) {
        console.error("Gmail API error:", gmailError);
        // Fall back to database emails
        const emails = await db.email.findMany({
          where: { userId: user.id },
          orderBy: { receivedAt: "desc" },
          take: 50,
        });

        if (emails.length > 0) {
          return NextResponse.json({
            emails: emails.map((email) => ({
              id: email.id,
              gmailId: email.gmailId,
              from: email.from.split("<")[0].trim(),
              fromEmail: email.from.match(/<(.+)>/)?.[1] || email.from,
              subject: email.subject,
              preview: email.snippet || "",
              body: email.body || email.snippet || "",
              date: email.receivedAt.toISOString(),
              isRead: email.isRead,
              isRecruiterEmail: email.isRecruiterEmail,
              detectedCompany: email.detectedCompany,
            })),
          });
        }
      }
    }

    // Return demo data if no Google connection
    let emails = [...DEMO_EMAILS];

    if (filter === "recruiters") {
      emails = emails.filter((e) => e.isRecruiterEmail);
    } else if (filter === "unread") {
      emails = emails.filter((e) => !e.isRead);
    }

    return NextResponse.json({ emails, isDemo: true });
  } catch (error) {
    console.error("Error fetching emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, emailId, data } = body;

    switch (action) {
      case "send": {
        const { to, subject, body: emailBody, threadId } = data;

        if (!to || !subject || !emailBody) {
          return NextResponse.json(
            { error: "To, subject, and body are required" },
            { status: 400 }
          );
        }

        // If Google is connected, send via Gmail API
        if (user.googleAccessToken && user.googleRefreshToken) {
          try {
            const result = await sendEmail(
              user.googleAccessToken,
              to,
              subject,
              emailBody,
              threadId,
              user.googleRefreshToken
            );

            return NextResponse.json({
              success: true,
              message: "Email sent successfully",
              messageId: result.id,
            });
          } catch (gmailError) {
            console.error("Gmail send error:", gmailError);
            return NextResponse.json(
              { error: "Failed to send email via Gmail" },
              { status: 500 }
            );
          }
        }

        // Demo mode
        console.log(`[Demo] Sending email to ${to}: ${subject}`);
        return NextResponse.json({
          success: true,
          message: "Email sent successfully (demo mode)",
        });
      }

      case "reply": {
        const { to, subject, body: replyBody, threadId } = data;

        if (!to || !replyBody) {
          return NextResponse.json(
            { error: "To and body are required" },
            { status: 400 }
          );
        }

        // If Google is connected, send via Gmail API
        if (user.googleAccessToken && user.googleRefreshToken) {
          try {
            const result = await sendEmail(
              user.googleAccessToken,
              to,
              subject || "Re: ",
              replyBody,
              threadId,
              user.googleRefreshToken
            );

            return NextResponse.json({
              success: true,
              message: "Reply sent successfully",
              messageId: result.id,
            });
          } catch (gmailError) {
            console.error("Gmail reply error:", gmailError);
            return NextResponse.json(
              { error: "Failed to send reply via Gmail" },
              { status: 500 }
            );
          }
        }

        // Demo mode
        console.log(`[Demo] Replying to ${to}`);
        return NextResponse.json({
          success: true,
          message: "Reply sent successfully (demo mode)",
        });
      }

      case "mark_read": {
        if (!emailId) {
          return NextResponse.json(
            { error: "Email ID is required" },
            { status: 400 }
          );
        }

        await db.email.update({
          where: { id: emailId, userId: user.id },
          data: { isRead: true },
        });

        return NextResponse.json({ success: true });
      }

      case "link_company": {
        const { companyId } = data;

        if (!emailId || !companyId) {
          return NextResponse.json(
            { error: "Email ID and company ID are required" },
            { status: 400 }
          );
        }

        await db.email.update({
          where: { id: emailId, userId: user.id },
          data: { companyId },
        });

        return NextResponse.json({ success: true });
      }

      case "create_company": {
        if (!emailId) {
          return NextResponse.json(
            { error: "Email ID is required" },
            { status: 400 }
          );
        }

        const email = await db.email.findUnique({
          where: { id: emailId, userId: user.id },
        });

        if (!email) {
          return NextResponse.json({ error: "Email not found" }, { status: 404 });
        }

        // Get default stage
        const defaultStage = await db.userStage.findFirst({
          where: { userId: user.id, isEnabled: true },
          orderBy: { order: "asc" },
        });

        // Create company from email
        const company = await db.company.create({
          data: {
            userId: user.id,
            name: email.detectedCompany || "Unknown Company",
            recruiterEmail: email.from.match(/<(.+)>/)?.[1] || email.from,
            recruiterName: email.from.split("<")[0].trim(),
            stageId: defaultStage?.id,
          },
        });

        // Link email to company
        await db.email.update({
          where: { id: emailId },
          data: { companyId: company.id },
        });

        return NextResponse.json({
          success: true,
          company,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Email operation failed" },
      { status: 500 }
    );
  }
}
