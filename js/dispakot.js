'use strict';
/**
 * ============================================================
 * PORTAL DISPAKOT — diporting dari DispakotApp.html.
 * dpApi/dpAuthApi SUDAH didefinisikan di js/api.js (versi fetch), jadi definisi
 * aslinya (berbasis google.script.run) TIDAK disalin ke sini.
 * ============================================================
 */

/**
 * ============================================================
 * PORTAL DISPAKOT — Frontend (DispakotApp.html)
 * Disertakan setelah JavaScript.html (lihat Index.html) sehingga semua
 * helper global dari file itu (ic, esc, $, $$, openModal, closeModal,
 * showToast, setBusy, fmtTgl, fmtNum, fmtRp, cellHtml, fieldHtml,
 * compressImage, readB64, admLoading, errorCard, emptyState,
 * ensureChartJs, chartTheme, logoHtml, toggleDrawer, toggleTheme,
 * navigateTo, dll) bisa langsung dipakai di sini tanpa diulang.
 *
 * Sejak satu login & satu portal admin digabung, modul DISPAKOT ini TIDAK LAGI punya
 * login/sesi/shell sendiri — semuanya memakai S.token, S.admin & shell Portal Admin
 * (admSideHtml/admGo/dll) dari JavaScript.html. Modul ini hanya menyediakan skema data
 * (DP_SCHEMA), pemanggil backend (dpApi/dpAuthApi), dan layar-layar entitas DISPAKOT yang
 * dipasang ke dalam shell gabungan tersebut lewat admGo().
 * ============================================================
 */
'use strict';

let DP_FORM = null;

function FD(k, l, t, x) { return Object.assign({ k: k, l: l, t: t }, x || {}); }

