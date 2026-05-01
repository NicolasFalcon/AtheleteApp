# Athelete — React Native Component Map

> Purpose: inventory of reusable UI patterns that should become proper RN primitives/components in the new repository.

---

## 1. Shell and Navigation Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| `MobileBottomNav` | Main 5-tab shell | active route, tab metadata | active/inactive, special ELLIE center treatment | protected tabs | P0 |
| `Header` | Personalized Home header | user name, initials, nudge count, notification handler | normal, badge count hidden/visible | Home | P0 |
| Sticky back header | Compact detail-screen header | title, subtitle, back handler, optional right actions | normal, blurred background, with count/status | detail screens, notifications, PRs, nutrition | P0 |
| Segmented control | Switch between content modes | active key, labels, change handler | 2-tab and 3-tab forms | Workouts, Progress, ELLIE | P0 |
| Safe-area content shell | Reliable top/bottom spacing | children, tab-bar padding, scroll container | top safe area, bottom CTA offset | nearly every screen | P0 |

## 2. Input and Filtering Patterns

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Search input with icon | Catalog search | value, change handler, placeholder | idle, focused, populated | Workouts, Exercise Library | P0 |
| `Chip` / filter pill | Filter and tag presentation | label, selected state, optional icon | selected, outline, disabled | Workouts, Exercise Library, detail tags | P0 |
| Horizontal filter rail | Compact multi-filter browsing | filter collection, active key | scrollable, selected, favorites-only mode | Workouts, Exercise Library | P1 |
| Number picker buttons | Fast selection of training days etc. | value, selection callback | selected, unselected | onboarding | P1 |
| Auth field row | Label + field + validation copy | label, value, error, secure toggle | valid, invalid, loading | auth screens | P0 |

## 3. Card System

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Elevated card surface | Default app module surface | children, padding variant | normal, loading skeleton, highlighted | across app | P0 |
| Hero media card | Large media-first detail header | image, overlay, title, actions | favorite/edit/delete variations | workout detail, exercise detail | P1 |
| Stat tile | Small metric summary block | label, value, icon/unit | normal | profile stats, Core 33 summary, macros | P1 |
| Summary highlight card | prominent KPI card | headline value, subtitle, accent style | active/completed/best states | PR best, nutrition calories, points | P1 |
| Empty-state card | graceful no-content handling | icon, title, description, optional CTA | empty only | favorites, notifications, lists | P0 |

## 4. Home-Specific Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| `ChallengeBanner` | challenge promotion / shortcut | challenge state, CTA | inactive, active | Home | P1 |
| `TodayWorkoutCard` | current workout state summary | session status, progress, CTA handlers | idle, in progress, resumable, completed | Home | P0 |
| `NutritionCard` | nutrition snapshot | active plan, today log, CTA handlers | no plan, active plan, logged/unlogged | Home | P1 |
| `HydrationCard` | hydration quick logging | today ml, goal, add handlers | no goal, tracking, goal reached | Home | P0 |
| `EllieCard` | AI hero entry | top insight, CTA handlers | standard, secondary generation CTA | Home | P0 |
| `QuizCard` | quiz promotion | start handler | normal | Home | P2 |
| `RecentPRCard` | latest PR shortcut | recent record summary, CTA handlers | no PR, has PR | Home | P2 |
| `FavoriteWorkouts` rail | saved workout shortcuts | favorite items, select/view-all handler | hidden when empty | Home | P1 |
| `FavoriteExercises` rail | saved exercise shortcuts | favorite items, select/view-all handler | hidden when empty | Home | P1 |
| `WorkoutCarousel` | recommended workouts horizontal rail | workout cards and select handler | scrollable rail | Home | P2 |

## 5. Workout Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Workout list item | standard vertical workout cell | workout summary, favorite state, press handlers | normal, favorite | Workouts list | P0 |
| Featured workout card | editorial/media-first workout card | workout summary, favorite, press handler | featured only | Workouts tab rail | P1 |
| Workout metadata chip row | duration/calories/count row | duration, calories, exercises | normal | workout detail, favorites | P1 |
| Exercise row in workout detail | exercise preview within workout | number, title, sets/reps, note, linked state | linked, unlinked | workout detail | P0 |
| Session checklist row | active exercise completion row | completed state, exercise summary, toggle handler | in progress, completed | workout player | P0 |
| Sticky session CTA bar | finish-session action | completed count, disabled state, finish handler | disabled/enabled | workout player | P0 |

