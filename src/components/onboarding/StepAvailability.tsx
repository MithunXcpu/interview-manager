"use client";

import { useState } from "react";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

interface StepAvailabilityProps {
  data: Record<number, DayAvailability>;
  onUpdate: (data: Record<number, DayAvailability>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_SLOTS: TimeSlot[] = [{ startTime: "09:00", endTime: "17:00" }];

export default function StepAvailability({ data, onUpdate, onNext, onBack }: StepAvailabilityProps) {
  const [localData, setLocalData] = useState<Record<number, DayAvailability>>(data);

  const toggleDay = (dayValue: number) => {
    setLocalData((prev) => ({
      ...prev,
      [dayValue]: {
        enabled: !prev[dayValue]?.enabled,
        slots: prev[dayValue]?.slots || DEFAULT_SLOTS,
      },
    }));
  };

  const updateSlot = (dayValue: number, slotIndex: number, field: keyof TimeSlot, value: string) => {
    setLocalData((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const addSlot = (dayValue: number) => {
    setLocalData((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: [...prev[dayValue].slots, { startTime: "13:00", endTime: "17:00" }],
      },
    }));
  };

  const removeSlot = (dayValue: number, slotIndex: number) => {
    setLocalData((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue].slots.filter((_, i) => i !== slotIndex),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(localData);
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Set your availability</h2>
        <p className="text-muted">When are you typically available for interviews?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {DAYS.map((day) => (
          <div key={day.value} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    localData[day.value]?.enabled
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted"
                  }`}
                >
                  {localData[day.value]?.enabled && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="font-medium text-foreground">{day.label}</span>
              </div>
              {localData[day.value]?.enabled && (
                <button
                  type="button"
                  onClick={() => addSlot(day.value)}
                  className="text-primary hover:text-primary-light text-sm"
                >
                  + Add slot
                </button>
              )}
            </div>

            {localData[day.value]?.enabled && (
              <div className="space-y-2 ml-9">
                {localData[day.value].slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(day.value, slotIndex, "startTime", e.target.value)}
                      className="input flex-1"
                    />
                    <span className="text-muted">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(day.value, slotIndex, "endTime", e.target.value)}
                      className="input flex-1"
                    />
                    {localData[day.value].slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(day.value, slotIndex)}
                        className="text-danger hover:text-red-400 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

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
