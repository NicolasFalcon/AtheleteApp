# ROUTE_RPC_SHAPES · Ruta y generación ORS

Implementación real del backend. La app móvil consume este contrato; este repositorio no implementa pantallas de Ruta.

## `generate-route` (Edge Function)

Requiere `Authorization: Bearer <user JWT>`. El trazado lo calcula OpenRouteService (ORS); no interviene un modelo de IA. La función genera y puntúa alternativas de forma determinista.

### Entrada

```json
{
  "sport": "running",
  "origin": { "lat": -33.4489, "lon": -70.6693 },
  "target_km": 5,
  "kind": "loop",
  "elevation": "low",
  "surface": "asphalt",
  "seed": 12
}
```

Valores canónicos, compatibles con la app existente:

- `sport`: `running | cycling`.
- `kind`: `loop | out_and_back | point_to_point`. ORS implementa `loop` y `out_and_back`; `point_to_point` conserva el error `unsupported_kind`.
- `elevation`: `low | balanced | high | any`. `any` conserva el significado anterior: sin preferencia de desnivel.
- `surface`: `any | asphalt | trail`.
- `seed`: entero `0..1000000`. Otra `seed` produce otro grupo de alternativas.

Aliases aditivos aceptados: `circuito`; `ida_y_vuelta`, `ida-y-vuelta` o `ida y vuelta`; `poco`, `medio`, `alto`; `asfalto`; `tierra`, `sendero` o `tierra/sendero`. La respuesta siempre usa los valores canónicos.

Distancias válidas: running `1..50 km`; cycling `5..100 km`.

### Perfiles y request a ORS

| Deporte / superficie | Perfil ORS |
|---|---|
| running + `any` o `asphalt` | `foot-walking` |
| running + `trail` | `foot-hiking` |
| cycling + `any` | `cycling-regular` |
| cycling + `asphalt` | `cycling-road` |
| cycling + `trail` | `cycling-mountain` |

Todas las llamadas usan `preference: recommended`, `elevation: true` y:

```json
"extra_info": ["waytype", "waycategory", "surface", "steepness"]
```

- A pie: `options.profile_params.weightings.quiet.factor = 1.0` y `green.factor = 0.9`; evita `ferries` y `fords`.
- En bicicleta: evita `ferries`, `fords` y `steps`. ORS solo admite `quiet` y `green` en perfiles `foot-*`; para bicicleta se usa el perfil especializado, `recommended`, el filtro de vías principales al puntuar y `steepness_difficulty` `0 | 1 | 3` para `low | balanced | high`.
- Circuito: tres `round_trip` con semillas y cantidades de puntos distintas.
- Ida y vuelta: tres puntos intermedios con rumbo y radio distintos; las coordenadas enviadas son origen → punto intermedio → origen.

### Candidatos y puntuación

Se solicitan hasta tres candidatos. Se eliminan trazados idénticos y se ordenan por `score` descendente:

- 40 puntos: distancia; todo resultado dentro de ±10 % del objetivo recibe el máximo.
- 20 puntos: `pct_quiet`, calculado con `waytype` de calle residencial, sendero, pista, ciclovía o vía peatonal.
- 10 puntos: penalización por `waytype` principal/primario y el bit `Highway` de `waycategory`.
- 20 puntos: porcentaje compatible con la superficie pedida.
- 10 puntos: desnivel positivo por kilómetro frente a `low`, `balanced` o `high`.

`pct_surface` agrupa asfalto/pavimento/concreto/metal/adoquín para `asphalt`, y superficies no pavimentadas, madera, grava, tierra, arena o hierba para `trail`. Con `surface: any`, vale `100`.

El texto `summary` se arma en el servidor con estas métricas; no usa IA.

### Respuesta y compatibilidad

`routes[0]` conserva exactamente el contrato anterior y contiene la opción mejor puntuada. `options` es aditivo y contiene hasta tres alternativas completas:

```json
{
  "routes": [
    {
      "polyline": [[-33.4489, -70.6693], [-33.4418, -70.6559], [-33.4489, -70.6693]],
      "distance_m": 5078,
      "elevation_gain_m": 42,
      "surface": "asphalt",
      "kind": "loop"
    }
  ],
  "options": [
    {
      "polyline": [[-33.4489, -70.6693], [-33.4418, -70.6559], [-33.4489, -70.6693]],
      "distance_m": 5078,
      "elevation_gain_m": 42,
      "surface": "asphalt",
      "kind": "loop",
      "pct_quiet": 84.6,
      "pct_surface": 91.2,
      "score": 90.1,
      "summary": "85 % por calles tranquilas, 91 % en asfalto y casi plano."
    },
    {
      "polyline": [[-33.4489, -70.6693], [-33.4561, -70.6532], [-33.4489, -70.6693]],
      "distance_m": 5336,
      "elevation_gain_m": 68,
      "surface": "asphalt",
      "kind": "loop",
      "pct_quiet": 78.3,
      "pct_surface": 88.4,
      "score": 85.3,
      "summary": "78 % por calles tranquilas, 88 % en asfalto y con desnivel moderado."
    },
    {
      "polyline": [[-33.4489, -70.6693], [-33.4357, -70.6749], [-33.4489, -70.6693]],
      "distance_m": 4744,
      "elevation_gain_m": 91,
      "surface": "mixed",
      "kind": "loop",
      "pct_quiet": 73.1,
      "pct_surface": 64.8,
      "score": 76.1,
      "summary": "73 % por calles tranquilas, 65 % en asfalto y con desnivel moderado."
    }
  ]
}
```

