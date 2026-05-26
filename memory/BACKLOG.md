# Backlog del projecte Buyte

Aquest fitxer és la **font de veritat del backlog viu** del projecte. Conté ítems detectats però NO completats, agrupats per sessió de detecció.

## Quan consultar-lo
- Al començar una sessió nova, llegir per veure què queda pendent
- Després de detectar un bug nou que NO es resol immediatament, afegir-lo aquí
- Quan es completi un ítem, marcar-lo amb ✅ + commit hash (no esborrar de seguida — preserva el rastre)

## Convenció
- **Avui** = ítems detectats a la sessió en curs però no completats
- **Anteriors** = ítems detectats en sessions anteriors, encara pendents
- **Sessions completades importants** = pointers ràpids al git log per a context històric

> Vivia abans a `~/.claude/projects/.../memory/backlog-current.md` (fora del repo). Migrat aquí el 2026-05-26 per persistència i visibilitat des de qualsevol PC.

---

## Sessió 26/05/26 — Commits

Polish formularis (PAS 3 popular-edit) + bug fixes derivats + migracions UX (confirm/prompt):

| Hash | Una línia |
|---|---|
| `5be8f40` | PAS 3 — layout horitzontal a `#screen-popular-edit` |
| `70978ff` | Refinament PAS 3 — labels centrats horitzontalment |
| `ade029f` | Fix alineació vertical d'inputs als form-row 50/50 quan labels fan wrap |
| `7fd7712` | Fix inputs type=number rebien estil natiu del navegador |
| `47ee2bc` | Fix alinear chip 'No caduca' amb la caixa de l'input dies |
| `f9c11af` | Fix igualar alçada del chip 'No caduca' a la de l'input dies (intent 1) |
| `4a2f387` | Fix alinear chip 'No caduca' amb input dies per baseline del text (intent 2, definitiu) |
| `a0171f3` | Fix placeholder dd/mm/aaaa dels inputs date en color gris (via `:placeholder-shown`) |
| `2f68eec` | Fix placeholder dd/mm/aaaa via JS toggle class `.is-empty` (Opció C, iOS Safari no suporta `:placeholder-shown` amb type=date) |
| `fe9dfaf` | Fix cercador de populars insensible a accents i majúscules |
| `b300f78` | Fix normalitzar accents i majúscules a tots els cercadors user-facing |
| `5fe5fb8` | Refactor substituir `confirm()` nadiu per `showConfirmDangerModal` a tots els llocs (7 migracions + 6 cleanup) |
| `379ef78` | Fix navegació post-delete de zones es disparava abans del confirm |
| `555f35e` | Feat nou modal d'input integrat + migració del `prompt()` de nova llista |

---

## Pendents — Avui (26/05/26)

Detectats durant la sessió però no completats:

- **Botó "i" + modal informatiu al toggle de lots del BiteMe**. El toggle "Crear envasos separats (lots independents)" al `#screen-add` té un `.form-hint` extens explicant quan fer-lo servir. Substituir per un botó d'info ("i") al costat del toggle que obri un modal amb la explicació. Beneficis: (1) compacta visualment el formulari (form-hint actual ~30-40px); (2) la info segueix accessible per usuaris que la necessitin; (3) coherent amb patrons d'altres apps. Decidir: emoji ℹ️ o icona SVG? Posició: dreta del label del toggle. Sessió pròpia (~30 min).

- **Bug autoomplir des de botó "Productes populars"** (`#popular-btn`/`#shopping-popular-btn`). Quan l'usuari obre el catàleg via el botó ⭐ i selecciona un popular, l'autoomplir dels camps del formulari no s'aplica de la mateixa manera que via blur del nom. Verificar quina funció gestiona aquest flow (probable `selectPopular` a populars.js o equivalent), comparar amb el flow de `_autofillShoppingFromPopular` (BuyMe) i `applyKnownProductToForm` (BiteMe), i unificar comportament. Possible que el snapshot `_lastAutofillSnapshot` (commit `c450d22`) no es respecti en aquest camí. Detectat avui durant tests del PAS 3.

- **Polish UI Editar ubicació — picker d'emojis obert per defecte**. Al `#screen-location-edit`, el picker d'emojis es mostra completament expandit per defecte (6 columnes × N files) en lloc d'estar plegat amb un botó "Triar emoji" com a la resta de formularis del projecte (popular-edit, screen-add, shopping-item-edit). Cal homogeneïtzar: substituir `.emoji-picker` inline per `.emoji-button` que obri el picker complet com a separate screen (mateix patró). Cal modificar HTML (`#screen-location-edit`) + JS (`renderLocationEmojiPicker` a settings.js) + ajustar `openEmojiPicker(target, origin)` per acceptar el nou target. Sessió pròpia (~45 min).

