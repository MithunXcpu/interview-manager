"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import Header from "@/components/Header";

interface Company {
  id: string;
  name: string;
}

interface Email {
  id: string;
  gmailId?: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  isRead: boolean;
  isRecruiterEmail: boolean;
  detectedCompany?: string;
  companyId?: string;
  company?: Company;
  threadId?: string;
}

interface AvailabilitySlot {
  date: string;
  times: string[];
}

const QUICK_REPLIES = [
  {
    id: "availability",
    label: "Share Availability",
    icon: "📅",
    template: `Hi {name},

Thank you for reaching out! I'm very interested in learning more about this opportunity.

I'm available for a call at the following times:
{availability}

Please feel free to pick a slot that works for you, or let me know if none of these work and I'll send more options.

Looking forward to speaking with you!

Best regards`,
  },
  {
    id: "interested",
    label: "Express Interest",
    icon: "✨",
    template: `Hi {name},

Thank you for thinking of me for this role! The position sounds very interesting and aligns well with my background.

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
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [filter, setFilter] = useState<"all" | "recruiters" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bookingSlug, setBookingSlug] = useState("me");
  const [userName, setUserName] = useState("Candidate");
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  const bookingLink = typeof window !== "undefined" ? `${window.location.origin}/book/${bookingSlug}` : "";

  // Fetch emails and user data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [emailsRes, userRes] = await Promise.all([
          fetch(`/api/emails?filter=${filter}`),
          fetch("/api/user"),
        ]);

        if (emailsRes.ok) {
          const data = await emailsRes.json();
          setEmails(data.emails);
        }

        if (userRes.ok) {
          const data = await userRes.json();
          setBookingSlug(data.user.bookingLink?.slug || "me");
          setUserName(data.user.name || "Candidate");
          setUserPhone(data.user.phone || "");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  const syncEmails = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/emails?filter=${filter}&sync=true`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails);
      }
    } catch (error) {
      console.error("Error syncing emails:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const response = await fetch("/api/calendar?type=availability&days=7&duration=30");
      if (response.ok) {
        const data = await response.json();
        setAvailabilitySlots(data.slots || []);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const formatAvailability = () => {
    if (availabilitySlots.length === 0) {
      return `Book time with me: ${bookingLink}`;
    }

    const lines: string[] = [];
    availabilitySlots.slice(0, 5).forEach((slot) => {
      const date = new Date(slot.date);
      const dayName = format(date, "EEEE, MMMM d");
      const times = slot.times.slice(0, 3).map((t) => {
        const [h, m] = t.split(":");
        const hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${hour12}:${m} ${ampm}`;
      });
      lines.push(`• ${dayName}: ${times.join(", ")}`);
    });

    return lines.join("\n") + `\n\nOr book directly: ${bookingLink}`;
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setReplyText("");

    if (!email.isRead) {
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));

      try {
        await fetch("/api/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", emailId: email.id }),
        });
      } catch (error) {
        console.error("Error marking email as read:", error);
      }
    }
  };

  const handleQuickReply = async (template: string) => {
    if (!selectedEmail) return;

    const firstName = selectedEmail.from.split(" ")[0];

    // Fetch availability if the template needs it
    if (template.includes("{availability}")) {
      await fetchAvailability();
    }

    let reply = template
      .replace("{name}", firstName)
      .replace("{availability}", formatAvailability());

    setReplyText(reply);
  };

  const insertAvailability = async () => {
    setIsLoadingAvailability(true);
    await fetchAvailability();
    const availText = formatAvailability();
    setReplyText((prev) => prev + "\n\n" + availText);
    setIsLoadingAvailability(false);
  };

  const generateAIReply = async () => {
    if (!selectedEmail) return;

    setIsGeneratingAI(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_reply",
          data: {
            email: {
              from: selectedEmail.from,
              body: selectedEmail.body || selectedEmail.preview,
              subject: selectedEmail.subject,
            },
            bookingLink,
            userName,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          setReplyText(data.reply);
        } else {
          // Fallback if no reply returned
          const firstName = selectedEmail.from.split(" ")[0];
          setReplyText(`Hi ${firstName},\n\nThank you for reaching out! I'm very interested in learning more about this opportunity.\n\nI'm available for a conversation at your convenience. You can book a time directly on my calendar: ${bookingLink}\n\nLooking forward to speaking with you!\n\nBest regards,\n${userName}`);
        }
      } else {
        // Error response - use fallback
        const firstName = selectedEmail.from.split(" ")[0];
        setReplyText(`Hi ${firstName},\n\nThank you for reaching out! I'm very interested in learning more about this opportunity.\n\nI'm available for a conversation at your convenience. You can book a time directly on my calendar: ${bookingLink}\n\nLooking forward to speaking with you!\n\nBest regards,\n${userName}`);
      }
    } catch (error) {
      console.error("Error generating AI reply:", error);
      // Fallback on error
      const firstName = selectedEmail?.from.split(" ")[0] || "there";
      setReplyText(`Hi ${firstName},\n\nThank you for reaching out! I'm very interested in learning more about this opportunity.\n\nI'm available for a conversation at your convenience. You can book a time directly on my calendar: ${bookingLink}\n\nLooking forward to speaking with you!\n\nBest regards,\n${userName}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          data: {
            to: selectedEmail.fromEmail,
            subject: `Re: ${selectedEmail.subject}`,
            body: replyText,
            threadId: selectedEmail.threadId,
          },
        }),
      });

      if (response.ok) {
        setReplyText("");
        alert("Reply sent successfully!");
      } else {
        alert("Failed to send reply");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  const createCompanyFromEmail = async () => {
    if (!selectedEmail) return;

    setIsCreatingCompany(true);
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_company",
          emailId: selectedEmail.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedEmail({
          ...selectedEmail,
          companyId: data.company.id,
          company: data.company,
        });
        setEmails((prev) =>
          prev.map((e) =>
            e.id === selectedEmail.id
              ? { ...e, companyId: data.company.id, company: data.company }
              : e
          )
        );
        alert(`Company "${data.company.name}" created and added to your pipeline!`);
      }
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Failed to create company");
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const [isCreatingMeet, setIsCreatingMeet] = useState(false);
  const [userPhone, setUserPhone] = useState("");

  const insertMeetingLink = async (type: "google_meet" | "zoom" | "phone" | "booking") => {
    if (type === "google_meet") {
      // Create a real Google Meet link via calendar API
      setIsCreatingMeet(true);
      try {
        const response = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_meet_link",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.meetLink) {
            setReplyText((prev) => prev + `\n\nJoin Google Meet: ${data.meetLink}`);
          } else {
            setReplyText((prev) => prev + `\n\nBook time with me: ${bookingLink}`);
          }
        } else {
          // Fallback to booking link if Meet creation fails
          setReplyText((prev) => prev + `\n\nBook time with me: ${bookingLink}`);
        }
      } catch (error) {
        console.error("Error creating Meet link:", error);
        setReplyText((prev) => prev + `\n\nBook time with me: ${bookingLink}`);
      } finally {
        setIsCreatingMeet(false);
      }
    } else {
      const links: Record<string, string> = {
        zoom: "\n\nZoom link: https://zoom.us/j/xxxxxxxxx (Please add your personal Zoom link in settings)",
        phone: userPhone ? `\n\nFeel free to call me at: ${userPhone}` : "\n\nFeel free to call me at: (Add your phone in settings)",
        booking: `\n\nBook time with me: ${bookingLink}`,
      };
      setReplyText((prev) => prev + links[type]);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />

      {/* Sub-header with actions */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-end gap-2">
          <button
            onClick={syncEmails}
            disabled={isSyncing}
            className="btn btn-secondary text-sm"
          >
            {isSyncing ? "Syncing..." : "🔄 Sync"}
          </button>
          <button onClick={() => setShowCompose(true)} className="btn btn-primary text-sm">
            + Compose
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Email List */}
        <div
          className={`w-full md:w-[400px] border-r border-[var(--border)] flex flex-col ${
            selectedEmail ? "hidden md:flex" : ""
          }`}
        >
          {/* Filters */}
          <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
            {(["all", "recruiters", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                  filter === f
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--secondary)] text-[var(--muted)] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Email Items */}
          <div className="flex-1 overflow-y-auto">
            {emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--muted)]">
                <span className="text-4xl mb-4">📭</span>
                <p>No emails found</p>
                <button onClick={syncEmails} className="mt-4 btn btn-secondary text-sm">
                  Sync Emails
                </button>
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={`email-item ${!email.isRead ? "unread" : ""} ${
                    selectedEmail?.id === email.id ? "bg-[var(--primary)]/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          !email.isRead ? "text-white" : "text-[var(--muted)]"
                        }`}
                      >
                        {email.from}
                      </span>
                      {email.isRecruiterEmail && (
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
                  <div className="mt-2 flex gap-2">
                    {email.detectedCompany && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--secondary)] rounded-full">
                        {email.detectedCompany}
                      </span>
                    )}
                    {email.company && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                        ✓ {email.company.name}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
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
                <div className="flex items-center gap-2">
                  {selectedEmail.isRecruiterEmail && !selectedEmail.companyId && (
                    <button
                      onClick={createCompanyFromEmail}
                      disabled={isCreatingCompany}
                      className="btn btn-secondary text-sm"
                    >
                      {isCreatingCompany ? "Creating..." : "➕ Create Company"}
                    </button>
                  )}
                  {selectedEmail.company && (
                    <Link
                      href="/dashboard"
                      className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm"
                    >
                      View in Pipeline
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="whitespace-pre-wrap text-[var(--foreground)]">{selectedEmail.body}</div>
            </div>

            {/* Reply Section */}
            <div className="border-t border-[var(--border)] p-4">
              {/* Quick Replies */}
              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] mb-2">Quick Replies:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map((reply) => (
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--muted)]">Insert:</span>
                  <button
                    onClick={insertAvailability}
                    disabled={isLoadingAvailability}
                    className="px-2 py-1 bg-[var(--primary)]/20 rounded text-xs hover:bg-[var(--primary)]/30 text-[var(--primary)]"
                  >
                    {isLoadingAvailability ? "Loading..." : "📅 My Availability"}
                  </button>
                  <button
                    onClick={() => insertMeetingLink("booking")}
                    className="px-2 py-1 bg-[var(--secondary)] rounded text-xs hover:bg-[var(--primary)]/20"
                  >
                    🔗 Booking Link
                  </button>
                  <button
                    onClick={() => insertMeetingLink("google_meet")}
                    disabled={isCreatingMeet}
                    className="px-2 py-1 bg-[var(--secondary)] rounded text-xs hover:bg-[var(--primary)]/20 disabled:opacity-50"
                  >
                    {isCreatingMeet ? "Creating..." : "📹 Google Meet"}
                  </button>
                  <button
                    onClick={() => insertMeetingLink("phone")}
                    className="px-2 py-1 bg-[var(--secondary)] rounded text-xs hover:bg-[var(--primary)]/20"
                  >
                    📞 Phone
                  </button>
                </div>
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || isSendingReply}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {isSendingReply ? "Sending..." : "Send Reply"}
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
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Email</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-[var(--muted)] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <input type="email" placeholder="To" className="input" />
              <input type="text" placeholder="Subject" className="input" />
              <textarea placeholder="Write your message..." className="input min-h-[200px]" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCompose(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button className="btn btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
