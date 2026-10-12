/* CombatAdvanced Tiers: the public pages.
 *
 * Everything shown comes from two files next to this one:
 *   data/config.json   the site's name, the game modes, the points for each
 *                      tier, titles, region colours and where skins come from
 *   data/players.json  every player and their tier in each mode
 *
 * The site is one page with hash addresses, so any static host serves it
 * (GitHub Pages included) and a refresh never 404s:
 *   #/rankings/overall   the overall ranking (the default)
 *   #/rankings/<mode>    one mode's tier list, Tier 1 to Tier 5
 *   #/player/<name>      a player's profile, over the list behind it
 *   #/edit               the editor, in editor.js
 */
(function () {
  'use strict';

  const DEFAULTS = {
    siteName: 'Tier List',
    serverName: '',
    serverIp: '',
    discord: '',
    github: { owner: '', repo: '', branch: 'main', path: 'data/players.json' },
    modes: [],
    points: { HT1: 60, LT1: 45, HT2: 30, LT2: 20, HT3: 10, LT3: 6, HT4: 4, LT4: 3, HT5: 2, LT5: 1 },
    titles: [
      { name: 'Combat Grandmaster', minPoints: 400, color: '#fbbf24' },
      { name: 'Combat Master', minPoints: 250, color: '#c084fc' },
      { name: 'Combat Ace', minPoints: 100, color: '#f87171' },
      { name: 'Combat Specialist', minPoints: 50, color: '#38bdf8' },
      { name: 'Combat Cadet', minPoints: 20, color: '#34d399' },
      { name: 'Combat Novice', minPoints: 10, color: '#a3b1c6' },
      { name: 'Rookie', minPoints: 0, color: '#7b8496' }
    ],
    regions: {},
    skins: {
      bust: 'https://render.crafty.gg/3d/bust/{name}',
      head: 'https://mc-heads.net/head/{name}/128',
      face: 'https://mc-heads.net/avatar/{name}/64',
      faceBackup: 'https://minotar.net/helm/{name}/64'
    }
  };

  const LEVEL_NAMES = { H: 'High', M: 'Mid', L: 'Low' };

  const STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const SWORD_SMALL = '<path d="M12 2l1.6 2v9.5h-3.2V4z"/><path d="M8.5 13.5h7v1.8h-7z"/><path d="M11.2 15.3h1.6v4h-1.6z"/><path d="M10.6 19.3h2.8v1.8h-2.8z"/>';
  const ICONS = {
    // Game modes (a config.json mode picks one with "icon")
    overall: '<path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4.5v1.5a3 3 0 0 0 3 3M17 5h2.5v1.5a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M11 12.5h2V17h-2z"/><path d="M7.5 17.5h9a1 1 0 0 1 1 1V21h-11v-2.5a1 1 0 0 1 1-1z"/>',
    classic: `<g transform="rotate(45 12 12)">${SWORD_SMALL}</g><g transform="rotate(-45 12 12)">${SWORD_SMALL}</g>`,
    sword: '<g transform="rotate(45 12 12)"><path d="M12 1.5l2 2.5v10h-4V4z"/><path d="M7.5 14h9v2h-9z"/><path d="M11 16h2v4.5h-2z"/><path d="M10.2 20.5h3.6v2h-3.6z"/></g>',
    trident: '<path d="M5 3.5L6.5 2 8 3.5V8h8V3.5L17.5 2 19 3.5V9a1.5 1.5 0 0 1-1.5 1.5H13V22h-2V10.5H6.5A1.5 1.5 0 0 1 5 9z"/><path d="M12 1l1.6 2.2H13V8h-2V3.2h-.6z"/>',
    pot: '<path d="M10 4.6h4v5.2a6 6 0 1 1-4 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.4 15.4h11.2a5.6 5.6 0 0 1-11.2 0z"/><path d="M9.2 2h5.6v2.4H9.2z"/>',
    uhc: '<path d="M12 7.3c1.5-1.2 4.4-1.6 6.1.3 1.9 2.2 1.5 6.5-.5 9.4-1.3 1.9-2.6 3.4-4 3.4-.8 0-1.1-.4-1.6-.4s-.8.4-1.6.4c-1.4 0-2.7-1.5-4-3.4-2-2.9-2.4-7.2-.5-9.4 1.7-1.9 4.6-1.5 6.1-.3z"/><path d="M11.3 7.5c-.2-2 .3-3.6 1.6-4.8l1.1 1c-1 1-1.4 2.1-1.2 3.8z"/><path d="M13.4 5.4c.9-2 3-2.9 5.3-2.4-.6 2.2-2.7 3.2-5.3 2.4z"/>',
    shield: '<path fill-rule="evenodd" d="M12 2l8 3v6.2c0 5-3.4 9.1-8 10.8-4.6-1.7-8-5.8-8-10.8V5zm0 3.2v13.6c2.9-1.5 5-4.4 5-7.6V7.1z"/>',
    smp: '<path fill-rule="evenodd" d="M8 2h8v7H8zm2 3v1.6h1.6V5zm2.4 0v1.6H14V5z"/><path d="M9 9.5h6V17H9z"/><path d="M3 9.5l6 1.2v3.8l-6-1.2z"/><path d="M21 9.5l-6 1.2v3.8l6-1.2z"/><path d="M10 17.5h4V21h-4z"/>',
    // Interface
    star: '<path d="M12 2c.9 4.8 4.2 8.1 9 9-4.8.9-8.1 4.2-9 9-.9-4.8-4.2-8.1-9-9 4.8-.9 8.1-4.2 9-9z"/>',
    search: `<g ${STROKE}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></g>`,
    close: `<g ${STROKE}><path d="M6 6l12 12M18 6L6 18"/></g>`,
    copy: `<g ${STROKE}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></g>`,
    info: `<g ${STROKE}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></g>`,
    chat: `<g ${STROKE}><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-5 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></g>`,
    external: `<g ${STROKE}><path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></g>`,
    back: `<g ${STROKE}><path d="M15 5l-7 7 7 7"/></g>`,
    plus: `<g ${STROKE}><path d="M12 5v14M5 12h14"/></g>`,
    download: `<g ${STROKE}><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></g>`,
    upload: `<g ${STROKE}><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></g>`,
    trash: `<g ${STROKE}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></g>`
  };

  const LOGO = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="brand-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect x=".5" y=".5" width="31" height="31" rx="8" fill="#0f1524" stroke="#24304a"/><path d="M16 4.5c1.1 6 5.5 10.4 11.5 11.5-6 1.1-10.4 5.5-11.5 11.5-1.1-6-5.5-10.4-11.5-11.5 6-1.1 10.4-5.5 11.5-11.5z" fill="url(#brand-g)"/></svg>';

  // Shown when every skin service fails: a plain blocky face, not anyone's skin.
  const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="#3b4559"/><rect width="8" height="2" fill="#262e40"/><rect y="2" width="1" height="1" fill="#262e40"/><rect x="7" y="2" width="1" height="1" fill="#262e40"/><rect x="1" y="4" width="2" height="1" fill="#e9edf5"/><rect x="5" y="4" width="2" height="1" fill="#e9edf5"/><rect x="2" y="4" width="1" height="1" fill="#5b6b8f"/><rect x="5" y="4" width="1" height="1" fill="#5b6b8f"/><rect x="3" y="6" width="2" height="1" fill="#2a3245"/></svg>');

  const state = {
    config: null,
    modes: [],
    modeById: new Map(),
    tiers: [],            // every tier, best first, as listed in config.json "points"
    tierById: new Map(),
    titles: [],           // highest first
    rawPlayers: null,     // players.json exactly as loaded; the editor starts from it
    players: [],          // every player in the file
    ranked: [],           // players with at least one tier, best first
    byKey: new Map(),     // lower-case name -> ranked player
    warnings: [],
    view: { page: 'overall' },
    rendered: false,
    profileFromApp: false,
    loaded: false
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const header = $('#header');
  const tabs = $('#tabs');
  const main = $('#main');
  const footer = $('#footer');
  const modalRoot = $('#modal-root');
  const toastEl = $('#toast');

  class LoadError extends Error {
    constructor(html) { super(html.replace(/<[^>]+>/g, '')); this.html = html; }
  }

  // ---------- Small helpers ----------

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function safeUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : '';
  }
  function safeColor(color, fallback) {
    return typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color.trim()) ? color.trim() : fallback;
  }
  function plural(n, word) {
    return `${n} ${n === 1 ? word : word + 's'}`;
  }
  function icon(name, cls) {
    return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.star}</svg>`;
  }
  function modeIcon(mode) {
    if (mode.image) return `<img class="mode-img" src="${esc(mode.image)}" alt="">`;
    if (ICONS[mode.icon]) return icon(mode.icon);
    const letter = esc((mode.name || mode.id || '?').charAt(0).toUpperCase());
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="800" font-family="Inter, sans-serif" fill="currentColor">${letter}</text></svg>`;
  }
  function tierColor(tier) {
    const group = Math.min(Math.max(tier.group, 1), 5);
    return `var(--t${group}-${tier.level === 'H' ? 'hi' : tier.level === 'M' ? 'mid' : 'lo'})`;
  }
  function notice(title, html, bad) {
    return `<div class="notice${bad ? ' error' : ''}"><h2>${esc(title)}</h2><p>${html}</p></div>`;
  }

  let toastTimer = 0;
  function toast(message, bad) {
    toastEl.textContent = message;
    toastEl.classList.toggle('bad', !!bad);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), bad ? 5000 : 2600);
  }

  async function copyText(text, done) {
    try {
      await navigator.clipboard.writeText(text);
      toast(done || 'Copied');
    } catch (e) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      area.remove();
      toast(ok ? (done || 'Copied') : 'Could not copy. Select the text and copy it by hand.', !ok);
    }
  }

  // ---------- Config and players ----------

  function applyConfig(raw) {
    const given = raw && typeof raw === 'object' ? raw : {};
    const c = Object.assign({}, DEFAULTS, given);
    c.github = Object.assign({}, DEFAULTS.github, given.github);
    c.skins = Object.assign({}, DEFAULTS.skins, given.skins);
    for (const key of Object.keys(c.skins)) c.skins[key] = safeUrl(c.skins[key]);
    c.siteName = String(c.siteName || DEFAULTS.siteName);
    c.serverName = String(c.serverName || '');
    c.serverIp = String(c.serverIp || '');
    c.discord = safeUrl(c.discord);

    const regions = {};
    for (const [id, color] of Object.entries(c.regions && typeof c.regions === 'object' ? c.regions : {})) {
      regions[id.trim().toUpperCase()] = safeColor(color, '#8b95a8');
    }
    c.regions = regions;
    state.config = c;

    state.modes = [];
    state.modeById = new Map();
    for (const m of Array.isArray(c.modes) ? c.modes : []) {
      if (!m || typeof m.id !== 'string' || !m.id.trim()) continue;
      const id = m.id.trim().toLowerCase();
      if (id === 'overall' || state.modeById.has(id)) continue;
      const iconName = typeof m.icon === 'string' ? m.icon.trim() : '';
      const mode = { id, name: String(m.name || id), icon: iconName, image: /[./]/.test(iconName) ? iconName : '' };
      state.modes.push(mode);
      state.modeById.set(id, mode);
    }

    state.tiers = [];
    state.tierById = new Map();
    const points = c.points && typeof c.points === 'object' ? c.points : DEFAULTS.points;
    for (const [key, value] of Object.entries(points)) {
      const match = /^([HML])T(\d)$/i.exec(key.trim());
      const n = Number(value);
      if (!match || !Number.isFinite(n)) continue;
      const level = match[1].toUpperCase();
      const group = Number(match[2]);
      const id = `${level}T${group}`;
      if (state.tierById.has(id)) continue;
      const tier = { id, level, group, points: n, order: state.tiers.length, name: `${LEVEL_NAMES[level]} Tier ${group}` };
      state.tiers.push(tier);
      state.tierById.set(id, tier);
    }

    state.titles = (Array.isArray(c.titles) ? c.titles : DEFAULTS.titles)
      .filter((t) => t && t.name)
      .map((t) => ({ name: String(t.name), minPoints: Number(t.minPoints) || 0, color: safeColor(t.color, '#8b95a8') }))
      .sort((a, b) => b.minPoints - a.minPoints);
  }

  function parseTier(value) {
    return typeof value === 'string' ? state.tierById.get(value.trim().toUpperCase()) || null : null;
  }

  function titleFor(points) {
    return state.titles.find((t) => points >= t.minPoints) || { name: 'Unranked', minPoints: 0, color: '#7b8496' };
  }

  /** Reads players.json. Anything it cannot use is skipped and explained in `warnings`. */
  function normalizePlayers(raw) {
    const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.players) ? raw.players : null;
    if (!list) {
      throw new LoadError('<code>data/players.json</code> needs a <code>"players"</code> list, like <code>{ "players": [ ... ] }</code>.');
    }
    const players = [];
    const warnings = [];
    const seen = new Set();
    list.forEach((entry, index) => {
      const name = entry && typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!name) {
        warnings.push(`Entry ${index + 1} has no "name", so it is left out.`);
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        warnings.push(`${name} is in the list twice. Only the first one is used.`);
        return;
      }
      seen.add(key);
      const tiers = {};
      const given = entry.tiers && typeof entry.tiers === 'object' && !Array.isArray(entry.tiers) ? entry.tiers : {};
      for (const [modeKey, value] of Object.entries(given)) {
        if (value === null || value === undefined || value === '') continue;
        const mode = state.modeById.get(String(modeKey).trim().toLowerCase());
        if (!mode) {
          warnings.push(`${name}: there is no mode called "${modeKey}" in config.json.`);
          continue;
        }
        const tier = parseTier(value);
        if (!tier) {
          warnings.push(`${name}: "${value}" is not a tier (${mode.name}). Use one of ${state.tiers.map((t) => t.id).join(', ')}.`);
          continue;
        }
        tiers[mode.id] = tier;
      }
      const region = typeof entry.region === 'string' ? entry.region.trim().toUpperCase() : '';
      if (region && !state.config.regions[region]) {
        warnings.push(`${name}: the region "${entry.region}" is not in config.json, so it is shown in grey.`);
      }
      const uuid = typeof entry.uuid === 'string' ? entry.uuid.trim() : '';
      players.push({ name, key, uuid, region, tiers });
    });
    return { players, warnings };
  }

  function applyPlayers(raw) {
    const result = normalizePlayers(raw);
    state.rawPlayers = raw;
    state.players = result.players;
    state.warnings = result.warnings;
    result.warnings.forEach((w) => console.warn(`[tiers] ${w}`));

    for (const p of state.players) {
      let points = 0;
      let best = 0;
      for (const tier of Object.values(p.tiers)) {
        points += tier.points;
        if (tier.points > best) best = tier.points;
      }
      p.points = points;
      p.best = best;
      p.title = titleFor(points);
    }
    // Ties on points go to the better single tier, then the name.
    state.ranked = state.players
      .filter((p) => Object.keys(p.tiers).length > 0)
      .sort((a, b) => b.points - a.points || b.best - a.best || a.key.localeCompare(b.key));
    state.ranked.forEach((p, i) => { p.rank = i + 1; });
    state.byKey = new Map(state.ranked.map((p) => [p.key, p]));
  }

  // ---------- Loading ----------

  function jsonErrorPosition(text, err) {
    const msg = String((err && err.message) || '');
    let line;
    const lineCol = /line (\d+) column (\d+)/i.exec(msg);
    if (lineCol) {
      line = Number(lineCol[1]);
    } else {
      const pos = /position (\d+)/i.exec(msg);
      if (!pos) return null;
      line = text.slice(0, Number(pos[1])).split('\n').length;
    }
    return { line, snippet: (text.split('\n')[line - 1] || '').trim().slice(0, 120) };
  }

  /** An HTML explanation of a JSON mistake, with the line it is on when the browser says. */
  function jsonMistake(path, text, err) {
    const where = jsonErrorPosition(text, err);
    return `<code>${esc(path)}</code> has a mistake${where ? ` on <b>line ${where.line}</b>` : ''}: ${esc(err.message)}. ` +
      `It is usually a missing or extra comma, or a missing quote mark.` +
      (where && where.snippet ? `<br><br>Line ${where.line}: <code>${esc(where.snippet)}</code>` : '');
  }

  async function fetchJson(path) {
    let res;
    try {
      res = await fetch(path, { cache: 'no-cache' });
    } catch (e) {
      throw new LoadError(`Could not load <code>${esc(path)}</code>: ${esc(e.message)}`);
    }
    if (!res.ok) {
      throw new LoadError(`Could not load <code>${esc(path)}</code> (the server answered ${res.status}). It should be in a folder called <code>data</code>, next to <code>index.html</code>.`);
    }
    const text = await res.text();
    try {
      return { data: JSON.parse(text), text };
    } catch (e) {
      throw new LoadError(jsonMistake(path, text, e));
    }
  }

  function showFatal(title, html) {
    tabs.hidden = true;
    main.innerHTML = notice(title, html, true);
  }

  async function load() {
    if (location.protocol === 'file:') {
      showFatal('Open this site through a web address',
        'Browsers do not let a page read its data files straight off your disk, so double-clicking <code>index.html</code> cannot work. ' +
        'Put the folder on GitHub Pages (see <code>README.md</code>), or run a small web server in the folder, such as <code>npx serve</code> or <code>python -m http.server</code>.');
      return;
    }
    try {
      const [config, players] = await Promise.all([fetchJson('data/config.json'), fetchJson('data/players.json')]);
      applyConfig(config.data);
      applyPlayers(players.data);
    } catch (e) {
      showFatal('The tier list could not load', e instanceof LoadError ? e.html : esc(e.message));
      console.error(e);
      return;
    }
    document.title = state.config.siteName;
    renderHeader();
    renderFooter();
    state.loaded = true;
    route();
  }

  // ---------- Pieces of the page ----------

  function skinImg(kind, player, cls, size) {
    const s = state.config.skins;
    const id = encodeURIComponent(player.uuid || player.name);
    const fill = (template) => (template ? template.split('{name}').join(id) : '');
    const deep = kind === 'bust' ? [fill(s.bust), fill(s.head)].filter(Boolean) : [];
    const flat = [fill(s.face), fill(s.faceBackup)].filter(Boolean);
    const urls = deep.concat(flat);
    const classes = ['skin', cls, kind === 'bust' && !deep.length ? 'flat' : ''].filter(Boolean).join(' ');
    return `<img class="${classes}" src="${esc(urls[0] || PLACEHOLDER)}" data-srcs="${esc(urls.join(' '))}" data-flat-from="${deep.length}" data-i="0" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }

  // A skin service that is down or does not know the name: try the next one.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('skin')) return;
    const urls = (img.dataset.srcs || '').split(' ').filter(Boolean);
    const next = Number(img.dataset.i || 0) + 1;
    img.dataset.i = String(next);
    if (next < urls.length) {
      if (next >= Number(img.dataset.flatFrom || 0)) img.classList.add('flat');
      img.src = urls[next];
    } else if (!img.src.startsWith('data:')) {
      img.classList.add('flat');
      img.src = PLACEHOLDER;
    }
  }, true);

  function regionPill(region) {
    if (!region) return '<span class="region-empty" aria-hidden="true">—</span>';
    return `<span class="region" style="--rc:${state.config.regions[region] || '#8b95a8'}">${esc(region)}</span>`;
  }

  function tierChip(mode, tier) {
    if (!tier) {
      return `<div class="tier none" data-tip="${esc(mode.name)} · unranked" aria-hidden="true"><span class="tier-icon">${modeIcon(mode)}</span><span class="tier-label">—</span></div>`;
    }
    const tip = `${mode.name} · ${tier.name} · ${plural(tier.points, 'point')}`;
    return `<div class="tier" style="--tc:${tierColor(tier)}" data-tip="${esc(tip)}"><span class="tier-icon">${modeIcon(mode)}</span><span class="tier-label"><span class="sr-only">${esc(mode.name)} </span>${tier.id}</span></div>`;
  }

  function rankClass(rank) {
    return rank <= 3 ? ` r${rank}` : '';
  }

  function pageHead(title, sub) {
    return `<div class="page-head"><div><h1 class="page-title">${esc(title)}</h1><div class="page-sub">${esc(sub)}</div></div>` +
      `<button class="btn" type="button" data-action="info">${icon('info')}<span>How points work</span></button></div>`;
  }

  function renderHeader() {
    const c = state.config;
    const name = c.serverName || c.siteName;
    header.innerHTML = `<div class="header-inner">
      <a class="brand" href="#/rankings/overall" aria-label="${esc(c.siteName)}">${LOGO}<span class="brand-name">${esc(name)}</span>${c.serverName ? '<span class="brand-tag">TIERS</span>' : ''}</a>
      <div class="header-search" role="search">
        ${icon('search', 'search-icon')}
        <input class="search-input" id="search" type="text" placeholder="Search player…" autocomplete="off" spellcheck="false" enterkeyhint="search"
          aria-label="Search player" role="combobox" aria-controls="suggest" aria-expanded="false" aria-autocomplete="list">
        <kbd class="search-key">/</kbd>
        <div class="suggest" id="suggest" role="listbox"></div>
      </div>
      <div class="header-actions">
        ${c.serverIp ? `<button class="btn btn-ip" type="button" data-copy="${esc(c.serverIp)}" title="Copy the server address">${icon('copy')}<span class="ip-long">${esc(c.serverIp)}</span><span class="ip-short">IP</span></button>` : ''}
        ${c.discord ? `<a class="btn btn-primary btn-discord" href="${esc(c.discord)}" target="_blank" rel="noopener noreferrer" aria-label="Discord">${icon('chat')}<span>Discord</span></a>` : ''}
      </div>
    </div>`;
    setupSearch();
  }

  function renderFooter() {
    const c = state.config;
    const links = [];
    if (c.serverIp) links.push(`<span>Play: <a href="#" data-copy="${esc(c.serverIp)}">${esc(c.serverIp)}</a></span>`);
    if (c.discord) links.push(`<a href="${esc(c.discord)}" target="_blank" rel="noopener noreferrer">Discord</a>`);
    links.push('<a href="#" data-action="info">How points work</a>');
    footer.innerHTML = `<div>${esc(c.siteName)}. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</div><div class="footer-links">${links.join('')}</div>`;
  }

  function renderTabs(active) {
    const items = [{ id: 'overall', name: 'Overall', href: '#/rankings/overall', svg: icon('overall') }]
      .concat(state.modes.map((m) => ({ id: m.id, name: m.name, href: `#/rankings/${encodeURIComponent(m.id)}`, svg: modeIcon(m) })));
    tabs.innerHTML = items.map((t) => {
      const on = t.id === active;
      return `<a class="mode-tab${on ? ' active' : ''}" href="${t.href}"${on ? ' aria-current="page"' : ''}>${t.svg}<span>${esc(t.name)}</span></a>`;
    }).join('');
    tabs.hidden = false;
    const current = tabs.querySelector('.active');
    if (current && tabs.scrollWidth > tabs.clientWidth) {
      tabs.scrollLeft = current.offsetLeft - (tabs.clientWidth - current.offsetWidth) / 2;
    }
  }

  // ---------- Views ----------

  function renderOverall() {
    renderTabs('overall');
    const list = state.ranked;
    const hasRegion = list.some((p) => p.region);
    const rows = list.map((p) => `<a class="row" href="#/player/${encodeURIComponent(p.name)}" style="--title-color:${p.title.color}">
        <div class="rank"><div class="rank-badge${rankClass(p.rank)}"><span class="rank-num">${p.rank}.</span></div>${skinImg('bust', p, 'rank-bust', 66)}</div>
        <div class="player"><div class="p-name">${esc(p.name)}</div><div class="p-title">${icon('star')}<b>${esc(p.title.name)}</b><span>(${plural(p.points, 'point')})</span></div></div>
        ${hasRegion ? `<div class="region-cell">${regionPill(p.region)}</div>` : ''}
        <div class="tiers">${state.modes.map((m) => tierChip(m, p.tiers[m.id])).join('')}</div>
      </a>`).join('');
    const board = list.length
      ? `<div class="board${hasRegion ? '' : ' no-region'}">
          <div class="board-head" aria-hidden="true"><span>#</span><span>Player</span>${hasRegion ? '<span>Region</span>' : ''}<span class="th-tiers">Tiers</span></div>
          ${rows}
        </div>`
      : '<div class="board"><div class="empty-board">Nobody is on the tier list yet.</div></div>';
    main.innerHTML = pageHead('Overall Rankings', `${plural(list.length, 'ranked player')} · every mode's points added together`) + board;
  }

  function renderMode(mode) {
    renderTabs(mode.id);
    const inMode = state.ranked.filter((p) => p.tiers[mode.id]);
    const groups = [...new Set(state.tiers.map((t) => t.group))].sort((a, b) => a - b);
    const columns = groups.map((group) => {
      const list = inMode
        .filter((p) => p.tiers[mode.id].group === group)
        .sort((a, b) => a.tiers[mode.id].order - b.tiers[mode.id].order || b.points - a.points || a.key.localeCompare(b.key));
      const entries = list.map((p) => {
        const tier = p.tiers[mode.id];
        return `<li><a class="tier-player" href="#/player/${encodeURIComponent(p.name)}" style="--tc:${tierColor(tier)}" title="${esc(`${p.name} · ${tier.name}`)}">${skinImg('face', p, '', 26)}` +
          `<span class="nm">${esc(p.name)}</span>` +
          `<span class="hl ${tier.level === 'L' ? 'low' : 'high'}">${tier.level}T</span></a></li>`;
      }).join('');
      return `<section class="tier-col" style="--tc:var(--t${Math.min(group, 5)}-hi)" aria-label="Tier ${group}">
          <div class="tier-col-head">${icon('overall')}<span>Tier ${group}</span><span class="count">${list.length}</span></div>
          ${list.length ? `<ul>${entries}</ul>` : '<div class="empty">No players yet</div>'}
        </section>`;
    }).join('');
    main.innerHTML = pageHead(`${mode.name} Tier List`, `${plural(inMode.length, 'player')} ranked in ${mode.name}`) +
      `<div class="tier-cols" style="--n:${groups.length}">${columns}</div>`;
  }

  function renderEditor() {
    tabs.hidden = true;
    if (window.Tiers.editor) {
      window.Tiers.editor.mount(main);
    } else {
      main.innerHTML = notice('The editor did not load', 'Check that <code>editor.js</code> is uploaded next to <code>index.html</code>.', true);
    }
  }

  // ---------- Dialogs ----------

  let modal = null; // { kind, lastFocus }

  function showModal(html, opts) {
    const options = opts || {};
    const lastFocus = modal ? modal.lastFocus : document.activeElement;
    modalRoot.innerHTML = `<div class="modal-backdrop" data-backdrop><div class="modal${options.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(options.label || 'Dialog')}" tabindex="-1">` +
      `<button class="icon-btn modal-close" type="button" data-action="close-modal" aria-label="Close">${icon('close')}</button>${html}</div></div>`;
    modal = { kind: options.kind || 'dialog', lastFocus };
    document.body.style.overflow = 'hidden';
    const dialog = modalRoot.querySelector('.modal');
    (dialog.querySelector('[autofocus]') || dialog).focus();
    return dialog;
  }

  function hideModal() {
    if (!modal) return;
    const lastFocus = modal.lastFocus;
    modal = null;
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function viewHash(view) {
    if (view.page === 'mode') return `#/rankings/${encodeURIComponent(view.mode)}`;
    if (view.page === 'edit') return '#/edit';
    return '#/rankings/overall';
  }

  /** A profile has its own address, so closing one goes back to the list's address. */
  function requestClose() {
    if (modal && modal.kind === 'profile') {
      if (state.profileFromApp) history.back();
      else location.hash = viewHash(state.view);
      return;
    }
    hideModal();
  }

  function openProfile(name) {
    const p = state.byKey.get(String(name).toLowerCase());
    if (!p) {
      showModal(`<div class="modal-body"><h2>Not on the tier list</h2><p>No ranked player is called <b>${esc(name)}</b>.</p></div>`, { kind: 'profile', label: 'Player not found' });
      return;
    }
    const held = state.modes.filter((m) => p.tiers[m.id]).sort((a, b) => p.tiers[a.id].order - p.tiers[b.id].order);
    showModal(`<div class="profile" style="--title-color:${p.title.color}">
        <div class="profile-top">
          <div class="profile-avatar">${skinImg('bust', p, 'profile-bust', 100)}</div>
          <h2 class="profile-name">${esc(p.name)}</h2>
          <div class="chips">
            <span class="chip title-chip">${icon('star')}${esc(p.title.name)}</span>
            ${p.region ? regionPill(p.region) : ''}
            <a class="chip" href="https://namemc.com/profile/${encodeURIComponent(p.name)}" target="_blank" rel="noopener noreferrer">NameMC ${icon('external')}</a>
          </div>
        </div>
        <div class="profile-section">
          <div class="section-label">Position</div>
          <div class="position-bar"><span class="position-rank${rankClass(p.rank)}"><span>#${p.rank}</span></span><span class="pos-text">Overall</span><span class="pos-points">${plural(p.points, 'point')}</span></div>
        </div>
        <div class="profile-section">
          <div class="section-label">Tiers</div>
          <div class="profile-tiers">${held.map((m) => tierChip(m, p.tiers[m.id])).join('')}</div>
        </div>
      </div>`, { kind: 'profile', label: p.name });
  }

  function openInfo() {
    const tierRows = state.tiers.map((t) => `<tr><td><span class="tier-label" style="--tc:${tierColor(t)}">${t.id}</span> ${esc(t.name)}</td><td>${plural(t.points, 'point')}</td></tr>`).join('');
    const titleRows = state.titles.map((t) => `<tr><td><span class="info-title" style="--title-color:${t.color}">${icon('star')}${esc(t.name)}</span></td><td>${t.minPoints}+</td></tr>`).join('');
    showModal(`<div class="modal-body">
        <h2>How points work</h2>
        <p>Every tier a player holds in a mode is worth points, and the overall ranking adds up the points from every mode. A strong all-rounder can rank above a player who is only good at one mode.</p>
        <div class="info-grid">
          <div><div class="section-label">Tiers</div><table class="info-table">${tierRows}</table></div>
          <div><div class="section-label">Titles</div><table class="info-table">${titleRows}</table></div>
        </div>
        <p>A high tier (HT) is above a low tier (LT) of the same number. Players on equal points are ordered by their best single tier.</p>
      </div>`, { label: 'How points work', wide: true });
  }

  // ---------- Search ----------

  function setupSearch() {
    const input = $('#search');
    const box = $('#suggest');
    let items = [];
    let active = -1;

    const close = () => {
      box.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };
    const highlight = (index) => {
      active = index;
      box.querySelectorAll('.suggest-item').forEach((el, i) => el.setAttribute('aria-selected', String(i === index)));
      if (index >= 0) input.setAttribute('aria-activedescendant', `sg-${index}`);
    };
    const go = (p) => {
      input.value = '';
      close();
      input.blur();
      location.hash = `#/player/${encodeURIComponent(p.name)}`;
    };
    const update = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { close(); return; }
      items = state.ranked
        .filter((p) => p.key.includes(q))
        .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) || a.rank - b.rank)
        .slice(0, 6);
      box.innerHTML = items.length
        ? items.map((p, i) => `<a class="suggest-item" role="option" id="sg-${i}" href="#/player/${encodeURIComponent(p.name)}" aria-selected="false">${skinImg('face', p, '', 28)}<span class="suggest-name">${esc(p.name)}</span><span class="suggest-points">#${p.rank} · ${plural(p.points, 'pt')}</span></a>`).join('')
        : `<div class="suggest-empty">No ranked player matches “${esc(input.value.trim())}”.</div>`;
      box.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
      highlight(items.length ? 0 : -1);
    };

    input.addEventListener('input', update);
    input.addEventListener('focus', () => { if (input.value.trim()) update(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); highlight(Math.min(active + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); highlight(Math.max(active - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const p = items[active] || items[0]; if (p && input.value.trim()) go(p); }
      else if (e.key === 'Escape') { e.stopPropagation(); if (input.value) { input.value = ''; close(); } else input.blur(); }
    });
    box.addEventListener('click', (e) => {
      if (e.target.closest('.suggest-item')) { input.value = ''; close(); input.blur(); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.header-search')) close(); });
  }

  // ---------- Addresses ----------

  function parseHash() {
    let parts = [];
    try {
      parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent).filter(Boolean);
    } catch (e) {
      parts = [];
    }
    if (parts[0] === 'edit') return { page: 'edit' };
    if (parts[0] === 'player' && parts[1]) return { page: 'player', name: parts[1] };
    if (parts[0] === 'rankings' && parts[1] && parts[1].toLowerCase() !== 'overall') return { page: 'mode', mode: parts[1].toLowerCase() };
    return { page: 'overall' };
  }

  function sameView(a, b) {
    return a.page === b.page && (a.page !== 'mode' || a.mode === b.mode);
  }

  function renderView(view) {
    state.rendered = true;
    if (view.page === 'edit') { renderEditor(); return; }
    if (view.page === 'mode') {
      const mode = state.modeById.get(view.mode);
      if (mode) { renderMode(mode); return; }
      toast(`There is no mode called “${view.mode}”.`, true);
      state.view = { page: 'overall' };
      history.replaceState(null, '', '#/rankings/overall');
    }
    renderOverall();
  }

  function route() {
    if (!state.loaded) return;
    const next = parseHash();
    if (next.page === 'player') {
      state.profileFromApp = state.rendered;
      if (!state.rendered) renderView(state.view);
      openProfile(next.name);
      return;
    }
    const closingProfile = modal && modal.kind === 'profile';
    if (modal) hideModal();
    if (closingProfile && state.rendered && sameView(next, state.view)) return; // the list behind it is still right
    const leaving = state.view;
    if (leaving.page === 'edit' && next.page !== 'edit' && window.Tiers.editor && window.Tiers.editor.isDirty()) {
      toast('Your editor changes are not saved yet. They are kept until you close this tab.');
    }
    state.view = next;
    renderView(next);
    if (!sameView(leaving, next)) window.scrollTo(0, 0);
  }

  // ---------- Page-wide events ----------

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.closest('[data-backdrop]') && !target.closest('.modal')) { requestClose(); return; }
    const action = target.closest('[data-action]');
    if (action) {
      e.preventDefault();
      if (action.dataset.action === 'close-modal') requestClose();
      else if (action.dataset.action === 'info') openInfo();
      return;
    }
    const copy = target.closest('[data-copy]');
    if (copy) {
      e.preventDefault();
      copyText(copy.dataset.copy, `Copied ${copy.dataset.copy}`);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal) {
      e.preventDefault();
      requestClose();
      return;
    }
    if (e.key === 'Tab' && modal) {
      const dialog = modalRoot.querySelector('.modal');
      const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]')]
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key === '/' && !modal && !e.target.closest('input, textarea, select, [contenteditable]')) {
      const search = $('#search');
      if (search) { e.preventDefault(); search.focus(); }
    }
  });

  window.addEventListener('hashchange', route);

  // What editor.js uses.
  window.Tiers = {
    get config() { return state.config; },
    get modes() { return state.modes; },
    get tiers() { return state.tiers; },
    get rawPlayers() { return state.rawPlayers; },
    get warnings() { return state.warnings; },
    get page() { return state.view.page; },
    esc, icon, modeIcon, tierColor, parseTier, titleFor, skinImg, regionPill, plural,
    toast, copyText, showModal, hideModal, normalizePlayers, jsonMistake,
    /** After the editor saves, the rankings show the new list without a reload. */
    replacePlayers(raw) { applyPlayers(raw); },
    editor: null
  };

  load();
})();
