import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  // If already logged in, send them where they were going (or /recipes)
  if (session) {
    redirect(callbackUrl || "/recipes");
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 1100, paddingTop: "3rem", paddingBottom: "3rem" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "5rem" }}>
        <div className="tag" style={{ marginBottom: "1.5rem" }}>AI-powered kitchen companion</div>
        <h1 style={{ fontSize: "clamp(2.25rem, 8vw, 5.5rem)", marginBottom: "1.5rem", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          Cook better,<br />
          <em style={{ color: "var(--terra)", fontStyle: "italic" }}>waste less.</em>
        </h1>
        <p style={{ fontSize: "1.125rem", color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
          Tell us what&apos;s in your fridge. Get a beautiful recipe in seconds.
          Plan your week, generate your grocery list — all in one place.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl || "/recipes" });
          }}
          style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}
        >
          <button type="submit" className="btn-primary" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
            Sign in with Google →
          </button>
          <span style={{ fontSize: "0.8125rem", color: "var(--ink-soft)" }}>
            Free to use · No credit card required
          </span>
        </form>
      </div>

      {/* Feature cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {[
          {
            emoji: "✦",
            color: "var(--terra-light)",
            title: "Generate recipes",
            body: "Enter any ingredients you have. Claude crafts a full recipe tailored to your taste, dietary needs, and cooking time.",
          },
          {
            emoji: "◈",
            color: "var(--sage-light)",
            title: "Plan your week",
            body: "Drag saved recipes onto a weekly meal planner. Breakfast, lunch, dinner — your whole week at a glance.",
          },
          {
            emoji: "◉",
            color: "var(--gold-light)",
            title: "Smart grocery list",
            body: "AI consolidates all ingredients from your meal plan into a clean, categorised shopping list. No duplicates.",
          },
        ].map((f) => (
          <div key={f.title} className="card" style={{ background: f.color, border: "none" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--ink)" }}>{f.emoji}</div>
            <h3 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>{f.title}</h3>
            <p style={{ fontSize: "0.9375rem", color: "var(--ink-soft)", lineHeight: 1.65 }}>{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
