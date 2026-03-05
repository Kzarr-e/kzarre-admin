"use client";

import React, { useEffect, useState } from "react";
import { Plus, X, Shield } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { authApi } from "@/lib/auth";
import toast from "react-hot-toast";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL;


/* ===================================================
   DATA HOOKS
=================================================== */
const useRoles = () => {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    console.log("UserManagement: Fetching roles...");
    authApi.authenticatedFetch(`${API_BASE}/api/usersadmin/roles`)
      .then(res => {
        console.log("UserManagement: Roles response status:", res.status);
        if (!res.ok) throw new Error(`Failed to fetch roles (${res.status})`);
        return res.json();
      })
      .then(data => {
        console.log("UserManagement: Roles data:", data);
        setRoles(data.roles || []);
      })
      .catch(err => {
        console.error("UserManagement: Roles error:", err.message);
        // If unauthorized, the user might need to login again
        if (err.message.includes("401")) {
          console.log("UserManagement: Authentication failed, redirecting to login");
          window.location.href = "/admin/login";
        }
      });
  }, []);

  return roles;
};


const deleteUser = async (user, refresh) => {
  if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;

  const token =
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("refresh_token");

  try {
    const res = await fetch(
      `${API_BASE}/api/usersadmin/users/${user._id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");

    toast.success("✅ User deleted successfully");
    // refresh list
    refresh?.();

  } catch (err) {
    toast.error("❌ " + err.message);
  }
};

const toggleUserStatus = async (user) => {
  const newStatus = !user.isActive;

  const token =
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("refresh_token");

  try {
    const res = await fetch(
      `${API_BASE}/api/usersadmin/users/${user._id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: newStatus }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Status update failed");

    toast.success(`✅ User ${newStatus ? "activated" : "deactivated"}`);
    setRefreshKey(k => k + 1);

  } catch (err) {
    toast.error("❌ " + err.message);
  }
};


const useMyRole = () => {
  const [role, setRole] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(sessionStorage.getItem("role") || "");
    }
  }, []);

  return role;
};

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const roles = useRoles(); // ✅ backend roles

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
  });

  const [loading, setLoading] = useState(false);

  const selectedRole = roles.find(r => r._id === form.roleId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.roleId) {
      toast.success("Please select a role");
      return;
    }

    const token =
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("refresh_token");

    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/api/usersadmin/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            roleId: form.roleId, // ✅ ONLY ROLE
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("✅ User created successfully");
      onUserAdded();
      onClose();
    } catch (err) {
      toast.error("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-xl max-w-2xl w-full shadow-xl p-6 sm:p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--textPrimary)]">
            Add New User
          </h2>
          <button onClick={onClose}>
            ✕
          </button>
        </div>

      
        {/* <form onSubmit={handleSubmit} className="space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder="First name"
              required
              className="input"
              onChange={(e) =>
                setForm({ ...form, firstName: e.target.value })
              }
            />
            <input
              placeholder="Last name"
              required
              className="input"
              onChange={(e) =>
                setForm({ ...form, lastName: e.target.value })
              }
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            required
            className="input"
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

       
          <select
            required
            className="input"
            value={form.roleId}
            onChange={(e) =>
              setForm({ ...form, roleId: e.target.value })
            }
          >
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>

         
          {selectedRole && (
            <div className="text-xs bg-black/5 p-3 rounded">
              <strong>Permissions:</strong>{" "}
              {selectedRole.permissions?.join(", ") || "—"}
            </div>
          )}

    
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form> */}

        <form onSubmit={handleSubmit} className="space-y-6">

  {/* NAME */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-600">
        First Name
      </label>
      <input
        type="text"
        placeholder="John"
        required
        autoComplete="given-name"
        className="input px-4 py-2 border "
        value={form.firstName || ""}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, firstName: e.target.value }))
        }
      />
    </div>

    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-600">
        Last Name
      </label>
      <input
        type="text"
        placeholder="Doe"
        required
        autoComplete="family-name"
        className="input px-4 py-2 border "
        value={form.lastName || ""}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, lastName: e.target.value }))
        }
      />
    </div>

  </div>

  {/* EMAIL */}
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-600">
      Email Address
    </label>
    <input
      type="email"
      placeholder="john@example.com"
      required
      autoComplete="email"
      className="input px-4 py-2 border"
      value={form.email || ""}
      onChange={(e) =>
        setForm((prev) => ({ ...prev, email: e.target.value }))
      }
    />
  </div>

  {/* ROLE SELECT */}
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-600">
      Role
    </label>

    <select
      required
      className="input px-4 py-2  border"
      value={form.roleId || ""}
      onChange={(e) =>
        setForm((prev) => ({ ...prev, roleId: e.target.value }))
      }
    >
      <option value="">Select Role</option>

      {roles.map((role) => (
        <option key={role._id} value={role._id}>
          {role.name}
        </option>
      ))}
    </select>
  </div>

  {/* PERMISSION PREVIEW */}
  {selectedRole && (
    <div className="text-sm bg-gray-50 border border-gray-200 p-3 rounded-lg">

      <div className="font-semibold text-gray-700 mb-1">
        Role Permissions
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedRole.permissions?.length ? (
          selectedRole.permissions.map((perm) => (
            <span
              key={perm}
              className="text-xs bg-gray-200 px-2 py-1 rounded"
            >
              {perm}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400">
            No permissions assigned
          </span>
        )}
      </div>

    </div>
  )}

  {/* ACTIONS */}
  <div className="flex justify-end gap-3 pt-2">

    <button
      type="button"
      onClick={onClose}
      disabled={loading}
      className="btn-secondary bg-black text-white px-4 py-2 text-sm  rounded-lg border-b"
    >
      Cancel
    </button>

    <button
      type="submit"
      disabled={loading}
     className="px-4 py-2 text-sm bg-[var(--accent-green)] rounded-lg"
    >
      {loading ? "Creating User..." : "Create User"}
    </button>

  </div>

</form>
      </div>
    </div>
  );
};

