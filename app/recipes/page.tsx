"use client";
import { useState, useEffect, useRef } from "react";

// ── JSON extractor ────────────────────────────────────────────────────────────
function extractJSON(raw: string): Recipe | null {
  if (!raw?.trim()) return null;
  const s = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(s); } catch { /* continue */ }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch { /* continue */ } }
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "{") continue;
    for (let j = s.length; j > i; j--) {
      if (s[j] !== "}") continue;
      try { return JSON.parse(s.slice(i, j + 1)); } catch { /* keep scanning */ }
    }
  }
  return null;
}

// ── Ingredient data ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "poultry", label: "Poultry & Meat", emoji: "🍗", color: "var(--terra-light)", items: ["Chicken breast","Chicken thighs","Chicken wings","Minced beef","Beef steak","Lamb chops","Lamb mince","Turkey mince","Beef brisket","Chicken drumsticks"] },
  { id: "seafood", label: "Seafood", emoji: "🐟", color: "#e8f4f8", items: ["Salmon fillet","Tuna (canned)","Prawns","Cod fillet","Sardines","Haddock","Mackerel","Tilapia","Squid","Mussels"] },
  { id: "veg", label: "Vegetables", emoji: "🥦", color: "var(--sage-light)", items: ["Garlic","Onion","Tomatoes","Potatoes","Spinach","Broccoli","Carrots","Bell peppers","Courgette","Aubergine","Mushrooms","Chilli","Cucumber","Celery","Leek","Sweet potato","Cauliflower","Green beans","Peas","Corn"] },
  { id: "dairy", label: "Dairy & Eggs", emoji: "🧀", color: "#fef9e8", items: ["Eggs","Butter","Milk","Cheddar cheese","Mozzarella","Cream","Greek yoghurt","Parmesan","Cream cheese","Sour cream"] },
  { id: "grains", label: "Grains & Pasta", emoji: "🍝", color: "var(--gold-light)", items: ["Pasta (penne)","Spaghetti","Rice (basmati)","Rice (long grain)","Couscous","Bread","Naan bread","Flour","Oats","Quinoa","Noodles","Lentils","Chickpeas","Kidney beans"] },
  { id: "condiments", label: "Condiments", emoji: "🫙", color: "#f0ebe8", items: ["Olive oil","Soy sauce","Tomato paste","Coconut milk","Stock (chicken)","Stock (vegetable)","Honey","Lemon juice","Vinegar","Mayonnaise","Ketchup","Hot sauce","Fish sauce","Oyster sauce","Tahini"] },
  { id: "spices", label: "Herbs & Spices", emoji: "🌿", color: "#edf4ed", items: ["Salt","Black pepper","Cumin","Paprika","Turmeric","Coriander (ground)","Garam masala","Chilli flakes","Oregano","Thyme","Rosemary","Cinnamon","Curry powder","Cardamom","Bay leaves","Ginger (fresh)","Fresh coriander","Fresh parsley","Mint"] },
  { id: "fruit", label: "Fruit", emoji: "🍋", color: "#fef3e2", items: ["Lemon","Lime","Cherry tomatoes","Avocado","Mango","Banana","Apple","Orange","Grapes","Pomegranate"] },
];

