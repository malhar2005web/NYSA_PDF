import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("pharma_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("pharma_token") || "");
  const [loading, setLoading] = useState(false);

  async function login(username, password) {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("pharma_user", JSON.stringify(data.user));
        localStorage.setItem("pharma_token", data.token);
        return { success: true };
      }
      return { success: false, message: data.message || "Invalid credentials" };
    } catch (e) {
      return { success: false, message: "Network connection error" };
    }
  }

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {}
    setUser(null);
    setToken("");
    localStorage.removeItem("pharma_user");
    localStorage.removeItem("pharma_token");
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
