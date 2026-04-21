"use client";
import { useState } from "react";

interface GroceryItem {
  text: string;
  checked: boolean;
}

interface Category {
  name: string;
  items: string[];
}

function getWeekStart(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeek(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const categoryEmoji: Record<string, string> = {
  Produce: "🥦",
  Meat: "🥩",
  Seafood: "🐟",
  Dairy: "🧀",
  "Bakery & Bread": "🍞",
  Pantry: "🫙",
  "Canned Goods": "🥫",
  Spices: "🌿",
  Frozen: "❄️",
  Beverages: "🧃",
  Other: "🛒",
};

export default function GroceryPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [categories, setCategories] = useState<{ name: string; items: GroceryItem[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");

  const weekStart = getWeekStart(weekOffset);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekStart.toISOString() }),
      });
      const data = await res.json();
      if (!data.categories || data.categories.length === 0) {
        setError("No meals found for this week. Add some recipes to your meal planner first.");
        setGenerated(false);
      } else {
        setCategories(
          (data.categories as Category[]).map((c) => ({
            name: c.name,
            items: c.items.map((item) => ({ text: item, checked: false })),
          }))
        );
        setGenerated(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(catIdx: number, itemIdx: number) {
    setCategories((prev) => {
      const next = [...prev];
      next[catIdx] = {
        ...next[catIdx],
        items: next[catIdx].items.map((item, i) =>
          i === itemIdx ? { ...item, checked: !item.checked } : item
        ),
      };
      return next;
    });
  }

  function clearChecked() {
    setCategories((prev) =>
      prev
        .map((c) => ({ ...c, items: c.items.filter((i) => !i.checked) }))
        .filter((c) => c.items.length > 0)
    );
  }

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedItems = categories.reduce((sum, c) => sum + c.items.filter((i) => i.checked).length, 0);

  return (
    <div className="page-wrap" style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <h1 className="page-heading" style={{ fontSize: "2.25rem" }}>Grocery List</h1>
        {generated && checkedItems > 0 && (
          <button className="btn-outline" onClick={clearChecked} style={{ fontSize: "0.8125rem" }}>
            Clear checked ({checkedItems})
          </button>
        )}
      </div>

      {/* Week selector */}
      <div className="card week-selector" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-outline" onClick={() => { setWeekOffset((w) => w - 1); setGenerated(false); }} style={{ padding: "0.4rem 0.875rem" }}>←</button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", minWidth: 170, textAlign: "center" }}>
            Week of {formatWeek(weekStart)}
          </span>
          <button className="btn-outline" onClick={() => { setWeekOffset((w) => w + 1); setGenerated(false); }} style={{ padding: "0.4rem 0.875rem" }}>→</button>
        </div>
        <button
          className="btn-primary"
          onClick={generate}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Generating...
            </>
          ) : generated ? "↻ Regenerate" : "✦ Generate list"}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {error && (
        <div style={{ background: "var(--terra-light)", border: "1px solid var(--terra)", borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", color: "var(--terra)", fontSize: "0.9375rem" }}>
          {error}
        </div>
      )}

      {!generated && !loading && !error && (
        <div style={{ textAlign: "center", padding: "5rem 2rem", color: "var(--ink-soft)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.25 }}>◉</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontStyle: "italic", marginBottom: "0.5rem" }}>
            Your grocery list will appear here
          </p>
          <p style={{ fontSize: "0.9rem" }}>Select a week and generate a list from your meal plan</p>
        </div>
      )}

      {generated && categories.length > 0 && (
        <div className="fade-in">
          {/* Progress */}
          <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`,
                background: "var(--sage)",
                borderRadius: 4,
                transition: "width 0.3s",
              }} />
            </div>
            <span style={{ fontSize: "0.875rem", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
              {checkedItems} / {totalItems} items
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {categories.map((cat, catIdx) => (
              <div key={cat.name} className="card" style={{ padding: "1.25rem 1.5rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>{categoryEmoji[cat.name] || "🛒"}</span>
                  {cat.name}
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 400, color: "var(--ink-soft)", marginLeft: "auto" }}>
                    {cat.items.filter((i) => !i.checked).length} remaining
                  </span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {cat.items.map((item, itemIdx) => (
                    <label
                      key={itemIdx}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.25rem 0" }}
                    >
                      <div
                        onClick={() => toggleItem(catIdx, itemIdx)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: `2px solid ${item.checked ? "var(--sage)" : "var(--border)"}`,
                          background: item.checked ? "var(--sage)" : "transparent",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        {item.checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span
                        onClick={() => toggleItem(catIdx, itemIdx)}
                        style={{
                          fontSize: "0.9375rem",
                          color: item.checked ? "var(--ink-soft)" : "var(--ink)",
                          textDecoration: item.checked ? "line-through" : "none",
                          transition: "all 0.15s",
                          flex: 1,
                        }}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
