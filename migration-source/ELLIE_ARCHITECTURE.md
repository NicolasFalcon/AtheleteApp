# ELLIE — AI Coach Architecture

> Deep technical reference for the ELLIE AI system inside the Athelete platform.  
> Last updated: April 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Edge Function — `ellie-chat`](#3-edge-function--ellie-chat)
4. [Tool-Calling System](#4-tool-calling-system)
5. [Context Injection Pipeline](#5-context-injection-pipeline)
6. [Client-Side Chat Layer](#6-client-side-chat-layer)
7. [Persistence Layer — `ellieActions`](#7-persistence-layer--ellieactions)
8. [Scoring & Recommendation Engine](#8-scoring--recommendation-engine)
9. [Nudge System](#9-nudge-system)
10. [Smart Insights Engine](#10-smart-insights-engine)
11. [Gamification Integration](#11-gamification-integration)
12. [Current Limitations](#12-current-limitations)
13. [Planned Improvements](#13-planned-improvements)

---

## 1. Overview

ELLIE (Engine for Learning, Lifestyle Intelligence & Exercise) is the AI coach at the center of Athelete. She is not a generic chatbot — she is a context-aware fitness companion that:

- **Generates** personalized workout routines and nutrition plans via tool-calling
- **Analyzes** real user data (training, nutrition, hydration, challenges, PRs)
- **Nudges** users proactively on the Home screen with prioritized, data-driven reminders
- **Recommends** workouts from the real library using a multi-factor scoring engine
- **Celebrates** streaks, badges, and milestones to reinforce consistency

ELLIE operates across three layers:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **AI Chat** | Supabase Edge Function + Lovable AI Gateway | Conversational coaching with tool-calling |
| **Rules Engine** | Client-side TypeScript (`ellieEngine.ts`) | Deterministic insights, nudges, recommendations |
| **Persistence** | Supabase SDK (`ellieActions.ts`) | Save/delete AI-generated content to the database |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ EllieScreen  │  │ EllieNudge   │  │ EllieSmartRow  │ │
│  │ (Chat Tab)   │  │ Banner       │  │ (Home recs)    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                 │                   │         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼────────┐│
│  │ ellieChat.ts │  │ellieEngine.ts│  │useEllieRecs.ts ││
│  │ (streaming)  │  │(nudges/      │  │(scoring engine)││
│  │              │  │ insights)    │  │                ││
│  └──────┬───────┘  └──────┬───────┘  └────────────────┘│
│         │                 │                             │
│  ┌──────▼───────┐  ┌──────▼───────┐                    │
│  │ellieActions  │  │ellieContext  │                    │
│  │(save/delete) │  │(build/serial)│                    │
│  └──────┬───────┘  └──────────────┘                    │
└─────────┼──────────────────────────────────────────────┘
          │
    ┌─────▼──────────────────────────────────┐
    │       EDGE FUNCTION: ellie-chat        │
    │                                        │
    │  1. Receive messages + userContext      │
    │  2. Fetch exercise library from DB     │
    │  3. Build system prompt                │
    │  4. Call Lovable AI Gateway            │
    │     (google/gemini-3-flash-preview)    │
    │  5. Handle tool calls OR stream text   │
    └────────────────────────────────────────┘
```

---

## 3. Edge Function — `ellie-chat`

**File:** `supabase/functions/ellie-chat/index.ts`  
**Model:** `google/gemini-3-flash-preview` via Lovable AI Gateway  
**Auth:** `LOVABLE_API_KEY` (auto-provisioned secret)

### Request Flow

1. Client sends `POST` with `{ messages, userContext, mode? }`
2. Edge function fetches the **full exercise library** from the `exercises` table (up to 300 rows, grouped by muscle group)
3. Builds the system prompt by concatenating:
   - ELLIE's persona and rules (Spanish-language)
   - Serialized user context string
   - Exercise library catalog
4. Routes to one of two paths:

#### Path A — Explicit Generation Mode (`mode` parameter present)

Used when the user taps a CTA button (e.g., "Generar rutina", "Crear plan nutricional").

- Calls the AI with `tool_choice: { type: "function", function: { name: selectedTool } }` — **forcing** a tool call
- Returns `application/json` with `{ type, data }`

#### Path B — Natural Language Chat (no `mode`)

Used for all conversational messages.

- Calls the AI with `tools` defined but **no `tool_choice`** — the model decides whether to use a tool
- If the model triggers a tool call → returns `application/json` with structured data
- If the model returns plain text → wraps it in SSE format (`text/event-stream`) for streaming compatibility

### Error Handling

| HTTP Status | Meaning |
|------------|---------|
| 429 | Rate limit exceeded — surface to user |
| 402 | Credits exhausted — surface to user |
| 500 | Gateway or internal error |

### System Prompt Structure

```
ELLIE persona + personality rules
↓
Intent detection instructions (CRITICAL)
↓
Generation rules (exercise library, injuries)
↓
Medical safety boundaries
↓
Response format rules
↓
USER CONTEXT (serialized from client)
↓
EXERCISE_LIBRARY (fetched from DB)
```

Key intent detection rule: if the user asks for a workout in **any** phrasing, ELLIE must call `generate_workout_plan` — never output exercises as plain text.

---

## 4. Tool-Calling System

ELLIE uses two tools defined in the Edge Function:

### `generate_workout_plan`

Generates a complete workout routine with:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `intro_message` | string | ✅ | Conversational intro in Spanish |
| `title` | string | ✅ | Workout name |
| `type` | enum | ✅ | strength, cardio, fullbody, mobility, hiit |
| `difficulty` | enum | ✅ | beginner, intermediate, advanced |
| `duration` | number | ✅ | Minutes |
| `calories` | number | ✅ | Estimated burn |
| `target_muscles` | string[] | ✅ | Target muscle groups |
| `exercises` | array | ✅ | Each with name, exercise_id, sets, reps, duration, rest_time, notes |

**Critical constraint:** Exercises must come from the `EXERCISE_LIBRARY` injected in the system prompt, using real UUIDs. ELLIE should only invent exercises when no suitable match exists.

### `generate_nutrition_plan`

Generates macro targets:

| Parameter | Type | Required |
|-----------|------|----------|
| `intro_message` | string | ✅ |
| `target_calories` | number | ✅ |
| `target_protein` | number | ✅ |
| `target_carbs` | number | ✅ |
| `target_fats` | number | ✅ |
| `notes` | string | ❌ |

### Tool-Call Flow (Client Side)

```
User message → callEllieChat()
  → Edge Function responds with JSON (tool call) or SSE (text)
    → If JSON with type "generate_workout_plan":
        → onToolResult() fires
        → UI renders WorkoutPreviewCard
        → User can Save, Regenerate, or Discard
    → If SSE stream:
        → onDelta() fires per token
        → UI renders markdown progressively
```

---

## 5. Context Injection Pipeline

ELLIE's intelligence depends on rich, real-time user context. This is built entirely client-side and sent as a serialized string with every chat request.

### Architecture

```
AppContext + WorkoutSessionContext + GamificationContext + hooks
    ↓
useEllieContext() hook (src/hooks/useEllieContext.ts)
    ↓
buildEllieContext() (src/lib/ellieContext.ts) → EllieFullContext object
    ↓
serializeEllieContext() → compact Spanish-language string
    ↓
Sent as `userContext` in chat requests
```

### EllieFullContext Structure

| Section | Key Data |
|---------|----------|
| **profile** | name, age, weight, height, goal, training days, environment, equipment, injuries, restrictions, exercise/diet preferences & avoidances |
| **training** | today done, workouts this week / 14d / 30d, streak, weekly adherence %, recent workout titles, template count |
| **nutrition** | active plan, macro targets, logged today, today's intake, 7-day adherence % |
| **challenge** | active, current day (1–33), streak, completion rate %, today completed, selected habits |
| **achievements** | total points, unlocked badge IDs, nearest badges to unlock |
| **personalRecords** | total PRs, exercises with PRs, recent PRs (last 30d with display values), improvements (% change over period) |
| **hydration** | today ml, goal ml, today %, days met goal this week, weekly average, hydration streak |

### Serialized Output Example

```
ESTADO ACTUAL DEL USUARIO:
— Perfil: Carlos, 28 años, 78kg, 175cm
— Objetivo: Ganar músculo
— Plan: 5 días/semana
— Entorno: gym
— Equipamiento: barbell, dumbbells, cables
— Lesiones/molestias: dolor lumbar leve

ENTRENAMIENTO:
— Hoy entrenado: No
— Esta semana: 3 entrenos
— Racha: 5 días
— Adherencia semanal: 60%

NUTRICIÓN:
— Plan activo: Sí
— Objetivos: 2800 kcal, 180g prot, 320g carbs, 80g grasas
— Registrado hoy: No

RETO CORE 33:
— Día 12/33
— Racha: 4 días

HIDRATACIÓN:
— Hoy: 1200 ml (48%)
— Racha: 3 días
```

This string is appended to ELLIE's system prompt so the AI has full awareness of the user's current state.

---

## 6. Client-Side Chat Layer

**File:** `src/lib/ellieChat.ts`

### API Surface

| Function | Purpose |
|----------|---------|
| `callEllieChat()` | Primary unified call — handles both tool results (JSON) and text streams (SSE) |
| `streamEllieChat()` | Legacy wrapper for backward compatibility |
| `generateWithEllie()` | Direct non-streaming call for explicit CTA generation |

### SSE Parsing

The client implements a robust SSE parser that:

1. Reads the response body as a stream via `ReadableStream` + `TextDecoder`
2. Processes line-by-line, handling `\r\n` and `\n` line endings
3. Ignores SSE comments (`:`) and keepalive empty lines
4. Parses `data: {json}` lines, extracting `choices[0].delta.content`
5. Handles incomplete JSON by re-buffering partial lines
6. Recognizes `data: [DONE]` as stream termination
7. Flushes remaining buffer after stream ends

### Callbacks

```typescript
{
  onDelta: (text: string) => void;     // Each text token
  onDone: () => void;                  // Stream complete
  onToolResult: (result) => void;      // Structured tool call result
  onError: (error: string) => void;    // Error message
}
```

---

## 7. Persistence Layer — `ellieActions`

**File:** `src/lib/ellieActions.ts`

### `saveEllieWorkout(userId, workout)`

1. Generates a thematic thumbnail URL based on workout type and target muscles
2. Inserts a row into `workout_templates` with `created_by_ai: true, source: 'ellie'`
3. Inserts all exercises into `template_exercises` with `sort_order` preserved
4. On exercise insert failure, rolls back by deleting the template
5. Returns `{ success, workoutId }`

### `deleteEllieWorkout(workoutId)`

1. Deletes child rows from `template_exercises`
2. Deletes the parent `workout_templates` row
3. Used when the user discards or explicitly deletes an AI-generated routine

### `saveEllieNutritionPlan(userId, plan)`

1. Deactivates all existing active plans for the user (`is_active: false`)
2. Inserts new plan into `nutrition_plans` with `created_by_ai: true, source: 'ellie'`
3. Returns `{ success, planId }`

---

## 8. Scoring & Recommendation Engine

**File:** `src/hooks/useEllieRecommendations.ts`

The recommendation engine ranks **real workout templates from the database** — it does not generate content. It powers the "Recomendados para ti" section on the Home tab.

### Scoring Factors

| Factor | Weight | Logic |
|--------|--------|-------|
| **Goal Affinity** | up to +30 | Maps user goal to preferred workout types. Earlier in the affinity list = higher score |
| **Difficulty Match** | +15 | Matches workout difficulty to goal-appropriate levels |
| **Environment** | +20 / -10 | Home users get +20 for home-compatible workouts, -10 for gym-only |
| **Duration** | +5 | Fewer training days → prefer longer sessions; more days → prefer shorter |
| **Injury Awareness** | +10 | If user has injury/restriction notes → boost mobility, core, conditioning |
| **Exercise Preferences** | +8 per match | Boost workouts matching preferred muscles/exercises |
| **Exercise Avoidances** | -15 per match | Penalize workouts matching avoided muscles/exercises |
| **Novelty Penalty** | -12 | Penalize workouts completed in the last 7 days |
| **Daily Jitter** | 0–6 | Deterministic hash of `date + workoutId` ensures fresh order daily |

### Environment Logic

```
gym → can do everything, slight preference for gym-centric
home → strong boost for bodyweight/mobility/HIIT, penalize machine-heavy
```

### Output

Returns up to 8 top-scored workouts, recalculated on every render via `useMemo`.

---

## 9. Nudge System

**File:** `src/lib/ellieEngine.ts` → `generateProactiveNudges()`  
**UI:** `src/components/home/EllieNudgeBanner.tsx`

Nudges are proactive, data-driven banners ELLIE surfaces on the Home screen. They are **deterministic** (rules-based, not AI-generated) for instant rendering.

### Priority System

| Priority | Category | Example |
|----------|----------|---------|
| 1 | Workout missing | "Te faltan 2 sesiones esta semana" |
| 2 | Core 33 pending | "Llevas 5 días de racha. No la rompas" |
| 3 | No hydration today | "Todavía no registras agua hoy" |
| 4 | Nutrition not logged | "Aún no registras tu alimentación" |
| 5 | Hydration streak | "💧 3 días de racha de hidratación" |
| 6 | Partial hydration | "Hidratación al 60%. Faltan 2 vasos" |
| 7 | Great week | "Buen ritmo: 4 entrenos completados" |
| 8 | Weekly goal met | "Hoy es buen día para movilidad o descanso" |
| 9 | Completions (positive) | "✓ Entrenamiento completado hoy" |
| 10 | Perfect day | "¡Día perfecto! 💪" |

### Display Rules

- Maximum **3 nudges** shown at once
- If **2+ actionable items** exist: show 2 actionable + 1 positive
- If **1 actionable**: show 1 actionable + 2 positive
- If **0 actionable** (everything done): show up to 3 positive
- **Perfect day** (all 4 areas complete): show only the celebration nudge

### Tone System

| Tone | Visual | When |
|------|--------|------|
| `reminder` | Primary blue bg | Something is pending |
| `encouragement` | Warning/amber bg | Streak at risk or partial progress |
| `positive` | Success/green bg | Task completed |

### Actions

Each nudge can trigger: `start_workout`, `log_nutrition`, `view_challenge`, `log_hydration`, or `ask_ellie`.

---

## 10. Smart Insights Engine

**File:** `src/lib/ellieEngine.ts` → `generateSmartInsights()` and `generateSmartRecommendations()`

### Insights

Used in the ELLIE "Análisis" tab. Priority-sorted array of `EllieInsight` objects covering:

- Workout status and streak tracking
- Hydration progress and streaks
- Nutrition plan status and adherence
- Core 33 challenge progress
- Badge proximity alerts
- Overtraining detection (>2.5× weekly goal in 14 days)

### Smart Recommendations

Action-oriented cards shown in the ELLIE screen:

- Start workout / generate workout
- Create or log nutrition
- Complete Core 33 habits
- Log hydration
- Review weekly progress

Returns up to 5 recommendations, context-dependent.

---

## 11. Gamification Integration

ELLIE is aware of the gamification system through `EllieAchievementContext`:

- **Points:** Total accumulated points visible in the profile
- **Badges:** Unlocked badge IDs and recently earned badges
- **Proximity:** Nearest badges the user hasn't unlocked yet — ELLIE can mention these in nudges and insights

Badge awareness includes hydration-specific badges (`hydration_3_days`, `hydration_7_days`, `weekly_hydration_master`) added to the unlock tracking system.

---

## 12. Current Limitations

| Area | Limitation |
|------|-----------|
| **Memory** | No long-term conversation memory across sessions. Chat history is persisted in `chat_messages` table but full history loading is not optimized for very long conversations. |
| **Exercise validation** | ELLIE receives the exercise library but can occasionally hallucinate exercise names if the library lacks coverage. |
| **Streaming** | Natural language responses are non-streaming (full response wrapped in SSE). True token-by-token streaming only occurs for the SSE wrapper, not from the AI gateway call itself. |
| **Context window** | Large exercise libraries (~300 exercises) plus full user context can consume significant prompt tokens. No truncation or prioritization logic exists. |
| **Offline** | No offline capability. All AI features require network. |
| **Language** | ELLIE is hardcoded to respond in Spanish. No multi-language support. |
| **Regeneration** | Regenerating a plan re-sends the full conversation + context, but does not explicitly instruct the model to vary its output beyond the natural conversation flow. |
| **Favorites** | Favorite exercises/workouts are stored client-side (localStorage), so ELLIE has no visibility into them. |
| **Premium gating** | `isPremium` is sent in context but not enforced server-side — premium checks happen client-side only. |

---

## 13. Planned Improvements

### Short-Term

- **True streaming for all responses:** Switch default chat path from non-streaming + SSE wrapper to actual streaming with `stream: true`, maintaining tool-call detection via `finish_reason`
- **Conversation summarization:** Periodically summarize older messages to reduce context window usage
- **Exercise library caching:** Cache the exercise library in the edge function (e.g., via KV or in-memory with TTL) to avoid re-fetching on every request
- **Server-side premium validation:** Verify premium status in the edge function rather than trusting client-side context

### Medium-Term

- **Multi-language support:** Accept a `locale` parameter and adapt ELLIE's personality and response language
- **Workout modification tools:** Add tools for `modify_workout_plan` (adjust sets/reps/exercises) and `modify_nutrition_plan` (tweak macros)
- **Progress analysis tool:** A dedicated tool that generates visual-friendly data summaries (charts, trends) rather than text-only
- **Favorites awareness:** Move favorites to database storage so ELLIE can factor them into recommendations
- **Conversation branching:** Allow "regenerate" to explicitly request variation via system-level instructions

### Long-Term

- **Image-based form analysis:** Accept exercise photos/videos for form feedback (multimodal)
- **Periodization planning:** Multi-week training program generation with progressive overload logic
- **Meal plan generation:** Full daily meal plans (not just macro targets) with recipe suggestions
- **Push notification nudges:** Server-side nudge evaluation that triggers mobile push notifications
- **A/B testing framework:** Test different ELLIE personalities, prompt strategies, and nudge thresholds

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/functions/ellie-chat/index.ts` | Edge Function — AI gateway, tool definitions, system prompt |
| `src/lib/ellieChat.ts` | Client-side chat API — streaming, tool result handling |
| `src/lib/ellieContext.ts` | Context building and serialization |
| `src/lib/ellieEngine.ts` | Rules engine — nudges, insights, recommendations |
| `src/lib/ellieActions.ts` | Persistence — save/delete AI-generated content |
| `src/hooks/useEllieContext.ts` | React hook — assembles full context from app state |
| `src/hooks/useEllieRecommendations.ts` | Workout scoring and ranking engine |
| `src/components/home/EllieNudgeBanner.tsx` | Nudge banner UI component |
| `src/components/home/EllieCard.tsx` | Home card with primary insight |
| `src/components/home/EllieSmartRow.tsx` | Smart recommendation cards |
| `src/components/screens/EllieScreen.tsx` | Full ELLIE screen (Chat + Análisis tabs) |
