# ═══════════════════════════════════════════════════════════════════
#  AI PROVIDERS  —  add any combination, app uses them in order:
#  Anthropic → Grok → DeepSeek → OpenRouter (free) → Gemini
#  Providers with missing keys are automatically skipped.
# ═══════════════════════════════════════════════════════════════════

# Gemini API key - get from console.cloud.google.com
#recipe-ai
#projects/367011648825
#367011648825
GEMINI_API_KEY="AIzaSyBjXkWh5SJ8x9tWq_GQiDT0fUxyBPonJTo"

# 1. Anthropic (Claude) — console.anthropic.com → API Keys
#    Key starts with: sk-ant-
ANTHROPIC_API_KEY="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"

# 2. Grok (xAI) — console.x.ai → API Keys
#    Key starts with: xai-
#GROK_API_KEY="xai-NQZHEcIzMYpEh6i54dvY8TCw08NIqMnXpbDeTq3dyzUiHSelXBrbY8CZfCFqqe1xZUtHaSfuigbBoEyb"

# 3. DeepSeek — platform.deepseek.com → API Keys
#    Key starts with: sk-
#DEEPSEEK_API_KEY="sk-fe8c5958ad2f477f939b9556f1cb704b"

# 4. OpenRouter — openrouter.ai/settings/keys
#    One key, access to 300+ models incl. free Llama, Mistral, etc.
#    Key starts with: sk-or-
OPENROUTER_API_KEY="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"



# ═══════════════════════════════════════════════════════════════════
#  DATABASE
# ═══════════════════════════════════════════════════════════════════

# railway.app → your PostgreSQL → connection string
# DATABASE_URL=postgresql://user:password@host:5432/recipe_ai
# Database - get from Railway.app (free tier)
DATABASE_URL="postgresql://postgres:qSqoOFFUAiEEVGWgcmrJuoxtqoHgSwnB@metro.proxy.rlwy.net:15904/railway"


# ═══════════════════════════════════════════════════════════════════
#  AUTHENTICATION (NextAuth)
# ═══════════════════════════════════════════════════════════════════

# Generate: openssl rand -base64 32
AUTH_SECRET="7mWBfSAQ+9KeUYolb+xnpkXwEM/RAF1UlHvcAfrxn5w="

# Google OAuth: console.cloud.google.com → APIs & Services → Credentials
# Redirect URI to add: http://localhost:3000/api/auth/callback/google
AUTH_GOOGLE_ID="987650541813-csd6clanjfaa34s7mfi01jusnin3jp2d.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="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"


# GitHub OAuth: github.com/settings/apps → New OAuth App
# Callback URL to add: http://localhost:3000/api/auth/callback/github
AUTH_GITHUB_ID="Ov23liMVM2NTPjmvcyoD"
AUTH_GITHUB_SECRET="c9a634c0b8eb7dfd993eee97947b8bbe9daf901a"


# ═══════════════════════════════════════════════════════════════════
#  APP
# ═══════════════════════════════════════════════════════════════════
NEXTAUTH_URL="http://localhost:3000"


# Railway stuff
#raees04fakier_db_user

#EOOYn4vgNNWJMbcT

