"use client";


import { useMemo, useState } from "react";
import { Criterion, RATING_OPTIONS } from "@/lib/scoring";

export type Team = { id: number; key: string; name: string };

export type Employee = {
  id: number;
  emp_id: string;
  name: string;
  email: string;
  team_id: number;
  team_key: string;
  team_name: string;
};

type SortOrder = "none" | "desc" | "asc";

function totalFor(
  criteria: Criterion[],
  ratings: Record<string, number> | undefined,
) {
  return criteria.reduce(
    (sum, c) => sum + (ratings?.[c.key] ? (ratings[c.key] / 5) * c.weight : 0),
    0,
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.slice(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function OverviewTable({
  roleKey,
  criteria,
  employees,
  savedByEmployee,
  docByEmployee,
  onSelect,
}: {
  roleKey: string;
  criteria: Criterion[];
  employees: Employee[];
  savedByEmployee: Record<number, Record<string, number>>;
  docByEmployee: Record<number, string | undefined>;
  onSelect: (id: number) => void;
}) {
  const possible = criteria.reduce((sum, c) => sum + c.weight, 0);
  return (
    <table className="w-full text-sm border-collapse mb-8">
      <thead>
        <tr className="border-b border-black/10 text-left">
          <th className="py-2 pr-4 font-medium">Employee</th>
          <th className="py-2 pr-4 font-medium">Emp ID</th>
          {criteria.map((c) => (
            <th key={c.key} className="py-2 pr-4 font-medium text-right">
              {c.label}
            </th>
          ))}
          <th className="py-2 pr-4 font-medium">Supporting document</th>
          <th className="py-2 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp) => {
          const ratings = savedByEmployee[emp.id];
          const doc = docByEmployee[emp.id];
          const total = totalFor(criteria, ratings);
          return (
            <tr key={emp.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                <button
                  onClick={() => onSelect(emp.id)}
                  className="underline text-left"
                >
                  {emp.name}
                </button>
              </td>
              <td className="py-2 pr-4 text-neutral-500">{emp.emp_id}</td>
              {criteria.map((c) => (
                <td key={c.key} className="py-2 pr-4 text-right tabular-nums">
                  {ratings?.[c.key] ?? "—"}
                </td>
              ))}
              <td className="py-2 pr-4">
                {doc ? (
                  <a
                    href={`/api/evaluations/document?employeeId=${emp.id}&role=${roleKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-neutral-500">—</span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums font-medium">
                {total.toFixed(1)} / {possible}
              </td>
            </tr>
          );
        })}
        {employees.length === 0 && (
          <tr>
            <td
              colSpan={criteria.length + 4}
              className="py-4 text-center text-neutral-500"
            >
              No employees.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function RoleDashboard({
  roleKey,
  roleName,
  scope,
  criteriaFixed,
  criteriaByTeam,
  teams,
  employees,
  existingRatings,
  existingDocuments,
}: {
  roleKey: string;
  roleName: string;
  scope: "fixed" | "per_team";
  criteriaFixed: Criterion[];
  criteriaByTeam: Record<number, Criterion[]>;
  teams: Team[];
  employees: Employee[];
  existingRatings: Record<number, Record<string, number>>;
  existingDocuments: Record<number, string | undefined>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(
    employees[0]?.id ?? null,
  );
  const [savedByEmployee, setSavedByEmployee] =
    useState<Record<number, Record<string, number>>>(existingRatings);
  const [docByEmployee, setDocByEmployee] =
    useState<Record<number, string | undefined>>(existingDocuments);
  const [ratings, setRatings] = useState<Record<string, number>>(
    selectedId ? (existingRatings[selectedId] ?? {}) : {},
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewSort, setOverviewSort] = useState<SortOrder>("none");

  const selected = employees.find((e) => e.id === selectedId) ?? null;

  function criteriaForEmployee(emp: Employee | null): Criterion[] {
    if (!emp) return [];
    return scope === "fixed" ? criteriaFixed : (criteriaByTeam[emp.team_id] ?? []);
  }

  const criteria = useMemo(() => criteriaForEmployee(selected), [selected, scope, criteriaFixed, criteriaByTeam]);

  function selectEmployee(id: number) {
    setSelectedId(id);
    setRatings(savedByEmployee[id] ?? {});
    setFile(null);
    setFileError(null);
    setStatus(null);
    setError(null);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (f) {
      const okExt = [".pdf", ".doc", ".docx"].some((ext) =>
        f.name.toLowerCase().endsWith(ext),
      );
      if (!okExt) {
        setFileError(
          "Only PDF or Word documents (.pdf, .doc, .docx) are supported.",
        );
        setFile(null);
        return;
      }
      if (f.size > 4 * 1024 * 1024) {
        setFileError("File must be under 4MB.");
        setFile(null);
        return;
      }
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        employeeId: selected.id,
        ratings,
      };
      if (file) {
        payload.document = await readFileAsBase64(file);
        payload.documentName = file.name;
        payload.documentType = file.type;
      }

      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save evaluation.");
        return;
      }
      setSavedByEmployee((prev) => ({ ...prev, [selected.id]: ratings }));
      if (file) {
        setDocByEmployee((prev) => ({ ...prev, [selected.id]: file.name }));
        setFile(null);
      }
      setStatus("Saved for this quarter.");
    } finally {
      setSaving(false);
    }
  }

  const allRated = criteria.length > 0 && criteria.every((c) => ratings[c.key]);
  const totalPossible = criteria.reduce((sum, c) => sum + c.weight, 0);
  const totalEarned = criteria.reduce(
    (sum, c) => sum + (ratings[c.key] ? (ratings[c.key] / 5) * c.weight : 0),
    0,
  );
  const currentDocName = selected ? docByEmployee[selected.id] : undefined;

  const filteredEmployees = useMemo(() => {
    const query = overviewSearch.trim().toLowerCase();
    let result = employees;
    if (query) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.emp_id.toLowerCase().includes(query),
      );
    }
    return result;
  }, [employees, overviewSearch]);

  function sortByTotal(
    list: Employee[],
    criteriaForGroup: Criterion[],
  ): Employee[] {
    if (overviewSort === "none") return list;
    return [...list].sort((a, b) => {
      const totalA = totalFor(criteriaForGroup, savedByEmployee[a.id]);
      const totalB = totalFor(criteriaForGroup, savedByEmployee[b.id]);
      return overviewSort === "desc" ? totalB - totalA : totalA - totalB;
    });
  }

  return (
    <div>
      <div className="grid sm:grid-cols-[16rem_1fr] gap-8 mb-12">
        <aside>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Employees
          </h2>
          <ul className="space-y-1">
            {employees.map((emp) => {
              const done = Boolean(savedByEmployee[emp.id]);
              return (
                <li key={emp.id}>
                  <button
                    onClick={() => selectEmployee(emp.id)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md flex items-center justify-between ${
                      selectedId === emp.id
                        ? "bg-accent text-white"
                        : "hover:bg-neutral-100"
                    }`}
                  >
                    <span>{emp.name}</span>
                    {done && <span className="text-xs opacity-70">✓</span>}
                  </button>
                </li>
              );
            })}
            {employees.length === 0 && (
              <li className="text-sm text-neutral-500">
                No employees yet. Ask HR to add some.
              </li>
            )}
          </ul>
        </aside>

        <div>
          {!selected ? (
            <p className="text-sm text-neutral-500">
              Select an employee to begin.
            </p>
          ) : criteria.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No criteria are configured yet for {selected.team_name}. Ask HR
              to set them up under Roles.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-neutral-500">
                  {selected.emp_id} · {selected.team_name} · {roleName}{" "}
                  Evaluation
                </p>
              </div>

              <div className="mb-6">
                {criteria.map((c) => (
                  <div
                    key={c.key}
                    className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_5rem_11rem] gap-3 items-center py-2 border-b border-black/5 last:border-b-0"
                  >
                    <span className="text-sm text-neutral-700">{c.label}</span>
                    <span className="text-sm text-neutral-500 text-right">
                      {c.weight}
                    </span>
                    <select
                      className="text-sm border border-black/10 rounded-md px-2 py-1.5 bg-white"
                      value={ratings[c.key] ?? ""}
                      onChange={(e) =>
                        setRatings((prev) => ({
                          ...prev,
                          [c.key]: Number(e.target.value),
                        }))
                      }
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
                ))}

                <div className="py-3">
                  <label className="text-sm font-medium block mb-1">
                    Supporting document{" "}
                    <span className="text-neutral-500 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="text-sm w-full text-neutral-600 file:mr-3 file:rounded-md file:border file:border-black/10 file:bg-white file:px-3 file:py-1.5 file:text-sm"
                  />
                  {fileError && (
                    <p className="text-xs text-red-600 mt-1">{fileError}</p>
                  )}
                  {!fileError && file && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Selected: {file.name}
                    </p>
                  )}
                  {!file && currentDocName && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Current file: {currentDocName} —{" "}
                      <a
                        href={`/api/evaluations/document?employeeId=${selected.id}&role=${roleKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        view
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={!allRated || saving}
                  className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Submit evaluation"}
                </button>
                <span className="text-sm text-neutral-500">
                  {totalEarned.toFixed(1)} / {totalPossible}
                </span>
              </div>
              {!allRated && (
                <p className="text-xs text-neutral-500 mt-2">
                  Rate every criterion before submitting.
                </p>
              )}
              {status && (
                <p className="text-sm text-emerald-600 mt-2">{status}</p>
              )}
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </form>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-semibold">All employees</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Search</label>
              <input
                type="text"
                value={overviewSearch}
                onChange={(e) => setOverviewSearch(e.target.value)}
                placeholder="Name or Emp ID"
                className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white w-48"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">
                Sort by total
              </label>
              <select
                value={overviewSort}
                onChange={(e) => setOverviewSort(e.target.value as SortOrder)}
                className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white"
              >
                <option value="none">Default</option>
                <option value="desc">High to low</option>
                <option value="asc">Low to high</option>
              </select>
            </div>
          </div>
        </div>

        {scope === "fixed" ? (
          <OverviewTable
            roleKey={roleKey}
            criteria={criteriaFixed}
            employees={sortByTotal(filteredEmployees, criteriaFixed)}
            savedByEmployee={savedByEmployee}
            docByEmployee={docByEmployee}
            onSelect={selectEmployee}
          />
        ) : (
          teams.map((team) => {
            const teamEmployees = filteredEmployees.filter(
              (e) => e.team_id === team.id,
            );
            if (teamEmployees.length === 0) return null;
            const teamCriteria = criteriaByTeam[team.id] ?? [];
            return (
              <div key={team.id} className="mb-8">
                <h3 className="text-sm font-semibold text-neutral-500 mb-2">
                  {team.name}
                </h3>
                <OverviewTable
                  roleKey={roleKey}
                  criteria={teamCriteria}
                  employees={sortByTotal(teamEmployees, teamCriteria)}
                  savedByEmployee={savedByEmployee}
                  docByEmployee={docByEmployee}
                  onSelect={selectEmployee}
                />
              </div>
            );
          })
        )}
        {filteredEmployees.length === 0 && (
          <p className="text-sm text-neutral-500">
            No employees match your search.
          </p>
        )}
      </div>
    </div>
  );
}