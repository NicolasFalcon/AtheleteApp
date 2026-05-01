# Athelete — Community Roadmap

> Future product and implementation reference for the planned `Athelete Community` feature.  
> Status: Planning only. Nothing in this document is implemented yet.  
> Last updated: April 2026

---

## 1. Purpose of This Document

This document preserves the future plan for the **Athelete Community** feature so the team can return to it after the current mobile migration work.

This file is intentionally:

- **future-focused**
- **implementation-friendly**
- **non-binding at the code level**
- **clear about what is not being built yet**

### Not in scope right now

- No frontend implementation
- No database tables or migrations
- No Supabase schema changes
- No changes to current app flows
- No challenge engine implementation
- No public profile or social feed implementation

---

## 2. Feature Vision

### What Athelete Community is intended to be

**Athelete Community** is the planned social and gamified layer of the product.

The first version should focus on **verified community challenges** that turn real in-app activity into friendly competition, visible progress, and meaningful rewards.

The long-term vision is broader:

- a lightweight community system built around **real user progress**
- a social loop that reinforces consistency, discipline, and achievement
- a way to make progress more visible, motivating, and shareable
- a future foundation for **public profiles**, **activity feed**, **shared routines**, and other community experiences

### Product framing

The community layer should not start as a generic social network. It should start as a **fitness accountability and motivation system** rooted in verified product behavior:

- workouts completed
- Core 33 progress
- hydration consistency
- nutrition adherence
- PRs logged
- points earned

This keeps the feature aligned with the product's identity: **real progress first, social layer second**.

---

## 3. Why This Feature Matters

The Community feature has strong product value because it can improve both user motivation and product stickiness.

### Retention

- Gives users a reason to return regularly to check standings, progress, and results
- Creates weekly and monthly loops instead of one-time usage
- Makes the app feel alive even on days when the user is not starting a full workout

### Motivation

- Challenges create short-term goals that feel concrete and achievable
- Visible rankings and rewards can reinforce consistency
- Users get more reasons to log activity across multiple product areas

### Competitiveness

- Leaderboards create healthy competitive pressure
- Winners and top placements give users a clear payoff
- Challenge formats can motivate both high performers and consistent users

### Community

- Establishes shared experiences rather than isolated tracking
- Creates a bridge from personal progress to social recognition
- Opens the door to following, sharing, and feed-based interactions later

### Engagement across the product

This feature can strengthen the value of existing Athelete systems by giving them a shared destination:

- **Progress** becomes more meaningful when it contributes to challenge outcomes
- **Core 33** gains broader visibility and social reinforcement
- **Points** become more useful when they connect to rankings and rewards
- **ELLIE** can promote active challenges and celebrate standings
- **Routines** can become more discoverable later through community sharing
- **Hydration** and **nutrition** gain stronger daily motivation loops
- **PRs** become social proof rather than only personal milestones

---

## 4. Product Principles

The feature should follow a few principles from the start.

### Principle 1: Verified activity only

Challenge progress should come from **real app events**, not user claims.

### Principle 2: Simple before social

The MVP should prove that challenge participation and verified competition increase engagement before broader social features are added.

### Principle 3: Clear rules

Every challenge must have understandable scoring, timeframe, and reward rules.

### Principle 4: Low-friction participation

Joining a challenge should be easy, but still explicit and intentional.

### Principle 5: Preserve trust

Users should feel that rankings are fair, event-based, and not easy to manipulate.

---

## 5. Phase-Based Roadmap

## Phase 1 — Verified Challenges MVP

Phase 1 should establish the first meaningful community loop.

### Core capabilities

- Weekly challenges
- Monthly challenges
- Join challenge
- Challenge progress tracking
- Leaderboard
- Winners
- Badges and reward points

### Goal of Phase 1

Prove that users will join verified challenges, come back to check progress, and respond positively to competitive and reward-based loops.

### Expected output of Phase 1

- A challenge system based on verified app activity
- A repeatable weekly/monthly event cadence
- A minimal community presence on Home and Profile
- A reward structure connected to points and badges

## Phase 2 — Public Identity and Sharing

