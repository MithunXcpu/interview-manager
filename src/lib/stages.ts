// Pre-defined pipeline stages with their properties
// Users can enable/disable and reorder these, but not modify their appearance

export interface StageDefinition {
  key: string;
  name: string;
  emoji: string;
  color: string;
  defaultOrder: number;
  defaultEnabled: boolean;
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  { key: "WISHLIST", name: "Wishlist", emoji: "⭐", color: "#6366f1", defaultOrder: 0, defaultEnabled: true },
  { key: "APPLIED", name: "Applied", emoji: "📝", color: "#8b5cf6", defaultOrder: 1, defaultEnabled: true },
  { key: "RECRUITER_SCREEN", name: "Recruiter Screen", emoji: "📞", color: "#06b6d4", defaultOrder: 2, defaultEnabled: true },
  { key: "PHONE_SCREEN", name: "Phone Screen", emoji: "📱", color: "#14b8a6", defaultOrder: 3, defaultEnabled: true },
  { key: "TECHNICAL", name: "Technical", emoji: "💻", color: "#22c55e", defaultOrder: 4, defaultEnabled: true },
  { key: "SYSTEM_DESIGN", name: "System Design", emoji: "🏗️", color: "#84cc16", defaultOrder: 5, defaultEnabled: false },
  { key: "BEHAVIORAL", name: "Behavioral", emoji: "🗣️", color: "#eab308", defaultOrder: 6, defaultEnabled: false },
  { key: "ONSITE", name: "Onsite", emoji: "🏢", color: "#f97316", defaultOrder: 7, defaultEnabled: true },
  { key: "TEAM_MATCH", name: "Team Match", emoji: "🤝", color: "#ec4899", defaultOrder: 8, defaultEnabled: false },
  { key: "HIRING_MANAGER", name: "Hiring Manager", emoji: "👔", color: "#f43f5e", defaultOrder: 9, defaultEnabled: false },
  { key: "FINAL_ROUND", name: "Final Round", emoji: "🎯", color: "#e11d48", defaultOrder: 10, defaultEnabled: false },
  { key: "OFFER", name: "Offer", emoji: "🎉", color: "#10b981", defaultOrder: 11, defaultEnabled: true },
  { key: "REJECTED", name: "Rejected", emoji: "❌", color: "#ef4444", defaultOrder: 12, defaultEnabled: true },
  { key: "ACCEPTED", name: "Accepted", emoji: "✅", color: "#22d3ee", defaultOrder: 13, defaultEnabled: true },
  { key: "DECLINED", name: "Declined", emoji: "👋", color: "#64748b", defaultOrder: 14, defaultEnabled: true },
];

// Get default enabled stages for new users
export function getDefaultStages(): Omit<StageDefinition, "defaultEnabled" | "defaultOrder">[] {
  return STAGE_DEFINITIONS
    .filter(s => s.defaultEnabled)
    .map((s, index) => ({
      key: s.key,
      name: s.name,
      emoji: s.emoji,
      color: s.color,
    }));
}

// Get stage definition by key
export function getStageDefinition(key: string): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find(s => s.key === key);
}

// Celebration stages - trigger special effects
export const CELEBRATION_STAGES = ["OFFER", "ACCEPTED"];

// Forward progress stages (in order) - used to detect stage advancement
export const STAGE_ORDER = [
  "WISHLIST",
  "APPLIED",
  "RECRUITER_SCREEN",
  "PHONE_SCREEN",
  "TECHNICAL",
  "SYSTEM_DESIGN",
  "BEHAVIORAL",
  "ONSITE",
  "TEAM_MATCH",
  "HIRING_MANAGER",
  "FINAL_ROUND",
  "OFFER",
  "ACCEPTED",
];

// Check if moving from oldStage to newStage is forward progress
export function isStageAdvancement(oldStageKey: string, newStageKey: string): boolean {
  const oldIndex = STAGE_ORDER.indexOf(oldStageKey);
  const newIndex = STAGE_ORDER.indexOf(newStageKey);

  // If either stage is not in the order list (like REJECTED/DECLINED), no celebration
  if (oldIndex === -1 || newIndex === -1) return false;

  return newIndex > oldIndex;
}
