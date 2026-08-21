export function slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  
  export type CriterionInput = { key: string; label: string; weight: number };
  
  export function normalizeCriteria(input: unknown): CriterionInput[] | null {
    if (!Array.isArray(input)) return null;
    const out: CriterionInput[] = [];
    for (const item of input) {
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      const weight = Number(item?.weight);
      if (!label || !Number.isFinite(weight) || weight <= 0) return null;
      out.push({ key: slugify(label) || `criterion_${out.length + 1}`, label, weight });
    }
    return out;
  }