# Backlog del projecte Buyte

> **Última sincronització: 2026-06-07** (resolts fins 02/06 marcats amb ✅ + hash; fil packs/preu COMPLET `4f95e8f`/`fd5c5b5`/`e500fc0`; polish formularis + centrat LLINDAR `9f03282`; bug agregat→BuyMe + format/centrat modal `45ea959`). **03/06**: tancats com a obsolets/acceptats dos ítems — catàleg contables/preu-unitat (cobert pel fil de packs) + bug visual checkbox multi-lot (acceptat detall menor); ✅ sufix " u" render-only; refactor de lots E/F/G/final APARCAT; ✅ matcher de Cuinat per nom (falsos positius emoji eliminats); + idea importar receptes per fitxer. **05-06/06**: ✅ **Cuinat v2 "He cuinat" COMPLET** (Fases 0–2b-2b: qty estructurades · matcher→producte · cervell+executor FEFO conscient del content · modal+botó); ✅ **fix arrel CookMe→BuyMe** (`6aea709`) que desbloqueja el descompte automàtic del Cuinat. **07/06**: ✅ ampliació catàleg (44 productes, `2db9484`) + ✅ fusió automàtica de duplicats al BuyMe + matching "mateix producte" `cookmeSameProduct` (`f69941c`); oberts: consistència same-product a l'EatMe i bug pestanya "Disponibles".

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

## ⭐ PENDENTS ACTUALS (a data 2026-06-03)

Llista neta del que queda OBERT. El detall històric i els ítems resolts són més avall.

**PROPER**: començar per la SEGÜENT TASCA (prefill de compra canònic), després EatMe consistència.

