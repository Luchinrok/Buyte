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

26 commits en aquesta sessió. Polish formularis (PAS 3 popular-edit + refinaments) + migracions UX (confirm/prompt → modals integrats) + accent-insensitive search + persistència del backlog + botó info al toggle multi-lots:

| Hash | Una línia |
|---|---|
| `5be8f40` | PAS 3 — layout horitzontal a `#screen-popular-edit` |
| `70978ff` | Refinament PAS 3 — labels centrats horitzontalment |
| `ade029f` | Fix alineació vertical d'inputs als form-row 50/50 quan labels fan wrap |
| `7fd7712` | Fix inputs type=number rebien estil natiu del navegador |
| `47ee2bc` | Fix alinear chip 'No caduca' amb la caixa de l'input dies (intent 1) |
| `f9c11af` | Fix igualar alçada del chip 'No caduca' a la de l'input dies (intent 2) |
| `4a2f387` | Fix alinear chip 'No caduca' amb input dies per baseline del text (intent 3, definitiu) |
| `a0171f3` | Fix placeholder dd/mm/aaaa dels inputs date en color gris (via `:placeholder-shown`) |
| `2f68eec` | Fix placeholder dd/mm/aaaa via JS toggle class `.is-empty` (Opció C, iOS Safari no suporta `:placeholder-shown` amb type=date) |
| `fe9dfaf` | Fix cercador de populars insensible a accents i majúscules |
| `b300f78` | Fix normalitzar accents i majúscules a tots els cercadors user-facing (helper `normalizeForSearch` + canonicalització) |
| `5fe5fb8` | Refactor substituir `confirm()` nadiu per `showConfirmDangerModal` a tots els llocs (7 migracions + 6 cleanup) |
| `379ef78` | Fix navegació post-delete de zones es disparava abans del confirm |
| `555f35e` | Feat nou modal d'input integrat (`showInputModal`) + migració del `prompt()` de nova llista |
| `d340704` | Docs centralitzar el backlog al repo (`memory/BACKLOG.md`) |
| `5d9ac82` | Feat substituir hint llarg del toggle multi-lots per botó ℹ️ + modal info |
| `f6b9ed7` | Docs decisió de disseny multi-lots viu només al BiteMe |
| `d8b5acb` | Polish refinaments al toggle multi-lots + modal info (eliminat ℹ️ duplicat del banner, markdown-lite bold, separació paràgrafs) |
| `b4a6e51` | (intent fallit centrat checkbox 1) |
| `88e58dd` | (intent fallit centrat checkbox 2) |
| `0f75896` | Docs pendent — estendre polish formularis a pantalles secundàries |
| `2452ddc` | (intent fallit centrat checkbox 3) |
| `aa39f6f` | (intent fallit centrat checkbox 4 — revert) |
| `61b1e3d` | (intent fallit centrat checkbox 5) |
| `34af737` | Fix toggle multi-lots layout 3 columnes (text flex-grow + min-width:0 al span) |
| `67cf5e7` | (intent fallit centrat checkbox 6 — vertical-align middle, no resol) |

**Treballs completats**: PAS 3 polish popular-edit · 5 bugs visuals (form-row alignment, type=number, chip alineació en 3 intents) · placeholder data en 2 intents (CSS + JS Opció C) · cercadors accent-insensitive globals · 7 migracions `confirm()` + neteja 6 fallbacks · `showInputModal` nou + migració prompt new llista · persistència backlog al repo · toggle multi-lots polish (botó info + modal) · refinaments del modal info · decisió de disseny apuntada.

**Treballs no resolts**: 8 intents al centrat vertical del checkbox del toggle multi-lots sense èxit (vegeu Pendents — Avui).

---

## Sessió 27/05/26 — Commits

