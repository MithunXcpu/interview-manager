"use client";

import { useState } from "react";
import Link from "next/link";

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

type Availability = Record<DayOfWeek, DayAvailability>;

const DEFAULT_AVAILABILITY: Availability = {
  monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  friday: { enabled: true, slots: [{ start: "09:00", end: "12:00" }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] },
};

const DAYS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface EmailTemplate {
  id: string;
  name: string;
  trigger: string;
  template: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "1",
    name: "Share Availability",
    trigger: "When recruiter asks for times",
    template: `Hi {recruiter_name},

Thank you for reaching out! I'd love to chat about this opportunity.

Here's my availability for the next two weeks: {booking_link}

Feel free to pick any time that works for you!

Best regards,
{my_name}`,
  },
  {
    id: "2",
    name: "Follow Up",
    trigger: "After 5 days of no response",
    template: `Hi {recruiter_name},

I wanted to follow up on my application for the {position} role. I'm still very interested in the opportunity and would love to hear about next steps.

Please let me know if you need any additional information from my end.

Best regards,
{my_name}`,
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"availability" | "integrations" | "templates" | "profile">("availability");
  const [availability, setAvailability] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saved, setSaved] = useState(false);

  // Integration states
  const [googleConnected, setGoogleConnected] = useState(false);
  const [zoomConnected, setZoomConnected] = useState(false);

  // Profile
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    timezone: "America/Los_Angeles",
    bookingSlug: "me",
    defaultMeetingDuration: 30,
  });

  const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/book/${profile.bookingSlug}` : '';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDay = (day: DayOfWeek) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: !prev[day].enabled ? [{ start: "09:00", end: "17:00" }] : [],
      },
    }));
  };

  const updateSlot = (day: DayOfWeek, index: number, field: "start" | "end", value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const addSlot = (day: DayOfWeek) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: "13:00", end: "17:00" }],
      },
    }));
  };

  const removeSlot = (day: DayOfWeek, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
              <Link href="/emails" className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]">
                Emails
              </Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg text-sm bg-[var(--primary)]/20 text-[var(--primary)]">
                Settings
              </Link>
            </nav>
          </div>

          <button onClick={handleSave} className="btn btn-primary text-sm">
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {[
                { key: "availability", label: "Availability", icon: "📅" },
                { key: "integrations", label: "Integrations", icon: "🔗" },
                { key: "templates", label: "Email Templates", icon: "📧" },
                { key: "profile", label: "Profile", icon: "👤" },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === item.key
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Availability Tab */}
            {activeTab === "availability" && (
              <div>
                <h1 className="text-2xl font-bold mb-2">Availability</h1>
                <p className="text-[var(--muted)] mb-6">
                  Set when you're available for interviews. Recruiters will only see these times.
                </p>

                {/* Booking Link */}
                <div className="card mb-8">
                  <h3 className="font-semibold mb-2">Your Booking Link</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bookingLink}
                      readOnly
                      className="input flex-1 bg-[var(--background)]"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(bookingLink)}
                      className="btn btn-secondary"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Weekly Schedule */}
                <div className="space-y-4">
                  {DAYS.map(day => (
                    <div key={day} className="card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleDay(day)}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              availability[day].enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                              availability[day].enabled ? "translate-x-6" : "translate-x-0.5"
                            }`} />
                          </button>
                          <span className="font-medium capitalize">{day}</span>
                        </div>

                        {availability[day].enabled && (
                          <button
                            onClick={() => addSlot(day)}
                            className="text-sm text-[var(--primary)] hover:underline"
                          >
                            + Add time slot
                          </button>
                        )}
                      </div>

                      {availability[day].enabled && availability[day].slots.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {availability[day].slots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) => updateSlot(day, index, "start", e.target.value)}
                                className="input w-32"
                              />
                              <span className="text-[var(--muted)]">to</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) => updateSlot(day, index, "end", e.target.value)}
                                className="input w-32"
                              />
                              {availability[day].slots.length > 1 && (
                                <button
                                  onClick={() => removeSlot(day, index)}
                                  className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!availability[day].enabled && (
                        <p className="text-sm text-[var(--muted)] mt-2">Unavailable</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div>
                <h1 className="text-2xl font-bold mb-2">Integrations</h1>
                <p className="text-[var(--muted)] mb-6">
                  Connect your accounts to sync emails and calendars.
                </p>

                <div className="space-y-4">
                  {/* Google */}
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold">Google</h3>
                          <p className="text-sm text-[var(--muted)]">Gmail & Google Calendar</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setGoogleConnected(!googleConnected)}
                        className={`btn ${googleConnected ? "btn-danger" : "btn-primary"}`}
                      >
                        {googleConnected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                    {googleConnected && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <span>✓</span>
                          <span>Connected as demo@gmail.com</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>Sync incoming emails</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>Add interviews to Google Calendar</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>Auto-create Google Meet links</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Zoom */}
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4.5 4.5A1.5 1.5 0 003 6v9a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5v-2.25l3 2.25V8.25l-3 2.25V6a1.5 1.5 0 00-1.5-1.5H4.5z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold">Zoom</h3>
                          <p className="text-sm text-[var(--muted)]">Video meetings</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setZoomConnected(!zoomConnected)}
                        className={`btn ${zoomConnected ? "btn-danger" : "btn-secondary"}`}
                      >
                        {zoomConnected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                    {zoomConnected && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <span>✓</span>
                          <span>Connected</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn (Coming Soon) */}
                  <div className="card opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#0077B5] flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold">LinkedIn</h3>
                          <p className="text-sm text-[var(--muted)]">Import connections & messages</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-[var(--secondary)] rounded-full text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === "templates" && (
              <div>
                <h1 className="text-2xl font-bold mb-2">Email Templates</h1>
                <p className="text-[var(--muted)] mb-6">
                  Create templates for common recruiter responses.
                </p>

                <div className="space-y-4">
                  {templates.map(template => (
                    <div key={template.id} className="card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm text-[var(--muted)]">{template.trigger}</p>
                        </div>
                        <button
                          onClick={() => setEditingTemplate(template)}
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <pre className="text-sm text-[var(--muted)] bg-[var(--background)] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {template.template}
                      </pre>
                    </div>
                  ))}

                  <button
                    onClick={() => setEditingTemplate({ id: Date.now().toString(), name: "", trigger: "", template: "" })}
                    className="card border-dashed flex items-center justify-center py-8 hover:border-[var(--primary)] transition-colors cursor-pointer"
                  >
                    <span className="text-[var(--muted)]">+ Add New Template</span>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-[var(--secondary)] rounded-xl">
                  <h4 className="font-medium mb-2">Available Variables</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {["{recruiter_name}", "{company}", "{position}", "{booking_link}", "{my_name}", "{my_phone}"].map(v => (
                      <code key={v} className="px-2 py-1 bg-[var(--background)] rounded">{v}</code>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h1 className="text-2xl font-bold mb-2">Profile</h1>
                <p className="text-[var(--muted)] mb-6">
                  Your personal information for email signatures and booking pages.
                </p>

                <div className="card space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="input"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="input"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="input"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">Timezone</label>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="input"
                      >
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">Booking Link Slug</label>
                      <div className="flex">
                        <span className="px-3 py-2 bg-[var(--background)] border border-r-0 border-[var(--border)] rounded-l-lg text-sm text-[var(--muted)]">
                          /book/
                        </span>
                        <input
                          type="text"
                          value={profile.bookingSlug}
                          onChange={(e) => setProfile({ ...profile, bookingSlug: e.target.value })}
                          className="input rounded-l-none flex-1"
                          placeholder="yourname"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--muted)] mb-1">Default Meeting Duration</label>
                      <select
                        value={profile.defaultMeetingDuration}
                        onChange={(e) => setProfile({ ...profile, defaultMeetingDuration: parseInt(e.target.value) })}
                        className="input"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="modal-overlay" onClick={() => setEditingTemplate(null)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">
              {editingTemplate.name ? "Edit Template" : "New Template"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Template Name</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Share Availability"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Trigger (when to use)</label>
                <input
                  type="text"
                  value={editingTemplate.trigger}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, trigger: e.target.value })}
                  className="input"
                  placeholder="e.g., When recruiter asks for times"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Template Content</label>
                <textarea
                  value={editingTemplate.template}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template: e.target.value })}
                  className="input min-h-[200px] font-mono text-sm"
                  placeholder="Hi {recruiter_name},&#10;&#10;..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingTemplate(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTemplate.name && editingTemplate.template) {
                      setTemplates(prev => {
                        const exists = prev.find(t => t.id === editingTemplate.id);
                        if (exists) {
                          return prev.map(t => t.id === editingTemplate.id ? editingTemplate : t);
                        }
                        return [...prev, editingTemplate];
                      });
                      setEditingTemplate(null);
                    }
                  }}
                  className="btn btn-primary"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