// ════════════════════════════════════════════════════════
// SKEMA ENTITAS (dipetakan ke fungsi backend yang sudah ada di Kode.gs —
// bukan CRUD generik seperti SCHEMA website, karena tiap entitas DISPAKOT
// punya logika sendiri di server: getXList/saveX/deleteX)
// ════════════════════════════════════════════════════════
const DP_SCHEMA = {
  jalan: {
    label: 'Master Jalan', icon: 'route', idField: 'ID_Jalan',
    listFn: 'getJalanList', saveFn: 'saveJalan', delFn: 'deleteJalan',
    list: ['Nama_Jalan', 'Kecamatan', 'Kelurahan', 'Panjang_M'],
    fields: [
      FD('Nama_Jalan', 'Nama Jalan', 'text', { req: 1 }),
      FD('Kecamatan', 'Kecamatan', 'text', { req: 1, sug: 1 }),
      FD('Kelurahan', 'Kelurahan', 'text', { req: 1, sug: 1 }),
      FD('Panjang_M', 'Panjang (meter)', 'number'),
      FD('Keterangan', 'Keterangan', 'textarea')
    ]
  },
  lokasi: {
    label: 'Lokasi Parkir', icon: 'local_parking', idField: 'ID_Lokasi',
    listFn: 'getLokasiList', saveFn: 'saveLokasi', delFn: 'deleteLokasi', deps: ['jalan'],
    list: ['Nama_Lokasi', 'Nama_Jalan', 'Sisi_Jalan', 'Jenis_Kendaraan', 'Status'],
    fields: [
      FD('Nama_Lokasi', 'Nama Lokasi', 'text', { req: 1 }),
      { k: 'ID_Jalan', l: 'Ruas Jalan', t: 'fk', req: 1, rel: 'jalan', relKey: 'ID_Jalan', relLabel: 'Nama_Jalan' },
      FD('Sisi_Jalan', 'Sisi Jalan', 'select', { opt: ['Kiri', 'Kanan', 'Kedua Sisi'] }),
      FD('Jenis_Kendaraan', 'Jenis Kendaraan', 'select', { opt: ['Motor', 'Mobil', 'Motor & Mobil'] }),
      FD('Kapasitas', 'Kapasitas', 'number'),
      FD('Tarif_Motor', 'Tarif Motor (Rp)', 'number'),
      FD('Tarif_Mobil', 'Tarif Mobil (Rp)', 'number'),
      FD('Status', 'Status operasional', 'select', { req: 1, opt: ['Aktif', 'Nonaktif'] }),
      FD('Latitude', 'Latitude', 'text'), FD('Longitude', 'Longitude', 'text'),
      FD('Jenis', 'Jenis fasilitas (untuk tampilan publik di website)', 'select', { opt: ['TJU', 'TKP', 'Gedung'] }),
      FD('Foto', 'Foto lokasi (untuk tampilan publik di website)', 'image')
    ]
  },
  jukir: {
    label: 'Juru Parkir', icon: 'badge', idField: 'ID_Jukir',
    listFn: 'getJukirList', saveFn: 'saveJukir', delFn: 'deleteJukir', deps: ['lokasi'],
    list: ['Nama', 'No_Registrasi', 'Nama_Lokasi', 'Status_Aktif', 'Masa_Berlaku'],
    rowActions: function (r) {
      return '<button type="button" class="icon-btn sm" data-id="' + esc(r.ID_Jukir) + '" onclick="dpCetakKartu(this.dataset.id)" aria-label="Cetak kartu" title="Cetak Kartu Tanda Anggota">' + ic('badge') + '</button>';
    },
    fields: [
      FD('Nama', 'Nama Lengkap', 'text', { req: 1 }),
      FD('Alamat', 'Alamat', 'textarea', { req: 1 }),
      { k: 'ID_Lokasi', l: 'Lokasi Tugas', t: 'fk', req: 1, rel: 'lokasi', relKey: 'ID_Lokasi', relLabel: 'Nama_Lokasi' },
      FD('Tanggal_Bergabung', 'Tanggal Bergabung', 'date', { req: 1 }),
      FD('Masa_Berlaku', 'Masa Berlaku Kartu s.d.', 'date', { req: 1 }),
      FD('Status_Aktif', 'Status', 'select', { req: 1, opt: ['Aktif', 'Nonaktif'] }),
      FD('Foto', 'Foto', 'image'),
      { k: 'No_Registrasi', l: 'No. Registrasi / No. Anggota', t: 'readonly', auto: '(dibuat otomatis saat disimpan)' }
    ]
  },
  setoran: {
    label: 'Setoran Harian', icon: 'payments', idField: 'ID_Setoran',
    listFn: 'getSetoranList', saveFn: 'saveSetoran', delFn: 'deleteSetoran', deps: ['jukir'],
    list: ['Tanggal', 'Nama_Jukir', 'Jumlah_Setoran', 'Status_Setoran'],
    fields: [
      { k: 'ID_Jukir', l: 'Juru Parkir', t: 'fk', req: 1, rel: 'jukir', relKey: 'ID_Jukir', relLabel: 'Nama' },
      FD('Tanggal', 'Tanggal', 'date', { req: 1 }),
      FD('Jumlah_Setoran', 'Jumlah Setoran (Rp)', 'number', { req: 1 }),
      FD('Status_Setoran', 'Status', 'select', { req: 1, opt: ['Sudah', 'Belum', 'Sebagian'] }),
      FD('Keterangan', 'Keterangan', 'textarea')
    ]
  },
  pengaduan: {
    label: 'Pengaduan Masyarakat', icon: 'report', idField: 'ID_Pengaduan',
    listFn: 'getPengaduanList', saveFn: 'savePengaduan', delFn: 'deletePengaduan', deps: ['jukir', 'lokasi'],
    list: ['Tanggal', 'Nama_Pelapor', 'Kategori', 'Nama_Jukir', 'Status'],
    fields: [
      FD('Tanggal', 'Tanggal', 'date', { req: 1 }),
      FD('Nama_Pelapor', 'Nama Pelapor', 'text', { req: 1 }),
      FD('Kontak_Pelapor', 'Kontak Pelapor', 'text'),
      { k: 'ID_Jukir', l: 'Jukir Terkait', t: 'fk', rel: 'jukir', relKey: 'ID_Jukir', relLabel: 'Nama' },
      { k: 'ID_Lokasi', l: 'Lokasi Terkait', t: 'fk', rel: 'lokasi', relKey: 'ID_Lokasi', relLabel: 'Nama_Lokasi' },
      FD('Kategori', 'Kategori', 'text', { req: 1, sug: 1 }),
      FD('Isi_Pengaduan', 'Isi Pengaduan', 'textarea', { req: 1 }),
      FD('Status', 'Status', 'select', { req: 1, opt: ['Baru', 'Diproses', 'Selesai'] }),
      FD('Tindak_Lanjut', 'Tindak Lanjut', 'textarea')
    ]
  },
  sanksi: {
    label: 'Sanksi Jukir', icon: 'gavel', idField: 'ID_Sanksi',
    listFn: 'getSanksiList', saveFn: 'saveSanksi', delFn: 'deleteSanksi', deps: ['jukir'],
    list: ['Tanggal', 'Nama_Jukir', 'Jenis_Pelanggaran', 'Jenis_Sanksi', 'Status'],
    fields: [
      { k: 'ID_Jukir', l: 'Juru Parkir', t: 'fk', req: 1, rel: 'jukir', relKey: 'ID_Jukir', relLabel: 'Nama' },
      FD('Tanggal', 'Tanggal', 'date', { req: 1 }),
      FD('Jenis_Pelanggaran', 'Jenis Pelanggaran', 'text', { req: 1, sug: 1 }),
      FD('Jenis_Sanksi', 'Jenis Sanksi', 'select', { req: 1, opt: ['Peringatan Lisan', 'Peringatan Tertulis', 'Pencabutan Kartu'] }),
      FD('Alasan', 'Alasan', 'textarea', { req: 1 }),
      FD('Nominal_Denda', 'Nominal Denda (Rp)', 'number'),
      FD('Status', 'Status', 'select', { req: 1, opt: ['Aktif', 'Selesai'] })
    ]
  },
  survei: {
    label: 'Survei Kepuasan', icon: 'star', idField: 'ID_Survei',
    listFn: 'getSurveiList', saveFn: 'saveSurveiAdmin', delFn: 'deleteSurvei',
    list: ['Tanggal', 'Nama', 'Rata_Rata'],
    fields: [
      FD('Nama', 'Nama Responden', 'text'),
      FD('Nilai_Kemudahan', 'Nilai Kemudahan (1-5)', 'number', { req: 1 }),
      FD('Nilai_Keramahan', 'Nilai Keramahan (1-5)', 'number', { req: 1 }),
      FD('Nilai_Tarif', 'Nilai Kesesuaian Tarif (1-5)', 'number', { req: 1 }),
      FD('Nilai_Karcis', 'Nilai Karcis (1-5)', 'number', { req: 1 }),
      FD('Nilai_Keamanan', 'Nilai Keamanan (1-5)', 'number', { req: 1 }),
      FD('Saran', 'Saran', 'textarea')
    ]
  },
  pengguna: {
    label: 'Pengguna', icon: 'manage_accounts', idField: 'Username', needsIsNew: true,
    listFn: 'getUserList', saveFn: 'saveUser', delFn: 'deleteUser',
    list: ['Username', 'Nama', 'Role'],
    fields: [
      FD('Username', 'Username', 'text', { req: 1 }),
      FD('Nama', 'Nama', 'text', { req: 1 }),
      FD('Role', 'Role', 'select', { req: 1, opt: ['Super Admin', 'Administrator', 'Petugas Lapangan'] }),
      FD('Password', 'Password (kosongkan jika tidak diubah)', 'text')
    ]
  },
  karcisMasuk: {
    label: 'Karcis Masuk (dari percetakan)', icon: 'inventory', idField: 'ID_KarcisMasuk',
    listFn: 'getKarcisMasukList', saveFn: 'saveKarcisMasuk', delFn: 'deleteKarcisMasuk',
    list: ['Tanggal', 'No_BAST', 'Jenis_Karcis', 'Jumlah_Buku'],
    rowActions: function (r) {
      return '<button type="button" class="icon-btn sm" data-id="' + esc(r.ID_KarcisMasuk) + '" onclick="dpCetakBastMasuk(this.dataset.id)" aria-label="Cetak BAST" title="Cetak BAST">' + ic('print') + '</button>';
    },
    fields: [
      FD('Tanggal', 'Tanggal', 'date', { req: 1 }),
      FD('No_BAST', 'No. BAST', 'text', { req: 1 }),
      FD('Jenis_Karcis', 'Jenis Karcis', 'select', { req: 1, opt: ['Motor', 'Mobil'] }),
      FD('Jumlah_Buku', 'Jumlah Buku', 'number', { req: 1 }),
      FD('No_Seri_Awal', 'No. Seri Awal', 'text'), FD('No_Seri_Akhir', 'No. Seri Akhir', 'text'),
      FD('Nama_Penyerah', 'Nama Penyerah (percetakan)', 'text'), FD('Jabatan_Penyerah', 'Jabatan Penyerah', 'text'),
      FD('Nama_Penerima', 'Nama Penerima (UPTD)', 'text'), FD('Jabatan_Penerima', 'Jabatan Penerima', 'text'),
      FD('Keterangan', 'Keterangan', 'textarea')
    ]
  },
  karcisKeluar: {
    label: 'Karcis Keluar (ke Juru Parkir)', icon: 'local_shipping', idField: 'ID_KarcisKeluar',
    listFn: 'getKarcisKeluarList', saveFn: 'saveKarcisKeluar', delFn: 'deleteKarcisKeluar', deps: ['jukir'],
    list: ['Tanggal', 'Nama_Jukir', 'Jenis_Karcis', 'Jumlah_Buku', 'Status_Buku'],
    rowActions: function (r) {
      let btns = '';
      if (r.Status_Buku === 'Aktif') btns += '<button type="button" class="icon-btn sm" data-id="' + esc(r.ID_KarcisKeluar) + '" onclick="dpTandaiHabis(this.dataset.id)" aria-label="Tandai habis" title="Tandai buku habis">' + ic('inventory_2') + '</button>';
      btns += '<button type="button" class="icon-btn sm" data-id="' + esc(r.ID_KarcisKeluar) + '" onclick="dpCetakBastKeluar(this.dataset.id)" aria-label="Cetak BAST" title="Cetak BAST">' + ic('print') + '</button>';
      return btns;
    },
    fields: [
      { k: 'ID_Jukir', l: 'Juru Parkir', t: 'fk', req: 1, rel: 'jukir', relKey: 'ID_Jukir', relLabel: 'Nama' },
      FD('Tanggal', 'Tanggal', 'date', { req: 1 }),
      FD('Jenis_Karcis', 'Jenis Karcis', 'select', { req: 1, opt: ['Motor', 'Mobil'] }),
      FD('Jumlah_Buku', 'Jumlah Buku', 'number', { req: 1 }),
      FD('No_Seri_Awal', 'No. Seri Awal', 'text'), FD('No_Seri_Akhir', 'No. Seri Akhir', 'text'),
      FD('Nama_Penyerah', 'Nama Penyerah (petugas UPTD)', 'text'),
      FD('Status_Buku', 'Status Buku', 'select', { opt: ['Aktif', 'Habis'] }),
      FD('Keterangan', 'Keterangan', 'textarea')
    ]
  }
};

