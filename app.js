'use strict';
if (top !== self) { try { top.location = location; } catch (e) {} }
const $ = s => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

// ---- Справочники (подписи) ----
const FAM = [['windows-11', 'Windows 11'], ['windows-10', 'Windows 10'], ['windows-8.1', 'Windows 8.1'], ['windows-8', 'Windows 8'], ['windows-7', 'Windows 7'], ['windows-vista', 'Vista'], ['windows-xp', 'XP'], ['windows-server', 'Server'], ['tiny', 'Tiny / Nano'], ['mct', 'Media Creation Tool']];
// источник: [подпись, ранг]; ранг 0 = «Рекомендуем», 4 = «Не рекомендуется» (как в ваших таблицах)
const SRC = { msdn: ['Оригинал MSDN', 0], vlsc: ['Оригинал VLSC', 0], 'msdn+vlsc': ['Оригинал MSDN/VLSC', 0], uup: ['UUP dump', 1], rgadguard: ['rgadguard', 2], ratiborus: ['Ratiborus', 2], ntdev: ['NTDEV', 4], mct: ['Media Creation Tool', 4] };
const ARCH = { x64: 'x64', x86: 'x86 (32-bit)', arm64: 'ARM64' }, LANG = { ru: 'Русский', en: 'English', multi: 'Мультиязычный' };
const DATE = { release_msdn: 'Выпуск MSDN', release_vlsc: 'Выпуск VLSC', release_msdn_vlsc: 'Выпуск MSDN/VLSC', published_msdn: 'Опубликовано на MSDN', posted: 'Размещено', updated: 'Обновлено' };
const kind = it => it.family === 'office' ? 'Office' : 'Windows';
const grp = it => it.family === 'office' ? 'Office' + (it.version ? ' ' + it.version : ' (другое)') : (FAM.find(f => f[0] === it.family) || [0, 'Другое'])[1];
const gi = n => { const i = FAM.findIndex(f => f[1] === n); return i < 0 ? 99 : i; };
const srcOf = it => SRC[it.source] || ['Другое', 3];
const fmt = iso => new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU');