El ejemplo muestra la forma real completa; las polilíneas se reducen a tres puntos para que el documento sea legible. En producción contienen todos los puntos devueltos por ORS, redondeados a cinco decimales.

Errores compatibles: `invalid_params`, `unsupported_kind`, `no_route_found`, `rate_limited`, `provider_unavailable`, `unauthorized`.

### Cuota y caché

- Límite de producto: `ROUTE_GEN_USER_DAILY_LIMIT`, 20 generaciones por usuario/día por defecto.
- Límite ORS: `ORS_DAILY_QUOTA`, 2000 llamadas/día por defecto, con corte preventivo al 90 % en `route_gen_reserve`.
- Cada candidato no cacheado reserva y consume una llamada ORS. Una generación normal consume tres.
- Cada candidato, incluido un resultado sin ruta, se cachea 24 h en `route_generation_cache`. La clave incluye origen redondeado a tres decimales, parámetros, `seed`, versión del algoritmo y número de variante.
- Si no se pueden reservar todas las llamadas antes del corte, la función intenta reservar una y devuelve una sola opción. Si tampoco cabe una, responde `provider_unavailable`.

Secrets/variables: `ORS_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ROUTE_GEN_USER_DAILY_LIMIT`, `ORS_DAILY_QUOTA`.

## Guardado

`generate-route` no guarda una ruta del usuario. La app sigue usando `save_planned_route(_payload jsonb)` para insertar la opción elegida en `planned_routes`.

## SQL

Esta mejora no cambia tablas ni firmas RPC. Usa `route_gen_reserve` y `route_generation_cache` existentes, por lo que no requiere ejecutar SQL.

## Explorar rutas cerca · Implementación real

La Fase 2 añade `explore-routes`, una Edge Function autenticada que mezcla dos fuentes. OpenStreetMap/Overpass aporta rutas conocidas; `get_popular_routes` aporta clusters anónimos de rutas públicas de la comunidad. No se usa IA para crear ni modificar trazados.

### Entrada de `explore-routes`

```json
{
  "lat": -33.4489,
  "lon": -70.6693,
  "sport": "cycling",
  "radius_km": 10,
  "min_km": 5,
  "max_km": 40
}
```

- `sport`: `running | cycling`.
- `radius_km`: por defecto `10`, mayor que cero y máximo `25`.
- `min_km` y `max_km`: opcionales, entre `1` y `150` y `min_km <= max_km`.
- Requiere `Authorization: Bearer <user JWT>`.

### Fuente OSM

La consulta Overpass usa `POST`, timeout de servidor de 18 s, aborto cliente a los 20 s y un `User-Agent` propio. Se buscan relaciones con nombre:

- ciclismo: `route=bicycle|mtb`;
- running: `route=running|foot|hiking`;
- ambos: `leisure=track` con nombre;
- además, vías nombradas ciclables o peatonales (`cycleway`, `path`, `footway`, `pedestrian`, `track` y `promenade`).

Los `way` de una relación se orientan y unen por sus extremos. Si todos los segmentos no forman una sola línea con una tolerancia máxima de 50 m, la relación se descarta. También se descartan rutas menores a 1 km o mayores a 150 km, salvo los `way` con `leisure=track`: las pistas se incluyen con su longitud real, aunque sea menor de 1 km, y badge `Pista` porque se recorren por vueltas. Un `min_km` explícito sí sigue filtrando todos los resultados, incluidas las pistas. La geometría se simplifica a un máximo de 500 puntos y conserva el formato `[[lat,lon], ...]`.

La caché `explore_cache` guarda candidatos canónicos por geohash de precisión 5 (aproximadamente 5 km) y deporte durante siete días. Para que una misma celda no dependa del primer radio consultado, el miss consulta 25 km desde el centro de la celda; después cada request vuelve a filtrar por distancia del trazado al usuario, rango de kilómetros y orienta el inicio más cercano. Una respuesta vencida se conserva como fallback.

