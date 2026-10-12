/* CombatAdvanced Tiers: the public pages.
 *
 * Everything shown comes from three files next to this one:
 *   data/config.json      the site's name, the modes, points, titles, regions,
 *                         Hall of Fame categories and where skins come from
 *   data/players.json     every player and their tier in each mode
 *   data/halloffame.json  the Hall of Fame inductees (optional)
 *
 * One page with hash addresses, so any static host serves it and a refresh
 * never 404s:
 *   #/rankings/overall   the overall ranking (the default)
 *   #/rankings/<mode>    one mode's tier list
 *   #/hall-of-fame       the Hall of Fame
 *   #/player/<name>      a player's profile, over whatever page is behind it
 *   #/edit               the editor, in editor.js
 */
(function () {
  'use strict';

  const DEFAULTS = {
    siteName: 'Tier List',
    serverName: '',
    serverIp: '',
    discord: '',
    github: { owner: '', repo: '', branch: 'main', dir: 'data' },
    modes: [],
    points: { HT1: 60, LT1: 45, HT2: 30, LT2: 20, HT3: 10, LT3: 6, HT4: 4, LT4: 3, HT5: 2, LT5: 1 },
    titles: [
      { name: 'Combat Grandmaster', minPoints: 400, color: '#f4c542' },
      { name: 'Combat Master', minPoints: 250, color: '#c49bf2' },
      { name: 'Combat Ace', minPoints: 100, color: '#ef7d7d' },
      { name: 'Combat Specialist', minPoints: 50, color: '#5fb3ea' },
      { name: 'Combat Cadet', minPoints: 20, color: '#5cc99a' },
      { name: 'Combat Novice', minPoints: 10, color: '#a3acb9' },
      { name: 'Rookie', minPoints: 0, color: '#7b818c' }
    ],
    regions: {},
    hallOfFame: {
      intro: '',
      categories: [
        { id: 'champion', name: 'Champion', color: '#e8b931' },
        { id: 'legend', name: 'Legend', color: '#3b82f6' },
        { id: 'staff', name: 'Staff', color: '#4ade80' },
        { id: 'builder', name: 'Builder', color: '#c49bf2' }
      ]
    },
    skins: {
      body: 'https://mc-heads.net/body/{name}/240',
      bust: 'https://render.crafty.gg/3d/bust/{name}',
      head: 'https://mc-heads.net/head/{name}/128',
      face: 'https://mc-heads.net/avatar/{name}/64',
      faceBackup: 'https://minotar.net/helm/{name}/64'
    }
  };

  const LEVEL_NAMES = { H: 'High', M: 'Mid', L: 'Low' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    search: `<g ${STROKE}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></g>`,
    close: `<g ${STROKE}><path d="M6 6l12 12M18 6L6 18"/></g>`,
    copy: `<g ${STROKE}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></g>`,
    discord: `<g ${STROKE}><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-5 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></g>`,
    back: `<g ${STROKE}><path d="M15 5l-7 7 7 7"/></g>`,
    plus: `<g ${STROKE}><path d="M12 5v14M5 12h14"/></g>`,
    download: `<g ${STROKE}><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></g>`,
    upload: `<g ${STROKE}><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></g>`,
    trash: `<g ${STROKE}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></g>`
  };

  // Shown when every skin service fails: a plain blocky face, not anyone's skin.
  const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="#3a3f47"/><rect width="8" height="2" fill="#262a30"/><rect y="2" width="1" height="1" fill="#262a30"/><rect x="7" y="2" width="1" height="1" fill="#262a30"/><rect x="1" y="4" width="2" height="1" fill="#e6e8eb"/><rect x="5" y="4" width="2" height="1" fill="#e6e8eb"/><rect x="2" y="4" width="1" height="1" fill="#59606b"/><rect x="5" y="4" width="1" height="1" fill="#59606b"/><rect x="3" y="6" width="2" height="1" fill="#2a2e35"/></svg>');

  const state = {
    config: null,
    modes: [],
    modeById: new Map(),
    tiers: [],            // every tier, best first, as listed in config.json "points"
    tierById: new Map(),
    titles: [],           // highest first
    categories: [],       // Hall of Fame categories
    categoryById: new Map(),
    rawPlayers: null,     // players.json exactly as loaded; the editor starts from it
    players: [],
    ranked: [],           // players with at least one tier, best first
    byKey: new Map(),     // lower-case name -> ranked player
    updated: '',          // players.json "updated", written by the editor
    warnings: [],
    rawHof: null,
    hof: [],              // Hall of Fame inductees
    hofByKey: new Map(),
    hofWarnings: [],
    hofFilter: 'all',
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
    return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.overall}</svg>`;
  }
  function modeIcon(mode) {
    if (mode.image) return `<img class="mode-img" src="${esc(mode.image)}" alt="">`;
    if (ICONS[mode.icon]) return icon(mode.icon);
    const letter = esc((mode.name || mode.id || '?').charAt(0).toUpperCase());
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16.3" text-anchor="middle" font-size="11" font-weight="700" font-family="Barlow, sans-serif" fill="currentColor">${letter}</text></svg>`;
  }
  function tierColor(tier) {
    const group = Math.min(Math.max(tier.group, 1), 5);
    return `var(--t${group}-${tier.level === 'H' ? 'hi' : tier.level === 'M' ? 'mid' : 'lo'})`;
  }
  function notice(title, html, kind) {
    return `<div class="notice${kind ? ' ' + kind : ''}"><h2>${esc(title)}</h2><p>${html}</p></div>`;
  }
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
  }
  function medal(rank) {
    return rank <= 3 ? ` m${rank}` : '';
  }
  /** Marks an element to arrive with the page, in order. Only the first few stagger. */
  function anim(i) {
    return i < 18 ? ` data-anim style="--i:${i}"` : '';
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

  // ---------- Config and data ----------

  function applyConfig(raw) {
    const given = raw && typeof raw === 'object' ? raw : {};
    const c = Object.assign({}, DEFAULTS, given);
    c.github = Object.assign({}, DEFAULTS.github, given.github);
    c.skins = Object.assign({}, DEFAULTS.skins, given.skins);
    for (const key of Object.keys(c.skins)) c.skins[key] = safeUrl(c.skins[key]);
    c.hallOfFame = Object.assign({}, DEFAULTS.hallOfFame, given.hallOfFame);
    c.siteName = String(c.siteName || DEFAULTS.siteName);
    c.serverName = String(c.serverName || '');
    c.serverIp = String(c.serverIp || '');
    c.discord = safeUrl(c.discord);

    const regions = {};
    for (const [id, color] of Object.entries(c.regions && typeof c.regions === 'object' ? c.regions : {})) {
      regions[id.trim().toUpperCase()] = safeColor(color, '#a3a8b0');
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
      .map((t) => ({ name: String(t.name), minPoints: Number(t.minPoints) || 0, color: safeColor(t.color, '#a3a8b0') }))
      .sort((a, b) => b.minPoints - a.minPoints);

    state.categories = [];
    state.categoryById = new Map();
    const cats = Array.isArray(c.hallOfFame.categories) ? c.hallOfFame.categories : DEFAULTS.hallOfFame.categories;
    for (const cat of cats) {
      if (!cat || typeof cat.id !== 'string' || !cat.id.trim()) continue;
      const id = cat.id.trim().toLowerCase();
      if (state.categoryById.has(id) || id === 'all') continue;
      const entry = { id, name: String(cat.name || id), color: safeColor(cat.color, '#a3a8b0') };
      state.categories.push(entry);
      state.categoryById.set(id, entry);
    }
  }

  function parseTier(value) {
    return typeof value === 'string' ? state.tierById.get(value.trim().toUpperCase()) || null : null;
  }

  function titleFor(points) {
    return state.titles.find((t) => points >= t.minPoints) || { name: 'Unranked', minPoints: 0, color: '#7b818c' };
  }

  function categoryOf(id) {
    return state.categoryById.get(String(id || '').toLowerCase()) || { id: String(id || ''), name: String(id || 'Inductee'), color: '#a3a8b0' };
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
    state.updated = raw && !Array.isArray(raw) && typeof raw.updated === 'string' ? raw.updated : '';
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

  /** Reads halloffame.json the same way. */
  function normalizeHof(raw) {
    const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.inductees) ? raw.inductees : null;
    if (!list) {
      throw new LoadError('<code>data/halloffame.json</code> needs an <code>"inductees"</code> list, like <code>{ "inductees": [ ... ] }</code>.');
    }
    const inductees = [];
    const warnings = [];
    const seen = new Set();
    list.forEach((entry, index) => {
      const name = entry && typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!name) {
        warnings.push(`Hall of Fame entry ${index + 1} has no "name", so it is left out.`);
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        warnings.push(`${name} is in the Hall of Fame twice. Only the first one is used.`);
        return;
      }
      seen.add(key);
      const category = typeof entry.category === 'string' ? entry.category.trim().toLowerCase() : '';
      if (category && !state.categoryById.has(category)) {
        warnings.push(`${name}: the Hall of Fame category "${entry.category}" is not in config.json.`);
      }
      const year = Number.isInteger(Number(entry.year)) && Number(entry.year) > 0 ? Number(entry.year) : null;
      inductees.push({
        name,
        key,
        uuid: typeof entry.uuid === 'string' ? entry.uuid.trim() : '',
        category,
        year,
        title: typeof entry.title === 'string' ? entry.title.trim() : '',
        text: typeof entry.text === 'string' ? entry.text.trim() : '',
        featured: entry.featured === true,
        order: index
      });
    });
    return { inductees, warnings };
  }

  function applyHof(raw) {
    const result = normalizeHof(raw);
    state.rawHof = raw;
    state.hof = result.inductees;
    state.hofWarnings = result.warnings;
    state.hofByKey = new Map(state.hof.map((h) => [h.key, h]));
    result.warnings.forEach((w) => console.warn(`[tiers] ${w}`));
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
      'It is usually a missing or extra comma, or a missing quote mark.' +
      (where && where.snippet ? `<br><br>Line ${where.line}: <code>${esc(where.snippet)}</code>` : '');
  }

  async function fetchJson(path, optional) {
    let res;
    try {
      res = await fetch(path, { cache: 'no-cache' });
    } catch (e) {
      throw new LoadError(`Could not load <code>${esc(path)}</code>: ${esc(e.message)}`);
    }
    if (optional && res.status === 404) return null;
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
    main.innerHTML = notice(title, html, 'error');
  }

  async function load() {
    if (location.protocol === 'file:') {
      showFatal('Open this site through a web address',
        'Browsers do not let a page read its data files straight off your disk, so double-clicking <code>index.html</code> cannot work. ' +
        'Put the folder on GitHub Pages (see <code>README.md</code>), or run a small web server in the folder, such as <code>npx serve</code> or <code>python -m http.server</code>.');
      return;
    }
    try {
      const [config, players, hof] = await Promise.all([
        fetchJson('data/config.json'),
        fetchJson('data/players.json'),
        fetchJson('data/halloffame.json', true)
      ]);
      applyConfig(config.data);
      applyPlayers(players.data);
      applyHof(hof ? hof.data : { inductees: [] });
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

  // ---------- Skins ----------

  function skinImg(kind, player, cls, size) {
    const s = state.config.skins;
    const id = encodeURIComponent(player.uuid || player.name);
    const fill = (template) => (template ? template.split('{name}').join(id) : '');
    const deep = (kind === 'body' ? [s.body, s.bust, s.head] : kind === 'bust' ? [s.bust, s.head] : []).map(fill).filter(Boolean);
    const flat = [fill(s.face), fill(s.faceBackup)].filter(Boolean);
    const urls = deep.concat(flat);
    const classes = ['skin', cls, kind !== 'face' && !deep.length ? 'flat' : ''].filter(Boolean).join(' ');
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

  // Skins fade in once they have arrived, instead of popping in.
  document.addEventListener('load', (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.classList.contains('skin')) img.classList.add('loaded');
  }, true);

  // ---------- Pieces of the page ----------

  function regionText(region) {
    if (!region) return '<span class="region-empty" aria-hidden="true">–</span>';
    return `<span class="region" style="--rc:${state.config.regions[region] || '#a3a8b0'}">${esc(region)}</span>`;
  }

  function tierChip(mode, tier) {
    if (!tier) {
      return `<div class="tier none" data-tip="${esc(mode.name)}: no tier" aria-hidden="true"><span class="tier-icon">${modeIcon(mode)}</span><span class="tier-label">–</span></div>`;
    }
    const tip = `${mode.name}: ${tier.name}, ${plural(tier.points, 'point')}`;
    return `<div class="tier" style="--tc:${tierColor(tier)}" data-tip="${esc(tip)}"><span class="tier-icon">${modeIcon(mode)}</span><span class="tier-label"><span class="sr-only">${esc(mode.name)} </span>${tier.id}</span></div>`;
  }

  function pageHead(title, metaHtml) {
    return `<div class="page-head"${anim(0)}><div><h1 class="page-title">${esc(title)}</h1></div><div class="page-meta">${metaHtml}</div></div>`;
  }

  function rankingMeta(count) {
    const parts = [`<span>${plural(count, 'player')}</span>`];
    if (state.updated && formatDate(state.updated)) parts.push(`<span class="dot">Updated ${formatDate(state.updated)}</span>`);
    parts.push('<span class="dot"><button class="link-btn" type="button" data-action="info">How points work</button></span>');
    return parts.join('');
  }

  function renderHeader() {
    const c = state.config;
    const name = c.serverName || c.siteName;
    header.innerHTML = `<div class="header-inner">
      <a class="brand" href="#/rankings/overall" aria-label="${esc(c.siteName)}"><span class="brand-name">${esc(name)}</span>${c.serverName ? '<span class="brand-tag">Tiers</span>' : ''}</a>
      <nav class="nav" aria-label="Sections">
        <a href="#/rankings/overall" data-nav="rankings">Rankings</a>
        <a href="#/hall-of-fame" data-nav="hof">Hall of Fame</a>
      </nav>
      <div class="search" role="search">
        ${icon('search', 'search-icon')}
        <input class="search-input" id="search" type="text" placeholder="Find a player" autocomplete="off" spellcheck="false" enterkeyhint="search"
          aria-label="Find a player" role="combobox" aria-controls="suggest" aria-expanded="false" aria-autocomplete="list">
        <kbd class="search-key">/</kbd>
        <div class="suggest" id="suggest" role="listbox"></div>
      </div>
      <div class="header-tools">
        ${c.serverIp ? `<button class="text-btn" type="button" data-copy="${esc(c.serverIp)}" title="Copy the server address">${icon('copy')}<span class="ip-long">${esc(c.serverIp)}</span><span class="ip-short">IP</span></button>` : ''}
        ${c.discord ? `<a class="text-btn" href="${esc(c.discord)}" target="_blank" rel="noopener noreferrer" aria-label="Discord">${icon('discord')}<span class="label">Discord</span></a>` : ''}
      </div>
    </div>`;
    setupSearch();
  }

  function markNav(section) {
    header.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === section;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function renderFooter() {
    const c = state.config;
    const links = [];
    if (c.serverIp) links.push(`<span>Play on <a href="#" data-copy="${esc(c.serverIp)}">${esc(c.serverIp)}</a></span>`);
    if (c.discord) links.push(`<a href="${esc(c.discord)}" target="_blank" rel="noopener noreferrer">Discord</a>`);
    footer.innerHTML = `<div>${esc(c.siteName)}. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</div><div class="footer-links">${links.join('')}</div>`;
  }

  /** The mode tabs stay in the page, so the underline can slide from one tab to the next. */
  function renderTabs(active) {
    if (!tabs.dataset.built) {
      const items = [{ id: 'overall', name: 'Overall', href: '#/rankings/overall', svg: icon('overall') }]
        .concat(state.modes.map((m) => ({ id: m.id, name: m.name, href: `#/rankings/${encodeURIComponent(m.id)}`, svg: modeIcon(m) })));
      tabs.innerHTML = items.map((t) => `<a class="tab" data-tab="${esc(t.id)}" href="${t.href}">${t.svg}<span>${esc(t.name)}</span></a>`).join('') +
        '<span class="tab-ink" aria-hidden="true"></span>';
      tabs.dataset.built = '1';
    }
    tabs.hidden = false;
    let current = null;
    tabs.querySelectorAll('.tab').forEach((el) => {
      const on = el.dataset.tab === active;
      el.classList.toggle('active', on);
      if (on) { el.setAttribute('aria-current', 'page'); current = el; } else el.removeAttribute('aria-current');
    });
    moveInk(tabs, current);
  }

  function moveInk(bar, current) {
    const ink = bar.querySelector('.tab-ink');
    if (!ink) return;
    if (!current) { ink.style.width = '0'; return; }
    ink.style.width = `${current.offsetWidth}px`;
    ink.style.transform = `translateX(${current.offsetLeft}px)`;
    if (bar.scrollWidth > bar.clientWidth) {
      bar.scrollTo({ left: current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2, behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }
  window.addEventListener('resize', () => {
    document.querySelectorAll('.tabs').forEach((bar) => moveInk(bar, bar.querySelector('.tab.active')));
  });

  // ---------- Views ----------

  function renderOverall() {
    renderTabs('overall');
    const list = state.ranked;
    const hasRegion = list.some((p) => p.region);
    const rows = list.map((p, i) => `<a class="row${medal(p.rank)}" href="#/player/${encodeURIComponent(p.name)}" style="--title-color:${p.title.color}"${anim(i + 1)}>
        <div class="rank-num">${p.rank}</div>
        <div class="bust-box">${skinImg('bust', p, 'rank-bust', 60)}</div>
        <div class="player"><div class="p-name">${esc(p.name)}</div><div class="p-sub"><span class="p-title">${esc(p.title.name)}</span><span>${plural(p.points, 'point')}</span></div></div>
        ${hasRegion ? `<div class="region-cell">${regionText(p.region)}</div>` : ''}
        <div class="tiers">${state.modes.map((m) => tierChip(m, p.tiers[m.id])).join('')}</div>
      </a>`).join('');
    const board = list.length
      ? `<div class="board${hasRegion ? '' : ' no-region'}">
          <div class="board-head" aria-hidden="true"><span class="th-rank">#</span><span></span><span>Player</span>${hasRegion ? '<span>Region</span>' : ''}<span class="th-tiers">Tiers</span></div>
          ${rows}
        </div>`
      : '<div class="empty-board">Nobody is on the tier list yet.</div>';
    main.innerHTML = pageHead('Overall', rankingMeta(list.length)) + board;
  }

  function renderMode(mode) {
    renderTabs(mode.id);
    const inMode = state.ranked.filter((p) => p.tiers[mode.id]);
    const groups = [...new Set(state.tiers.map((t) => t.group))].sort((a, b) => a - b);
    const columns = groups.map((group, gi) => {
      const list = inMode
        .filter((p) => p.tiers[mode.id].group === group)
        .sort((a, b) => a.tiers[mode.id].order - b.tiers[mode.id].order || b.points - a.points || a.key.localeCompare(b.key));
      const entries = list.map((p) => {
        const tier = p.tiers[mode.id];
        return `<li><a class="tier-player" href="#/player/${encodeURIComponent(p.name)}" style="--tc:${tierColor(tier)}" title="${esc(`${p.name}, ${tier.name}`)}">${skinImg('face', p, '', 24)}` +
          `<span class="nm">${esc(p.name)}</span><span class="hl ${tier.level === 'L' ? 'low' : 'high'}">${tier.level}T${group}</span></a></li>`;
      }).join('');
      return `<section class="tier-col" style="--tc:var(--t${Math.min(group, 5)}-hi)" aria-label="Tier ${group}"${anim(gi + 1)}>
          <div class="tier-col-head"><span>Tier ${group}</span><span class="count">${list.length}</span></div>
          ${list.length ? `<ul>${entries}</ul>` : '<div class="empty">Nobody yet</div>'}
        </section>`;
    }).join('');
    main.innerHTML = pageHead(mode.name, rankingMeta(inMode.length)) + `<div class="tier-cols" style="--n:${groups.length}">${columns}</div>`;
  }

  function renderHof() {
    tabs.hidden = true;
    const c = state.config.hallOfFame;
    const used = state.categories.filter((cat) => state.hof.some((h) => h.category === cat.id));
    if (state.hofFilter !== 'all' && !used.some((cat) => cat.id === state.hofFilter)) state.hofFilter = 'all';
    const shown = state.hof.filter((h) => state.hofFilter === 'all' || h.category === state.hofFilter);
    const intro = c.intro ? `<p class="hof-intro"${anim(1)}>${esc(c.intro)}</p>` : '';
    const meta = `<span>${plural(state.hof.length, 'inductee')}</span>`;

    if (!state.hof.length) {
      main.innerHTML = pageHead('Hall of Fame', meta) + intro + `<div class="hof-empty"${anim(2)}>No one has been inducted yet.</div>`;
      return;
    }

    const filter = used.length > 1
      ? `<div class="tabs hof-tabs" role="tablist"${anim(2)}>` +
        [{ id: 'all', name: 'All', n: state.hof.length }].concat(used.map((cat) => ({ id: cat.id, name: cat.name, n: state.hof.filter((h) => h.category === cat.id).length })))
          .map((t) => `<button class="tab${t.id === state.hofFilter ? ' active' : ''}" type="button" role="tab" aria-selected="${t.id === state.hofFilter}" data-hof-filter="${esc(t.id)}">${esc(t.name)} <span class="count">${t.n}</span></button>`).join('') +
        '<span class="tab-ink" aria-hidden="true"></span></div>'
      : '';

    main.innerHTML = pageHead('Hall of Fame', meta) + intro + filter + `<div class="hof-content">${hofContent(shown)}</div>`;
    const bar = main.querySelector('.hof-tabs');
    if (bar) moveInk(bar, bar.querySelector('.tab.active'));
  }

  function hofContent(list) {
    const byNewest = (a, b) => (b.year || 0) - (a.year || 0) || a.order - b.order;
    let featured = list.filter((h) => h.featured).sort(byNewest);
    if (!featured.length) featured = list.slice().sort(byNewest).slice(0, 3);
    featured = featured.slice(0, 6);

    const plaques = featured.map((h, i) => {
      const cat = categoryOf(h.category);
      return `<a class="plaque" href="#/player/${encodeURIComponent(h.name)}" style="--cc:${cat.color}"${anim(i + 3)}>
          <div class="plaque-stage">
            <span class="plaque-cat">${esc(cat.name)}</span>
            ${h.year ? `<span class="plaque-year">${h.year}</span>` : ''}
            ${skinImg('body', h, 'plaque-body-img', 240)}
          </div>
          <div class="plaque-text">
            <h2 class="plaque-name">${esc(h.name)}</h2>
            ${h.title ? `<p class="plaque-title">${esc(h.title)}</p>` : ''}
            ${h.text ? `<p class="plaque-cite">${esc(h.text)}</p>` : ''}
          </div>
        </a>`;
    }).join('');

    const years = new Map();
    for (const h of list.slice().sort(byNewest)) {
      const key = h.year || 0;
      if (!years.has(key)) years.set(key, []);
      years.get(key).push(h);
    }
    let n = featured.length + 3;
    const ledger = [...years.entries()].map(([year, entries]) => `<section class="hof-year"${anim(n++)}>
        <div class="hof-year-num">${year || '–'}</div>
        <div>${entries.sort((a, b) => a.key.localeCompare(b.key)).map((h) => {
          const cat = categoryOf(h.category);
          return `<div class="hof-entry" style="--cc:${cat.color}">
              ${skinImg('face', h, '', 40)}
              <div>
                <div class="hof-entry-name"><a href="#/player/${encodeURIComponent(h.name)}">${esc(h.name)}</a></div>
                ${h.title ? `<div class="hof-entry-title">${esc(h.title)}</div>` : ''}
                ${h.text ? `<div class="hof-entry-cite">${esc(h.text)}</div>` : ''}
              </div>
              <div class="hof-entry-cat">${esc(cat.name)}</div>
            </div>`;
        }).join('')}</div>
      </section>`).join('');

    return `<div class="hof-featured">${plaques}</div><div class="hof-ledger"><h2 class="hof-ledger-title"${anim(featured.length + 2)}>Every inductee</h2>${ledger}</div>`;
  }

  function renderEditor() {
    tabs.hidden = true;
    if (window.Tiers.editor) {
      window.Tiers.editor.mount(main);
    } else {
      main.innerHTML = notice('The editor did not load', 'Check that <code>editor.js</code> is uploaded next to <code>index.html</code>.', 'error');
    }
  }

  // ---------- Page changes ----------

  let swapToken = 0;
  let enterTimer = 0;

  /** Lets the marked elements arrive one after another, once; later redraws stay still. */
  function playEnter() {
    if (REDUCED) return;
    main.classList.remove('is-entering');
    void main.offsetWidth;
    main.classList.add('is-entering');
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => main.classList.remove('is-entering'), 1100);
  }

  /** Fades the old page out, draws the new one, and lets it arrive. */
  function swap(draw, scrollTop) {
    const token = ++swapToken;
    const finish = () => {
      if (token !== swapToken) return;
      main.classList.remove('is-leaving', 'is-entering');
      draw();
      if (scrollTop) window.scrollTo(0, 0);
      playEnter();
    };
    if (REDUCED || !state.rendered || !main.firstElementChild) {
      finish();
      return;
    }
    main.classList.add('is-leaving');
    setTimeout(finish, 140);
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
    (dialog.querySelector('[autofocus]') || dialog).focus({ preventScroll: true });
    return dialog;
  }

  /** Closes at once as far as the page is concerned; the dialog itself animates out. */
  function hideModal() {
    if (!modal) return;
    const lastFocus = modal.lastFocus;
    modal = null;
    document.body.style.overflow = '';
    const backdrop = modalRoot.querySelector('.modal-backdrop');
    if (backdrop) {
      if (REDUCED) {
        backdrop.remove();
      } else {
        backdrop.classList.add('closing');
        backdrop.removeAttribute('data-backdrop');
        const gone = () => { if (backdrop.parentNode) backdrop.remove(); };
        backdrop.addEventListener('animationend', (e) => { if (e.target === backdrop) gone(); });
        setTimeout(gone, 260);
      }
    }
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function viewHash(view) {
    if (view.page === 'mode') return `#/rankings/${encodeURIComponent(view.mode)}`;
    if (view.page === 'hof') return '#/hall-of-fame';
    if (view.page === 'edit') return '#/edit';
    return '#/rankings/overall';
  }

  /** A profile has its own address, so closing one goes back to the address behind it. */
  function requestClose() {
    if (modal && modal.kind === 'profile') {
      if (state.profileFromApp) history.back();
      else location.hash = viewHash(state.view);
      return;
    }
    hideModal();
  }

  function openProfile(name) {
    const key = String(name).toLowerCase();
    const p = state.byKey.get(key);
    const h = state.hofByKey.get(key);
    if (!p && !h) {
      showModal(`<div class="modal-body"><h2>Not found</h2><p>No ranked player is called <b>${esc(name)}</b>.</p></div>`, { kind: 'profile', label: 'Player not found' });
      return;
    }
    const who = p || h;
    const titleColor = p ? p.title.color : categoryOf(h.category).color;
    const facts = [];
    if (p) facts.push(`<span class="p-title">${esc(p.title.name)}</span>`);
    if (p && p.region) facts.push(regionText(p.region));
    facts.push(`<a href="https://namemc.com/profile/${encodeURIComponent(who.name)}" target="_blank" rel="noopener noreferrer">NameMC</a>`);

    let sections = '';
    if (p) {
      const held = state.modes.filter((m) => p.tiers[m.id]).sort((a, b) => p.tiers[a.id].order - p.tiers[b.id].order);
      sections += `<div class="profile-section">
          <div class="section-label">Overall</div>
          <div class="position"><span class="position-rank${medal(p.rank)}">#${p.rank}</span><span class="position-of">of ${state.ranked.length}</span><span class="position-points">${p.points}<small>${p.points === 1 ? 'point' : 'points'}</small></span></div>
        </div>
        <div class="profile-section">
          <div class="section-label">Tiers</div>
          <div class="profile-tiers">${held.map((m) => tierChip(m, p.tiers[m.id])).join('')}</div>
        </div>`;
    } else {
      sections += '<div class="profile-section"><div class="profile-empty">Not on the tier list.</div></div>';
    }
    if (h) {
      const cat = categoryOf(h.category);
      sections += `<div class="profile-section" style="--cc:${cat.color}">
          <div class="section-label">Hall of Fame</div>
          <div class="profile-hof"><b>${esc(cat.name)}</b><span>${h.year ? `Inducted ${h.year}` : 'Inducted'}${h.title ? `. ${esc(h.title)}` : ''}</span></div>
        </div>`;
    }

    showModal(`<div style="--title-color:${titleColor}">
        <div class="profile-head">
          <div class="profile-avatar">${skinImg('bust', who, 'profile-bust', 104)}</div>
          <div><h2 class="profile-name">${esc(who.name)}</h2><div class="profile-facts">${facts.join('')}</div></div>
        </div>
        ${sections}
      </div>`, { kind: 'profile', label: who.name });
  }

  function openInfo() {
    const tierRows = state.tiers.map((t) => `<tr><td><span class="tier-label" style="--tc:${tierColor(t)}">${t.id}</span> ${esc(t.name)}</td><td>${plural(t.points, 'point')}</td></tr>`).join('');
    const titleRows = state.titles.map((t) => `<tr><td><span class="info-title" style="--title-color:${t.color}">${esc(t.name)}</span></td><td>${t.minPoints}+</td></tr>`).join('');
    showModal(`<div class="modal-body">
        <h2>How points work</h2>
        <p>Each tier you hold is worth points. Your overall score is the total across all ${plural(state.modes.length, 'mode')}, so playing more modes well counts for more than one mode alone. On equal points, the better single tier goes first.</p>
        <div class="info-grid">
          <div><div class="section-label">Tiers</div><table class="info-table">${tierRows}</table></div>
          <div><div class="section-label">Titles</div><table class="info-table">${titleRows}</table></div>
        </div>
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
        ? items.map((p, i) => `<a class="suggest-item" role="option" id="sg-${i}" href="#/player/${encodeURIComponent(p.name)}" aria-selected="false">${skinImg('face', p, '', 24)}<span class="suggest-name">${esc(p.name)}</span><span class="suggest-points">#${p.rank}, ${plural(p.points, 'pt')}</span></a>`).join('')
        : `<div class="suggest-empty">Nobody called “${esc(input.value.trim())}”.</div>`;
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
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) close(); });
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
    if (parts[0] === 'hall-of-fame') return { page: 'hof' };
    if (parts[0] === 'player' && parts[1]) return { page: 'player', name: parts[1] };
    if (parts[0] === 'rankings' && parts[1] && parts[1].toLowerCase() !== 'overall') return { page: 'mode', mode: parts[1].toLowerCase() };
    return { page: 'overall' };
  }

  function sameView(a, b) {
    return a.page === b.page && (a.page !== 'mode' || a.mode === b.mode);
  }

  function renderView(view, scrollTop) {
    if (view.page === 'mode' && !state.modeById.get(view.mode)) {
      toast(`There is no mode called “${view.mode}”.`, true);
      view = { page: 'overall' };
      state.view = view;
      history.replaceState(null, '', '#/rankings/overall');
    }
    markNav(view.page === 'hof' ? 'hof' : view.page === 'edit' ? '' : 'rankings');
    const draw = view.page === 'edit' ? renderEditor
      : view.page === 'hof' ? renderHof
      : view.page === 'mode' ? () => renderMode(state.modeById.get(view.mode))
      : renderOverall;
    // The tabs move at once; the content follows.
    if (view.page === 'mode') renderTabs(view.mode);
    else if (view.page === 'overall') renderTabs('overall');
    else tabs.hidden = true;
    swap(draw, scrollTop);
    state.rendered = true;
  }

  function route() {
    if (!state.loaded) return;
    const next = parseHash();
    if (next.page === 'player') {
      state.profileFromApp = state.rendered;
      if (!state.rendered) renderView(state.view, false);
      openProfile(next.name);
      return;
    }
    const closingProfile = modal && modal.kind === 'profile';
    if (modal) hideModal();
    if (closingProfile && state.rendered && sameView(next, state.view)) return; // the page behind it is still right
    const leaving = state.view;
    if (leaving.page === 'edit' && next.page !== 'edit' && window.Tiers.editor && window.Tiers.editor.isDirty()) {
      toast('Your editor changes are not saved yet. They are kept until you close this tab.');
    }
    state.view = next;
    renderView(next, state.rendered && !sameView(leaving, next));
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
    const filter = target.closest('[data-hof-filter]');
    if (filter) {
      state.hofFilter = filter.dataset.hofFilter;
      const bar = filter.closest('.tabs');
      bar.querySelectorAll('.tab').forEach((t) => {
        const on = t === filter;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      moveInk(bar, filter);
      const content = main.querySelector('.hof-content');
      const shown = state.hof.filter((h) => state.hofFilter === 'all' || h.category === state.hofFilter);
      const redraw = () => {
        content.innerHTML = hofContent(shown);
        playEnter();
      };
      if (REDUCED) redraw();
      else { content.style.transition = 'opacity .12s, filter .12s'; content.style.opacity = '0'; content.style.filter = 'blur(4px)'; setTimeout(() => { content.style.opacity = ''; content.style.filter = ''; redraw(); }, 120); }
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
      const dialog = modalRoot.querySelector('.modal-backdrop:not(.closing) .modal');
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary, [tabindex="0"]')]
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
    get categories() { return state.categories; },
    get rawPlayers() { return state.rawPlayers; },
    get rawHof() { return state.rawHof; },
    get warnings() { return state.warnings.concat(state.hofWarnings); },
    get page() { return state.view.page; },
    esc, icon, modeIcon, tierColor, parseTier, titleFor, categoryOf, skinImg, regionText, plural,
    toast, copyText, showModal, hideModal, normalizePlayers, normalizeHof, jsonMistake,
    /** After the editor saves, the public pages show the new data without a reload. */
    replacePlayers(raw) { applyPlayers(raw); },
    replaceHof(raw) { applyHof(raw); },
    editor: null
  };

  load();
})();