// ---- Поиск: слова с начала слова, синонимы из catalog.json, «windows11», неверная раскладка ----
const RU = 'йцукенгшщзхъфывапролджэячсмитьбю', EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const toEn = s => [...s].map(c => EN[RU.indexOf(c)] ?? c).join('');
const split = s => s.replace(/([a-zа-я])(\d)/g, '$1 $2').replace(/(\d)([a-zа-я])/g, '$1 $2');
const rx = t => new RegExp('(^|[\\s\\[\\]()\\-_,./])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
let CAT = [], SYN = {}, S = {}, FAVS = new Set(), SHOW = 10;
const hay = it => [it.title, it.section, ...it.tags, ...(SYN.family[it.family] || []), ...it.arch.flatMap(a => SYN.arch[a] || []),
  ...it.lang.flatMap(l => SYN.lang[l] || []), ...(SYN.edition_group[it.edition_group] || []), ...(SYN.source[it.source] || [])].join(' ').toLowerCase();
function search(q) {
  for (const v of new Set([q, split(q), split(toEn(q))])) {
    const t = v.trim().split(/\s+/).map(rx), r = CAT.filter(it => t.every(x => x.test(it.hay)));
    if (r.length) return r;
  }
  return [];
}

// ---- Состояние в адресе (#t=Windows&g=Windows+11&a=x64&q=...) ----
const parse = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
function go(patch, replace) {
  S = { ...S, ...patch }; for (const k in S) if (!S[k]) delete S[k];
  SHOW = 10; history[replace ? 'replaceState' : 'pushState'](null, '', '#' + new URLSearchParams(S)); render();
}
addEventListener('popstate', () => { S = parse(); SHOW = 10; render(); });
const ok = (it, skip) => (skip === 't' || !S.t || kind(it) === S.t) && (skip === 'g' || !S.g || grp(it) === S.g) && (skip === 'a' || !S.a || it.arch.includes(S.a))
  && (skip === 'l' || !S.l || it.lang.includes(S.l)) && (skip === 's' || !S.s || (it.source || 'other') === S.s);

// ---- Избранное по id (с миграцией старого по URL) ----
const saveFavs = () => LS.set('wos:favs:v2', JSON.stringify([...FAVS]));
function loadFavs() {
  try { const v2 = JSON.parse(LS.get('wos:favs:v2') || 'null'); if (Array.isArray(v2)) return new Set(v2.filter(x => typeof x === 'string')); } catch (e) {}
  try {
    const old = JSON.parse(LS.get('wos:favs:v1') ?? LS.get('my_favorites') ?? '[]');
    return new Set((Array.isArray(old) ? old : []).map(f => f && CAT.find(it => it.url === f.url)).filter(Boolean).map(it => it.id));
  } catch (e) { return new Set(); }
}

// ---- Компоненты ----
const star = (b, on) => { b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное'); };
function card(it) {
  const c = el('article', 'card'), ch = el('p', 'chips'), [sl, sr] = srcOf(it);
  const badge = (t, k) => ch.append(el('span', 'badge ' + (k || ''), t));
  c.append(el('h3', '', it.title));
  badge(sl); if (sr === 0) badge('Рекомендуем', 'good'); if (sr === 4) badge('Не рекомендуется', 'bad');
  it.arch.forEach(a => badge(ARCH[a] || a)); it.lang.forEach(l => badge(LANG[l] || l));
  if (it.edition_group) badge(it.edition_group === 'consumer' ? 'Consumer (Home/Pro)' : 'Business (Enterprise/Edu)');
  if (it.variant) badge(it.variant);
  c.append(ch);
  const m = [it.build && 'Build ' + it.build, it.base_os && 'На основе: ' + it.base_os, it.date && (DATE[it.date_kind] || 'Дата') + ': ' + fmt(it.date)].filter(Boolean).join(' · ');
  if (m) c.append(el('p', 'meta', m));
  const b = el('div', 'btns'), a = el('a', 'btn', 'Скачать');
  a.href = /^https?:\/\//.test(it.url) ? it.url : '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
  const cp = el('button', 'btn alt', 'Копировать ссылку'), st = el('button', 'star');
  cp.type = st.type = 'button'; cp.dataset.act = 'copy'; st.dataset.act = 'star'; cp.dataset.id = st.dataset.id = it.id; star(st, FAVS.has(it.id));
  b.append(a, cp, st); c.append(b); return c;
}
function row(label, key, entries) {
  const g = el('div', 'row'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label); g.append(el('span', 'lbl', label));
  entries.forEach(([v, t, n]) => { const b = el('button', 'chip', t + ' · ' + n); b.type = 'button'; b.dataset.k = key; b.dataset.v = v; b.setAttribute('aria-pressed', S[key] === v); g.append(b); });
  return g;
}
function copy(url, b) {
  const done = good => { $('#count').textContent = good ? 'Ссылка скопирована' : 'Не удалось скопировать — скопируйте адрес вручную'; b.textContent = good ? 'Скопировано ✓' : 'Ошибка'; setTimeout(() => { b.textContent = 'Копировать ссылку'; }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => done(true), () => done(false));
  else { const t = el('textarea'); t.value = url; document.body.append(t); t.select(); let r = false; try { r = document.execCommand('copy'); } catch (e) {} t.remove(); done(r); }
}

// ---- Отрисовка ----
function render() {
  const app = $('#app'); app.replaceChildren();
  if ($('#q').value !== (S.q || '')) $('#q').value = S.q || '';
  const pool = S.q ? search(S.q.toLowerCase()) : CAT;
  const fv = CAT.filter(it => FAVS.has(it.id));
  if (fv.length) { const s = el('section'); s.append(el('h2', '', '★ Избранное (' + fv.length + ')')); fv.forEach(it => s.append(card(it))); app.append(s); }
  const facet = (key, vals, all) => { const m = new Map(); pool.filter(it => all || ok(it, key)).forEach(it => vals(it).forEach(v => m.set(v, (m.get(v) || 0) + 1))); return [...m]; };
  const wiz = el('section');
  wiz.append(row('Что нужно', 't', facet('t', it => [kind(it)], true).map(([v, n]) => [v, v, n])));
  if (S.t) {
    wiz.append(row('Версия', 'g', facet('g', it => [grp(it)]).sort((x, y) => gi(x[0]) - gi(y[0]) || y[0].localeCompare(x[0])).map(([v, n]) => [v, v, n])));
    wiz.append(row('Разрядность', 'a', facet('a', it => it.arch).map(([v, n]) => [v, ARCH[v] || v, n])));
    const more = el('details'); more.open = !!(S.l || S.s); more.append(el('summary', '', 'Язык и источник'));
    more.append(row('Язык', 'l', facet('l', it => it.lang).map(([v, n]) => [v, LANG[v] || v, n])),
      row('Источник', 's', facet('s', it => [it.source || 'other']).map(([v, n]) => [v, (SRC[v] || ['Другое'])[0], n])));
    wiz.append(more);
  }
  app.append(wiz);
  const res = pool.filter(it => ok(it)).sort((x, y) => srcOf(x)[1] - srcOf(y)[1] || (y.date || '').localeCompare(x.date || '') || x.title.localeCompare(y.title));
  if (!S.q && !S.g) { $('#count').textContent = ''; app.append(el('p', 'hint', S.t ? 'Теперь выберите версию.' : 'Выберите, что нужно, или начните вводить название в поиске.')); return; }
  $('#count').textContent = 'Найдено: ' + res.length;
  const out = el('section'); res.slice(0, SHOW).forEach(it => out.append(card(it)));
  if (!res.length) out.append(el('p', 'hint', 'Ничего не найдено. Попробуйте: win11, office 2021, server, ltsc.'));
  if (res.length > SHOW) { const m = el('button', 'btn alt', 'Показать ещё (' + (res.length - SHOW) + ')'); m.id = 'more'; m.type = 'button'; out.append(m); }
  app.append(out);
}

// ---- События ----
$('#app').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k) { const k = b.dataset.k, v = S[k] === b.dataset.v ? '' : b.dataset.v; return go(k === 't' ? { t: v, g: '', a: '', l: '', s: '' } : { [k]: v }); }
  if (b.id === 'more') { SHOW += 20; return render(); }
  const it = CAT.find(x => x.id === b.dataset.id); if (!it) return;
  if (b.dataset.act === 'copy') copy(it.url, b);
  if (b.dataset.act === 'star') { FAVS.has(it.id) ? FAVS.delete(it.id) : FAVS.add(it.id); saveFavs(); render(); const s = [...document.querySelectorAll('.star')].find(x => x.dataset.id === it.id); if (s) s.focus(); }
});
$('#q').addEventListener('input', e => go({ q: e.target.value.slice(0, 50) }, true));
const root = document.documentElement;
root.dataset.theme = LS.get('wos:theme') || LS.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('#theme').addEventListener('click', () => { const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = t; LS.set('wos:theme', t); });

fetch('catalog.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => {
  CAT = d.items; SYN = d.meta.synonyms; CAT.forEach(it => { it.hay = hay(it); });
  FAVS = loadFavs(); S = parse(); render();
}).catch(e => { $('#app').textContent = 'Не удалось загрузить catalog.json (' + e + '). Откройте сайт по https:// (GitHub Pages) или через локальный сервер.'; });