// ════════════════════════════════════════════════════════
// PEMANGGIL BACKEND DISPAKOT — kontrak BEDA dari api()/adminApi() milik
// website: sebagian besar fungsi getXList/saveX/deleteX melempar Error
// polos (ditangani withFailureHandler), bukan membungkus {success,...}.
// ════════════════════════════════════════════════════════

async function dpUploadPending(file, kind) {
  const blob = kind === 'image' ? await compressImage(file) : file;
  if (blob.size > 6 * 1024 * 1024) throw new Error('Ukuran berkas setelah diproses masih melebihi 6 MB.');
  const b64 = await readB64(blob);
  const res = await dpAuthApi('dpUploadFoto', b64, blob.name || file.name, blob.type || file.type);
  if (!res.success) throw new Error(res.message || 'Gagal mengunggah foto.');
  return res.id;
}

// ════════════════════════════════════════════════════════
// SESI — login/logout/shell sekarang SATU dengan Portal Admin Website
// (renderAdmin/renderLogin/doLogin/clearSession/doLogout/forceLogout di JavaScript.html).
// Modul ini hanya menyediakan modal "Ganti Password" yang dipakai dari menu Portal Admin,
// dan alias dpGo/dpRefreshSide supaya kode lama (dpGo('x'), dpRefreshSide()) tetap jalan
// tanpa perlu diganti satu-satu di seluruh DispakotApp.html / DispakotCetak.html.
// ════════════════════════════════════════════════════════
function dpGo(tab) { admGo(tab); }
function dpRefreshSide() { admRefreshSide(); }

