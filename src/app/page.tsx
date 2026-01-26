"use client";

import Link from "next/link";

// Check if Clerk is configured at runtime
const isClerkConfigured = typeof window !== 'undefined'
  ? Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_"))
  : Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_"));

// Dynamic imports for Clerk components
import dynamic from "next/dynamic";

const ClerkAuthButtons = dynamic(() => import("@/components/ClerkAuthButtons"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-4">
      <Link href="/dashboard" className="btn btn-secondary">Demo Mode</Link>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <span className="text-xl font-bold">Interview Manager</span>
          </div>

          {isClerkConfigured ? (
            <ClerkAuthButtons />
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn btn-primary">
                Try Demo
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Manage Your Job Search Like a Pro
          </h1>
          <p className="text-xl text-[var(--muted)] mb-10">
            Track companies, schedule interviews, auto-respond to recruiters, and never miss a follow-up. Your personal CRM for landing your dream job.
          </p>
          <div className="flex items-center justify-center gap-4">
            {isClerkConfigured ? (
              <ClerkAuthButtons showSignUp />
            ) : (
              <Link href="/dashboard" className="btn btn-primary text-lg px-8 py-4">
                Start Free Demo
              </Link>
            )}
            <button className="btn btn-secondary text-lg px-8 py-4">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="card card-hover">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📧</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Email Integration</h3>
            <p className="text-[var(--muted)]">
              Connect Gmail, auto-detect recruiter emails, and use AI to draft perfect responses with your availability.
            </p>
          </div>

          <div className="card card-hover">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Kanban Pipeline</h3>
            <p className="text-[var(--muted)]">
              Track every company from application to offer. Drag and drop to update stages, never lose track.
            </p>
          </div>

          <div className="card card-hover">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-[var(--muted)]">
              Set your availability, share a booking link, and auto-add Google Meet or Zoom to interviews.
            </p>
          </div>

          <div className="card card-hover">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Email Assistant</h3>
            <p className="text-[var(--muted)]">
              Generate professional responses with one click. Include your booking link automatically.
            </p>
          </div>

          <div className="card card-hover">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🔗</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Quick Meeting Links</h3>
            <p className="text-[var(--muted)]">
              One-click buttons to insert Zoom, Google Meet, or phone number into any email.
            </p>
          </div>

          <div className="card card-hover">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Mobile Ready</h3>
            <p className="text-[var(--muted)]">
              Check your pipeline and respond to recruiters from anywhere on any device.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Connect Gmail", desc: "One-click Google OAuth" },
              { step: 2, title: "Set Availability", desc: "Define your free slots" },
              { step: 3, title: "Track Companies", desc: "Add to your Kanban board" },
              { step: 4, title: "Reply with AI", desc: "Send perfect responses" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-[var(--muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <div className="card max-w-2xl mx-auto bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
            <h2 className="text-2xl font-bold mb-4">Ready to land your dream job?</h2>
            <p className="text-[var(--muted)] mb-6">
              Join thousands of job seekers who manage their search like pros.
            </p>
            {isClerkConfigured ? (
              <ClerkAuthButtons showSignUp />
            ) : (
              <Link href="/dashboard" className="btn btn-primary text-lg px-8 py-4">
                Get Started Free
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-32">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-[var(--muted)]">
          <p>© 2025 Interview Manager. Built for job seekers, by job seekers.</p>
        </div>
      </footer>
    </div>
  );
}
