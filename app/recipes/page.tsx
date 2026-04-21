"use client";
import { useState, useEffect } from "react";

function extractJSON(raw: string): Recipe | null {
  if (!raw || !raw.trim()) return null;
  const stripped = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch { /* continue */ }
  }
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] !== "{") continue;
    for (let j = stripped.length; j > i; j--) {
      if (stripped[j] !== "}") continue;
      try { return JSON.parse(stripped.slice(i, j + 1)); } catch { /* keep scanning */ }
    }
  }
  return null;
}

interface Recipe {
  id?: string;
  title: string;
  description: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

export default function RecipesPage() {
  const [ingredients, setIngredients] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [dietary, setDietary] = useState("");
  const [servings, setServings] = useState("4");
  const [generating, setGenerating] = useState(false);
  const [streaming, setStreaming] = useState("");
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

  async function generate() {
    if (!ingredients.trim()) return;
    setGenerating(true);
    setStreaming("");
    setRecipe(null);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, cuisine, dietary, servings }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreaming(full);
      }

      const parsed = extractJSON(full);
      if (!parsed) throw new Error("Could not parse recipe — please try again.");
      setRecipe(parsed);
      setStreaming("");

      // On mobile, scroll down to show the result after generating
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
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipe),
    });
    if (res.ok) { setSaved(true); fetchRecipes(); }
  }

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
  }

  const difficultyColor: Record<string, string> = {
    Easy: "var(--sage)",
    Medium: "var(--gold)",
    Hard: "var(--terra)",
  };

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="page-heading" style={{ fontSize: "2.25rem" }}>Recipes</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["generate", "saved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "0.5rem 1.25rem", textTransform: "capitalize" }}
            >
              {tab}{tab === "saved" && savedRecipes.length > 0 ? ` (${savedRecipes.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "generate" && (
        <div className="generate-layout">
          {/* Form */}
          <div className="card form-sticky">
            <h2 style={{ fontSize: "1.125rem", marginBottom: "1.25rem" }}>What&apos;s in your fridge?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.35rem" }}>
                  Ingredients *
                </label>
                <textarea
                  className="input"
                  placeholder="chicken thighs, garlic, lemon, thyme..."
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.35rem" }}>Cuisine</label>
                  <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                    <option value="">Any</option>
                    {["Italian", "Asian", "Mexican", "French", "Indian", "Mediterranean", "American"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.35rem" }}>Servings</label>
                  <select className="input" value={servings} onChange={(e) => setServings(e.target.value)}>
                    {["1", "2", "4", "6", "8"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.35rem" }}>Dietary needs</label>
                <input
                  className="input"
                  placeholder="vegetarian, gluten-free..."
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                />
              </div>

              <button
                className="btn-primary"
                onClick={generate}
                disabled={generating || !ingredients.trim()}
                style={{ width: "100%", justifyContent: "center", padding: "0.875rem", fontSize: "0.9375rem" }}
              >
                {generating ? (
                  <>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Generating...
                  </>
                ) : "✦ Generate recipe"}
              </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          {/* Result */}
          <div id="recipe-result">
            {generating && streaming && (
              <div className="card fade-in">
                <div className="shimmer" style={{ height: 28, width: "55%", borderRadius: 6, marginBottom: "1rem" }} />
                <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", whiteSpace: "pre-wrap", lineHeight: 1.7, opacity: 0.6 }}>
                  {streaming}
                </p>
              </div>
            )}

            {recipe && !generating && (
              <RecipeCard recipe={recipe} onSave={saveRecipe} saved={saved} difficultyColor={difficultyColor} />
            )}

            {error && !generating && (
              <div style={{ background: "var(--terra-light)", border: "1px solid var(--terra)", borderRadius: "0.75rem", padding: "1.25rem 1.5rem", color: "var(--terra)" }}>
                <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>Generation failed</p>
                <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>{error}</p>
                <p style={{ fontSize: "0.8125rem", marginTop: "0.625rem", opacity: 0.7 }}>Free AI quotas reset automatically — try again in a moment.</p>
              </div>
            )}

            {!recipe && !generating && !error && (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--ink-soft)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.25 }}>✦</div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic" }}>
                  Your recipe will appear here
                </p>
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
            ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem 1rem", color: "var(--ink-soft)" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontStyle: "italic" }}>No saved recipes yet</p>
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>Generate and save a recipe to see it here</p>
              </div>
            )
            : savedRecipes.map((r) => (
              <div
                key={r.id}
                className="card"
                style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                onClick={() => setSelectedRecipe(r)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.625rem" }}>
                  <h3 style={{ fontSize: "1rem", lineHeight: 1.3, flex: 1, paddingRight: "0.5rem" }}>{r.title}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRecipe(r.id!); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.4, fontSize: "1.125rem", lineHeight: 1, padding: "4px", flexShrink: 0 }}
                  >×</button>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", marginBottom: "0.875rem", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {r.description}
                </p>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {r.difficulty && <span className="tag" style={{ color: difficultyColor[r.difficulty] || "var(--ink-soft)" }}>{r.difficulty}</span>}
                  {r.prepTime && <span className="tag">{r.prepTime}</span>}
                  {r.cuisine && <span className="tag">{r.cuisine}</span>}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Recipe modal */}
      {selectedRecipe && (
        <div
          className="modal-wrap"
          style={{ position: "fixed", inset: 0, background: "rgba(26,20,16,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="modal-inner"
            style={{ background: "var(--cream)", borderRadius: "1.25rem", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
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

function RecipeCard({ recipe, onSave, saved, difficultyColor }: {
  recipe: Recipe;
  onSave?: () => void;
  saved: boolean;
  difficultyColor: Record<string, string>;
}) {
  return (
    <div className="card fade-in" style={{ padding: "1.5rem" }}>
      {/* Title + save */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.875rem", gap: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>{recipe.title}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", lineHeight: 1.6 }}>{recipe.description}</p>
        </div>
        {onSave && (
          <button
            className={saved ? "btn-outline" : "btn-primary"}
            onClick={onSave}
            disabled={saved}
            style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        )}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {recipe.difficulty && <span className="tag" style={{ color: difficultyColor[recipe.difficulty] }}>{recipe.difficulty}</span>}
        {recipe.prepTime && <span className="tag">Prep {recipe.prepTime}</span>}
        {recipe.cookTime && <span className="tag">Cook {recipe.cookTime}</span>}
        {recipe.servings && <span className="tag">{recipe.servings} servings</span>}
        {recipe.cuisine && <span className="tag">{recipe.cuisine}</span>}
        {recipe.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
      </div>

      {/* Ingredients + Method — stacks on mobile */}
      <div className="recipe-body">
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "0.75rem" }}>
            Ingredients
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ fontSize: "0.9375rem", display: "flex", gap: "0.5rem", lineHeight: 1.5 }}>
                <span style={{ color: "var(--terra)", flexShrink: 0, marginTop: "0.15rem" }}>—</span>
                {ing}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "0.75rem" }}>
            Method
          </p>
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: "0.75rem", fontSize: "0.9375rem", lineHeight: 1.65 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--terra)", flexShrink: 0, minWidth: "1.25rem" }}>
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