function dpOpenGantiPassword(wajib) {
  openModal({
    title: 'Ganti Password', size: 'sm',
    body: '<form id="dpGpForm" onsubmit="return dpSubmitGantiPassword(event)" class="flex flex-col gap-4" novalidate>' +
      (wajib ? '<p class="text-body-sm text-on-surface-variant">Password Anda masih bawaan sistem. Mohon ganti sebelum melanjutkan.</p>' : '') +
      '<div><label class="label" for="gpOld">Password saat ini</label><input id="gpOld" name="old" class="input" type="password" required></div>' +
      '<div><label class="label" for="gpNew">Password baru</label><input id="gpNew" name="new" class="input" type="password" required minlength="8"></div>' +
      '<p class="help">Minimal 8 karakter, kombinasi huruf dan angka.</p>' +
      '<div id="gpErr" class="err-text" role="alert"></div></form>',
    foot: (wajib ? '' : '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button>') +
      '<button type="submit" form="dpGpForm" class="btn btn-primary" id="gpBtn">' + ic('save') + 'Simpan</button>'
  });
}
function dpSubmitGantiPassword(e) {
  e.preventDefault();
  const f = $('#dpGpForm'), btn = $('#gpBtn'), box = $('#gpErr');
  if (!f.checkValidity()) { f.reportValidity(); return false; }
  box.textContent = '';
  setBusy(btn, true, 'Menyimpan…');
  dpAuthApi('dpGantiPassword', f.elements.old.value, f.elements.new.value).then(function (res) {
    if (!res.success) { setBusy(btn, false); box.textContent = res.message; return; }
    closeModal(); showToast('Berhasil', 'Password berhasil diubah.');
  }).catch(function (er) { setBusy(btn, false); box.textContent = er.message; });
  return false;
}


