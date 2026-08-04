import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Bell, LogOut, X } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const notifRef = useRef(null);
  const prevUnreadCountRef = useRef(0);
  const isFirstFetchRef = useRef(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifPopover(false);
      }
    }

    if (showNotifPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifPopover]);

  function playNotificationChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Notification audio chime blocked by browser autoplay policy:", e);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/v1/notifications");
      const data = await res.json();
      if (data.success) {
        const notifs = data.notifications || [];
        const newUnread = notifs.filter(n => !n.is_read).length;

        if (isFirstFetchRef.current) {
          isFirstFetchRef.current = false;
          if (newUnread > 0) {
            playNotificationChime();
          }
        } else if (newUnread > prevUnreadCountRef.current) {
          playNotificationChime();
        }

        prevUnreadCountRef.current = newUnread;
        setNotifications(notifs);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function markAsRead(id) {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "PUT" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <nav className="app-navbar">
      {/* Brand Logo & Name Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <img
          src="/nysa_logo.jpg"
          alt="Nysa Biomed Logo"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            objectFit: "contain",
            background: "white",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            padding: "2px"
          }}
        />
        <div>
          <h1 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#1F2937", lineHeight: 1.2, letterSpacing: "-0.2px" }}>
            Nysa Biomed <span style={{ color: "#0D9488" }}>Pvt. Ltd.</span>
          </h1>
          <p style={{ fontSize: "0.72rem", color: "#6B7280", fontWeight: "700", letterSpacing: "0.2px" }}>
            Controlled BMR / BPR System
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Notifications Icon with Popover */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#374151",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showNotifPopover && (
            <div style={{
              position: "absolute",
              right: 0,
              top: "48px",
              width: "340px",
              background: "#FFFFFF",
              border: "1px solid #EAE7E1",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              zIndex: 100,
              padding: "1rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid #F3F4F6", paddingBottom: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "#1F2937" }}>Notifications</h4>
                  <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>({unreadCount} unread)</span>
                </div>
                <button
                  onClick={() => setShowNotifPopover(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "#9CA3AF", textAlign: "center", padding: "1rem 0" }}>No notifications yet</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        background: n.is_read ? "#FFFFFF" : "#F0FDFA",
                        borderLeft: n.is_read ? "3px solid transparent" : "3px solid #0D9488",
                        marginBottom: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1F2937", margin: 0 }}>{n.title}</p>
                      <p style={{ fontSize: "0.78rem", color: "#4B5563", margin: "2px 0 4px 0" }}>{n.message}</p>
                      <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Red Logout Button */}
        <button
          onClick={logout}
          style={{
            padding: "0.45rem 0.85rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            borderRadius: "8px",
            background: "#FEF2F2",
            color: "#DC2626",
            border: "1px solid #FCA5A5",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
          title="Logout of system"
        >
          <LogOut size={16} color="#DC2626" />
          Logout
        </button>
      </div>
    </nav>
  );
}
