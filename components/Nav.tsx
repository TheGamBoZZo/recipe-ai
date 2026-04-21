"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

export default function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();

  const links = [
    { href: "/recipes", label: "Recipes",  icon: "✦" },
    { href: "/planner", label: "Planner",  icon: "◈" },
    { href: "/grocery", label: "Grocery",  icon: "◉" },
  ];

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <nav style={{
        height: 60,
        borderBottom: "1px solid var(--border)",
        background: "var(--cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.25rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--ink)", letterSpacing: "-0.01em" }}>
            mise<span style={{ color: "var(--terra)" }}>.</span>
          </span>
        </Link>

        {session && (
          /* Desktop nav links — hidden on mobile via CSS */
          <div className="nav-links" style={{ flex: 1, justifyContent: "center" }}>
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: pathname === href ? "var(--ink)" : "var(--ink-soft)",
                  textDecoration: "none",
                  fontWeight: pathname === href ? 600 : 500,
                  borderBottom: pathname === href ? "2px solid var(--terra)" : "2px solid transparent",
                  paddingBottom: "2px",
                }}
              >
                <span className="nav-link-label">{label}</span>
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
          {session ? (
            <>
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt=""
                  style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--border)" }}
                />
              )}
              <button
                className="btn-outline"
                onClick={() => signOut()}
                style={{ padding: "0.35rem 0.875rem", fontSize: "0.8rem" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => signIn("google")} style={{ fontSize: "0.875rem" }}>
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile bottom tab bar — only shown when signed in ─────────────── */}
      {session && (
        <nav style={{
          display: "none",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "var(--cream)",
          borderTop: "1px solid var(--border)",
          zIndex: 50,
          // shown via CSS on small screens
        }}
        className="mobile-tab-bar"
        >
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  textDecoration: "none",
                  color: active ? "var(--terra)" : "var(--ink-soft)",
                  fontSize: "0.6875rem",
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-body)",
                  padding: "0.5rem 0",
                }}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Spacer so content isn't hidden behind mobile tab bar */}
      {session && <div className="mobile-tab-spacer" />}

      <style>{`
        @media (max-width: 700px) {
          .mobile-tab-bar { display: flex !important; }
          .mobile-tab-spacer { height: 60px; }
          .nav-links { display: none !important; }
        }
      `}</style>
    </>
  );
}