// ════════════════════════════════════════════════════════
// Label & daftar tab DISPAKOT dipakai oleh admTabLabel()/admSideHtml()/admGo() gabungan
// di JavaScript.html — menu & dispatcher DISPAKOT sudah dipindahkan ke sana sejak satu
// login & satu portal admin digabung (dpSideHtml/dpDrawer/renderDpShell lama sudah dihapus).
// ════════════════════════════════════════════════════════
const DP_REKAP_LABEL = {
  stok: 'Stok Karcis', rekapSetoran: 'Rekap Setoran', rekapKarcis: 'Rekap Karcis',
  rekapPengaduan: 'Rekap Pengaduan', rekapSanksi: 'Rekap Sanksi', rekapSurvei: 'Rekap Survei'
};
// DASHBOARD
// ════════════════════════════════════════════════════════
async function dpDashboard() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const d = await dpAuthApi('getDashboardStats');
    if (S.adm.tab !== 'dashboard' || !$('#admMain')) return;
    S.adm.dpStats = d;
    dpDrawDashboard(d);
  } catch (e) { if (S.adm.tab === 'dashboard' && $('#admMain')) $('#admMain').innerHTML = errorCard(e, "dpGo('dashboard')"); }
}
function dpDrawDashboard(d) {
  const kpis = [
    ['route', 'Ruas Jalan', fmtNum(d.totalJalan), 'jalan'], ['local_parking', 'Titik Lokasi', fmtNum(d.totalLokasi), 'lokasi'],
    ['badge', 'Juru Parkir Aktif', fmtNum(d.jukirAktif), 'jukir'], ['payments', 'Setoran Hari Ini', fmtRp(d.totalSetoranHariIni), 'setoran']
  ];
  $('#admMain').innerHTML =
    '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">' + kpis.map(function (x) {
      return '<button type="button" class="card card-hover p-4 flex items-center gap-3 text-left" data-tab="' + x[3] + '" onclick="dpGo(this.dataset.tab)"><div class="kpi-icon">' + ic(x[0]) + '</div>' +
        '<div class="min-w-0"><div class="text-headline-md text-primary font-extrabold num leading-none">' + esc(x[2]) + '</div><div class="text-label-md text-on-surface-variant mt-1">' + esc(x[1]) + '</div></div></button>';
    }).join('') + '</div>' +
    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold">Jukir Sudah Setor Hari Ini</h2><p class="text-headline-lg text-primary font-bold mt-2 num">' + d.jukirSudahSetor + ' <span class="text-body-md text-on-surface-variant">/ ' + d.jukirAktif + '</span></p></div>' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold">Jukir Belum Setor</h2><p class="text-headline-lg font-bold mt-2 num" style="color:rgb(var(--error))">' + d.jukirBelumSetor + '</p></div>' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold">Jukir Nonaktif</h2><p class="text-headline-lg text-on-surface-variant font-bold mt-2 num">' + d.jukirNonaktif + '</p></div></div>' +
    '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Total Setoran — 7 Hari Terakhir</h2><div class="chart-box relative h-64"><canvas id="dpChSetoran" role="img" aria-label="Grafik total setoran 7 hari terakhir"></canvas></div></div>';
  dpDrawCharts(d);
}
async function dpDrawCharts(d) {
  try { await ensureChartJs(); }
  catch (e) { const b = $('#dpChSetoran'); if (b) b.parentNode.innerHTML = '<p class="text-body-sm text-on-surface-variant p-4">' + esc(e.message) + '</p>'; return; }
  if (!$('#dpChSetoran')) return;
  const t = chartTheme();
  if (S.charts.dpSetoran) { try { S.charts.dpSetoran.destroy(); } catch (e) { /* sudah hilang */ } }
  S.charts.dpSetoran = new Chart($('#dpChSetoran'), {
    type: 'line',
    data: { labels: d.chartLabels, datasets: [{ label: 'Total Setoran (Rp)', data: d.chartData, borderColor: t.pal[0], backgroundColor: t.pal[0] + '33', tension: .3, fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: t.text } }, y: { beginAtZero: true, ticks: { color: t.text }, grid: { color: t.grid } } } }
  });
}

