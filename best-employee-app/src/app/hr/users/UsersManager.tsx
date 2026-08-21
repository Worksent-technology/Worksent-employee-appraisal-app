"use client";

import { useState } from "react";

type Role = {
  id: number;
  key: string;
  name: string;
  is_admin: boolean;
};

type UserRow = {
  id: number;
  email: string;
  name: string;
  role_id: number;
  role_key: string;
  role_name: string;
  is_admin: boolean;
};

export default function UsersManager({
  initialUsers,
  roles,
}: {
  initialUsers: UserRow[];
  roles: Role[];
}) {
  const emptyForm = {
    name: "",
    email: "",
    password: "",
    roleId: roles[0]?.id ?? 0,
  };

  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.role_id,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(isEditing ? `/api/users/${editingId}` : "/api/users", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isEditing ? "Failed to update user." : "Failed to create user."));
        return;
      }
      if (isEditing) {
        setUsers((prev) => prev.map((u) => (u.id === editingId ? data.user : u)));
      } else {
        setUsers((prev) => [...prev, data.user]);
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this login?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (editingId === id) cancelEdit();
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) alert(data.error);
    }
  }

  const isEditing = editingId !== null;

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border border-black/10 p-4 grid sm:grid-cols-2 gap-3"
      >
        <div>
          <label className="text-xs font-medium block mb-1">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">
            {isEditing ? "New password" : "Temporary password"}
          </label>
          <input
            type="text"
            required={!isEditing}
            minLength={8}
            placeholder={isEditing ? "Leave blank to keep current password" : ""}
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Role</label>
          <select
            value={form.roleId}
            onChange={(e) =>
              setForm((f) => ({ ...f, roleId: Number(e.target.value) }))
            }
            className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create login"}
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
        </div>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-black/5">
              <td className="py-2 pr-4">{u.name}</td>
              <td className="py-2 pr-4">{u.email}</td>
              <td className="py-2 pr-4">{u.role_name}</td>
              <td className="py-2 space-x-3">
                <button
                  onClick={() => startEdit(u)}
                  className="text-sm underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-sm underline text-red-600"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-500">
                No logins yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}