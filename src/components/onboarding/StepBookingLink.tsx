"use client";

import { useState } from "react";

interface StepBookingLinkProps {
  data: {
    slug: string;
    duration: number;
  };
  onUpdate: (data: { slug: string; duration: number }) => void;
  onNext: () => void;
  onBack: () => void;
}

const DURATIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

export default function StepBookingLink({ data, onUpdate, onNext, onBack }: StepBookingLinkProps) {
  const [localData, setLocalData] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!localData.slug.trim()) {
      newErrors.slug = "Booking link is required";
    } else if (!/^[a-z0-9-]+$/.test(localData.slug)) {
      newErrors.slug = "Only lowercase letters, numbers, and hyphens allowed";
    } else if (localData.slug.length < 3) {
      newErrors.slug = "Must be at least 3 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onUpdate(localData);
      onNext();
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Create your booking link</h2>
        <p className="text-muted">Share this link with recruiters to schedule interviews</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Your booking URL <span className="text-danger">*</span>
          </label>
          <div className="flex items-center">
            <span className="bg-secondary text-muted px-3 py-2 rounded-l-lg border border-r-0 border-border text-sm">
              {baseUrl}/book/
            </span>
            <input
              type="text"
              value={localData.slug}
              onChange={(e) => setLocalData({ ...localData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              className="input rounded-l-none flex-1"
              placeholder="your-name"
            />
          </div>
          {errors.slug && <p className="text-danger text-sm mt-1">{errors.slug}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Default meeting duration
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setLocalData({ ...localData, duration: d.value })}
                className={`p-3 rounded-lg border transition-colors ${
                  localData.duration === d.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary/50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4 bg-primary/10 border-primary/30">
          <p className="text-sm text-foreground">
            <span className="font-medium">Your booking link will be:</span>
            <br />
            <code className="text-primary">{baseUrl}/book/{localData.slug || "your-name"}</code>
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onBack} className="btn-secondary flex-1 py-3">
            Back
          </button>
          <button type="submit" className="btn-primary flex-1 py-3">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
