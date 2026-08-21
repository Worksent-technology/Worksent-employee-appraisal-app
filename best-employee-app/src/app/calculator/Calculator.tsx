"use client";


import { useMemo, useState } from "react";
import {
  Criterion,
  ELIGIBILITY_ITEMS,
  EligibilityKey,
  QUALIFYING_SCORE,
  RATING_OPTIONS,
  performanceBand,
  sectionTotal,
} from "@/lib/scoring";

export type RoleConfig = {
  id: number;
  key: string;
  name: string;
  weight: number;
  scope: "fixed" | "per_team";
  criteriaFixed: Criterion[];
  criteriaByTeam: Record<number, Criterion[]>;
};

type Team = { id: number; name: string };

function RatingRow({
  label,
  weight,
  value,
  onChange,
}: {
  label: string;
  weight: number;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_5rem_11rem] gap-3 items-center py-2 border-b border-black/5 last:border-b-0">
      <span className="text-sm text-neutral-700">{label}</span>
      <span className="text-sm text-neutral-500 text-right">{weight}</span>
      <select
        className="text-sm border border-black/10 rounded-md px-2 py-1.5 bg-white"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="" disabled>
          Select rating
        </option>
        {RATING_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Calculator({
  roles,
  teams,
}: {
  roles: RoleConfig[];
  teams: Team[];
}) {
  const hasPerTeamRole = roles.some((r) => r.scope === "per_team");
  const [teamId, setTeamId] = useState<number | null>(teams[0]?.id ?? null);
  const [ratingsByRole, setRatingsByRole] = useState<
    Record<string, Record<string, number>>
  >({});
  const [eligibility, setEligibility] = useState<
    Record<EligibilityKey, boolean>
  >({
    minService: false,
    minAttendance: false,
    noDisciplinary: false,
    noPip: false,
    activeEmployee: false,
  });

  function criteriaForRole(role: RoleConfig): Criterion[] {
    if (role.scope === "fixed") return role.criteriaFixed;
    return teamId ? (role.criteriaByTeam[teamId] ?? []) : [];
  }

  const sections = useMemo(
    () =>
      roles.map((role) => {
        const criteria = criteriaForRole(role);
        const ratings = ratingsByRole[role.key] ?? {};
        return { role, criteria, ...sectionTotal(criteria, ratings) };
      }),
    [roles, ratingsByRole, teamId],
  );

  const finalScore = sections.reduce((sum, s) => sum + s.earned, 0);
  const band = performanceBand(finalScore);
  const isEligible = Object.values(eligibility).every(Boolean);
  const qualifies = isEligible && finalScore >= QUALIFYING_SCORE;
  const allRated = sections.every((s) =>
    s.criteria.every((c) => (ratingsByRole[s.role.key] ?? {})[c.key]),
  );

  function handleTeamChange(next: number) {
    setTeamId(next);
    setRatingsByRole((prev) => {
      const copy = { ...prev };
      for (const role of roles) {
        if (role.scope === "per_team") delete copy[role.key];
      }
      return copy;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 grid lg:grid-cols-[1fr_20rem] gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Score Calculator
        </h1>
        <p className="text-sm text-neutral-600 mb-8">
          Enter ratings for each evaluator section to compute the final
          weighted score, per Section 14 of the process.
        </p>

        {hasPerTeamRole && (
          <div className="mb-8">
            <label className="text-sm font-medium block mb-2">Team</label>
            <div className="flex gap-2 flex-wrap">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTeamChange(t.id)}
                  className={`text-sm px-3 py-1.5 rounded-md border ${
                    teamId === t.id
                      ? "bg-accent text-white border-transparent"
                      : "border-black/10 text-neutral-700"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {sections.map(({ role, criteria, earned, possible }) => (
          <section key={role.key} className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-semibold">{role.name} Evaluation</h2>
              <span className="text-xs text-neutral-500">
                {earned.toFixed(1)} / {possible}
              </span>
            </div>
            {criteria.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No criteria configured yet.
              </p>
            ) : (
              criteria.map((c) => (
                <RatingRow
                  key={c.key}
                  label={c.label}
                  weight={c.weight}
                  value={(ratingsByRole[role.key] ?? {})[c.key]}
                  onChange={(v) =>
                    setRatingsByRole((prev) => ({
                      ...prev,
                      [role.key]: { ...(prev[role.key] ?? {}), [c.key]: v },
                    }))
                  }
                />
              ))
            )}
          </section>
        ))}

        <section>
          <h2 className="font-semibold mb-3">
            Eligibility Criteria (Section 5)
          </h2>
          <div className="space-y-2">
            {ELIGIBILITY_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-2 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={eligibility[item.key]}
                  onChange={(e) =>
                    setEligibility((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 h-fit rounded-xl border border-black/10 p-5">
        <h2 className="text-sm font-semibold mb-4">Result</h2>
        <dl className="space-y-2 text-sm mb-4">
          {sections.map(({ role, earned }) => (
            <div key={role.key} className="flex justify-between">
              <dt className="text-neutral-500">
                {role.name} ({role.weight})
              </dt>
              <dd>{earned.toFixed(1)}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-black/10 pt-4 mb-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">Final Score</span>
            <span className="text-2xl font-bold tabular-nums">
              {finalScore.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">out of 100</p>
        </div>

        <div
          className={`rounded-md px-3 py-2 text-sm font-medium mb-3 ${
            band === "Outstanding"
              ? "bg-emerald-100 text-emerald-800"
              : band === "Exceeds Expectations"
                ? "bg-blue-100 text-blue-800"
                : band === "Strong Performer"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
          }`}
        >
          {band}
        </div>

        <div
          className={`rounded-md px-3 py-2 text-xs font-medium ${
            qualifies
              ? "bg-accent text-white"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {qualifies
            ? "Qualifies for Best Employee Award (≥ 85%, all eligibility met)"
            : !isEligible
              ? "Not eligible — one or more eligibility criteria unmet"
              : "Below 85% qualifying score"}
        </div>

        {!allRated && (
          <p className="text-xs text-neutral-500 mt-3">
            Rate every criterion for an accurate final score.
          </p>
        )}
      </aside>
    </div>
  );
}