import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "generate_reply": {
        const { email, bookingLink, userName } = data;

        if (!anthropic) {
          // Return demo response if no API key
          return NextResponse.json({
            reply: `Hi ${email.from.split(" ")[0]},

Thank you for reaching out about this opportunity! I'm very interested in learning more.

I'm available for a conversation at your convenience. You can book a time directly on my calendar: ${bookingLink}

Looking forward to speaking with you!

Best regards,
${userName || "Candidate"}`,
          });
        }

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are helping a job candidate respond to a recruiter email. Generate a professional, friendly reply.

Original email from ${email.from}:
${email.body}

The candidate's booking link: ${bookingLink}
Candidate name: ${userName || "Candidate"}

Write a reply that:
1. Thanks them for reaching out
2. Expresses interest in the role
3. Includes the booking link for scheduling
4. Keeps it concise and professional

Reply:`,
            },
          ],
        });

        const reply = message.content[0].type === "text" ? message.content[0].text : "";

        return NextResponse.json({ reply });
      }

      case "search_interviewer": {
        const { name, role, company } = body;

        if (!anthropic) {
          // Return demo response if no API key
          return NextResponse.json({
            summary: `${name} is a ${role} at ${company}. Based on publicly available information: Experienced professional with a strong background in technology. Known for conducting technical interviews focused on problem-solving and system design. Active on LinkedIn with connections in the tech industry.`,
          });
        }

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `Provide a brief professional summary for an interviewer that a job candidate might find helpful. This is for interview preparation.

Name: ${name}
Role: ${role}
Company: ${company}

Generate a helpful 2-3 sentence summary about what this person likely focuses on in interviews, based on their role. Do not make up specific personal details, but provide useful context about what someone in this role typically looks for.

Summary:`,
            },
          ],
        });

        const summary = message.content[0].type === "text" ? message.content[0].text : "";

        return NextResponse.json({ summary });
      }

      case "detect_company": {
        const { emailContent, fromEmail } = data;

        // Simple detection based on email domain
        const domain = fromEmail.split("@")[1]?.split(".")[0];
        const companyNames: Record<string, string> = {
          google: "Google",
          stripe: "Stripe",
          meta: "Meta",
          amazon: "Amazon",
          apple: "Apple",
          microsoft: "Microsoft",
          netflix: "Netflix",
          airbnb: "Airbnb",
          openai: "OpenAI",
          anthropic: "Anthropic",
        };

        const detectedCompany = companyNames[domain?.toLowerCase() || ""] || null;

        return NextResponse.json({ company: detectedCompany });
      }

      case "summarize_email": {
        const { emailContent } = data;

        if (!anthropic) {
          return NextResponse.json({
            summary: "Recruiter reaching out about job opportunity. Requesting availability for initial call.",
            actionItems: ["Reply with availability", "Research company"],
          });
        }

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 256,
          messages: [
            {
              role: "user",
              content: `Summarize this recruiter email in one sentence and list any action items:

${emailContent}

Format:
Summary: [one sentence]
Action items: [comma-separated list]`,
            },
          ],
        });

        const response = message.content[0].type === "text" ? message.content[0].text : "";
        const summaryMatch = response.match(/Summary:\s*(.+)/);
        const actionsMatch = response.match(/Action items:\s*(.+)/);

        return NextResponse.json({
          summary: summaryMatch?.[1] || "Email from recruiter",
          actionItems: actionsMatch?.[1]?.split(",").map(s => s.trim()) || [],
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}
