// map.js — SVG map interaction: coloring, army badges, click handling.
window.RISK_MAP = (function () {
  const C = window.RISK_CONFIG;
  const R = window.RISK_RULES;
  const U = window.RISK_UTILS;
  const S = window.RISK_STATE;

  let svgEl = null;
  let containerEl = null;
  let badgeLayer = null;
  let clickHandler = null;
  let highlightSet = new Set();

  function init(container) {
    containerEl = container;
    return fetch('assets/map.svg')
      .then(r => r.text())
      .then(svg => {
        container.innerHTML = svg;
        svgEl = container.querySelector('svg');
        // Create badgeLayer as an SVG group element
        badgeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        badgeLayer.setAttribute('id', 'svg-badge-layer');
        svgEl.appendChild(badgeLayer);
        attachHandlers();
        render();
        S.on('territory', renderTerritory);
        S.on('player', render);
        S.on('phase', render);
        S.on('reinforcements', render);
        S.on('init', render);
        S.on('conquest', (info) => flashTerritory(info.toId, 'conquest'));
        S.on('combat', () => {/* dice handled by modal */});
      });
  }

  function setClickHandler(fn) { clickHandler = fn; }

  function attachHandlers() {
    if (!svgEl) return;
    // Click on army badges (data-badge) or territory polygons (data-territory)
    svgEl.addEventListener('click', (e) => {
      let el = e.target;
      while (el && el !== svgEl && !el.dataset?.badge && !el.dataset?.territory) el = el.parentElement;
      if (el) {
        const id = el.dataset.badge || el.dataset.territory;
        if (id && clickHandler) clickHandler(id);
      }
    });
    // Tooltip on badge or territory hover
    svgEl.addEventListener('mousemove', (e) => {
      let el = e.target;
      while (el && el !== svgEl && !el.dataset?.badge && !el.dataset?.territory) el = el.parentElement;
      const tip = document.getElementById('tooltip');
      if (el) {
        const id = el.dataset.badge || el.dataset.territory;
        if (id) {
          const t = C.TERRITORIES[id];
          const state = S.get();
          const ts = state.territories[t.id];
          const owner = ts.owner >= 0 ? state.players[ts.owner].name : 'Unclaimed';
          tip.style.display = 'block';
          tip.style.left = (e.pageX + 14) + 'px';
          tip.style.top = (e.pageY + 14) + 'px';
          tip.innerHTML = `<strong>${t.name}</strong><br>Owner: ${owner}<br>Armies: ${ts.armies}`;
          return;
        }
      }
      tip.style.display = 'none';
    });
    svgEl.addEventListener('mouseleave', () => {
      const tip = document.getElementById('tooltip');
      if (tip) tip.style.display = 'none';
    });
  }

  function getTerritoryEl(id) {
    return svgEl?.querySelector(`[data-territory="${id}"]`);
  }

  function applyFill(id, color) {
    const el = getTerritoryEl(id);
    if (!el) return;
    el.style.fill = color;
  }

  function getTerritoryColor(id, ownerHex) {
    if (!ownerHex) {
      // Unclaimed — show continent base color
      return C.CONTINENTS[C.TERRITORIES[id].continent].color;
    }
    // 60% player color / 40% continent base for depth
    const contColor = C.CONTINENTS[C.TERRITORIES[id].continent].color;
    return U.mix(contColor, ownerHex, 0.6);
  }

  function renderTerritory(id) {
    const state = S.get();
    if (!state) return;
    const t = state.territories[id];
    const owner = t.owner >= 0 ? state.players[t.owner] : null;
    const color = getTerritoryColor(id, owner ? owner.colorHex : null);
    applyFill(id, color);
    renderBadge(id);
    applyHighlights();
  }

  function renderBadge(id) {
    const state = S.get();
    const t = state.territories[id];
    const meta = C.TERRITORIES[id];
    const existing = badgeLayer.querySelector(`[data-badge="${id}"]`);
    if (existing) existing.remove();
    if (t.armies <= 0) return;
    const owner = t.owner >= 0 ? state.players[t.owner] : null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-badge', id);
    g.setAttribute('class', 'svg-army-badge');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', meta.cx);
    circle.setAttribute('cy', meta.cy);
    circle.setAttribute('r', 9);
    circle.setAttribute('fill', owner ? owner.colorHex : '#9ca3af');
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '1');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', meta.cx);
    text.setAttribute('y', meta.cy + 1);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'Inter, system-ui, sans-serif');
    text.setAttribute('font-size', '8px');
    text.setAttribute('font-weight', 'bold');
    text.textContent = t.armies;

    g.appendChild(circle);
    g.appendChild(text);
    badgeLayer.appendChild(g);
  }

  function getBadgeEl(id) {
    return badgeLayer?.querySelector(`[data-badge="${id}"]`);
  }

  let highlightMap = new Map(); // id -> kind

  function applyHighlights() {
    if (!badgeLayer) return;
    badgeLayer.querySelectorAll('[data-badge]').forEach(el => {
      el.classList.remove('hl-valid', 'hl-target', 'hl-selected', 'hl-source', 'hl-connected', 'hl-blocked');
    });
    for (const [id, kind] of highlightMap.entries()) {
      const el = getBadgeEl(id);
      if (el) el.classList.add('hl-' + kind);
    }
  }

  function setHighlights(ids, kind = 'valid', clearExisting = true) {
    if (clearExisting) {
      highlightMap.clear();
    }
    for (const id of ids) {
      highlightMap.set(id, kind);
    }
    applyHighlights();
  }

  function clearHighlights() {
    highlightMap.clear();
    applyHighlights();
  }

  function flashTerritory(id, kind) {
    const el = getBadgeEl(id);
    if (!el) return;
    el.classList.add('flash-' + kind);
    setTimeout(() => el.classList.remove('flash-' + kind), 800);
  }

  function render() {
    const state = S.get();
    if (!state) return;
    if (badgeLayer) badgeLayer.innerHTML = '';
    for (const id in state.territories) {
      renderTerritory(id);
    }
  }

  return { init, setClickHandler, setHighlights, clearHighlights, flashTerritory, render, renderTerritory };
})();