- **Migrar `prompt()` de dia setmana a `showSelectModal`** (`settings.js:689` `promptDayFor`). Demana un número 0-6 representant un dia ("0=Diumenge, 1=Dilluns, ..."). UX antiquíssim — l'usuari mapeja dia→número mentalment. Cap migració trivial a `showInputModal`: necessita un helper nou `showSelectModal(emoji, title, message, options[], currentValue, onConfirm)` amb pills o radio buttons. Decisions: (1) disseny del component (pills horitzontals vs llista vertical), (2) mapping dia↔número per a `setSmartNotifType({day: n})`, (3) noms de dies via i18n. NO bloquejant — el `prompt()` segueix funcionant lleig però funcional.

- **Llindar configurable per a l'avís d'afegir al BuyMe (BiteMe)**. Comportament actual: quan `lots.length` arriba a 0 apareix el modal "S'ha acabat [producte]". Poc útil per a productes que es consumeixen abans (ex: ous — vols comprar quan en queden 4, no quan ja no queden). **Millora**: permetre llindar mínim per producte/categoria que dispari l'avís abans. Decisions a prendre: (1) on viu — recomanat al popular catalogat (`popular.minThreshold`); (2) UI — camp opcional "Avisa'm quan quedi menys de X" al `#screen-popular-edit`; (3) unitat — començar per `qty`, `weight` com a v2; (4) trigger — una sola vegada quan baixa per sota; (5) anti-duplicat — si ja és al BuyMe, no oferir.

---

## Pendents — Anteriors (detectats en sessions prèvies)

### Refactor de lots — continuació

- **Fase E** — Recent-purchases per lot (afegir `lotId` al payload de `recordPurchase`)
- **Fase F** — Banners per lot (smart-notifications referenciant lots concrets; `consumption_history` afegeix `lotId`)
- **Fase G** — Polish + sync hardening
- **Fase final** — Neteja de mirrors quan tots els callers usin helpers (`getLots`, `getPrimaryLot`, etc.)

### Bugs / millores acumulats

- **Catàleg popular: distingir unitats per a productes contables** (Ous = dotzena vs unitat, Cervesa = pack vs unitat, Llaunes = pack vs unitat). Camp `unitsPerPackage` o flag `isCountable`.
- **Preu per unitat al catàleg** — 1kg vs 500g de pasta tenen mateix preu al popular; sistema pren preu del popular, no calcula proporcional. (Parcialment cobert pel commit `80a4e91` del 2026-05-25 a `getEstimatedItemCost`, però el bug al catàleg en si segueix obert.)
- **`_computeAggregatedQty` no combina `units × weight`** (2026-05-22). Pasta amb `qty=4 weight="500g" unit="units"` mostra "Pasta 4" en comptes de "Pasta 2 kg". La branca units×weight ja existeix a biteme.js:718-741 (commit `f3fcc4d`) però no s'activa per al cas reportat. Hipòtesi: `lot.weight` no està al lot subjacent (només al mirror del producte). Sessió pròpia: verificar amb consola del mòbil + possible migració per copiar `product.weight → lot.weight` als lots que no en tenen.
- **Render del lot oculta weights no parsejables** (2026-05-22). Si `lot.weight` és text lliure tipus "mig kg", la dada es desa correctament però no es pinta. Decisió pendent: mostrar el text tal qual o validar el format al modal d'edició.
- **Render del lot no mostra weight individual en productes multi-lot** (2026-05-22). A Llet amb 2 lots (1L i 2L), cada lot mostra "1 · Caduca data" sense el weight. Dada correcta, només render. `_renderLotRow` a biteme.js.
- **`_formatLotQty` retorna només el número quan `unit==='units'`** (2026-05-22). Quan es combina amb weight queda "1 · 1L · Caduca..." que és ambigu (el "1" sembla redundant). Considerar afegir sufix " u" o " envàs".
- **Propagar weight en altres camins de creació de shoppingItem** (2026-05-24). `_buildShoppingItemRow` fa fallback al popular (cobertura via render). Però seria més net que aquests camins de creació també propaguessin weight si l'origen el té: (1) `addToShoppingList` (buyme.js:2002) — quick buy des EatMe; (2) `special-lists.js:411` — push d'items de llistes especials. Polish, no bloqueja.
- **Fusió/avís d'ítems duplicats al BuyMe** (2026-05-24). Afegir un producte amb el mateix nom dues vegades crea dues línies independents ("Pa 1 × 250g" + "Pa 2 × 250g"). Considerar: (a) avisar abans d'afegir; (b) fusionar automàticament si nom + weight són idèntics; (c) cas weight diferent — mantenir separats. Mirar lògica reaprofitable de Fase C+ (`_findGroupedProductForFusion`).

