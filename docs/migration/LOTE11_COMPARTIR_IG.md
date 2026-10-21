# Lote 11 · Compartir en Instagram (entreno y ruta)

Solo app. Diseño: handoff v2.16 §26 (SHARE_01–11), `Share.dc.html` y `ShareSticker.dc.html` (sin `_capture/`).

Estado al 21-10-2026:
- Hecho en código.
- **Sin compilar y sin probar**.
- Solo `tsc --noEmit` (0 errores). Sin jest, sin eslint y sin tests nuevos.
- Sin commits.
- No se tocan backend, ELLIE, la grabación de Ruta ni MoveKitPlayer.

## Antes del lote

- `META_APP_ID=1747262109839180` añadido a `.env` y `.env.production`, sin tocar las demás variables. Los dos archivos están en `.gitignore`.
- Se lee con `env.metaAppId`. Se declaró en `src/types/env.d.ts` y en el fixture de jest (`__tests__/fixtures/env.ts`).

## Librerías

| Librería | Versión | Para qué |
|---|---|---|
| `react-native-view-shot` | **5.1.0** (la de Expo SDK 56) | Capturar el sticker (PNG 3×) y la imagen combinada (JPG 1080 × 1920). |
| `react-native-share` | **12.3.1** (RN ≥ 0.76) | Historias de Instagram (fondo + sticker aparte, con `appId`) y la hoja de compartir de iOS. |
| `expo-media-library` | **56.0.11** (SDK 56) | Guardar en Fotos con permiso solo de añadir. |
| `jpeg-js` | **0.4.4** (JS puro, sin nativo) | Leer la luminosidad de la foto (8 × 8 px) para elegir el fondo del sticker. |

- **Pods:** `pod install` OK (entran `react-native-view-shot`, `RNShare` y `ExpoMediaLibrary`). Después se dejó React precompilado en **Debug**, como en los lotes anteriores.
- **Info.plist:** nueva clave `LSApplicationQueriesSchemes` con `instagram-stories` e `instagram`. Los permisos de cámara, galería y "añadir a Fotos" ya existían.

## 1 · Pantalla Compartir (26.6)

- **Entrada:** el botón **Compartir** del Resumen de entreno y del Resultado de ruta abre `Share` (`{ kind: 'workout', sessionId }` o `{ kind: 'route', activityId }`).
- **Sustituye a ROUTE_10:** se borraron `RouteShareScreen.tsx` y la ruta `RouteShare`. Cierra B-09.
- **Cabecera:** atrás, "Compartir" y el contexto ("Total Body Dumbbell · 42 min" / "Carrera de tarde · 8,42 km").
- **Vista previa:** 198 × 352, radio 18. Sticker a 0,55, con el centro al 54 % del alto (72 % el Mínimo). Debajo, la nota de que el sticker va aparte.
- **FOTO:** Cámara, Galería o Sin foto, con el selector del sistema que ya usa la app. Sin foto se usa el **fondo de marca**: `#141312`, luz Ember, anillo del isologo cortado y wordmark.
- **STICKER:** Completo / Mínimo y tres muestras de fondo (claro, oscuro, translúcido), con el nombre y el uso de cada una.
- **Fondo automático según la luminosidad de la foto:**
  - foto oscura (≤ 0,32) → Claro;
  - foto clara (≥ 0,60) → Oscuro;
  - tono medio o sin foto → Translúcido.
  - Si la persona cambia el fondo, **se recuerda para ese tipo de foto** (sin foto, oscura, media o clara) y se usa la próxima vez (26.5).
- **Light / Dark:** cambian solo la pantalla (pills, activo y primaria). Vista previa y stickers son iguales en ambos temas.

## 2 · Stickers con datos reales (26.2–26.5, 26.8)

- **Entreno · Completo (300 × 368 con récord, 326 sin récord):**
  - Isologo (anillo + "Λ") y "ATHELETE", con la fecha.
  - "● ENTRENO COMPLETADO" y el nombre de la rutina.
  - **Tiempo real sin pausas.**
  - Trío: kg de volumen, repeticiones (suma de las series) y kcal.
  - **Récord:** el de mayor mejora frente a la marca anterior (una primera marca cuenta como la mayor), con **"+N récords"** si hubo más.
  - Barra de 7 zonas (Pecho … Glúteos) a partir del `bodyPart` del catálogo de cada ejercicio hecho, y la línea con sus nombres.
- **Ruta · Completo (300 × 400):**
  - Eyebrow con el título de la actividad.
  - **Trazado GPS real**, encajado en 256 × 150 y **siempre recortado al inicio y al final** (`trimEnds`, 200 m), sin mapa base: línea Ember de 3,5 pt sobre un halo de 10 pt al 22 %.
  - Distancia "8,42 km".
  - Trío: tiempo, ritmo /km (en ciclismo, km/h) y desnivel. **Sin desnivel, el trío pasa a dos columnas.**
- **Mínimo (232 × 72):** isologo de 44 pt, cifra clave (tiempo "42:08 min" o distancia "8,42 km") y punto Ember con halo.
- **Fondos:** claro, oscuro y translúcido con los valores de 26.5. El translúcido lleva sombra de texto y no lleva desenfoque.
- **Exportación:**
  - Sticker en PNG transparente a **3×** con 24 pt de margen por lado (1044 × 1248 / 1044 × 1122 / 1044 × 1344 / 840 × 360).
  - Imagen combinada **1080 × 1920 JPG al 90 %**: foto en *cover* (o fondo de marca) y sticker centrado, con su centro a 1150 px y 720 px de ancho el Completo o 560 px el Mínimo.

