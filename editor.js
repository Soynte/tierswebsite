/* CombatAdvanced Tiers: the editor, at #/edit.
 *
 * Add any Minecraft player, pick their tier in each mode, then save.
 *
 * Saving changes data/players.json in the site's GitHub repository through
 * GitHub's API, with a token that lives only in this browser. GitHub Pages
 * then rebuilds the site by itself, usually within a minute. Without a token
 * the new players.json can be downloaded or copied, and uploaded by hand.
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

  let ed = null;   // the editor's state; kept while the tab is open, so leaving the page loses nothing
  let host = null; // the element it is drawn in
  let seq = 0;

  const $ = (selector) => document.querySelector(selector);
  const byName = (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  const textOf = (data) => JSON.stringify(data, null, 2) + '\n';

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
    const target = {
      owner: String(cfg.owner || '').trim(),
      repo: String(cfg.repo || '').trim(),
      branch: String(cfg.branch || 'main').trim() || 'main',
      path: String(cfg.path || 'data/players.json').replace(/^\/+/, '')
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

  // ---------- players.json <-> the editor's list ----------

  function fromRaw(raw) {
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
    const top = {};
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      for (const [key, value] of Object.entries(raw)) if (key !== 'players') top[key] = value;
    }
    return { players, top };
  }

  function buildData(list, top) {
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

  function load(raw) {
    const result = fromRaw(raw);
    ed.players = result.players;
    ed.top = result.top;
    ed.savedData = buildData();
    ed.savedText = textOf(ed.savedData);
    ed.justSaved = false;
  }

  function isDirty() {
    return !!ed && textOf(buildData()) !== ed.savedText;
  }

  function pointsOf(p) {
    let sum = 0;
    for (const id of Object.values(p.tiers)) {
      const tier = T.parseTier(id);
      if (tier) sum += tier.points;
    }
    return sum;
  }

  function skinOf(p) {
    return { name: p.name, uuid: typeof p.extra.uuid === 'string' ? p.extra.uuid : '' };
  }

  // ---------- GitHub ----------

  function contentsPath() {
    const t = ed.target;
    return `/repos/${encodeURIComponent(t.owner)}/${encodeURIComponent(t.repo)}/contents/${t.path.split('/').map(encodeURIComponent).join('/')}`;
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
    else if (status === 409) text = 'players.json changed on GitHub in the meantime.';
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

  /** players.json as it is on GitHub right now, or null when the repository has no such file yet. */
  async function getFile() {
    try {
      const data = await api('GET', `${contentsPath()}?ref=${encodeURIComponent(ed.target.branch)}`);
      if (!data || Array.isArray(data) || data.type !== 'file') {
        throw new Error(`${ed.target.path} in ${ed.target.owner}/${ed.target.repo} is a folder, not a file.`);
      }
      return { sha: data.sha, text: fromBase64(data.content || '') };
    } catch (e) {
      if (e.status !== 404) throw e;
      // Tell "no such file" (fine: saving creates it) from "no such repository".
      await api('GET', `/repos/${encodeURIComponent(ed.target.owner)}/${encodeURIComponent(ed.target.repo)}`);
      return null;
    }
  }

  function putFile(text, message) {
    const body = { message, content: toBase64(text), branch: ed.target.branch };
    if (ed.sha) body.sha = ed.sha;
    return api('PUT', contentsPath(), body);
  }

  /**
   * Reads players.json from GitHub. Unsaved edits are never thrown away: when
   * there are some and GitHub's copy is newer than the list they started
   * from, `staleBase` makes the next save ask before replacing it.
   */
  async function refreshFromGitHub() {
    const file = await getFile();
    ed.connected = true;
    ed.sha = file ? file.sha : null;
    ed.staleBase = false;
    if (!file) return 'missing';
    let data;
    let warnings;
    try {
      data = JSON.parse(file.text);
      warnings = T.normalizePlayers(data).warnings;
    } catch (e) {
      const why = e instanceof SyntaxError ? T.jsonMistake(ed.target.path, file.text, e) : T.esc(e.message);
      showProblem(`${why}<br><br>Fix it on GitHub, or save from here to replace it with the list below.`);
      return 'broken';
    }
    if (isDirty()) {
      const theirs = fromRaw(data);
      ed.staleBase = textOf(buildData(theirs.players, theirs.top)) !== ed.savedText;
      return ed.staleBase ? 'changed' : 'same';
    }
    ed.warnings = warnings;
    load(data);
    T.replacePlayers(data);
    return 'loaded';
  }

  function commitMessage(before, after) {
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
    if (!parts.length) return 'Tiers: update players.json';
    return `Tiers: ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? ` and ${parts.length - 3} more` : ''}`;
  }

  async function save() {
    if (ed.busy) return;
    if (!ed.token) { openConnect(true); return; }
    const data = buildData();
    const text = textOf(data);
    setBusy(true, 'Saving…');
    try {
      if (!ed.connected) await refreshFromGitHub();
      if (ed.staleBase && !confirm('players.json on GitHub changed after you started editing (maybe from another device). Replace it with your list?')) {
        throw new Error('Not saved. Reload the page to start from the newest players.json.');
      }
      const message = commitMessage(ed.savedData, data);
      let result;
      try {
        result = await putFile(text, message);
      } catch (e) {
        const conflict = e.status === 409 || (e.status === 422 && /sha/i.test(e.said));
        if (!conflict) throw e;
        const latest = await getFile();
        const replace = confirm('players.json was changed on GitHub after you opened the editor (maybe from another device). Replace it with your version?');
        if (!replace) throw new Error('Not saved. Reload the page to start from the newest players.json.');
        ed.sha = latest ? latest.sha : null;
        result = await putFile(text, message);
      }
      ed.sha = result && result.content ? result.content.sha : ed.sha;
      ed.savedData = data;
      ed.savedText = text;
      ed.staleBase = false;
      ed.justSaved = true;
      ed.warnings = [];
      ed.players.forEach((p) => { p.isNew = false; });
      T.replacePlayers(data);
      render();
      T.toast('Saved. The site shows it within a minute or two.');
    } catch (e) {
      showProblem(T.esc(e.message));
      T.toast(e.message, true);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Drawing ----------

  function metaHtml(p) {
    if (!Object.keys(p.tiers).length) return '<span>No tiers yet, so not shown on the site</span>';
    const points = pointsOf(p);
    const title = T.titleFor(points);
    return `${T.icon('star')}<b>${T.esc(title.name)}</b><span>· ${T.plural(points, 'point')}</span>`;
  }

  function cardHtml(p) {
    const title = T.titleFor(pointsOf(p));
    const regions = Object.keys(T.config.regions);
    if (p.region && !regions.includes(p.region)) regions.push(p.region);
    const regionOptions = '<option value="">No region</option>' +
      regions.map((r) => `<option value="${T.esc(r)}"${r === p.region ? ' selected' : ''}>${T.esc(r)}</option>`).join('');
    const modes = T.modes.map((m) => {
      const current = p.tiers[m.id] || '';
      const tier = current ? T.parseTier(current) : null;
      const options = '<option value="">—</option>' +
        T.tiers.map((t) => `<option value="${t.id}"${t.id === current ? ' selected' : ''}>${t.id}</option>`).join('');
      return `<label class="ed-mode${tier ? ' has' : ''}"${tier ? ` style="--tc:${T.tierColor(tier)}"` : ''}>${T.modeIcon(m)}` +
        `<span class="ed-mode-name">${T.esc(m.name)}</span>` +
        `<select data-mode="${T.esc(m.id)}" aria-label="${T.esc(`${p.name}: ${m.name} tier`)}">${options}</select></label>`;
    }).join('');
    return `<div class="ed-player${p.isNew ? ' is-new' : ''}" data-id="${p.id}" style="--title-color:${title.color}">
        ${T.skinImg('face', skinOf(p), 'ed-face', 40)}
        <div class="ed-info"><div class="ed-name">${T.esc(p.name)}</div><div class="ed-meta">${metaHtml(p)}</div></div>
        <div class="ed-side">
          <select class="ed-region" data-field="region" aria-label="${T.esc(p.name)}: region">${regionOptions}</select>
          <button class="icon-btn danger" type="button" data-ed="remove" aria-label="Remove ${T.esc(p.name)}" title="Remove from the list">${T.icon('trash')}</button>
        </div>
        <div class="ed-modes">${modes}</div>
      </div>`;
  }

  function listHtml() {
    if (!ed.players.length) {
      return '<div class="ed-empty">No players yet. Type a Minecraft name above and press <b>Add player</b>.</div>';
    }
    const q = ed.filter.trim().toLowerCase();
    const shown = q ? ed.players.filter((p) => p.name.toLowerCase().includes(q)) : ed.players;
    if (!shown.length) return `<div class="ed-empty">No player on the list matches “${T.esc(ed.filter.trim())}”.</div>`;
    return shown.map(cardHtml).join('');
  }

  function warningsHtml() {
    if (!ed.warnings.length) return '';
    const shown = ed.warnings.slice(0, 8).map((w) => `<li>${T.esc(w)}</li>`).join('');
    const more = ed.warnings.length > 8 ? `<li>…and ${ed.warnings.length - 8} more</li>` : '';
    return `<div class="ed-warnings"><b>Some of players.json could not be read.</b> These parts are left out, and saving removes them from the file:<ul>${shown}${more}</ul></div>`;
  }

  function connectionHtml() {
    const t = ed.target;
    if (ed.token && ed.connected) {
      return `<div class="ed-conn ok"><span class="dot" aria-hidden="true"></span>
        <span class="grow">Saving to <b>${T.esc(t.owner)}/${T.esc(t.repo)}</b>, branch <b>${T.esc(t.branch)}</b>.</span>
        <button class="btn btn-small" type="button" data-ed="connect">Settings</button>
        <button class="btn btn-small" type="button" data-ed="forget">Forget token</button></div>`;
    }
    if (ed.token) {
      return `<div class="ed-conn"><span class="dot" aria-hidden="true"></span>
        <span class="grow">A token is saved here, but GitHub has not confirmed it yet.</span>
        <button class="btn btn-small" type="button" data-ed="connect">Settings</button>
        <button class="btn btn-small" type="button" data-ed="forget">Forget token</button></div>`;
    }
    return `<div class="ed-conn"><span class="dot" aria-hidden="true"></span>
      <span class="grow">Not connected to GitHub. Connect once to save from this page, or press <b>Download</b> and upload the file to GitHub yourself.</span>
      <button class="btn btn-small btn-primary" type="button" data-ed="connect">Connect GitHub</button></div>`;
  }

  function render() {
    // A GitHub answer can arrive after the editor was left: never draw over another page.
    if (!host || !ed || T.page !== 'edit') return;
    host.innerHTML = `<div class="editor-root">
        <div class="page-head">
          <div><h1 class="page-title">Tier editor</h1><div class="page-sub">Add any Minecraft player, pick their tier in each mode, then save.</div></div>
          <a class="btn" href="#/rankings/overall">${T.icon('back')}<span>Back to rankings</span></a>
        </div>
        ${connectionHtml()}
        ${ed.staleBase ? '<div class="ed-warnings"><b>players.json on GitHub is newer than the list below.</b> Someone saved from another device after this page loaded. Saving replaces their change, so reload the page first unless you mean to.</div>' : ''}
        <div class="editor-bar">
          <form class="add-form" data-ed-form="add" autocomplete="off">
            <input class="input" name="name" placeholder="Minecraft name" maxlength="16" spellcheck="false" autocapitalize="off" aria-label="Minecraft name to add">
            <button class="btn btn-primary" type="submit">${T.icon('plus')}<span>Add player</span></button>
          </form>
          <input class="input ed-filter" type="text" placeholder="Find a player on the list…" value="${T.esc(ed.filter)}" aria-label="Find a player on the list" spellcheck="false">
          <div class="ed-actions">
            <span class="dirty-flag" aria-live="polite"></span>
            <button class="btn" type="button" data-ed="download" title="Download players.json">${T.icon('download')}<span>Download</span></button>
            <button class="btn" type="button" data-ed="copy" title="Copy players.json">${T.icon('copy')}<span>Copy</span></button>
            <button class="btn btn-primary" type="button" data-ed="save">${T.icon('upload')}<span>Save</span></button>
          </div>
        </div>
        <div class="notice error ed-problem" hidden></div>
        ${warningsHtml()}
        <div class="ed-list">${listHtml()}</div>
      </div>`;
    updateDirty();
  }

  function renderList() {
    const list = $('.editor-root .ed-list');
    if (list) list.innerHTML = listHtml();
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

  function showProblem(html) {
    const box = $('.editor-root .ed-problem');
    if (!box) return;
    box.innerHTML = `<h2>Not saved</h2><p>${html}</p>`;
    box.hidden = false;
  }

  function flash(id) {
    const card = document.querySelector(`.editor-root .ed-player[data-id="${id}"]`);
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

  // ---------- Actions ----------

  function addPlayer(form) {
    const input = form.elements.name;
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (!NAME_RE.test(name)) {
      T.toast('A Minecraft name is 1 to 16 letters, numbers or underscores, with no spaces.', true);
      input.focus();
      return;
    }
    const existing = ed.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      T.toast(`${existing.name} is already on the list.`);
      ed.filter = '';
      $('.editor-root .ed-filter').value = '';
      renderList();
      flash(existing.id);
      return;
    }
    const p = { id: ++seq, name, region: '', tiers: {}, keep: {}, extra: {}, isNew: true };
    ed.players.unshift(p);
    ed.filter = '';
    $('.editor-root .ed-filter').value = '';
    input.value = '';
    renderList();
    updateDirty();
    flash(p.id);
    T.toast(`Added ${name}. Now pick their tiers.`);
  }

  function removePlayer(p) {
    if (!confirm(`Remove ${p.name} from the tier list?`)) return;
    ed.players = ed.players.filter((x) => x !== p);
    renderList();
    updateDirty();
    T.toast(`Removed ${p.name}. Save to make it final.`);
  }

  function download() {
    const blob = new Blob([textOf(buildData())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'players.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    T.toast('Downloaded players.json. Upload it into the data folder on GitHub.');
  }

  function forgetToken() {
    if (!confirm('Forget the GitHub token on this device? You can paste it again any time.')) return;
    storeToken('', false);
    ed.token = '';
    ed.connected = false;
    ed.sha = null;
    render();
    T.toast('Token forgotten.');
  }

  function openConnect(thenSave) {
    const t = ed.target;
    ed.saveAfterConnect = !!thenSave;
    const dialog = T.showModal(`<div class="modal-body">
        <h2>Save straight to GitHub</h2>
        <p>Saving changes <code>${T.esc(t.path)}</code> in the site's GitHub repository. For that the editor needs a token, a key that can change that one repository. It stays in this browser and is only ever sent to GitHub.</p>
        <form class="form" data-ed-form="connect" autocomplete="off">
          <label>GitHub token<input class="input" name="token" type="password" placeholder="github_pat_…" spellcheck="false" autocomplete="off" autofocus></label>
          <div class="form-row">
            <label>Owner<input class="input" name="owner" value="${T.esc(t.owner)}" spellcheck="false" autocapitalize="off"></label>
            <label>Repository<input class="input" name="repo" value="${T.esc(t.repo)}" spellcheck="false" autocapitalize="off"></label>
            <label>Branch<input class="input" name="branch" value="${T.esc(t.branch)}" spellcheck="false" autocapitalize="off"></label>
          </div>
          <label class="check"><input type="checkbox" name="remember" checked> Remember on this device</label>
          <details${ed.token ? '' : ' open'}>
            <summary>How to make a token (two minutes)</summary>
            <ol>
              <li>On GitHub, open <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens</b>, and press <b>Generate new token</b>.</li>
              <li>Give it a name, like <i>tier editor</i>, and an expiry date.</li>
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
    const target = { owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: f.branch.value.trim() || 'main', path: ed.target.path };
    if (!token) { fail('Paste a token first.'); return; }
    if (/\s/.test(token)) { fail('The token has a space in it. Copy it again.'); return; }
    if (!target.owner || !target.repo) { fail('Fill in the owner and the repository.'); return; }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Checking…';
    error.hidden = true;
    const before = { token: ed.token, target: ed.target, connected: ed.connected, sha: ed.sha };
    ed.token = token;
    ed.target = target;
    try {
      const outcome = await refreshFromGitHub();
      storeToken(token, f.remember.checked);
      storeTarget(target);
      T.hideModal();
      render();
      if (outcome === 'missing') T.toast(`Connected. ${target.repo} has no ${target.path} yet; saving will create it.`);
      else if (outcome === 'changed') T.toast('Connected. players.json on GitHub is newer than this page; saving replaces it with your list.', true);
      else T.toast(`Connected to ${target.owner}/${target.repo}.`);
      if (ed.saveAfterConnect) {
        ed.saveAfterConnect = false;
        save();
      }
    } catch (e) {
      Object.assign(ed, before);
      fail(e.message);
      submit.disabled = false;
      submit.textContent = 'Connect';
    }
  }

  // ---------- Events (one set for the whole page, matched by selector) ----------

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.matches('.editor-root form[data-ed-form="add"]')) { e.preventDefault(); addPlayer(form); }
    else if (form.matches('form[data-ed-form="connect"]')) { e.preventDefault(); connect(form); }
  });

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.editor-root [data-ed]');
    if (!button || !ed) return;
    const action = button.dataset.ed;
    if (action === 'remove') { const p = findPlayer(button); if (p) removePlayer(p); }
    else if (action === 'download') download();
    else if (action === 'copy') T.copyText(textOf(buildData()), 'Copied. Paste it over data/players.json on GitHub.');
    else if (action === 'save') save();
    else if (action === 'connect') openConnect(false);
    else if (action === 'forget') forgetToken();
  });

  document.addEventListener('change', (e) => {
    if (!ed || !e.target.closest('.editor-root .ed-player')) return;
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
    if (!ed || !e.target.matches('.editor-root .ed-filter')) return;
    ed.filter = e.target.value;
    renderList();
  });

  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  T.editor = {
    mount(element) {
      host = element;
      if (!ed) {
        ed = {
          players: [], top: {}, savedData: null, savedText: '', justSaved: false,
          filter: '', warnings: T.warnings.slice(),
          token: readToken(), target: readTarget(), connected: false, sha: null, staleBase: false,
          busy: false, busyText: '', saveAfterConnect: false
        };
        load(T.rawPlayers);
        if (ed.token) {
          // A remembered token: start from GitHub's copy, which is never behind the site's.
          refreshFromGitHub().then(render, (e) => { ed.connected = false; render(); T.toast(e.message, true); });
        }
      }
      render();
    },
    isDirty
  };
})();
