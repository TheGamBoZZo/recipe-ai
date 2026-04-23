"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";

const TIMEOUT_MS   = 5 * 60 * 1000;   // 5 minutes inactive → sign out
const WARNING_MS   = 60 * 1000;         // show warning 1 minute before sign-out
const EVENTS       = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function InactivityGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (timeoutRef.current)   clearTimeout(timeoutRef.current);
    if (warningRef.current)   clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const reset = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setSecondsLeft(60);

    // Schedule warning
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);
      // Countdown tick
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(countdownRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    // Schedule sign-out
    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/" });
    }, TIMEOUT_MS);
  }, []);

  // Extend session on user activity
  const handleActivity = useCallback(() => {
    if (showWarning) return; // don't reset if warning is showing — use the button
    reset();
  }, [reset, showWarning]);

  useEffect(() => {
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      clearAll();
      EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [reset, handleActivity]);

  if (!showWarning) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,20,16,0.65)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", backdropFilter: "blur(2px)",
    }}>
      <div style={{
        background: "var(--cream)", borderRadius: "1.25rem",
        padding: "2rem 2rem 1.75rem", maxWidth: 400, width: "100%",
        textAlign: "center", boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
      }}>
        {/* Countdown ring */}
        <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 1.25rem" }}>
          <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--terra)" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 30}`}
              strokeDashoffset={`${2 * Math.PI * 30 * (1 - secondsLeft / 60)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
          <span style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: "var(--font-display)",
            fontSize: "1.375rem", color: "var(--terra)",
          }}>
            {secondsLeft}
          </span>
        </div>

        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Still there?</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          You&apos;ve been inactive for a while. We&apos;ll sign you out in{" "}
          <strong style={{ color: "var(--terra)" }}>{secondsLeft} second{secondsLeft !== 1 ? "s" : ""}</strong>{" "}
          to keep your account secure.
        </p>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-outline"
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Sign out now
          </button>
          <button
            className="btn-primary"
            onClick={reset}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Keep me signed in
          </button>
        </div>
      </div>
    </div>
  );
}
