"use client";
import { useState, useEffect } from "react";

interface GroceryItem { text: string; checked: boolean; }
interface Category { name: string; items: string[]; }
interface SavedList {
  weekLabel: string;
  weekKey: string;
  savedAt: string;
  categories: { name: string; items: GroceryItem[] }[];
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
function weekKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const categoryEmoji: Record<string, string> = {
  Produce: "🥦", Meat: "🥩", Seafood: "🐟", Dairy: "🧀",
  "Bakery & Bread": "🍞", Pantry: "🫙", "Canned Goods": "🥫",
  Spices: "🌿", Frozen: "❄️", Beverages: "🧃", Other: "🛒",
};

const STORAGE_PREFIX = "grocery:";

export default function GroceryPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [categories, setCategories] = useState<{ name: string; items: GroceryItem[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [activeTab, setActiveTab] = useState<"current" | "saved">("current");
  const [viewingList, setViewingList] = useState<SavedList | null>(null);

  const weekStart = getWeekStart(weekOffset);
  const currentKey = weekKey(weekStart);

  // Load saved lists and check if current week is already saved
  useEffect(() => {
    loadSavedLists();
  }, []);

  useEffect(() => {
    const existing = savedLists.find((l) => l.weekKey === currentKey);
    if (existing) {
      setCategories(existing.categories);
      setGenerated(true);
    } else {
      setCategories([]);
      setGenerated(false);
    }
  }, [currentKey, savedLists]);

  async function loadSavedLists() {
    try {
      const keys = await (window as any).storage.list(STORAGE_PREFIX);
      const lists: SavedList[] = [];
      for (const key of (keys?.keys ?? [])) {
        const result = await (window as any).storage.get(key);
        if (result?.value) lists.push(JSON.parse(result.value));
      }
      lists.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
      setSavedLists(lists);
    } catch {
      // storage not available — no-op, app still works without persistence
    }
  }

  async function saveList(cats: { name: string; items: GroceryItem[] }[]) {
    const list: SavedList = {
      weekKey: currentKey,
      weekLabel: `Week of ${formatWeek(weekStart)}`,
      savedAt: new Date().toISOString(),
      categories: cats,
    };
    try {
      await (window as any).storage.set(`${STORAGE_PREFIX}${currentKey}`, JSON.stringify(list));
      setSavedLists((prev) => {
        const filtered = prev.filter((l) => l.weekKey !== currentKey);
        return [list, ...filtered].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
      });
    } catch {
      // storage unavailable — list still shown in UI, just not persisted
    }
  }

  async function deleteSavedList(key: string) {
    try {
      await (window as any).storage.delete(`${STORAGE_PREFIX}${key}`);
      setSavedLists((prev) => prev.filter((l) => l.weekKey !== key));
      if (viewingList?.weekKey === key) setViewingList(null);
    } catch { /* no-op */ }
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
        setGenerated(false);
      } else {
        const cats = (data.categories as Category[]).map((c) => ({
          name: c.name,
          items: c.items.map((item) => ({ text: item, checked: false })),
        }));
        setCategories(cats);
        setGenerated(true);
        // Auto-save immediately
        await saveList(cats);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(catIdx: number, itemIdx: number, listOverride?: SavedList) {
    if (listOverride) {
      const updated = {
        ...listOverride,
        categories: listOverride.categories.map((c, ci) =>
          ci !== catIdx ? c : {
            ...c, items: c.items.map((item, ii) =>
              ii !== itemIdx ? item : { ...item, checked: !item.checked }
            ),
          }
        ),
      };
      setViewingList(updated);
      // persist updated checked state
      (window as any).storage?.set(`${STORAGE_PREFIX}${listOverride.weekKey}`, JSON.stringify(updated)).catch(() => {});
      setSavedLists((prev) => prev.map((l) => l.weekKey === listOverride.weekKey ? updated : l));
      return;
    }
    setCategories((prev) => {
      const next = [...prev];
      next[catIdx] = {
        ...next[catIdx],
        items: next[catIdx].items.map((item, i) => i === itemIdx ? { ...item, checked: !item.checked } : item),
      };
      // persist
      const updated = next;
      saveList(updated).catch(() => {});
      return updated;
    });
  }

  function clearChecked() {
    setCategories((prev) => {
      const updated = prev
        .map((c) => ({ ...c, items: c.items.filter((i) => !i.checked) }))
        .filter((c) => c.items.length > 0);
      saveList(updated).catch(() => {});
      return updated;
    });
  }

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedItems = categories.reduce((sum, c) => sum + c.items.filter((i) => i.checked).length, 0);

  return (
    <div className="page-wrap" style={{ maxWidth: 780 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="page-heading" style={{ fontSize: "2.25rem" }}>Grocery List</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["current", "saved"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "btn-primary" : "btn-outline"}
              style={{ padding: "0.5rem 1.25rem", textTransform: "capitalize", fontSize: "0.875rem" }}>
              {tab === "saved" ? `Saved (${savedLists.length})` : "This week"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Saved lists tab ── */}
      {activeTab === "saved" && (
        <div>
          {viewingList ? (
            <div className="fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <button onClick={() => setViewingList(null)} className="btn-outline" style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem" }}>← Back</button>
                <h2 style={{ fontSize: "1.125rem" }}>{viewingList.weekLabel}</h2>
                <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginLeft: "auto" }}>
                  Saved {new Date(viewingList.savedAt).toLocaleDateString("en-GB")}
                </span>
              </div>
              <GroceryListView
                categories={viewingList.categories}
                onToggle={(ci, ii) => toggleItem(ci, ii, viewingList)}
              />
            </div>
          ) : savedLists.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--ink-soft)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.2 }}>◉</div>
              <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.125rem" }}>No saved lists yet</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Generate a grocery list and it will auto-save here</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {savedLists.map((list) => {
                const total = list.categories.reduce((s, c) => s + c.items.length, 0);
                const checked = list.categories.reduce((s, c) => s + c.items.filter((i) => i.checked).length, 0);
                return (
                  <div key={list.weekKey} className="card"
                    style={{ display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "box-shadow 0.15s" }}
                    onClick={() => setViewingList(list)}
                    onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = ""}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "0.25rem" }}>{list.weekLabel}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", maxWidth: 120 }}>
                          <div style={{ height: "100%", width: `${total > 0 ? (checked / total) * 100 : 0}%`, background: "var(--sage)", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>{checked}/{total} items</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteSavedList(list.weekKey); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.4, fontSize: "1.125rem", padding: "4px" }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Current week tab ── */}
      {activeTab === "current" && (
        <div>
          <div className="card week-selector" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button className="btn-outline" onClick={() => setWeekOffset((w) => w - 1)} style={{ padding: "0.4rem 0.875rem" }}>←</button>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9375rem", minWidth: 160, textAlign: "center" }}>
                {formatWeek(weekStart)}
              </span>
              <button className="btn-outline" onClick={() => setWeekOffset((w) => w + 1)} style={{ padding: "0.4rem 0.875rem" }}>→</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {generated && checkedItems > 0 && (
                <button className="btn-outline" onClick={clearChecked} style={{ fontSize: "0.8125rem" }}>
                  Clear checked ({checkedItems})
                </button>
              )}
              <button className="btn-primary" onClick={generate} disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {loading ? (
                  <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating...</>
                ) : generated ? "↻ Regenerate" : "✦ Generate list"}
              </button>
            </div>
          </div>

          {generated && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", padding: "0.5rem 0.75rem", background: "var(--sage-light)", borderRadius: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem" }}>✓</span>
              <p style={{ fontSize: "0.8125rem", color: "var(--sage)" }}>
                <strong>Auto-saved</strong> — find this list in the Saved tab anytime
              </p>
            </div>
          )}

          {error && (
            <div style={{ background: "var(--terra-light)", border: "1px solid var(--terra)", borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", color: "var(--terra)", fontSize: "0.9375rem" }}>
              {error}
            </div>
          )}

          {!generated && !loading && !error && (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--ink-soft)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.25 }}>◉</div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic", marginBottom: "0.5rem" }}>Your grocery list will appear here</p>
              <p style={{ fontSize: "0.875rem" }}>Add recipes to your meal planner, then generate a list</p>
            </div>
          )}

          {generated && categories.length > 0 && (
            <div className="fade-in">
              <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`, background: "var(--sage)", borderRadius: 4, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: "0.875rem", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{checkedItems} / {totalItems}</span>
              </div>
              <GroceryListView categories={categories} onToggle={(ci, ii) => toggleItem(ci, ii)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroceryListView({
  categories, onToggle,
}: {
  categories: { name: string; items: GroceryItem[] }[];
  onToggle: (catIdx: number, itemIdx: number) => void;
}) {
  const categoryEmoji: Record<string, string> = {
    Produce: "🥦", Meat: "🥩", Seafood: "🐟", Dairy: "🧀",
    "Bakery & Bread": "🍞", Pantry: "🫙", "Canned Goods": "🥫",
    Spices: "🌿", Frozen: "❄️", Beverages: "🧃", Other: "🛒",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {categories.map((cat, catIdx) => (
        <div key={cat.name} className="card" style={{ padding: "1.125rem 1.375rem" }}>
          <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{categoryEmoji[cat.name] || "🛒"}</span>
            {cat.name}
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 400, color: "var(--ink-soft)", marginLeft: "auto" }}>
              {cat.items.filter((i) => !i.checked).length} remaining
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {cat.items.map((item, itemIdx) => (
              <label key={itemIdx} onClick={() => onToggle(catIdx, itemIdx)}
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
                <span style={{ fontSize: "0.9375rem", color: item.checked ? "var(--ink-soft)" : "var(--ink)", textDecoration: item.checked ? "line-through" : "none", transition: "all 0.15s", flex: 1 }}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
