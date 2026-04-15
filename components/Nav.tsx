"use client";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

export default function Nav({ session }: { session: Session | null }) {
  return (
    <nav style={{
      height: 64,
      borderBottom: "1px solid var(--border)",
      background: "var(--cream)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--ink)", letterSpacing: "-0.01em" }}>
          mise<span style={{ color: "var(--terra)" }}>.</span>
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        {session ? (
          <>
            <Link href="/recipes" style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--ink-soft)", textDecoration: "none", fontWeight: 500 }}>
              Recipes
            </Link>
            <Link href="/planner" style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--ink-soft)", textDecoration: "none", fontWeight: 500 }}>
              Planner
            </Link>
            <Link href="/grocery" style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--ink-soft)", textDecoration: "none", fontWeight: 500 }}>
              Grocery
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {session.user?.image && (
                <img src={session.user.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border)" }} />
              )}
              <button className="btn-outline" onClick={() => signOut()} style={{ padding: "0.4rem 1rem", fontSize: "0.8125rem" }}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <button className="btn-primary" onClick={() => signIn("google")}>
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}
