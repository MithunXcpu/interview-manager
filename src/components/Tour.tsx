"use client";

import { useState, useEffect } from "react";

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='pipeline']",
    title: "Your Interview Pipeline",
    content: "Track all your job applications here. Drag and drop companies between stages as you progress.",
    position: "bottom",
  },
  {
    target: "[data-tour='add-company']",
    title: "Add Companies",
    content: "Click here to add a new company you're applying to. Track job details, recruiter info, and more.",
    position: "bottom",
  },
  {
    target: "[data-tour='nav-emails']",
    title: "Email Integration",
    content: "Connect your Gmail to automatically detect recruiter emails and generate AI-powered replies.",
    position: "bottom",
  },
  {
    target: "[data-tour='nav-settings']",
    title: "Customize Your Experience",
    content: "Set up your availability, customize pipeline stages, and configure your booking link.",
    position: "bottom",
  },
];

interface TourProps {
  onComplete: () => void;
  isActive: boolean;
}

export default function Tour({ onComplete, isActive }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = TOUR_STEPS[currentStep];
      const target = document.querySelector(step.target);

      if (target) {
        const rect = target.getBoundingClientRect();
        const style: React.CSSProperties = {
          position: "fixed",
          zIndex: 10000,
        };

        switch (step.position) {
          case "bottom":
            style.top = rect.bottom + 12;
            style.left = rect.left + rect.width / 2;
            style.transform = "translateX(-50%)";
            break;
          case "top":
            style.bottom = window.innerHeight - rect.top + 12;
            style.left = rect.left + rect.width / 2;
            style.transform = "translateX(-50%)";
            break;
          case "left":
            style.top = rect.top + rect.height / 2;
            style.right = window.innerWidth - rect.left + 12;
            style.transform = "translateY(-50%)";
            break;
          case "right":
            style.top = rect.top + rect.height / 2;
            style.left = rect.right + 12;
            style.transform = "translateY(-50%)";
            break;
        }

        setTooltipStyle(style);

        // Add highlight to target
        target.classList.add("tour-highlight");
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      // Remove highlight from all targets
      document.querySelectorAll(".tour-highlight").forEach((el) => {
        el.classList.remove("tour-highlight");
      });
    };
  }, [currentStep, isActive]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    // Remove highlight from current target
    const currentTarget = document.querySelector(step.target);
    currentTarget?.classList.remove("tour-highlight");

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    document.querySelectorAll(".tour-highlight").forEach((el) => {
      el.classList.remove("tour-highlight");
    });
    onComplete();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9999]" onClick={handleSkip} />

      {/* Tooltip */}
      <div style={tooltipStyle} className="bg-slate-800 border border-slate-600 rounded-xl p-4 shadow-xl max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button onClick={handleSkip} className="text-slate-400 hover:text-white text-sm">
            Skip tour
          </button>
        </div>
        <h3 className="font-semibold text-white mb-1">{step.title}</h3>
        <p className="text-sm text-slate-300 mb-4">{step.content}</p>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === currentStep ? "bg-indigo-500" : "bg-slate-600"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium"
          >
            {isLastStep ? "Get Started" : "Next"}
          </button>
        </div>
      </div>

      {/* Tour highlight styles */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 10000 !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3) !important;
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}
