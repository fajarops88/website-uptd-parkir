'use strict';
/**
 * ============================================================
 * WEBSITE PUBLIK UPTD PENGELOLAAN PARKIR — versi statis GitHub Pages
 * Porting dari Website SPA Apps Script (JavaScript.html), HANYA 6 halaman publik:
 * Beranda, Profil, Parkir, Berita, Regulasi & Layanan, Kontak.
 * Portal Admin TETAP di Apps Script — tautan "Portal Admin" membuka URL /exec asli.
 * ============================================================
 */

// ════════════════════════════════════════════════════════
// BAGIAN 1: STATE & KONSTANTA
// ════════════════════════════════════════════════════════
const S = {
  route: 'beranda', params: {}, stack: [], rendered: false,
  cfg: {}, data: null, schema: null, ready: false, theme: 'light',
  token: null, admin: null, dirty: false, dash: null,
  ui: {
    lokasi: { q: '', wil: '', jenis: '', status: '', view: 'kartu' },
    kontakTab: 'pesan',
    berita: { q: '', kat: '', n: 9 },
    regTab: 'regulasi', regQ: ''
  },
  adm: { tab: 'ringkasan', rows: {}, q: {}, unread: 0, pesanFilter: 'semua', dpStats: null },
  charts: {}
};

const PROFIL_PAGES = [
  { r: 'profil-sambutan', l: 'Sambutan Kepala UPTD', i: 'format_quote' },
  { r: 'profil-umum', l: 'Profil', i: 'domain' },
  { r: 'profil-sejarah', l: 'Sejarah', i: 'history_edu' },
  { r: 'profil-visimisi', l: 'Visi & Misi', i: 'flag' },
  { r: 'profil-tupoksi', l: 'Tugas dan Fungsi', i: 'rule' },
  { r: 'profil-struktur', l: 'Struktur Organisasi', i: 'account_tree' },
  { r: 'profil-pejabat', l: 'Pejabat Struktural', i: 'badge' },
  { r: 'profil-pegawai', l: 'Pegawai UPTD', i: 'groups' }
];
const NAV = [
  { r: 'beranda', l: 'Beranda', i: 'home' },
  { l: 'Profil', i: 'domain', sub: PROFIL_PAGES },
  { r: 'lokasi', l: 'Parkir', i: 'local_parking' },
  { r: 'berita', l: 'Berita', i: 'newspaper' },
  { r: 'regulasi', l: 'Regulasi & Layanan', i: 'gavel' },
  { r: 'kontak', l: 'Kontak', i: 'mail' }
];
const JENIS_LABEL = { TJU: 'Tepi Jalan Umum', TKP: 'Tempat Khusus Parkir', Gedung: 'Gedung Parkir' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BUNDLE_KEY = 'uptd_bundle_v1';

// ════════════════════════════════════════════════════════
// BAGIAN 2: UTILITAS
// ════════════════════════════════════════════════════════
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const ic = (name, cls) => '<span class="material-symbols-outlined ' + (cls || '') + '" aria-hidden="true">' + name + '</span>';
const uniq = arr => Array.from(new Set(arr.filter(x => x !== '' && x != null)));
const D = n => (S.data && S.data[n]) || [];
const byUrut = (a, b) => (Number(a.Urutan) || 999) - (Number(b.Urutan) || 999);
const byTglDesc = (a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal));

function mkStore(getStore) {
  return {
    get(k) { try { return getStore().getItem(k); } catch (e) { return null; } },
    set(k, v) { try { getStore().setItem(k, v); } catch (e) { /* diabaikan */ } },
    del(k) { try { getStore().removeItem(k); } catch (e) { /* diabaikan */ } }
  };
}
const store = mkStore(() => window.localStorage);
const sstore = mkStore(() => window.sessionStorage);

function fmtTgl(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? (+m[3]) + ' ' + BULAN[+m[2] - 1] + ' ' + m[1] : String(s || '');
}
function fmtNum(n) { const x = Number(n); return (n === '' || n == null || !isFinite(x)) ? '-' : x.toLocaleString('id-ID'); }
function fmtRp(n) { const x = Number(n); return (n === '' || n == null || !isFinite(x)) ? '-' : 'Rp ' + x.toLocaleString('id-ID'); }
function imgUrl(id, w) { return id ? 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + (w || 800) : ''; }
function dlUrl(id) { return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id); }
function initials(n) { return String(n || '?').replace(/,.*$/, '').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
function lines(s) { return String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
function excerpt(s, n) { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).trim() + '…' : t; }
function waLink(num) {
  let d = String(num || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.charAt(0) === '0') d = '62' + d.slice(1);
  return 'https://wa.me/' + d;
}
function mapUrl(l) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(l.Koordinat || '');
  const q = m ? m[1] + ',' + m[2] : encodeURIComponent((l.Nama || '') + ' ' + (l.Alamat || ''));
  return 'https://www.google.com/maps/search/?api=1&query=' + q;
}
function imgTag(id, alt, cls, w) {
  return '<img src="' + esc(imgUrl(id, w)) + '" alt="' + esc(alt) + '" class="' + (cls || '') + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
}
function placeholderImg(icon, cls) {
  return '<div class="w-full h-full grid place-items-center bg-surface-container text-outline ' + (cls || '') + '">' + ic(icon || 'image', 'text-5xl') + '</div>';
}
function statusChip(s) {
  if (s === 'Resmi') return '<span class="chip chip-ok">' + ic('check_circle', 'fill-1') + 'Resmi / Berizin</span>';
  if (s === 'Dalam Evaluasi') return '<span class="chip chip-warn">' + ic('hourglass_top') + 'Dalam Evaluasi</span>';
  return '<span class="chip chip-neu">' + esc(s || '-') + '</span>';
}

function setBusy(btn, on, label) {
  if (!btn) return;
  if (on) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + esc(label || 'Memproses…') + '</span>';
  } else {
    btn.disabled = false;
    if (btn.dataset.html) { btn.innerHTML = btn.dataset.html; delete btn.dataset.html; }
  }
}

function showToast(title, msg, type) {
  const root = $('#toastRoot'); if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'err' ? 'err' : type === 'warn' ? 'warn' : '');
  el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  el.innerHTML = ic(type === 'err' ? 'error' : type === 'warn' ? 'warning' : 'check_circle', 'mt-0.5') +
    '<div class="min-w-0"><div class="t-title">' + esc(title) + '</div>' + (msg ? '<div class="t-msg">' + esc(msg) + '</div>' : '') + '</div>';
  root.appendChild(el);
  setTimeout(function () { el.remove(); }, type === 'err' ? 6500 : 3800);
}

// ── Modal ──
let _modalFocus = null, _modalOnClose = null;
function openModal(o) {
  closeModal(true);
  _modalFocus = document.activeElement;
  _modalOnClose = o.onClose || null;
  $('#modalRoot').innerHTML =
    '<div class="scrim" onclick="if(event.target===this)closeModal()">' +
    '<div class="modal modal-' + (o.size || 'md') + '" role="dialog" aria-modal="true" aria-labelledby="mTitle">' +
    '<div class="modal-head"><h2 id="mTitle" class="text-title-lg text-primary font-bold min-w-0 truncate-1">' + esc(o.title) + '</h2>' +
    '<button type="button" class="icon-btn sm" onclick="closeModal()" aria-label="Tutup">' + ic('close') + '</button></div>' +
    '<div class="modal-body">' + o.body + '</div>' +
    (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') +
    '</div></div>';
  document.body.classList.add('modal-open');
  const first = $('#modalRoot input:not([type=hidden]):not([type=file]), #modalRoot select, #modalRoot textarea');
  (first || $('#modalRoot .modal-foot .btn') || $('#modalRoot .icon-btn')).focus();
}
function closeModal(silent) {
  const root = $('#modalRoot'); if (!root) return;
  const had = root.innerHTML !== '';
  root.innerHTML = '';
  document.body.classList.remove('modal-open');
  if (had && !silent) {
    if (_modalFocus && _modalFocus.focus) { try { _modalFocus.focus(); } catch (e) { /* elemen sudah hilang */ } }
  }
  const cb = _modalOnClose; _modalOnClose = null;
  if (had && cb) cb();
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if ($('#modalRoot .scrim')) closeModal();
    else if ($('#drawerRoot .drawer')) toggleDrawer(false);
  } else if (e.key === 'Tab') {
    const m = $('#modalRoot .modal'); if (!m) return;
    const f = $$('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])', m).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
});