// ════════════════════════════════════════════════════════
// CRUD GENERIK (dari DP_SCHEMA) — meniru admEntity/drawEntity/openForm milik
// Portal Admin, tapi dinamis terhadap idField & nama fungsi backend tiap entitas.
// ════════════════════════════════════════════════════════
async function dpEntity(key) {
  const sc = DP_SCHEMA[key], m = $('#admMain');
  m.innerHTML =
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="relative flex-1 min-w-[220px] max-w-md"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-outline">' + ic('search') + '</span>' +
    '<label class="sr-only" for="dpQ">Cari ' + esc(sc.label) + '</label><input id="dpQ" class="input pl-11" type="search" placeholder="Cari di ' + esc(sc.label) + '…" value="' + esc(S.adm.q[key] || '') + '" oninput="dpSearch()" autocomplete="off"></div>' +
    '<button type="button" class="btn btn-primary" onclick="dpAdd()">' + ic('add') + 'Tambah data</button></div><div id="dpList">' + admLoading() + '</div>';
  try {
    const deps = sc.deps || [];
    for (let i = 0; i < deps.length; i++) {
      const dk = deps[i];
      if (!S.adm.rows[dk]) S.adm.rows[dk] = await dpAuthApi(DP_SCHEMA[dk].listFn);
    }
    const rows = await dpAuthApi(sc.listFn);
    S.adm.rows[key] = rows;
    if (S.adm.tab === key && $('#dpList')) dpDrawEntity(key);
  } catch (e) { if (S.adm.tab === key && $('#dpList')) $('#dpList').innerHTML = errorCard(e, "dpGo('" + key + "')"); }
}
function dpSearch() { S.adm.q[S.adm.tab] = $('#dpQ').value; dpDrawEntity(S.adm.tab); }
function dpAdd() { if (DP_SCHEMA[S.adm.tab]) dpOpenForm(S.adm.tab, ''); }
function dpEdit(id) { dpOpenForm(S.adm.tab, id); }

function dpDrawEntity(key) {
  const sc = DP_SCHEMA[key], all = S.adm.rows[key] || [], q = (S.adm.q[key] || '').trim().toLowerCase();
  const fdOf = function (k) { return sc.fields.filter(function (f) { return f.k === k; })[0]; };
  let rows = all.filter(function (r) { return !q || sc.list.some(function (k) { return String(r[k] == null ? '' : r[k]).toLowerCase().indexOf(q) >= 0; }); });
  const box = $('#dpList');
  if (!rows.length) {
    box.innerHTML = emptyState(all.length ? 'search_off' : sc.icon, all.length ? 'Data tidak ditemukan' : 'Belum ada data ' + sc.label, all.length ? 'Coba kata kunci lain.' : 'Klik “Tambah data” untuk mulai mengisi.');
    return;
  }
  const actions = function (r) {
    return '<div class="flex gap-1 justify-end">' + (sc.rowActions ? sc.rowActions(r) : '') +
      '<button type="button" class="icon-btn sm" data-id="' + esc(r[sc.idField]) + '" onclick="dpEdit(this.dataset.id)" aria-label="Ubah">' + ic('edit') + '</button>' +
      '<button type="button" class="icon-btn sm" style="color:rgb(var(--error))" data-id="' + esc(r[sc.idField]) + '" onclick="dpDel(this.dataset.id)" aria-label="Hapus">' + ic('delete') + '</button></div>';
  };
  box.innerHTML =
    '<p class="text-body-sm text-on-surface-variant mb-3" aria-live="polite">' + rows.length + ' data</p>' +
    '<div class="card tbl-wrap"><table class="tbl"><thead><tr>' + sc.list.map(function (k) { return '<th>' + esc((fdOf(k) || {}).l || k) + '</th>'; }).join('') + '<th><span class="sr-only">Aksi</span></th></tr></thead><tbody>' +
    rows.map(function (r) { return '<tr>' + sc.list.map(function (k) { return '<td>' + cellHtml(fdOf(k), r[k]) + '</td>'; }).join('') + '<td>' + actions(r) + '</td></tr>'; }).join('') + '</tbody></table></div>';
}

