# Lote 12 · Iniciar sesión / crear cuenta con Apple

Solo app (backend cerrado: `docs/backend/AUTH_SHAPES.md`).

Estado al 22-10-2026:
- Hecho en código.
- **Sin compilar y sin probar**.
- Solo `tsc --noEmit` (0 errores). Sin jest, sin eslint y sin tests.
- Sin commits.
- No se toca el backend ni otras funciones de la app.

## Librerías

| Librería | Versión | Para qué |
|---|---|---|
| `expo-apple-authentication` | **56.0.4** (SDK 56) | Hoja de Apple y botón oficial (`AppleAuthenticationButton`). |
| `expo-crypto` | **56.0.5** (SDK 56; no estaba instalada) | Nonce aleatorio y su SHA-256. |

- **Pods:** `pod install` OK (`ExpoAppleAuthentication`, `ExpoCrypto`). Después se dejó React precompilado en **Debug**, como siempre.
- **Versiones Expo:** se comprobó que **todos** los `expo-*` siguen en SDK 56 (lo que falló con `expo-asset`).

## 1 · Nativo

- El entitlement `com.apple.developer.applesignin = ["Default"]` **ya estaba** en `ios/Athelete/Athelete.entitlements`: lo añadiste al activar la capacidad en Xcode.
- Debug y Release usan ese mismo archivo (`CODE_SIGN_ENTITLEMENTS`), así que no hubo que cambiar nada.

## 2 · Botón oficial en Login y Registro

- **`SocialSignIn`** (`src/components/auth/SocialSignIn.tsx`): separador "o continúa con" y el botón oficial de Apple, bajo el botón principal del formulario.
  - Login: "Iniciar sesión con Apple". Registro: "Registrarse con Apple".
  - Estilo **negro en modo claro y blanco en modo oscuro**, como piden las normas de Apple. Mide 56 pt, como el botón principal, con esquinas de píldora.
  - **Solo en iOS** y solo si el dispositivo lo admite (`isAvailableAsync`). En Android no se muestra nada, ni el separador.
- **Preparado para Google:** el componente agrupa los proveedores, y `socialSignIn.ts` tiene el tipo `SocialProvider` y los textos. Google será otra fila con el mismo patrón.

## 3 · Flujo (`src/services/supabase/appleAuth.ts`)

1. **Nonce:** 32 bytes aleatorios en hexadecimal. A Apple se le envía su **SHA-256** y a Supabase el **original**.
2. **Apple:** se piden los scopes `FULL_NAME` y `EMAIL`.
3. **Supabase:** `signInWithIdToken({ provider: 'apple', token: identityToken, nonce })`.
4. **Nombre:** si Apple devuelve `fullName` (solo la primera vez) y `profiles.name` está vacío, se guarda con `update({ name })` sobre el propio perfil. Después se vuelve a leer el perfil, para que onboarding y la app lo vean.
5. **`apple-token-exchange`:** se llama con el `authorizationCode` justo después del login, **en segundo plano**. No bloquea ni muestra nada; si falla, solo deja un log en `__DEV__`.

## 4 · Enrutado después del login

- **Sin cambios:** la sesión nueva pasa por el mismo `onAuthStateChange` → `hydrateProfile` que el correo.
  - Usuario nuevo o con onboarding incompleto → **onboarding** normal.
  - Usuario existente → **app**.
- El registro push, la zona horaria, los recordatorios, Apple Health y las guías dependen de la sesión y del perfil, así que funcionan igual.

## 5 · Errores (es / en, según el idioma del dispositivo)

- **Cancelar** la hoja de Apple (`ERR_REQUEST_CANCELED`): no se muestra nada.
- **Resto**, con un texto bajo el botón:
  - no disponible en el dispositivo;
  - sin conexión;
  - Apple no configurado en el servidor ("usa tu correo");
  - genérico ("No pudimos iniciar sesión con Apple. Inténtalo otra vez.").
- Antes de iniciar sesión no hay perfil, por eso el idioma sale del dispositivo.

## 6 · Eliminar cuenta

No cambia en la app. `delete-account` revoca el token de Apple en el servidor (AUTH_SHAPES).

## Archivos

**Nuevos:**
- `src/features/auth/socialSignIn.ts` (nombre, cancelación y textos)
- `src/services/supabase/appleAuth.ts`
- `src/components/auth/SocialSignIn.tsx`

**Modificados:**
- `src/providers/AuthProvider.tsx` (`signInWithApple` en el contexto)
- `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/RegisterScreen.tsx`
- `package.json`, `package-lock.json`, `ios/Podfile.lock`

**Sin cambios:** `ios/Athelete/Athelete.entitlements` (ya tenía el entitlement).

## Qué probar en el iPhone

1. **Cuenta nueva con Apple** (compartiendo el correo):
   - Login → "Iniciar sesión con Apple" → Face ID → entra al onboarding.
   - El nombre de Apple aparece en el perfil y en el saludo.
   - En Supabase: el usuario tiene la identidad `apple`, `profiles.name` relleno y una fila en `apple_tokens`.
2. **Con "Ocultar mi correo":** se crea una cuenta **distinta** (correo `@privaterelay.appleid.com`) y pasa por onboarding. No se vincula con una cuenta de correo existente.
3. **Cancelar** la hoja de Apple: vuelve a Login **sin ningún mensaje**.
4. **Volver a entrar:** cerrar sesión y entrar otra vez con Apple.
   - Entra directo a la app, porque el onboarding ya está hecho.
   - El nombre no se pisa: Apple ya no lo envía.
5. **Mismo correo que una cuenta existente** (sin ocultarlo): entra en **esa** cuenta, por la vinculación por correo verificado.
6. **Registro:** el botón dice "Registrarse con Apple" y hace el mismo flujo.
7. **Dark mode:** botón blanco. **Light mode:** botón negro.
8. **Eliminar cuenta**, con una cuenta desechable de Apple: Ajustes → Eliminar cuenta.
   - Se borra y vuelve a Login.
   - En iPhone › Ajustes › Apple ID › Iniciar sesión con Apple, la app ya no aparece (revocada por el backend).
   - Volver a entrar con Apple crea una cuenta nueva y Apple vuelve a pedir el nombre.
9. **Sin conexión:** el texto de error bajo el botón.

## Pendiente o abierto

- **Jest:** `expo-apple-authentication` y `expo-crypto`, como las librerías de los lotes 7, 9 y 11, probablemente necesiten mocks para `App.test.tsx`. Se revisa al preparar la Build 3.
- **Simulador:** iniciar sesión con Apple necesita un Apple ID con sesión iniciada en el simulador. Es más fiable probarlo en el iPhone.
