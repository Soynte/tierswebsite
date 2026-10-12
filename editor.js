/* CombatAdvanced Tiers: the editor, at #/edit.
 *
 * Two lists: players and their tiers (data/players.json), and the Hall of
 * Fame (data/halloffame.json). Saving writes whichever changed straight to
 * the site's GitHub repository through GitHub's API, with a token that lives
 * only in this browser. GitHub Pages then rebuilds the site by itself,
 * usually within a minute. Without a token both files can be downloaded or
 * copied and uploaded by hand.
 *
 * Nobody else can save: the page is public, but a save needs a token with
 * write access to the repository.
 */
(function () {
  'use strict';

  const T = window.Tiers;
  if (!T) return;

  const API = 'https://api.github.com';
  const NAME_RE = /^[A-Za-z0-9_]{1,16}$/;
  const KEY_TOKEN = 'tiers.githubToken';
  const KEY_TARGET = 'tiers.githubTarget';
  const DOCS = {
    players: { file: 'players.json', tab: 'tiers' },
    hof: { file: 'halloffame.json', tab: 'hof' }
  };

  let ed = null;   // the editor's state; kept while the tab is open, so leaving the page loses nothing
  let host = null; // the element it is drawn in
  let seq = 0;

  const $ = (selector) => document.querySelector(selector);
  const byName = (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  const textOf = (data) => JSON.stringify(data, null, 2) + '\n';
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- Browser storage (the token never goes anywhere but GitHub) ----------

  function readToken() {
    try {
      return localStorage.getItem(KEY_TOKEN) || sessionStorage.getItem(KEY_TOKEN) || '';
    } catch (e) {
      return '';
    }
  }

  function storeToken(token, remember) {
    try {
      localStorage.removeItem(KEY_TOKEN);
      sessionStorage.removeItem(KEY_TOKEN);
      if (token) (remember ? localStorage : sessionStorage).setItem(KEY_TOKEN, token);
    } catch (e) { /* storage blocked: the token lasts until the page closes */ }
  }

  /** Which repository to save to: the last one used here, else config.json, else the github.io address. */
  function readTarget() {
    const cfg = T.config.github || {};
    const legacyDir = typeof cfg.path === 'string' && cfg.path.includes('/') ? cfg.path.replace(/\/[^/]*$/, '') : '';
    const target = {
      owner: String(cfg.owner || '').trim(),
      repo: String(cfg.repo || '').trim(),
      branch: String(cfg.branch || 'main').trim() || 'main',
      dir: String(cfg.dir || legacyDir || 'data').replace(/^\/+|\/+$/g, '')
    };
    if ((!target.owner || !target.repo) && /\.github\.io$/i.test(location.hostname)) {
      const owner = location.hostname.split('.')[0];
      const first = location.pathname.split('/').filter(Boolean)[0];
      target.owner = target.owner || owner;
      target.repo = target.repo || (first && !/\.html?$/i.test(first) ? first : `${owner}.github.io`);
    }
    try {
      const saved = JSON.parse(localStorage.getItem(KEY_TARGET) || 'null');
      if (saved && saved.owner && saved.repo) {
        target.owner = saved.owner;
        target.repo = saved.repo;
        target.branch = saved.branch || target.branch;
      }
    } catch (e) { /* nothing saved */ }
    return target;
  }

  function storeTarget(target) {
    try {
      localStorage.setItem(KEY_TARGET, JSON.stringify({ owner: target.owner, repo: target.repo, branch: target.branch }));
    } catch (e) { /* storage blocked */ }
  }

  function pathOf(doc) {
    return (ed.target.dir ? `${ed.target.dir}/` : '') + DOCS[doc].file;
  }

  // ---------- players.json ----------

  function fromRawPlayers(raw) {
    const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.players) ? raw.players : [];
    const modeIds = new Set(T.modes.map((m) => m.id));
    const players = [];
    const seen = new Set();
    for (const entry of list) {
      const name = entry && typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const tiers = {};
      const keep = {}; // tiers in modes config.json no longer has: written back as they were
      const given = entry.tiers && typeof entry.tiers === 'object' && !Array.isArray(entry.tiers) ? entry.tiers : {};
      for (const [key, value] of Object.entries(given)) {
        const id = String(key).trim().toLowerCase();
        if (modeIds.has(id)) {
          const tier = T.parseTier(value);
          if (tier) tiers[id] = tier.id;
        } else {
          keep[key] = value;
        }
      }
      const extra = {}; // any other field, such as "uuid", is kept as it is
      for (const [key, value] of Object.entries(entry)) {
        if (key !== 'name' && key !== 'region' && key !== 'tiers') extra[key] = value;
      }
      const region = typeof entry.region === 'string' ? entry.region.trim().toUpperCase() : '';
      players.push({ id: ++seq, name, region, tiers, keep, extra, isNew: false });
    }
    players.sort(byName);
    return { list: players, top: topOf(raw, 'players') };
  }

  function buildPlayers(list, top) {
    const players = (list || ed.players).slice().sort(byName).map((p) => {
      const out = { name: p.name };
      if (p.region) out.region = p.region;
      const tiers = {};
      for (const m of T.modes) if (p.tiers[m.id]) tiers[m.id] = p.tiers[m.id];
      out.tiers = Object.assign(tiers, p.keep);
      return Object.assign(out, p.extra);
    });
    return Object.assign({}, top || ed.top, { players });
  }

  // ---------- halloffame.json ----------

  const HOF_FIELDS = ['name', 'role', 'color', 'from', 'to', 'quote', 'text', 'pose', 'featured', 'category', 'title', 'year'];

  function fromRawHof(raw) {
    const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.inductees) ? raw.inductees : [];
    const rawByKey = new Map();
    for (const entry of list) {
      const name = entry && typeof entry.name === 'string' ? entry.name.trim().toLowerCase() : '';
      if (name && !rawByKey.has(name)) rawByKey.set(name, entry);
    }
    let norm = [];
    try { norm = T.normalizeHof({ inductees: list }).inductees; } catch (e) { norm = []; }
    const out = norm.map((n) => {
      const entry = rawByKey.get(n.key) || {};
      const extra = {};
      for (const [key, value] of Object.entries(entry)) if (!HOF_FIELDS.includes(key)) extra[key] = value;
      return {
        id: ++seq, name: n.name, role: n.role, color: n.color, from: n.from, to: n.to,
        quote: n.quote, text: n.text, pose: n.pose, featured: n.featured, extra, isNew: false
      };
    });
    return { list: out, top: topOf(raw, 'inductees') };
  }

  function buildHof(list, top) {
    // Written in the editor's order: the order the Hall of Fame page shows.
    const inductees = (list || ed.hof).slice()
      .map((h) => {
        const out = { name: h.name };
        if (h.role.trim()) out.role = h.role.trim();
        if (h.color) out.color = h.color;
        if (h.from.trim()) out.from = h.from.trim();
        if (h.to.trim()) out.to = h.to.trim();
        if (h.quote.trim()) out.quote = h.quote.trim();
        if (h.text.trim()) out.text = h.text.trim();
        if (h.pose && h.pose !== T.defaultPose) out.pose = h.pose;
        if (h.featured) out.featured = true;
        return Object.assign(out, h.extra);
      });
    return Object.assign({}, top || ed.hofTop, { inductees });
  }

  function topOf(raw, listKey) {
    const top = {};
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      for (const [key, value] of Object.entries(raw)) if (key !== listKey && key !== 'updated') top[key] = value;
    }
    return top;
  }

  // ---------- Both files ----------

  function build(doc) {
    return doc === 'players' ? buildPlayers() : buildHof();
  }

  /** What is written to GitHub: players.json also says when it was last saved. */
  function fileText(doc, data) {
    return textOf(doc === 'players' ? Object.assign({ updated: today() }, data) : data);
  }

  function load(doc, raw) {
    const result = doc === 'players' ? fromRawPlayers(raw) : fromRawHof(raw);
    if (doc === 'players') { ed.players = result.list; ed.top = result.top; }
    else { ed.hof = result.list; ed.hofTop = result.top; }
    const data = build(doc);
    ed.doc[doc].savedData = data;
    ed.doc[doc].savedText = textOf(data);
  }

  function dirtyDoc(doc) {
    return !!ed && textOf(build(doc)) !== ed.doc[doc].savedText;
  }

  function isDirty() {
    return !!ed && (dirtyDoc('players') || dirtyDoc('hof'));
  }

  /** Points from active tiers; retired ones count for nothing here. */
  function pointsOf(p) {
    let sum = 0;
    for (const id of Object.values(p.tiers)) {
      const tier = T.parseTier(id);
      if (tier && !tier.retired) sum += tier.points;
    }
    return sum;
  }

  function skinOf(p) {
    return { name: p.name, uuid: typeof p.extra.uuid === 'string' ? p.extra.uuid : '' };
  }

  // ---------- GitHub ----------

  function contentsPath(doc) {
    const t = ed.target;
    return `/repos/${encodeURIComponent(t.owner)}/${encodeURIComponent(t.repo)}/contents/${pathOf(doc).split('/').map(encodeURIComponent).join('/')}`;
  }

  function apiError(status, data) {
    const t = ed.target;
    const repo = `${t.owner}/${t.repo}`;
    const said = data && data.message ? String(data.message) : '';
    let text;
    if (status === 0) text = 'Could not reach GitHub. Check your internet connection and try again.';
    else if (status === 401) text = 'GitHub did not accept the token. Check that it was copied whole and has not expired, or make a new one.';
    else if (status === 403 && /rate limit/i.test(said)) text = 'GitHub is limiting requests for a moment. Wait a minute and try again.';
    else if (status === 403) text = `This token is not allowed to change ${repo}. Give it access to that repository, with Contents set to "Read and write".`;
    else if (status === 404) text = `GitHub cannot find ${repo} (branch ${t.branch}). Check the owner, repository and branch, and that the token has access to that repository.`;
    else if (status === 409) text = 'The file changed on GitHub in the meantime.';
    else text = `GitHub answered ${status}${said ? `: ${said}` : ''}.`;
    const err = new Error(text);
    err.status = status;
    err.said = said;
    return err;
  }

  async function api(method, path, body) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        cache: 'no-store',
        headers: Object.assign(
          { Accept: 'application/vnd.github+json', Authorization: `Bearer ${ed.token}` },
          body ? { 'Content-Type': 'application/json' } : {}
        ),
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw apiError(0, null);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw apiError(res.status, data);
    return data;
  }

  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function fromBase64(b64) {
    const binary = atob(String(b64).replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /** A file as it is on GitHub right now, or null when the repository has no such file yet. */
  async function getFile(doc) {
    try {
      const data = await api('GET', `${contentsPath(doc)}?ref=${encodeURIComponent(ed.target.branch)}`);
      if (!data || Array.isArray(data) || data.type !== 'file') {
        throw new Error(`${pathOf(doc)} in ${ed.target.owner}/${ed.target.repo} is a folder, not a file.`);
      }
      return { sha: data.sha, text: fromBase64(data.content || '') };
    } catch (e) {
      if (e.status !== 404) throw e;
      // Tell "no such file" (fine: saving creates it) from "no such repository".
      await api('GET', `/repos/${encodeURIComponent(ed.target.owner)}/${encodeURIComponent(ed.target.repo)}`);
      return null;
    }
  }

  function putFile(doc, text, message) {
    const body = { message, content: toBase64(text), branch: ed.target.branch };
    if (ed.doc[doc].sha) body.sha = ed.doc[doc].sha;
    return api('PUT', contentsPath(doc), body);
  }

  /**
   * Reads both files from GitHub. Unsaved edits are never thrown away: when
   * there are some and GitHub's copy is newer than the list they started
   * from, `staleBase` makes the next save ask before replacing it.
   */
  async function refreshFromGitHub() {
    const outcomes = {};
    for (const doc of Object.keys(DOCS)) outcomes[doc] = await refreshDoc(doc);
    ed.connected = true;
    return outcomes;
  }

  async function refreshDoc(doc) {
    const file = await getFile(doc);
    const state = ed.doc[doc];
    state.sha = file ? file.sha : null;
    state.staleBase = false;
    if (!file) return 'missing';
    let data;
    let warnings;
    try {
      data = JSON.parse(file.text);
      warnings = (doc === 'players' ? T.normalizePlayers(data) : T.normalizeHof(data)).warnings;
    } catch (e) {
      const why = e instanceof SyntaxError ? T.jsonMistake(pathOf(doc), file.text, e) : T.esc(e.message);
      showProblem('On GitHub', `${why}<br><br>Fix it on GitHub, or save from here to replace it with the list below.`);
      return 'broken';
    }
    if (dirtyDoc(doc)) {
      const theirs = doc === 'players' ? fromRawPlayers(data) : fromRawHof(data);
      const theirText = textOf(doc === 'players' ? buildPlayers(theirs.list, theirs.top) : buildHof(theirs.list, theirs.top));
      state.staleBase = theirText !== state.savedText;
      return state.staleBase ? 'changed' : 'same';
    }
    ed.warnings[doc] = warnings;
    load(doc, data);
    if (doc === 'players') T.replacePlayers(data);
    else T.replaceHof(data);
    return 'loaded';
  }

  function playersMessage(before, after) {
    const old = new Map(before.players.map((p) => [p.name.toLowerCase(), p]));
    const now = new Map(after.players.map((p) => [p.name.toLowerCase(), p]));
    const modeName = (id) => (T.modes.find((m) => m.id === id) || { name: id }).name;
    const parts = [];
    for (const [key, p] of now) {
      const was = old.get(key);
      if (!was) { parts.push(`add ${p.name}`); continue; }
      const ids = new Set(Object.keys(was.tiers || {}).concat(Object.keys(p.tiers || {})));
      for (const id of ids) {
        const a = (was.tiers || {})[id] || 'none';
        const b = (p.tiers || {})[id] || 'none';
        if (a !== b) parts.push(`${p.name} ${modeName(id)} ${a} -> ${b}`);
      }
      if ((was.region || '') !== (p.region || '')) parts.push(`${p.name} region ${p.region || 'none'}`);
    }
    for (const [key, p] of old) if (!now.has(key)) parts.push(`remove ${p.name}`);
    return summary('Tiers', parts);
  }

  function hofMessage(before, after) {
    const old = new Map(before.inductees.map((h) => [h.name.toLowerCase(), h]));
    const now = new Map(after.inductees.map((h) => [h.name.toLowerCase(), h]));
    const parts = [];
    for (const [key, h] of now) {
      const was = old.get(key);
      if (!was) parts.push(`induct ${h.name}`);
      else if (JSON.stringify(was) !== JSON.stringify(h)) parts.push(`update ${h.name}`);
    }
    for (const [key, h] of old) if (!now.has(key)) parts.push(`remove ${h.name}`);
    const order = (d) => d.inductees.map((h) => h.name.toLowerCase()).filter((k) => old.has(k) && now.has(k)).join();
    if (order(before) !== order(after)) parts.push('reorder');
    return summary('Hall of Fame', parts);
  }

  function summary(prefix, parts) {
    if (!parts.length) return `${prefix}: update`;
    return `${prefix}: ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? ` and ${parts.length - 3} more` : ''}`;
  }

  async function save() {
    if (ed.busy) return;
    if (!ed.token) { openConnect(true); return; }
    const docs = Object.keys(DOCS).filter(dirtyDoc);
    if (!docs.length) return;
    setBusy(true, 'Saving…');
    hideProblem();
    try {
      if (!ed.connected) await refreshFromGitHub();
      for (const doc of docs) await saveDoc(doc);
      render();
      T.toast('Saved. The site shows it within a minute or two.');
    } catch (e) {
      showProblem('Not saved', T.esc(e.message));
      T.toast(e.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function saveDoc(doc) {
    const state = ed.doc[doc];
    const label = doc === 'players' ? 'players.json' : 'halloffame.json';
    if (state.staleBase && !confirm(`${label} on GitHub changed after you started editing (maybe from another device). Replace it with your version?`)) {
      throw new Error('Not saved. Reload the page to start from the newest version.');
    }
    const data = build(doc);
    const text = fileText(doc, data);
    const message = doc === 'players' ? playersMessage(state.savedData, data) : hofMessage(state.savedData, data);
    let result;
    try {
      result = await putFile(doc, text, message);
    } catch (e) {
      const conflict = e.status === 409 || (e.status === 422 && /sha/i.test(e.said));
      if (!conflict) throw e;
      const latest = await getFile(doc);
      const replace = confirm(`${label} was changed on GitHub after you opened the editor (maybe from another device). Replace it with your version?`);
      if (!replace) throw new Error('Not saved. Reload the page to start from the newest version.');
      state.sha = latest ? latest.sha : null;
      result = await putFile(doc, text, message);
    }
    state.sha = result && result.content ? result.content.sha : state.sha;
    state.savedData = data;
    state.savedText = textOf(data);
    state.staleBase = false;
    ed.justSaved = true;
    ed.warnings[doc] = [];
    if (doc === 'players') {
      ed.players.forEach((p) => { p.isNew = false; });
      T.replacePlayers(JSON.parse(text));
    } else {
      ed.hof.forEach((h) => { h.isNew = false; });
      T.replaceHof(data);
    }
  }

  // ---------- Drawing ----------

  function metaHtml(p) {
    if (!Object.keys(p.tiers).length) return 'No tiers yet, so not on the site';
    const points = pointsOf(p);
    const retired = Object.values(p.tiers).filter((id) => /^R/.test(id)).length;
    const title = T.titleFor(points);
    const note = retired ? ` · ${retired} retired` : '';
    if (!points && retired) return `Only retired tiers${note}`;
    return `<b>${T.esc(title.name)}</b> · ${T.plural(points, 'point')}${note}`;
  }

  function playerCard(p) {
    const title = T.titleFor(pointsOf(p));
    const regions = Object.keys(T.config.regions);
    if (p.region && !regions.includes(p.region)) regions.push(p.region);
    const regionOptions = '<option value="">No region</option>' +
      regions.map((r) => `<option value="${T.esc(r)}"${r === p.region ? ' selected' : ''}>${T.esc(r)}</option>`).join('');
    const modes = T.modes.map((m) => {
      const current = p.tiers[m.id] || '';
      const tier = current ? T.parseTier(current) : null;
      const opt = (t) => `<option value="${t.id}"${t.id === current ? ' selected' : ''}>${t.id}</option>`;
      const options = '<option value="">–</option>' + T.tiers.map(opt).join('') +
        `<optgroup label="Retired (no points)">${T.retiredTiers.map(opt).join('')}</optgroup>`;
      return `<label class="ed-mode${tier ? ' has' : ''}"${tier ? ` style="--tc:${T.tierColor(tier)}"` : ''}>${T.modeIcon(m)}` +
        `<span class="ed-mode-name">${T.esc(m.name)}</span>` +
        `<select data-mode="${T.esc(m.id)}" aria-label="${T.esc(`${p.name}: ${m.name} tier`)}">${options}</select></label>`;
    }).join('');
    return `<div class="ed-player${p.isNew ? ' is-new' : ''}" data-id="${p.id}" style="--title-color:${title.color}">
        ${T.skinImg('face', skinOf(p), 'ed-face', 40)}
        <div><div class="ed-name">${T.esc(p.name)}</div><div class="ed-meta">${metaHtml(p)}</div></div>
        <div class="ed-side">
          <select class="select ed-region" data-field="region" aria-label="${T.esc(p.name)}: region">${regionOptions}</select>
          <button class="icon-btn danger" type="button" data-ed="remove" aria-label="Remove ${T.esc(p.name)}" title="Remove">${T.icon('trash')}</button>
        </div>
        <div class="ed-modes">${modes}</div>
      </div>`;
  }

  function hofCard(h) {
    const colors = T.hofColors.slice();
    if (h.color && !colors.some((c) => c.color.toLowerCase() === h.color.toLowerCase())) colors.push({ name: h.color, color: h.color });
    const colorOptions = colors.map((c) => `<option value="${T.esc(c.color)}"${c.color.toLowerCase() === (h.color || '').toLowerCase() ? ' selected' : ''}>${T.esc(c.name)}</option>`).join('');
    const poses = T.poses.slice();
    if (h.pose && !poses.some((x) => x.id === h.pose)) poses.push({ id: h.pose, name: h.pose });
    const poseOptions = poses.map((x) => `<option value="${T.esc(x.id)}"${x.id === h.pose ? ' selected' : ''}>${T.esc(x.name)}</option>`).join('');
    const label = (text, control, cls) => `<label class="mini${cls ? ' ' + cls : ''}">${text}${control}</label>`;
    return `<div class="ed-hof${h.isNew ? ' is-new' : ''}" data-hid="${h.id}" style="--cc:${T.esc(h.color || '#e8b931')}">
        ${T.skinImg('face', skinOf(h), 'ed-face', 40)}
        <div>
          <div class="ed-name"><span class="ed-swatch"></span>${T.esc(h.name)}</div>
          <div class="ed-hof-fields">
            ${label('What they were', `<input class="input" data-hfield="role" value="${T.esc(h.role)}" placeholder="e.g. Head Admin, First champion" maxlength="40">`, 'half')}
            ${label('Colour', `<select class="select" data-hfield="color">${colorOptions}</select>`)}
            ${label('Skin pose', `<select class="select" data-hfield="pose">${poseOptions}</select>`)}
            ${label('From', `<input class="input" data-hfield="from" value="${T.esc(h.from)}" placeholder="e.g. 2025 or Mar 2025" maxlength="20">`)}
            ${label('To', `<input class="input" data-hfield="to" value="${T.esc(h.to)}" placeholder="empty = present" maxlength="20">`)}
            <label class="check half"><input type="checkbox" data-hfield="featured"${h.featured ? ' checked' : ''}> Featured (big card at the top)</label>
            ${label('Quote', `<input class="input" data-hfield="quote" value="${T.esc(h.quote)}" placeholder="Something they said (without quote marks)" maxlength="200">`, 'wide')}
            ${label('About', `<textarea class="textarea" data-hfield="text" rows="2" maxlength="400" placeholder="A sentence or two about them">${T.esc(h.text)}</textarea>`, 'wide')}
          </div>
        </div>
        <div class="ed-hof-tools">
          <button class="icon-btn" type="button" data-ed="hof-up" aria-label="Move ${T.esc(h.name)} up" title="Move up"${ed.hof.indexOf(h) === 0 ? ' disabled' : ''}>${T.icon('up')}</button>
          <span class="pos" title="Position on the page">${ed.hof.indexOf(h) + 1}</span>
          <button class="icon-btn" type="button" data-ed="hof-down" aria-label="Move ${T.esc(h.name)} down" title="Move down"${ed.hof.indexOf(h) === ed.hof.length - 1 ? ' disabled' : ''}>${T.icon('down')}</button>
          <button class="icon-btn danger" type="button" data-ed="remove-hof" aria-label="Remove ${T.esc(h.name)}" title="Remove">${T.icon('trash')}</button>
        </div>
      </div>`;
  }

  function listHtml() {
    const tiers = ed.tab === 'tiers';
    const all = tiers ? ed.players : ed.hof;
    if (!all.length) {
      return `<div class="ed-empty">${tiers ? 'No players yet.' : 'Nobody in the Hall of Fame yet.'} Type a Minecraft name above and press <b>Add</b>.</div>`;
    }
    const q = ed.filter.trim().toLowerCase();
    const shown = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    if (!shown.length) return `<div class="ed-empty">Nobody on this list matches “${T.esc(ed.filter.trim())}”.</div>`;
    return shown.map(tiers ? playerCard : hofCard).join('');
  }

  function warningsHtml() {
    const all = ed.warnings.players.concat(ed.warnings.hof);
    if (!all.length) return '';
    const shown = all.slice(0, 8).map((w) => `<li>${T.esc(w)}</li>`).join('');
    const more = all.length > 8 ? `<li>…and ${all.length - 8} more</li>` : '';
    return `<div class="notice warn ed-warnings"><h2>Some entries could not be read</h2><p>They are left out, and saving removes them from the file.</p><ul>${shown}${more}</ul></div>`;
  }

  function staleHtml() {
    const stale = Object.keys(DOCS).filter((d) => ed.doc[d].staleBase).map((d) => DOCS[d].file);
    if (!stale.length) return '';
    return `<div class="notice warn ed-warnings"><h2>Newer on GitHub</h2><p>${T.esc(stale.join(' and '))} changed on GitHub after this page loaded, maybe from another device. Saving replaces that change, so reload first unless you mean to.</p></div>`;
  }

  function connectionHtml() {
    const t = ed.target;
    if (ed.token && ed.connected) {
      return `<div class="ed-conn ok">
        <span class="grow">Saving to <b>${T.esc(t.owner)}/${T.esc(t.repo)}</b>, branch <b>${T.esc(t.branch)}</b>.</span>
        <button class="btn btn-small" type="button" data-ed="connect">Settings</button>
        <button class="btn btn-small" type="button" data-ed="forget">Forget token</button></div>`;
    }
    if (ed.token) {
      return `<div class="ed-conn">
        <span class="grow">A token is saved here, but GitHub has not confirmed it yet.</span>
        <button class="btn btn-small" type="button" data-ed="connect">Settings</button>
        <button class="btn btn-small" type="button" data-ed="forget">Forget token</button></div>`;
    }
    return `<div class="ed-conn">
      <span class="grow">Not connected to GitHub. Connect once to save from here, or download the files and upload them yourself.</span>
      <button class="btn btn-small btn-primary" type="button" data-ed="connect">Connect GitHub</button></div>`;
  }

  function render() {
    // A GitHub answer can arrive after the editor was left: never draw over another page.
    if (!host || !ed || T.page !== 'edit') return;
    const tiers = ed.tab === 'tiers';
    host.innerHTML = `<div class="editor-root">
        <div class="page-head" data-anim style="--i:0">
          <div><h1 class="page-title">Editor</h1></div>
          <div class="page-meta"><a class="link-btn" href="#/rankings/overall">Back to the site</a></div>
        </div>
        <div data-anim style="--i:1">${connectionHtml()}</div>
        <div class="tabs ed-tabs" role="tablist" data-anim style="--i:2">
          <button class="tab${tiers ? ' active' : ''}" type="button" role="tab" aria-selected="${tiers}" data-ed-tab="tiers">Tiers <span class="count">${ed.players.length}</span></button>
          <button class="tab${tiers ? '' : ' active'}" type="button" role="tab" aria-selected="${!tiers}" data-ed-tab="hof">Hall of Fame <span class="count">${ed.hof.length}</span></button>
          <span class="tab-ink" aria-hidden="true"></span>
        </div>
        <div class="editor-bar" data-anim style="--i:3">
          <form class="add-form" data-ed-form="add" autocomplete="off">
            <input class="input" name="name" placeholder="${tiers ? 'Minecraft name' : 'Minecraft name to induct'}" maxlength="16" spellcheck="false" autocapitalize="off" aria-label="Minecraft name to add">
            <button class="btn btn-primary" type="submit">${T.icon('plus')}<span>Add</span></button>
          </form>
          <input class="input ed-filter" type="text" placeholder="Filter this list" value="${T.esc(ed.filter)}" aria-label="Filter this list" spellcheck="false">
          <div class="ed-actions">
            <span class="dirty-flag" aria-live="polite"></span>
            <button class="btn" type="button" data-ed="download" title="Download ${tiers ? 'players.json' : 'halloffame.json'}">${T.icon('download')}<span>Download</span></button>
            <button class="btn" type="button" data-ed="copy" title="Copy ${tiers ? 'players.json' : 'halloffame.json'}">${T.icon('copy')}<span>Copy</span></button>
            <button class="btn btn-primary" type="button" data-ed="save">${T.icon('upload')}<span>Save</span></button>
          </div>
        </div>
        <div class="notice error ed-problem" hidden></div>
        ${staleHtml()}
        ${warningsHtml()}
        <div class="ed-list" data-anim style="--i:4">${listHtml()}</div>
      </div>`;
    placeInk();
    updateDirty();
  }

  function placeInk() {
    const bar = $('.editor-root .ed-tabs');
    if (!bar) return;
    const active = bar.querySelector('.tab.active');
    const ink = bar.querySelector('.tab-ink');
    ink.style.width = `${active.offsetWidth}px`;
    ink.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  function renderList() {
    const list = $('.editor-root .ed-list');
    if (list) list.innerHTML = listHtml();
  }

  function updateCounts() {
    const tabs = document.querySelectorAll('.editor-root .ed-tabs .count');
    if (tabs.length === 2) {
      tabs[0].textContent = ed.players.length;
      tabs[1].textContent = ed.hof.length;
    }
  }

  function updateDirty() {
    const flag = $('.editor-root .dirty-flag');
    if (!flag) return;
    const dirty = isDirty();
    if (dirty) ed.justSaved = false;
    flag.textContent = ed.busy ? ed.busyText : dirty ? 'Unsaved changes' : ed.justSaved ? 'Saved' : 'No changes';
    flag.classList.toggle('on', dirty && !ed.busy);
    document.querySelectorAll('.editor-root .ed-actions .btn').forEach((b) => { b.disabled = ed.busy; });
    const saveButton = $('.editor-root [data-ed="save"]');
    if (saveButton) saveButton.disabled = ed.busy || !dirty;
  }

  function setBusy(on, text) {
    ed.busy = on;
    ed.busyText = text || '';
    updateDirty();
  }

  function showProblem(title, html) {
    const box = $('.editor-root .ed-problem');
    if (!box) return;
    box.innerHTML = `<h2>${T.esc(title)}</h2><p>${html}</p>`;
    box.hidden = false;
  }

  function hideProblem() {
    const box = $('.editor-root .ed-problem');
    if (box) box.hidden = true;
  }

  function flash(selector) {
    const card = document.querySelector(selector);
    if (!card) return;
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');
  }

  function findPlayer(element) {
    const card = element.closest('.ed-player');
    return card ? ed.players.find((p) => String(p.id) === card.dataset.id) : null;
  }

  function findHof(element) {
    const card = element.closest('.ed-hof');
    return card ? ed.hof.find((h) => String(h.id) === card.dataset.hid) : null;
  }

  // ---------- Actions ----------

  function add(form) {
    const input = form.elements.name;
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (!NAME_RE.test(name)) {
      T.toast('A Minecraft name is 1 to 16 letters, numbers or underscores, with no spaces.', true);
      input.focus();
      return;
    }
    const tiers = ed.tab === 'tiers';
    const list = tiers ? ed.players : ed.hof;
    const existing = list.find((x) => x.name.toLowerCase() === name.toLowerCase());
    ed.filter = '';
    $('.editor-root .ed-filter').value = '';
    if (existing) {
      T.toast(`${existing.name} is already on this list.`);
      renderList();
      flash(tiers ? `.editor-root .ed-player[data-id="${existing.id}"]` : `.editor-root .ed-hof[data-hid="${existing.id}"]`);
      return;
    }
    let entry;
    if (tiers) {
      entry = { id: ++seq, name, region: '', tiers: {}, keep: {}, extra: {}, isNew: true };
      ed.players.unshift(entry);
    } else {
      const known = ed.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
      entry = {
        id: ++seq,
        name: known ? known.name : name,
        role: '',
        color: T.hofColors.length ? T.hofColors[0].color : '#e8b931',
        from: String(new Date().getFullYear()),
        to: '',
        quote: '',
        text: '',
        pose: T.defaultPose,
        featured: false,
        extra: {},
        isNew: true
      };
      ed.hof.unshift(entry);
    }
    input.value = '';
    renderList();
    updateCounts();
    updateDirty();
    flash(tiers ? `.editor-root .ed-player[data-id="${entry.id}"]` : `.editor-root .ed-hof[data-hid="${entry.id}"]`);
    T.toast(tiers ? `Added ${entry.name}. Now pick their tiers.` : `Added ${entry.name}. Write what they were.`);
  }

  function remove(list, entry, what) {
    if (!confirm(`Remove ${entry.name} from ${what}?`)) return;
    const i = list.indexOf(entry);
    if (i >= 0) list.splice(i, 1);
    renderList();
    updateCounts();
    updateDirty();
    T.toast(`Removed ${entry.name}. Save to make it final.`);
  }

  /** Swaps an inductee with the one above or below; the page shows them in this order. */
  function moveHof(h, step) {
    const i = ed.hof.indexOf(h);
    const j = i + step;
    if (i < 0 || j < 0 || j >= ed.hof.length) return;
    ed.hof[i] = ed.hof[j];
    ed.hof[j] = h;
    renderList();
    updateDirty();
    const card = document.querySelector(`.editor-root .ed-hof[data-hid="${h.id}"]`);
    if (card) {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const btn = card.querySelector(`[data-ed="${step < 0 ? 'hof-up' : 'hof-down'}"]`);
      if (btn && !btn.disabled) btn.focus({ preventScroll: true });
    }
  }

  function download() {
    const doc = ed.tab === 'tiers' ? 'players' : 'hof';
    const blob = new Blob([fileText(doc, build(doc))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = DOCS[doc].file;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    T.toast(`Downloaded ${DOCS[doc].file}. Upload it into the data folder on GitHub.`);
  }

  function copy() {
    const doc = ed.tab === 'tiers' ? 'players' : 'hof';
    T.copyText(fileText(doc, build(doc)), `Copied. Paste it over data/${DOCS[doc].file} on GitHub.`);
  }

  function forgetToken() {
    if (!confirm('Forget the GitHub token on this device? You can paste it again any time.')) return;
    storeToken('', false);
    ed.token = '';
    ed.connected = false;
    for (const doc of Object.keys(DOCS)) ed.doc[doc].sha = null;
    render();
    T.toast('Token forgotten.');
  }

  function openConnect(thenSave) {
    const t = ed.target;
    ed.saveAfterConnect = !!thenSave;
    const dialog = T.showModal(`<div class="modal-body">
        <h2>Connect GitHub</h2>
        <p>Saving changes the files in <code>${T.esc(t.dir || '/')}</code> of the site's GitHub repository. For that the editor needs a token, a key for that one repository. It stays in this browser and is only ever sent to GitHub.</p>
        <form class="form" data-ed-form="connect" autocomplete="off">
          <label>GitHub token<input class="input" name="token" type="password" placeholder="github_pat_…" spellcheck="false" autocomplete="off" autofocus></label>
          <div class="form-row">
            <label>Owner<input class="input" name="owner" value="${T.esc(t.owner)}" spellcheck="false" autocapitalize="off"></label>
            <label>Repository<input class="input" name="repo" value="${T.esc(t.repo)}" spellcheck="false" autocapitalize="off"></label>
            <label>Branch<input class="input" name="branch" value="${T.esc(t.branch)}" spellcheck="false" autocapitalize="off"></label>
          </div>
          <label class="check"><input type="checkbox" name="remember" checked> Remember on this device</label>
          <details${ed.token ? '' : ' open'}>
            <summary>How to make a token</summary>
            <ol>
              <li>On GitHub, open <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens</b>, and press <b>Generate new token</b>.</li>
              <li>Give it a name and pick an <b>expiration</b> from the list, such as 90 days.</li>
              <li><b>Repository access:</b> <i>Only select repositories</i>, and pick <b>${T.esc(t.repo || 'the site\'s repository')}</b>.</li>
              <li><b>Permissions:</b> add <b>Contents</b> and set it to <b>Read and write</b>.</li>
              <li>Press <b>Generate token</b>, copy it (it starts with <code>github_pat_</code>) and paste it above.</li>
            </ol>
          </details>
          <p class="form-error" hidden></p>
          <div class="form-actions">
            <button class="btn" type="button" data-action="close-modal">Cancel</button>
            <button class="btn btn-primary" type="submit">Connect</button>
          </div>
        </form>
      </div>`, { label: 'Connect GitHub', kind: 'connect', wide: true });
    if (ed.token) dialog.querySelector('[name="token"]').placeholder = 'Saved. Paste a new token only to replace it';
  }

  async function connect(form) {
    const f = form.elements;
    const error = form.querySelector('.form-error');
    const fail = (message) => { error.textContent = message; error.hidden = false; };
    const token = f.token.value.trim() || ed.token;
    const target = { owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: f.branch.value.trim() || 'main', dir: ed.target.dir };
    if (!token) { fail('Paste a token first.'); return; }
    if (/\s/.test(token)) { fail('The token has a space in it. Copy it again.'); return; }
    if (!target.owner || !target.repo) { fail('Fill in the owner and the repository.'); return; }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Checking…';
    error.hidden = true;
    const before = {
      token: ed.token, target: ed.target, connected: ed.connected,
      doc: JSON.parse(JSON.stringify(ed.doc))
    };
    ed.token = token;
    ed.target = target;
    try {
      const outcomes = await refreshFromGitHub();
      storeToken(token, f.remember.checked);
      storeTarget(target);
      T.hideModal();
      render();
      if (Object.values(outcomes).includes('changed')) T.toast('Connected. Something on GitHub is newer than this page; see the note below.', true);
      else T.toast(`Connected to ${target.owner}/${target.repo}.`);
      if (ed.saveAfterConnect) {
        ed.saveAfterConnect = false;
        save();
      }
    } catch (e) {
      ed.token = before.token;
      ed.target = before.target;
      ed.connected = before.connected;
      ed.doc = before.doc;
      fail(e.message);
      submit.disabled = false;
      submit.textContent = 'Connect';
    }
  }

  // ---------- Events (one set for the whole page, matched by selector) ----------

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.matches('.editor-root form[data-ed-form="add"]')) { e.preventDefault(); add(form); }
    else if (form.matches('form[data-ed-form="connect"]')) { e.preventDefault(); connect(form); }
  });

  document.addEventListener('click', (e) => {
    if (!ed) return;
    const tab = e.target.closest('.editor-root [data-ed-tab]');
    if (tab) {
      if (ed.tab === tab.dataset.edTab) return;
      ed.tab = tab.dataset.edTab;
      ed.filter = '';
      render();
      return;
    }
    const button = e.target.closest('.editor-root [data-ed]');
    if (!button) return;
    const action = button.dataset.ed;
    if (action === 'remove') { const p = findPlayer(button); if (p) remove(ed.players, p, 'the tier list'); }
    else if (action === 'remove-hof') { const h = findHof(button); if (h) remove(ed.hof, h, 'the Hall of Fame'); }
    else if (action === 'hof-up' || action === 'hof-down') { const h = findHof(button); if (h) moveHof(h, action === 'hof-up' ? -1 : 1); }
    else if (action === 'download') download();
    else if (action === 'copy') copy();
    else if (action === 'save') save();
    else if (action === 'connect') openConnect(false);
    else if (action === 'forget') forgetToken();
  });

  function onHofField(e) {
    const h = findHof(e.target);
    if (!h) return;
    const field = e.target.dataset.hfield;
    if (field === 'featured') h.featured = e.target.checked;
    else h[field] = e.target.value;
    if (field === 'color') e.target.closest('.ed-hof').style.setProperty('--cc', h.color);
    updateDirty();
  }

  document.addEventListener('change', (e) => {
    if (!ed || !e.target.closest('.editor-root')) return;
    if (e.target.matches('[data-hfield]')) { onHofField(e); return; }
    const p = findPlayer(e.target);
    if (!p) return;
    if (e.target.matches('select[data-mode]')) {
      const modeId = e.target.dataset.mode;
      const tier = e.target.value ? T.parseTier(e.target.value) : null;
      if (tier) p.tiers[modeId] = tier.id;
      else delete p.tiers[modeId];
      const label = e.target.closest('.ed-mode');
      label.classList.toggle('has', !!tier);
      if (tier) label.style.setProperty('--tc', T.tierColor(tier));
      else label.style.removeProperty('--tc');
    } else if (e.target.matches('select[data-field="region"]')) {
      p.region = e.target.value;
    }
    const card = e.target.closest('.ed-player');
    card.querySelector('.ed-meta').innerHTML = metaHtml(p);
    card.style.setProperty('--title-color', T.titleFor(pointsOf(p)).color);
    updateDirty();
  });

  document.addEventListener('input', (e) => {
    if (!ed) return;
    if (e.target.matches('.editor-root input[data-hfield]:not([type="checkbox"]), .editor-root textarea[data-hfield]')) {
      onHofField(e);
      return;
    }
    if (!e.target.matches('.editor-root .ed-filter')) return;
    ed.filter = e.target.value;
    renderList();
  });

  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('resize', () => { if (ed && T.page === 'edit') placeInk(); });

  T.editor = {
    mount(element) {
      host = element;
      if (!ed) {
        const warnings = { players: [], hof: [] };
        try { warnings.players = T.normalizePlayers(T.rawPlayers).warnings; } catch (e) { /* shown by the site */ }
        try { warnings.hof = T.normalizeHof(T.rawHof || { inductees: [] }).warnings; } catch (e) { /* shown by the site */ }
        ed = {
          tab: 'tiers',
          players: [], top: {}, hof: [], hofTop: {},
          doc: {
            players: { sha: null, savedText: '', savedData: null, staleBase: false },
            hof: { sha: null, savedText: '', savedData: null, staleBase: false }
          },
          justSaved: false, filter: '', warnings,
          token: readToken(), target: readTarget(), connected: false,
          busy: false, busyText: '', saveAfterConnect: false
        };
        load('players', T.rawPlayers);
        load('hof', T.rawHof || { inductees: [] });
        if (ed.token) {
          // A remembered token: start from GitHub's copies, which are never behind the site's.
          refreshFromGitHub().then(render, (e) => { ed.connected = false; render(); T.toast(e.message, true); });
        }
      }
      render();
    },
    isDirty
  };
})();
