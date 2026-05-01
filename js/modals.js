/* ============================================
   Buyte — js/modals.js
   Modals reutilitzables del detall de producte:
   editar data, canviar zona, recalcular caducitat,
   editar quantitat.
   ============================================ */


function showChangeDateModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const currentDate = product.date || '';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📅</div>
      <p class="modal-title">${t('editDate')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji)} ${formatProductLine(product.name, product.qty)}</p>
      <input type="date" id="modal-date-input" class="select-input" value="${currentDate}" style="margin:12px 0">
      <label class="no-expiry-label" style="margin:0">
        <input type="checkbox" id="modal-no-expiry" ${product.noExpiry ? 'checked' : ''}>
        <span data-i18n="noExpiry">${t('noExpiry')}</span>
      </label>
      <div class="modal-buttons" style="margin-top:14px">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const newDate = document.getElementById('modal-date-input').value;
    const noExp = document.getElementById('modal-no-expiry').checked;
    const p = products.find(x => x.id === product.id);
    if (!p) {
      document.body.removeChild(overlay);
      return;
    }
    if (noExp) {
      p.noExpiry = true;
      p.date = null;
    } else if (newDate) {
      p.noExpiry = false;
      p.date = newDate;
    } else {
      showToast(t('needDate'));
      return;
    }
    saveData();
    document.body.removeChild(overlay);
    // Refresca el detall mantenint la navegació enrere actual
    openProduct(p.id);
    showToast(t('saved'));
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showChangeZoneModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const zonesList = locations.map(loc => {
    const isSelected = loc.id === product.location;
    return `
      <button class="modal-zone-option${isSelected ? ' selected' : ''}" data-zone="${loc.id}">
        <span style="font-size:24px;margin-right:10px">${loc.emoji}</span>
        <span>${escapeHtml(getLocationName(loc))}</span>
      </button>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📍</div>
      <p class="modal-title">${t('changeZone')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji)} ${formatProductLine(product.name, product.qty)}</p>
      <div class="modal-supermarket-list">${zonesList}</div>
      <button class="modal-cancel" id="modal-no-btn" style="margin-top:10px">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-zone-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const newZone = btn.dataset.zone;
      document.body.removeChild(overlay);
      if (newZone === product.location) return;
      // Pregunta si vol recalcular caducitat
      askRecalcExpiry(product, newZone);
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function askRecalcExpiry(product, newZone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📅</div>
      <p class="modal-title">${t('recalcExpiry')}</p>
      <p class="modal-sub">${t('recalcExpirySub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('keepDate')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('recalc')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Aplicar canvi de zona en ambdós casos
  const applyZoneChange = (recalc) => {
    const p = products.find(x => x.id === product.id);
    if (!p) return;
    p.location = newZone;
    if (recalc) {
      // Si tenim baseDays a l'historial o als populars, recalcular
      const baseDays = (function() {
        const h = productHistory.find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (h && h.days) return h.days;
        const pop = (typeof getPopularProducts === 'function' ? getPopularProducts() : [])
          .find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (pop && pop.days) return pop.days;
        return 7;
      })();
      const finalDays = (typeof computeDaysForLocation === 'function')
        ? computeDaysForLocation(newZone, baseDays, [])
        : baseDays;
      const d = new Date();
      d.setDate(d.getDate() + finalDays);
      p.date = formatDateForInput(d);
    }
    saveData();
    // Refresc del detall mantenint la navegació enrere actual
    openProduct(p.id);
    showToast('✓ ' + t('movedToZone') + ' ' + getLocationName(getLocationById(newZone)));
  };

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    applyZoneChange(false);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    applyZoneChange(true);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      applyZoneChange(false);
    }
  });
}

// Slider de consum parcial. Si l'usuari ja havia consumit part del producte
// (alreadyConsumed > 0), el slider 0-100 representa el % "del que queda",
// no del total. onConfirm rep dos arguments:
//   absolutePercent — % real respecte al producte original (per a stats i acumulació)
//   sliderPercent   — el valor que l'usuari ha vist al slider (per al toast)
function showConsumptionSliderModal(product, action, onConfirm, alreadyConsumed) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const question = action === 'consumed' ? t('consumedQuestion') : t('wastedQuestion');
  const already = Math.max(0, Math.min(99, alreadyConsumed || 0));
  const remaining = 100 - already; // % màxim de l'original que es pot consumir ara

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${product.emoji}</div>
      <p class="modal-title">${question}</p>
      <p class="modal-product-name">${escapeHtml(product.name)}</p>
      <p class="consumption-percent" id="consumption-percent">100%</p>
      <input type="range" min="0" max="100" value="100" step="1" class="consumption-slider" id="consumption-slider">
      <div class="consumption-chips">
        <button type="button" class="consumption-chip" data-val="25">${t('quarter')}</button>
        <button type="button" class="consumption-chip" data-val="50">${t('half')}</button>
        <button type="button" class="consumption-chip" data-val="75">${t('threeQuarters')}</button>
        <button type="button" class="consumption-chip" data-val="100">${t('all')}</button>
      </div>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const slider = overlay.querySelector('#consumption-slider');
  const display = overlay.querySelector('#consumption-percent');

  const updateFill = () => {
    const v = parseInt(slider.value);
    display.textContent = v + '%';
    slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${v}%, var(--bg-secondary) ${v}%, var(--bg-secondary) 100%)`;
  };
  updateFill();

  slider.addEventListener('input', updateFill);

  overlay.querySelectorAll('.consumption-chip').forEach(c => {
    c.addEventListener('click', () => {
      slider.value = c.dataset.val;
      updateFill();
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const sliderPercent = parseInt(slider.value);
    const absolutePercent = Math.round(sliderPercent * remaining / 100);
    document.body.removeChild(overlay);
    onConfirm(absolutePercent, sliderPercent);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showEditQtyModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${product.emoji}</div>
      <p class="modal-title">${t('editQtyTitle')}</p>
      <p class="modal-product-name">${escapeHtml(product.name)}</p>
      <p class="modal-sub">${t('editQtySub')}</p>
      <input type="text" id="modal-qty-input" class="modal-qty-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(product.qty || '')}" maxlength="20">
      <div class="modal-qty-suggestions">
        <button class="modal-qty-chip" data-val="100%">100%</button>
        <button class="modal-qty-chip" data-val="3/4">3/4</button>
        <button class="modal-qty-chip" data-val="1/2">1/2</button>
        <button class="modal-qty-chip" data-val="1/4">1/4</button>
      </div>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#modal-qty-input');
  setTimeout(() => input.focus(), 100);

  overlay.querySelectorAll('.modal-qty-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.val;
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const newQty = input.value.trim();
    const p = products.find(x => x.id === product.id);
    if (p) {
      p.qty = newQty;
      saveData();
      const days = daysUntil(p.date);
      const loc = getLocationById(p.location || 'fridge');
      const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' · ' : '';
      document.getElementById('product-days').textContent = locStr + daysText(days);
      document.getElementById('product-name').innerHTML = formatProductLine(p.name, p.qty);
    }
    document.body.removeChild(overlay);
    showToast('✓ ' + t('saved'));
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}