Once Phase 1 is stable, the product can add a more explicit social layer.

### Core capabilities

- Public profiles
- Follow users
- Activity feed
- Share progress
- Share PRs
- Share routines

### Goal of Phase 2

Turn challenge participation into visible social momentum and allow users to see what others are accomplishing inside Athelete.

### Expected output of Phase 2

- User identity beyond private profile data
- Lightweight social graph
- Feed-based discovery of progress and achievements
- Stronger network effects around routines and milestones

## Phase 3 — Richer Community Layer

Phase 3 should expand the experience into a broader community product layer if earlier phases show strong usage.

### Core capabilities

- Richer social and community experiences
- Deeper routine sharing and discovery
- Likes and comments if later validated as valuable
- Broader community spaces or experiences

### Goal of Phase 3

Evolve Athelete Community from challenge participation into a more complete fitness community system without losing the verified-progress foundation.

---

## 6. Recommended First MVP Scope

The recommended MVP is intentionally narrow.

### MVP recommendation

Build a **verified challenge system** with:

- verified weekly challenges
- verified monthly challenges
- join flow
- challenge detail and progress
- leaderboard
- winners
- rewards
- a challenge card on Home

### Why this is the right MVP

It creates a meaningful community loop without requiring full social infrastructure.

The loop is:

1. User sees challenge on Home
2. User joins challenge
3. User performs normal verified app actions
4. Progress updates automatically
5. User checks leaderboard and standings
6. Winners receive recognition and rewards
7. New challenge cycle begins

### MVP boundaries

The first MVP should **not** include:

- user-generated challenges
- manual proof uploads
- public profiles
- following system
- comments
- likes
- chat
- community posts
- manual score claims
- unverified off-platform activity

---

## 7. Suggested Challenge Types

The first versions of challenges should use data that already maps naturally to the app's current tracking model.

### Recommended categories

#### Completed workouts

- Example: "Complete 4 workouts this week"
- Source: verified completed workout sessions only
- Good for accessibility and broad participation

#### Workout duration

- Example: "Accumulate 180 minutes of training this month"
- Source: total verified workout session duration
- Good for volume-based consistency

#### Hydration days

- Example: "Hit your hydration goal 5 days this week"
- Source: `daily_hydration_logs` against personal goal
- Good for daily habit reinforcement

#### Nutrition logging days

- Example: "Log nutrition 6 days this week"
- Source: verified daily nutrition entries
- Good for building adherence behavior

#### Points earned

- Example: "Earn 500 points this month"
- Source: points awarded through existing app systems
- Good for cross-feature engagement

#### PRs logged

- Example: "Log 2 PRs this month"
- Source: verified `personal_records` entries
- Good for performance-oriented users

#### Core 33 days

- Example: "Complete 7 Core 33 days in this month"
- Source: verified Core 33 daily completion state
- Good for integrating the existing challenge identity into community features

#### Mixed challenges

- Example: "Complete 3 workouts, 4 hydration goal days, and 4 nutrition log days this week"
- Source: multiple verified event streams
- Good later, but should probably not be the first challenge type implemented

### Recommended launch order for challenge categories

1. Completed workouts
2. Workout duration
3. Hydration days
4. Nutrition logging days
5. Core 33 days
6. Points earned
7. PRs logged
8. Mixed challenges

This order keeps the first implementation focused on clearer, more common event types.

---

## 8. Proposed Future Data Model

This section is a **proposal for future implementation**. These tables and entities do **not** exist yet unless explicitly noted as existing current app tables.

### Existing tables that may be reused or referenced

The current product already has several relevant entities:

- `profiles`
- `workout_sessions`
- `daily_nutrition_logs`
- `daily_hydration_logs`
- `challenge_participations`
- `habit_logs`
- `badges`
- `user_badges`
- `personal_records`

The Community feature should build on these where useful instead of duplicating the same source of truth.

### Proposed new entities

#### `community_challenges`

Defines each challenge.

Suggested fields:

