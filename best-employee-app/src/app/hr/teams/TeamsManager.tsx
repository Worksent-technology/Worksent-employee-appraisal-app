"use client";


import { useState } from "react";

type Team = { id: number; key: string; name: string };

export default function TeamsManager({
  initialTeams,
}: {
  initialTeams: Team[];
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(team: Team) {
    setEditingId(team.id);
    setForm({ name: team.name });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "" });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(
        isEditing ? `/api/teams/${editingId}` : "/api/teams",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (isEditing) {
        setTeams((prev) =>
          prev.map((t) => (t.id === editingId ? data.team : t)),
        );
      } else {
        setTeams((prev) =>
          [...prev, data.team].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (
      !confirm(
        "Remove this team? You can only delete a team once no employees are assigned to it.",
      )
    )
      return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTeams((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) cancelEdit();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to delete team.");
    }
  }

  const isEditing = editingId !== null;

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border border-black/10 p-4 flex gap-3 items-end flex-wrap"
      >
        <div className="flex-1 min-w-[12rem]">
          <label className="text-xs font-medium block mb-1">Team name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
            className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            placeholder="e.g. Cloud Support Team"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Add team"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        )}
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className="border-b border-black/5">
              <td className="py-2 pr-4">{team.name}</td>
              <td className="py-2 space-x-3">
                <button
                  onClick={() => startEdit(team)}
                  className="text-sm underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="text-sm underline text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {teams.length === 0 && (
            <tr>
              <td colSpan={2} className="py-6 text-center text-neutral-500">
                No teams yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}