function dpFieldHtml(fd, val) {
  if (fd.t === 'fk') {
    const rows = S.adm.rows[fd.rel] || [];
    const id = 'f_' + fd.k, req = fd.req ? 'required' : '';
    const lab = '<label class="label" for="' + id + '">' + esc(fd.l) + (fd.req ? '<span class="req">*</span>' : '') + '</label>';
    return '<div>' + lab + '<div class="select-wrap"><select id="' + id + '" name="' + esc(fd.k) + '" class="input" ' + req + '>' + (fd.req ? '' : '<option value="">—</option>') +
      rows.map(function (r) { return '<option value="' + esc(r[fd.relKey]) + '"' + (val === r[fd.relKey] ? ' selected' : '') + '>' + esc(r[fd.relLabel]) + '</option>'; }).join('') +
      '</select>' + ic('expand_more') + '</div></div>';
  }
  if (fd.t === 'readonly') {
    const id = 'f_' + fd.k;
    return '<div><span class="label">' + esc(fd.l) + '</span><input id="' + id + '" class="input" type="text" value="' + esc(val || fd.auto || '(otomatis)') + '" disabled>' +
      '<input type="hidden" name="' + esc(fd.k) + '" value="' + esc(val || '') + '"></div>';
  }
  return fieldHtml(fd, val, []);
}

function dpOpenForm(key, id) {
  const sc = DP_SCHEMA[key], rows = S.adm.rows[key] || [];
  const rec = id ? rows.filter(function (r) { return r[sc.idField] === id; })[0] : null;
  if (id && !rec) { showToast('Data tidak ditemukan', 'Muat ulang halaman ini.', 'err'); return; }
  FILES = {};
  const html = sc.fields.map(function (fd) {
    let use = fd;
    if (id && fd.k === sc.idField && fd.t !== 'readonly') use = Object.assign({}, fd, { t: 'readonly' });
    const def = (fd.t === 'date' && fd.k === 'Tanggal' && !rec) ? new Date().toISOString().slice(0, 10) : '';
    return dpFieldHtml(use, rec ? rec[fd.k] : def);
  }).join('');
  openModal({
    title: (id ? 'Ubah ' : 'Tambah ') + sc.label, size: 'lg',
    body: '<form id="dpForm" onsubmit="return dpSaveForm(event)" novalidate class="grid grid-cols-1 md:grid-cols-2 gap-4">' + html + '</form>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="submit" form="dpForm" class="btn btn-primary" id="dpFrmSave">' + ic('save') + 'Simpan</button>',
    onClose: function () { DP_FORM = null; }
  });
  DP_FORM = { key: key, id: id || '' };
}
async function dpSaveForm(e) {
  e.preventDefault();
  if (!DP_FORM) return false;
  const form = $('#dpForm');
  if (!form.checkValidity()) { form.reportValidity(); return false; }
  const F = DP_FORM, sc = DP_SCHEMA[F.key], rec = {}, btn = $('#dpFrmSave');
  sc.fields.forEach(function (fd) { if (fd.t !== 'image' && fd.t !== 'file' && form.elements[fd.k]) rec[fd.k] = form.elements[fd.k].value; });
  if (F.id) rec[sc.idField] = F.id;
  if (sc.needsIsNew) rec.isNew = !F.id;
  setBusy(btn, true, 'Menyimpan…');
  try {
    const fileFields = sc.fields.filter(function (fd) { return fd.t === 'image' || fd.t === 'file'; });
    for (let i = 0; i < fileFields.length; i++) {
      const fd = fileFields[i], st = FILES[fd.k] || { keep: '', file: null };
      if (st.file) { setBusyLabel(btn, 'Mengunggah ' + fd.l + '…'); rec[fd.k] = await dpUploadPending(st.file, fd.t === 'image' ? 'image' : 'file'); }
      else rec[fd.k] = st.keep || '';
    }
    setBusyLabel(btn, 'Menyimpan…');
    const res = await dpAuthApi(sc.saveFn, rec);
    closeModal();
    showToast('Berhasil', (res && res.noRegistrasi) ? 'Data tersimpan. No. Registrasi: ' + res.noRegistrasi : 'Data berhasil disimpan.');
    if (S.adm.tab === F.key) dpEntity(F.key);
  } catch (er) { if (S.token) { setBusy(btn, false); showToast('Gagal menyimpan', er.message, 'err'); } }
  return false;
}
function dpDel(id) {
  const key = S.adm.tab, sc = DP_SCHEMA[key];
  const rec = (S.adm.rows[key] || []).filter(function (r) { return r[sc.idField] === id; })[0];
  const name = rec ? rec[sc.list[0]] : 'ini';
  openModal({
    title: 'Hapus data?', size: 'sm',
    body: '<p class="text-body-md">Data <strong>' + esc(name) + '</strong> akan dihapus permanen.</p>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="button" class="btn btn-danger" id="dpDelOk" data-id="' + esc(id) + '" data-key="' + esc(key) + '" onclick="dpDelOk(this)">' + ic('delete') + 'Hapus</button>'
  });
}
async function dpDelOk(btn) {
  const id = btn.dataset.id, key = btn.dataset.key, sc = DP_SCHEMA[key];
  setBusy(btn, true, 'Menghapus…');
  try {
    await dpAuthApi(sc.delFn, id);
    closeModal(); showToast('Berhasil', 'Data dihapus.');
    if (S.adm.tab === key) dpEntity(key);
  } catch (er) { if (S.token) { setBusy(btn, false); showToast('Gagal menghapus', er.message, 'err'); } }
}

