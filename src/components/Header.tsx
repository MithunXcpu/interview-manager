"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const ClerkUserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false, loading: () => <div className="w-8 h-8 rounded-full bg-[var(--secondary)]" /> }
);

interface HeaderProps {
  showBookingLink?: boolean;
  bookingLink?: string;
}

export default function Header({ showBookingLink, bookingLink }: HeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Pipeline" },
    { href: "/emails", label: "Emails" },
    { href: "/calendar", label: "Calendar" },
  ];

  return (
    <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-40">
      <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span>📋</span>
            </div>
            <span className="font-bold hidden sm:block">Interview Manager</span>
          </Link>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.href === "/emails" ? "nav-emails" : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Booking Link, Settings Icon, User */}
        <div className="flex items-center gap-3">
          {showBookingLink && bookingLink && (
            <div className="hidden md:flex items-center gap-2 text-sm text-[var(--muted)]">
              <button
                onClick={() => navigator.clipboard.writeText(bookingLink)}
                className="px-3 py-1.5 bg-[var(--secondary)] rounded-lg hover:bg-[var(--primary)]/20 transition-colors flex items-center gap-2"
              >
                <span>🔗</span>
                <span className="hidden lg:inline">Copy Booking Link</span>
              </button>
            </div>
          )}

          {/* Settings Icon */}
          <Link
            href="/settings"
            data-tour="nav-settings"
            className={`p-2 rounded-lg transition-colors ${
              pathname === "/settings"
                ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                : "text-[var(--muted)] hover:text-white hover:bg-[var(--secondary)]"
            }`}
            title="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          {/* User Button */}
          <ClerkUserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
