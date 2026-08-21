export type Criterion = {
  key: string;
  label: string;
  weight: number;
};

export const RATING_OPTIONS = [
  { value: 5, label: "Outstanding (5)" },
  { value: 4, label: "Exceeds Expectations (4)" },
  { value: 3, label: "Meets Expectations (3)" },
  { value: 2, label: "Needs Improvement (2)" },
  { value: 1, label: "Unsatisfactory (1)" },
];

export function weightedScore(rating: number, weight: number): number {
  return (rating / 5) * weight;
}

export function sectionTotal(
  criteria: Criterion[],
  ratings: Record<string, number>,
): { earned: number; possible: number } {
  let earned = 0;
  let possible = 0;
  for (const c of criteria) {
    possible += c.weight;
    const rating = ratings[c.key];
    if (rating) earned += weightedScore(rating, c.weight);
  }
  return { earned, possible };
}

export type PerformanceBand =
  | "Outstanding"
  | "Exceeds Expectations"
  | "Strong Performer"
  | "Needs Improvement";

export function performanceBand(finalScore: number): PerformanceBand {
  if (finalScore >= 90) return "Outstanding";
  if (finalScore >= 85) return "Exceeds Expectations";
  if (finalScore >= 75) return "Strong Performer";
  return "Needs Improvement";
}

export const QUALIFYING_SCORE = 85;

export type EligibilityKey =
  | "minService"
  | "minAttendance"
  | "noDisciplinary"
  | "noPip"
  | "activeEmployee";

export const ELIGIBILITY_ITEMS: { key: EligibilityKey; label: string }[] = [
  {
    key: "minService",
    label: "Minimum 60 days of service during the evaluation quarter",
  },
  { key: "minAttendance", label: "Minimum 95% attendance during the quarter" },
  { key: "noDisciplinary", label: "No active disciplinary action" },
  { key: "noPip", label: "No active Performance Improvement Plan (PIP)" },
  {
    key: "activeEmployee",
    label: "Active employee at time of winner announcement",
  },
];