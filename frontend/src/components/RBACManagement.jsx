import React, { useState, useEffect } from "react";
import { User, Key, Shield, Plus, Edit2, Check, Eye, EyeOff, Lock, Building, UserCheck } from "lucide-react";

export function RBACManagement() {
  const [users, setUsers] = useState([
    { id: 1, username: "qa_admin", full_name: "Dr. Rajesh Sharma (QA Lead)", role: "QA_ADMIN", department: "Quality Assurance", plain_password: "admin123" },
    { id: 2, username: "production_op", full_name: "Amit Verma (Plant Officer)", role: "PRODUCTION", department: "Production Division 1", plain_password: "prod123" }
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});

  // Form State
  const [roleType, setRoleType] = useState("QA_ADMIN"); // QA_ADMIN, PRODUCTION, CUSTOM
  const [customRole, setCustomRole] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Quality Assurance");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/users");
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAdd() {
    setEditingUser(null);
    setRoleType("QA_ADMIN");
    setCustomRole("");
    setUsername("");
    setFullName("");
    setDepartment("Quality Assurance");
    setPassword("");
    setShowAddModal(true);
  }

  function handleOpenEdit(u) {
    setEditingUser(u);
    const isPreset = u.role === "QA_ADMIN" || u.role === "PRODUCTION";
    setRoleType(isPreset ? u.role : "CUSTOM");
    setCustomRole(isPreset ? "" : u.role);
    setUsername(u.username);
    setFullName(u.full_name);
    setDepartment(u.department || "");
    setPassword(u.plain_password || "");
    setShowAddModal(true);
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    const selectedRole = roleType === "CUSTOM" ? customRole.toUpperCase().replace(/\s+/g, "_") : roleType;

    if (!selectedRole || !username || !fullName) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        username,
        full_name: fullName,
        role: selectedRole,
        department,
        password: password || undefined,
      };

      const url = editingUser ? `/api/v1/auth/users/${editingUser.id}` : "/api/v1/auth/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchUsers();
      } else {
        alert(data.message || "Failed to save user role");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  }

  function togglePasswordVisibility(id) {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function getInitials(name) {
    if (!name) return "U";
    const parts = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "14px", border: "1px solid #EAE7E1", padding: "1.75rem", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", borderBottom: "1px solid #F3F4F6", paddingBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1F2937", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Shield size={22} color="#0D9488" />
            Role-Based Access Control (RBMS) & User Accounts
          </h3>
          <p style={{ fontSize: "0.83rem", color: "#6B7280", margin: "4px 0 0 0" }}>
            QA Admin has exclusive authority to configure user roles, departments, and credentials.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{ padding: "0.6rem 1.15rem", fontSize: "0.85rem", boxShadow: "0 2px 8px rgba(13,148,136,0.25)" }}
        >
          <Plus size={16} />
          Create New Role & User
        </button>
      </div>

      {/* USER ROLES SPACIOUS TABLE */}
      <div style={{ border: "1px solid #EAE7E1", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#F8F6F0", borderBottom: "1px solid #EAE7E1" }}>
              <th style={{ padding: "0.9rem 1.25rem", color: "#4B5563", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>User ID / Login</th>
              <th style={{ padding: "0.9rem 1.25rem", color: "#4B5563", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</th>
              <th style={{ padding: "0.9rem 1.25rem", color: "#4B5563", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Role</th>
              <th style={{ padding: "0.9rem 1.25rem", color: "#4B5563", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Department</th>
              <th style={{ padding: "0.9rem 1.25rem", color: "#4B5563", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</th>
              <th style={{ padding: "0.9rem 1.25rem", color: "#4B5563", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #F3F4F6", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#FBF9F5"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                {/* USERNAME BADGE */}
                <td style={{ padding: "1.1rem 1.25rem" }}>
                  <span style={{
                    fontFamily: "monospace",
                    background: "#F0FDFA",
                    color: "#0F766E",
                    border: "1px solid #CCFBF1",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    display: "inline-block",
                    letterSpacing: "0.02em"
                  }}>
                    {u.username}
                  </span>
                </td>

                {/* FULL NAME WITH INITIALS AVATAR CHIP */}
                <td style={{ padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: u.role === "QA_ADMIN" ? "#E6F4F1" : "#EFF6FF",
                      color: u.role === "QA_ADMIN" ? "#0F766E" : "#1D4ED8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      border: "1px solid rgba(0,0,0,0.06)",
                      flexShrink: 0
                    }}>
                      {getInitials(u.full_name)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: "#1F2937", margin: 0, fontSize: "0.9rem" }}>{u.full_name}</p>
                      <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>ID #{u.id}</span>
                    </div>
                  </div>
                </td>

                {/* ROLE BADGE */}
                <td style={{ padding: "1.1rem 1.25rem" }}>
                  <span style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    letterSpacing: "0.03em",
                    background: u.role === "QA_ADMIN" ? "#F0FDFA" : u.role === "PRODUCTION" ? "#EFF6FF" : "#FEF3C7",
                    color: u.role === "QA_ADMIN" ? "#0F766E" : u.role === "PRODUCTION" ? "#1D4ED8" : "#D97706",
                    border: u.role === "QA_ADMIN" ? "1px solid #CCFBF1" : u.role === "PRODUCTION" ? "1px solid #BFDBFE" : "1px solid #FDE68A",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <UserCheck size={13} />
                    {u.role}
                  </span>
                </td>

                {/* DEPARTMENT */}
                <td style={{ padding: "1.1rem 1.25rem", color: "#4B5563" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Building size={14} color="#9CA3AF" />
                    {u.department || "Quality Assurance"}
                  </div>
                </td>

                {/* PASSWORD PILL CONTAINER */}
                <td style={{ padding: "1.1rem 1.25rem" }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "8px"
                  }}>
                    <Lock size={13} color="#9CA3AF" />
                    <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 800, color: "#334155" }}>
                      {showPasswords[u.id] ? (u.plain_password || "••••••••") : "••••••••"}
                    </span>
                    <button
                      onClick={() => togglePasswordVisibility(u.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: "2px", display: "flex" }}
                      title="Toggle password view"
                    >
                      {showPasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </td>

                {/* ACTION BUTTON */}
                <td style={{ padding: "1.1rem 1.25rem", textAlign: "center" }}>
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="btn-secondary"
                    style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", borderRadius: "8px", fontWeight: 700 }}
                  >
                    <Edit2 size={13} />
                    Edit Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div className="modal-card" style={{ width: "460px", padding: "2rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1F2937", marginTop: 0, marginBottom: "1.25rem" }}>
              {editingUser ? "Edit User Role & Password" : "Create New User Role"}
            </h3>

            <form onSubmit={handleSaveUser}>
              {/* Role Selector Dropdown */}
              <div className="form-group">
                <label className="form-label">Select Role Category *</label>
                <select
                  className="form-input"
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                >
                  <option value="QA_ADMIN">QA Admin (Quality Assurance)</option>
                  <option value="PRODUCTION">Production Operator (Plant Officer)</option>
                  <option value="CUSTOM">+ Add Custom Role (QA Admin Defined)</option>
                </select>
              </div>

              {/* Custom Role Text Field */}
              {roleType === "CUSTOM" && (
                <div className="form-group">
                  <label className="form-label">Type Custom Role Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PACKAGING_SUPERVISOR, QA_AUDITOR"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Unique Username / ID */}
              <div className="form-group">
                <label className="form-label">Unique User ID / Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. qa_lead_02, prod_sup_01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Department */}
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Quality Assurance, Packaging"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Editable Password *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter user password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save User Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
