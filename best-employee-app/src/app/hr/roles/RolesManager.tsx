"use client";


import { useState } from "react";

type Role = {
  id: number;
  key: string;
  name: string;
  weight: number;
  scope: "fixed" | "per_team";
  is_admin: boolean;
};

type RoleCriterion = {
  id: number;
  role_id: number;
  team_id: number | null;
  key: string;
  label: string;
  weight: number;
  sort_order: number;
};

type Team = { id: number; name: string };

type CriterionDraft = { label: string; weight: number };

function CriteriaEditor({
  criteria,
  onChange,
  target,
}: {
  criteria: CriterionDraft[];
  onChange: (next: CriterionDraft[]) => void;
  target: number;
}) {
  const sum = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  return (
    <div className="rounded-md border border-black/10 p-3">
      {criteria.map((c, i) => (
        <div key={i} className="flex gap-2 items-center mb-2 last:mb-0">
          <input
            value={c.label}
            onChange={(e) => {
              const next = [...criteria];
              next[i] = { ...next[i], label: e.target.value };
              onChange(next);
            }}
            placeholder="Criterion name"
            className="flex-1 text-sm border border-black/10 rounded-md px-2 py-1.5 bg-white"
          />
          <input
            type="number"
            min={1}
            value={c.weight}
            onChange={(e) => {
              const next = [...criteria];
              next[i] = { ...next[i], weight: Number(e.target.value) };
              onChange(next);
            }}
            placeholder="Wt"
            className="w-20 text-sm border border-black/10 rounded-md px-2 py-1.5 bg-white"
          />
          <button
            type="button"
            onClick={() => onChange(criteria.filter((_, j) => j !== i))}
            className="text-xs text-red-600 underline"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={() => onChange([...criteria, { label: "", weight: 1 }])}
          className="text-xs underline"
        >
          + Add criterion
        </button>
        <span
          className={`text-xs ${sum === target ? "text-neutral-500" : "text-red-600 font-medium"}`}
        >
          {sum} / {target}
        </span>
      </div>
    </div>
  );
}

function criteriaForRoleTeam(
  all: RoleCriterion[],
  roleId: number,
  teamId: number | null,
): CriterionDraft[] {
  return all
    .filter((c) => c.role_id === roleId && c.team_id === teamId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ label: c.label, weight: c.weight }));
}

export default function RolesManager({
  initialRoles,
  initialCriteria,
  teams,
}: {
  initialRoles: Role[];
  initialCriteria: RoleCriterion[];
  teams: Team[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [allCriteria, setAllCriteria] = useState(initialCriteria);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(10);
  const [scope, setScope] = useState<"fixed" | "per_team">("fixed");
  const [criteriaFixed, setCriteriaFixed] = useState<CriterionDraft[]>([
    { label: "", weight: 1 },
  ]);
  const [criteriaByTeam, setCriteriaByTeam] = useState<
    Record<number, CriterionDraft[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setEditingId("new");
    setName("");
    setWeight(10);
    setScope("fixed");
    setCriteriaFixed([{ label: "", weight: 1 }]);
    setCriteriaByTeam({});
    setError(null);
  }

  function startEdit(role: Role) {
    setEditingId(role.id);
    setName(role.name);
    setWeight(role.weight);
    setScope(role.scope);
    setCriteriaFixed(
      role.scope === "fixed"
        ? criteriaForRoleTeam(allCriteria, role.id, null)
        : [{ label: "", weight: 1 }],
    );
    const byTeam: Record<number, CriterionDraft[]> = {};
    if (role.scope === "per_team") {
      for (const team of teams) {
        byTeam[team.id] = criteriaForRoleTeam(allCriteria, role.id, team.id);
      }
    }
    setCriteriaByTeam(byTeam);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const isEditing = typeof editingId === "number";
      const payload: Record<string, unknown> = { name, weight, scope };
      if (scope === "fixed") {
        payload.criteria = criteriaFixed.filter((c) => c.label.trim());
      } else {
        const criteriaByTeamPayload: Record<string, CriterionDraft[]> = {};
        for (const team of teams) {
          const list = (criteriaByTeam[team.id] ?? []).filter((c) =>
            c.label.trim(),
          );
          if (list.length > 0) criteriaByTeamPayload[String(team.id)] = list;
        }
        payload.criteriaByTeam = criteriaByTeamPayload;
      }

      const res = await fetch(
        isEditing ? `/api/roles/${editingId}` : "/api/roles",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Refresh roles + criteria from the server so the list/table reflect
      // the saved state exactly (including the new role's generated key).
      const refreshed = await fetch("/api/roles").then((r) => r.json());
      setRoles(refreshed.roles);
      setAllCriteria(refreshed.criteria);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (
      !confirm(
        "Delete this role? Its logins and evaluation history will also be removed.",
      )
    )
      return;
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRoles((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) cancelEdit();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to delete role.");
    }
  }

  const isFormOpen = editingId !== null;

  return (
    <div>
      <table className="w-full text-sm border-collapse mb-8">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 pr-4 font-medium">Weight</th>
            <th className="py-2 pr-4 font-medium">Criteria scope</th>
            <th className="py-2 pr-4 font-medium">Dashboard</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                {role.name}
                {role.is_admin && (
                  <span className="ml-2 text-xs text-neutral-500">
                    (admin)
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">{role.weight}</td>
              <td className="py-2 pr-4 text-neutral-700">
                {role.scope === "fixed" ? "Same for every team" : "Varies by team"}
              </td>
              <td className="py-2 pr-4 text-neutral-500">
                /dashboard/{role.key}
              </td>
              <td className="py-2 space-x-3">
                {!role.is_admin && (
                  <>
                    <button
                      onClick={() => startEdit(role)}
                      className="text-sm underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-sm underline text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!isFormOpen && (
        <button
          onClick={startNew}
          className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-dark"
        >
          + New role
        </button>
      )}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-black/10 p-4 space-y-4"
        >
          <h2 className="text-sm font-semibold">
            {editingId === "new" ? "New role" : "Edit role"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">
                Role name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Team Lead"
                className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">
                Weight (share of final 100-point score)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">
              Criteria scope
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope("fixed")}
                className={`text-sm px-3 py-1.5 rounded-md border ${
                  scope === "fixed"
                    ? "bg-accent text-white border-transparent"
                    : "border-black/10 text-neutral-700"
                }`}
              >
                Same criteria for every team
              </button>
              <button
                type="button"
                onClick={() => setScope("per_team")}
                className={`text-sm px-3 py-1.5 rounded-md border ${
                  scope === "per_team"
                    ? "bg-accent text-white border-transparent"
                    : "border-black/10 text-neutral-700"
                }`}
              >
                Varies by team
              </button>
            </div>
          </div>

          {scope === "fixed" ? (
            <div>
              <label className="text-xs font-medium block mb-1">
                Criteria
              </label>
              <CriteriaEditor
                criteria={criteriaFixed}
                onChange={setCriteriaFixed}
                target={weight}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-medium block">
                Criteria per team
              </label>
              {teams.length === 0 && (
                <p className="text-sm text-neutral-500">
                  No teams yet — add a team first.
                </p>
              )}
              {teams.map((team) => (
                <div key={team.id}>
                  <div className="text-xs text-neutral-600 mb-1">
                    {team.name}
                  </div>
                  <CriteriaEditor
                    criteria={criteriaByTeam[team.id] ?? []}
                    onChange={(next) =>
                      setCriteriaByTeam((prev) => ({
                        ...prev,
                        [team.id]: next,
                      }))
                    }
                    target={weight}
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save role"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}