## 3 · Acciones

- **Historias de Instagram:**
  - Prepara el fondo (la foto en 1080 × 1920, o el fondo de marca) y el sticker como imagen aparte.
  - Muestra "Abriendo Instagram" y llama a `shareSingle({ social: InstagramStories, appId: META_APP_ID, backgroundImage, stickerImage })`.
  - **Sin `META_APP_ID` o sin Instagram** (`canOpenURL('instagram-stories://share')`): **SHARE_09** "No encontramos Instagram", con "Guardar imagen", "Compartir de otra forma" (la hoja de iOS) y "Ahora no".
- **Descargar:**
  - Guarda la imagen combinada en Fotos y muestra el toast **SHARE_08** "Guardada en Fotos · 1080 × 1920".
  - Con el permiso denegado, muestra una hoja con "Abrir Ajustes" (el patrón de CAL_04).
- **Más:** la hoja de compartir de iOS con la imagen combinada. Cancelar no muestra error.
- **Comunidad:**
  - Entreno: el composer de siempre (`SocialCompose` con el entreno).
  - Ruta: el mismo `shareToCommunity` del Resultado de ruta, que abre la publicación. Si la ruta es "Solo yo", lo explica.
  - La foto **nunca** se publica ni se guarda en ATHELETE (26.10.6).

## 4 · Textos es / en

Todos los textos de la pantalla, los stickers, los estados y los errores están en es y en, según el idioma del perfil. También la fecha ("7 OCT"), los decimales ("8,42" / "8.42") y los separadores de miles.

## Archivos

**Nuevos:**
- `src/features/share/shareModel.ts`
- `src/features/share/shareExport.ts`
- `src/features/share/useShareData.ts`
- `src/features/share/v2/ShareSticker.tsx` (sticker, isologo y fondo de marca)
- `src/screens/share/ShareScreen.tsx`

**Modificados:**
- `src/screens/workouts/WorkoutSummaryScreen.tsx`, `src/screens/route/RouteResultScreen.tsx` (solo el destino del botón Compartir).
- `src/navigation/RootNavigator.tsx`, `src/constants/routes.ts`, `src/types/navigation.ts`.
- `src/lib/config/env.ts`, `src/types/env.d.ts`, `__tests__/fixtures/env.ts`.
- `ios/Athelete/Info.plist`, `ios/Podfile.lock`, `package.json`, `package-lock.json`.
- `.env`, `.env.production` (solo `META_APP_ID`).

**Borrado:** `src/screens/route/RouteShareScreen.tsx` (ROUTE_10).

## Qué probar en el iPhone

1. **Entreno:** terminar uno → Resumen → Compartir.
   - Contexto y sticker con los datos reales: tiempo, volumen, repeticiones, kcal y zonas.
   - Con récords: el de mayor mejora y "+N récords".
2. **Ruta:** Resultado → Compartir.
   - Trazado real **sin inicio ni final**.
   - En ciclismo, km/h. Sin desnivel, dos columnas.
3. **Fotos:**
   - Una foto oscura propone fondo Claro; una clara, Oscuro; sin foto, Translúcido y el fondo de marca.
   - Cambiar el fondo y repetir con una foto parecida: se recuerda.
4. **Mínimo:** cápsula con tiempo o km; en la vista previa, más abajo (72 %).
5. **Historias** (con Instagram instalado):
   - Abre Instagram con la foto de fondo y el sticker aparte, que se puede mover y escalar.
   - Comprobar la transparencia y la sombra del PNG.
6. **Sin Instagram, o con `META_APP_ID` vacío:** la hoja SHARE_09. Probar Guardar imagen, Compartir de otra forma y Ahora no.
7. **Descargar:**
   - En Fotos aparece la imagen de 1080 × 1920 y el toast de confirmación.
   - Denegar el permiso de Fotos muestra la hoja con Abrir Ajustes.
8. **Más:** la hoja de iOS con la imagen. Cancelar no da error.
9. **Comunidad:** entreno → composer; ruta → publicación (o el aviso si es "Solo yo").
10. **Dark mode:** la pantalla cambia; el sticker y la vista previa, no.
11. **Idioma del perfil en inglés:** textos, fecha y decimales en inglés.

## Pendiente o abierto

- **Jest:** las librerías nativas nuevas (`react-native-share`, `react-native-view-shot`, `expo-media-library`), como la de HealthKit del lote 9, probablemente necesiten mocks para que `App.test.tsx` cargue. Se revisa en la preparación de la Build 3, cuando se ejecute la suite.
- **La imagen combinada** se captura de una vista fuera de pantalla (a la izquierda). Si alguna captura saliera vacía, la alternativa es dibujarla detrás de la pantalla con opacidad mínima.
- **"Compartir de otra forma"** en SHARE_09 es un añadido pedido en el lote: el diseño solo tiene Guardar imagen y Ahora no.
- **Umbrales de luminosidad** (0,32 / 0,60): son míos. Se pueden ajustar tras probar con fotos reales.
