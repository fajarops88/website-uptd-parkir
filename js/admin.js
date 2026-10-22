'use strict';
/**
 * ============================================================
 * PORTAL ADMIN (Website) — diporting dari JavaScript.html Bagian 15-19.
 * Memakai S.token/S.admin/S.adm/adminApi()/dpApi() dari api.js dan app.js.
 * ensureChartJs/chartTheme/destroyCharts sudah ada di js/app.js (Bagian 14),
 * tidak diulang di sini.
 * ============================================================
 */
function redrawCharts() { if (S.route === 'admin' && S.adm.tab === 'ringkasan' && S.dash && $('#chJenis')) drawCharts(); }
async function drawCharts() {
  const d = S.dash; if (!d || !$('#chJenis')) return;
  try { await ensureChartJs(); }
  catch (e) { $$('.chart-box').forEach(function (b) { b.innerHTML = '<p class="text-body-sm text-on-surface-variant p-4">' + esc(e.message) + '</p>'; }); return; }
  if (!$('#chJenis')) return;
  destroyCharts();
  const t = chartTheme();
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif"; Chart.defaults.color = t.text;
  const empty = function (id) { const cv = $('#' + id); if (cv) cv.parentNode.innerHTML = '<p class="text-body-sm text-on-surface-variant p-4">Belum ada data.</p>'; };
  const scales = { x: { grid: { display: false }, ticks: { color: t.text } }, y: { beginAtZero: true, ticks: { precision: 0, color: t.text }, grid: { color: t.grid } } };
  const jl = Object.keys(d.byJenis);
  if (jl.length) S.charts.jenis = new Chart($('#chJenis'), { type: 'doughnut', data: { labels: jl.map(function (x) { return JENIS_LABEL[x] || x; }), datasets: [{ data: jl.map(function (x) { return d.byJenis[x]; }), backgroundColor: t.pal, borderColor: t.surface, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: t.text, boxWidth: 12, padding: 14 } } } } });
  else empty('chJenis');
  const wl = Object.keys(d.byWilayah);
  if (wl.length) S.charts.wil = new Chart($('#chWil'), { type: 'bar', data: { labels: wl, datasets: [{ label: 'Titik parkir', data: wl.map(function (x) { return d.byWilayah[x]; }), backgroundColor: t.pal[0], borderRadius: 4, maxBarThickness: 38 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: scales } });
  else empty('chWil');
  const bl = Object.keys(d.beritaPerBulan);
  S.charts.berita = new Chart($('#chBerita'), { type: 'bar', data: { labels: bl.map(function (x) { return BULAN[+x.slice(5, 7) - 1] + ' ' + x.slice(2, 4); }), datasets: [{ label: 'Berita', data: bl.map(function (x) { return d.beritaPerBulan[x]; }), backgroundColor: t.pal[1], borderRadius: 4, maxBarThickness: 38 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: scales } });
}

const CFG_FIELDS = [
  ['namaSitus', 'Nama situs', 'text', 1], ['namaInduk', 'Instansi induk', 'text', 0],
  ['tagline', 'Tagline (judul besar beranda)', 'text', 0], ['deskripsi', 'Deskripsi singkat', 'textarea', 0],
  ['alamat', 'Alamat kantor', 'text', 0], ['telepon', 'Telepon', 'tel', 0], ['whatsapp', 'WhatsApp', 'tel', 0],
  ['emailKontak', 'Email publik (ditampilkan di situs)', 'email', 0],
  ['emailNotifikasi', 'Email penerima notifikasi pesan masuk', 'email', 0],
  ['jamLayanan', 'Jam pelayanan (satu baris per hari)', 'textarea', 0],
  ['mapsUrl', 'Tautan Google Maps kantor (https://…)', 'url', 0]
];
let FORM = null;      // konteks form modal aktif { key, id }
let FILES = {};       // berkas yang menunggu diunggah: { namaKolom: { keep, file } }

async function renderAdmin(c, p) {
  if (!S.token) {
    const t = sstore.get('portal_tok');
    if (t) {
      c.innerHTML = '<div class="min-h-[60vh] grid place-items-center"><div class="spinner spinner-lg" role="status" aria-label="Memeriksa sesi"></div></div>';
      try { const r = await dpApi('dpPing', t); if (r.success) { S.token = t; S.admin = r.data; } else { sstore.del('portal_tok'); } }
      catch (e) { sstore.del('portal_tok'); }
    }
  }
  if (S.route !== 'admin') return; // pengguna sudah berpindah halaman selagi menunggu
  if (!S.token) { document.body.classList.remove('admin-mode'); renderLogin(c); return; }
  document.body.classList.add('admin-mode');
  const def = (S.admin && S.admin.role === 'Super Admin') ? 'ringkasan' : 'dashboard';
  renderAdminShell(c, (p && p.tab) || S.adm.tab || def);
}

function renderLogin(c) {
  c.innerHTML =
    '<section class="min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-5rem)] grid place-items-center px-4 py-10">' +
    '<div class="w-full max-w-md card p-6 sm:p-8 flex flex-col gap-5" style="box-shadow:var(--shadow-1)">' +
    '<div class="flex flex-col items-center text-center gap-3">' + logoHtml(56) +
    '<div><h1 class="text-headline-md text-primary">Portal Admin</h1><p class="text-body-sm text-on-surface-variant mt-1">Satu login untuk website ' + esc(S.cfg.namaSitus || '') + ' &amp; DISPAKOT.</p></div></div>' +
    '<form class="flex flex-col gap-4" onsubmit="return doLogin(event)" novalidate>' +
    '<div><label class="label" for="lgUser">Username</label><input id="lgUser" class="input" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required></div>' +
    '<div><label class="label" for="lgPass">Password</label><div class="relative"><input id="lgPass" class="input pr-12" type="password" autocomplete="current-password" required>' +
    '<button type="button" class="icon-btn sm absolute right-1 top-1/2 -translate-y-1/2" onclick="togglePass(\'lgPass\',this)" aria-label="Tampilkan password" aria-pressed="false">' + ic('visibility') + '</button></div></div>' +
    '<div id="lgErr" class="err-text" role="alert"></div>' +
    '<button type="submit" id="lgBtn" class="btn btn-primary w-full">' + ic('login') + 'Masuk</button></form>' +
    '<button type="button" class="btn btn-ghost w-full" onclick="navigateTo(\'beranda\')">' + ic('arrow_back') + 'Kembali ke beranda</button></div></section>';
  const f = $('#lgUser'); if (f) f.focus();
}
function togglePass(id, btn) {
  const i = $('#' + id), show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(show));
  btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  btn.innerHTML = ic(show ? 'visibility_off' : 'visibility');
}
function doLogin(e) {
  e.preventDefault();
  const u = $('#lgUser').value.trim(), pw = $('#lgPass').value, box = $('#lgErr');
  box.textContent = '';
  if (!u || !pw) { box.textContent = 'Username dan password wajib diisi.'; return false; }
  const btn = $('#lgBtn'); setBusy(btn, true, 'Memeriksa…');
  dpApi('login', u, pw).then(function (res) {
    if (!res.success) { setBusy(btn, false); box.textContent = res.message; $('#lgPass').value = ''; $('#lgPass').focus(); return; }
    S.token = res.token; S.admin = { nama: res.nama, role: res.role, username: res.username };
    sstore.set('portal_tok', S.token);
    S.adm.tab = (res.role === 'Super Admin') ? 'ringkasan' : 'dashboard';
    showToast('Selamat datang', res.nama);
    navigateTo('admin', { tab: S.adm.tab }, { back: true });
    if (res.wajibGantiPassword) setTimeout(function () { dpOpenGantiPassword(true); }, 400);
  }).catch(function (er) {
    setBusy(btn, false); box.textContent = er.message;
    $('#lgPass').value = ''; $('#lgPass').focus();
  });
  return false;
}
function clearSession() {
  S.token = null; S.admin = null; S.adm.rows = {}; S.adm.dpStats = null; S.dash = null; FILES = {}; FORM = null; DP_FORM = null;
  sstore.del('portal_tok');
  document.body.classList.remove('admin-mode');
  destroyCharts();
}
function doLogout() {
  const t = S.token;
  dpApi('dpLogout', t).catch(function () { /* sesi kedaluwarsa sendiri */ });
  clearSession(); closeModal(true);
  navigateTo('beranda');
  showToast('Anda telah keluar', '');
}
function forceLogout(msg) {
  if (!S.token) return;
  clearSession(); closeModal(true);
  navigateTo('admin', {}, { back: true });
  showToast('Sesi berakhir', msg, 'warn');
}

// Peran pengguna yang sedang login (dibaca dari sesi satu login gabungan).
function myRole_() { return (S.admin && S.admin.role) || ''; }
function roleAtLeastClient_(role, min) {
  var rank = { 'Petugas Lapangan': 1, 'Administrator': 2, 'Super Admin': 3 };
  return (rank[role] || 0) >= (rank[min] || 0);
}
function admTabLabel(tab) {
  if (tab === 'ringkasan') return 'Ringkasan Website';
  if (tab === 'pesan') return 'Pesan Masuk';
  if (tab === 'pengaturan') return 'Pengaturan Situs';
  if (tab === 'dashboard') return 'Dashboard DISPAKOT';
  if (tab === 'pengaturanLaporan') return 'Pengaturan Laporan';
  if (DP_REKAP_LABEL[tab]) return DP_REKAP_LABEL[tab];
  if (S.schema && S.schema[tab]) return S.schema[tab].label;
  if (DP_SCHEMA[tab]) return DP_SCHEMA[tab].label;
  return tab;
}
// BAGIAN 15B: menu gabungan — bagian "Kelola Konten Website" & "Pengaturan Situs" hanya untuk
// Super Admin; seluruh menu DISPAKOT tampil untuk ketiga peran, kecuali Data Induk & Pengguna
// yang butuh minimal peran Administrator.
function admSideHtml() {
  const sc = S.schema || {}, cur = S.adm.tab, role = myRole_();
  const isSuper = role === 'Super Admin', isMinAdmin = roleAtLeastClient_(role, 'Administrator');
  const link = function (k, icon, label, extra) {
    return '<button type="button" class="side-link" data-tab="' + esc(k) + '" onclick="admGo(this.dataset.tab)" ' + (cur === k ? 'aria-current="page"' : '') + '>' + ic(icon) + '<span>' + esc(label) + '</span>' + (extra || '') + '</button>';
  };
  const cap = function (t) { return '<div class="px-4 pt-4 pb-1 text-label-sm text-on-surface-variant uppercase">' + t + '</div>'; };
  let html = '<div class="px-5 pt-5 pb-4 flex items-center gap-3">' + logoHtml(36) +
    '<div class="flex flex-col min-w-0"><span class="text-title-md text-primary font-bold leading-tight truncate-1">' + esc(S.cfg.namaSitus || '') + '</span><span class="text-label-sm text-on-surface-variant uppercase">Portal Admin</span></div></div>' +
    '<nav class="px-3 pb-4 flex-1 overflow-y-auto flex flex-col gap-1" aria-label="Menu admin">';
  if (isSuper) {
    html += link('ringkasan', 'space_dashboard', 'Ringkasan Website') + cap('Kelola Konten Website') +
      Object.keys(sc).map(function (k) { return link(k, sc[k].icon, sc[k].label); }).join('') +
      link('pesan', 'mark_email_unread', 'Pesan masuk', S.adm.unread > 0 ? '<span class="badge num">' + S.adm.unread + '</span>' : '') +
      link('pengaturan', 'settings', 'Pengaturan Situs');
  }
  html += cap('DISPAKOT') + link('dashboard', 'space_dashboard', 'Dashboard DISPAKOT');
  if (isMinAdmin) {
    html += cap('Data Induk') + link('jalan', 'route', 'Master Jalan') + link('lokasi', 'local_parking', 'Lokasi Parkir') + link('jukir', 'badge', 'Juru Parkir');
  }
  html += cap('Operasional') + link('setoran', 'payments', 'Setoran Harian') +
    link('karcisMasuk', 'inventory', 'Karcis Masuk') + link('karcisKeluar', 'local_shipping', 'Karcis Keluar') + link('stok', 'inventory_2', 'Stok Karcis') +
    cap('Pengawasan') + link('pengaduan', 'report', 'Pengaduan Masyarakat') + link('sanksi', 'gavel', 'Sanksi Jukir') + link('survei', 'star', 'Survei Kepuasan') +
    cap('Rekap & Laporan') + link('rekapSetoran', 'bar_chart', 'Rekap Setoran') + link('rekapKarcis', 'receipt_long', 'Rekap Karcis') +
    link('rekapPengaduan', 'summarize', 'Rekap Pengaduan') + link('rekapSanksi', 'summarize', 'Rekap Sanksi') + link('rekapSurvei', 'summarize', 'Rekap Survei') +
    cap('Lainnya') + (isMinAdmin ? link('pengguna', 'manage_accounts', 'Pengguna') : '') + link('pengaturanLaporan', 'settings', 'Pengaturan Laporan') +
    '<button type="button" class="side-link" onclick="dpOpenGantiPassword(false)">' + ic('key') + '<span>Ganti Password</span></button>' +
    '</nav>';
  return html;
}
function admRefreshSide() {
  const a = $('#admAside'); if (a) a.innerHTML = admSideHtml();
}
function admDrawer(open) {
  if (!open) { toggleDrawer(false); return; }
  $('#drawerRoot').innerHTML = '<div class="drawer-scrim" onclick="toggleDrawer(false)"></div><aside class="drawer flex flex-col" role="dialog" aria-modal="true" aria-label="Menu admin">' +
    '<div class="flex justify-end p-2"><button type="button" class="icon-btn sm" onclick="toggleDrawer(false)" aria-label="Tutup menu">' + ic('close') + '</button></div>' + admSideHtml() + '</aside>';
  const f = $('#drawerRoot .side-link'); if (f) f.focus();
}
function renderAdminShell(c, tab) {
  c.innerHTML =
    '<div class="min-h-screen lg:pl-72">' +
    '<aside id="admAside" class="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 flex-col bg-surface-container-low border-r border-outline-variant/40">' + admSideHtml() + '</aside>' +
    '<header class="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/40 flex items-center justify-between gap-3 px-4 lg:px-8">' +
    '<div class="flex items-center gap-2 min-w-0"><button type="button" class="icon-btn lg:hidden" onclick="admDrawer(true)" aria-label="Buka menu admin">' + ic('menu') + '</button>' +
    '<h1 id="admTitle" class="text-title-lg text-primary font-bold truncate-1"></h1></div>' +
    '<div class="flex items-center gap-1 sm:gap-2"><button type="button" class="icon-btn" onclick="toggleTheme()" aria-label="Ganti tema" title="Ganti tema"><span class="material-symbols-outlined theme-icon-admin" aria-hidden="true">' + (S.theme === 'dark' ? 'light_mode' : 'dark_mode') + '</span></button>' +
    '<button type="button" class="btn btn-ghost btn-sm hidden sm:inline-flex" onclick="navigateTo(\'beranda\')">' + ic('public', 'text-base') + 'Lihat situs</button>' +
    '<span class="chip chip-brand hidden md:inline-flex">' + esc(S.admin ? (S.admin.nama + ' · ' + S.admin.role) : '') + '</span>' +
    '<button type="button" class="btn btn-outline btn-sm" onclick="doLogout()">' + ic('logout', 'text-base') + 'Keluar</button></div></header>' +
    '<div id="admMain" class="p-4 lg:p-8 max-w-6xl mx-auto"></div></div>';
  admGo(tab);
}
function admGo(tab) {
  toggleDrawer(false); destroyCharts();
  S.adm.tab = tab; S.params = { tab: tab };
  admRefreshSide();
  const t = $('#admTitle'); if (t) t.textContent = admTabLabel(tab);
  window.scrollTo(0, 0);
  if (tab === 'ringkasan') admDashboard();
  else if (tab === 'pesan') admPesan();
  else if (tab === 'pengaturan') admPengaturan();
  else if (tab === 'dashboard') dpDashboard();
  else if (tab === 'pengaturanLaporan') dpPengaturan();
  else if (tab === 'stok') dpStok();
  else if (tab === 'rekapSetoran') dpRekapSetoran();
  else if (tab === 'rekapKarcis') dpRekapKarcis();
  else if (tab === 'rekapPengaduan') dpRekapPengaduan();
  else if (tab === 'rekapSanksi') dpRekapSanksi();
  else if (tab === 'rekapSurvei') dpRekapSurvei();
  else if (S.schema && S.schema[tab]) admEntity(tab);
  else if (DP_SCHEMA[tab]) dpEntity(tab);
  else dpDashboard();
}
function admLoading() {
  return '<div class="flex flex-col gap-4" aria-busy="true" aria-label="Memuat data"><div class="skeleton h-10 w-1/2"></div><div class="grid grid-cols-2 md:grid-cols-3 gap-4">' +
    [1, 2, 3].map(function () { return '<div class="skeleton h-24"></div>'; }).join('') + '</div><div class="skeleton h-64"></div></div>';
}
function errorCard(e, retry) {
  return '<div class="card p-8 text-center flex flex-col items-center gap-3"><div class="kpi-icon" style="background:rgb(var(--error-container));color:rgb(var(--on-error-container))">' + ic('error') + '</div>' +
    '<h2 class="text-title-lg text-primary">Data tidak dapat dimuat</h2><p class="text-body-md text-on-surface-variant max-w-md">' + esc(e.message || e) + '</p>' +
    '<button type="button" class="btn btn-outline" onclick="' + retry + '">' + ic('refresh') + 'Coba lagi</button></div>';
}

// ════════════════════════════════════════════════════════
// BAGIAN 16: PORTAL ADMIN — RINGKASAN & GRAFIK
// ════════════════════════════════════════════════════════
async function admDashboard() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const res = await adminApi('adminDashboard');
    if (S.adm.tab !== 'ringkasan' || !$('#admMain')) return;
    S.dash = res.data; S.adm.unread = res.data.counts.PesanBaru; admRefreshSide();
    drawDashboard(res.data);
  } catch (e) { if ($('#admMain') && S.adm.tab === 'ringkasan') $('#admMain').innerHTML = errorCard(e, 'admGo(\'ringkasan\')'); }
}
function drawDashboard(d) {
  const k = d.counts;
  const kpis = [
    ['local_parking', 'Titik parkir', k.LokasiParkir, 'lokasi'], ['newspaper', 'Berita', k.Berita, 'Berita'],
    ['gavel', 'Regulasi', k.Regulasi, 'Regulasi'], ['support_agent', 'Pelayanan', k.Pelayanan, 'Pelayanan'],
    ['groups', 'Pejabat & pegawai', k.Pegawai, 'PegawaiUPTD'], ['mark_email_unread', 'Pesan belum ditangani', k.PesanBaru, 'pesan']
  ];
  const desc = function (o) { return Object.keys(o).map(function (x) { return x + ' ' + o[x]; }).join(', ') || 'belum ada data'; };
  $('#admMain').innerHTML =
    '<div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">' + kpis.map(function (x) {
      return '<button type="button" class="card card-hover p-4 flex items-center gap-3 text-left" data-tab="' + x[3] + '" onclick="admGo(this.dataset.tab)"><div class="kpi-icon">' + ic(x[0]) + '</div>' +
        '<div class="min-w-0"><div class="text-headline-md text-primary font-extrabold num leading-none">' + esc(fmtNum(x[2])) + '</div><div class="text-label-md text-on-surface-variant mt-1">' + esc(x[1]) + '</div></div></button>';
    }).join('') + '</div>' +
    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">' +
    '<div class="lg:col-span-2 insight p-6"><h2 class="text-title-lg font-bold flex items-center gap-2" style="color:rgb(var(--on-brand))">' + ic('auto_awesome') + 'Analisis otomatis</h2>' +
    '<ul class="mt-4 flex flex-col gap-3">' + d.insights.map(function (t) { return '<li class="flex gap-3 text-body-md" style="color:rgb(var(--on-brand))">' + ic('arrow_right', 'text-xl opacity-80') + '<span>' + esc(t) + '</span></li>'; }).join('') + '</ul></div>' +
    '<div class="card p-6 flex flex-col gap-3"><h2 class="text-title-lg text-primary font-bold">Pintasan</h2>' +
    '<button type="button" class="btn btn-primary" onclick="admGo(\'Berita\');setTimeout(admAdd,350)">' + ic('add') + 'Tulis berita</button>' +
    '<button type="button" class="btn btn-outline" onclick="admGo(\'lokasi\');setTimeout(dpAdd,350)">' + ic('add_location') + 'Tambah titik parkir</button>' +
    '<button type="button" class="btn btn-outline" onclick="admGo(\'pesan\')">' + ic('mark_email_unread') + 'Buka pesan masuk</button>' +
    (d.kuotaEmail != null ? '<p class="help mt-1">Sisa kuota email hari ini: <strong class="num">' + esc(d.kuotaEmail) + '</strong></p>' : '') + '</div></div>' +
    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Titik parkir per jenis</h2><div class="chart-box relative h-64"><canvas id="chJenis" role="img" aria-label="Diagram titik parkir per jenis: ' + esc(desc(d.byJenis)) + '"></canvas></div></div>' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Titik parkir per wilayah</h2><div class="chart-box relative h-64"><canvas id="chWil" role="img" aria-label="Diagram titik parkir per wilayah: ' + esc(desc(d.byWilayah)) + '"></canvas></div></div>' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Berita 6 bulan terakhir</h2><div class="chart-box relative h-64"><canvas id="chBerita" role="img" aria-label="Diagram jumlah berita per bulan: ' + esc(desc(d.beritaPerBulan)) + '"></canvas></div></div></div>';
  drawCharts();
}


