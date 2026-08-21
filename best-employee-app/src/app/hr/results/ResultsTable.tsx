"use client";


import { useMemo, useState } from "react";
import { PerformanceBand } from "@/lib/scoring";

type RoleMeta = { key: string; name: string };
type TeamMeta = { id: number; name: string };

type Row = {
  id: number;
  name: string;
  empId: string;
  teamId: number;
  teamName: string;
  scores: Record<string, number>;
  finalScore: number;
  band: PerformanceBand;
  complete: boolean;
  qualifies: boolean;
};

type SortOrder = "none" | "desc" | "asc";

const bandColor: Record<PerformanceBand, string> = {
  Outstanding: "bg-emerald-100 text-emerald-800",
  "Exceeds Expectations": "bg-blue-100 text-blue-800",
  "Strong Performer": "bg-amber-100 text-amber-800",
  "Needs Improvement": "bg-red-100 text-red-800",
};

export default function ResultsTable({
  rows,
  roles,
  teams,
}: {
  rows: Row[];
  roles: RoleMeta[];
  teams: TeamMeta[];
}) {
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<number | "all">("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  const visibleRows = useMemo(() => {
    let result = rows;

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (row) =>
          row.name.toLowerCase().includes(query) ||
          row.empId.toLowerCase().includes(query),
      );
    }

    if (teamId !== "all") {
      result = result.filter((row) => row.teamId === teamId);
    }

    if (sortOrder !== "none") {
      result = [...result].sort((a, b) =>
        sortOrder === "desc"
          ? b.finalScore - a.finalScore
          : a.finalScore - b.finalScore,
      );
    }

    return result;
  }, [rows, search, teamId, sortOrder]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-medium block mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or Emp ID"
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white w-48"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Team</label>
          <select
            value={teamId}
            onChange={(e) =>
              setTeamId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">
            Sort by final score
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="none">Default</option>
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
        </div>
        {(search || teamId !== "all" || sortOrder !== "none") && (
          <button
            onClick={() => {
              setSearch("");
              setTeamId("all");
              setSortOrder("none");
            }}
            className="text-sm underline text-neutral-500 pb-1.5"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-neutral-500 pb-1.5 ml-auto">
          {visibleRows.length} of {rows.length}
        </span>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="py-2 pr-4 font-medium">Employee</th>
            <th className="py-2 pr-4 font-medium">Team</th>
            {roles.map((role) => (
              <th
                key={role.key}
                className="py-2 pr-4 font-medium text-right"
              >
                {role.name}
              </th>
            ))}
            <th className="py-2 pr-4 font-medium text-right">Final</th>
            <th className="py-2 pr-4 font-medium">Rating</th>
            <th className="py-2 font-medium">Award</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.id} className="border-b border-black/5 align-top">
              <td className="py-2 pr-4">
                <div className="text-neutral-900">{row.name}</div>
                <div className="text-xs text-neutral-500">{row.empId}</div>
              </td>
              <td className="py-2 pr-4 text-neutral-700">{row.teamName}</td>
              {roles.map((role) => (
                <td
                  key={role.key}
                  className="py-2 pr-4 text-right tabular-nums"
                >
                  {(row.scores[role.key] ?? 0).toFixed(1)}
                </td>
              ))}
              <td className="py-2 pr-4 text-right tabular-nums font-medium">
                {row.complete ? row.finalScore.toFixed(1) : "—"}
              </td>
              <td className="py-2 pr-4">
                {row.complete ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-medium ${bandColor[row.band]}`}
                  >
                    {row.band}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">Incomplete</span>
                )}
              </td>
              <td className="py-2">
                {row.qualifies ? (
                  <span className="text-xs px-2 py-1 rounded-md font-medium bg-accent text-white">
                    Qualifies
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">—</span>
                )}
              </td>
            </tr>
          ))}
          {visibleRows.length === 0 && (
            <tr>
              <td
                colSpan={4 + roles.length}
                className="py-6 text-center text-neutral-500"
              >
                {rows.length === 0
                  ? "No employees yet."
                  : "No employees match your filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}