- `id`
- `slug`
- `title`
- `description`
- `status`
- `visibility`
- `challenge_type`
- `metric_type`
- `period_type` (`weekly`, `monthly`, later possibly `special`)
- `start_at`
- `end_at`
- `join_deadline_at`
- `rules_json`
- `reward_json`
- `eligibility_json`
- `tiebreaker_type`
- `is_featured`
- `created_by`
- `created_at`
- `updated_at`

Purpose:

- stores the challenge definition
- stores timing and leaderboard rules
- separates challenge configuration from participation and progress events

#### `challenge_participants`

Stores user enrollment in a specific community challenge.

Suggested fields:

- `id`
- `challenge_id`
- `user_id`
- `joined_at`
- `status` (`joined`, `active`, `completed`, `disqualified`, `withdrawn`)
- `current_value`
- `rank_cached`
- `completion_state`
- `completed_at`
- `metadata_json`

Purpose:

- tracks who joined
- supports opt-in participation
- stores lightweight progress cache for quick reads

#### `challenge_progress_events`

Stores normalized challenge-related progress events derived from verified app behavior.

Suggested fields:

- `id`
- `challenge_id`
- `user_id`
- `participant_id`
- `source_type`
- `source_record_id`
- `event_type`
- `metric_type`
- `metric_value`
- `occurred_at`
- `counted_at`
- `dedupe_key`
- `metadata_json`

Purpose:

- creates an auditable event trail
- supports re-scoring or debugging
- prevents relying only on mutable aggregate values

#### `challenge_leaderboard_snapshots`

Stores frozen leaderboard states for performance, history, and result finalization.

Suggested fields:

- `id`
- `challenge_id`
- `snapshot_type` (`live`, `daily`, `final`)
- `taken_at`
- `rankings_json`
- `participant_count`
- `metadata_json`

Purpose:

- reduces expensive recalculation for heavy reads
- preserves historical standings
- supports final winner verification

### Optional future entities

These are not required for MVP, but may become useful later.

#### `challenge_reward_grants`

Tracks who received points, badges, or winner recognition from a challenge.

#### `user_follows`

Needed later for follow relationships in Phase 2.

#### `community_feed_events`

Could power a future activity feed.

### Relationship to existing badges

The current `badges` and `user_badges` model should be reused if possible.

Options:

- create new badge definitions for challenge milestones
- create winner badges for placement tiers
- create seasonal or campaign-specific badges if the product later supports limited-time events

### Important note

The community challenge model should remain **separate from the existing Core 33 challenge persistence** unless there is a clear reason to unify them later. Core 33 is a specific product challenge flow; Community challenges are a broader recurring challenge framework.

---

## 9. Challenge Logic

This section describes how challenge progress should ideally work.

### 9.1 Verified app events only

Only trusted product events should count toward challenge progress.

Examples:

- completed workout session
- logged nutrition day
- hydration goal reached for the day
- PR entry saved
- Core 33 day completed
- points awarded by existing systems

### 9.2 Event-based progress model

Progress should be derived from discrete events, not from arbitrary manual values entered for the challenge itself.

Recommended pattern:

1. User performs a real action in the app
2. The system determines whether that action qualifies for any active joined challenge
3. A normalized challenge progress event is recorded
4. Participant totals are updated
5. Leaderboards refresh from aggregated totals

### 9.3 Tracked progress values

Depending on the challenge, progress could be tracked as:

- count
- duration
- days completed
- points accumulated
- distinct actions completed
- mixed-rule composite totals

### 9.4 Completion state

Challenges should distinguish between:

- **participation state**: joined, active, withdrawn, disqualified
- **progress state**: not started, in progress, completed
- **result state**: winner, top 3, top 10, completed but not placed

### 9.5 Leaderboard rules

Leaderboards should be based on challenge-specific metric totals calculated from verified events.

Recommended ranking approach:

1. Highest valid progress value ranks first
2. If tied, apply a configured tiebreaker
3. If still tied, preserve equal placement or apply deterministic fallback ordering

### 9.6 Recommended tiebreakers

Suggested tiebreaker order for MVP:

1. Earliest time to reach the final value
2. Earliest join time
3. Deterministic participant ID fallback if needed

