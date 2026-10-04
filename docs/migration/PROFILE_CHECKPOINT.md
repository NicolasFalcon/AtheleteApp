# PROFILE_CHECKPOINT · Perfil + Ajustes (módulo autónomo, 2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). Sin escrituras de prueba en la base: las escrituras reales solo se validan con tsc; el QA real lo hace el usuario. Sin commits.

## Plan de bloques
- A · Recon (este documento).
- B · Perfil propio (PROFILE_01) + enlace a Logros (AchievementsScreen v2).
- C · Editar perfil (PROFILE_02): personal, objetivo, nivel, días, minutos, foto; guardar con estados.
- D · Ajustes (PROFILE_03): Mi plan, Comunidad, Integraciones, Preferencias (tema, notificaciones, unidades), Apple Health (HEALTH_02/03).
- E · Cuenta: correo, cambiar contraseña, cerrar sesión (confirmación), eliminar cuenta (BT).
- F · Estados: cargando, error con reintento, sin datos de onboarding.
- G · Cierre: dev tools, MIGRATION_PROGRESS, tsc/eslint/jest, resumen.

## A · Recon
Referencias (índice): PROFILE_01_OWN, PROFILE_02_EDIT, PROFILE_03_SETTINGS, HEALTH_02_NOT_CONNECTED, HEALTH_03_CONFIGURED, ACHIEVEMENTS_01/02 (ya hechas en Progreso), SOCIAL_06 (amigo; fuera de alcance). Sin PNG de estado vacío/carga/error del Perfil: se usan los patrones de STATE_0x.

Hojas actuales: `src/screens/tabs/ProfileScreen.tsx` (v1 con tabs Perfil/Plan/Logros/Preferencias/Cuenta, ruta `Profile`), `src/screens/profile/EditProfileScreen.tsx` (v1), `AchievementsScreen` (v2), componentes v1 en `features/profile/components/*`, hooks `useProfileOverview`, `useProfilePreferences` (AsyncStorage), servicios `profile.ts` (`updateProfileDetails` NO cubre `training_level` ni `preferred_session_minutes`: se amplía en la app), `profile-photo.ts` (bucket `profile-photos`, `uploadProfilePhoto`), `lib/profilePhotoPicker.ts`, `AuthProvider` (`signOut`, `refreshProfile`), `auth.ts` (`sendPasswordReset`, `updatePassword`). Eliminar cuenta: no existe ningún flujo en la app ni en docs/backend → BT-30.

Mapeo dato → fuente
| Diseño | Fuente |
|---|---|
| Nombre, objetivo, días/semana | `profile` (AuthProvider) |
| "Atleta desde …" | `profiles.created_at` si está en el perfil; si no, primera sesión; si no, se omite |
| Sesiones | conteo de `workout_sessions` completadas (resumen de Progreso / servicio nuevo) |
| Racha, puntos | `useProfileOverview` (`currentStreak`, `points`) |
| Vitrina (3 + siguiente) | `buildShelves`/badges de `useProfileOverview` + progreso de `useProgressSummary` |
| Tu trayectoria | badges con fecha + récords (`usePersonalRecords`) + primera sesión |
| Mi plan (Objetivo / Entrenamiento / Nutrición / Core 33) | `profile`, plan nutricional y reto de `useProfileOverview` |
| Editar: nombre, fecha, peso, altura, objetivo, días, nivel, minutos | `profiles` vía `updateProfileDetails` (ampliada); mapeos `GOALS`, `LEVELS`, `DURATIONS`, rangos de `onboardingModel` |
| Foto | `uploadProfilePhoto` + `pickProfilePhoto` (bucket actual) |
| Apariencia | `useAppTheme().preferredMode/setPreferredMode` |
| Notificaciones (3 interruptores) | `useProfilePreferences` (AsyncStorage; sin push real todavía) |
| Unidades | no existe en el diseño ni en el backend: se anota (BT) |
| Correo / contraseña / cerrar sesión | `profile.email`, `sendPasswordReset`, `signOut` |
| Comunidad, Apple Health | módulos futuros: filas deshabilitadas con "Próximamente" |

## Hecho
- Bloque A (recon).
- Bloque B: `features/profile/profileModel.ts` (+7 tests, validaciones CHECK de `profiles`, mapeos del onboarding reutilizados), `ProfileRecord.createdAt`, `updateProfileDetails` ampliada (nivel y minutos), `fetchProfileStats` + `useProfileStats`, `useBadgeShelves`, `useProfilePhotoUri`, `features/profile/v2/ProfileViews.tsx`, `screens/tabs/ProfileScreen.tsx` v2 (retrato, trío de cifras, vitrina → Logros, trayectoria, plan 2×2, Ajustes), rutas/tipos `Settings`, `HealthSettings`, fixtures dev.

- Bloque C (código): `components/v2/FormRow` (+`StepperButtons`), `BirthDateSheet`, `EditProfileScreen` v2 (foto, personal, objetivo, nivel, días, minutos; guardar con idle/saving/saved/error).
- Bloque D/E (código): `SettingsScreen` (Mi plan, Comunidad deshabilitada, Integraciones, Preferencias con tema + 3 interruptores, Cuenta con correo, cambiar contraseña por enlace, cerrar sesión y eliminar cuenta con doble confirmación), `HealthSettingsScreen` placeholder; rutas registradas; dev kit `devProfileScreens` + menú + deep link.

- Capturas Light/Dark de Perfil, Editar, Ajustes, Apple Health y estados (cargando, error, sin onboarding, guardado, no válido, error de guardado).
- BT-30 y BT-31, sección 24 de MIGRATION_PROGRESS.

## COMPLETADO