// ════════════════════════════════════════════════════════
// BAGIAN 17: PORTAL ADMIN — KELOLA KONTEN (CRUD generik dari SCHEMA)
// ════════════════════════════════════════════════════════
async function admEntity(key) {
  const sc = S.schema[key], m = $('#admMain');
  m.innerHTML =
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="relative flex-1 min-w-[220px] max-w-md"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-outline">' + ic('search') + '</span>' +
    '<label class="sr-only" for="admQ">Cari ' + esc(sc.label) + '</label><input id="admQ" class="input pl-11" type="search" placeholder="Cari di ' + esc(sc.label) + '…" value="' + esc(S.adm.q[key] || '') + '" oninput="admSearch()" autocomplete="off"></div>' +
    '<button type="button" class="btn btn-primary" onclick="admAdd()">' + ic('add') + 'Tambah data</button></div><div id="admList">' + admLoading() + '</div>';
  try {
    const res = await adminApi('adminList', key);
    S.adm.rows[key] = res.data;
    if (S.adm.tab === key && $('#admList')) drawEntity(key);
  } catch (e) { if (S.adm.tab === key && $('#admList')) $('#admList').innerHTML = errorCard(e, 'admGo(\'' + key + '\')'); }
}
function admSearch() { S.adm.q[S.adm.tab] = $('#admQ').value; drawEntity(S.adm.tab); }
function admAdd() { if (S.schema && S.schema[S.adm.tab]) openForm(S.adm.tab, ''); }
function admEdit(id) { openForm(S.adm.tab, id); }