Continuació del bug del centrat checkbox del toggle multi-lots (9è intent + revert) + fix del bug autoomplir des de botó ⭐ del catàleg al BuyMe (#10 del backlog d'ahir) + polish UI del `#screen-location-edit`:

| Hash | Una línia |
|---|---|
| `f4f58f3` | (9è intent fallit centrat checkbox — wrapper estructural amb DevTools) |
| `a0a0a36` | Revert del 9è intent + apunt al backlog amb 3 enfocaments per a sessió futura |
| `62c34da` | ✅ **Fix #10 — Bug autoomplir popular**: `prefillShoppingItemFromPopular` (catàleg BuyMe) ara delega a `_autofillShoppingFromPopular` (flow blur). Resol divergència acumulada: el path catàleg no omplia price/weight ni actualitzava el snapshot. Només afectava al BuyMe; el BiteMe ja era coherent via `openAddForm(prefill)`. |
| `4d7dbf1` | ✅ **Polish UI Editar ubicació**: eliminat big preview 64px + grid inline d'emojis substituït per `.emoji-button` compacte que obre `openEmojiPicker('location', ...)`. Nou target `location` al helper compartit amb subset `LOCATION_EMOJIS` (mateix patró que `supermarket`). Estalvi ~200px (31%). |

**Treballs no resolts**: bug del centrat checkbox segueix obert (vegeu Pendents — Avui).

---

## Pendents — Avui (26/05/26)

Detectats durant la sessió però no completats:

- **Bug visual residual al checkbox del toggle multi-lots**. El checkbox de "CREAR ENVASOS SEPARATS" no queda centrat al centre vertical del bloc de text quan el text fa wrap a 2-3 línies. L'usuari va aclarir amb captura "abans/després" que vol els 3 elements (checkbox, text, emoji ℹ️) tots al centre vertical del bloc complet, no alineats amb la primera línia.

  **9 intents fallits, 2 sessions (26-27/05/26)**:
  - `b4a6e51` — `align-items: flex-start` + `margin-top: 3px` (encara desalineat)
  - `88e58dd` — `align-items: baseline` (no funciona perquè input no té baseline real)
  - `2452ddc` — `flex-start` + `margin-top: 2px` (empíric, encara desalineat)
  - `aa39f6f` — `align-items: center` pur (cas 1 línia OK, 2+ línies amb checkbox a la primera línia)
  - `61b1e3d` — `margin-top: 4px` empíric (resol parcialment a 1 línia, no a 2+)
  - `34af737` — `flex: 1 1 auto + min-width: 0` al span (text feia 5 línies, ara fa 3 — millora però no resol centrat)
  - `67cf5e7` — `vertical-align: middle` al checkbox (no aplica en context flex)
  - `f4f58f3` (9è intent, 27/05/26 amb cap fresc + DevTools) — wrapper estructural `<span class="checkbox-wrap">` amb `align-self:stretch + display:flex + align-items:center`. Captures de DevTools al PC van revelar que el `<input type="checkbox">` té comportament nadiu (margin 3px 3px 3px 4px + line-height:normal + display:inline-block + appearance:auto) que el navegador respecta tot i align-items:center del flex pare. Solució teòrica del wrapper teòricament hauria de funcionar (força tota l'alçada del label i centra el checkbox dins). **Resultat al mòbil: PITJOR que abans** — el checkbox queda visualment SEPARAT del text (com a "block" sobre el text en lloc d'alineat amb les paraules). Revertit en aquesta mateixa sessió.
  
  **Hipòtesi pendent**: el wrapper potser estava agafant amplada més del que tocava, o el flex layout del `.toggle-with-info` no és el correcte per al patró. Cal investigar més amb DevTools focalitzat al wrapper.
  
  **Per a la pròxima sessió** — possible enfocament radical: revertir TOTS els canvis acumulats del toggle (els 9 intents) i començar de zero amb un disseny més simple. Opcions:
  - (a) Canviar el text del label a una versió més curta com "Crear lots separats" o "Envasos independents" que NO necessiti wrap a la majoria de viewports. Acceptar que el centrat perfecte amb un text que fa wrap és tècnicament complex.
  - (b) Posar el text en una sola línia compacta amb `white-space: nowrap` + `text-overflow: ellipsis` (perdria la part del text però evitaria el problema).
  - (c) Acceptar el bug visual com "petit detall" no bloquejant i tancar l'ítem.
  
  Estat actual del codi: **revertit a equivalent de `aa39f6f`** (sense wrapper, sense `vertical-align`, només `align-items:center` al label + `flex:1 1 auto` al span del text). Ho deixem documentat però sense més intents avui.

- **Polish formularis — estendre a les pantalles secundàries**. La sèrie de polish formularis del 23-26/05/26 va atacar 3 pantalles principals (BuyMe afegir/editar, BiteMe afegir, popular-edit). Queden 2 pantalles més amb el mateix patró antic:
  - `#screen-special-item-edit` (afegir/editar item dins una llista especial)
  - `#screen-supermarket-edit` (afegir/editar supermercat)
  
  (`#screen-location-edit` ja resolt al commit `4d7dbf1` del 27/05/26 — emoji picker en overlay.)
  
  Pendent: revisar cadascuna i decidir si aplicar el mateix patró del polish (layout horitzontal, compactació marges, etc.) o si tenen necessitats específiques.

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
- **Polish formularis 23-26/05** (sessió 26/05 ara tancada): PAS 1 v1+v2 al `#screen-shopping-item-edit` (`9cf6162`, `d26e82e`), PAS 2 v2 al `#screen-add` (`ab47006`, `f50cbde`), PAS 3 al `#screen-popular-edit` (`5be8f40` + refinaments `70978ff`, `ade029f`, `7fd7712`, `47ee2bc`, `f9c11af`, `4a2f387`).
- **Migració UX confirm/prompt 26/05** (sessió 26/05): 7 `confirm()` → `showConfirmDangerModal` (`5fe5fb8`), bug navegació zones (`379ef78`), nou `showInputModal` + migració prompt `addCustomSpecialList` (`555f35e`).
- **Cercadors accent-insensitive 26/05** (`fe9dfaf`, `b300f78`): helper `normalizeForSearch` exposat a window, aplicat a 5 cercadors user-facing.
- **Toggle multi-lots: hint → modal info 26/05** (`5d9ac82` + refinaments `d8b5acb`, `34af737`): substitució del `.form-hint` llarg pel botó ℹ️ + modal `_showInfoModal` amb markdown-lite suport per a negretes. Centrat del checkbox del toggle queda PENDENT (vegeu Pendents — Avui).
- **Italy trip / Espais (FASE A–B)**: implementació de Spaces (Casa/Beach/Work...) amb sync independent per espai. Vegeu commits de la primera meitat de maig.
