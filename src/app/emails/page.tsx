"use client";

import { useState } from "react";
import Link from "next/link";

interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  isRead: boolean;
  isRecruiter: boolean;
  detectedCompany?: string;
  labels: string[];
}

const DEMO_EMAILS: Email[] = [
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
    date: "2025-01-25T10:30:00",
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

We'd like to move forward with the next round - a system design interview with one of our senior engineers. This would be a 1-hour session.

What does your calendar look like next week?

Thanks,
David Kim
Stripe Recruiting`,
    date: "2025-01-24T15:45:00",
    isRead: true,
    isRecruiter: true,
    detectedCompany: "Stripe",
    labels: ["recruiter"],
  },
  {
    id: "3",
    from: "LinkedIn",
    fromEmail: "notifications@linkedin.com",
    subject: "5 new jobs match your preferences",
    preview: "Senior Engineer roles at Netflix, Airbnb, and more...",
    body: `5 new jobs match your preferences:

1. Senior Software Engineer at Netflix
2. Backend Engineer at Airbnb
3. Staff Engineer at Figma
4. Platform Engineer at Databricks
5. Software Engineer at Notion

Click to view and apply.`,
    date: "2025-01-24T09:00:00",
    isRead: true,
    isRecruiter: false,
    labels: [],
  },
  {
    id: "4",
    from: "Lisa Wang",
    fromEmail: "lwang@openai.com",
    subject: "Offer Letter - ML Engineer at OpenAI",
    preview: "Congratulations! We're thrilled to extend an offer for the ML Engineer position...",
    body: `Hi!

Congratulations! We're thrilled to extend an offer for the ML Engineer position at OpenAI.

Please find the attached offer letter with all the details including:
- Base salary: $280,000
- Equity: 0.05% over 4 years
- Sign-on bonus: $50,000
- Start date: February 15, 2025

Please let me know if you have any questions. We'd love to have you join the team!

Best,
Lisa Wang
Hiring Manager, OpenAI`,
    date: "2025-01-23T14:20:00",
    isRead: true,
    isRecruiter: true,
    detectedCompany: "OpenAI",
    labels: ["recruiter", "offer"],
  },
];

const QUICK_REPLIES = [
  {
    id: "availability",
    label: "Share Availability",
    icon: "📅",
    template: `Hi {name},

Thank you for reaching out! I'm very interested in learning more about this opportunity.

I'm available for a call at the following times:
{availability_link}

Please feel free to pick a slot that works for you, or let me know if none of these work and I'll send more options.

Looking forward to speaking with you!

Best regards`,
  },
  {
    id: "interested",
    label: "Express Interest",
    icon: "✨",
    template: `Hi {name},

Thank you for thinking of me for this role! The position sounds very interesting and aligns well with my background in {skills}.

I'd love to learn more about the team and the technical challenges you're working on. Would you be available for a brief call this week?

Best regards`,
  },
  {
    id: "more_info",
    label: "Request Info",
    icon: "❓",
    template: `Hi {name},

Thank you for reaching out about this opportunity. Before we proceed, I'd love to learn more about:

- The team size and structure
- The tech stack you're using
- The main challenges the team is tackling

Could you share some more details?

Best regards`,
  },
  {
    id: "decline",
    label: "Politely Decline",
    icon: "🙏",
    template: `Hi {name},

Thank you so much for considering me for this role. After careful consideration, I've decided to pursue other opportunities that are a closer fit for my career goals at this time.

I really appreciate your time and would love to stay in touch for future opportunities.

Best regards`,
  },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>(DEMO_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [filter, setFilter] = useState<"all" | "recruiters" | "unread">("all");

  const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/book/me` : '';

  const filteredEmails = emails.filter(email => {
    if (filter === "recruiters") return email.isRecruiter;
    if (filter === "unread") return !email.isRead;
    return true;
  });

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
    }
  };

  const handleQuickReply = (template: string) => {
    if (!selectedEmail) return;

    const firstName = selectedEmail.from.split(" ")[0];
    let reply = template
      .replace("{name}", firstName)
      .replace("{skills}", "software engineering")
      .replace("{availability_link}", bookingLink);

    setReplyText(reply);
  };

  const generateAIReply = async () => {
    if (!selectedEmail) return;

    setIsGeneratingAI(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const firstName = selectedEmail.from.split(" ")[0];
    const aiReply = `Hi ${firstName},

Thank you for reaching out about the ${selectedEmail.detectedCompany || "opportunity"}! I'm excited about this role and would love to discuss it further.

I'm available for a conversation at your convenience. You can book a time directly on my calendar here: ${bookingLink}

Alternatively, I'm free:
- Tomorrow between 10am-12pm PT
- Wednesday after 2pm PT
- Thursday morning

Looking forward to connecting!

Best regards`;

    setReplyText(aiReply);
    setIsGeneratingAI(false);
  };

  const insertMeetingLink = (type: "google_meet" | "zoom" | "phone") => {
    const links: Record<string, string> = {
      google_meet: "\n\nGoogle Meet link: https://meet.google.com/xxx-xxxx-xxx",
      zoom: "\n\nZoom link: https://zoom.us/j/xxxxxxxxx",
      phone: "\n\nFeel free to call me at: (555) 123-4567",
    };
    setReplyText(prev => prev + links[type]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span>📋</span>
              </div>
              <span className="font-bold hidden sm:block">Interview Manager</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]">
                Pipeline
              </Link>
              <Link href="/emails" className="px-3 py-1.5 rounded-lg text-sm bg-[var(--primary)]/20 text-[var(--primary)]">
                Emails
              </Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]">
                Settings
              </Link>
            </nav>
          </div>

          <button
            onClick={() => setShowCompose(true)}
            className="btn btn-primary text-sm"
          >
            + Compose
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Email List */}
        <div className={`w-full md:w-[400px] border-r border-[var(--border)] flex flex-col ${selectedEmail ? "hidden md:flex" : ""}`}>
          {/* Filters */}
          <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
            {(["all", "recruiters", "unread"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                  filter === f ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted)] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Email Items */}
          <div className="flex-1 overflow-y-auto">
            {filteredEmails.map(email => (
              <div
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={`email-item ${!email.isRead ? "unread" : ""} ${selectedEmail?.id === email.id ? "bg-[var(--primary)]/10" : ""}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!email.isRead ? "text-white" : "text-[var(--muted)]"}`}>
                      {email.from}
                    </span>
                    {email.isRecruiter && (
                      <span className="px-1.5 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] text-xs rounded">
                        Recruiter
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)]">{formatDate(email.date)}</span>
                </div>
                <p className={`text-sm mb-1 ${!email.isRead ? "text-white font-medium" : ""}`}>
                  {email.subject}
                </p>
                <p className="text-xs text-[var(--muted)] line-clamp-1">{email.preview}</p>
                {email.detectedCompany && (
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 bg-[var(--secondary)] rounded-full">
                      {email.detectedCompany}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Email Detail */}
        {selectedEmail ? (
          <div className="flex-1 flex flex-col">
            {/* Email Header */}
            <div className="p-4 border-b border-[var(--border)]">
              <button
                onClick={() => setSelectedEmail(null)}
                className="md:hidden text-[var(--muted)] hover:text-white mb-4"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold mb-4">{selectedEmail.subject}</h1>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                    {selectedEmail.from.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{selectedEmail.from}</p>
                    <p className="text-sm text-[var(--muted)]">{selectedEmail.fromEmail}</p>
                  </div>
                </div>
                <span className="text-sm text-[var(--muted)]">
                  {new Date(selectedEmail.date).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="whitespace-pre-wrap text-[var(--foreground)]">
                {selectedEmail.body}
              </div>
            </div>

            {/* Reply Section */}
            <div className="border-t border-[var(--border)] p-4">
              {/* Quick Replies */}
              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] mb-2">Quick Replies:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map(reply => (
                    <button
                      key={reply.id}
                      onClick={() => handleQuickReply(reply.template)}
                      className="quick-action text-xs"
                    >
                      <span>{reply.icon}</span>
                      {reply.label}
                    </button>
                  ))}
                  <button
                    onClick={generateAIReply}
                    disabled={isGeneratingAI}
                    className="quick-action text-xs bg-[var(--primary)]/20 border-[var(--primary)]"
                  >
                    <span>🤖</span>
                    {isGeneratingAI ? "Generating..." : "AI Reply"}
                  </button>
                </div>
              </div>

              {/* Reply Textarea */}
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="input min-h-[120px] mb-3"
              />

              {/* Insert Links */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">Insert:</span>
                  <button
                    onClick={() => insertMeetingLink("google_meet")}
                    className="px-2 py-1 bg-[var(--secondary)] rounded text-xs hover:bg-[var(--primary)]/20"
                  >
                    📹 Google Meet
                  </button>
                  <button
                    onClick={() => insertMeetingLink("zoom")}
                    className="px-2 py-1 bg-[var(--secondary)] rounded text-xs hover:bg-[var(--primary)]/20"
                  >
                    💻 Zoom
                  </button>
                  <button
                    onClick={() => insertMeetingLink("phone")}
                    className="px-2 py-1 bg-[var(--secondary)] rounded text-xs hover:bg-[var(--primary)]/20"
                  >
                    📞 Phone
                  </button>
                  <button
                    onClick={() => setReplyText(prev => prev + `\n\nBook time with me: ${bookingLink}`)}
                    className="px-2 py-1 bg-[var(--primary)]/20 rounded text-xs hover:bg-[var(--primary)]/30 text-[var(--primary)]"
                  >
                    📅 Booking Link
                  </button>
                </div>
                <button
                  disabled={!replyText.trim()}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-[var(--muted)]">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📬</span>
              <p>Select an email to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Email</h2>
              <button onClick={() => setShowCompose(false)} className="text-[var(--muted)] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <input type="email" placeholder="To" className="input" />
              <input type="text" placeholder="Subject" className="input" />
              <textarea placeholder="Write your message..." className="input min-h-[200px]" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCompose(false)} className="btn btn-secondary">Cancel</button>
                <button className="btn btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