Alternative tiebreakers can be challenge-specific later, but MVP should keep them simple and transparent.

### 9.7 Dedupe and data integrity

The system should prevent double counting.

Examples:

- one workout session should not count twice for the same challenge
- one hydration day should count once per day if the rule is "goal met"
- one PR record should count once even if the record is later edited

Recommended protection:

- dedupe key per source event
- immutable event write once counted
- explicit correction flows later if retroactive fixes are ever needed

### 9.8 Winner finalization

At challenge end:

1. Challenge status moves to ended
2. Final progress recomputation runs if needed
3. Final leaderboard snapshot is stored
4. Winners and placement tiers are assigned
5. Rewards are granted
6. Results become visible on the challenge results screen

---

## 10. Reward System

Rewards should reinforce participation and recognition without making the system feel pay-to-win or easy to game.

### Reward ideas

#### Points

- participation points
- completion points
- winner bonus points
- top placement bonus points

This is the easiest reward layer to connect to the current gamification system because `profiles.points` already exists.

#### Badges

Potential badge patterns:

- joined first community challenge
- completed first weekly challenge
- completed first monthly challenge
- won a challenge
- top 3 finisher
- top 10 finisher
- streak-based challenge participation badges later

#### Winner recognition

Winners should be visible and celebrated, not only silently rewarded.

Examples:

- winner label on results screen
- placement badge
- highlighted profile marker later
- ELLIE congratulation nudge

### Recommended MVP reward structure

- All valid participants: optional small participation reward
- Completed challenge goal: completion reward
- Top 10: recognition
- Top 3: stronger recognition and bonus reward
- Winner: strongest recognition and best reward

This balances inclusivity with competition.

---

## 11. Suggested Future Screens

These screens are future product ideas, not immediate implementation tasks.

### 11.1 Challenges List

Purpose:

- browse active weekly and monthly challenges
- see joined vs available challenges
- understand timelines and rewards

Key UI elements:

- featured challenge
- weekly section
- monthly section
- status chips
- join CTA

### 11.2 Challenge Detail

Purpose:

- explain rules clearly
- show leaderboard
- show reward tiers
- show personal progress after joining

Key UI elements:

- challenge header
- timeframe
- rules
- verified metric definition
- leaderboard preview
- participant count
- reward breakdown
- join CTA or progress CTA

### 11.3 My Challenge Progress

Purpose:

- give the user a personal view of joined challenges and current standings

Key UI elements:

- current value
- target if applicable
- placement
- recent qualifying events
- time remaining

### 11.4 Challenge Results

Purpose:

- show finalized rankings and winners once a challenge ends

Key UI elements:

- winner spotlight
- top 3
- top 10
- user final placement
- rewards earned

### 11.5 Community Hub Later

Purpose:

- serve as the future entry point for all community surfaces

Possible later contents:

- featured challenges
- activity feed
- suggested people to follow
- community highlights
- shared routines

---

## 12. Integration With Existing App Areas

The Community layer should connect to current app surfaces in deliberate ways.

### Home

Recommended future integration:

- featured challenge card
- active challenge progress card
- result announcement card when a challenge closes
- ELLIE challenge nudge entry points

Home is the best surface for discovery and repeat visibility.

### Profile

Recommended future integration:

- challenge history
- challenge wins
- top placements
- community badges
- public profile later in Phase 2

### Progress

Recommended future integration:

- progress stats that connect directly to active challenges
- challenge contribution visibility
- historical challenge performance later

### Core 33

Recommended future integration:

- eligible challenge types based on Core 33 completion days
- possible "Core 33 community challenge" campaigns later
- shared sense of discipline and streak identity

Core 33 should remain its own core product experience, but community challenges can amplify it.

### Hydration

Recommended future integration:

- hydration goal challenge types
- challenge cards that motivate daily completion
- reward alignment with hydration streak behavior

### Nutrition

Recommended future integration:

- nutrition logging day challenges
- adherence challenges later
- ELLIE prompts to support participation

### PRs

Recommended future integration:

- PR milestone challenges
- shareable PR moments in later social phases
- recognition for performance improvements