function previewImage(id, title) {
  openModal({
    title: title || 'Pratinjau gambar', size: 'lg',
    body: '<div class="grid place-items-center bg-surface-container rounded-lg p-2"><img src="' + esc(imgUrl(id, 1400)) + '" alt="' + esc(title || 'Gambar') + '" class="max-h-[70vh] w-auto max-w-full object-contain rounded" referrerpolicy="no-referrer"></div>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">' + ic('close') + 'Tutup</button>' +
      '<a class="btn btn-primary" href="' + esc(dlUrl(id)) + '" target="_blank" rel="noopener">' + ic('download') + 'Unduh</a>'
  });
}
function previewFile(id, title) {
  openModal({
    title: title || 'Pratinjau dokumen', size: 'lg',
    body: '<iframe title="' + esc(title || 'Dokumen') + '" src="https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview" class="w-full rounded-lg border border-outline-variant/60" style="height:70vh" loading="lazy"></iframe>' +
      '<p class="help mt-2">Jika dokumen tidak tampil, gunakan tombol Unduh.</p>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">' + ic('close') + 'Tutup</button>' +
      '<a class="btn btn-primary" href="' + esc(dlUrl(id)) + '" target="_blank" rel="noopener">' + ic('download') + 'Unduh</a>'
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 3: TEMA TERANG / GELAP
// ════════════════════════════════════════════════════════
function applyTheme(t, animate) {
  const h = document.documentElement;
  if (animate) { h.classList.add('theme-anim'); setTimeout(function () { h.classList.remove('theme-anim'); }, 400); }
  h.setAttribute('data-theme', t);
  S.theme = t;
  const icon = $('#themeIcon'), btn = $('#themeBtn');
  if (icon) icon.textContent = t === 'dark' ? 'light_mode' : 'dark_mode';
  if (btn) btn.setAttribute('aria-label', t === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
  store.set('uptd_theme', t);
  if (S.route === 'lokasi' && $('#chSetoran')) loadTransparansi();
  if (typeof redrawCharts === 'function') redrawCharts();
  $$('.theme-icon-admin').forEach(function (el) { el.textContent = t === 'dark' ? 'light_mode' : 'dark_mode'; });
}
function toggleTheme() { applyTheme(S.theme === 'dark' ? 'light' : 'dark', true); }
function initTheme() {
  let t = store.get('uptd_theme');
  if (t !== 'dark' && t !== 'light') {
    t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  applyTheme(t, false);
}

// ════════════════════════════════════════════════════════
// BAGIAN 4: DATA PUBLIK (cache lokal + segarkan di latar belakang)
// ════════════════════════════════════════════════════════
function applyBundle(b) {
  S.cfg = b.cfg || {}; S.data = b.data || {}; S.schema = b.schema || {};
  renderChrome();
}
async function loadBundle(force) {
  if (!force) {
    const raw = store.get(BUNDLE_KEY);
    if (raw) {
      try {
        const b = JSON.parse(raw);
        if (b && b.data && b.cfg) { applyBundle(b); S.ready = true; refreshBundleBg(raw); return; }
      } catch (e) { store.del(BUNDLE_KEY); }
    }
  }
  const res = await api('getPublicBundle');
  applyBundle(res.data);
  store.set(BUNDLE_KEY, JSON.stringify(res.data));
  S.ready = true;
}
function refreshBundleBg(oldRaw) {
  api('getPublicBundle').then(function (res) {
    const raw = JSON.stringify(res.data);
    store.set(BUNDLE_KEY, raw);
    if (raw === oldRaw) return;
    applyBundle(res.data);
    const ae = document.activeElement;
    const typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
    if (S.route !== 'admin' && !typing && !$('#modalRoot .scrim')) {
      const c = $('#app-container'); const y = window.scrollY;
      ROUTES[S.route](c, S.params); window.scrollTo(0, y);
    }
  }).catch(function () { /* gagal diam-diam: data cache tetap dipakai */ });
}

// ════════════════════════════════════════════════════════
// BAGIAN 5: KERANGKA (header, navigasi, laci, footer)
// ════════════════════════════════════════════════════════
function logoHtml(h) {
  h = h || 40;
  if (S.cfg.logo) return '<img src="' + esc(imgUrl(S.cfg.logo, 200)) + '" alt="Logo ' + esc(S.cfg.namaSitus || '') + '" style="height:' + h + 'px;width:auto" class="object-contain" referrerpolicy="no-referrer">';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 6 38 48" width="' + Math.round(h * 38 / 48) + '" height="' + h + '" role="img" aria-label="Logo UPTD Pengelolaan Parkir">' +
    '<path d="M12 8 L32 8 C42 8 46 16 46 28 C46 42 32 50 12 52 L12 8 Z" fill="#0F2B5C" stroke="rgba(255,255,255,.3)" stroke-width="1"/>' +
    '<circle cx="28" cy="28" r="16" fill="#fff"/>' +
    '<text x="28" y="35" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="20" fill="#0F2B5C">P</text>' +
    '<rect x="42" y="14" width="4" height="28" rx="2" fill="#D97706"/></svg>';
}
function activeNavKey() { return S.route === 'berita-detail' ? 'berita' : S.route; }
function footerNavLinks() { return NAV.map(function (n) { return n.sub ? { r: n.sub[0].r, l: n.l } : n; }); }

function renderChrome() {
  const cfg = S.cfg;
  $('#brandLogo').innerHTML = logoHtml(40);
  $('#brandName').textContent = cfg.namaSitus || 'UPTD Pengelolaan Parkir';
  $('#brandSub').textContent = cfg.namaInduk || 'Dinas Perhubungan';
  document.title = cfg.namaSitus || 'UPTD Pengelolaan Parkir';
  renderNav();
  renderFooter();
}
function renderNav() {
  const act = activeNavKey();
  $('#mainNav').innerHTML = NAV.map(function (n) {
    if (n.sub) {
      const onSub = n.sub.some(function (s) { return s.r === act; });
      return '<div class="relative nav-dropdown">' +
        '<button type="button" class="px-3 py-2 min-h-[44px] rounded-xl text-label-lg transition-colors inline-flex items-center gap-1 ' +
        (onSub ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container') +
        '" aria-haspopup="true" aria-expanded="false" onclick="toggleNavDropdown(event,this)">' + esc(n.l) + ic('expand_more', 'text-base') + '</button>' +
        '<div class="nav-dropdown-panel hidden absolute left-0 top-full mt-1 min-w-[230px] card p-2 flex flex-col gap-1 z-30">' +
        n.sub.map(function (s) {
          const on = s.r === act;
          return '<button type="button" data-r="' + s.r + '" onclick="navigateTo(this.dataset.r)" ' + (on ? 'aria-current="page"' : '') +
            ' class="text-left px-3 py-2 rounded-lg text-label-lg flex items-center gap-2 ' +
            (on ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container') + '">' + ic(s.i, 'text-base') + esc(s.l) + '</button>';
        }).join('') + '</div></div>';
    }
    const on = n.r === act;
    return '<button type="button" data-r="' + n.r + '" onclick="navigateTo(this.dataset.r)" ' + (on ? 'aria-current="page"' : '') +
      ' class="px-3 py-2 min-h-[44px] rounded-xl text-label-lg transition-colors ' +
      (on ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container') + '">' + esc(n.l) + '</button>';
  }).join('');
}
function toggleNavDropdown(e, btn) {
  e.stopPropagation();
  const panel = btn.nextElementSibling;
  const willOpen = panel.classList.contains('hidden');
  $$('#mainNav .nav-dropdown-panel').forEach(function (p) { p.classList.add('hidden'); });
  $$('#mainNav .nav-dropdown > button').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  if (willOpen) { panel.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); }
}
document.addEventListener('click', function () {
  $$('#mainNav .nav-dropdown-panel').forEach(function (p) { p.classList.add('hidden'); });
  $$('#mainNav .nav-dropdown > button').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
});

function toggleDrawer(open) {
  const root = $('#drawerRoot'), btn = $('#menuBtn');
  if (!open) { root.innerHTML = ''; if (btn) btn.setAttribute('aria-expanded', 'false'); return; }
  const act = activeNavKey();
  root.innerHTML =
    '<div class="drawer-scrim" onclick="toggleDrawer(false)"></div>' +
    '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Menu navigasi">' +
    '<div class="flex items-center justify-between p-4 border-b border-outline-variant/40"><div class="flex items-center gap-3">' + logoHtml(36) +
    '<span class="text-title-md text-primary font-bold leading-tight">' + esc(S.cfg.namaSitus || 'UPTD Parkir') + '</span></div>' +
    '<button type="button" class="icon-btn sm" onclick="toggleDrawer(false)" aria-label="Tutup menu">' + ic('close') + '</button></div>' +
    '<nav class="p-3 flex flex-col gap-1" aria-label="Navigasi utama">' +
    NAV.map(function (n) {
      if (n.sub) {
        return '<div class="flex flex-col gap-1 mt-2">' +
          '<div class="flex items-center gap-2 px-3 py-1 text-label-md text-on-surface-variant uppercase tracking-wide">' + ic(n.i, 'text-base') + esc(n.l) + '</div>' +
          n.sub.map(function (s) {
            const on = s.r === act;
            return '<button type="button" data-r="' + s.r + '" onclick="navigateTo(this.dataset.r)" ' + (on ? 'aria-current="page"' : '') +
              ' class="side-link pl-11">' + esc(s.l) + '</button>';
          }).join('') + '</div>';
      }
      const on = n.r === act;
      return '<button type="button" data-r="' + n.r + '" onclick="navigateTo(this.dataset.r)" ' + (on ? 'aria-current="page"' : '') +
        ' class="side-link">' + ic(n.i) + esc(n.l) + '</button>';
    }).join('') + '</nav>' +
    '<div class="p-3 mt-2 border-t border-outline-variant/40 flex flex-col gap-2">' +
    '<button type="button" class="btn btn-outline w-full" onclick="navigateTo(\'admin\')">' + ic('admin_panel_settings') + 'Portal Admin</button>' +
    '<button type="button" class="btn btn-ghost w-full" onclick="toggleTheme()">' + ic('contrast') + 'Ganti tema terang / gelap</button></div></aside>';
  if (btn) btn.setAttribute('aria-expanded', 'true');
  const first = $('#drawerRoot .side-link'); if (first) first.focus();
}

function renderFooter() {
  const cfg = S.cfg;
  const kontak = [];
  if (cfg.alamat) kontak.push(ic('location_on', 'text-base') + '<span>' + esc(cfg.alamat) + '</span>');
  if (cfg.telepon) kontak.push(ic('call', 'text-base') + '<a class="hover:text-primary underline-offset-2 hover:underline" href="tel:' + esc(cfg.telepon.replace(/[^\d+]/g, '')) + '">' + esc(cfg.telepon) + '</a>');
  if (cfg.whatsapp) kontak.push(ic('chat', 'text-base') + '<a class="hover:text-primary underline-offset-2 hover:underline" href="' + esc(waLink(cfg.whatsapp)) + '" target="_blank" rel="noopener">WhatsApp ' + esc(cfg.whatsapp) + '</a>');
  if (cfg.emailKontak) kontak.push(ic('mail', 'text-base') + '<a class="hover:text-primary underline-offset-2 hover:underline break-all" href="mailto:' + esc(cfg.emailKontak) + '">' + esc(cfg.emailKontak) + '</a>');
  $('#siteFooter').innerHTML =
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-10">' +
    '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">' +
    '<div class="flex flex-col gap-3"><div class="flex items-center gap-3">' + logoHtml(40) +
    '<div class="flex flex-col"><span class="text-title-md text-primary font-bold leading-tight">' + esc(cfg.namaSitus || '') + '</span><span class="text-label-sm text-on-surface-variant uppercase">' + esc(cfg.namaInduk || '') + '</span></div></div>' +
    '<p class="text-body-sm text-on-surface-variant">' + esc(cfg.deskripsi || '') + '</p></div>' +
    '<div class="flex flex-col gap-3"><h2 class="text-title-md text-primary font-bold">Jam Pelayanan</h2>' +
    '<p class="text-body-sm text-on-surface-variant pre-line">' + esc(cfg.jamLayanan || '-') + '</p></div>' +
    '<div class="flex flex-col gap-3"><h2 class="text-title-md text-primary font-bold">Kontak</h2>' +
    '<ul class="flex flex-col gap-2 text-body-sm text-on-surface-variant">' + (kontak.length ? kontak.map(function (k) { return '<li class="flex gap-2 items-start">' + k + '</li>'; }).join('') : '<li>Belum diatur.</li>') + '</ul></div>' +
    '<div class="flex flex-col gap-3"><h2 class="text-title-md text-primary font-bold">Tautan</h2><nav class="flex flex-col items-start gap-1 text-body-sm" aria-label="Tautan footer">' +
    footerNavLinks().map(function (n) { return '<button type="button" class="text-on-surface-variant hover:text-primary min-h-[32px] text-left" data-r="' + n.r + '" onclick="navigateTo(this.dataset.r)">' + esc(n.l) + '</button>'; }).join('') +
    '</nav></div></div>' +
    '<div class="flex flex-col md:flex-row items-center justify-between gap-2 px-4 py-3 rounded-xl bg-surface-container text-body-sm text-on-surface-variant">' +
    '<span>© ' + new Date().getFullYear() + ' ' + esc(cfg.namaSitus || '') + ' — ' + esc(cfg.namaInduk || '') + '. Hak cipta dilindungi.</span>' +
    '<button type="button" class="inline-flex items-center gap-1 hover:text-primary min-h-[32px]" onclick="navigateTo(\'admin\')">' + ic('lock', 'text-base') + 'Portal Admin</button></div></div>';
}

// ════════════════════════════════════════════════════════
// BAGIAN 6: ROUTER SPA
// ════════════════════════════════════════════════════════
const ROUTES = {
  beranda: function (c) { renderBeranda(c); },
  'profil-sambutan': function (c) { renderProfilSambutan(c); },
  'profil-umum': function (c) { renderProfilUmum(c); },
  'profil-sejarah': function (c) { renderProfilSejarah(c); },
  'profil-visimisi': function (c) { renderProfilVisiMisi(c); },
  'profil-tupoksi': function (c) { renderProfilTupoksi(c); },
  'profil-struktur': function (c) { renderProfilStruktur(c); },
  'profil-pejabat': function (c) { renderProfilPejabat(c); },
  'profil-pegawai': function (c) { renderProfilPegawai(c); },
  lokasi: function (c, p) { renderLokasi(c, p); },
  berita: function (c) { renderBerita(c); },
  'berita-detail': function (c, p) { renderBeritaDetail(c, p); },
  regulasi: function (c, p) { renderRegulasi(c, p); },
  kontak: function (c, p) { renderKontak(c, p); },
  admin: function (c, p) { renderAdmin(c, p); }
};

async function navigateTo(route, params, opts) {
  params = params || {}; opts = opts || {};
  if (!ROUTES[route]) route = 'beranda';
  toggleDrawer(false); closeModal(true);
  if ((S.route === 'admin' || S.route === 'lokasi') && route !== S.route) { destroyCharts(); }
  if (!opts.back && S.rendered && (S.route !== route || JSON.stringify(S.params) !== JSON.stringify(params))) {
    S.stack.push({ route: S.route, params: S.params });
    if (S.stack.length > 30) S.stack.shift();
  }
  S.route = route; S.params = params;
  document.body.classList.toggle('admin-mode', route === 'admin' && !!S.token);
  if (route !== 'admin' && S.dirty) refreshPublicData();
  renderNav();
  const c = $('#app-container');
  if (!S.ready && route !== 'admin') {
    c.innerHTML = skeletonPage();
    try { await loadBundle(); } catch (e) { showFatal(e); return; }
  }
  ROUTES[route](c, params);
  S.rendered = true;
  c.classList.remove('page-enter'); void c.offsetWidth; c.classList.add('page-enter');
  window.scrollTo(0, 0);
  const m = $('#main'); if (m) m.focus({ preventScroll: true });
}
async function refreshPublicData() { try { await loadBundle(true); S.dirty = false; } catch (e) { /* abaikan */ } }
function goBack() {
  const p = S.stack.pop();
  if (p) navigateTo(p.route, p.params, { back: true }); else navigateTo('beranda', {}, { back: true });
}
function focusMain() { const m = $('#main'); if (m) m.focus(); }

function skeletonPage() {
  return '<div class="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col gap-6" aria-busy="true" aria-label="Memuat halaman">' +
    '<div class="skeleton h-10 w-2/3"></div><div class="skeleton h-5 w-1/2"></div>' +
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">' + [1, 2, 3].map(function () { return '<div class="skeleton h-64"></div>'; }).join('') + '</div></div>';
}
function showFatal(e) {
  const hb = $('#boot'); if (hb) hb.style.display = 'none';
  $('#app-container').innerHTML =
    '<div class="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">' +
    '<div class="kpi-icon" style="background:rgb(var(--error-container));color:rgb(var(--on-error-container))">' + ic('cloud_off') + '</div>' +
    '<h1 class="text-headline-md text-primary">Data belum dapat dimuat</h1>' +
    '<p class="text-body-md text-on-surface-variant">' + esc(e && e.message ? e.message : e) + '</p>' +
    '<button type="button" class="btn btn-primary" onclick="retryBoot()">' + ic('refresh') + 'Coba lagi</button></div>';
}
async function retryBoot() {
  $('#app-container').innerHTML = skeletonPage();
  try { await loadBundle(); navigateTo(S.route === 'admin' ? 'admin' : (S.route || 'beranda'), S.params, { back: true }); }
  catch (e) { showFatal(e); }
}

// ════════════════════════════════════════════════════════
// BAGIAN 7: KOMPONEN TAMPILAN BERSAMA
// ════════════════════════════════════════════════════════
function pageHeader(o) {
  return '<section class="bg-surface-container-low border-b border-outline-variant/40"><div class="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">' +
    '<div class="max-w-3xl flex flex-col gap-2">' +
    (o.eyebrow ? '<span class="chip chip-brand self-start">' + esc(o.eyebrow) + '</span>' : '') +
    '<h1 class="text-headline-lg-m md:text-headline-lg text-primary">' + esc(o.title) + '</h1>' +
    (o.desc ? '<p class="text-body-md md:text-body-lg text-on-surface-variant">' + esc(o.desc) + '</p>' : '') +
    '</div>' + (o.right || '') + '</div></section>';
}
function statBox(label, value, sub) {
  return '<div class="card p-4 flex flex-col min-w-[110px]"><span class="text-label-sm text-on-surface-variant uppercase">' + esc(label) + '</span>' +
    '<span class="text-headline-md text-primary font-bold num">' + esc(value) + '</span>' + (sub ? '<span class="text-body-sm text-on-surface-variant">' + esc(sub) + '</span>' : '') + '</div>';
}
function sectionTitle(t, sub) {
  return '<div class="flex items-center gap-3"><span class="strip-amber h-7" aria-hidden="true"></span><div><h2 class="text-headline-md text-primary font-bold">' + esc(t) + '</h2>' +
    (sub ? '<p class="text-body-sm text-on-surface-variant">' + esc(sub) + '</p>' : '') + '</div></div>';
}
function emptyState(icon, title, desc, action) {
  return '<div class="card p-10 text-center flex flex-col items-center gap-3"><div class="kpi-icon">' + ic(icon) + '</div>' +
    '<h3 class="text-title-lg text-primary">' + esc(title) + '</h3>' + (desc ? '<p class="text-body-md text-on-surface-variant max-w-md">' + esc(desc) + '</p>' : '') + (action || '') + '</div>';
}
function tabsHtml(list, cur, fn, label) {
  return '<div class="tabs" role="tablist" aria-label="' + esc(label) + '">' + list.map(function (t) {
    return '<button type="button" role="tab" class="tab" id="tab-' + t.k + '" data-k="' + t.k + '" aria-selected="' + (t.k === cur) + '" aria-controls="tabpanel" onclick="' + fn + '(this.dataset.k)">' + ic(t.i) + esc(t.l) + '</button>';
  }).join('') + '</div>';
}

function lokasiCard(l) {
  const foto = l.Foto
    ? '<button type="button" class="block w-full h-full" data-id="' + esc(l.Foto) + '" data-t="' + esc(l.Nama) + '" onclick="previewImage(this.dataset.id,this.dataset.t)" aria-label="Perbesar foto ' + esc(l.Nama) + '">' + imgTag(l.Foto, l.Nama, 'w-full h-full object-cover', 640) + '</button>'
    : placeholderImg('local_parking');
  return '<article class="card card-hover overflow-hidden flex flex-col">' +
    '<div class="relative h-44 bg-surface-container">' + foto +
    '<span class="absolute top-3 left-3 chip chip-glass">' + esc(l.Wilayah) + '</span></div>' +
    '<div class="p-4 flex flex-col gap-3 flex-1">' +
    '<h3 class="text-title-lg text-primary font-bold">' + esc(l.Nama) + '</h3>' +
    '<p class="text-body-sm text-on-surface-variant flex gap-1 items-start">' + ic('location_on', 'text-base mt-0.5') + '<span>' + esc(l.Alamat) + '</span></p>' +
    '<div class="flex flex-wrap gap-2">' + statusChip(l.Status) + '<span class="chip chip-neu">' + esc(JENIS_LABEL[l.Jenis] || l.Jenis) + '</span></div>' +
    '<div class="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container">' +
    tarifCell('two_wheeler', 'Motor (R2)', l.TarifR2, l.KapasitasR2) + tarifCell('directions_car', 'Mobil (R4)', l.TarifR4, l.KapasitasR4) + '</div>' +
    '<div class="mt-auto pt-1 flex justify-end"><a class="btn btn-outline btn-sm" href="' + esc(mapUrl(l)) + '" target="_blank" rel="noopener">Rute peta' + ic('open_in_new', 'text-base') + '</a></div>' +
    '</div></article>';
}
function tarifCell(icon, label, tarif, kap) {
  return '<div class="flex items-start gap-2">' + ic(icon, 'text-on-surface-variant text-xl') + '<div class="flex flex-col"><span class="text-label-sm text-on-surface-variant">' + label + '</span>' +
    '<span class="text-label-lg text-primary font-bold num">' + esc(fmtRp(tarif)) + '</span>' +
    '<span class="text-body-sm text-on-surface-variant num">Kapasitas ' + esc(fmtNum(kap)) + '</span></div></div>';
}
function beritaCard(b) {
  return '<button type="button" class="card card-hover overflow-hidden flex flex-col text-left w-full" data-id="' + esc(b.ID) + '" onclick="openBerita(this.dataset.id)">' +
    '<div class="h-44 w-full bg-surface-container overflow-hidden">' + (b.Foto ? imgTag(b.Foto, b.Judul, 'w-full h-full object-cover', 640) : placeholderImg('newspaper')) + '</div>' +
    '<div class="p-4 flex flex-col gap-2 flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="chip chip-brand">' + esc(b.Kategori) + '</span>' +
    '<span class="text-label-md text-on-surface-variant">' + esc(fmtTgl(b.Tanggal)) + '</span></div>' +
    '<h3 class="text-title-md text-primary font-bold clamp-2">' + esc(b.Judul) + '</h3>' +
    '<p class="text-body-sm text-on-surface-variant clamp-3">' + esc(excerpt(b.Isi, 160)) + '</p>' +
    '<span class="mt-auto pt-1 inline-flex items-center gap-1 text-label-lg text-primary">Baca selengkapnya' + ic('arrow_forward', 'text-base') + '</span></div></button>';
}
function openBerita(id) { navigateTo('berita-detail', { id: id }); }

// ════════════════════════════════════════════════════════
// BAGIAN 8: HALAMAN PUBLIK — BERANDA
// ════════════════════════════════════════════════════════
function renderBeranda(c) {
  const cfg = S.cfg, lok = D('LokasiParkir');
  const wilayah = uniq(lok.map(function (l) { return l.Wilayah; })).sort();
  const berita = D('Berita').slice().sort(byTglDesc).slice(0, 3);
  const sejarah = D('ProfilUPTD').filter(function (p) { return p.Bagian === 'Sejarah'; }).sort(byUrut)[0];
  const visi = D('ProfilUPTD').filter(function (p) { return p.Bagian === 'Visi'; }).sort(byUrut)[0];
  const sorot = lok.slice().sort(function (a, b) { return (b.Foto ? 1 : 0) - (a.Foto ? 1 : 0) || (a.Status === 'Resmi' ? -1 : 1); }).slice(0, 3);
  const quick = [
    { i: 'map', t: 'Direktori Titik Parkir', d: 'Lokasi, kapasitas, dan tarif parkir yang dikelola UPTD, lengkap dengan filter wilayah.', a: 'Jelajahi titik parkir', r: 'lokasi', p: {} },
    { i: 'gavel', t: 'Regulasi', d: 'Dasar hukum dan peraturan terkait penyelenggaraan parkir yang dapat diunduh.', a: 'Lihat regulasi', r: 'regulasi', p: { tab: 'regulasi' } },
    { i: 'support_agent', t: 'Pelayanan', d: 'Jenis layanan UPTD beserta syarat dan prosedurnya.', a: 'Lihat pelayanan', r: 'regulasi', p: { tab: 'layanan' } },
    { i: 'mail', t: 'Kontak & Pengaduan', d: 'Sampaikan pertanyaan atau pengaduan langsung kepada pengelola.', a: 'Kirim pesan', r: 'kontak', p: {} }
  ];
  c.innerHTML =
    '<section class="hero"><div class="hero-photo" ' + (cfg.heroFoto ? 'style="background-image:url(\'' + esc(imgUrl(cfg.heroFoto, 1600)) + '\')"' : 'hidden') + '></div>' +
    '<div class="relative max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-28 flex flex-col gap-6">' +
    '<span class="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-label-sm uppercase" style="background:rgb(255 255 255 / .12)"><span class="w-2 h-2 rounded-full bg-tertiary-fixed-dim" aria-hidden="true"></span>' + esc(cfg.namaInduk || 'Dinas Perhubungan') + '</span>' +
    '<div class="flex flex-col gap-3"><h1 class="text-display-lg-m md:text-display-lg" style="color:rgb(var(--on-brand))">' + esc(cfg.tagline || cfg.namaSitus) + '</h1>' +
    '<p class="text-body-md md:text-body-lg text-justify" style="color:rgb(var(--on-brand-muted))">' + esc(cfg.deskripsi || '') + '</p></div>' +
    '<form class="w-full card p-3 flex flex-col md:flex-row gap-2" onsubmit="return heroSearch(event)" role="search" aria-label="Cari titik parkir">' +
    '<label class="sr-only" for="hq">Kata kunci</label>' +
    '<div class="relative flex-1"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-outline">' + ic('search') + '</span><input id="hq" class="input pl-11" type="search" placeholder="Cari jalan, kawasan, atau nama titik parkir…" autocomplete="off"></div>' +
    '<label class="sr-only" for="hw">Wilayah</label>' +
    '<div class="select-wrap md:w-56"><select id="hw" class="input"><option value="">Semua wilayah</option>' + wilayah.map(function (w) { return '<option value="' + esc(w) + '">' + esc(w) + '</option>'; }).join('') + '</select>' + ic('expand_more') + '</div>' +
    '<button type="submit" class="btn btn-amber">' + ic('near_me') + 'Cari parkir</button></form></div></section>' +

    '<div class="max-w-6xl mx-auto px-4 md:px-8 -mt-16 relative z-10"><div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">' +
    [['local_parking', 'Titik parkir terdata', lok.length], ['domain', 'Wilayah terlayani', wilayah.length], ['gavel', 'Regulasi', D('Regulasi').length], ['support_agent', 'Jenis pelayanan', D('Pelayanan').length]].map(function (k) {
      return '<div class="card p-4 flex items-center gap-3 shadow-lg"><div class="kpi-icon">' + ic(k[0], 'text-2xl') + '</div><div class="min-w-0"><div class="text-headline-md md:text-headline-lg text-primary font-extrabold num leading-none">' + esc(fmtNum(k[2])) + '</div><div class="text-label-md text-on-surface-variant mt-1">' + esc(k[1]) + '</div></div></div>';
    }).join('') + '</div></div>' +

    '<section class="max-w-7xl mx-auto px-4 md:px-8 py-14 flex flex-col gap-6">' + sectionTitle('Akses cepat', 'Informasi yang paling sering dicari masyarakat.') +
    '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">' + quick.map(function (q) {
      return '<button type="button" class="card card-hover p-5 flex flex-col gap-3 text-left" data-r="' + q.r + '" data-p="' + esc(JSON.stringify(q.p)) + '" onclick="navigateTo(this.dataset.r, JSON.parse(this.dataset.p))">' +
        '<div class="kpi-icon">' + ic(q.i) + '</div><h3 class="text-title-lg text-primary font-bold">' + esc(q.t) + '</h3>' +
        '<p class="text-body-sm text-on-surface-variant">' + esc(q.d) + '</p>' +
        '<span class="mt-auto inline-flex items-center gap-1 text-label-lg text-primary">' + esc(q.a) + ic('arrow_forward', 'text-base') + '</span></button>';
    }).join('') + '</div></section>' +

    (sejarah || visi ?
      '<section class="bg-surface-container-low border-y border-outline-variant/40"><div class="max-w-7xl mx-auto px-4 md:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">' +
      '<div class="lg:col-span-7 flex flex-col gap-4">' + sectionTitle('Mengenal ' + (cfg.namaSitus || 'UPTD')) +
      (sejarah ? '<p class="text-body-lg text-on-surface-variant measure">' + esc(excerpt(sejarah.Isi, 420)) + '</p>' : '') +
      '<div><button type="button" class="btn btn-outline" onclick="navigateTo(\'profil-sejarah\')">Profil selengkapnya' + ic('arrow_forward') + '</button></div></div>' +
      (visi ? '<div class="lg:col-span-5 card p-6 flex flex-col gap-2"><span class="chip chip-brand self-start">Visi</span><p class="text-title-lg text-primary font-semibold">' + esc(visi.Isi) + '</p></div>' : '') +
      '</div></section>' : '') +

    (sorot.length ? '<section class="max-w-7xl mx-auto px-4 md:px-8 py-14 flex flex-col gap-6"><div class="flex flex-wrap items-end justify-between gap-3">' + sectionTitle('Titik parkir', 'Sebagian lokasi yang dikelola UPTD.') +
      '<button type="button" class="btn btn-primary btn-sm" onclick="navigateTo(\'lokasi\')">Lihat semua titik parkir' + ic('map', 'text-base') + '</button></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-5">' + sorot.map(lokasiCard).join('') + '</div></section>' : '') +

    (berita.length ? '<section class="max-w-7xl mx-auto px-4 md:px-8 pb-14 flex flex-col gap-6"><div class="flex flex-wrap items-end justify-between gap-3">' + sectionTitle('Berita & pengumuman', 'Informasi terbaru dari UPTD.') +
      '<button type="button" class="inline-flex items-center gap-1 text-label-lg text-primary min-h-[44px]" onclick="navigateTo(\'berita\')">Semua berita' + ic('arrow_forward', 'text-base') + '</button></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-5">' + berita.map(beritaCard).join('') + '</div></section>' : '') +

    '<section class="max-w-7xl mx-auto px-4 md:px-8 pb-14 flex flex-col gap-6">' + sectionTitle('Survei Kepuasan Masyarakat', 'Bantu kami meningkatkan pelayanan parkir — 1 = Sangat Tidak Puas, 5 = Sangat Puas.') +
    '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">' +
    '<div class="lg:col-span-6 card p-6" id="surveiBox">' + surveiForm() + '</div>' +
    '<div class="lg:col-span-6 card p-6 flex flex-col gap-4"><h3 class="text-title-lg text-primary font-bold">Rekap Kepuasan Masyarakat</h3>' +
    '<div class="grid grid-cols-2 gap-3">' +
    '<div class="card p-4 text-center"><div class="text-title-lg font-bold" id="svRataRata">-</div><div class="text-label-sm text-on-surface-variant">Rata-rata Keseluruhan (dari 5)</div></div>' +
    '<div class="card p-4 text-center"><div class="text-title-lg font-bold num" id="svResponden">-</div><div class="text-label-sm text-on-surface-variant">Jumlah Responden</div></div></div>' +
    '<div class="tbl-wrap"><table class="tbl" id="tblSurvei"><thead><tr><th>Unsur Pelayanan</th><th>Rata-rata</th></tr></thead><tbody></tbody></table></div></div></div></section>' +

    '<section class="max-w-7xl mx-auto px-4 md:px-8 pb-6"><div class="rounded-xl p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6" style="background:rgb(var(--brand-2));color:rgb(var(--on-brand))">' +
    '<div class="max-w-2xl flex flex-col gap-2"><h2 class="text-headline-md md:text-headline-lg">Ada pertanyaan atau pengaduan seputar parkir?</h2>' +
    '<p style="color:rgb(var(--on-brand-muted))">Sampaikan langsung kepada pengelola. Setiap pesan yang masuk akan diteruskan ke petugas UPTD.</p></div>' +
    '<button type="button" class="btn btn-amber shrink-0" onclick="navigateTo(\'kontak\')">' + ic('send') + 'Hubungi kami</button></div></section>';
  initStarRatings();
  loadRekapSurvei();
}
function heroSearch(e) {
  e.preventDefault();
  navigateTo('lokasi', { q: ($('#hq').value || '').trim(), wil: $('#hw').value || '' });
  return false;
}

// ════════════════════════════════════════════════════════
// BAGIAN 9: HALAMAN PUBLIK — PROFIL & ORGANISASI
// ════════════════════════════════════════════════════════
function profilSubNav(cur) {
  return '<div class="flex flex-wrap gap-2">' + PROFIL_PAGES.map(function (t) {
    const on = t.r === cur;
    return '<button type="button" data-r="' + t.r + '" onclick="navigateTo(this.dataset.r)" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-label-lg transition-colors ' +
      (on ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high') + '">' + ic(t.i, 'text-base') + esc(t.l) + '</button>';
  }).join('') + '</div>';
}
function pejabatCard(o) {
  return '<article class="card overflow-hidden flex flex-col"><div class="aspect-[3/4] bg-surface-container">' + (o.Foto ? imgTag(o.Foto, 'Foto ' + o.Nama, 'w-full h-full object-cover', 640) : placeholderImg('person')) + '</div>' +
    '<div class="p-4 flex flex-col gap-1"><h3 class="text-title-md text-primary font-bold">' + esc(o.Nama) + '</h3>' +
    (o.NIP ? '<span class="text-label-md text-on-surface-variant" style="font-family:ui-monospace,monospace">NIP. ' + esc(o.NIP) + '</span>' : '') +
    '<span class="text-body-sm text-secondary font-semibold">' + esc(o.Jabatan) + '</span>' +
    (o.Riwayat ? '<p class="text-body-sm text-on-surface-variant clamp-3 mt-1">' + esc(o.Riwayat) + '</p>' : '') + '</div></article>';
}
function renderProfilSambutan(c) {
  const sambutan = D('ProfilUPTD').filter(function (p) { return p.Bagian === 'Sambutan'; }).sort(byUrut)[0];
  const kepala = D('PejabatStruktural').filter(function (p) { return p.Jenjang === 'Kepala UPTD'; }).sort(byUrut)[0];
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Sambutan Kepala UPTD', desc: 'Sambutan dari pimpinan UPTD Pengelolaan Parkir.' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-sambutan') +
    '<div class="card p-6 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:items-start">' +
    '<div class="md:col-span-4 flex flex-col items-center md:items-start gap-3 text-center md:text-left">' +
    (kepala && kepala.Foto ?
      '<button type="button" class="rounded-2xl overflow-hidden shrink-0 w-full max-w-[220px] aspect-[3/4]" data-id="' + esc(kepala.Foto) + '" data-t="' + esc(kepala.Nama) + '" onclick="previewImage(this.dataset.id,this.dataset.t)" aria-label="Perbesar foto ' + esc(kepala.Nama) + '">' + imgTag(kepala.Foto, kepala.Nama, 'w-full h-full object-cover', 440) + '</button>' :
      '<div class="rounded-2xl shrink-0 w-full max-w-[220px] aspect-[3/4]">' + placeholderImg('badge') + '</div>') +
    '<div><p class="text-title-md text-primary font-bold">' + esc(kepala ? kepala.Nama : 'Kepala UPTD') + '</p>' +
    '<p class="text-body-sm text-on-surface-variant">' + esc(kepala ? kepala.Jabatan : 'Kepala UPTD Pengelolaan Parkir') + '</p></div></div>' +
    '<div class="md:col-span-8 flex flex-col gap-3">' +
    '<span class="chip chip-brand self-start inline-flex items-center gap-1">' + ic('format_quote', 'text-base') + 'Sambutan Kepala UPTD</span>' +
    '<p class="text-body-lg text-on-surface-variant text-justify pre-line">' + esc(sambutan ? sambutan.Isi : 'Sambutan dari Kepala UPTD akan tampil di sini. Admin dapat mengisinya melalui Portal Admin → Profil UPTD → Bagian: Sambutan.') + '</p>' +
    '</div></div></div>';
}
function renderProfilUmum(c) {
  const p = D('ProfilUPTD').filter(function (x) { return x.Bagian === 'Profil'; }).sort(byUrut);
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Profil' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-umum') +
    (p.length ? p.map(function (x) {
      return '<article class="card p-6 md:p-8 grid grid-cols-1 ' + (x.Foto ? 'lg:grid-cols-12' : '') + ' gap-6 items-start"><div class="' + (x.Foto ? 'lg:col-span-7' : '') + ' flex flex-col gap-3">' +
        '<h3 class="text-headline-sm text-primary font-semibold">' + esc(x.Judul) + '</h3><p class="text-body-md text-on-surface-variant pre-line text-justify">' + esc(x.Isi) + '</p></div>' +
        (x.Foto ? '<div class="lg:col-span-5 rounded-lg overflow-hidden bg-surface-container">' + imgTag(x.Foto, x.Judul, 'w-full h-full object-cover', 900) + '</div>' : '') + '</article>';
    }).join('') : emptyState('domain', 'Profil belum diisi', 'Konten akan tampil setelah admin mengisinya melalui Portal Admin → Profil UPTD → Bagian: Profil.')) + '</div>';
}
function renderProfilSejarah(c) {
  const s = D('ProfilUPTD').filter(function (x) { return x.Bagian === 'Sejarah'; }).sort(byUrut);
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Sejarah' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-sejarah') +
    (s.length ? s.map(function (x) {
      return '<article class="card p-6 md:p-8 grid grid-cols-1 ' + (x.Foto ? 'lg:grid-cols-12' : '') + ' gap-6 items-start"><div class="' + (x.Foto ? 'lg:col-span-7' : '') + ' flex flex-col gap-3">' +
        '<h3 class="text-headline-sm text-primary font-semibold">' + esc(x.Judul) + '</h3><p class="text-body-md text-on-surface-variant pre-line text-justify">' + esc(x.Isi) + '</p></div>' +
        (x.Foto ? '<div class="lg:col-span-5 rounded-lg overflow-hidden bg-surface-container">' + imgTag(x.Foto, x.Judul, 'w-full h-full object-cover', 900) + '</div>' : '') + '</article>';
    }).join('') : emptyState('history_edu', 'Sejarah belum diisi', 'Konten akan tampil setelah admin mengisinya.')) + '</div>';
}
function renderProfilVisiMisi(c) {
  const P = D('ProfilUPTD');
  const visi = P.filter(function (x) { return x.Bagian === 'Visi'; }).sort(byUrut);
  const misi = P.filter(function (x) { return x.Bagian === 'Misi'; }).sort(byUrut);
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Visi & Misi' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-visimisi') +
    sectionTitle('Visi') +
    (visi.length ? visi.map(function (v) { return '<div class="card p-6 md:p-8"><p class="text-headline-sm text-primary font-semibold measure pre-line">' + esc(v.Isi) + '</p></div>'; }).join('') : emptyState('flag', 'Visi belum diisi', '')) +
    sectionTitle('Misi') +
    (misi.length ? '<ol class="grid grid-cols-1 md:grid-cols-2 gap-4">' + misi.map(function (m, i) {
      return '<li class="card p-5 flex gap-4"><span class="shrink-0 w-10 h-10 rounded-lg grid place-items-center bg-primary-container text-on-primary-container font-bold num">' + (i + 1) + '</span><div><h3 class="text-title-md text-primary font-bold">' + esc(m.Judul) + '</h3><p class="text-body-md text-on-surface-variant mt-1 pre-line">' + esc(m.Isi) + '</p></div></li>';
    }).join('') + '</ol>' : emptyState('flag', 'Misi belum diisi', '')) + '</div>';
}
function renderProfilTupoksi(c) {
  const T = D('TugasFungsi');
  const tugas = T.filter(function (x) { return x.Jenis === 'Tugas'; }).sort(byUrut);
  const fungsi = T.filter(function (x) { return x.Jenis === 'Fungsi'; }).sort(byUrut);
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Tugas dan Fungsi' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-tupoksi') +
    sectionTitle('Tugas') +
    (tugas.length ? tugas.map(function (t) { return '<div class="card p-6"><h3 class="text-title-lg text-primary font-bold">' + esc(t.Judul) + '</h3><p class="text-body-md text-on-surface-variant mt-2 pre-line measure">' + esc(t.Deskripsi) + '</p></div>'; }).join('') : emptyState('rule', 'Tugas belum diisi', '')) +
    sectionTitle('Fungsi') +
    (fungsi.length ? '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' + fungsi.map(function (f) {
      return '<div class="card p-5 flex gap-3">' + ic('check_circle', 'text-tertiary-fixed-dim fill-1 mt-0.5') + '<div><h3 class="text-title-md text-primary font-bold">' + esc(f.Judul) + '</h3><p class="text-body-sm text-on-surface-variant mt-1 pre-line">' + esc(f.Deskripsi) + '</p></div></div>';
    }).join('') + '</div>' : emptyState('rule', 'Fungsi belum diisi', '')) + '</div>';
}
function renderProfilStruktur(c) {
  const auto = renderOrgChart();
  const st = D('StrukturOrganisasi').filter(function (s) { return s.Gambar; });
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Struktur Organisasi' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-struktur') +
    sectionTitle('Bagan Struktur Organisasi') +
    (auto ? '<div class="card p-5 md:p-8 overflow-x-auto"><div class="min-w-[560px]">' + auto + '</div></div>' :
      emptyState('account_tree', 'Struktur organisasi belum tersedia', 'Data dapat diisi oleh admin di Portal Admin.')) +
    (st.length ? sectionTitle('Bagan resmi (unggahan admin)') + st.map(function (s) {
      return '<div class="card p-4 md:p-6 flex flex-col gap-4"><div><h3 class="text-title-lg text-primary font-bold">' + esc(s.Judul) + '</h3>' + (s.Keterangan ? '<p class="text-body-sm text-on-surface-variant mt-1 pre-line">' + esc(s.Keterangan) + '</p>' : '') + '</div>' +
        '<button type="button" class="block rounded-lg bg-surface-container p-2 text-left" data-id="' + esc(s.Gambar) + '" data-t="' + esc(s.Judul) + '" onclick="previewImage(this.dataset.id,this.dataset.t)" aria-label="Perbesar bagan">' + imgTag(s.Gambar, s.Judul, 'w-full max-h-[560px] object-contain', 1400) + '</button>' +
        '<p class="help">Ketuk gambar untuk memperbesar.</p></div>';
    }).join('') : '') + '</div>';
}
function renderProfilPejabat(c) {
  const pj = D('PejabatStruktural').slice().sort(byUrut);
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Pejabat Struktural', right: '<div class="grid grid-cols-1 gap-3 w-full lg:w-auto">' + statBox('Jumlah pejabat', fmtNum(pj.length)) + '</div>' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-pejabat') +
    (pj.length ? '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">' + pj.map(pejabatCard).join('') + '</div>' : emptyState('badge', 'Data pejabat belum tersedia', '')) + '</div>';
}
function renderProfilPegawai(c) {
  const pg = D('PegawaiUPTD').slice().sort(byUrut);
  c.innerHTML = pageHeader({ eyebrow: 'Profil', title: 'Pegawai UPTD', right: '<div class="grid grid-cols-1 gap-3 w-full lg:w-auto">' + statBox('Jumlah pegawai', fmtNum(pg.length)) + '</div>' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' + profilSubNav('profil-pegawai') +
    (pg.length ? '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">' + pg.map(pejabatCard).join('') + '</div>' : emptyState('groups', 'Data pegawai belum tersedia', '')) + '</div>';
}
function orgBox(p) {
  return '<div class="org-box">' +
    (p.Foto ? '<button type="button" class="org-photo" data-id="' + esc(p.Foto) + '" data-t="' + esc(p.Nama) + '" onclick="previewImage(this.dataset.id,this.dataset.t)" aria-label="Perbesar foto ' + esc(p.Nama) + '">' + imgTag(p.Foto, p.Nama, 'w-full h-full object-cover', 160) + '</button>' : '') +
    '<div class="org-name">' + esc(p.Nama) + '</div>' +
    (p.Jabatan ? '<div class="org-title">' + esc(p.Jabatan) + '</div>' : '') +
    '</div>';
}
function renderOrgChart() {
  const pj = D('PejabatStruktural').slice().sort(byUrut);
  const kepala = pj.filter(function (p) { return p.Jenjang === 'Kepala UPTD'; });
  const sub = pj.filter(function (p) { return p.Jenjang !== 'Kepala UPTD'; });
  const staf = D('PegawaiUPTD').slice().sort(byUrut);
  if (!kepala.length && !sub.length && !staf.length) return '';

  let html = '<div class="org-chart">';
  html += '<div class="org-item org-row-top">' + (kepala.length ? kepala.map(orgBox).join('') : orgBox({ Nama: 'Kepala UPTD', Jabatan: 'belum diisi' })) + '</div>';

  if (sub.length) {
    const branchContent = '<div class="org-spine-branch-line" aria-hidden="true"></div><div class="org-spine-branch-items">' + sub.map(orgBox).join('') + '</div>';
    html += '<div class="org-branch-line" aria-hidden="true"></div>';
    html += '<div class="org-spine">' +
      '<div class="org-spine-mirror" aria-hidden="true">' + branchContent + '</div>' +
      '<div class="org-spine-trunk" aria-hidden="true"></div>' +
      '<div class="org-spine-branch">' + branchContent + '</div>' +
      '</div>';
  }

  if (staf.length) {
    const PER_ROW = 4;
    const rows = [];
    for (let i = 0; i < staf.length; i += PER_ROW) rows.push(staf.slice(i, i + PER_ROW));
    const rowsHtml = rows.map(function (row) {
      const items = row.map(function (s) {
        return '<div class="org-staff-item"><div class="org-staff-box">' +
          '<div class="org-staff-photo">' + (s.Foto ? imgTag(s.Foto, s.Nama, 'w-full h-full object-cover', 160) : esc(initials(s.Nama))) + '</div>' +
          '<div class="org-staff-name">' + esc(s.Nama) + '</div>' +
          (s.Jabatan ? '<div class="org-staff-title">' + esc(s.Jabatan) + '</div>' : '') +
          '</div></div>';
      }).join('');
      return '<div class="org-staff-row">' + items + '</div>';
    }).join('');
    html += '<div class="org-branch-line" aria-hidden="true"></div>';
    html += '<div class="org-item"><div class="org-staff-label">Petugas Operasional <span class="org-staff-count num">' + staf.length + ' orang</span></div>' +
      '<div class="org-staff-wrap">' + rowsHtml + '</div></div>';
  }
  html += '</div>';
  return html;
}

// ════════════════════════════════════════════════════════
// BAGIAN 10: HALAMAN PUBLIK — PARKIR (titik parkir + transparansi + pengaduan rekap)
// ════════════════════════════════════════════════════════
function renderLokasi(c, p) {
  if (p && (p.q !== undefined || p.wil !== undefined)) { S.ui.lokasi.q = p.q || ''; S.ui.lokasi.wil = p.wil || ''; S.ui.lokasi.jenis = ''; S.ui.lokasi.status = ''; }
  const lok = D('LokasiParkir'), wil = uniq(lok.map(function (l) { return l.Wilayah; })).sort();
  c.innerHTML = pageHeader({
    eyebrow: 'Parkir', title: 'Parkir', desc: 'Direktori titik parkir, transparansi penempatan juru parkir, setoran, dan rekap pengaduan masyarakat.',
    right: '<div class="grid grid-cols-2 gap-3 w-full lg:w-auto">' + statBox('Total titik', fmtNum(lok.length)) + statBox('Wilayah', fmtNum(wil.length)) + '</div>'
  }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">' +
    titikPanelHtml() +
    transparansiPanel() +
    '</div>';
  renderLokList();
  loadTransparansi();
}
function titikPanelHtml() {
  const u = S.ui.lokasi, wil = uniq(D('LokasiParkir').map(function (l) { return l.Wilayah; })).sort();
  const opt = function (arr, cur, all) { return '<option value="">' + all + '</option>' + arr.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (cur === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); };
  return '<div class="flex flex-col gap-5">' +
    '<div class="card p-4 flex flex-col gap-3"><div class="grid grid-cols-1 lg:grid-cols-12 gap-3">' +
    '<div class="lg:col-span-5"><label class="label" for="lokQ">Cari lokasi</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-outline">' + ic('search') + '</span>' +
    '<input id="lokQ" class="input pl-11" type="search" value="' + esc(u.q) + '" placeholder="Nama jalan, gedung, atau kawasan…" oninput="lokFilter()" autocomplete="off"></div></div>' +
    '<div class="lg:col-span-2"><label class="label" for="lokW">Wilayah</label><div class="select-wrap"><select id="lokW" class="input" onchange="lokFilter()">' + opt(wil.map(function (w) { return [w, w]; }), u.wil, 'Semua wilayah') + '</select>' + ic('expand_more') + '</div></div>' +
    '<div class="lg:col-span-2"><label class="label" for="lokJ">Jenis</label><div class="select-wrap"><select id="lokJ" class="input" onchange="lokFilter()">' + opt(Object.keys(JENIS_LABEL).map(function (k) { return [k, JENIS_LABEL[k]]; }), u.jenis, 'Semua jenis') + '</select>' + ic('expand_more') + '</div></div>' +
    '<div class="lg:col-span-2"><label class="label" for="lokS">Status</label><div class="select-wrap"><select id="lokS" class="input" onchange="lokFilter()">' + opt([['Resmi', 'Resmi / Berizin'], ['Dalam Evaluasi', 'Dalam Evaluasi']], u.status, 'Semua status') + '</select>' + ic('expand_more') + '</div></div>' +
    '<div class="lg:col-span-1 flex items-end"><button type="button" class="btn btn-ghost w-full" onclick="lokReset()" aria-label="Atur ulang filter" title="Atur ulang filter">' + ic('filter_alt_off') + '</button></div></div>' +
    '<div class="flex flex-wrap items-center justify-between gap-3"><p id="lokMeta" class="text-body-sm text-on-surface-variant" aria-live="polite"></p>' +
    '<div class="flex gap-1" role="group" aria-label="Tampilan"><button type="button" id="vwKartu" class="tab" onclick="lokView(\'kartu\')">' + ic('grid_view') + 'Kartu</button><button type="button" id="vwTabel" class="tab" onclick="lokView(\'tabel\')">' + ic('table_rows') + 'Tabel</button></div></div></div>' +
    '<div id="lokList"></div></div>';
}
function lokFilter() {
  const u = S.ui.lokasi;
  u.q = $('#lokQ').value; u.wil = $('#lokW').value; u.jenis = $('#lokJ').value; u.status = $('#lokS').value;
  renderLokList();
}
function lokReset() { Object.assign(S.ui.lokasi, { q: '', wil: '', jenis: '', status: '' }); renderLokasi($('#app-container'), {}); }
function lokView(v) { S.ui.lokasi.view = v; renderLokList(); }
function renderLokList() {
  const u = S.ui.lokasi, all = D('LokasiParkir'), q = u.q.trim().toLowerCase();
  const rows = all.filter(function (l) {
    return (!q || (l.Nama + ' ' + l.Alamat + ' ' + l.Wilayah).toLowerCase().indexOf(q) >= 0) &&
      (!u.wil || l.Wilayah === u.wil) && (!u.jenis || l.Jenis === u.jenis) && (!u.status || l.Status === u.status);
  });
  $('#lokMeta').textContent = 'Menampilkan ' + rows.length + ' dari ' + all.length + ' titik parkir';
  const k = $('#vwKartu'), t = $('#vwTabel');
  k.setAttribute('aria-selected', String(u.view === 'kartu')); t.setAttribute('aria-selected', String(u.view === 'tabel'));
  const box = $('#lokList');
  if (!rows.length) { box.innerHTML = emptyState('search_off', 'Tidak ada titik parkir yang cocok', 'Ubah kata kunci atau atur ulang filter.', '<button type="button" class="btn btn-outline" onclick="lokReset()">Atur ulang filter</button>'); return; }
  if (u.view === 'tabel') {
    box.innerHTML = '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Alamat</th><th>Wilayah</th><th>Jenis</th><th>Status</th><th>Kapasitas R2 / R4</th><th>Tarif R2 / R4</th><th><span class="sr-only">Peta</span></th></tr></thead><tbody>' +
      rows.map(function (l) {
        return '<tr><td class="font-semibold text-primary">' + esc(l.Nama) + '</td><td>' + esc(l.Alamat) + '</td><td>' + esc(l.Wilayah) + '</td><td>' + esc(l.Jenis) + '</td><td>' + statusChip(l.Status) + '</td>' +
          '<td class="num whitespace-nowrap">' + esc(fmtNum(l.KapasitasR2)) + ' / ' + esc(fmtNum(l.KapasitasR4)) + '</td><td class="num whitespace-nowrap">' + esc(fmtRp(l.TarifR2)) + ' / ' + esc(fmtRp(l.TarifR4)) + '</td>' +
          '<td><a class="btn btn-outline btn-sm" href="' + esc(mapUrl(l)) + '" target="_blank" rel="noopener" aria-label="Rute peta ' + esc(l.Nama) + '">' + ic('open_in_new', 'text-base') + '</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  } else {
    box.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">' + rows.map(lokasiCard).join('') + '</div>';
  }
}

// ════════════════════════════════════════════════════════
// BAGIAN 11: HALAMAN PUBLIK — BERITA
// ════════════════════════════════════════════════════════
function renderBerita(c) {
  const u = S.ui.berita, kats = uniq(D('Berita').map(function (b) { return b.Kategori; })).sort();
  c.innerHTML = pageHeader({ eyebrow: 'Publikasi resmi', title: 'Berita & Pengumuman', desc: 'Informasi kegiatan dan pengumuman terbaru dari UPTD.' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-5">' +
    '<div class="card p-4 flex flex-col gap-3"><label class="label" for="brQ">Cari berita</label><div class="relative max-w-xl"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-outline">' + ic('search') + '</span>' +
    '<input id="brQ" class="input pl-11" type="search" value="' + esc(u.q) + '" placeholder="Kata kunci judul atau isi berita…" oninput="brFilter()" autocomplete="off"></div>' +
    '<div class="flex flex-wrap gap-2" id="brKat" role="group" aria-label="Kategori"></div></div>' +
    '<p id="brMeta" class="text-body-sm text-on-surface-variant" aria-live="polite"></p><div id="brList"></div></div>';
  renderBeritaList(kats);
}
function brFilter() { S.ui.berita.q = $('#brQ').value; S.ui.berita.n = 9; renderBeritaList(); }
function brKat(k) { S.ui.berita.kat = (S.ui.berita.kat === k ? '' : k); S.ui.berita.n = 9; renderBeritaList(); }
function brMore() { S.ui.berita.n += 9; renderBeritaList(); }
function renderBeritaList(kats) {
  const u = S.ui.berita, all = D('Berita').slice().sort(byTglDesc), q = u.q.trim().toLowerCase();
  kats = kats || uniq(all.map(function (b) { return b.Kategori; })).sort();
  $('#brKat').innerHTML = '<button type="button" class="chip ' + (!u.kat ? 'chip-brand' : 'chip-neu') + ' min-h-[32px] px-3" onclick="brKat(\'\')" aria-pressed="' + (!u.kat) + '">Semua</button>' +
    kats.map(function (k) { return '<button type="button" class="chip ' + (u.kat === k ? 'chip-brand' : 'chip-neu') + ' min-h-[32px] px-3" data-k="' + esc(k) + '" onclick="brKat(this.dataset.k)" aria-pressed="' + (u.kat === k) + '">' + esc(k) + '</button>'; }).join('');
  const rows = all.filter(function (b) { return (!u.kat || b.Kategori === u.kat) && (!q || (b.Judul + ' ' + b.Isi + ' ' + b.Kategori).toLowerCase().indexOf(q) >= 0); });
  $('#brMeta').textContent = rows.length + ' berita ditemukan';
  const box = $('#brList');
  if (!rows.length) { box.innerHTML = emptyState('search_off', 'Berita tidak ditemukan', 'Coba kata kunci atau kategori lain.'); return; }
  box.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">' + rows.slice(0, u.n).map(beritaCard).join('') + '</div>' +
    (rows.length > u.n ? '<div class="text-center mt-6"><button type="button" class="btn btn-outline" onclick="brMore()">Muat lebih banyak</button></div>' : '');
}
function renderBeritaDetail(c, p) {
  const b = D('Berita').find(function (x) { return x.ID === (p && p.id); });
  if (!b) { c.innerHTML = '<div class="max-w-3xl mx-auto px-4 py-16">' + emptyState('article', 'Berita tidak ditemukan', 'Berita mungkin sudah dihapus.', '<button type="button" class="btn btn-primary" onclick="navigateTo(\'berita\')">Ke daftar berita</button>') + '</div>'; return; }
  const lain = D('Berita').filter(function (x) { return x.ID !== b.ID; }).sort(byTglDesc).slice(0, 3);
  c.innerHTML = '<article class="max-w-4xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">' +
    '<div><button type="button" class="btn btn-ghost btn-sm" onclick="goBack()">' + ic('arrow_back', 'text-base') + 'Kembali</button></div>' +
    '<header class="flex flex-col gap-3"><div class="flex items-center gap-3 flex-wrap"><span class="chip chip-brand">' + esc(b.Kategori) + '</span><span class="text-label-md text-on-surface-variant inline-flex items-center gap-1">' + ic('calendar_today', 'text-base') + esc(fmtTgl(b.Tanggal)) + '</span></div>' +
    '<h1 class="text-headline-lg-m md:text-display-md text-primary">' + esc(b.Judul) + '</h1></header>' +
    (b.Foto ? '<button type="button" class="block rounded-xl overflow-hidden bg-surface-container" data-id="' + esc(b.Foto) + '" data-t="' + esc(b.Judul) + '" onclick="previewImage(this.dataset.id,this.dataset.t)" aria-label="Perbesar foto berita">' + imgTag(b.Foto, b.Judul, 'w-full max-h-[460px] object-cover', 1200) + '</button>' : '') +
    '<div class="text-body-lg text-on-surface pre-line measure leading-8">' + esc(b.Isi) + '</div></article>' +
    (lain.length ? '<section class="max-w-7xl mx-auto px-4 md:px-8 pb-10 flex flex-col gap-5">' + sectionTitle('Berita lainnya') + '<div class="grid grid-cols-1 md:grid-cols-3 gap-5">' + lain.map(beritaCard).join('') + '</div></section>' : '');
}

// ════════════════════════════════════════════════════════
// BAGIAN 12: HALAMAN PUBLIK — REGULASI & PELAYANAN
// ════════════════════════════════════════════════════════
const REG_TABS = [{ k: 'regulasi', l: 'Regulasi', i: 'gavel' }, { k: 'layanan', l: 'Pelayanan', i: 'support_agent' }];
function renderRegulasi(c, p) {
  if (p && p.tab) S.ui.regTab = p.tab;
  c.innerHTML = pageHeader({ eyebrow: 'Dasar hukum & layanan', title: 'Regulasi & Pelayanan', desc: 'Peraturan terkait penyelenggaraan parkir serta syarat dan prosedur layanan UPTD.' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6"><div id="regTabs">' + tabsHtml(REG_TABS, S.ui.regTab, 'setRegTab', 'Regulasi dan pelayanan') + '</div>' +
    '<div id="tabpanel" role="tabpanel" tabindex="0" class="flex flex-col gap-5">' + regPanel() + '</div></div>';
  if (S.ui.regTab === 'regulasi') renderRegList();
}
function setRegTab(k) {
  S.ui.regTab = k;
  $$('#regTabs .tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.k === k)); });
  $('#tabpanel').innerHTML = regPanel();
  if (k === 'regulasi') renderRegList();
}
function regPanel() {
  if (S.ui.regTab === 'layanan') {
    const L = D('Pelayanan');
    if (!L.length) return emptyState('support_agent', 'Data pelayanan belum tersedia', '');
    return L.map(function (l, i) {
      const syarat = lines(l.Syarat), prosedur = lines(l.Prosedur);
      return '<details class="card group" ' + (i === 0 ? 'open' : '') + '><summary class="flex items-center gap-3 p-5 cursor-pointer list-none min-h-[44px]">' +
        '<div class="kpi-icon">' + ic('support_agent') + '</div><h3 class="text-title-lg text-primary font-bold flex-1">' + esc(l.Nama) + '</h3>' + ic('expand_more', 'text-outline transition-transform group-open:rotate-180') + '</summary>' +
        '<div class="px-5 pb-6 flex flex-col gap-5 border-t border-outline-variant/40 pt-5"><p class="text-body-md text-on-surface-variant pre-line measure">' + esc(l.Deskripsi) + '</p>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        '<div><h4 class="text-label-lg text-primary uppercase tracking-wide mb-2">Syarat</h4>' + (syarat.length ? '<ul class="flex flex-col gap-2">' + syarat.map(function (s) { return '<li class="flex gap-2 text-body-md text-on-surface-variant">' + ic('check_circle', 'text-tertiary-fixed-dim fill-1 text-xl') + '<span>' + esc(s) + '</span></li>'; }).join('') + '</ul>' : '<p class="text-body-sm text-on-surface-variant">Tidak ada persyaratan khusus.</p>') + '</div>' +
        '<div><h4 class="text-label-lg text-primary uppercase tracking-wide mb-2">Prosedur</h4>' + (prosedur.length ? '<ol class="flex flex-col gap-2">' + prosedur.map(function (s, n) { return '<li class="flex gap-3 text-body-md text-on-surface-variant"><span class="shrink-0 w-6 h-6 rounded-full grid place-items-center bg-primary-container text-on-primary-container text-label-md num">' + (n + 1) + '</span><span>' + esc(s) + '</span></li>'; }).join('') + '</ol>' : '<p class="text-body-sm text-on-surface-variant">Prosedur belum diisi.</p>') + '</div></div>' +
        (l.Dokumen ? '<div class="flex flex-wrap gap-2"><button type="button" class="btn btn-outline btn-sm" data-id="' + esc(l.Dokumen) + '" data-t="' + esc(l.Nama) + '" onclick="previewFile(this.dataset.id,this.dataset.t)">' + ic('visibility', 'text-base') + 'Lihat dokumen</button>' +
          '<a class="btn btn-primary btn-sm" href="' + esc(dlUrl(l.Dokumen)) + '" target="_blank" rel="noopener">' + ic('download', 'text-base') + 'Unduh</a></div>' : '') + '</div></details>';
    }).join('');
  }
  return '<div class="card p-4"><label class="label" for="regQ">Cari regulasi</label><div class="relative max-w-xl"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-outline">' + ic('search') + '</span>' +
    '<input id="regQ" class="input pl-11" type="search" value="' + esc(S.ui.regQ) + '" placeholder="Judul atau nomor regulasi…" oninput="regFilter()" autocomplete="off"></div></div><div id="regList" class="flex flex-col gap-4"></div>';
}
function regFilter() { S.ui.regQ = $('#regQ').value; renderRegList(); }
function renderRegList() {
  const box = $('#regList'); if (!box) return;
  const q = S.ui.regQ.trim().toLowerCase();
  const rows = D('Regulasi').filter(function (r) { return !q || (r.Judul + ' ' + r.NomorTahun + ' ' + r.Ringkasan).toLowerCase().indexOf(q) >= 0; });
  if (!rows.length) { box.innerHTML = emptyState('gavel', 'Regulasi tidak ditemukan', 'Coba kata kunci lain.'); return; }
  box.innerHTML = rows.map(function (r) {
    return '<article class="card card-hover p-5 flex flex-col md:flex-row md:items-center gap-4"><div class="kpi-icon shrink-0">' + ic('description') + '</div>' +
      '<div class="flex-1 min-w-0"><span class="text-label-md text-secondary uppercase tracking-wider">' + esc(r.NomorTahun) + '</span>' +
      '<h3 class="text-title-md text-primary font-bold">' + esc(r.Judul) + '</h3>' + (r.Ringkasan ? '<p class="text-body-sm text-on-surface-variant mt-1 clamp-3">' + esc(r.Ringkasan) + '</p>' : '') + '</div>' +
      '<div class="flex flex-wrap gap-2 shrink-0">' + (r.File ?
        '<button type="button" class="btn btn-outline btn-sm" data-id="' + esc(r.File) + '" data-t="' + esc(r.Judul) + '" onclick="previewFile(this.dataset.id,this.dataset.t)">' + ic('visibility', 'text-base') + 'Lihat</button>' +
        '<a class="btn btn-primary btn-sm" href="' + esc(dlUrl(r.File)) + '" target="_blank" rel="noopener">' + ic('download', 'text-base') + 'Unduh PDF</a>' :
        '<span class="chip chip-neu">Berkas belum tersedia</span>') + '</div></article>';
  }).join('');
}

// ════════════════════════════════════════════════════════
// BAGIAN 13: HALAMAN PUBLIK — KONTAK
// ════════════════════════════════════════════════════════
const KONTAK_TABS = [{ k: 'pesan', l: 'Kirim Pesan', i: 'mail' }, { k: 'pengaduan', l: 'Pengaduan Pelayanan Parkir', i: 'campaign' }];
function renderKontak(c, p) {
  if (p && p.tab) S.ui.kontakTab = p.tab;
  const cfg = S.cfg, info = [];
  info.push(['location_on', 'Alamat', esc(cfg.alamat || '-')]);
  if (cfg.telepon) info.push(['call', 'Telepon', '<a class="text-primary underline underline-offset-2" href="tel:' + esc(cfg.telepon.replace(/[^\d+]/g, '')) + '">' + esc(cfg.telepon) + '</a>']);
  if (cfg.whatsapp) info.push(['chat', 'WhatsApp', '<a class="text-primary underline underline-offset-2" href="' + esc(waLink(cfg.whatsapp)) + '" target="_blank" rel="noopener">' + esc(cfg.whatsapp) + '</a>']);
  if (cfg.emailKontak) info.push(['mail', 'Email', '<a class="text-primary underline underline-offset-2 break-all" href="mailto:' + esc(cfg.emailKontak) + '">' + esc(cfg.emailKontak) + '</a>']);
  info.push(['schedule', 'Jam pelayanan', '<span class="pre-line">' + esc(cfg.jamLayanan || '-') + '</span>']);
  c.innerHTML = pageHeader({ eyebrow: 'Hubungi kami', title: 'Kontak Kami', desc: 'Sampaikan pertanyaan, saran, atau pengaduan pelayanan parkir. Pesan Anda akan diteruskan ke pengelola UPTD / DISPAKOT.' }) +
    '<div class="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">' +
    '<div class="lg:col-span-5 card p-6 flex flex-col gap-5"><h2 class="text-title-lg text-primary font-bold">Informasi kantor</h2>' +
    info.map(function (i) { return '<div class="flex gap-3"><div class="kpi-icon shrink-0">' + ic(i[0]) + '</div><div class="min-w-0"><div class="text-label-md text-on-surface-variant uppercase">' + i[1] + '</div><div class="text-body-md text-on-surface">' + i[2] + '</div></div></div>'; }).join('') +
    (cfg.mapsUrl ? '<a class="btn btn-outline self-start" href="' + esc(cfg.mapsUrl) + '" target="_blank" rel="noopener">' + ic('map') + 'Buka di Google Maps</a>' : '') + '</div>' +
    '<div class="lg:col-span-7 card p-6 flex flex-col gap-5"><div id="kontakTabs">' + tabsHtml(KONTAK_TABS, S.ui.kontakTab, 'setKontakTab', 'Jenis pesan') + '</div>' +
    '<div id="kontakBox">' + kontakPanelHtml() + '</div></div></div>';
  if (S.ui.kontakTab === 'pengaduan') loadPengaduanDropdowns();
}
function kontakPanelHtml() { return S.ui.kontakTab === 'pengaduan' ? pengaduanFormHtml() : kontakForm(); }
function setKontakTab(k) {
  S.ui.kontakTab = k;
  $$('#kontakTabs .tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.k === k)); });
  $('#kontakBox').innerHTML = kontakPanelHtml();
  if (k === 'pengaduan') loadPengaduanDropdowns();
}
function kontakForm() {
  return '<h2 class="text-title-lg text-primary font-bold mb-1">Kirim pesan</h2><p class="text-body-sm text-on-surface-variant mb-5">Kolom bertanda <span class="text-error">*</span> wajib diisi.</p>' +
    '<form id="kontakForm" class="flex flex-col gap-4" onsubmit="return sendContact(event)" novalidate>' +
    '<div><label class="label" for="kNama">Nama<span class="req">*</span></label><input id="kNama" name="nama" class="input" type="text" maxlength="80" autocomplete="name" required aria-describedby="eNama"><div id="eNama" class="err-text" role="alert"></div></div>' +
    '<div><label class="label" for="kKontak">Email atau nomor HP<span class="req">*</span></label><input id="kKontak" name="kontak" class="input" type="text" inputmode="email" maxlength="80" autocomplete="email" required aria-describedby="eKontak hKontak"><div id="hKontak" class="help">Contoh: nama@email.com atau 0812xxxxxxx</div><div id="eKontak" class="err-text" role="alert"></div></div>' +
    '<div><label class="label" for="kPesan">Isi pesan<span class="req">*</span></label><textarea id="kPesan" name="pesan" class="input" maxlength="1500" required aria-describedby="ePesan cPesan" oninput="countPesan()"></textarea>' +
    '<div class="flex justify-between"><div id="ePesan" class="err-text" role="alert"></div><div id="cPesan" class="help num ml-auto">0 / 1500</div></div></div>' +
    '<div style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden" aria-hidden="true"><label>Jangan diisi<input type="text" name="website" id="kWeb" tabindex="-1" autocomplete="off"></label></div>' +
    '<div><button type="submit" class="btn btn-primary" id="kSubmit">' + ic('send') + 'Kirim pesan</button></div></form>';
}
function countPesan() { $('#cPesan').textContent = $('#kPesan').value.length + ' / 1500'; }
function sendContact(e) {
  e.preventDefault();
  const v = { nama: $('#kNama').value.trim(), kontak: $('#kKontak').value.trim(), pesan: $('#kPesan').value.trim(), website: $('#kWeb').value };
  const err = { nama: '', kontak: '', pesan: '' };
  if (v.nama.length < 2) err.nama = 'Nama wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.kontak) && !/^\+?[0-9][0-9\s-]{7,18}$/.test(v.kontak)) err.kontak = 'Isi email atau nomor HP yang valid.';
  if (v.pesan.length < 10) err.pesan = 'Pesan minimal 10 karakter.';
  $('#eNama').textContent = err.nama; $('#eKontak').textContent = err.kontak; $('#ePesan').textContent = err.pesan;
  $('#kNama').classList.toggle('invalid', !!err.nama); $('#kKontak').classList.toggle('invalid', !!err.kontak); $('#kPesan').classList.toggle('invalid', !!err.pesan);
  if (err.nama || err.kontak || err.pesan) { (err.nama ? $('#kNama') : err.kontak ? $('#kKontak') : $('#kPesan')).focus(); return false; }
  const btn = $('#kSubmit'); setBusy(btn, true, 'Mengirim…');
  api('submitContact', v).then(function () {
    $('#kontakBox').innerHTML = '<div class="py-8 text-center flex flex-col items-center gap-3"><div class="kpi-icon" style="background:rgb(var(--chip-ok-bg));color:rgb(var(--chip-ok-fg))">' + ic('check_circle', 'fill-1') + '</div>' +
      '<h2 class="text-headline-sm text-primary">Pesan Anda berhasil terkirim</h2><p class="text-body-md text-on-surface-variant max-w-md">Terima kasih. Pesan Anda telah diteruskan kepada pengelola UPTD.</p>' +
      '<button type="button" class="btn btn-outline" onclick="$(\'#kontakBox\').innerHTML=kontakForm()">Kirim pesan lain</button></div>';
  }).catch(function (er) {
    setBusy(btn, false); showToast('Pesan gagal dikirim', er.message, 'err');
  });
  return false;
}

// ════════════════════════════════════════════════════════
// BAGIAN 13B: TRANSPARANSI & PENGADUAN (dashboard publik DISPAKOT, digabung di Parkir)
// ════════════════════════════════════════════════════════
const PENGADUAN_KATEGORI = ['Tarif Melebihi Ketentuan', 'Tidak Berseragam/Tanpa KTA', 'Pelayanan Tidak Ramah', 'Parkir Sembarangan/Mengganggu Lalu Lintas', 'Lainnya'];
function transparansiPanel() {
  return '<div class="flex flex-col gap-8">' +

    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">' +
    '<div class="card p-4 text-center"><div class="text-headline-sm text-primary font-bold num" id="tpJukir">-</div><div class="text-label-sm text-on-surface-variant mt-1">Jukir Aktif Ditempatkan</div></div>' +
    '<div class="card p-4 text-center"><div class="text-headline-sm text-primary font-bold num" id="tpSetoran">-</div><div class="text-label-sm text-on-surface-variant mt-1">Setoran Bulan Ini</div></div>' +
    '<div class="card p-4 text-center"><div class="text-headline-sm text-primary font-bold num" id="tpPengaduan">-</div><div class="text-label-sm text-on-surface-variant mt-1">Total Pengaduan</div></div></div>' +

    '<section class="card">' +
    '<div class="px-5 py-4 border-b border-outline-variant/40 flex items-center gap-2 text-title-md text-primary font-bold">' + ic('groups') + 'Rekap Penempatan Juru Parkir</div>' +
    '<div class="p-5 tbl-wrap"><table class="tbl" id="tblPenempatan"><thead><tr><th>Nama Juru Parkir</th><th>Ruas Jalan</th><th>Lokasi</th></tr></thead><tbody><tr><td colspan="3" class="text-center text-on-surface-variant">Memuat…</td></tr></tbody></table></div></section>' +

    '<section class="card">' +
    '<div class="px-5 py-4 border-b border-outline-variant/40 flex items-center gap-2 text-title-md text-primary font-bold">' + ic('payments') + 'Rekap Setoran Bulan Berjalan per Ruas Jalan</div>' +
    '<div class="p-5"><div class="chart-box relative h-64"><canvas id="chSetoran"></canvas></div>' +
    '<div class="tbl-wrap mt-4"><table class="tbl" id="tblSetoran"><thead><tr><th>Ruas Jalan</th><th>Total Setoran</th></tr></thead><tbody><tr><td colspan="2" class="text-center text-on-surface-variant">Memuat…</td></tr></tbody></table></div></div></section>' +

    '<section class="card">' +
    '<div class="px-5 py-4 border-b border-outline-variant/40 flex items-center gap-2 text-title-md text-primary font-bold">' + ic('campaign') + 'Rekap Pengaduan Masyarakat</div>' +
    '<div class="p-5 flex flex-col gap-4">' +
    '<p class="text-body-sm text-on-surface-variant">Ringkasan pengaduan masyarakat terkait pelayanan parkir/juru parkir. Mau melapor? Sampaikan lewat halaman <button type="button" class="text-primary underline underline-offset-2" onclick="navigateTo(\'kontak\',{tab:\'pengaduan\'})">Kontak</button>.</p>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">' +
    '<div class="card p-3 text-center"><div class="text-title-lg font-bold num" id="pgTotal">0</div><div class="text-label-sm text-on-surface-variant">Total</div></div>' +
    '<div class="card p-3 text-center" style="background:rgb(var(--error-container))"><div class="text-title-lg font-bold num" style="color:rgb(var(--on-error-container))" id="pgBaru">0</div><div class="text-label-sm" style="color:rgb(var(--on-error-container))">Baru</div></div>' +
    '<div class="card p-3 text-center" style="background:rgb(var(--secondary-container)/.25)"><div class="text-title-lg font-bold num" id="pgDiproses">0</div><div class="text-label-sm text-on-surface-variant">Diproses</div></div>' +
    '<div class="card p-3 text-center" style="background:rgb(var(--tertiary-container))"><div class="text-title-lg font-bold num" style="color:rgb(var(--on-tertiary-container))" id="pgSelesai">0</div><div class="text-label-sm" style="color:rgb(var(--on-tertiary-container))">Selesai</div></div></div>' +
    '<div class="tbl-wrap"><table class="tbl" id="tblRekapKategori"><thead><tr><th>Kategori</th><th>Jumlah</th></tr></thead><tbody><tr><td colspan="2" class="text-center text-on-surface-variant">Memuat…</td></tr></tbody></table></div>' +
    '</div></section></div>';
}
function loadTransparansi() {
  api('getPublicDashboardDataWeb').then(function (res) { renderTransparansiData(res.data); })
    .catch(function (er) { showToast('Gagal memuat data', er.message, 'err'); });
}
async function renderTransparansiData(d) {
  if (!$('#tpJukir')) return;
  $('#tpJukir').innerText = d.penempatan.length;
  $('#tpSetoran').innerText = fmtRp(d.totalSetoranBulanIni);
  $('#tpPengaduan').innerText = d.pengaduan.total;

  $('#tblPenempatan tbody').innerHTML = d.penempatan.map(function (p) {
    return '<tr><td>' + esc(p.Nama) + '</td><td>' + esc(p.NamaJalan) + '</td><td>' + esc(p.NamaLokasi) + '</td></tr>';
  }).join('') || '<tr><td colspan="3" class="text-center text-on-surface-variant">Belum ada data</td></tr>';

  $('#tblSetoran tbody').innerHTML = d.rekapSetoran.map(function (r) {
    return '<tr><td>' + esc(r.namaJalan) + '</td><td>' + fmtRp(r.total) + '</td></tr>';
  }).join('') || '<tr><td colspan="2" class="text-center text-on-surface-variant">Belum ada setoran bulan ini</td></tr>';

  try { await ensureChartJs(); } catch (e) {
    const b = $('#chSetoran'); if (b) b.parentNode.innerHTML = '<p class="text-body-sm text-on-surface-variant p-4">' + esc(e.message) + '</p>';
  }
  if (window.Chart && $('#chSetoran')) {
    if (S.charts.transSetoran) { try { S.charts.transSetoran.destroy(); } catch (e) { /* sudah hilang */ } }
    const t = chartTheme();
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif"; Chart.defaults.color = t.text;
    S.charts.transSetoran = new Chart($('#chSetoran'), {
      type: 'bar',
      data: { labels: d.rekapSetoran.map(function (r) { return r.namaJalan; }), datasets: [{ label: 'Setoran (Rp)', data: d.rekapSetoran.map(function (r) { return r.total; }), backgroundColor: t.pal[0], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: t.text } }, y: { beginAtZero: true, ticks: { color: t.text, callback: function (v) { return fmtRp(v); } }, grid: { color: t.grid } } } }
    });
  }

  $('#pgTotal').innerText = d.pengaduan.total;
  $('#pgBaru').innerText = d.pengaduan.perStatus['Baru'] || 0;
  $('#pgDiproses').innerText = d.pengaduan.perStatus['Diproses'] || 0;
  $('#pgSelesai').innerText = d.pengaduan.perStatus['Selesai'] || 0;
  $('#tblRekapKategori tbody').innerHTML = Object.keys(d.pengaduan.perKategori || {}).map(function (k) {
    return '<tr><td>' + esc(k) + '</td><td>' + d.pengaduan.perKategori[k] + '</td></tr>';
  }).join('') || '<tr><td colspan="2" class="text-center text-on-surface-variant">Belum ada data</td></tr>';
}
function pengaduanFormHtml() {
  return '<h2 class="text-title-lg text-primary font-bold mb-1">Pengaduan Pelayanan Parkir</h2><p class="text-body-sm text-on-surface-variant mb-5">Sampaikan pengaduan terkait pelayanan parkir/juru parkir. Data pelapor bersifat rahasia dan hanya digunakan untuk tindak lanjut oleh Dinas Perhubungan.</p>' +
    '<div id="pengaduanForm" class="flex flex-col gap-4">' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
    '<div><label class="label" for="pgNama">Nama Anda</label><input id="pgNama" class="input" type="text"></div>' +
    '<div><label class="label" for="pgKontak">No. HP / WhatsApp</label><input id="pgKontak" class="input" type="text"></div></div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
    '<div><label class="label" for="pgLokasi">Ruas Jalan / Lokasi terkait (opsional)</label><div class="select-wrap"><select id="pgLokasi" class="input"><option value="">— Pilih lokasi —</option></select>' + ic('expand_more') + '</div></div>' +
    '<div><label class="label" for="pgJukir">Nama Juru Parkir (jika diketahui)</label><div class="select-wrap"><select id="pgJukir" class="input"><option value="">— Pilih jukir —</option></select>' + ic('expand_more') + '</div></div></div>' +
    '<div><label class="label" for="pgKategori">Kategori</label><div class="select-wrap"><select id="pgKategori" class="input">' + PENGADUAN_KATEGORI.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select>' + ic('expand_more') + '</div></div>' +
    '<div><label class="label" for="pgIsi">Isi Pengaduan</label><textarea id="pgIsi" class="input" rows="3" placeholder="Ceritakan kejadian yang Anda alami…"></textarea></div>' +
    '<div><button type="button" class="btn btn-primary self-start" id="btnPengaduanWeb" onclick="kirimPengaduanWeb()">' + ic('send') + 'Kirim Pengaduan</button></div></div>';
}
function loadPengaduanDropdowns() {
  api('getLokasiDropdownPublikWeb').then(function (res) {
    const sel = $('#pgLokasi'); if (!sel) return;
    sel.innerHTML = '<option value="">— Pilih lokasi —</option>' + res.data.map(function (l) { return '<option value="' + esc(l.ID_Lokasi) + '">' + esc(l.Nama_Lokasi) + ' (' + esc(l.Nama_Jalan) + ')</option>'; }).join('');
  }).catch(function () { /* dropdown opsional: diabaikan jika gagal */ });
  api('getJukirDropdownPublikWeb').then(function (res) {
    const sel = $('#pgJukir'); if (!sel) return;
    sel.innerHTML = '<option value="">— Pilih jukir —</option>' + res.data.map(function (j) { return '<option value="' + esc(j.ID_Jukir) + '">' + esc(j.Nama) + '</option>'; }).join('');
  }).catch(function () { /* dropdown opsional: diabaikan jika gagal */ });
}
function kirimPengaduanWeb() {
  const btn = $('#btnPengaduanWeb');
  const data = {
    Nama_Pelapor: $('#pgNama').value.trim(), Kontak_Pelapor: $('#pgKontak').value.trim(),
    ID_Lokasi: $('#pgLokasi').value, ID_Jukir: $('#pgJukir').value,
    Kategori: $('#pgKategori').value, Isi_Pengaduan: $('#pgIsi').value.trim()
  };
  if (!data.Nama_Pelapor || !data.Kontak_Pelapor || !data.Isi_Pengaduan) {
    showToast('Belum lengkap', 'Nama, kontak, dan isi pengaduan wajib diisi.', 'warn'); return;
  }
  setBusy(btn, true, 'Mengirim…');
  api('submitPengaduanPublik', data).then(function () {
    const box = $('#kontakBox');
    if (box) box.innerHTML = '<div class="py-8 text-center flex flex-col items-center gap-3"><div class="kpi-icon" style="background:rgb(var(--chip-ok-bg));color:rgb(var(--chip-ok-fg))">' + ic('check_circle', 'fill-1') + '</div>' +
      '<h2 class="text-headline-sm text-primary">Pengaduan Anda berhasil terkirim</h2><p class="text-body-md text-on-surface-variant max-w-md">Terima kasih. Pengaduan Anda akan ditindaklanjuti oleh Dinas Perhubungan.</p>' +
      '<button type="button" class="btn btn-outline" onclick="$(\'#kontakBox\').innerHTML=pengaduanFormHtml();loadPengaduanDropdowns();">Kirim pengaduan lain</button></div>';
  }).catch(function (er) { showToast('Gagal mengirim', er.message, 'err'); }).finally(function () { setBusy(btn, false); });
}

// ════════════════════════════════════════════════════════
// BAGIAN 13C: SURVEI KEPUASAN MASYARAKAT (publik)
// ════════════════════════════════════════════════════════
const SURVEI_UNSUR = [
  ['sv_Kemudahan', 'Nilai_Kemudahan', 'Kemudahan mendapatkan layanan parkir'],
  ['sv_Keramahan', 'Nilai_Keramahan', 'Kesopanan & keramahan juru parkir'],
  ['sv_Tarif', 'Nilai_Tarif', 'Kewajaran tarif yang dikenakan'],
  ['sv_Karcis', 'Nilai_Karcis', 'Kejelasan karcis/bukti pembayaran'],
  ['sv_Keamanan', 'Nilai_Keamanan', 'Keamanan & kenyamanan lokasi parkir']
];
const SURVEI_UNSUR_LABEL = { Nilai_Kemudahan: 'Kemudahan Layanan', Nilai_Keramahan: 'Keramahan Juru Parkir', Nilai_Tarif: 'Kewajaran Tarif', Nilai_Karcis: 'Kejelasan Karcis', Nilai_Keamanan: 'Keamanan Lokasi' };
function surveiForm() {
  return sectionTitle('Isi penilaian Anda') +
    '<div id="surveiForm" class="flex flex-col gap-3 mt-4">' +
    SURVEI_UNSUR.map(function (u) { return '<div class="flex items-center justify-between gap-3"><span class="text-body-sm">' + esc(u[2]) + '</span><span class="star-pick" data-target="' + u[0] + '"></span></div>'; }).join('') +
    SURVEI_UNSUR.map(function (u) { return '<input type="hidden" id="' + u[0] + '" value="3">'; }).join('') +
    '<div><label class="label" for="sv_Nama">Nama (opsional)</label><input id="sv_Nama" class="input" type="text" maxlength="80"></div>' +
    '<div><label class="label" for="sv_Saran">Saran/masukan (opsional)</label><textarea id="sv_Saran" class="input" rows="2" maxlength="1500"></textarea></div>' +
    '<div><button type="button" class="btn btn-primary self-start" id="btnSurvei" onclick="kirimSurvei()">' + ic('send') + 'Kirim Penilaian</button></div></div>';
}
function initStarRatings() {
  $$('.star-pick').forEach(function (el) {
    const target = $('#' + el.dataset.target);
    if (!target) return;
    el.innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<span class="material-symbols-outlined" data-val="' + n + '">star</span>'; }).join('');
    renderStarState(el, Number(target.value));
    $$('span', el).forEach(function (star) {
      star.addEventListener('click', function () { target.value = star.dataset.val; renderStarState(el, Number(star.dataset.val)); });
    });
  });
}
function renderStarState(el, val) { $$('span', el).forEach(function (star) { star.classList.toggle('on', Number(star.dataset.val) <= val); }); }
function starDisplay(val) {
  const rounded = Math.round(Number(val) || 0);
  let out = '<span style="color:rgb(var(--secondary-container))">';
  for (let i = 1; i <= 5; i++) out += i <= rounded ? '★' : '☆';
  return out + '</span>';
}
function loadRekapSurvei() {
  api('getRekapSurveiPublik').then(function (res) {
    const d = res.data;
    const rr = $('#svRataRata'), rp = $('#svResponden'), tb = $('#tblSurvei tbody');
    if (!rr || !rp || !tb) return;
    rr.innerHTML = d.jumlahResponden ? (d.rataRataKeseluruhan + ' ' + starDisplay(d.rataRataKeseluruhan)) : '-';
    rp.innerText = d.jumlahResponden;
    tb.innerHTML = Object.keys(d.perUnsur || {}).map(function (u) {
      return '<tr><td>' + esc(SURVEI_UNSUR_LABEL[u] || u) + '</td><td>' + d.perUnsur[u] + ' ' + starDisplay(d.perUnsur[u]) + '</td></tr>';
    }).join('') || '<tr><td colspan="2" class="text-center text-on-surface-variant">Belum ada responden</td></tr>';
  }).catch(function () { /* rekap gagal dimuat: form tetap bisa dipakai */ });
}
function kirimSurvei() {
  const btn = $('#btnSurvei');
  const data = {};
  SURVEI_UNSUR.forEach(function (u) { data[u[1]] = $('#' + u[0]).value; });
  data.Nama = $('#sv_Nama').value.trim();
  data.Saran = $('#sv_Saran').value.trim();
  setBusy(btn, true, 'Mengirim…');
  api('submitSurveiPublik', data).then(function () {
    showToast('Terima kasih', 'Penilaian Anda telah kami terima.');
    $('#sv_Nama').value = ''; $('#sv_Saran').value = '';
    SURVEI_UNSUR.forEach(function (u) { $('#' + u[0]).value = '3'; });
    initStarRatings();
    loadRekapSurvei();
  }).catch(function (er) { showToast('Gagal mengirim', er.message, 'err'); }).finally(function () { setBusy(btn, false); });
}

// ════════════════════════════════════════════════════════
// BAGIAN 14: GRAFIK (Chart.js dimuat lazy, hanya saat dibutuhkan)
// ════════════════════════════════════════════════════════
let _chartP = null;
function ensureChartJs() {
  if (window.Chart) return Promise.resolve();
  if (_chartP) return _chartP;
  _chartP = new Promise(function (res, rej) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
    s.onload = res;
    s.onerror = function () { _chartP = null; rej(new Error('Pustaka grafik tidak dapat dimuat. Periksa koneksi internet.')); };
    document.head.appendChild(s);
  });
  return _chartP;
}
function chartTheme() {
  const cs = getComputedStyle(document.documentElement);
  const trip = function (n) { return cs.getPropertyValue('--' + n).trim().split(/\s+/).join(','); };
  const dark = S.theme === 'dark';
  return {
    text: 'rgb(' + trip('on-surface-variant') + ')', grid: 'rgba(' + trip('outline-variant') + ',.5)', surface: 'rgb(' + trip('surface-container-lowest') + ')',
    pal: dark ? ['#7C94CB', '#FE932C', '#68DBA9', '#AFC6FF', '#FFB77D', '#85F8C4'] : ['#0F2B5C', '#D97706', '#059669', '#465D91', '#904D00', '#2AA779']
  };
}
function destroyCharts() {
  Object.keys(S.charts).forEach(function (k) { try { S.charts[k].destroy(); } catch (e) { /* sudah hilang */ } });
  S.charts = {};
}

// ════════════════════════════════════════════════════════
// BAGIAN 15: BOOT
// ════════════════════════════════════════════════════════
function hideBoot() {
  const b = $('#boot'); if (!b) return;
  b.style.transition = 'opacity .25s'; b.style.opacity = '0';
  setTimeout(function () { b.style.display = 'none'; }, 260);
}
document.addEventListener('DOMContentLoaded', async function () {
  initTheme();
  renderNav();
  try {
    await loadBundle();
    hideBoot();
    navigateTo('beranda', {}, { first: true });
  } catch (e) {
    hideBoot(); showFatal(e);
  }
});