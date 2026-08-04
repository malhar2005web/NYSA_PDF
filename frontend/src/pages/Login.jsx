import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FileCheck, Shield, User, Lock, ArrowRight, AlertCircle } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError("Please enter your username and password");
      return;
    }

    setLoading(true);
    setError("");

    const res = await login(username, password);
    if (!res.success) {
      setError(res.message || "Invalid username or password");
    }
    setLoading(false);
  }

  function handleQuickLogin(userRole) {
    if (userRole === "QA_ADMIN") {
      setUsername("qa_admin");
      setPassword("admin123");
      setTimeout(() => login("qa_admin", "admin123"), 100);
    } else {
      setUsername("production_op");
      setPassword("prod123");
      setTimeout(() => login("production_op", "prod123"), 100);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-main)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div className="modal-card" style={{ maxWidth: "440px", padding: "2.5rem 2rem" }}>
        {/* Brand Logo Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="/nysa_logo.jpg"
            alt="Nysa Biomed Pvt. Ltd. Logo"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              objectFit: "contain",
              background: "white",
              border: "1.5px solid #CCFBF1",
              margin: "0 auto 1rem",
              boxShadow: "0 6px 18px rgba(13, 148, 136, 0.2)",
              padding: "4px"
            }}
          />
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#1F2937", letterSpacing: "-0.2px" }}>
            Nysa Biomed <span style={{ color: "#0D9488" }}>Pvt. Ltd.</span>
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#6B7280", fontWeight: 700, marginTop: "0.2rem" }}>
            Controlled BMR / BPR Document System
          </p>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: "relative" }}>
              <User size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#9CA3AF" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "38px" }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#9CA3AF" }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: "38px" }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.8rem" }}>
            {loading ? "Authenticating..." : "Sign In to System"}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Account Login Shortcuts */}
        <div style={{ marginTop: "2rem", borderTop: "1px solid #EAE7E1", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6B7280", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            Quick Demo Login Shortcuts
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <button
              onClick={() => handleQuickLogin("QA_ADMIN")}
              className="btn-secondary"
              style={{ padding: "0.6rem 0.5rem", fontSize: "0.8rem", justifyContent: "center", background: "#E6F4F1", borderColor: "#99F6E4", color: "#0F766E" }}
            >
              <Shield size={14} />
              QA / Admin
            </button>
            <button
              onClick={() => handleQuickLogin("PRODUCTION")}
              className="btn-secondary"
              style={{ padding: "0.6rem 0.5rem", fontSize: "0.8rem", justifyContent: "center", background: "#ECFEFF", borderColor: "#A5F3FC", color: "#0891B2" }}
            >
              <User size={14} />
              Production User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