## 6. Exercise Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Exercise catalog card | search/browse item | name, body part, equipment, favorite, image | favorite/non-favorite | Exercise Library, favorites | P0 |
| Filter group card | grouped filter chips with title/icon | title, icon, filters, active key | all selected or specific selected | Exercise Library | P1 |
| Detail section card | titled instructional section | title, body content | list, bullets, summary | Exercise detail | P1 |
| PR summary card | compact exercise PR overview | records, register handler, history handler | empty or populated | Exercise detail, progress | P1 |
| Video modal | exercise technique playback | video URL, orientation, close handler | visible/hidden | Exercise detail | P2 |

## 7. Challenge Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Core 33 step indicator | shows onboarding/challenge step state | current step index | step active/completed | challenge setup | P1 |
| Core 33 habit selector card | pillar-specific habit picker | pillar metadata, presets, custom input, selected value | empty, preset selected, custom input | challenge setup | P1 |
| Core 33 timeline strip | 33-day horizontal progress strip | current day, statuses | empty, partial, full, current day | tracker | P1 |
| Core 33 habit toggle card | today’s habit completion cell | habit name, category, done state, toggle handler | done/undone | tracker | P1 |
| Circular progress | compact percentage display | value, size, colors | normal | challenge, Home, progress | P0 |

## 8. ELLIE Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Insight briefing card | summary of top AI guidance | top insight, supporting insights, action count | populated | ELLIE insights | P1 |
| Prompt chip rail | one-tap prompt prefill | prompt text, handler | horizontal rail | ELLIE insights | P1 |
| Nudge card | proactive reminder or celebration | icon, tone, text, optional action | actionable vs informational | Home, notifications, ELLIE | P0 |
| Recommendation card | richer AI suggestion card | icon, title, description, prompt | normal | ELLIE insights | P1 |
| Weekly summary card | week-level summary + CTA | workouts, adherence, challenge, points, suggestion | normal | ELLIE insights | P1 |
| Chat bubble | conversational message unit | role, content, markdown, status | user, assistant, streaming | ELLIE chat | P0 |
| Generated workout preview | accept/discard/save generated workout | workout payload, handlers, saved/discarded state | preview, saved, discarded | ELLIE chat | P0 |
| Generated nutrition preview | accept/discard/save plan | nutrition payload, handlers, saved/discarded state | preview, saved, discarded | ELLIE chat | P0 |
| Chat composer | input + send + loading | text, submit, disabled, loading | idle, loading, prefilled | ELLIE chat | P0 |

## 9. Progress, PR, and Quiz Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| Chart card | metrics visualization container | dataset, labels, time range | empty/minimal/full | Progress, PR history | P1 |
| `PersonalRecordsCard` | multi-exercise PR summary | records, exercises, select handler | empty/populated | Progress | P1 |
| PR history row | single PR entry in timeline list | formatted value, date, notes, delete | normal | PR history | P1 |
| Quiz category card | entry into quiz topic | icon, description, counts, best score | loading or populated | quiz landing | P1 |
| Quiz answer card | answer selection unit | label, text, selected/correct/incorrect | unanswered, selected, correct, incorrect | quiz question screen | P1 |
| Result score card | quiz completion summary | score, points, perfect flag | good/perfect/low score | quiz result | P1 |

## 10. Profile and Settings Components

| Component / Pattern | Purpose | Key data / props | Typical states | Used in | Migration priority |
|---|---|---|---|---|---|
| `PointsHeader` | points highlight surface | current points and progress tone | normal | Profile | P1 |
| `AchievementsSection` | badge grid/list | earned badges, all badges | partial, full, empty | Profile | P1 |
| Quick action row | settings-style list item | icon, title, subtitle, handler | normal | Profile | P1 |
| Setup item | small profile configuration summary | icon, label, value | normal | Profile current plan card | P2 |
| Toggle row | settings toggle | label, state, handler | on/off | Profile notifications/theme | P2 |

## 11. Overlay Patterns

| Pattern | Purpose | Used in | Migration notes |
|---|---|---|---|
| Alert dialog | confirm destructive or irreversible action | delete workout, deactivate plan | use native-feeling modal or custom alert component |
| Bottom sheet | compact logging or form flow | hydration logging, PR register | high-value RN primitive |
| Full dialog | small selection/confirmation flows | add/replace routine, wear preview | can become modal card or sheet depending on platform |
| Media modal | focused media playback | exercise video | preserve dedicated close affordance and orientation handling |

## 12. Priority Summary

- P0:
  - shell, tabs, headers, segmented control, search/filter basics
  - Today workout card
  - hydration card
  - workout list item
  - workout session row and CTA
  - exercise card
  - ELLIE chat bubble/composer/generated preview
- P1:
  - challenge system UI
  - progress chart cards
  - quiz cards
  - profile achievement blocks
  - featured routine cards
- P2:
  - wear placeholder
  - nuanced dialog variants
  - lower-priority promo surfaces
