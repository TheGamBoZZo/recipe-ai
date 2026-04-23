"use client";
import { useState, useEffect } from "react";

interface GroceryItem   { id: string; text: string; checked: boolean; categoryId: string; }
interface GroceryCategory { id: string; name: string; items: GroceryItem[]; groceryListId: string; }
interface GroceryList   { id: string; weekStart: string; categories: GroceryCategory[]; createdAt: string; }

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
  Produce: "🥦", Meat: "🥩", Seafood: "🐟", Dairy: "🧀",
  "Bakery & Bread": "🍞", Pantry: "🫙", "Canned Goods": "🥫",
  Spices: "🌿", Frozen: "❄️", Beverages: "🧃", Other: "🛒",
};

export default function GroceryPage() {
  const [weekOffset, setWeekOffset]     = useState(0);
  const [currentList, setCurrentList]   = useState<GroceryList | null>(null);
  const [allLists, setAllLists]         = useState<GroceryList[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);
  const [error, setError]               = useState("");
  const [activeTab, setActiveTab]       = useState<"current" | "saved">("current");
  const [viewingList, setViewingList]   = useState<GroceryList | null>(null);

  const weekStart = getWeekStart(weekOffset);

  // Load all saved lists on mount
  useEffect(() => {
    fetchAllLists();
  }, []);

  // Load current week's list whenever week changes
  useEffect(() => {
    fetchCurrentWeek();
  }, [weekOffset]);

  async function fetchAllLists() {
    setLoadingLists(true);
    try {
      const res = await fetch("/api/grocery-list", { method: "PUT" });
      if (res.ok) setAllLists(await res.json());
    } catch { /* ignore */ } finally {
      setLoadingLists(false);
    }
  }

  async function fetchCurrentWeek() {
    setCurrentList(null);
    try {
      const res = await fetch(`/api/grocery-list?week=${weekStart.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentList(data);
      }
    } catch { /* ignore */ }
  }

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
        setError("No meals found for this week. Add recipes to your meal planner first.");
        return;
      }

      setCurrentList(data);
      // Refresh the all-lists tab too
      fetchAllLists();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleItem(itemId: string, currentChecked: boolean, listSetter: (fn: (l: GroceryList) => GroceryList) => void) {
    // Optimistic update
    listSetter((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => ({
        ...c,
        items: c.items.map((i) => i.id === itemId ? { ...i, checked: !currentChecked } : i),
      })),
    }));

    // Persist to DB
    try {
      await fetch("/api/grocery-list/item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, checked: !currentChecked }),
      });
    } catch { /* revert isn't critical — will sync on next load */ }
  }

  async function deleteList(weekIso: string) {
    await fetch("/api/grocery-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: weekIso }),
    });
    setAllLists((prev) => prev.filter((l) => l.weekStart !== weekIso));
    if (viewingList?.weekStart === weekIso) setViewingList(null);
    // If it was current week, clear
    const listWeek = new Date(weekIso).toDateString();
    if (listWeek === weekStart.toDateString()) setCurrentList(null);
  }

  function ListProgress({ list }: { list: GroceryList }) {
    const total = list.categories.reduce((s, c) => s + c.items.length, 0);
    const done  = list.categories.reduce((s, c) => s + c.items.filter((i) => i.checked).length, 0);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${total > 0 ? (done / total) * 100 : 0}%`, background: "var(--sage)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{done}/{total}</span>
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 780 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="page-heading" style={{ fontSize: "2.25rem" }}>Grocery List</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["current", "saved"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "btn-primary" : "btn-outline"}
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
              {tab === "saved" ? `Saved (${allLists.length})` : "This week"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Saved tab ── */}
      {activeTab === "saved" && (
        <div>
          {viewingList ? (
            <div className="fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <button onClick={() => setViewingList(null)} className="btn-outline" style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem" }}>← Back</button>
                <h2 style={{ fontSize: "1.125rem" }}>Week of {formatWeek(new Date(viewingList.weekStart))}</h2>
                <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginLeft: "auto" }}>
                  {new Date(viewingList.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
              <ListProgress list={viewingList} />
              <div style={{ marginTop: "1rem" }}>
                <GroceryListView
                  list={viewingList}
                  onToggle={(itemId, checked) => toggleItem(itemId, checked, (fn) => setViewingList((prev) => prev ? fn(prev) : prev!))}
                />
              </div>
            </div>
          ) : loadingLists ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1,2,3].map((i) => <div key={i} className="card shimmer" style={{ height: 68 }} />)}
            </div>
          ) : allLists.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--ink-soft)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.2 }}>◉</div>
              <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.125rem" }}>No saved lists yet</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Generate a grocery list and it will be saved here automatically</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {allLists.map((list) => (
                <div key={list.id} className="card"
                  style={{ display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "box-shadow 0.15s", padding: "1rem 1.25rem" }}
                  onClick={() => setViewingList(list)}
                  onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = ""}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "0.375rem" }}>
                      Week of {formatWeek(new Date(list.weekStart))}
                    </p>
                    <ListProgress list={list} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {new Date(list.createdAt).toLocaleDateString("en-GB")}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteList(list.weekStart); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.35, fontSize: "1.125rem", padding: "4px", flexShrink: 0 }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Current week tab ── */}
      {activeTab === "current" && (
        <div>
          {/* Week navigator + generate button */}
          <div className="card week-selector" style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <button className="btn-outline" onClick={() => setWeekOffset((w) => w - 1)} style={{ padding: "0.4rem 0.875rem" }}>←</button>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9375rem", minWidth: 150, textAlign: "center" }}>
                {formatWeek(weekStart)}
              </span>
              <button className="btn-outline" onClick={() => setWeekOffset((w) => w + 1)} style={{ padding: "0.4rem 0.875rem" }}>→</button>
            </div>
            <button className="btn-primary" onClick={generate} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {loading
                ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating...</>
                : currentList ? "↻ Regenerate" : "✦ Generate list"}
            </button>
          </div>

          {/* Auto-saved badge */}
          {currentList && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.125rem", padding: "0.5rem 0.75rem", background: "var(--sage-light)", borderRadius: "0.5rem" }}>
              <span style={{ color: "var(--sage)", fontSize: "0.875rem" }}>✓</span>
              <p style={{ fontSize: "0.8125rem", color: "var(--sage)" }}>
                <strong>Saved to your account</strong> — view any time in the Saved tab
              </p>
            </div>
          )}

          {error && (
            <div style={{ background: "var(--terra-light)", border: "1px solid var(--terra)", borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.25rem", color: "var(--terra)", fontSize: "0.9375rem" }}>
              {error}
            </div>
          )}

          {!currentList && !loading && !error && (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--ink-soft)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.25 }}>◉</div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic", marginBottom: "0.5rem" }}>
                Your grocery list will appear here
              </p>
              <p style={{ fontSize: "0.875rem" }}>Add recipes to your meal planner, then generate a list</p>
            </div>
          )}

          {currentList && (
            <div className="fade-in">
              <div style={{ marginBottom: "1.125rem" }}>
                <ListProgress list={currentList} />
              </div>
              <GroceryListView
                list={currentList}
                onToggle={(itemId, checked) => toggleItem(itemId, checked, (fn) => setCurrentList((prev) => prev ? fn(prev) : prev))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared list renderer ──────────────────────────────────────────────────────
function GroceryListView({
  list, onToggle,
}: {
  list: GroceryList;
  onToggle: (itemId: string, currentChecked: boolean) => void;
}) {
  const categoryEmoji: Record<string, string> = {
    Produce: "🥦", Meat: "🥩", Seafood: "🐟", Dairy: "🧀",
    "Bakery & Bread": "🍞", Pantry: "🫙", "Canned Goods": "🥫",
    Spices: "🌿", Frozen: "❄️", Beverages: "🧃", Other: "🛒",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {list.categories.map((cat) => (
        <div key={cat.id} className="card" style={{ padding: "1.125rem 1.375rem" }}>
          <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{categoryEmoji[cat.name] || "🛒"}</span>
            {cat.name}
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 400, color: "var(--ink-soft)", marginLeft: "auto" }}>
              {cat.items.filter((i) => !i.checked).length} remaining
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {cat.items.map((item) => (
              <div key={item.id} onClick={() => onToggle(item.id, item.checked)}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.3rem 0" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${item.checked ? "var(--sage)" : "var(--border)"}`,
                  background: item.checked ? "var(--sage)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                }}>
                  {item.checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{
                  fontSize: "0.9375rem", flex: 1,
                  color: item.checked ? "var(--ink-soft)" : "var(--ink)",
                  textDecoration: item.checked ? "line-through" : "none",
                  transition: "all 0.15s",
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
