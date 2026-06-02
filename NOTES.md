# Notes del projecte

## LLIÇÓ APRESA (sessió del 11-13 maig 2026)

El bug del scroll al BuyMe que vam perseguir durant 2 dies tenia causa arrel al commit `9d187d9` ("Lock #screen-supermarket to viewport: one scroll, fixed header") que va introduir una regressió d'arquitectura.

### Patró ERRONI (no usar)

- Lock del screen amb `height:100%` + `overflow:hidden`
- Slider amb `flex:1` (altura derivada)
- Inner `overflow:auto` a la llista d'items

→ Trenca scroll a iOS dins de cube Swiper a totes les cares excepte la primera.

### Patró CORRECTE (usar)

- NO bloquejar el screen
- Slider amb height fixa (`70vh`, com EatMe zones/nivells)
- Inner `overflow:auto` a la llista d'items
- Body scrolleja naturalment si la cromia + slider excedeixen viewport

### Avís per al futur

Si en el futur algú vol "cromia fixa + slider que ocupa la resta": **NO ho fer amb `height:100%`+`overflow:hidden` al screen**. Buscar una altra solució (`position:sticky` a la cromia? Una capa de scroll container intermedi?). Però documentar bé i **validar al mòbil iOS real abans de pushar**.

---

## Productes resolts a la sessió 11-13 maig

1. **Catàleg v2** — ampliació catàleg productes + categoria "Arròs i pasta" (`75963fa`)
2. **`findExistingAtHome`** — igualtat normalitzada, sense substring bidireccional (`b5e41e5`)
3. **Reorder categories** — fletxes ▲▼ a la gestió de categories (`b775705`)
4. **Scroll fix definitiu BuyMe** — revert del lock de `#screen-supermarket` (`a6efc20`)

---

## DECISIÓ DESCARTADA (15 maig 2026) — Migració v4 per a pop-learned-*

**Proposta:** migració one-shot per enriquir productes `pop-learned-*` al cache amb dades del catàleg `POPULAR_PRODUCTS` (price, weight, days, emoji, noExpiry, location) quan hi hagués match per nom canònic.

**Cancel·lada.** Motiu: diagnòstic empíric al cache de l'usuari principal retorna **0 productes learned** existents. No hi ha res per enriquir.

A més, la lògica automàtica d'enriquiment a `getPopularProducts()` (populars.js:39-69) ja gestiona aquests casos quan apareguin (enriqueix `price`, `weight`, `location` cada vegada que es crida la funció, comparant per nom canònic). No té sentit afegir una migració one-shot per a un problema que la lògica running ja resol o que mai s'ha manifestat al cache real.

**Si en el futur** un usuari té molts learned al cache i la normalització estricta de `getPopularProducts()` (només `toLowerCase()`, sense trim/collapse-spaces) no captura matches reals → llavors potser val la pena reintroduir v4. Però **no per defensiva** — només quan el diagnòstic mostri learned-sense-enriquir realment.

---

## LLIÇÓ APRESA (sessió 14 maig 2026) — NO eliminar el toggle Cronològic/Per categoria

El toggle `#buyme-view-toggle` (Cronològic / Per categoria) al `#screen-supermarket` **es queda visible per decisió de l'usuari**. La utilitat per l'usuari ha sigut confirmada i, més important: **eliminar-lo trenca l'scroll a iOS de manera consistent** en condicions diverses.

### 5 intents documentats, tots reverteits

| # | Data | Commit | Estratègia | Resultat |
|---|---|---|---|---|
| 1 | 11 maig | `74ac57a` | Eliminar el mode cronològic, sempre per categoria | Trenca scroll → revert `487ffc1` |
| 2 | 12 maig | `ed4726d` | Re-intent: eliminar el toggle complet | Trenca scroll → revert `c97cecd` |
| 3 | 12 maig | `c4418c6` | Ocultar via `display:none` (no eliminar) | Trenca scroll → revert `92d9421` |
| 4 | 12 maig | `3d146b2` | Ocultar via `visibility:hidden` per preservar layout | Trenca scroll → revert `0b12ec2` |
| 5 | 14 maig | (no commitejat) | Eliminació completa **amb el lock del screen JA revertit** | Trenca scroll → `git checkout -- .` abans del commit |

### Hipòtesi que el lock del screen era la causa única — DESCARTADA

El lock `#screen-supermarket` a viewport (`9d187d9`) **sí era** la causa de l'altre bug del scroll i el seu revert (`a6efc20`) el va resoldre. Però el cinquè intent del 14 maig **es va fer amb el lock ja revertit i el toggle seguia trencant-ho**. Per tant existeix un **acoblament implícit addicional** entre la presència del toggle (o el seu bloc CSS, o el seu layout) i la capacitat d'iOS Safari de retenir el touch hit-test del `.shopping-items-list` a les cares no-inicials del cube Swiper.

Causa exacta **no identificada**. Hipotètiques no validades:
- Algun selector CSS que requereix l'existència del `.view-mode-btn` per ordre/cascada
- Algun listener implícit (focus, blur, click delegation) que es perdria sense el wrapper
- Una interacció subtil entre l'altura de la cromia superior i el càlcul de la cube geometry de Swiper

### Política a partir d'avui

**No tornar a intentar eliminar el toggle sense una hipòtesi nova i sòlida** sobre l'acoblament implícit. "Provem una altra vegada amb un altre enfocament" **NO és una hipòtesi nova**. Necessitem una de les següents:
- Remote inspect a iOS Safari amb diagnòstic frame-by-frame del touch event handling abans/després de l'eliminació
- Identificació d'una API de Swiper o iOS que justifiqui el comportament
- Identificació concreta del selector CSS o handler JS implicat

**Si l'usuari demana en el futur "simplificar la UI del BuyMe", "treure controls", "deixar només una vista", etc.**, respondre directament que el toggle és intocable, citar aquest bloc i oferir alternatives que el preservin (relocate, restyle, default-on-first-open mantenint el toggle, etc.).
