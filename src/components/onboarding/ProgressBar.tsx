"use client";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  index < currentStep
                    ? "bg-primary text-white"
                    : index === currentStep
                    ? "bg-primary text-white ring-4 ring-primary/30"
                    : "bg-secondary text-muted"
                }`}
              >
                {index < currentStep ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs mt-2 text-center hidden sm:block ${
                  index <= currentStep ? "text-foreground" : "text-muted"
                }`}
              >
                {step}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  index < currentStep ? "bg-primary" : "bg-secondary"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
