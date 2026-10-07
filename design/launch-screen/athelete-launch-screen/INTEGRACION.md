# ATHELETE · Pantalla de arranque (iOS + Android)

Diseño: fondo liso del tema, isologo centrado y wordmark ATHELETE pequeño y gris abajo.
Claro: tinta `#121212` sobre `#F7F6F3`. Oscuro: hueso `#F2F0EC` sobre `#121110` (fondos = `bg` de `src/theme/v2`).
Wordmark: `#8C8A85` en claro y `#A3A09A` en oscuro.
Si los tokens de `src/theme/v2` difieren de estos hex, manda el tema: regenera con `gen.py` cambiando las constantes del principio.

## Medidas

| Elemento | iOS | Android |
|---|---|---|
| Isologo | 96 × 96 pt, centrado en X e Y | 160 dp dentro del lienzo de 288 dp (`splash_icon`) |
| Wordmark | 112 pt de ancho (≈ 9 pt de alto), centrado en X, 44 pt sobre el borde inferior del área segura | `splash_branding` de 200 × 80 dp |
| Fondo | color `LaunchBackground` (Any/Dark) | `@color/splash_background` (`values` / `values-night`) |

## iOS
1. Copia las tres carpetas de `ios/Images.xcassets/` dentro de `ios/<App>/Images.xcassets/`.
2. `LaunchScreen.storyboard`:
   - Fondo de la vista: color con nombre `LaunchBackground`.
   - `UIImageView` con `LaunchLogo`: 96 × 96, centrado en X e Y respecto a la supervista, `contentMode = scaleAspectFit`.
   - `UIImageView` con `LaunchWordmark`: 112 × 9.15, centrado en X, `bottom = safeArea.bottom - 44`.
   - Sin texto: el wordmark es imagen.
3. Las variantes oscuras van por `appearances` en el asset catalog: no hace falta código.
4. iOS guarda en caché la pantalla de arranque. Para ver cambios, borra la app del simulador y reinstala.

## Android (cuando toque la fase Android)
1. Copia `android/res/*` dentro de `android/app/src/main/res/`.
2. Usa `androidx.core:core-splashscreen`. El tema de arranque:
   ```xml
   <style name="Theme.App.Starting" parent="Theme.SplashScreen">
     <item name="windowSplashScreenBackground">@color/splash_background</item>
     <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
     <item name="postSplashScreenTheme">@style/AppTheme</item>
   </style>
   ```
   Asigna `Theme.App.Starting` a la `MainActivity` en el manifest y llama a `installSplashScreen()` antes de `super.onCreate()`.
3. `windowSplashScreenBrandingImage` (`@drawable/splash_branding`) solo funciona en Android 12+. En versiones anteriores el wordmark no aparece, y es aceptable.

## Transición a la app (JS)
- Overlay en React idéntico: mismo fondo según el modo, isologo de 96 centrado y wordmark en la misma posición. Se mantiene hasta que estén listos la sesión, el tema y la primera pantalla, y luego hace un fundido de unos 250 ms.
- Toque "Alive": mientras espera, el isologo respira muy suave (escala 1 → 1,02, ciclo de unos 2,4 s), igual que `MuscleHotspot`.
- Con "Reducir movimiento" activado: sin respiración y corte directo.

## Archivos
- `svg/`: isologo y wordmark vectoriales (tinta y hueso), redibujados del logo original. Coincidencia con el original: 96 %. Las diferencias son solo el antialiasing del PNG.
- `preview/`: mockups de iPhone y Android en claro y oscuro, y la superposición con el original.
- `gen.py`: regenera todo. Uso: `python3 gen.py isologo.png logo.png out/`