- ~~**Bug visual — centrat vertical del checkbox del toggle multi-lots** quan el text fa wrap (2-3 línies). 9 intents fallits (26-27/05).~~ **✅ ACCEPTAT com a detall menor no bloquejant (03/06)**. Després de 9 intents en 2 sessions sense èxit, decisió de l'usuari: deixar-lo com està (equivalent `aa39f6f`). No s'hi gasten més sessions. Detall i historial a "Pendents — Sessions 26-27/05".
- ~~**Coherència del sufix " u" al llistat principal** (`_computeAggregatedQty`)~~ **✅ RESOLT (03/06, render-only, sense tocar mirrors)** — validat a mòbil. Helper `_displayProductQty` + 5 callsites del BiteMe; vegeu detall a "Bugs / millores acumulats".
- **Refactor de lots E/F/G/final** — **APARCAT (decisió 03/06), sense impacte d'usuari**. Fases E (recent-purchases per lot), F (banners per lot), G (polish + sync hardening), final (neteja de mirrors). L'**única deute real** és la neteja de mirrors: bloqueja el sufix " u" i ens va picar ahir (bug agregat→BuyMe llegint `product.qty`). **Revisar només si torna a molestar** en feines futures; no s'hi inverteix proactivament.
- ~~**Catàleg popular** — distingir unitats de productes contables (`unitsPerPackage`/`isCountable`) + preu per unitat.~~ **✅ COBERT pel fil de packs (03/06)** — vegeu detall + 3 matisos residuals a "Bugs / millores acumulats".
- ~~**Propagar weight** en altres camins de creació de shoppingItem (`addToShoppingList`, `special-lists`).~~ **✅ COBERT / RECLASSIFICAT (05/06 — investigació, doc-only)**. Cas real (EatMe→BuyMe) ja resolt per `45ea959`; CookMe i special-lists NO APLIQUEN (origen sense weight). Vegeu detall a "Bugs / millores acumulats".
- ~~🔴 **Fix arrel CookMe→BuyMe** (qty de cuina escrita com a qty de compra → lot `percent` sense unit → Cuinat `'manual'`).~~ **✅ RESOLT (06/06, validat a mòbil)**: `addItemsToShop` escriu la **unitat de COMPRA** (`qty="1"` + content del popular via `findProductForIngredient` **plural-aware**; ous→"12u", formatge→"250g"), descartant la qty de cuina → en comprar el lot cau a `quantity` mode AMB content → el Cuinat el descompta sense estendre `percent`. Detall + follow-up de matching robust a "Bugs / millores acumulats".
- ~~**Cuinat v2 / "He cuinat"** (cuinar una recepta i descomptar ingredients dels lots).~~ **✅ FET (05-06/06, Fases 0–2b-2b)** — vegeu detall + pendents NO bloquejants a "Features grans pendents".
- ~~**Ampliació del catàleg** — 44 productes de receptes a `POPULAR_PRODUCTS` (preu/weight/caducitat/ubicació).~~ **✅ FET (07/06, `2db9484`)**.
- ~~**Fusió automàtica de duplicats al BuyMe + matching "mateix producte"**.~~ **✅ FET (07/06, `f69941c`)**. `cookmeSameProduct` (igualtat de tokens amb stem): plurals fusionen (albergínia≡albergínies), compostos NO ("formatge feta"/"pa torrat"). Fusió al camí programàtic (`addToShoppingList`) i al manual (modal). També corregeix el lookup de catàleg d'`addItemsToShop` (que `6aea709` va enviar com a nom exacte tot i que el missatge deia `findProductForIngredient`). Detall a "Bugs / millores acumulats".
- ~~🟡 **Consistència "mateix producte" a l'EatMe** — aplicar `cookmeSameProduct` a `findExistingAtHome` / agregació de l'EatMe.~~ **✅ RESOLT DE RETRUC (10/06, `9a7a1d8`)**. El cas habitual ("albergínies" vs "Albergínia" → producte duplicat a l'EatMe) es fusiona **sense tocar l'agregació**: `_buildShoppingPrefill` ja canonicalitza **nom + emoji** del popular casat al moment de comprar, de manera que `_findGroupedProductForFusion` (nom+emoji+location, tot exacte) casa amb l'existent i afegeix lot enlloc de duplicar. **NO ha calgut tocar la part arriscada** (`_findGroupedProductForFusion` / `findExistingAtHome` / model central d'estoc/lots) — el camí canònic al prefill cobreix el cas habitual. **Queda obert NOMÉS** si apareix algun camí que entri a l'EatMe **sense passar pel prefill** (p. ex. creació manual directa amb nom plural); en aquest cas sí caldria el `cookmeSameProduct` a l'agregació, amb la cura de sobre-fusió ja anotada.
- ~~🔴 **Bug CookMe pestanya "Disponibles"** — no s'obrien en clicar.~~ **[RESOLT 2026-06-07, `fece010`]** CookMe: les receptes de "Disponibles" (i de fet qualsevol cara del cub que no sigui la frontal "Totes") no s'obrien en clicar. Causa arrel: el cube de Swiper aplica rotació 3D a les cares no-frontals; Chrome sintetitza el click amb un hit-test que reapunta de la card a `.cookme-list` i el handler no trobava `data-recipe-id`. Fix: obertura per tap detectat manualment (`pointerdown`→`pointerup` en captura, guarda ≤10px/≤800ms, target del `pointerdown`). Commit: `fece010`.
- ~~🟢 **Prefill de compra canònic** — en comprar un item del BuyMe amb nom plural d'un popular, `_buildShoppingPrefill` recuperava preu/dies/ubicació/pes per nom EXACTE → fallava i demanava preu/pes/zona.~~ **✅ FET (10/06, `9a7a1d8`)**. `_buildShoppingPrefill` té el fallback canònic `cookmeSameProduct` (recupera dies/preu/zona/pes quan el nom exacte falla) **+ canonicalitza nom i emoji** del popular casat (perquè entri a l'EatMe com a "Albergínia" 🍆 i es fusioni — vegeu item EatMe same-product). A més, `openShoppingItemEdit` (llapis d'edició, camí diferent que NO passa pel prefill) aplica el mateix match canònic i **reutilitza el flux unificat `_autofillShoppingFromPopular`** per omplir TOTS els camps del popular respectant els overrides de l'usuari (`canReplace` + snapshot null). Bump `buyme.js` a `v=20260610-4`.
- ~~🟡 **[NETEJA] codi `pointer-events` redundant al CookMe**~~ **✅ REVISAT (11/06) — NO redundant, NO tocar**. Swiper (mode cub) deixa els slides amb `pointer-events: none`; la reactivació `_cookmeEnableActiveSlide` (`afterInit` + `slideChangeTransitionEnd`, `cookme.js:1944/2014/2030`) és **load-bearing**: el detector de `pointerup` llegeix el `target` del `pointerdown` i, sense la reactivació, el hit-test cauria darrere i `closest('.cookme-card')` retornaria `null` → el tap NO obriria la recepta. Són **complementaris, no duplicats** (el `pointerup` resol el hit-test reapuntat de cares no-frontals; la reactivació resol el `pointer-events:none` de Swiper). Mateix patró als cubs de BuyMe/BiteMe, que en depenen sense detector de pointerup. La hipòtesi original ("redundant") era incorrecta.
- ~~🟡 **[REVISAR]** Mateix patró de cub (click a cares no-frontals) als cubs de shops/zones/levels.~~ **✅ FET (11/06, `1b5097a`, validat a mòbil)**. **shops i levels SÍ tenien el bug**: a la 2a cara del cub el `click` sintetitzat es reapunta a un ancestre (`.shopping-item` / `.product-list`) → `closest('[data-action]')`/`.product-item` fallava i l'acció no s'executava (el `pointerdown`/`pointerup` sí apuntaven bé — diagnosticat amb overlay de debug temporal). Resolt amb el **detector pointerup compartit** (patró CookMe, a `app.js`) que resol el tap amb el **target del pointerdown**: `_initShopsActionsDelegate`→`_handleShopsTap`, `_onLevelsSliderClick`→`_handleLevelsTap`, trets els listeners `click`. Complement: **reactivació de pointer-events autoritativa** (activa→`auto`, resta→`none`) perquè el pointerdown impacti la cara visible. **`#zones-slider` NO afectat** (targets grans a tota amplada + fallback geomètric de shelf més proper, `app.js`) → no tocat. CookMe intacte.
- ~~🔴 **[BUG] Navegació insígnies** — en tocar una insígnia i tornar enrere, l'app sempre tornava a Configuració en comptes de la pantalla on estaves.~~ **✅ RESOLT (10/06, `d607c2a`, validat a mòbil)**. Causa: `#screen-achievements` tenia `data-back="impact"` HARDCODED i `openAchievements` no fixava l'origen → des d'un toast de recompensa (que salta des de qualsevol pantalla) tornava a `impact` i d'allà a `settings`. Fix: `openAchievements` captura la `.screen.active` ABANS de `showScreen('achievements')` i fixa `data-back` a l'origen real (fallback `impact`). L'override de `smart-notifications.js:815-816` queda redundant però inofensiu.
- ~~🟢 **[UX insígnies] X per tancar el toast de recompensa**~~ **✅ FET (10/06, `c73649f`, validat a mòbil)**. El toast de desbloqueig d'insígnia/nivell només es tancava sol (auto-dismiss) o navegant a Èxits en clicar-lo. Afegit botó X a `_buildRewardToast` (`e.stopPropagation()` + `dismiss()` sense navegar; auto-timer i cua `onDone` intactes) + estil `.reward-toast-close`.
- ~~🟢 **[CONTINGUT] Completar POPULAR_PRODUCTS amb els ingredients del CookMe** que faltaven.~~ **✅ FET (10/06, `082d252`)**. Creuament canònic (port de `cookmeCanonTokens`/`cookmeStem`/sinònims, mètode de `2db9484`): 87 ingredients distints vs 105 entrades → **8 misses afegits** (catàleg 105→113): genèrics `Iogurt`/`Peix`/`Carn` (fridge) + `Tonyina` (pantry, conserva), i compostos/específics `Formatge feta` (fridge), `Flocs d'avena`/`Fruits secs`/`Pa torrat` (pantry). En comprar-los hereten preu/pes/dies/zona/emoji; els compostos entren com a producte propi sense fusionar amb la base (correcte). **`plaques de lasanya` NO afegida**: és pasta (els dos mots → sinònim `pasta` → tokens `past+past`); no fusiona amb "Pasta" només per l'artefacte de **token duplicat** → diferit a la **robustesa del matcher** (dedupe de tokens a `cookmeSameProduct`/`cookmeCanonTokens`), NO és feina de catàleg.
- ~~🟢 **[PASTA] Tipus de pasta: distints per comprar, intercanviables per cuinar**~~ **✅ FET (10/06, `3657a99`)**. `COOKME_INGREDIENT_SYNONYMS` buidat (`{}`) → espaguetis/macarrons/fideus/etc. són productes propis i `cookmeSameProduct` (compra/catàleg) els tracta com a distints; +3 entrades de catàleg (Macarrons, Fideus, Plaques de lasanya; Pasta i Espaguetis ja hi eren). PERÒ família "pasta" intercanviable NOMÉS al motor de receptes: nou `COOKME_INGREDIENT_FAMILIES` + `cookmeSameFamily` usat dins `findProductForIngredient` (qualsevol pasta al rebost satisfà qualsevol ingredient de pasta), sense tocar el match de compra/catàleg. Tanca de passada l'artefacte "plaques de lasanya" (`past+past`) i la col·lisió Pasta↔Espaguetis. Canvi atòmic; cap toc al DATA de receptes.
- ~~🟡 **[UX] Afegir producte directe a manual**~~ **✅ FET (10/06, `a5032e9`)**. "Afegir producte" (EatMe `add-btn` → `openAddForm({})`; BuyMe `btn-add-shopping-item` → `openShoppingItemEdit(null)`) obre ara **directament el formulari manual**, estalviant el clic del selector. El codi de barres passa a **icona 📷 al header** del formulari (`#add-scan-btn` / `#shopping-scan-btn`, estil `.header-icon-btn`); en cancel·lar l'escàner torna al formulari (cada icona fixa el `data-back` de `#screen-scan` a `add`/`shopping-item-edit`). Back del formulari EatMe retargetat `add-choice`→`home` (`biteme.js:4021`). **Follow-up 🟢 [NETEJA]**: els selectors orfes `#screen-add-choice` / `#screen-shopping-add-choice` (+ botons `choice-scan/manual`, `shop-choice-scan/manual`) queden sense entrada → es poden esborrar d'`index.html` i netejar els handlers d'`app.js` en una passada futura.
- ~~🟡 **[NETEJA] Eliminar els selectors orfes manual/codi de barres**~~ **✅ FET (11/06, `073fa7a`)**. Esborrats `#screen-add-choice` (EatMe) i `#screen-shopping-add-choice` (BuyMe) d'`index.html` + els 4 handlers orfes d'`app.js` (`choice-scan`/`choice-manual`, `shop-choice-scan`/`shop-choice-manual`). `data-back="add-choice"` de `#screen-scan` i `#screen-add` **retargetats a `home`** (no esborrats: `showScreen` no té null-guard; en camins vius ja s'overrideja, però evita un crash latent). Tret també el CSS mort (`.add-choices`/`.big-choice*`) i la clau i18n `manual` (només l'usaven aquests botons; `scanBarcode` es manté per a la icona 📷). Verificat: cap referència viva als selectors/botons (7 insercions, 126 supressions).
- **Despeses i altres** — ~~cost mitjà cistella~~ **✅ FET v1 (11/06, `553ea3f`)**, ~~despesa per categoria~~ **✅ FET (11/06, `6f70cc1`)**, ~~pressupost mensual~~ **✅ FET v1 (11/06, `abd37ff`)**, ~~planificador setmanal de receptes~~ **✅ FET v1 (12/06, vegeu sota)**, ~~recordatoris contextuals~~ **✅ FET v1 (12/06, `505c0ad`)**, revisar sistema d'Espais.
  - ~~**Recordatoris contextuals**~~ **✅ FET v1 (12/06, `505c0ad`)**. Nou tipus de smart-notification **`rebuyOverdue`** (re-compra endarrerida) sobre `purchase_history` real: per a productes amb ≥3 compres, mediana dels intervals → avisa si `daysSince > mediana×1.3` (banda [3,45] dies, sostre ×3 per a abandonats, omet si ja és al BuyMe). Banner in-app + push + acció "Veure" → `manualAddToBuyMe`. Registrat seguint el patró (`SMART_NOTIF_DEFAULTS/TYPES` + `_evalRebuyOverdue` + `evaluateNotificationType` + `getActiveBanners` + `_smartBannerAction` + i18n `notifTypeRebuy`). Limitació v1: retenció de 90 dies → cobreix bé habituals freqüents. **Possibles afegits futurs** (mateix patró de tipus): **(B)** estoc baix/minStock com a avís explícit; **(C)** avís de pressupost mensual a prop/superat (≥80%/100%); **(E)** recordar comprar per a la setmana planificada (mealPlan de la setmana vinent sense compra generada).
  - ~~**Planificador setmanal de receptes (CookMe)**~~ **✅ FET v1 (12/06, `6d00f06` + `94aaf2b`)**. **Fase 1**: `js/meal-planner.js`, pantalla `#screen-meal-planner` (7 dies × 3 slots esmorzar/dinar/sopar), assignar/treure via modal selector (llista completa + cerca), sincronitzat (patró `categoryOrderBySuper`). **Fase 2**: botó "🛒 Generar llista de la compra" → `_mpCollectPlanIngredients` agrega els ingredients **required** de les receptes de la setmana, fusiona per clau canònica (`cookmeSameProduct`), i reusa `showIngredientPicker` (generalitzat: accepta llista d'ingredients + títol, `skipRecipeCount`) + `addItemsToShop`/`addToShoppingList`. **Setmanes reals**: `eatmefirst_meal_plan` = `{weekId:{mon..sun:{slots}}}` (weekId = dilluns `YYYY-MM-DD`); navegació `‹/›` (`_mpViewedWeekId`), header amb rang de dates + paraula relativa (aquesta/vinent/passada), dies amb data, avui ressaltat; migració del pla pla antic → setmana en curs; generar llista actua sobre la setmana vista. **Possibles v2**: pre-filtre del selector per categoria segons slot; incloure ingredients opcionals; netejar setmanes velles.
  - ~~**Pressupost mensual (v1)**~~ **✅ FET (11/06, `abd37ff`, validat a mòbil)**. Clau `eatmefirst_monthly_budget` sincronitzada (patró `categoryOrderBySuper`: push/createList/apply amb guarda `>0`). Card a Despeses (`_renderExpensesBudgetCard`): gastat vs límit del **mes natural** (`byMonth[últim]`, no el rolling 30d del pill), barra amb estats ok/near/over (verd <80% / taronja 80-99% / vermell ≥100% + excés), botó fixar/editar via `showInputModal` (buit/0 treu el pressupost). **Avís v1 = només visual** (color). **Limitació v1**: si `totalEntries===0` (cap compra mai) la pantalla mostra l'empty-state global i la card no es pinta → no es pot fixar el pressupost fins a tenir alguna compra. **v2 possible**: avís push/banner en creuar 80%/100% (registrar tipus a `smart-notifications`).
  - ~~**Despesa per categoria**~~ **✅ FET (11/06, `6f70cc1`)**. Card "Per categoria" a Despeses (mirall de "Per supermercat"): `byCategory` resol cada compra amb el mapa explícit (`CategoriesSystem.getItemCategories()[popularId]`) → `detectCategoryForItem({name,emoji})` → `cat_other`; icona+nom de la categoria + €/%. Percentatges enters que sumen 100 via `_assignPctLargestRemainder` (aplicat també a "Per supermercat"). Cap canvi al model ni a `categories.js`.
  - ~~**Cost mitjà de cistella (v1)**~~ **✅ FET (11/06, `553ea3f`)**. `_expensesGetData` agrupa els articles del període per `(dia + supermercat)` com a proxy de cistella → `basketCount` + `avgBasket = total/basketCount`; pintat com a línia "🧺 Cistella mitjana: X € · N cistelles" a la Card Total (+ copy "N articles", abans "N compres"). Cap canvi al model. Limitacions assumides: sense hora (anades el mateix dia/super es fusionen), `price` per-unitat (mateixa base que el Total), re-compres sense super → `(sense super)`.
  - 🟢 **[Despeses v2] Cistella exacta** — registrar a `recordPurchase` el **total del lot** (`prefill.totalPrice`, que avui es perd) i un **`basketId`** per sessió de "Comprat", perquè el cost de cistella deixi de dependre del proxy `(dia+supermercat)` i del preu per-unitat. Substituiria l'agrupació actual per `basketId` real.

---

## Sessió 23-25/05/26 — Commits

Bloc weight/autoomplir al BuyMe + render de lots al BiteMe + polish formularis PAS 1 (BuyMe) i PAS 2 (BiteMe). 19 commits:

| Hash | Una línia |
|---|---|
| `4b6e794` | ✅ Feat mostrar weight individual a cada fila del lot (resol render multi-lot **i** weights no parsejables — es pinten tal qual) |
| `c63bd35` | Fix `_refreshProductMirrors` després de creació de producte 1-lot |
| `af622dc` | Refactor eliminar `·` com a separador entre ubicació i dies |
| `72bde83` | ✅ Feat normalització d'unitats al desar el lot ("1l"→"1L", "1KG"→"1kg", text lliure respectat) |
| `77f4549` | ✅ Feat weight al llistat BuyMe + editable per item (override + fallback popular) |
| `93ff46c` | Fix override de weight per ítem no propaga al popular canònic |
| `4f8e58d` | ✅ Feat autoomplir camps des del popular en crear ítem nou (qty/weight/price/data) |
| `b3c4d54` | Feat override per item del preu (paral·lel al weight) |
| `c450d22` | ✅ Fix re-autoomplert intel·ligent al canviar nom (`_lastAutofillSnapshot` distingeix autoomplert vs manual) |
| `80a4e91` | ✅ Feat càlcul de cost proporcional al weight (`_parseWeightToBase` + branca proporcional a `getEstimatedItemCost`) |
| `9cf6162` | PAS 1 — compactar `#screen-shopping-item-edit` (BuyMe) |
| `d26e82e` | PAS 1 — layout horitzontal `#screen-shopping-item-edit` (BuyMe) |
| `ec625ad` | Refactor reordenar form-rows a `#screen-shopping-item-edit` |
| `b8d3b8e` | Copy treure '(opcional)' dels labels dels formularis |
| `86a3a71` | Chore placeholder més clar al camp Quantitat del BuyMe |
| `8333165` | Fix camp data buit al obrir form nou (deixa via lliure a l'autoomplert) |
| `ab47006` | PAS 2 — compactar marges a `#screen-add` (BiteMe) |
| `f50cbde` | PAS 2 — layout horitzontal a `#screen-add` (BiteMe afegir/editar producte) |
| `0463b6f` | Chore eliminar text obsolet del modal Editar lot |

**Ítems del backlog tancats**: render weight individual multi-lot + weights no parsejables (`4b6e794`) · normalització d'unitats (`72bde83`) · weight editable + recuperar dades del popular en afegir (`77f4549`, `4f8e58d`) · re-autoomplert al canviar nom (`c450d22`) · cost proporcional al weight (`80a4e91`) · polish formularis PAS 1 BuyMe + PAS 2 BiteMe.

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

## Sessió 31/05/26 — Commits

Sessió de validació al mòbil real: weight validation (Opció A) + 2 bugs/millores detectats avui en testejar. 2 commits:

| Hash | Una línia |
|---|---|
| `1abbcb2` | ✅ **Feat validació de format al camp weight als 4 formularis** (Opció A — resol agregacions mixtes lletges) |
| `5180570` | ✅ **Fix toast z-index sobre modals** + ✅ **'Menjat' → 'Consumit'** als textos visibles d'acció |
| `7b9b2df` | ✅ **Feat fusió/avís d'ítems duplicats al BuyMe** (Opció B + modal 3 botons; clau nom+weight) |
| `573826d` | ✅ Claus i18n + CSS del modal de duplicats (completa `7b9b2df`) |

**Ítems resolts aquesta sessió**:
- ✅ **Weights no parsejables creen agregacions mixtes** (`1abbcb2`). Opció A: nou helper `validateWeight(raw)` (biteme.js) aplicat als 4 inputs de weight (`#input-weight`, `#input-popular-weight`, `#input-shopping-weight`, `#lot-edit-weight`). Rebutja text lliure / números pelats / ≤0, normalitza la sortida, bloqueig amb toast `weightInvalid` al desar + vora vermella al blur. `_computeAggregatedQty` no es toca (actua a l'origen). Detall complet a "Bugs / millores acumulats".
- ✅ **Toast tapat pel modal** (Detectat i resolt 31/05). El toast d'error (p.ex. validació del weight al modal d'Editar lot) quedava darrere de l'overlay del modal. Fix: `.toast` z-index `1000` → `11000` (per sobre de `.modal-overlay`=1000 i pickers=2000). Commit `5180570`.
- ✅ **'Menjat' no encaixa per a productes no comestibles** (Detectat i resolt 31/05). 'Menjat' no té sentit per a carbó, medicaments, neteja, etc. Canviat a 'Consumit' a tots els textos visibles d'acció sobre un lot/producte (i18n `consumed`/`howManyConsumed`/`consumedMsg`/`statsEmpty2`, biteme `verbInf`/`verbPp` + aria-label del botó ✓, patterns "Has consumit principalment", smart-notifications "Avui consumeix:"). NO s'ha tocat 'menjar' com a substantiu (aliment) ni frases no relacionades. Commit `5180570`.
- ✅ **Fusió/avís d'ítems duplicats al BuyMe** (`7b9b2df` + `573826d`). Vegeu detall complet a "Bugs / millores acumulats".

---

## Sessió 01/06/26 — Commits

Llindar configurable minStock + fix autoomplir/Xu (productes per unitat com Ous "12u"). 1 commit (validat al mòbil per Dani abans de commitejar):

| Hash | Una línia |
|---|---|
| `f8b7d34` | ✅ **Feat llindar minStock (default 0) + avís d'afegir al BuyMe** + ✅ **fix autoomplir/Xu** (`validateWeight` accepta "Nu") + helper `_applyContentToAddForm` + camí ⭐ unificat |

**Ítems resolts aquesta sessió**:
- ✅ **Llindar configurable minStock** (vegeu detall a "Pendents — Sessions 26-27/05", marcat resolt). Default **0** (retrocompat: només avisa en acabar-se). Camp al producte + herència del popular + transport via "Comprat". UI a `#screen-add` (Quantitat|Preu|Llindar alineat) i `#screen-popular-edit`, amb botó ℹ️.
- ✅ **Fix autoomplir/Xu** — productes de format "Nu" (Ous "12u", All "3u", Crema catalana "4u", Hamburgueses "4u"): (1) `validateWeight` ara accepta "Nu" normalitzat a minúscula sense espai → editar el popular "Ous" ja no surt vermell; (2) helper compartit `_applyContentToAddForm` (font única de la conversió "Nu"→Quantitat) usat pel camí blur i pel botó ⭐; (3) camí ⭐ unificat: `openAddForm({name,emoji})` + `applyKnownProductToForm(p)` (recupera preu/dies/ubicació/pes/minStock, abans absents); (4) desbloqueja afegir/comprar Ous al **BuyMe** (mateix `validateWeight` compartit a `saveShoppingItem`). NO tocat: "6x33cl" (cervesa, format pack — tasca a part). NO calia migració de productes existents (estat real net: lot `unit='units'`, sense `weight:"12u"`).
- ✅ **Snapshot-replace a l'autoomplir EatMe** (`3ef3a76`). Patró `_lastKnownProductSnapshot` + `_knownProductCanReplace` (mirall de `_lastAutofillSnapshot`/`canReplace` del BuyMe) a `applyKnownProductToForm`: en canviar de producte conegut, substitueix els camps autoomplerts NO tocats per l'usuari (emoji, ubicació, data calculada, noExpiry, preu, minStock, parell Quantitat+Contingut). `_applyContentToAddForm` snapshot-aware per al parell Quantitat+Contingut (round-trip net ous↔pa: recorda els DOS valors aplicats). Camps absents al match (preu/minStock sense valor) es reseteja al default en comptes de conservar l'anterior. Reset del snapshot a `openAddForm` (cada obertura comença net). Resol el bug ous→pa→ous que es quedava amb dades del producte anterior.

---

## Sessió 02/06/26 — Commits

Format multipac "NxMunitat" (Cervesa "6x33cl") + suport "cl" + expansió de packs/Nu a la compra. 1 commit (validat al mòbil per Dani):

| Hash | Una línia |
|---|---|
| `4f95e8f` | ✅ **Feat format multipac "NxMunitat" + "cl" (cl→ml) + expansió de packs/Nu a la compra** |

**Ítems resolts aquesta sessió**:
- ✅ **Format multipac "NxM<unitat>"** (ex: Cervesa "6x33cl" = 6 envasos de 33cl) + acceptació de "cl" (convertit a ml, ×10). `validateWeight` i `_normalizeWeightString` accepten el format pack i "cl"; `_parsePackContent` és el descodificador únic (`"Nu"`/`"NxM"` → `{isPack,count,perUnit}`).
- ✅ **Expansió de packs/Nu coherent a la compra** (BuyMe→EatMe). `_buildShoppingPrefill` (font única dels TRES camins: quick-buy individual, `tryQuickBuyShoppingItem`, bulk-buy) expandeix: `qty = parseQtyNumber(item.qty) × count`, `weight = perUnit`. Ex: comprar 2 packs de cervesa → 12 u × 330ml; 2 dotzenes d'ous → 24 u. `_quickBuyCore` usa `prefill.qty` ja expandit (no `item.qty` cru). El camí "+" directe del formulari (`_applyContentToAddForm`) posa `qty=count` SENSE multiplicar (correcte: no hi ha qty de compra). NO calia migració.

**📌 Pendents preexistents destapats en testejar (NO regressions; independents dels packs)**:
- ✅ **(A) El preu del lot a l'EatMe ara escala amb la qty comprada** (`fd5c5b5`). Desacoblat: `_buildShoppingPrefill` calcula `totalPrice = getEstimatedItemCost(item)` (cost total, amb l'item CRU abans de l'expansió — usa `parseQtyNumber(item.qty)` × ratio de weight, el mateix que el BuyMe), TRANSITORI. `prefill.price` per-unitat (prioritza `item.price` → popular → history) queda per a l'aprenentatge. `_quickBuyCore` propaga `productData.totalPrice`; `_buildLotFromNewProduct` fa `lot.price = totalPrice ?? price`. `totalPrice` mai es persisteix al lot/producte. Ex: 2 packs de cervesa @6€ → lot 12€, aprenentatge rep 6€.
- ✅ **(B) `_buildShoppingPrefill` ara respecta `item.weight` personalitzat** (`fd5c5b5`). `prefillWeight = item.weight || fromPopular.weight || fromHistory.weight`. Ex: 2 llets de 500ml (popular "Llet"="1L") → lot "2 u × 500ml" @ 1.20€ (coherent amb el BuyMe).
- ✅ **(C) L'aprenentatge ara preserva el weight del pack original** (`e500fc0`). `_buildShoppingPrefill` captura `originalWeight` (pre-expansió, transitori) i `_quickBuyCore` el passa a `recordProductInHistory` (que propaga a `addToCustomPopular`) en comptes del weight expandit. Així el popular/history learned aprenen el pack ("6x33cl"/"12u") i el lot manté l'expansió ("330ml") + `lot.price`=total. Abast: només quick-buy (el camí formulari "+" no es toca: l'usuari ja veu i accepta l'expansió al camp). La qty NO s'aprèn (correcte: el popular/history són plantilles, no registres de quantitat comprada). `originalWeight` no es persisteix.

- ✅ **Bug "producte acabat/minStock → BuyMe" amb pack/contables** (`45ea959`). En enviar un producte gastat o per llindar a la llista de la compra (`askAddToShoppingList` → `showManualAddToBuyMeModal` → `addToShoppingList`), s'enviava el **mirror agregat** `product.qty` (`_computeAggregatedQty`: "500 g", "1.98 L", "12") com a qty de compra + sense weight propi → el render feia fallback al weight del popular i mostrava combos absurds ("500 g × 250g", "1.98 L × 6x33cl", "12 × 12u") i preu inflat (ous 12 → 12 dotzenes ≈ 24€). Fix: nou helper pur `_deriveBuyMeFromProduct(product)` (biteme.js) → `{qty, content}` on `qty = ceil(getStockUnits / pack_count)` (envasos, no agregat; `minStock` està en unitats individuals → es divideix per pack_count; si units==0 usa minStock o 1) i `content` = weight per-envàs del popular. `showManualAddToBuyMeModal` prefilla l'input amb `_derived.qty` (editable); `addToShoppingList` rep un 4t arg `weight` i el desa explícit a `item.weight` (no fallback). Render `_formatShoppingNameWithWeight`: suprimeix el "1 ×" quan `qty=="1"` (mostra només el contingut: "1L"/"6x33cl"/"12u"); `qty>1` → "N × contingut". Resultat: Pa 2×250g → "2 × 250g"; Ous → "1 × 12u" preu correcte; Cervesa → "1 × 6x33cl"; Llet/Pollastre → "1L"/"1kg". CookMe (`addItemsToShop`) passa products sense weight i sense 4t arg → no-op. ⚠️ **NO hi ha migració retroactiva**: els items ja desats amb el bug vell (qty agregat) NO s'arreglen sols — cal esborrar-los i tornar-los a enviar des de l'EatMe perquè es regenerin.

---

## Pendents — Sessions 26-27/05 (encara oberts)

Detectats les sessions 26-27/05/26 i encara no completats a data 28/05:

- ~~**Bug visual residual al checkbox del toggle multi-lots**.~~ **✅ ACCEPTAT com a detall menor no bloquejant (03/06)**. Decisió definitiva de l'usuari: després de 9 intents fallits en 2 sessions (vegeu historial sota), es tanca acceptant l'estat actual (equivalent `aa39f6f`: `align-items:center` al label + `flex:1 1 auto` al span). NO s'hi gasten més sessions. Es preserva tot l'historial d'intents per si una sessió futura hi vol tornar amb cap fresc, però l'ítem NO és viu.

  El checkbox de "CREAR ENVASOS SEPARATS" no queda centrat al centre vertical del bloc de text quan el text fa wrap a 2-3 línies. L'usuari va aclarir amb captura "abans/després" que vol els 3 elements (checkbox, text, emoji ℹ️) tots al centre vertical del bloc complet, no alineats amb la primera línia.

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

- ~~**Polish formularis — estendre a les pantalles secundàries**~~ **✅ RESOLT (02/06, `9f03282`)**. `#screen-special-item-edit` i `#screen-supermarket-edit`: botó emoji compacte (`.emoji-button-compact` 52px, sense "Canviar emoji" — l'emoji picker en overlay ja existia) + densitat coherent (`form-group` 12px, input padding 10px 14px, valors copiats de `#screen-add`) + `.danger-btn margin-top` a CSS. (`#screen-location-edit` ja resolt a `4d7dbf1` el 27/05.) Al mateix commit: fix centrat del LLINDAR a `#screen-popular-edit` (`justify-content:center` al `.toggle-with-info`). Abast tancat: no calia layout horitzontal (1-3 camps).

- ~~**Migrar `prompt()` de dia setmana a `showSelectModal`** (`settings.js:689` `promptDayFor`)~~ **✅ RESOLT (28/05, commit `49c69ca`)**. Nou helper `showSelectModal(emoji, title, message, options, currentValue, onConfirm)` (settings.js, al costat de `showInputModal`) amb els 7 dies com a botons clicables. Patró A (clic = selecciona + tanca + desa), reutilitza `.modal-zone-option.selected`, tancament Cancel·la/ESC/clic-fora. Dies en ordre **Dilluns-first** mantenint el value `getDay()` (Dilluns=1…Diumenge=0); noms via `t('notifDayShort')`; el value es llegeix del closure per preservar el tipus number. Verificat estàticament (sintaxi + mapping); UI pendent de validació al mòbil iOS via test plan T1-T6.

- ~~**Llindar configurable per a l'avís d'afegir al BuyMe (BiteMe)**~~ **✅ RESOLT (01/06, sessió llindar minStock — vegeu bloc Sessió 01/06)**. Camp `minStock` al producte (mirror) + opcional al popular (herència). Default **0** (només avisa en acabar-se del tot = comportament històric). Helpers `getStockUnits` (compta envasos/unitats vius) + `_evaluateLowStock(product, prevBase)` (avisa si `base <= minStock && base < prevBase && !_lowStockWarned`; flag una-sola-vegada-per-episodi; guarda `_isProductInBuyMe`). Disparadors unificats: `_confirmLotConsume`, `finalizeConsumption`, `_confirmLotEdit` (a la baixa), `_addLotToProduct` (neteja flag en recompra). `_deleteLot` i `_executeMoveLot` exclosos. UI: `#input-minstock` + `#input-popular-minstock` amb botó ℹ️ + `_showInfoModal`; fila `#screen-add` reordenada a Quantitat|Preu|Llindar amb alineació flex-column (patró popular-edit).

---

## Pendents — Anteriors (detectats en sessions prèvies)

### Refactor de lots — continuació

- **Fase E** — Recent-purchases per lot (afegir `lotId` al payload de `recordPurchase`)
- **Fase F** — Banners per lot (smart-notifications referenciant lots concrets; `consumption_history` afegeix `lotId`)
- **Fase G** — Polish + sync hardening
- **Fase final** — Neteja de mirrors quan tots els callers usin helpers (`getLots`, `getPrimaryLot`, etc.)

### Bugs / millores acumulats

- ~~🔴 **Fix arrel CookMe→BuyMe (qty de cuina escrita com a qty de compra)**~~ **✅ RESOLT (06/06, validat a mòbil)** (detectat 06/06). **Fix aplicat**: `addItemsToShop` (cookme.js) fa lookup **plural-aware** del popular via `findProductForIngredient` (`6f20562`) i escriu `qty="1"` + `content=pop.weight` (per-envàs canònic), **descartant la qty de cuina** → en comprar, `_buildLotFromNewProduct` parseja `"1"` → `quantity` mode AMB content → el Cuinat el descompta amb el cervell actual. **Bug original**: `addItemsToShop`/`addMissingToBuyMe` (cookme.js ~1402) escriuen la **qty de CUINA** de la recepta (`ing.qty` escalada, p. ex. "1 unitat", "½", "unes fulles") com a qty de compra del BuyMe, i **sense weight/content** (`addToShoppingList` amb 3 args). **Conseqüència descoberta avui**: en comprar (BuyMe→EatMe), `_buildShoppingPrefill` recupera weight del popular si n'hi ha, però `_buildLotFromNewProduct` (biteme.js:1187) **no parseja** aquesta `qty` de cuina → cau a **`percent` sense `unit`**; si el producte tampoc té weight catalogat (enciam) → **sense content** → al Cuinat queda **`'manual'`** (no descomptable). **Fix**: escriure la **unitat de COMPRA** (qty `1` + `content` del popular: ous→`"12u"`, mel→el seu envàs…), **descartant la qty de cuina**. **Efecte esperat**: aquests productes cauran a **`quantity` mode AMB content** → el Cuinat ja els descompta amb el cervell actual (camí "tipus llet"), **SENSE** estendre el suport `percent`. **Follow-up OPCIONAL** (si després encara cal): extensió de descompte `percent` per a lots `percent` amb content convertible (formatge 250g). És el **fix ARREL** que desbloqueja el Cuinat per als contables.

- 🟡 **Matching ingredient↔catàleg robust (plurals -os/irregulars + i18n)** (06/06; actualitzat 07/06). **Base actual**: `cookmeSameProduct` (IGUALTAT de conjunts de tokens amb stem de plural), usada pel lookup de catàleg (`addItemsToShop`), la fusió de duplicats (`findDuplicateInSupermarket`, programàtic + manual) i el fallback de preu/weight al render — **✅ implementat `f69941c`**. Cobreix plurals catalans regulars (-a↔-es, masculí -s: ou↔ous, mongeta↔mongetes) i descarta compostos (formatge feta≠formatge, pa torrat≠pa). **Segueixen OBERTS**: plurals -os/irregulars (peix↔peixos, -ç→-ços) i i18n (en: tooth↔teeth; es). Els misses degraden suau (qty 1 sense content / no fusiona). Solució futura: capa d'àlies/sinònims per staple al catàleg (generalitzar el mapa de sinònims de pasta) + irregulars a mà; per i18n, àlies per idioma o referenciar l'id del catàleg en lloc del nom lliure. App avui CA-only en execució → i18n diferit.

- ~~**Catàleg popular: distingir unitats per a productes contables** (Ous = dotzena vs unitat, Cervesa = pack vs unitat, Llaunes = pack vs unitat). Camp `unitsPerPackage` o flag `isCountable`.~~ + ~~**Preu per unitat al catàleg**~~ **✅ COBERT pel fil de packs/preu (03/06 — investigació d'origen)**. L'ítem (detectat ~22-24/05, entrat al repo a `d340704`) era **híbrid**: enumerava casos concrets (Ous/Cervesa/Llaunes) però proposava una idea d'arquitectura (`unitsPerPackage`/`isCountable`). Els TRES casos concrets es van resoldre **per via string, sense introduir els camps formals**: Ous→`"12u"`, Cervesa/Llaunes→`"6x33cl"` (format `NxM`), tot descodificat per `_parsePackContent` + expansió/derivació a la compra (`f8b7d34` format "Nu" · `4f95e8f` multipac · `fd5c5b5` preu total del lot · `45ea959` EatMe→BuyMe envia envasos). El preu proporcional pes/volum ja el cobria `80a4e91`. **Veredicte**: enhancement cobert, cap repro viu; introduir `isCountable` ara seria refactor d'elegància que duplicaria info que l'string ja codifica. ⚠️ **3 matisos residuals — NO bloquejants, mai demanats** (documentats perquè una sessió futura no reobri el debat "falta isCountable" sense context): (1) no hi ha preu **per unitat individual** d'un contable (€/ou) — comprar una dotzena usa el preu de la dotzena, que és el que l'usuari vol; (2) un **iogurt "pack de N"** només és expressable com a `"4x125g"` (no hi ha "contable de N de 125g" altrament); (3) **fruita per peça sense `weight`** (Plàtans/Pomes) segueix estimant via pes mitjà per emoji (`PRODUCT_WEIGHTS_PER_UNIT`), no per compte real d'unitats.
- ~~**`_computeAggregatedQty` no combina `units × weight`** (2026-05-22)~~ **✅ RESOLT (verificat 28/05 amb test net)**. L'error original (`qty=4 weight=500g` → "Pasta 4") ja no es reprodueix. Test: crear producte nou `qty=4 weight=500g` → mostra "2 kg" correctament. Resolt pels fixos del 22-23/05: `_refreshProductMirrors` a `saveNewProduct` (commit `c63bd35`) + one-shots `runQtyAggregateUnitsWeightRefresh`/`runMirrorRefreshAllProductsRefresh`. El backlog item era obsolet (apuntat el 22/05, abans dels fixos). **NOTA**: la investigació del 28/05 va revelar un problema DIFERENT i encara obert — vegeu "Weights no parsejables creen agregacions mixtes" més avall.
- ~~**Render del lot oculta weights no parsejables** (2026-05-22)~~ **✅ RESOLT `4b6e794`** (23/05). `_renderLotRow` (biteme.js:1248-1251) ara pinta `weightText` tal qual sense filtre de parseig — el text lliure "mig kg" es mostra com és.
- ~~**Render del lot no mostra weight individual en productes multi-lot** (2026-05-22)~~ **✅ RESOLT `4b6e794`** (23/05). Cada fila del lot ara combina qty i weight amb separador `×` (`_renderLotRow` biteme.js:1245-1259).
- ~~**`_formatLotQty` retorna només el número quan `unit==='units'`** (2026-05-22)~~ **✅ RESOLT (28/05)**. Afegit sufix `' u'` a `_formatLotQty:676` (coherent amb el modal de consum, que ja mostrava "4 u" a biteme.js:1399). Ara: fila lot "4 u" / "4 u × 500g", toast "(4 u)", modal moure "4 u de Pasta".
- ~~**Coherència del sufix " u" al llistat principal**~~ **✅ RESOLT (03/06, render-only — validat a mòbil)**. El mirror `product.qty` es manté NET (enter pelat) i s'afegeix " u" només a la capa de display dels 5 callsites del BiteMe (`formatProductLine` a 524/3229/3298/3664 + calendar 508) via el helper `_displayProductQty(qty)` (afegeix " u" quan l'string és `/^\d+$/`; els casos amb unitat de pes/volum o percent es retornen sense canvis). NO s'ha tocat `formatProductLine` global (el comparteixen BuyMe/special-lists, on qty és quantitat de compra). `openProduct:3687` i `finalizeConsumption:3848` segueixen llegint `p.qty` net → intactes (per això NO calia desacoblar `parseQtyNumber`). Cas mixt "2 kg + 1": el "+1" no rep " u" (no matcheja `/^\d+$/`) — imperfecció acceptada, rara. _Context històric de per què NO es feia a l'origen:_ El push de `unitsTotal` segueix retornant `String(unitsTotal)` (ex: "4") sense " u", per tant un producte pure-units mostra "4 u" a la fila del lot però "4" al llistat principal (mirror `product.qty`). **NO s'ha estès el sufix** perquè `product.qty` NO és display-only: es parseja com a número via `parseQtyNumber(product.qty)` a (1) `openProduct:3435` — decideix si mostra el bloc "Has consumit X%" només quan qty NO és numèrica; (2) `finalizeConsumption:3594` — redueix la qty numèricament. `parseQtyNumber` (biteme.js:3554) només accepta `/^\d+(?:[.,]\d+)?$/`, així que "4 u" retornaria `null` i trencaria ambdues lògiques. **Fix correcte futur**: que aquests dos callers detectin la naturalesa numèrica via les dades del lot (`getPrimaryLot().unit`/`qtyRemaining`) en comptes de string-parsejar el mirror de display; un cop desacoblat, estendre " u" a `_computeAggregatedQty:769`.
- ~~**Propagar weight en altres camins de creació de shoppingItem** (2026-05-24).~~ **✅ COBERT / RECLASSIFICAT (05/06 — investigació, sense canvis de comportament)**. Investigats els 3 camins després de `45ea959`:
  - **(1) EatMe→BuyMe** (`askAddToShoppingList → showManualAddToBuyMeModal → addToShoppingList`, buyme.js:2525): **JA propaga** ✅. Passa el 4t arg `content || _derived.content`, on `_deriveBuyMeFromProduct` (biteme.js:1387) deriva el **per-envàs del popular** (pop.weight primer, "6x33cl"/"12u"), editable a l'input. Resolt per `45ea959`. (El "quick-buy a buyme.js:2002" del backlog vell ja no existeix — refactoritzat en aquest mateix camí del modal.)
  - **(2) CookMe** (`addItemsToShop`, cookme.js:1011): **NO APLICA** — `product = {name, emoji}` i ingredients `{name, emoji, qty}`, sense weight a l'origen. Crida amb 3 args → no-op correcte.
  - **(3) special-lists** (`addSpecialListToSupermarket`, special-lists.js:~429): **NO APLICA** — no crida `addToShoppingList`; fa push directe amb model `{name, emoji, qty}` (zero ocurrències de `weight`). Res a propagar.
  - **Fallback de render**: `_buildShoppingItemRow` (buyme.js:743-751) cau al `popular.weight` per nom quan `item.weight` és absent — **és l'única font correcta per (2)/(3) i per items legacy; s'ha de mantenir.**
  - **Forat latent (NO actiu)**: el fallback `product.weight` dins `addToShoppingList` (buyme.js:2437) podria filtrar un weight **expandit** si un caller futur passés un producte/lot amb weight expandit i ometés el 4t arg → reintroduiria la regressió de packs de `45ea959`. Documentat amb comentari "REGLA D'OR" al codi (05/06). Avui cap caller ho fa. Si es vol blindar del tot, fer que el fallback derivi del per-envàs en comptes de `product.weight` cru — preventiu, no bug viu.
- ~~**Fusió/avís d'ítems duplicats al BuyMe** (2026-05-24)~~ **✅ RESOLT (31/05, `7b9b2df` + `573826d`)**. Opció B (avisar abans d'afegir): en crear un ítem nou al mateix super amb nom ja existent es mostra `showDuplicateShoppingModal` (3 botons: Fusionar quantitats / Crear igualment / Cancel·la). La clau de duplicat és **nom normalitzat + weight normalitzat** (decisió de disseny revisada 31/05 després de provar): mateix nom+weight → duplicat; weight diferent → productes diferents; tots dos sense weight → duplicat; un amb weight i l'altre no → diferents. `findDuplicateInSupermarket(name, weight, supermarketId, excludeId)` compara `normW(it.weight)===targetW` (cobreix els 4 casos). Validat a mòbil real amb tests T8'/T9/T10/T11 (inclou modal `showDuplicateShoppingModal` + botó Fusionar). La detecció NO actua en editar (només en crear). `7b9b2df` = lògica buyme.js; `573826d` = claus i18n (`duplicateTitle`/`duplicateSub`/`mergeBtn`/`createAnywayBtn`/`merged`) + CSS `.modal-buttons.modal-buttons-col`.
- ~~**Weights no parsejables creen agregacions mixtes lletges** (detectat 28/05)~~ **✅ RESOLT (31/05 — Opció A: validació de format al camp weight)**. Nou helper `validateWeight(raw)` → `{valid, normalized, error}` (biteme.js, després de `_normalizeWeightString`, reutilitzable cross-module): accepta buit (opcional), exigeix número (decimal . o ,) + unitat (g/kg/ml/l), normalitza la sortida ("1l"→"1L", "0,5 KG"→"0.5kg") i rebutja text lliure ("mig kilo"), números pelats ("500") i valors ≤0. Aplicat als 4 punts d'entrada (Z lleugera — vora vermella `.input-invalid` al blur, bloqueig amb toast `weightInvalid` al desar): `#input-weight` (saveNewProduct), `#input-popular-weight` (savePopularEdit, que abans ni normalitzava), `#input-shopping-weight` (saveShoppingItem) i `#lot-edit-weight` (confirm-handler de openLotEditModal). `setupWeightValidation()` enganxa el blur als 3 inputs estàtics + patch de `showScreen` per re-validar en obrir; el modal de lot enganxa el seu blur a l'overlay. Sense migració automàtica: els lots existents amb "mig kilo" surten vermells en editar-los i no es poden desar fins corregir-los; `_computeAggregatedQty` NO es toca (l'Opció A actua a l'origen). Detall històric del bug: Quan un producte multi-lot té alguns lots amb weight parsejable ("500g") i altres amb text lliure ("mig kilo"), `_computeAggregatedQty` suma els parsejables com a pes i compta els no-parsejables com a unitats soltes, donant resultats com "4.5 kg + 1". Exemple real: Pasta amb 4 lots (3 amb "500g" + 1 amb "mig kilo") → "4.5 kg + 1". Causa: la branca units×weight de `_computeAggregatedQty` (biteme.js:722-744) només converteix lots amb weight que parseja amb `/^([\d.,]+)\s*(ml|l|g|kg)$/i`; els que no parsegen cauen a `unitsTotal`. **Decisió de disseny pendent** (cal triar): (A) validar el format del weight al modal d'edició del lot (rebutjar "mig kilo", forçar numèric+unitat); (B) permetre text lliure però mostrar-lo separat sense agregar (ex: "4.5 kg" + nota "1 lot amb pes lliure"); (C) acceptar el comportament actual ("4.5 kg + 1") com a tècnicament correcte tot i ser lleig; (D) interpretar texts comuns ("mig kilo"→500g, "un quilo"→1kg) amb un petit diccionari.

### Features grans pendents

- ~~**Feature "Cuinat" v2 / "He cuinat"** (cuinar una recepta i descomptar ingredients dels lots).~~ **✅ FET (05-06/06, Fases 0–2b-2b — validat a mòbil)**. Commits: `9c19fa5` (quantitats estructurades `amount`+`unit` als 345 ingredients de `recipes-data.js`, `qty` intacte) · `2540284` (`findProductForIngredient`, pont matcher→producte) · `46af99b` (cervell READ-ONLY: `buildCookConsumePlan` + `planProductLotCascade` cascada FEFO + conversió **conscient del content**) · `66481bc` (executor `executeCookConsume`, mirall del nucli `quantity` de `_confirmLotConsume`, un sol `saveData`) · `9fd7322` (modal `openCookConsumeModal` + `incrementRecipeCooked` + estils) · `d0af813` (botó `#recipe-cooked` + fila horitzontal). **Flux**: detall recepta → 🍳 **He cuinat** → modal (files `ok` editables + secció info per `manual`/al gust/no en tens) → descompte FEFO conscient del content → **toast resum + re-render + recompte cuinada + XP**.
  - ⚠️ **Pendents NO bloquejants (documentats)**:
    - **Low-stock 🛒 diferit durant el cuinat**: l'executor NO dispara els avisos de stock baix (MVP els deixa fora; evita N modals encolats). Caldria una passada única en acabar.
    - **Lots `percent` i productes sense weight catalogat** (p. ex. **enciam**) queden en **`'manual'`** per disseny (no es descompten sols). NO és bug: és el catch-all de `_buildLotFromNewProduct`. El **fix arrel** que ho corregeix és el de CookMe→BuyMe (vegeu "Bugs / millores acumulats").
    - **Editor de receptes perd `amount`/`unit`**: receptes **custom** i **`recipeOverrides`** desen només la `qty` text → els seus ingredients surten **no quantificables** al Cuinat (`amount:null`). Cal capturar o derivar `amount`+`unit` a l'editor (`saveRecipeFromForm`).
    - **`findProductForIngredient` retorna el PRIMER producte que casa** (sense desambiguació quan en casen diversos) — limitació MVP acceptada. NO confondre amb els falsos positius del matcher, que ja es van resoldre a `6f20562`.
  - 🔧 **Follow-ups OPCIONALS (només DESPRÉS del fix arrel)**: (a) extensió de descompte **percent** al Cuinat (lots `percent` amb content convertible, p. ex. formatge 250g); (b) ampliar la visibilitat del botó "He cuinat" + permetre marcar cuinada encara que no es descompti tot.
- ~~**Refactor de `calculateRecipeMatch`** — falsos positius greus (sucre→Mel, canyella→Crema catalana).~~ **✅ RESOLT (03/06, matcher per nom — validat a mòbil)**. `matchIngredient` reescrit a `cookme.js`: **emoji fora** del matching (els emojis de recepta són decoratius i col·lisionen → sucre 🍯=Mel, canyella 🍮=Crema), match **per nom i paraula completa** (subconjunt bidireccional de tokens, no substring intern → mata "all"⊂"galletes"/"pa"⊂"pasta"), **stem de plural català** (femení -a↔-es: ceba→Cebes, poma→Pomes, taronja→Taronges, pastanaga→Pastanagues), **guarda de compostos** ("llet de coco" exigeix superset → no casa amb "Llet"), i **mapa de 6 sinònims** família pasta (espaguetis/macarrons/fideus/fideua/lasanya/plaques → pasta). Auditoria 80 receptes × 89 ingredients: ~44 falsos positius eliminats, 0 matches legítims amb producte exacte perduts, 2 sobre-matches lleus residuals inofensius (Tomàquet fregit, Fruita). **ZERO canvis al DATA de les receptes.** Memòria del primer intent: `project-recipe-matching-and-cook-feature`. (El **Cuinat v2** —quantitats absolutes + consum de lots— segueix OBERT a la línia de dalt; aquest fix només era el matcher.)
- **Importar receptes des d'un fitxer (enhancement CookMe, NO per ara, no bloquejant)** — idea: l'usuari descarrega un **fitxer de MOSTRA** (plantilla amb el format de recepta), l'edita amb les seves receptes i el torna a pujar per afegir-les **en bloc** al Cuinat. Ha d'incloure el fitxer de mostra descarregable. Pendent de decidir format (JSON amb l'esquema de `RECIPES`, o CSV més amigable) i UX d'importació (validació + fusió amb `customRecipes`).

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
