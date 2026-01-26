"use client";

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

interface ClerkAuthButtonsProps {
  showSignUp?: boolean;
}

export default function ClerkAuthButtons({ showSignUp }: ClerkAuthButtonsProps) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center gap-4">
        <div className="w-20 h-10 bg-[var(--secondary)] animate-pulse rounded-lg" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-center gap-4">
        <Link href="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (showSignUp) {
    return (
      <div className="flex items-center justify-center gap-4">
        <SignUpButton mode="modal">
          <button className="btn btn-primary text-lg px-8 py-4">
            Start Free
          </button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <SignInButton mode="modal">
        <button className="btn btn-secondary">Sign In</button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="btn btn-primary">Get Started</button>
      </SignUpButton>
    </div>
  );
}