const TIME_OPTIONS = [
  { value: "15", label: "15 min", sub: "Super quick" },
  { value: "30", label: "30 min", sub: "Quick meal" },
  { value: "45", label: "45 min", sub: "Standard" },
  { value: "60", label: "1 hour", sub: "Relaxed cook" },
  { value: "90", label: "1.5 hrs", sub: "Weekend cook" },
  { value: "any", label: "Any time", sub: "No limit" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Recipe {
  id?: string; title: string; description: string; prepTime?: string;
  cookTime?: string; servings?: number; difficulty?: string; cuisine?: string;
  tags: string[]; ingredients: string[]; steps: string[];
}

// ── Generation stages for progress bar ───────────────────────────────────────
const STAGES = [
  { label: "Reading your ingredients", pct: 15 },
  { label: "Planning the recipe",      pct: 35 },
  { label: "Writing method",           pct: 65 },
  { label: "Finishing touches",        pct: 90 },
  { label: "Ready!",                   pct: 100 },
];

// ── Ingredient Picker ─────────────────────────────────────────────────────────
function IngredientPicker({ selected, onToggle }: { selected: Set<string>; onToggle: (item: string) => void }) {
  const [openCat, setOpenCat] = useState<string | null>("veg");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {CATEGORIES.map((cat) => {
        const isOpen = openCat === cat.id;
        const count = cat.items.filter((i) => selected.has(i)).length;
        return (
          <div key={cat.id}>
            <button onClick={() => setOpenCat(isOpen ? null : cat.id)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.55rem 0.875rem", background: isOpen ? cat.color : "var(--warm-white)",
              border: `1.5px solid ${isOpen ? "var(--border)" : "transparent"}`,
              borderRadius: "0.625rem", cursor: "pointer", fontFamily: "var(--font-body)",
              fontSize: "0.875rem", fontWeight: 500, color: "var(--ink)", transition: "all 0.15s", textAlign: "left",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.9375rem" }}>{cat.emoji}</span>{cat.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {count > 0 && <span style={{ background: "var(--terra)", color: "white", fontSize: "0.625rem", fontWeight: 700, padding: "1px 5px", borderRadius: "2rem" }}>{count}</span>}
                <span style={{ color: "var(--ink-soft)", fontSize: "0.75rem", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
              </span>
            </button>
            {isOpen && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", padding: "0.5rem 0.25rem 0.25rem" }}>
                {cat.items.map((item) => {
                  const on = selected.has(item);
                  return (
                    <button key={item} onClick={() => onToggle(item)} style={{
                      padding: "0.275rem 0.7rem", borderRadius: "2rem",
                      border: on ? "1.5px solid var(--terra)" : "1.5px solid var(--border)",
                      background: on ? "var(--terra)" : "white", color: on ? "white" : "var(--ink)",
                      fontSize: "0.8rem", fontFamily: "var(--font-body)", fontWeight: on ? 500 : 400,
                      cursor: "pointer", transition: "all 0.1s", whiteSpace: "nowrap",
                    }}>
                      {on && <span style={{ marginRight: "0.2rem", fontSize: "0.625rem" }}>✓</span>}{item}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Generation loader ─────────────────────────────────────────────────────────
function GenerationLoader({ streamLength }: { streamLength: number }) {
  // Estimate progress from stream length — JSON recipe is ~600-1200 chars
  const estimated = Math.min(95, Math.round((streamLength / 1100) * 100));
  const stage = STAGES.findLast((s) => s.pct <= estimated) ?? STAGES[0];

  return (
    <div className="card fade-in" style={{ padding: "2rem 1.75rem", textAlign: "center" }}>
      {/* Animated chef icon */}
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "bounce 1s ease-in-out infinite" }}>👨‍🍳</div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", marginBottom: "0.375rem" }}>
        {stage.label}
      </p>
      <p style={{ fontSize: "0.8125rem", color: "var(--ink-soft)", marginBottom: "1.5rem" }}>
        Please wait a moment…
      </p>
      {/* Progress bar */}
      <div style={{ height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden", maxWidth: 280, margin: "0 auto" }}>
        <div style={{
          height: "100%", background: "var(--terra)", borderRadius: 4,
          width: `${estimated}%`, transition: "width 0.6s ease",
        }} />
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: "0.625rem", opacity: 0.6 }}>
        {estimated}% complete
      </p>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [cuisine, setCuisine] = useState("");
  const [servings, setServings] = useState("4");
  const [cookTime, setCookTime] = useState("any");
  const [halal, setHalal] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<"ingredients" | "options">("ingredients");
  const [generating, setGenerating] = useState(false);
  const [streamLength, setStreamLength] = useState(0);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => { fetchRecipes(); }, []);

  async function fetchRecipes() {
    setLoadingRecipes(true);
    const res = await fetch("/api/recipes");
    if (res.ok) setSavedRecipes(await res.json());
    setLoadingRecipes(false);
  }

  function toggleIngredient(item: string) {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }

  async function generate() {
    if (selectedIngredients.size === 0) return;
    setGenerating(true);
    setStreamLength(0);
    setRecipe(null);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedIngredients: Array.from(selectedIngredients),
          cuisine, servings, halal,
          cookTime: cookTime === "any" ? null : `${cookTime} minutes`,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamLength(full.length);
      }

      const parsed = extractJSON(full);
      if (!parsed) throw new Error("Could not parse recipe — please try again.");
      setRecipe(parsed);
      setTimeout(() => {
        document.getElementById("recipe-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveRecipe() {
    if (!recipe) return;
    const clean = { ...recipe, ingredients: recipe.ingredients.map((i) => i.replace(/^(HAS:|NEED:)/, "").trim()) };
    const res = await fetch("/api/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
    if (res.ok) { setSaved(true); fetchRecipes(); }
  }

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
  }

  const difficultyColor: Record<string, string> = { Easy: "var(--sage)", Medium: "var(--gold)", Hard: "var(--terra)" };
  const selectedCount = selectedIngredients.size;

  return (
    <div className="page-wrap">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="page-heading" style={{ fontSize: "2.25rem" }}>Recipes</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["generate", "saved"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "0.5rem 1.25rem", textTransform: "capitalize" }}>
              {tab}{tab === "saved" && savedRecipes.length > 0 ? ` (${savedRecipes.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "generate" && (
        <div className="generate-layout">

          {/* ── Left panel ── */}
          <div className="form-sticky" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

            {/* Halal toggle */}
            <div className="card" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>🕌 Halal mode</p>
                <p style={{ fontSize: "0.6875rem", color: "var(--ink-soft)", marginTop: "1px" }}>No pork, alcohol or haram ingredients</p>
              </div>
              <button onClick={() => setHalal(!halal)} style={{
                width: 44, height: 24, borderRadius: 12,
                background: halal ? "var(--sage)" : "var(--border)",
                border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <span style={{ position: "absolute", top: 2, left: halal ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>

            {/* Form tabs: Ingredients | Options */}
            <div className="card" style={{ padding: "0" }}>
              {/* Tab strip */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                {(["ingredients", "options"] as const).map((t) => (
                  <button key={t} onClick={() => setActiveFormTab(t)} style={{
                    flex: 1, padding: "0.75rem", background: "none", border: "none", cursor: "pointer",
                    fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: activeFormTab === t ? 600 : 400,
                    color: activeFormTab === t ? "var(--ink)" : "var(--ink-soft)",
                    borderBottom: activeFormTab === t ? "2px solid var(--terra)" : "2px solid transparent",
                    textTransform: "capitalize", transition: "all 0.15s",
                  }}>
                    {t === "ingredients" ? `Ingredients${selectedCount > 0 ? ` (${selectedCount})` : ""}` : "Preferences"}
                  </button>
                ))}
              </div>

              {/* Ingredients tab */}
              {activeFormTab === "ingredients" && (
                <div style={{ padding: "0.875rem" }}>
                  {selectedCount > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.75rem", padding: "0.5rem", background: "var(--warm-white)", borderRadius: "0.5rem" }}>
                      {Array.from(selectedIngredients).map((item) => (
                        <span key={item} style={{
                          display: "inline-flex", alignItems: "center", gap: "0.2rem",
                          fontSize: "0.75rem", padding: "0.2rem 0.4rem 0.2rem 0.6rem",
                          background: "var(--terra)", color: "white", borderRadius: "2rem",
                        }}>
                          {item}
                          <button onClick={() => toggleIngredient(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", lineHeight: 1, padding: 0, marginLeft: "1px" }}>×</button>
                        </span>
                      ))}
                      <button onClick={() => setSelectedIngredients(new Set())} style={{ fontSize: "0.6875rem", color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                        Clear all
                      </button>
                    </div>
                  )}
                  <IngredientPicker selected={selectedIngredients} onToggle={toggleIngredient} />
                </div>
              )}

              {/* Preferences tab */}
              {activeFormTab === "options" && (
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1.125rem" }}>

                  {/* Cook time */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)", display: "block", marginBottom: "0.625rem" }}>
                      ⏱ How much time do you have?
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem" }}>
                      {TIME_OPTIONS.map((opt) => {
                        const on = cookTime === opt.value;
                        return (
                          <button key={opt.value} onClick={() => setCookTime(opt.value)} style={{
                            padding: "0.5rem 0.25rem", borderRadius: "0.625rem",
                            border: on ? "2px solid var(--terra)" : "1.5px solid var(--border)",
                            background: on ? "var(--terra-light)" : "white",
                            cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "center",
                            transition: "all 0.12s",
                          }}>
                            <p style={{ fontSize: "0.875rem", fontWeight: on ? 600 : 500, color: on ? "var(--terra)" : "var(--ink)" }}>{opt.label}</p>
                            <p style={{ fontSize: "0.6875rem", color: on ? "var(--terra)" : "var(--ink-soft)", opacity: 0.8 }}>{opt.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cuisine */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)", display: "block", marginBottom: "0.4rem" }}>Cuisine style</label>
                    <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ fontSize: "0.875rem" }}>
                      <option value="">Any cuisine</option>
                      {["Italian","Asian","Mexican","French","Indian","Mediterranean","American","Middle Eastern","Japanese","Thai","Turkish","Moroccan"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Servings */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)", display: "block", marginBottom: "0.4rem" }}>Servings</label>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {["1","2","4","6","8"].map((s) => {
                        const on = servings === s;
                        return (
                          <button key={s} onClick={() => setServings(s)} style={{
                            flex: 1, padding: "0.5rem", borderRadius: "0.5rem",
                            border: on ? "2px solid var(--terra)" : "1.5px solid var(--border)",
                            background: on ? "var(--terra-light)" : "white",
                            cursor: "pointer", fontSize: "0.875rem", fontWeight: on ? 600 : 400,
                            color: on ? "var(--terra)" : "var(--ink)", fontFamily: "var(--font-body)",
                            transition: "all 0.12s",
                          }}>{s}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generate button */}
            <button className="btn-primary" onClick={generate} disabled={generating || selectedCount === 0}
              style={{ width: "100%", justifyContent: "center", padding: "0.875rem", fontSize: "0.9375rem" }}>
              {generating ? (
                <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating...</>
              ) : selectedCount === 0 ? "Pick ingredients first" : `✦ Generate recipe (${selectedCount} ingredient${selectedCount > 1 ? "s" : ""})`}
            </button>
          </div>

          {/* ── Right: result ── */}
          <div id="recipe-result">
            {generating && <GenerationLoader streamLength={streamLength} />}

            {recipe && !generating && (
              <RecipeCard recipe={recipe} userIngredients={selectedIngredients} onSave={saveRecipe} saved={saved} difficultyColor={difficultyColor} />
            )}

            {error && !generating && (
              <div style={{ background: "var(--terra-light)", border: "1px solid var(--terra)", borderRadius: "0.75rem", padding: "1.25rem 1.5rem", color: "var(--terra)" }}>
                <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>Generation failed</p>
                <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>{error}</p>
                <p style={{ fontSize: "0.8125rem", marginTop: "0.625rem", opacity: 0.7 }}>Free AI quotas reset daily — try again in a moment.</p>
              </div>
            )}

            {!recipe && !generating && !error && (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--ink-soft)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.2 }}>✦</div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic", marginBottom: "0.5rem" }}>Pick ingredients, then generate</p>
                <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Tap any category on the left to browse ingredients</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {loadingRecipes
            ? Array(3).fill(0).map((_, i) => <div key={i} className="card shimmer" style={{ height: 160 }} />)
            : savedRecipes.length === 0
            ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem 1rem", color: "var(--ink-soft)" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic" }}>No saved recipes yet</p>
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>Generate and save a recipe to see it here</p>
              </div>
            : savedRecipes.map((r) => (
              <div key={r.id} className="card" style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                onClick={() => setSelectedRecipe(r)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.625rem" }}>
                  <h3 style={{ fontSize: "1rem", lineHeight: 1.3, flex: 1, paddingRight: "0.5rem" }}>{r.title}</h3>
                  <button onClick={(e) => { e.stopPropagation(); deleteRecipe(r.id!); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.4, fontSize: "1.125rem", lineHeight: 1, padding: "4px", flexShrink: 0 }}>×</button>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", marginBottom: "0.875rem", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.description}</p>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {r.difficulty && <span className="tag" style={{ color: difficultyColor[r.difficulty] || "var(--ink-soft)" }}>{r.difficulty}</span>}
                  {r.prepTime && <span className="tag">{r.prepTime}</span>}
                  {r.cuisine && <span className="tag">{r.cuisine}</span>}
                </div>
              </div>
            ))}
        </div>
      )}

      {selectedRecipe && (
        <div className="modal-wrap" style={{ position: "fixed", inset: 0, background: "rgba(26,20,16,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setSelectedRecipe(null)}>
          <div className="modal-inner" style={{ background: "var(--cream)", borderRadius: "1.25rem", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.25rem" }}>
              <div style={{ flex: 1, paddingRight: "0.75rem" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{selectedRecipe.title}</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>{selectedRecipe.description}</p>
              </div>
              <button onClick={() => setSelectedRecipe(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "var(--ink-soft)", flexShrink: 0 }}>×</button>
            </div>
            <RecipeCard recipe={selectedRecipe} saved={true} difficultyColor={difficultyColor} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recipe Card ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, userIngredients, onSave, saved, difficultyColor }: {
  recipe: Recipe; userIngredients?: Set<string>; onSave?: () => void; saved: boolean; difficultyColor: Record<string, string>;
}) {
  const parsedIngredients = recipe.ingredients.map((raw) => {
    if (raw.startsWith("HAS:")) return { text: raw.slice(4).trim(), status: "has" as const };
    if (raw.startsWith("NEED:")) return { text: raw.slice(5).trim(), status: "need" as const };
    return { text: raw.trim(), status: "has" as const };
  });
  const needCount = parsedIngredients.filter((i) => i.status === "need").length;

  return (
    <div className="card fade-in" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.875rem", gap: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>{recipe.title}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", lineHeight: 1.6 }}>{recipe.description}</p>
        </div>
        {onSave && (
          <button className={saved ? "btn-outline" : "btn-primary"} onClick={onSave} disabled={saved}
            style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: "0.8125rem", padding: "0.5rem 1rem" }}>
            {saved ? "✓ Saved" : "Save"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {recipe.difficulty && <span className="tag" style={{ color: difficultyColor[recipe.difficulty] }}>{recipe.difficulty}</span>}
        {recipe.prepTime && <span className="tag">Prep {recipe.prepTime}</span>}
        {recipe.cookTime && <span className="tag">Cook {recipe.cookTime}</span>}
        {recipe.servings && <span className="tag">{recipe.servings} servings</span>}
        {recipe.cuisine && <span className="tag">{recipe.cuisine}</span>}
        {recipe.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
      </div>

      {needCount > 0 && (
        <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "0.625rem", padding: "0.6rem 0.875rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🛒</span>
          <p style={{ fontSize: "0.8125rem", color: "var(--ink-soft)" }}>
            <strong style={{ color: "var(--ink)" }}>{needCount} ingredient{needCount > 1 ? "s" : ""} to pick up</strong> — highlighted below
          </p>
        </div>
      )}

      <div className="recipe-body">
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "0.75rem" }}>Ingredients</p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {parsedIngredients.map((ing, i) => (
              <li key={i} style={{
                fontSize: "0.9rem", display: "flex", gap: "0.5rem", lineHeight: 1.5, alignItems: "flex-start",
                padding: ing.status === "need" ? "0.35rem 0.6rem" : "0.1rem 0",
                borderRadius: ing.status === "need" ? "0.375rem" : 0,
                background: ing.status === "need" ? "var(--terra-light)" : "transparent",
                border: ing.status === "need" ? "1px solid rgba(196,96,58,0.25)" : "none",
              }}>
                <span style={{ flexShrink: 0, fontSize: "0.75rem", marginTop: "0.2rem" }}>{ing.status === "need" ? "🛒" : "✓"}</span>
                <span style={{ color: ing.status === "need" ? "var(--terra)" : "var(--ink)", fontWeight: ing.status === "need" ? 500 : 400, flex: 1 }}>{ing.text}</span>
                {ing.status === "need" && <span style={{ fontSize: "0.625rem", color: "var(--terra)", opacity: 0.7, whiteSpace: "nowrap", alignSelf: "center" }}>buy</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "0.75rem" }}>Method</p>
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: "0.75rem", fontSize: "0.9375rem", lineHeight: 1.65 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--terra)", flexShrink: 0, minWidth: "1.25rem" }}>{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
