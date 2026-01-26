"use client";

import { useState } from "react";

interface StepProfileProps {
  data: {
    name: string;
    phone: string;
    timezone: string;
  };
  onUpdate: (data: { name: string; phone: string; timezone: string }) => void;
  onNext: () => void;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export default function StepProfile({ data, onUpdate, onNext }: StepProfileProps) {
  const [localData, setLocalData] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!localData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (localData.phone && !/^[\d\s\-+()]+$/.test(localData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
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

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Let&apos;s get to know you</h2>
        <p className="text-muted">This information helps recruiters schedule with you</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Full Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={localData.name}
            onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
            className="input w-full"
            placeholder="John Doe"
          />
          {errors.name && <p className="text-danger text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Phone Number <span className="text-muted">(optional)</span>
          </label>
          <input
            type="tel"
            value={localData.phone}
            onChange={(e) => setLocalData({ ...localData, phone: e.target.value })}
            className="input w-full"
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && <p className="text-danger text-sm mt-1">{errors.phone}</p>}
          <p className="text-muted text-sm mt-1">Used for phone screen scheduling</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Timezone <span className="text-danger">*</span>
          </label>
          <select
            value={localData.timezone}
            onChange={(e) => setLocalData({ ...localData, timezone: e.target.value })}
            className="input w-full"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary w-full py-3">
          Continue
        </button>
      </form>
    </div>
  );
}
