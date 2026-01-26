import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Demo emails for when Google isn't connected
const DEMO_EMAILS = [
  {
    id: "1",
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
    isRecruiter: true,
    detectedCompany: "Google",
    labels: ["recruiter", "action-needed"],
  },
  {
    id: "2",
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
    isRecruiter: true,
    detectedCompany: "Stripe",
    labels: ["recruiter"],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    // In production, fetch emails from Gmail API
    // For now, return demo data
    let emails = [...DEMO_EMAILS];

    if (filter === "recruiters") {
      emails = emails.filter(e => e.isRecruiter);
    } else if (filter === "unread") {
      emails = emails.filter(e => !e.isRead);
    }

    return NextResponse.json({ emails });
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

    const body = await request.json();
    const { action, emailId, data } = body;

    switch (action) {
      case "send": {
        const { to, subject, body: emailBody } = data;

        if (!to || !subject || !emailBody) {
          return NextResponse.json(
            { error: "To, subject, and body are required" },
            { status: 400 }
          );
        }

        // In production, send via Gmail API
        console.log(`Sending email to ${to}: ${subject}`);

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
        });
      }

      case "reply": {
        const { replyTo, body: replyBody } = data;

        if (!replyTo || !replyBody) {
          return NextResponse.json(
            { error: "Reply-to and body are required" },
            { status: 400 }
          );
        }

        // In production, send reply via Gmail API
        console.log(`Replying to ${replyTo}`);

        return NextResponse.json({
          success: true,
          message: "Reply sent successfully",
        });
      }

      case "mark_read": {
        if (!emailId) {
          return NextResponse.json(
            { error: "Email ID is required" },
            { status: 400 }
          );
        }

        // In production, mark as read via Gmail API
        return NextResponse.json({ success: true });
      }

      case "archive": {
        if (!emailId) {
          return NextResponse.json(
            { error: "Email ID is required" },
            { status: 400 }
          );
        }

        // In production, archive via Gmail API
        return NextResponse.json({ success: true });
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