`explore_route_usage` y `explore_route_reserve` limitan a 30 requests por usuario y día UTC por defecto. Un `429`, timeout o fallo de Overpass usa caché vencida si existe; si no, la respuesta sigue incluyendo comunidad y añade `code: "provider_unavailable"`. La atribución siempre es `© OpenStreetMap contributors`.

Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPLORE_ROUTE_USER_DAILY_LIMIT` (opcional, default `30`), `OVERPASS_URL` (opcional) y `OVERPASS_USER_AGENT` (opcional). Overpass público no requiere API key.

### Fuente comunidad: `get_popular_routes`

Firma SQL:

```sql
get_popular_routes(
  p_lat float8,
  p_lon float8,
  p_sport text,
  p_radius_km float8 default 10,
  p_min_km float8 default null,
  p_max_km float8 default null
) returns jsonb
```

El RPC solo considera posts de ruta `public` de los últimos 90 días, autores con `profiles.is_private=false`, contenido visible por `can_view_post` y usuarios no bloqueados. El track completo se usa únicamente dentro del RPC para comprobar el radio y agrupar; nunca se devuelve.

Dos actividades pertenecen al mismo componente si sus inicios están a menos de 300 m, la distancia difiere como máximo 10 % y el solapamiento bidireccional del trazado es al menos 60 % con una tolerancia de 100 m. Solo se publican componentes con al menos dos usuarios distintos. La ruta representativa se devuelve con `route_shared_track(track,true)`: 200 m recortados al comienzo y al final y geometría simplificada. El `cluster:` público es un hash opaco; no se incluyen id de actividad, nombre, post ni perfil de ningún atleta.

### Respuesta unificada

Forma real del contrato; las polilíneas del ejemplo están abreviadas solamente para legibilidad:

```json
{
  "ok": true,
  "routes": [
    {
      "id": "community:64b83a2df8a137585d84a9d9ed6f0b42",
      "source_ref": "cluster:64b83a2df8a137585d84a9d9ed6f0b42",
      "source": "community",
      "badge": "Popular",
      "name": "Ruta popular en bicicleta",
      "type": "community_cluster",
      "sport": "cycling",
      "polyline": [[-33.44981, -70.66612], [-33.43872, -70.65091]],
      "points": [[-33.44981, -70.66612], [-33.43872, -70.65091]],
      "distance_m": 10142.5,
      "elevation_gain_m": 84,
      "athletes_count": 4,
      "popularity": 4,
      "surface": "asphalt",
      "kind": "loop",
      "start": { "lat": -33.44981, "lon": -70.66612 },
      "distance_to_start_m": 412.8,
      "origin": "explore",
      "explore_source": "community",
      "explore_ref": "cluster:64b83a2df8a137585d84a9d9ed6f0b42"
    },
    {
      "id": "osm:relation/1234567",
      "source_ref": "relation/1234567",
      "source": "osm",
      "badge": "Ciclovía",
      "name": "Ciclovía Mapocho 42K",
      "type": "bicycle",
      "sport": "cycling",
      "polyline": [[-33.44512, -70.67102], [-33.43191, -70.64103]],
      "points": [[-33.44512, -70.67102], [-33.43191, -70.64103]],
      "distance_m": 18826.4,
      "elevation_gain_m": null,
      "athletes_count": 0,
      "popularity": 0,
      "surface": "asphalt",
      "surface_tag": "asphalt",
      "kind": "point_to_point",
      "start": { "lat": -33.44512, "lon": -70.67102 },
      "distance_to_start_m": 589.3,
      "origin": "explore",
      "explore_source": "osm",
      "explore_ref": "relation/1234567"
    }
  ],
  "attribution": "© OpenStreetMap contributors"
}
```

El orden es `distance_to_start_m` ascendente y, en empate, `popularity` descendente. `badge` es `Popular`, `Ciclovía`, `Ruta conocida` o `Pista`. `points`, `origin`, `explore_source` y `explore_ref` permiten pasar una opción directamente a `save_planned_route`; `polyline` es el alias de presentación.

### Guardar sin duplicar

`save_planned_route(_payload jsonb)` mantiene todos los campos anteriores. Aditivamente acepta:

```json
{
  "name": "Ciclovía Mapocho 42K",
  "sport": "cycling",
  "points": [[-33.44512, -70.67102], [-33.43191, -70.64103]],
  "distance_m": 18826.4,
  "kind": "point_to_point",
  "surface": "asphalt",
  "origin": "explore",
  "explore_source": "osm",
  "explore_ref": "relation/1234567"
}
```

También acepta los aliases `source` y `source_ref`. La restricción única parcial sobre `(user_id, explore_source, explore_ref)` evita duplicados. El primer guardado responde `created: true`; repetirlo responde el mismo `id` con `created: false`. `get_my_planned_routes` añade `explore_source` y `explore_ref` sin retirar campos previos.

Para `community`, el validador permite hasta 500 m de diferencia entre la distancia registrada y la calculada sobre `points`: son los 200 m retirados en cada extremo más redondeo. La ruta planeada guarda únicamente los puntos públicos recortados y su distancia geométrica; nunca reconstruye ni copia el tramo privado.

### SQL y despliegue

Para esta fase sí hay SQL: ejecutar `drizzle/migrations/0043_route_explore.sql` completo en el SQL editor. Es idempotente y crea caché/cuota, helpers geométricos, `get_popular_routes`, las columnas de referencia y las versiones compatibles de los RPC de rutas planeadas.

Después desplegar `explore-routes` y volver a desplegar `delete-account`, que ahora limpia la cuota de explorar antes de borrar Auth. No hace falta desplegar `generate-route` para esta fase.
