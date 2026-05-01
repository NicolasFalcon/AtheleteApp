# Feature Baseline

Use `src/features` for product-owned modules instead of pushing business logic into `screens` or `components`.

Recommended feature shape:

```text
src/features/<feature-name>/
  components/
  hooks/
  screens/
  services/
  queries/
  types/
  utils/
  index.ts
```

Suggested first feature modules for Athelete:

- `auth`
- `onboarding`
- `home`
- `workouts`
- `exercise-library`
- `nutrition`
- `hydration`
- `core-33`
- `ellie`
- `progress`
- `pr-tracking`
- `quiz`
- `profile`
- `notifications`

Guidelines:

- Keep navigation contracts in `src/navigation` until a feature owns a dedicated nested navigator.
- Put shared domain clients in `src/services`.
- Put app-wide primitives in `src/components` and `src/components/ui`.
- Let each feature own its API/query logic rather than centralizing product code in one large service file.
