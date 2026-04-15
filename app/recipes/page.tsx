"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [ingredients, setIngredients] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [dietary, setDietary] = useState("");
  const [servings, setServings] = useState("4");
  const [generating, setGenerating] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

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

      const clean = full.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setRecipe(parsed);
      setStreaming("");
    } catch (e) {
      console.error(e);
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
    if (res.ok) {
      setSaved(true);
      fetchRecipes();
    }
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 2rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Recipes</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["generate", "saved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "btn-primary" : "btn-outline"}
              style={{ padding: "0.5rem 1.25rem", textTransform: "capitalize" }}
            >
              {tab} {tab === "saved" && savedRecipes.length > 0 && `(${savedRecipes.length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "generate" && (
        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "2rem", alignItems: "start" }}>
          {/* Form */}
          <div className="card" style={{ position: "sticky", top: 84 }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>What&apos;s in your fridge?</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.4rem" }}>
                  Ingredients *
                </label>
                <textarea
                  className="input"
                  placeholder="chicken thighs, garlic, lemon, thyme, potatoes..."
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.4rem" }}>Cuisine</label>
                  <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                    <option value="">Any</option>
                    {["Italian", "Asian", "Mexican", "French", "Indian", "Mediterranean", "American"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.4rem" }}>Servings</label>
                  <select className="input" value={servings} onChange={(e) => setServings(e.target.value)}>
                    {["1", "2", "4", "6", "8"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: "0.4rem" }}>Dietary needs</label>
                <input
                  className="input"
                  placeholder="vegetarian, gluten-free, dairy-free..."
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                />
              </div>

              <button
                className="btn-primary"
                onClick={generate}
                disabled={generating || !ingredients.trim()}
                style={{ width: "100%", justifyContent: "center", padding: "0.875rem", fontSize: "0.9375rem", marginTop: "0.25rem" }}
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
          <div>
            {generating && streaming && (
              <div className="card fade-in">
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  <div className="shimmer" style={{ height: 32, width: "60%", borderRadius: 8 }} />
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--ink-soft)", whiteSpace: "pre-wrap", lineHeight: 1.7, opacity: 0.7 }}>
                  {streaming}
                </p>
              </div>
            )}

            {recipe && !generating && (
              <RecipeCard
                recipe={recipe}
                onSave={saveRecipe}
                saved={saved}
                difficultyColor={difficultyColor}
              />
            )}

            {!recipe && !generating && (
              <div style={{ textAlign: "center", padding: "5rem 2rem", color: "var(--ink-soft)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>✦</div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontStyle: "italic" }}>
                  Your recipe will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {loadingRecipes
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="card shimmer" style={{ height: 180 }} />
              ))
            : savedRecipes.length === 0
            ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem", color: "var(--ink-soft)" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontStyle: "italic" }}>No saved recipes yet</p>
                <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>Generate and save a recipe to see it here</p>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "1.0625rem", lineHeight: 1.3, flex: 1, paddingRight: "0.5rem" }}>{r.title}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRecipe(r.id!); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.4, fontSize: "1rem", lineHeight: 1, padding: "2px" }}
                  >×</button>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", marginBottom: "1rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {r.description}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {r.difficulty && (
                    <span className="tag" style={{ color: difficultyColor[r.difficulty] || "var(--ink-soft)", borderColor: "transparent", background: "var(--warm-white)" }}>
                      {r.difficulty}
                    </span>
                  )}
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
          style={{ position: "fixed", inset: 0, background: "rgba(26,20,16,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            style={{ background: "var(--cream)", borderRadius: "1.25rem", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "2rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{selectedRecipe.title}</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.9375rem" }}>{selectedRecipe.description}</p>
              </div>
              <button onClick={() => setSelectedRecipe(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1, color: "var(--ink-soft)", marginLeft: "1rem" }}>×</button>
            </div>
            <RecipeCard recipe={selectedRecipe} saved={true} difficultyColor={difficultyColor} />
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  onSave,
  saved,
  difficultyColor,
}: {
  recipe: Recipe;
  onSave?: () => void;
  saved: boolean;
  difficultyColor: Record<string, string>;
}) {
  return (
    <div className="card fade-in" style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{recipe.title}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9375rem", lineHeight: 1.6 }}>{recipe.description}</p>
        </div>
        {onSave && (
          <button
            className={saved ? "btn-outline" : "btn-primary"}
            onClick={onSave}
            disabled={saved}
            style={{ whiteSpace: "nowrap", marginLeft: "1rem" }}
          >
            {saved ? "✓ Saved" : "Save recipe"}
          </button>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
        {recipe.difficulty && (
          <span className="tag" style={{ color: difficultyColor[recipe.difficulty] }}>
            {recipe.difficulty}
          </span>
        )}
        {recipe.prepTime && <span className="tag">Prep {recipe.prepTime}</span>}
        {recipe.cookTime && <span className="tag">Cook {recipe.cookTime}</span>}
        {recipe.servings && <span className="tag">{recipe.servings} servings</span>}
        {recipe.cuisine && <span className="tag">{recipe.cuisine}</span>}
        {recipe.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
        {/* Ingredients */}
        <div>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.875rem", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.75rem", fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--ink-soft)" }}>
            Ingredients
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ fontSize: "0.9375rem", display: "flex", gap: "0.5rem", lineHeight: 1.5 }}>
                <span style={{ color: "var(--terra)", marginTop: "0.2rem", flexShrink: 0 }}>—</span>
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div>
          <h3 style={{ fontSize: "0.75rem", fontFamily: "var(--font-body)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "0.875rem" }}>
            Method
          </h3>
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: "0.875rem", fontSize: "0.9375rem", lineHeight: 1.65 }}>
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
