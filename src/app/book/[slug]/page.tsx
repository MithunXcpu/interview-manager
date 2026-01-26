"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type MeetingType = "GOOGLE_MEET" | "ZOOM" | "PHONE";

type BookingInfo = {
  slug: string;
  title: string;
  description: string | null;
  duration: number;
  meetingType: MeetingType;
};

type HostInfo = {
  name: string;
  timezone: string;
};

type AvailableSlot = {
  date: string;
  times: string[];
};

const MEETING_TYPES: { key: MeetingType; label: string; icon: string; description: string }[] = [
  { key: "GOOGLE_MEET", label: "Google Meet", icon: "📹", description: "Video call via Google Meet" },
  { key: "ZOOM", label: "Zoom", icon: "💻", description: "Video call via Zoom" },
  { key: "PHONE", label: "Phone Call", icon: "📞", description: "I'll call you" },
];

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);

  const [step, setStep] = useState<"date" | "time" | "details" | "confirmed">("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>("GOOGLE_MEET");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    notes: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    meetLink?: string;
    hostName?: string;
    duration?: number;
    title?: string;
  } | null>(null);

  // Fetch booking info and availability
  useEffect(() => {
    async function fetchAvailability() {
      try {
        setLoading(true);
        const response = await fetch(`/api/book/${slug}?days=14`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load booking page");
          return;
        }

        setBookingInfo(data.bookingLink);
        setHostInfo(data.host);
        setAvailableSlots(data.slots);
        setMeetingType(data.bookingLink.meetingType);
      } catch {
        setError("Failed to load booking page");
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [slug]);

  // Generate next 14 days for display
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date.toISOString().split("T")[0];
  });

  const availableDates = availableSlots.map((s) => s.date);

  const timeSlots = selectedDate
    ? availableSlots.find((s) => s.date === selectedDate)?.times || []
    : [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    };
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          name: formData.name,
          email: formData.email,
          company: formData.company,
          role: formData.role,
          notes: formData.notes,
          phone: formData.phone,
          meetingType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      setBookingResult(data.booking);
      setStep("confirmed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (error || !bookingInfo) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
          <p className="text-[var(--muted)] mb-6">
            {error || "This booking link is no longer available."}
          </p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span>📋</span>
            </div>
            <span className="font-bold">Interview Manager</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {step === "confirmed" ? (
          /* Confirmation */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">You're booked!</h1>
            <p className="text-[var(--muted)] mb-8">
              A calendar invite has been sent to {formData.email}
            </p>

            <div className="card max-w-md mx-auto text-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xl">
                  {(hostInfo?.name || slug).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">
                    Meeting with {bookingResult?.hostName || hostInfo?.name || slug}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {bookingResult?.duration || bookingInfo.duration} min {bookingResult?.title || bookingInfo.title}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>
                    {selectedDate &&
                      new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>{selectedTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{MEETING_TYPES.find((m) => m.key === meetingType)?.icon}</span>
                  <span>{MEETING_TYPES.find((m) => m.key === meetingType)?.label}</span>
                </div>
                {bookingResult?.meetLink && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                    <span>🔗</span>
                    <a
                      href={bookingResult.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline"
                    >
                      Join Google Meet
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setStep("date");
                setSelectedDate(null);
                setSelectedTime(null);
                setFormData({ name: "", email: "", company: "", role: "", notes: "", phone: "" });
                setBookingResult(null);
              }}
              className="btn btn-secondary mt-8"
            >
              Book another time
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[300px,1fr] gap-8">
            {/* Left sidebar - User info */}
            <div>
              <div className="card sticky top-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl mb-4">
                  {(hostInfo?.name || slug).charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold mb-1">{hostInfo?.name || slug}</h2>
                <p className="text-[var(--muted)] text-sm mb-2">{bookingInfo.title}</p>
                {bookingInfo.description && (
                  <p className="text-[var(--muted)] text-xs mb-4">{bookingInfo.description}</p>
                )}

                <div className="border-t border-[var(--border)] pt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <span>🕐</span>
                    <span>{bookingInfo.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <span>🌐</span>
                    <span>{hostInfo?.timezone || "Pacific Time"}</span>
                  </div>
                  {selectedDate && (
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                      <span>📅</span>
                      <span>
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                      <span>🕐</span>
                      <span>{selectedTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right content */}
            <div>
              {/* Progress */}
              <div className="flex items-center gap-2 mb-8">
                {["date", "time", "details"].map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === s
                          ? "bg-[var(--primary)] text-white"
                          : ["date", "time", "details"].indexOf(step) > i
                          ? "bg-green-500 text-white"
                          : "bg-[var(--secondary)] text-[var(--muted)]"
                      }`}
                    >
                      {["date", "time", "details"].indexOf(step) > i ? "✓" : i + 1}
                    </div>
                    {i < 2 && <div className="w-12 h-0.5 bg-[var(--border)]" />}
                  </div>
                ))}
              </div>

              {step === "date" && (
                <div>
                  <h1 className="text-2xl font-bold mb-6">Select a Date</h1>
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-[var(--secondary)] flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📅</span>
                      </div>
                      <p className="text-[var(--muted)]">No available time slots</p>
                      <p className="text-sm text-[var(--muted)] mt-2">
                        Please check back later or contact the host directly.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                        {dates.map((date) => {
                          const { day, date: d, month } = formatDate(date);
                          const hasSlots = availableDates.includes(date);
                          return (
                            <button
                              key={date}
                              onClick={() => hasSlots && setSelectedDate(date)}
                              disabled={!hasSlots}
                              className={`p-3 rounded-xl text-center transition-all ${
                                selectedDate === date
                                  ? "bg-[var(--primary)] text-white"
                                  : hasSlots
                                  ? "bg-[var(--secondary)] hover:bg-[var(--primary)]/20 hover:border-[var(--primary)] border border-[var(--border)]"
                                  : "bg-[var(--secondary)]/50 text-[var(--muted)] cursor-not-allowed opacity-50"
                              }`}
                            >
                              <div className="text-xs opacity-70">{day}</div>
                              <div className="text-lg font-bold">{d}</div>
                              <div className="text-xs opacity-70">{month}</div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedDate && (
                        <button onClick={() => setStep("time")} className="btn btn-primary mt-8">
                          Continue
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {step === "time" && (
                <div>
                  <button
                    onClick={() => setStep("date")}
                    className="text-[var(--muted)] hover:text-white mb-4 flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <h1 className="text-2xl font-bold mb-6">Select a Time</h1>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-4 rounded-xl text-center transition-all ${
                          selectedTime === time
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--secondary)] hover:bg-[var(--primary)]/20 border border-[var(--border)] hover:border-[var(--primary)]"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  <h2 className="text-lg font-semibold mb-4">Meeting Type</h2>
                  <div className="space-y-3 mb-8">
                    {MEETING_TYPES.map((type) => (
                      <button
                        key={type.key}
                        onClick={() => setMeetingType(type.key)}
                        className={`w-full p-4 rounded-xl text-left flex items-center gap-4 transition-all ${
                          meetingType === type.key
                            ? "bg-[var(--primary)]/20 border-[var(--primary)]"
                            : "bg-[var(--secondary)] hover:bg-[var(--primary)]/10"
                        } border border-[var(--border)]`}
                      >
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-sm text-[var(--muted)]">{type.description}</p>
                        </div>
                        {meetingType === type.key && (
                          <span className="ml-auto text-[var(--primary)]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedTime && (
                    <button onClick={() => setStep("details")} className="btn btn-primary">
                      Continue
                    </button>
                  )}
                </div>
              )}

              {step === "details" && (
                <div>
                  <button
                    onClick={() => setStep("time")}
                    className="text-[var(--muted)] hover:text-white mb-4 flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <h1 className="text-2xl font-bold mb-6">Enter Your Details</h1>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Your Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="input"
                          placeholder="John Smith"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="input"
                          placeholder="john@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Company</label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="input"
                          placeholder="Acme Inc"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Your Role</label>
                        <input
                          type="text"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="input"
                          placeholder="Recruiter"
                        />
                      </div>
                    </div>

                    {meetingType === "PHONE" && (
                      <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="input"
                          placeholder="+1 (555) 000-0000"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="input min-h-[100px]"
                        placeholder="What would you like to discuss?"
                      />
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={
                        !formData.name ||
                        !formData.email ||
                        (meetingType === "PHONE" && !formData.phone) ||
                        isSubmitting
                      }
                      className="btn btn-primary w-full disabled:opacity-50"
                    >
                      {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