const usePermissions = () => {
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    console.log("UserManagement: Fetching permissions...");
    authApi.authenticatedFetch(`${API_BASE}/api/usersadmin/permissions`)
      .then(res => {
        console.log("UserManagement: Permissions response status:", res.status);
        if (!res.ok) throw new Error(`Failed to fetch permissions (${res.status})`);
        return res.json();
      })
      .then(data => {
        console.log("UserManagement: Permissions data:", data);
        setPermissions(data.permissions || []);
      })
      .catch(error => {
        console.error("UserManagement: Error fetching permissions:", error);
        if (error.message.includes("401")) {
          console.log("UserManagement: Authentication failed, redirecting to login");
          window.location.href = "/admin/login";
        }
      });
  }, []);

  return permissions;
};

const UserList = ({ refreshKey, onEditPermissions }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("UserList: Fetching users...");
    setLoading(true);
    setError(null);

    authApi.authenticatedFetch(`${API_BASE}/api/usersadmin/users`)
      .then(res => {
        console.log("UserList: Users response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication failed - please login again");
          }
          throw new Error(`Failed to fetch users (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        console.log("UserList: Users data:", data);
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error("UserList: Error fetching users:", error);
        setError(error.message);
        setLoading(false);

        // If unauthorized, redirect to login
        if (error.message.includes("Authentication failed")) {
          toast("Session expired. Please login again.");
          window.location.href = "/admin/login";
        }
      });
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-green)]"></div>
          <span className="ml-3 text-[var(--text-secondary)]">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-2xl p-6">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--accent-green)] text-black rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background-card)] border rounded-2xl p-6">
      <h3 className="text-lg font-bold text-[var(--textPrimary)] mb-4">
        User List
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Permissions</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>

                {/* ✅ ROLE */}
                <td className="px-4 py-3 font-medium">
                  {u.roleId?.name || "—"}
                </td>

                {/* ✅ ROLE-BASED PERMISSIONS */}
                <td className="px-4 py-3 text-xs text-[var(--textSecondary)]">
                  {u.roleId?.permissions?.join(", ") || "—"}
                </td>

                <td className="px-4 py-3">
                  {u.isActive ? "Active" : "Inactive"}
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-3 items-center">

                    {/* EDIT PERMISSIONS */}
                    <button
                      onClick={() => onEditPermissions(u)}
                      className="text-green-500 text-xs flex items-center gap-1"
                    >
                      <Shield size={14} />
                      Edit
                    </button>

                    {/* ACTIVATE / DEACTIVATE */}
                    <button
                      onClick={() => toggleUserStatus(u)}
                      className={`text-xs flex items-center gap-1 ${u.isActive ? "text-orange-500" : "text-blue-500"
                        }`}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>

                    {/* DELETE USER */}
                    <button
                      onClick={() => deleteUser(u, () => setRefreshKey(k => k + 1))}
                      className="text-red-500 text-xs flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EditPermissionsModal = ({ user, onClose }) => {
  const permissions = usePermissions();
  const [selected, setSelected] = useState(
    user.roleId?.permissions || []
  );


  const toggle = key =>
    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(x => x !== key)
        : [...prev, key]
    );

  const save = async () => {
    const token =
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("refresh_token");

    await fetch(
      `${API_BASE}/api/usersadmin/update-permissions/${user._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions: selected }),
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-[var(--textPrimary)]">
          Edit Permissions – {user.name}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {permissions.map(p => (
            <label key={p.key} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(p.key)}
                onChange={() => toggle(p.key)}
                className="accent-green-500"
              />
              {p.label}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-[var(--borderColor)] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm bg-[var(--accent-green)] rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateRoleModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const permissions = usePermissions();

  const toggle = key =>
    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(x => x !== key)
        : [...prev, key]
    );

  const create = async () => {
    if (!name.trim()) return toast("Role name required");

    try {
      setSaving(true);
      const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("refresh_token");

      const res = await fetch(`${API_BASE}/api/usersadmin/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, permissions: selected }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      onCreated?.();
      onClose();
    } catch (e) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-xl w-full max-w-xl p-6">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-bold text-[var(--textPrimary)]">
            Create Role
          </h2>
          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <input
          placeholder="Role name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full mb-5 border border-[var(--borderColor)] bg-transparent rounded-lg px-3 py-2"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {permissions.map(p => (
            <label key={p.key} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(p.key)}
                onChange={() => toggle(p.key)}
                className="accent-green-500"
              />
              {p.label}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--borderColor)] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent-green)] rounded-lg"
          >
            {saving ? "Creating..." : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RolesPermissions = ({
  onViewRole,
  onEditRole,
  onDeleteRole,
}) => {
  const roles = useRoles();

  return (
    <div className="bg-[var(--background-card)] border border-b rounded-2xl p-6">


      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-b">
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Permissions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {roles.length === 0 ? (
              <tr>

                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-[var(--textSecondary)]"
                >
                  No roles found
                </td>
              </tr>
            ) : (
              roles.map((r) => (
                <tr
                  key={r._id}
                  className="
                    border-b 
                    hover:bg-black/5 dark:hover:bg-white/5 transition
                  "
                >
                  {/* ROLE NAME */}
                  <td className="px-4 py-3 font-medium text-[var(--textPrimary)]">
                    {r.name}
                  </td>

                  {/* PERMISSIONS */}
                  <td className="px-4 py-3 text-xs text-[var(--textSecondary)]">
                    {r.permissions?.length
                      ? r.permissions.join(", ")
                      : "—"}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      {/* VIEW */}
                      <button
                        onClick={() => onViewRole?.(r)}
                        className="
                          text-blue-500 hover:text-blue-600 
                          flex items-center gap-1 text-xs
                        "
                      >
                        <Eye size={14} />
                      </button>

                      {/* EDIT */}
                      <button
                        onClick={() => onEditRole?.(r)}
                        className="
                          text-green-500 hover:text-green-600 
                          flex items-center gap-1 text-xs
                        "
                      >
                        <Pencil size={14} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => onDeleteRole?.(r)}
                        className="
                          text-red-500 hover:text-red-600 
                          flex items-center gap-1 text-xs
                        "
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ViewRoleModal = ({ role, onClose }) => {
  if (!role) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[var(--textPrimary)]">
            Role Details
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-[var(--textSecondary)]">Role Name</p>
          <p className="font-medium">{role.name}</p>
        </div>

        <div>
          <p className="text-sm text-[var(--textSecondary)] mb-2">
            Permissions
          </p>
          <div className="flex flex-wrap gap-2">
            {role.permissions?.length ? (
              role.permissions.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2 py-1 rounded bg-black/5"
                >
                  {p}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--textSecondary)]">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditRoleModal = ({ role, onClose, onUpdated }) => {
  const permissions = usePermissions();
  const [name, setName] = useState(role.name);
  const [selected, setSelected] = useState(role.permissions || []);
  const [saving, setSaving] = useState(false);

  const toggle = (key) =>
    setSelected((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key]
    );

  const save = async () => {
    try {
      setSaving(true);
      const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("refresh_token");

      const res = await fetch(
        `${API_BASE}/api/usersadmin/roles/${role._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            permissions: selected,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("✅ Role updated");
      onUpdated?.();
      onClose();
    } catch (e) {
      toast.error("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] border border-[var(--borderColor)] rounded-xl w-full max-w-lg p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--textPrimary)]">
            Edit Role
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-3 py-2 border rounded bg-transparent"
          placeholder="Role name"
        />

        <div className="grid grid-cols-2 gap-3 mb-6">
          {permissions.map((p) => (
            <label key={p.key} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(p.key)}
                onChange={() => toggle(p.key)}
              />
              {p.label}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent-green)] rounded-lg"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};


const deleteRole = async (roleId) => {
  const token = sessionStorage.getItem("access_token");

  if (!token) {
    toast.error("Session expired. Please login again.");
    return;
  }

  const res = await fetch(
    `${API_BASE}/api/usersadmin/roles/${roleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
};



const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const token = sessionStorage.getItem("access_token");

  useEffect(() => {
    fetch(`${API_BASE}/api/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setLogs(data.logs || []));
  }, []);

  return (
    <div className="bg-[var(--background-card)] border rounded-2xl p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b ">
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">IP</th>
            <th className="px-4 py-3 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i} className="border-b">
              <td className="px-4 py-3">{l.userName}</td>
              <td className="px-4 py-3">{l.action}</td>
              <td className="px-4 py-3">{l.ip}</td>
              <td className="px-4 py-3">
                {new Date(l.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function UserManagement() {
  const [tab, setTab] = useState("users");
  const [editUser, setEditUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewRole, setViewRole] = useState(null);
  const [editRole, setEditRole] = useState(null);

  return (
    <ProtectedRoute permissions={["manage_users"]}>
      <div className="min-h-screen p-1 space-y-1">
        <div className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--textPrimary)]">
            User Management
          </h1>

          <p className="text-sm sm:text-base text-[var(--textSecondary)] mt-1">
            Manage and control system users
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 mb-6">
          <div
            className="
              flex gap-4 sm:gap-8 
              border-b 
              w-full sm:w-auto overflow-x-auto
            "
          >
            {["users", "roles", "activity"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium ${tab === t
                  ? "border-b-2 !border-[var(--accent-green)]"
                  : "text-[var(--textSecondary)]"
                  }`}

              >
                {t === "users"
                  ? "User List"
                  : t === "roles"
                    ? "Roles & Permissions"
                    : "Activity Log"}
              </button>
            ))}
          </div>


          <button
            onClick={() => setShowAddModal(true)}
            className="
                w-full sm:w-auto px-4 py-2 
                bg-green-400 text-black rounded-lg 
                hover:bg-green-500 active:scale-95 
                flex items-center justify-center gap-2 font-medium text-sm
              "
          >
            <Plus size={18} /> Add User
          </button>

        </div>

        {tab === "users" && (

          <UserList
            refreshKey={refreshKey}
            onEditPermissions={setEditUser}
          />
        )}
        {tab === "roles" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[var(--textPrimary)]">
                Roles & Permissions
              </h2>
              <button
                onClick={() => setShowCreateRole(true)}
                className="px-4 py-2  bg-green-400 text-black rounded-lg 
                hover:bg-green-500 active:scale-95 rounded-lg text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Create Role
              </button>
            </div>
            <RolesPermissions
              onViewRole={(role) => setViewRole(role)}
              onEditRole={(role) => setEditRole(role)}
              onDeleteRole={async (role) => {
                if (!confirm(`Delete role "${role.name}"?`)) return;
                try {
                  await deleteRole(role._id);
                  toast.success("✅ Role deleted");
                  setRefreshKey((k) => k + 1);
                } catch (e) {
                  toast.error("❌ " + e.message);
                }
              }}

            />

          </>
        )}

        {tab === "activity" && <ActivityLog />}

        {editUser && (
          <EditPermissionsModal
            user={editUser}
            onClose={() => setEditUser(null)}
          />
        )}
        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onUserAdded={() => setRefreshKey((k) => k + 1)}
        />

        <CreateRoleModal
          isOpen={showCreateRole}
          onClose={() => setShowCreateRole(false)}
          onCreated={() => setRefreshKey(k => k + 1)}
        />
      </div>
      {viewRole && (
        <ViewRoleModal
          role={viewRole}
          onClose={() => setViewRole(null)}
        />
      )}

      {editRole && (
        <EditRoleModal
          role={editRole}
          onClose={() => setEditRole(null)}
          onUpdated={() => setRefreshKey((k) => k + 1)}
        />
      )}

    </ProtectedRoute>
  );
}
