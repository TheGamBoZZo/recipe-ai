"use client";
import { useState, useEffect } from "react";

interface Recipe {
  id: string;
  title: string;
  prepTime?: string;
  cookTime?: string;
  difficulty?: string;
}

interface MealSlot {
  id: string;
  dayOfWeek: number;
  mealType: string;
  recipe: Recipe;
}

interface MealPlan {
  slots: MealSlot[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Breakfast", "Lunch", "Dinner"];

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

export default function PlannerPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [plan, setPlan] = useState<MealPlan>({ slots: [] });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ day: number; meal: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const weekStart = getWeekStart(weekOffset);

  useEffect(() => {
    fetchPlan();
  }, [weekOffset]);

  useEffect(() => {
    fetch("/api/recipes").then((r) => r.json()).then(setRecipes);
  }, []);

  async function fetchPlan() {
    setLoading(true);
    const res = await fetch(`/api/meal-plan?week=${weekStart.toISOString()}`);
    if (res.ok) setPlan(await res.json());
    setLoading(false);
  }

  function getSlot(day: number, meal: string) {
    return plan.slots?.find((s) => s.dayOfWeek === day && s.mealType === meal);
  }

  async function assignRecipe(recipeId: string) {
    if (!picker) return;
    setSaving(true);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week: weekStart.toISOString(),
        dayOfWeek: picker.day,
        mealType: picker.meal,
        recipeId,
      }),
    });
    await fetchPlan();
    setPicker(null);
    setSaving(false);
  }

  async function removeSlot(slotId: string) {
    await fetch("/api/meal-plan", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId }),
    });
    setPlan((prev) => ({ ...prev, slots: prev.slots.filter((s) => s.id !== slotId) }));
  }

  const mealColors: Record<string, string> = {
    Breakfast: "var(--gold-light)",
    Lunch: "var(--sage-light)",
    Dinner: "var(--terra-light)",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Meal Planner</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn-outline" onClick={() => setWeekOffset((w) => w - 1)} style={{ padding: "0.5rem 1rem" }}>
            ←
          </button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", minWidth: 180, textAlign: "center" }}>
            {formatWeek(weekStart)}
          </span>
          <button className="btn-outline" onClick={() => setWeekOffset((w) => w + 1)} style={{ padding: "0.5rem 1rem" }}>
            →
          </button>
          {weekOffset !== 0 && (
            <button className="btn-outline" onClick={() => setWeekOffset(0)} style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}>
              Today
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", gap: "0.5rem", minWidth: 720 }}>
          {/* Header row */}
          <div />
          {DAYS.map((day) => (
            <div key={day} style={{ textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.8125rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-soft)", padding: "0.5rem 0" }}>
              {day}
            </div>
          ))}

          {/* Meal rows */}
          {MEALS.map((meal) => (
            <>
              <div key={`label-${meal}`} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "0.75rem" }}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
                  {meal}
                </span>
              </div>
              {DAYS.map((_, dayIdx) => {
                const slot = getSlot(dayIdx, meal);
                return (
                  <div
                    key={`${meal}-${dayIdx}`}
                    onClick={() => !slot && setPicker({ day: dayIdx, meal })}
                    style={{
                      minHeight: 80,
                      borderRadius: "0.75rem",
                      border: "1.5px dashed var(--border)",
                      background: slot ? mealColors[meal] : "transparent",
                      cursor: slot ? "default" : "pointer",
                      padding: "0.5rem",
                      transition: "background 0.15s, border-color 0.15s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!slot) (e.currentTarget as HTMLDivElement).style.background = "var(--warm-white)";
                    }}
                    onMouseLeave={(e) => {
                      if (!slot) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    {loading ? (
                      <div className="shimmer" style={{ height: 40, borderRadius: 6 }} />
                    ) : slot ? (
                      <div style={{ height: "100%" }}>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.3, marginBottom: "0.25rem" }}>
                          {slot.recipe.title}
                        </p>
                        {slot.recipe.cookTime && (
                          <p style={{ fontSize: "0.6875rem", color: "var(--ink-soft)" }}>{slot.recipe.cookTime}</p>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }}
                          style={{ position: "absolute", top: 4, right: 6, background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--ink-soft)", opacity: 0.5, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--border)", fontSize: "1.25rem" }}>
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Recipe picker modal */}
      {picker && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(26,20,16,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setPicker(null)}
        >
          <div
            style={{ background: "var(--cream)", borderRadius: "1.25rem", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.25rem" }}>
                {DAYS[picker.day]} — {picker.meal}
              </h3>
              <button onClick={() => setPicker(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "var(--ink-soft)" }}>×</button>
            </div>

            {recipes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--ink-soft)" }}>
                <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>No saved recipes yet.</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Generate and save some recipes first!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {recipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => assignRecipe(r.id)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "white",
                      border: "1px solid var(--border)",
                      borderRadius: "0.75rem",
                      padding: "0.875rem 1rem",
                      cursor: "pointer",
                      transition: "border-color 0.15s, background 0.15s",
                      fontFamily: "var(--font-body)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink)";
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--warm-white)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.background = "white";
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "0.2rem" }}>{r.title}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--ink-soft)" }}>
                      {[r.difficulty, r.prepTime && `Prep ${r.prepTime}`, r.cookTime && `Cook ${r.cookTime}`].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