### Features grans pendents

- **Feature "Cuinat" v2** amb model correcte (lots + quantitats absolutes, no %).
- **Refactor de `calculateRecipeMatch`** — falsos positius greus (sucre→Mel, canyella→Crema catalana). Cal investigar abans de tornar a fer Cuinat. Vegeu memòria `project-recipe-matching-and-cook-feature` per al primer intent.

### Backlog més antic (Despeses + altres)

- Cost mitjà cistella (Card 5 Despeses)
- Despesa per categoria (Card 6 Despeses)
- Gestió de pressupost (límit mensual amb avís)
- Planificador setmanal de receptes
- Recordatoris contextuals ("fa 3 setmanes que no compres llet")
- Revisar el sistema d'Espais

---

## Decisions de disseny preses

Decisions arquitecturals / d'UX preses després de valorar alternatives. Documentades aquí perquè futures sessions no tornin a obrir el mateix debat sense context.

### Multi-lots: la decisió de "crear envasos separats" viu només al BiteMe

**Context** (26/05/26): el toggle "Crear envasos separats" només existeix al `#screen-add` del BiteMe (`#input-multi-lots`). Considerat si calia replicar-ho al BuyMe (com a previsió en afegir item a la llista de la compra) o al catàleg de populars (com a `defaultMultiLots` per producte).

**Decisió**: mantenir el comportament actual. La decisió es pren al moment de "Comprat" (BuyMe→BiteMe) i no abans, perquè:
- El BuyMe no té lots reals (només previsió de compra). Afegir el toggle allà seria pre-decidir alguna cosa que es pot canviar quan es processa la compra.
- Replicar-ho al BuyMe afegeix soroll a una pantalla ja compacta després de PAS 1 v2.
- L'usuari no ha reportat el comportament actual com a problemàtic; és curiositat tècnica, no need real.

**Quan reobrir**: si en algun moment l'usuari es troba marcant/desmarcant el toggle del BiteMe SEMPRE igual per a un producte concret (ex: ous sempre marcats, llet sempre desmarcada), valorar afegir `defaultMultiLots` al popular del catàleg (l'Opció B descartada avui). Mentre no hi hagi aquesta evidència, mantenir status quo.

---

## Sessions completades importants — pointers per a context

Si necessites entendre el "per què" d'una decisió arquitectural, el commit referenciat conté el detall complet al missatge. Aquí només l'ancora ràpida:

- **Refactor de lots Fases A-D2** (abril–maig 2026): el producte va passar de "1 producte = 1 instància" a "1 producte = N lots independents amb fusió/move entre locations i espais". Vegeu `git log` entre `b41a8b4` (fase A inicial) i `6c91169` (Fase D v2 viva). El primer intent (Fase D1) es va descartar — vegeu memòria `project-phase-d-discarded`.
- **Polish formularis 23-26/05** (sessió actual + previs): PAS 1 v1+v2 al `#screen-shopping-item-edit` (`9cf6162`, `d26e82e`), PAS 2 v2 al `#screen-add` (`ab47006`, `f50cbde`), PAS 3 al `#screen-popular-edit` (`5be8f40` + refinaments).
- **Migració UX confirm/prompt 26/05** (sessió actual): 7 `confirm()` → `showConfirmDangerModal` (`5fe5fb8`), bug navegació zones (`379ef78`), nou `showInputModal` + migració prompt `addCustomSpecialList` (`555f35e`).
- **Cercadors accent-insensitive** (`fe9dfaf`, `b300f78`): helper `normalizeForSearch` exposat a window, aplicat a 5 cercadors user-facing.
- **Italy trip / Espais (FASE A–B)**: implementació de Spaces (Casa/Beach/Work...) amb sync independent per espai. Vegeu commits de la primera meitat de maig.
