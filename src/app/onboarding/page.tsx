"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressBar from "@/components/onboarding/ProgressBar";
import StepProfile from "@/components/onboarding/StepProfile";
import StepAvailability from "@/components/onboarding/StepAvailability";
import StepBookingLink from "@/components/onboarding/StepBookingLink";
import StepGoogleConnect from "@/components/onboarding/StepGoogleConnect";

interface DayAvailability {
  enabled: boolean;
  slots: { startTime: string; endTime: string }[];
}

interface OnboardingData {
  profile: {
    name: string;
    phone: string;
    timezone: string;
  };
  availability: Record<number, DayAvailability>;
  bookingLink: {
    slug: string;
    duration: number;
  };
  googleConnected: boolean;
}

const STEPS = ["Profile", "Availability", "Booking Link", "Connect Google"];

const DEFAULT_AVAILABILITY: Record<number, DayAvailability> = {
  1: { enabled: true, slots: [{ startTime: "09:00", endTime: "17:00" }] },
  2: { enabled: true, slots: [{ startTime: "09:00", endTime: "17:00" }] },
  3: { enabled: true, slots: [{ startTime: "09:00", endTime: "17:00" }] },
  4: { enabled: true, slots: [{ startTime: "09:00", endTime: "17:00" }] },
  5: { enabled: true, slots: [{ startTime: "09:00", endTime: "17:00" }] },
};

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    profile: { name: "", phone: "", timezone: "America/Los_Angeles" },
    availability: DEFAULT_AVAILABILITY,
    bookingLink: { slug: "", duration: 30 },
    googleConnected: false,
  });

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user");
        if (response.ok) {
          const result = await response.json();
          const user = result.user;

          // If onboarding is completed, redirect to dashboard
          if (user.onboardingCompleted) {
            router.push("/dashboard");
            return;
          }

          // Populate form with existing data
          setData((prev) => ({
            ...prev,
            profile: {
              name: user.name || "",
              phone: user.phone || "",
              timezone: user.timezone || "America/Los_Angeles",
            },
            bookingLink: {
              slug: user.bookingLink?.slug || user.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "",
              duration: user.bookingLink?.duration || 30,
            },
            googleConnected: user.googleConnected,
          }));

          // Resume from saved step
          setCurrentStep(user.onboardingStep || 0);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Check if returning from Google OAuth
    if (searchParams.get("success") === "google_connected") {
      setData((prev) => ({ ...prev, googleConnected: true }));
    }
  }, [router, searchParams]);

  const saveProgress = async (step: number) => {
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingStep: step }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    saveProgress(nextStep);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Save profile data
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.profile.name,
          phone: data.profile.phone,
          timezone: data.profile.timezone,
          bookingSlug: data.bookingLink.slug,
          onboardingCompleted: true,
        }),
      });

      // Save availability slots
      const enabledDays = Object.entries(data.availability)
        .filter(([, day]) => day.enabled)
        .flatMap(([dayOfWeek, day]) =>
          day.slots.map((slot) => ({
            dayOfWeek: parseInt(dayOfWeek),
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: data.profile.timezone,
          }))
        );

      if (enabledDays.length > 0) {
        await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: enabledDays }),
        });
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            <span className="text-primary">Interview</span>Manager
          </h1>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />

        {/* Step Content */}
        <div className="card p-8">
          {currentStep === 0 && (
            <StepProfile
              data={data.profile}
              onUpdate={(profile) => setData((prev) => ({ ...prev, profile }))}
              onNext={handleNext}
            />
          )}

          {currentStep === 1 && (
            <StepAvailability
              data={data.availability}
              onUpdate={(availability) => setData((prev) => ({ ...prev, availability }))}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 2 && (
            <StepBookingLink
              data={data.bookingLink}
              onUpdate={(bookingLink) => setData((prev) => ({ ...prev, bookingLink }))}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <StepGoogleConnect
              googleConnected={data.googleConnected}
              onConnect={() => {}}
              onComplete={handleComplete}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="card p-8 flex flex-col items-center gap-4">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-foreground">Setting up your account...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