function cellHtml(fd, v) {
  if (!fd) return esc(v);
  if (fd.t === 'image') return v ? '<button type="button" data-id="' + esc(v) + '" data-t="' + esc(fd.l) + '" onclick="previewImage(this.dataset.id,this.dataset.t)" aria-label="Lihat ' + esc(fd.l) + '">' + imgTag(v, fd.l, 'thumb', 120) + '</button>' : '<span class="text-outline">—</span>';
  if (fd.t === 'file') return v ? '<button type="button" class="btn btn-ghost btn-sm" data-id="' + esc(v) + '" data-t="' + esc(fd.l) + '" onclick="previewFile(this.dataset.id,this.dataset.t)">' + ic('visibility', 'text-base') + 'Lihat</button>' : '<span class="chip chip-warn">Belum ada</span>';
  if (fd.t === 'date') return esc(fmtTgl(v));
  if (fd.t === 'number') return '<span class="num">' + esc(/^Tarif/.test(fd.k) ? fmtRp(v) : fmtNum(v)) + '</span>';
  if (fd.k === 'Status') return statusChip(v);
  if (fd.k === 'Jenis' && JENIS_LABEL[v]) return '<span class="chip chip-neu">' + esc(v) + '</span>';
  return '<span class="clamp-2 max-w-xs inline-block">' + esc(v) + '</span>';
}
function drawEntity(key) {
  const sc = S.schema[key], all = S.adm.rows[key] || [], q = (S.adm.q[key] || '').trim().toLowerCase();
  const has = function (k) { return sc.fields.some(function (f) { return f.k === k; }); };
  let rows = all.filter(function (r) { return !q || sc.fields.some(function (f) { return f.t !== 'image' && f.t !== 'file' && String(r[f.k] == null ? '' : r[f.k]).toLowerCase().indexOf(q) >= 0; }); });
  if (has('Tanggal')) rows = rows.slice().sort(byTglDesc); else if (has('Urutan')) rows = rows.slice().sort(byUrut);
  const box = $('#admList');
  if (!rows.length) {
    box.innerHTML = emptyState(all.length ? 'search_off' : sc.icon, all.length ? 'Data tidak ditemukan' : 'Belum ada data ' + sc.label, all.length ? 'Coba kata kunci lain.' : 'Klik “Tambah data” untuk mulai mengisi.');
    return;
  }
  const fdOf = function (k) { return sc.fields.filter(function (f) { return f.k === k; })[0]; };
  const actions = function (r) {
    return '<div class="flex gap-1 justify-end"><button type="button" class="icon-btn sm" data-id="' + esc(r.ID) + '" onclick="admEdit(this.dataset.id)" aria-label="Ubah">' + ic('edit') + '</button>' +
      '<button type="button" class="icon-btn sm" style="color:rgb(var(--error))" data-id="' + esc(r.ID) + '" onclick="admDel(this.dataset.id)" aria-label="Hapus">' + ic('delete') + '</button></div>';
  };
  box.innerHTML =
    '<p class="text-body-sm text-on-surface-variant mb-3" aria-live="polite">' + rows.length + ' data</p>' +
    '<div class="card tbl-wrap hidden md:block"><table class="tbl"><thead><tr>' + sc.list.map(function (k) { return '<th>' + esc((fdOf(k) || {}).l || k) + '</th>'; }).join('') + '<th><span class="sr-only">Aksi</span></th></tr></thead><tbody>' +
    rows.map(function (r) { return '<tr>' + sc.list.map(function (k) { return '<td>' + cellHtml(fdOf(k), r[k]) + '</td>'; }).join('') + '<td>' + actions(r) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="md:hidden flex flex-col gap-3">' + rows.map(function (r) {
      const img = sc.list.map(fdOf).filter(function (f) { return f && f.t === 'image' && r[f.k]; })[0];
      const rest = sc.list.slice(1).map(fdOf).filter(function (f) { return f && f.t !== 'image'; });
      return '<div class="card p-4 flex gap-3">' + (img ? cellHtml(img, r[img.k]) : '') + '<div class="flex-1 min-w-0 flex flex-col gap-2"><div class="text-title-md text-primary font-bold clamp-2">' + esc(r[sc.list[0]]) + '</div>' +
        '<div class="flex flex-wrap gap-x-3 gap-y-1 items-center text-body-sm text-on-surface-variant">' + rest.map(function (f) { return cellHtml(f, r[f.k]); }).join('') + '</div>' + actions(r) + '</div></div>';
    }).join('') + '</div>';
}