// ════════════════════════════════════════════════════════
// PENGATURAN LAPORAN (satu baris data, bukan daftar — formulir tersendiri)
// ════════════════════════════════════════════════════════
async function dpPengaturan() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const data = await dpAuthApi('getPengaturan');
    if (S.adm.tab !== 'pengaturanLaporan' || !$('#admMain')) return;
    m.innerHTML = '<div class="card p-6 max-w-xl"><p class="help mb-4">Nama jabatan &amp; pejabat ini dipakai sebagai tanda tangan pada laporan/BAST yang dicetak.</p>' +
      '<form id="dpPengForm" onsubmit="return dpSavePengaturan(event)" class="flex flex-col gap-4" novalidate>' +
      '<div><label class="label" for="pJab">Nama Jabatan Penandatangan<span class="req">*</span></label><input id="pJab" name="Nama_Jabatan" class="input" value="' + esc(data.Nama_Jabatan || '') + '" required></div>' +
      '<div><label class="label" for="pPej">Nama Pejabat</label><input id="pPej" name="Nama_Pejabat" class="input" value="' + esc(data.Nama_Pejabat || '') + '"></div>' +
      '<div><label class="label" for="pNip">NIP</label><input id="pNip" name="NIP" class="input" value="' + esc(data.NIP || '') + '"></div>' +
      '<button type="submit" class="btn btn-primary self-start" id="pBtn">' + ic('save') + 'Simpan</button></form></div>';
  } catch (e) { if (S.adm.tab === 'pengaturanLaporan' && $('#admMain')) m.innerHTML = errorCard(e, "dpGo('pengaturanLaporan')"); }
}
function dpSavePengaturan(e) {
  e.preventDefault();
  const f = $('#dpPengForm'), btn = $('#pBtn');
  if (!f.checkValidity()) { f.reportValidity(); return false; }
  const rec = { Nama_Jabatan: f.elements.Nama_Jabatan.value, Nama_Pejabat: f.elements.Nama_Pejabat.value, NIP: f.elements.NIP.value };
  setBusy(btn, true, 'Menyimpan…');
  dpAuthApi('savePengaturan', rec).then(function () {
    setBusy(btn, false); showToast('Berhasil', 'Pengaturan tersimpan.');
  }).catch(function (er) { setBusy(btn, false); showToast('Gagal', er.message, 'err'); });
  return false;
}
