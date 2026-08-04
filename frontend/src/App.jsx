import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { QADashboard } from "./pages/QADashboard";
import { ProductionDashboard } from "./pages/ProductionDashboard";
import "./styles/theme.css";

function MainApp() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Navbar />
      <main>
        {user.role === "QA_ADMIN" ? <QADashboard /> : <ProductionDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
