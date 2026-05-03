/* ============================================
   Buyte — js/modals.js
   Modals reutilitzables: confirmacions de perill i el slider
   de consum parcial. L'edició de producte (data, zona, qty,
   preu, pes) es fa al formulari screen-add en mode edició.
   ============================================ */


// Slider de consum parcial. Per a productes amb qty numèrica pura ofereix
// dues pestanyes: "Per unitats" (chips/stepper amb el comptador) i "Per %"
// (slider 0-100). En canviar de pestanya, el valor es manté equivalent
// (ex: 1 de 4 ↔ 25%).
//
// Si l'usuari ja havia consumit part del producte (alreadyConsumed > 0),
// el slider de % representa el % "del que queda", no del total.
//
// onConfirm rep:
//   absolutePercent — % real respecte al producte original (per a stats i acumulació)
//   sliderPercent   — el valor que l'usuari ha vist (per al toast)
function showConsumptionSliderModal(product, action, onConfirm, alreadyConsumed) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const question = action === 'consumed' ? t('consumedQuestion') : t('wastedQuestion');
  const already = Math.max(0, Math.min(99, alreadyConsumed || 0));
  const remaining = 100 - already;

  // Si la qty és un número pur (>= 1), oferim les dues pestanyes
  const qtyNum = (typeof parseQtyNumber === 'function') ? parseQtyNumber(product.qty) : null;
  const showTabs = qtyNum !== null && qtyNum >= 1;
  const isConsumed = action === 'consumed';
  const UNITS_CHIPS_MAX = 12;

  // Per defecte assumim el cas més habitual: t'ho has menjat / llençat tot.
  // Per unitats → totes (qty completa). Per % → 100%.
  let activeTab = 'units';
  let currentUnits = qtyNum && qtyNum > 0 ? qtyNum : 1;
  let currentPercent = 100;

  // Render dels chips d'unitats (si qty no és gaire gran)
  const unitsChipsHtml = () => {
    let html = '<div class="units-selector units-chips-container">';
    for (let i = 0; i <= qtyNum; i++) {
      html += `<button type="button" class="units-chip${i === currentUnits ? ' active' : ''}" data-units="${i}">${i}</button>`;
    }
    html += '</div>';
    return html;
  };

  // Render del stepper (per a qty grans)
  const unitsStepperHtml = () => `
    <div class="units-selector units-stepper">
      <button type="button" class="units-stepper-btn" id="units-decr" aria-label="-">−</button>
      <span class="units-stepper-value" id="units-value">${currentUnits}</span>
      <span class="units-stepper-max">/ ${qtyNum}</span>
      <button type="button" class="units-stepper-btn" id="units-incr" aria-label="+">+</button>
    </div>
  `;

  const halfUnits = Math.max(1, Math.round(qtyNum / 2));
  const tabsHtml = showTabs ? `
    <div class="consume-tabs">
      <button type="button" class="consume-tab active" data-tab="units">${t('tabByUnits')}</button>
      <button type="button" class="consume-tab" data-tab="percent">${t('tabByPercent')}</button>
    </div>
  ` : '';

  const unitsPanelHtml = showTabs ? `
    <div class="consume-panel" id="consume-panel-units">
      <p class="consume-panel-label">${isConsumed ? t('howManyConsumed') : t('howManyTrashed')}</p>
      <div id="units-selector-host">${qtyNum <= UNITS_CHIPS_MAX ? unitsChipsHtml() : unitsStepperHtml()}</div>
      <div class="consumption-chips units-quick">
        <button type="button" class="consumption-chip" data-units="${halfUnits}">${t('half')}</button>
        <button type="button" class="consumption-chip" data-units="${qtyNum}">${t('all')}</button>
      </div>
    </div>
  ` : '';

  const percentPanelHtml = `
    <div class="consume-panel${showTabs ? ' consume-panel-hidden' : ''}" id="consume-panel-percent">
      <p class="consumption-percent" id="consumption-percent">${currentPercent}%</p>
      <input type="range" min="0" max="100" value="${currentPercent}" step="1" class="consumption-slider" id="consumption-slider">
      <div class="consumption-chips">
        <button type="button" class="consumption-chip" data-val="25">${t('quarter')}</button>
        <button type="button" class="consumption-chip" data-val="50">½</button>
        <button type="button" class="consumption-chip" data-val="75">${t('threeQuarters')}</button>
        <button type="button" class="consumption-chip" data-val="100">${t('all')}</button>
      </div>
    </div>
  `;

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${product.emoji}</div>
      <p class="modal-title">${question}</p>
      <p class="modal-product-name">${escapeHtml(product.name)}</p>
      ${tabsHtml}
      ${unitsPanelHtml}
      ${percentPanelHtml}
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const slider = overlay.querySelector('#consumption-slider');
  const display = overlay.querySelector('#consumption-percent');

  const updateSliderUI = () => {
    const v = currentPercent;
    slider.value = v;
    display.textContent = v + '%';
    slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${v}%, var(--bg-secondary) ${v}%, var(--bg-secondary) 100%)`;
  };
  updateSliderUI();

  slider.addEventListener('input', () => {
    currentPercent = parseInt(slider.value);
    updateSliderUI();
  });

  // Chips ràpids del slider de %
  overlay.querySelectorAll('#consume-panel-percent .consumption-chip').forEach(c => {
    c.addEventListener('click', () => {
      currentPercent = parseInt(c.dataset.val);
      updateSliderUI();
    });
  });

  // Lògica del panell d'unitats
  if (showTabs) {
    const unitsHost = overlay.querySelector('#units-selector-host');

    const updateUnitsUI = () => {
      if (qtyNum <= UNITS_CHIPS_MAX) {
        unitsHost.querySelectorAll('.units-chip').forEach(c => {
          c.classList.toggle('active', parseInt(c.dataset.units) === currentUnits);
        });
      } else {
        const valEl = unitsHost.querySelector('#units-value');
        if (valEl) valEl.textContent = currentUnits;
      }
    };

    const setUnits = (n) => {
      currentUnits = Math.max(0, Math.min(qtyNum, n));
      updateUnitsUI();
    };

    if (qtyNum <= UNITS_CHIPS_MAX) {
      unitsHost.querySelectorAll('.units-chip').forEach(c => {
        c.addEventListener('click', () => setUnits(parseInt(c.dataset.units)));
      });
    } else {
      const decr = unitsHost.querySelector('#units-decr');
      const incr = unitsHost.querySelector('#units-incr');
      if (decr) decr.addEventListener('click', () => setUnits(currentUnits - 1));
      if (incr) incr.addEventListener('click', () => setUnits(currentUnits + 1));
    }

    overlay.querySelectorAll('#consume-panel-units .units-quick .consumption-chip').forEach(c => {
      c.addEventListener('click', () => setUnits(parseInt(c.dataset.units)));
    });

    // Tabs
    const switchTab = (tab) => {
      if (tab === activeTab) return;
      // Mantenim equivalència: derivem el valor de la pestanya destí
      if (activeTab === 'units' && tab === 'percent') {
        currentPercent = qtyNum > 0 ? Math.round((currentUnits / qtyNum) * 100) : 0;
        updateSliderUI();
      } else if (activeTab === 'percent' && tab === 'units') {
        const derived = Math.round((currentPercent / 100) * qtyNum);
        currentUnits = Math.max(0, Math.min(qtyNum, derived));
        updateUnitsUI();
      }
      activeTab = tab;
      overlay.querySelectorAll('.consume-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
      });
      overlay.querySelector('#consume-panel-units').classList.toggle('consume-panel-hidden', tab !== 'units');
      overlay.querySelector('#consume-panel-percent').classList.toggle('consume-panel-hidden', tab !== 'percent');
    };

    overlay.querySelectorAll('.consume-tab').forEach(el => {
      el.addEventListener('click', () => switchTab(el.dataset.tab));
    });
  }

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    // Calculem el percent segons la pestanya activa
    let chosenPercent;
    if (showTabs && activeTab === 'units') {
      chosenPercent = qtyNum > 0 ? Math.round((currentUnits / qtyNum) * 100) : 0;
    } else {
      chosenPercent = currentPercent;
    }
    const absolutePercent = Math.round(chosenPercent * remaining / 100);
    document.body.removeChild(overlay);
    onConfirm(absolutePercent, chosenPercent);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