function fieldHtml(fd, val, rows) {
  const id = 'f_' + fd.k, req = fd.req ? 'required' : '';
  const lab = '<label class="label" for="' + id + '">' + esc(fd.l) + (fd.req ? '<span class="req">*</span>' : '') + '</label>';
  const v = (val == null) ? '' : val;
  switch (fd.t) {
    case 'textarea': return '<div class="md:col-span-2">' + lab + '<textarea id="' + id + '" name="' + esc(fd.k) + '" class="input" maxlength="5000" ' + req + '>' + esc(v) + '</textarea></div>';
    case 'select': return '<div>' + lab + '<div class="select-wrap"><select id="' + id + '" name="' + esc(fd.k) + '" class="input" ' + req + '>' + (fd.req ? '' : '<option value="">—</option>') +
      fd.opt.map(function (o) { return '<option value="' + esc(o) + '"' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + ic('expand_more') + '</div></div>';
    case 'number': return '<div>' + lab + '<input id="' + id + '" name="' + esc(fd.k) + '" class="input" type="number" min="0" step="any" inputmode="decimal" value="' + esc(v) + '" ' + req + '></div>';
    case 'date': return '<div>' + lab + '<input id="' + id + '" name="' + esc(fd.k) + '" class="input" type="date" value="' + esc(v || (fd.k === 'Tanggal' ? new Date().toISOString().slice(0, 10) : '')) + '" ' + req + '></div>';
    case 'image': case 'file': return fileFieldHtml(fd, v);
    default: {
      const sug = fd.sug ? uniq((rows || []).map(function (r) { return r[fd.k]; })).sort() : [];
      return '<div>' + lab + '<input id="' + id + '" name="' + esc(fd.k) + '" class="input" type="text" maxlength="300" value="' + esc(v) + '" ' + req + (sug.length ? ' list="dl_' + esc(fd.k) + '"' : '') + ' autocomplete="off">' +
        (sug.length ? '<datalist id="dl_' + esc(fd.k) + '">' + sug.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' : '') + '</div>';
    }
  }
}
function filePreviewHtml(kind, val, label) {
  if (!val) return ic(kind === 'image' ? 'image' : 'description', 'text-4xl text-outline');
  if (kind === 'image') return imgTag(val, label, 'w-full h-full object-cover', 240);
  return '<button type="button" class="flex flex-col items-center gap-1 text-primary text-label-md" data-id="' + esc(val) + '" data-t="' + esc(label) + '" onclick="previewFile(this.dataset.id,this.dataset.t)">' + ic('description', 'text-4xl') + 'Lihat berkas</button>';
}
function fileFieldHtml(fd, val) {
  const kind = fd.t === 'image' ? 'image' : 'file';
  FILES[fd.k] = { keep: val || '', file: null };
  const accept = kind === 'image' ? 'image/jpeg,image/png,image/webp' : '.pdf,.doc,.docx,.xls,.xlsx,application/pdf';
  const hint = kind === 'image' ? 'JPG / PNG / WebP — otomatis dikecilkan' : 'PDF, Word, atau Excel — maks 50 MB';
  return '<div class="md:col-span-2"><span class="label" id="lb_' + fd.k + '">' + esc(fd.l) + '</span><div class="flex flex-col sm:flex-row gap-3 items-start">' +
    '<div id="fpv_' + fd.k + '" class="w-28 h-28 rounded-lg overflow-hidden bg-surface-container grid place-items-center shrink-0">' + filePreviewHtml(kind, val, fd.l) + '</div>' +
    '<div class="flex-1 min-w-0 flex flex-col gap-2 w-full"><label class="dropzone relative" for="f_' + fd.k + '">' +
    '<input id="f_' + fd.k + '" type="file" accept="' + accept + '" data-k="' + esc(fd.k) + '" data-kind="' + kind + '" data-l="' + esc(fd.l) + '" onchange="onPickFile(this)" aria-labelledby="lb_' + fd.k + '">' +
    ic('upload_file', 'text-3xl text-primary') + '<span class="min-w-0"><span class="font-semibold text-primary block truncate-1" id="fpn_' + fd.k + '">' + (val ? 'Ganti berkas…' : 'Pilih berkas…') + '</span><span class="help block">' + hint + '</span></span></label>' +
    '<button type="button" id="fpr_' + fd.k + '" class="btn btn-ghost btn-sm self-start" data-k="' + esc(fd.k) + '" data-kind="' + kind + '" data-l="' + esc(fd.l) + '" onclick="clearPick(this)" ' + (val ? '' : 'hidden') + '>' + ic('delete', 'text-base') + 'Hapus berkas</button></div></div></div>';
}
function onPickFile(input) {
  const k = input.dataset.k, kind = input.dataset.kind, file = input.files && input.files[0];
  if (!file) return;
  const okType = kind === 'image' ? /^image\/(jpeg|png|webp)$/.test(file.type) : /\.(pdf|docx?|xlsx?)$/i.test(file.name);
  if (!okType) { showToast('Format tidak didukung', kind === 'image' ? 'Gunakan JPG, PNG, atau WebP.' : 'Gunakan PDF, Word, atau Excel.', 'err'); input.value = ''; return; }
  if (file.size > (kind === 'image' ? 20 : 50) * 1024 * 1024) { showToast('Berkas terlalu besar', kind === 'image' ? 'Maksimal 20 MB.' : 'Maksimal 50 MB.', 'err'); input.value = ''; return; }
  FILES[k] = { keep: (FILES[k] || {}).keep || '', file: file };
  $('#fpn_' + k).textContent = file.name;
  $('#fpr_' + k).hidden = false;
  $('#fpv_' + k).innerHTML = kind === 'image' ? '<img src="' + URL.createObjectURL(file) + '" alt="Pratinjau" class="w-full h-full object-cover">' : ic('description', 'text-4xl text-primary');
}
function clearPick(btn) {
  const k = btn.dataset.k, kind = btn.dataset.kind;
  FILES[k] = { keep: '', file: null };
  $('#f_' + k).value = '';
  $('#fpn_' + k).textContent = 'Pilih berkas…';
  $('#fpv_' + k).innerHTML = filePreviewHtml(kind, '', btn.dataset.l);
  btn.hidden = true;
}
function compressImage(file) {
  return new Promise(function (resolve) {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      const r = Math.min(1, 1600 / Math.max(img.width, img.height));
      const w = Math.round(img.width * r), h = Math.round(img.height * r);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
      cv.toBlob(function (b) {
        if (!b || (r === 1 && b.size >= file.size)) return resolve(file);
        resolve(new File([b], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
function readB64(blob) {
  return new Promise(function (resolve, reject) {
    const fr = new FileReader();
    fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
    fr.onerror = function () { reject(new Error('Berkas tidak dapat dibaca.')); };
    fr.readAsDataURL(blob);
  });
}
async function uploadPending(file, kind) {
  const blob = kind === 'image' ? await compressImage(file) : file;
  const maxMB = kind === 'image' ? 6 : 50;
  if (blob.size > maxMB * 1024 * 1024) throw new Error('Ukuran berkas setelah diproses masih melebihi ' + maxMB + ' MB.');
  const b64 = await readB64(blob);
  const res = await adminApi('adminUpload', b64, blob.name || file.name, blob.type || file.type, kind);
  return res.data.id;
}
function setBusyLabel(btn, text) { const s = btn && btn.querySelector('span:last-child'); if (s) s.textContent = text; }

function openForm(key, id) {
  const sc = S.schema[key], rows = S.adm.rows[key] || [];
  const rec = id ? rows.filter(function (r) { return r.ID === id; })[0] : null;
  if (id && !rec) { showToast('Data tidak ditemukan', 'Muat ulang halaman ini.', 'err'); return; }
  FILES = {};
  const html = sc.fields.map(function (fd) { return fieldHtml(fd, rec ? rec[fd.k] : '', rows); }).join('');
  openModal({
    title: (id ? 'Ubah ' : 'Tambah ') + sc.label, size: 'lg',
    body: '<form id="admForm" onsubmit="return saveForm(event)" novalidate class="grid grid-cols-1 md:grid-cols-2 gap-4">' + html + '</form>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="submit" form="admForm" class="btn btn-primary" id="frmSave">' + ic('save') + 'Simpan</button>',
    onClose: function () { FORM = null; }
  });
  FORM = { key: key, id: id || '' }; // dipasang SETELAH openModal (yang menutup modal lama & mereset FORM)
}
async function saveForm(e) {
  e.preventDefault();
  if (!FORM) return false;
  const form = $('#admForm');
  if (!form.checkValidity()) { form.reportValidity(); return false; }
  const F = FORM, sc = S.schema[F.key], rec = {}, btn = $('#frmSave');
  if (F.id) rec.ID = F.id;
  sc.fields.forEach(function (fd) { if (fd.t !== 'image' && fd.t !== 'file') rec[fd.k] = form.elements[fd.k].value; });
  setBusy(btn, true, 'Menyimpan…');
  try {
    const fileFields = sc.fields.filter(function (fd) { return fd.t === 'image' || fd.t === 'file'; });
    for (let i = 0; i < fileFields.length; i++) {
      const fd = fileFields[i], st = FILES[fd.k] || { keep: '', file: null };
      if (st.file) { setBusyLabel(btn, 'Mengunggah ' + fd.l + '…'); rec[fd.k] = await uploadPending(st.file, fd.t === 'image' ? 'image' : 'file'); }
      else rec[fd.k] = st.keep || '';
    }
    setBusyLabel(btn, 'Menyimpan…');
    const res = await adminApi('adminSave', F.key, rec);
    S.dirty = true;
    closeModal();
    showToast('Berhasil', res.message);
    if (S.adm.tab === F.key) admEntity(F.key);
  } catch (er) {
    if (S.token) { setBusy(btn, false); showToast('Gagal menyimpan', er.message, 'err'); }
  }
  return false;
}
function admDel(id) {
  const key = S.adm.tab, rec = (S.adm.rows[key] || []).filter(function (r) { return r.ID === id; })[0];
  const name = rec ? rec[S.schema[key].list[0]] : 'ini';
  openModal({
    title: 'Hapus data?', size: 'sm',
    body: '<p class="text-body-md">Data <strong>' + esc(name) + '</strong> akan dihapus permanen dan tidak lagi tampil di website.</p>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="button" class="btn btn-danger" id="delOk" data-id="' + esc(id) + '" data-key="' + esc(key) + '" onclick="admDelOk(this)">' + ic('delete') + 'Hapus</button>'
  });
}
async function admDelOk(btn) {
  const id = btn.dataset.id, key = btn.dataset.key;
  setBusy(btn, true, 'Menghapus…');
  try {
    const res = await adminApi('adminDelete', key, id);
    S.dirty = true; closeModal(); showToast('Berhasil', res.message);
    if (key === 'PesanKontak') admPesan(); else if (S.adm.tab === key) admEntity(key);
  } catch (er) { if (S.token) { setBusy(btn, false); showToast('Gagal menghapus', er.message, 'err'); } }
}

// ════════════════════════════════════════════════════════
// BAGIAN 18: PORTAL ADMIN — PESAN MASUK
// ════════════════════════════════════════════════════════
async function admPesan() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const res = await adminApi('adminList', 'PesanKontak');
    S.adm.rows.PesanKontak = res.data;
    if (S.adm.tab !== 'pesan' || !$('#admMain')) return;
    S.adm.unread = res.data.filter(function (r) { return r.Status !== 'Selesai'; }).length; admRefreshSide();
    drawPesan();
  } catch (e) { if (S.adm.tab === 'pesan' && $('#admMain')) $('#admMain').innerHTML = errorCard(e, 'admGo(\'pesan\')'); }
}
function pesanFilter(f) { S.adm.pesanFilter = f; drawPesan(); }
function drawPesan() {
  const all = S.adm.rows.PesanKontak || [], f = S.adm.pesanFilter;
  const rows = all.filter(function (r) { return f === 'semua' || (f === 'Baru' ? r.Status !== 'Selesai' : r.Status === 'Selesai'); });
  const chip = function (k, l) { return '<button type="button" class="chip ' + (f === k ? 'chip-brand' : 'chip-neu') + ' min-h-[32px] px-3" data-k="' + k + '" onclick="pesanFilter(this.dataset.k)" aria-pressed="' + (f === k) + '">' + l + '</button>'; };
  $('#admMain').innerHTML =
    '<div class="flex flex-wrap items-center gap-2 mb-5" role="group" aria-label="Filter status">' + chip('semua', 'Semua (' + all.length + ')') + chip('Baru', 'Belum ditangani') + chip('Selesai', 'Selesai') + '</div>' +
    (rows.length ? '<div class="flex flex-col gap-4">' + rows.map(function (r) {
      const done = r.Status === 'Selesai', k = String(r.Kontak || '');
      const isMail = k.indexOf('@') > 0;
      const reply = isMail ? '<a class="btn btn-outline btn-sm" href="mailto:' + esc(k) + '">' + ic('reply', 'text-base') + 'Balas email</a>' : '<a class="btn btn-outline btn-sm" href="' + esc(waLink(k)) + '" target="_blank" rel="noopener">' + ic('chat', 'text-base') + 'WhatsApp</a>';
      return '<article class="card p-5 flex flex-col gap-3"><div class="flex flex-wrap items-start justify-between gap-2"><div><h3 class="text-title-md text-primary font-bold">' + esc(r.Nama) + '</h3>' +
        '<p class="text-body-sm text-on-surface-variant">' + esc(r.Kontak) + ' · <span class="num">' + esc(r.Tanggal) + '</span></p></div>' +
        (done ? '<span class="chip chip-ok">' + ic('check_circle', 'fill-1') + 'Selesai</span>' : '<span class="chip chip-warn">' + ic('mark_email_unread') + 'Baru</span>') + '</div>' +
        '<p class="text-body-md pre-line measure">' + esc(r.Pesan) + '</p>' +
        '<div class="flex flex-wrap gap-2">' + reply +
        '<button type="button" class="btn btn-ghost btn-sm" data-id="' + esc(r.ID) + '" data-s="' + (done ? 'Baru' : 'Selesai') + '" onclick="setPesan(this)">' + ic(done ? 'undo' : 'done_all', 'text-base') + (done ? 'Tandai belum ditangani' : 'Tandai selesai') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" style="color:rgb(var(--error))" data-id="' + esc(r.ID) + '" onclick="admDelPesan(this.dataset.id)">' + ic('delete', 'text-base') + 'Hapus</button></div></article>';
    }).join('') + '</div>' : emptyState('inbox', 'Tidak ada pesan', f === 'semua' ? 'Pesan dari formulir Kontak Kami akan muncul di sini.' : 'Tidak ada pesan pada filter ini.'));
}
async function setPesan(btn) {
  const id = btn.dataset.id, s = btn.dataset.s;
  setBusy(btn, true, 'Menyimpan…');
  try {
    await adminApi('adminSetPesanStatus', id, s);
    const r = (S.adm.rows.PesanKontak || []).filter(function (x) { return x.ID === id; })[0]; if (r) r.Status = s;
    S.adm.unread = S.adm.rows.PesanKontak.filter(function (x) { return x.Status !== 'Selesai'; }).length;
    admRefreshSide(); drawPesan();
  } catch (er) { if (S.token) { setBusy(btn, false); showToast('Gagal memperbarui', er.message, 'err'); } }
}
function admDelPesan(id) {
  const r = (S.adm.rows.PesanKontak || []).filter(function (x) { return x.ID === id; })[0];
  openModal({
    title: 'Hapus pesan?', size: 'sm', body: '<p class="text-body-md">Pesan dari <strong>' + esc(r ? r.Nama : '') + '</strong> akan dihapus permanen.</p>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="button" class="btn btn-danger" data-id="' + esc(id) + '" data-key="PesanKontak" onclick="admDelOk(this)">' + ic('delete') + 'Hapus</button>'
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 19: PORTAL ADMIN — PENGATURAN
// ════════════════════════════════════════════════════════
async function admPengaturan() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const res = await adminApi('adminGetSettings');
    if (S.adm.tab !== 'pengaturan' || !$('#admMain')) return;
    S.adm.settings = res.data; drawPengaturan();
  } catch (e) { if (S.adm.tab === 'pengaturan' && $('#admMain')) $('#admMain').innerHTML = errorCard(e, 'admGo(\'pengaturan\')'); }
}
function drawPengaturan() {
  const st = S.adm.settings, cfg = st.config;
  FILES = {};
  const inp = function (f) {
    const k = f[0], id = 'c_' + k;
    const lab = '<label class="label" for="' + id + '">' + esc(f[1]) + (f[3] ? '<span class="req">*</span>' : '') + '</label>';
    if (f[2] === 'textarea') return '<div class="md:col-span-2">' + lab + '<textarea id="' + id + '" name="' + k + '" class="input" style="min-height:96px" maxlength="1000">' + esc(cfg[k] || '') + '</textarea></div>';
    return '<div>' + lab + '<input id="' + id + '" name="' + k + '" class="input" type="' + f[2] + '" maxlength="300" value="' + esc(cfg[k] || '') + '" ' + (f[3] ? 'required' : '') + '></div>';
  };
  const link = function (label, url, icon) { return url ? '<a class="btn btn-outline btn-sm" href="' + esc(url) + '" target="_blank" rel="noopener">' + ic(icon, 'text-base') + esc(label) + '</a>' : ''; };
  $('#admMain').innerHTML =
    '<div class="flex flex-col gap-6">' +
    '<form id="cfgForm" class="card p-6 flex flex-col gap-5" onsubmit="return saveSettings(event)" novalidate><div><h2 class="text-title-lg text-primary font-bold">Identitas & kontak situs</h2><p class="text-body-sm text-on-surface-variant">Tampil di beranda, footer, dan halaman Kontak.</p></div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' + CFG_FIELDS.map(inp).join('') + fileFieldHtml({ k: 'logo', l: 'Logo situs (kosongkan untuk logo bawaan)', t: 'image' }, cfg.logo) + fileFieldHtml({ k: 'heroFoto', l: 'Foto latar beranda (opsional)', t: 'image' }, cfg.heroFoto) + '</div>' +
    '<div><button type="submit" class="btn btn-primary" id="cfgSave">' + ic('save') + 'Simpan pengaturan</button></div></form>' +

    '<div class="card p-6 flex flex-col gap-4"><div><h2 class="text-title-lg text-primary font-bold">Penyimpanan data</h2><p class="text-body-sm text-on-surface-variant">Seluruh konten tersimpan di Google Sheets dan berkas di Google Drive milik pemilik skrip.</p></div>' +
    '<div class="flex flex-wrap gap-2">' + link('Buka Spreadsheet', st.storage.spreadsheet, 'table_chart') + link('Folder utama', st.storage.folderUtama, 'folder') + link('Folder foto', st.storage.folderFoto, 'photo_library') + link('Folder dokumen', st.storage.folderDokumen, 'folder_open') + '</div></div>' +

    '<div class="card p-6 flex flex-col gap-3"><div><h2 class="text-title-lg text-primary font-bold">Akun & password</h2><p class="text-body-sm text-on-surface-variant">Akun Anda: ' + esc(S.admin ? (S.admin.username + ' (' + S.admin.role + ')') : '') + '. Satu login dipakai untuk website & DISPAKOT — kelola seluruh akun (Super Admin / Administrator / Petugas Lapangan) di menu <strong>Pengguna</strong>.</p></div>' +
    '<div class="flex flex-wrap gap-2"><button type="button" class="btn btn-outline" onclick="dpOpenGantiPassword(false)">' + ic('key', 'text-base') + 'Ganti password saya</button>' +
    '<button type="button" class="btn btn-outline" onclick="admGo(\'pengguna\')">' + ic('manage_accounts', 'text-base') + 'Kelola Pengguna</button></div></div></div>';
}
async function saveSettings(e) {
  e.preventDefault();
  const form = $('#cfgForm');
  if (!form.checkValidity()) { form.reportValidity(); return false; }
  const btn = $('#cfgSave'), obj = {};
  CFG_FIELDS.forEach(function (f) { obj[f[0]] = form.elements[f[0]].value; });
  setBusy(btn, true, 'Menyimpan…');
  try {
    const ff = ['logo', 'heroFoto'];
    for (let i = 0; i < ff.length; i++) {
      const st = FILES[ff[i]] || { keep: '', file: null };
      if (st.file) { setBusyLabel(btn, 'Mengunggah gambar…'); obj[ff[i]] = await uploadPending(st.file, 'image'); }
      else obj[ff[i]] = st.keep || '';
    }
    const res = await adminApi('adminSaveSettings', obj);
    S.cfg = Object.assign({}, S.cfg, res.data);
    S.dirty = true; store.del(BUNDLE_KEY);
    renderChrome(); admRefreshSide();
    showToast('Berhasil', res.message);
    admPengaturan();
  } catch (er) { if (S.token) { setBusy(btn, false); showToast('Gagal menyimpan', er.message, 'err'); } }
  return false;
}