### ELLIE

Recommended future integration:

- recommend relevant challenges
- nudge users to join before deadline
- celebrate leaderboard movement
- congratulate wins and placements
- explain challenge rules conversationally

ELLIE should amplify Community, not replace the challenge UI.

---

## 13. Product Rules and Constraints

These rules are important for MVP quality and fairness.

### Participation rules

- Users join challenges manually
- Joining is explicit, not automatic
- Users should not be silently enrolled in every challenge by default

### Verification rules

- Only verified in-app actions count
- No fake or manual claim-based participation in MVP
- No self-reported completion outside the tracked app systems

### Rule clarity

- Every challenge must display what counts
- Every challenge must display the time window
- Every challenge must display ranking logic
- Every challenge must display reward logic

### Fairness rules

- Challenge metrics must be auditable
- Tiebreakers must be deterministic
- Double counting must be prevented
- Winner finalization must use a frozen final result

### Scope discipline

The MVP should avoid shipping too many challenge types or social mechanics at once. The first goal is to validate the verified challenge loop, not to launch a full social network.

---

## 14. Recommended Implementation Order

When the team returns to this feature, the build should happen in a controlled sequence.

### Step 1: Finalize product rules

Decide:

- which challenge types are in MVP
- how weekly and monthly cycles are created
- what exact leaderboard rules apply
- what rewards are granted
- whether there is a max number of joined concurrent challenges

### Step 2: Design the data model

Create and review the final Supabase schema proposal based on the entities in this document.

Important:

- keep this separate from current implementation work
- validate how it connects to existing event sources
- decide what should be computed live versus cached

### Step 3: Build the progress ingestion layer

Implement the backend logic that translates verified app actions into challenge progress events.

This is the most important technical layer because trust depends on it.

### Step 4: Build read models and leaderboard calculation

Implement:

- participant progress aggregation
- leaderboard queries
- snapshot/finalization flow

### Step 5: Build the minimal UI loop

Implement only the MVP surfaces first:

- Home challenge card
- Challenges list
- Challenge detail
- My progress
- Results

### Step 6: Connect rewards

Integrate with:

- points
- badges
- winner recognition
- ELLIE celebration moments

### Step 7: Roll out carefully

Recommended rollout:

1. internal test challenge
2. limited beta with one weekly challenge type
3. add monthly challenge
4. add more challenge categories
5. evaluate whether Phase 2 social features are justified

---

## 15. Recommended Rollout Strategy

### MVP release strategy

Start small:

- one or two challenge types
- one featured weekly challenge
- one featured monthly challenge
- simple reward structure
- no public social graph yet

### What success should look like

Signals to validate before Phase 2:

- users join challenges at meaningful rates
- joined users come back to check standings
- challenge participants log more verified activity than non-participants
- reward completion feels motivating
- leaderboard fairness is trusted

### What to evaluate after MVP

- which challenge categories create the highest engagement
- whether monthly or weekly cadence performs better
- whether users want public identity and feed visibility
- whether routine sharing is a stronger next step than generic social features

---

## 16. Open Product Decisions for Later

These do not need answers now, but should be revisited before implementation starts.

- Can users join multiple community challenges at the same time?
- Should some challenges have eligibility filters by level, premium tier, or active plan?
- Should there be seasonal campaigns or only rolling weekly/monthly cycles?
- Should rewards be fixed or vary by challenge difficulty?
- Should leaderboard visibility ever be private-to-joined-users only?
- Should failed or withdrawn participation appear in user history?
- Should Community eventually become its own primary tab, or remain distributed across Home/Profile/Progress?

---

## 17. Final Recommendation

The recommended direction is to treat **Athelete Community** as a future **verified challenge system first**, and a broader social layer second.

That means:

- start with weekly and monthly verified challenges
- use real app events only
- connect to existing points, badges, Core 33, hydration, nutrition, PRs, and ELLIE
- prove the minimal community loop before building public profiles and feed mechanics

If implemented this way, Athelete Community can become a strong retention and motivation engine without diluting the product into a generic social feature set.

