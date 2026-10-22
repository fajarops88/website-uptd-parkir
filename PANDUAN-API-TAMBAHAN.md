# Kode tambahan untuk `Kode.gs` — REST API (Website + SELURUH DISPAKOT)

> ⚠️ **Versi ini MENGGANTIKAN sepenuhnya** potongan kode `PANDUAN-API-TAMBAHAN.md` yang
> lebih dulu Anda terima (yang hanya mendukung 5 data publik). Sekarang **Portal Admin
> dan seluruh modul DISPAKOT** (Lokasi, Jukir, Setoran, Pengaduan, Sanksi, Karcis, Users,
> dashboard, rekap, cetak) juga dilayani lewat API yang sama — satu Apps Script project,
> satu Spreadsheet, tidak ada project baru.
>
> Kalau Anda sudah pernah menempel versi lama, **hapus dulu** fungsi `apiJson_`,
> `apiRouter_`, dan `doPost` versi lama itu, lalu tempel ulang dengan kode di bawah ini.

Jangan buat project Apps Script baru — tambahkan ke project yang **SUDAH ADA** (yang
menjalankan Portal Admin Anda sekarang). Spreadsheet, auth, dan seluruh fungsi backend
TIDAK diubah sama sekali — kode ini hanya menambahkan "jalur masuk" baru (REST JSON)
di samping jalur lama (`google.script.run`, dipakai Portal Admin HtmlService) yang
tetap berjalan seperti biasa.

## Langkah A — Edit `doGet(e)`

Cari fungsi `doGet(e)` yang sudah ada di `Kode.gs` Anda. Tambahkan blok ini **di awal**
fungsi tersebut (sebelum pengecekan `?verify=` atau `?public=` yang sudah ada):

```js
function doGet(e) {
  ensureSheetsDispakot_();
  // ?api=1&action=... -> REST JSON untuk frontend statis (GitHub Pages dkk).
  if (e && e.parameter && e.parameter.api) {
    return apiGetRouter_(e.parameter.action);
  }
  // ... baris-baris lain yang SUDAH ADA (verify, public, dst) TETAP, tidak dihapus ...
}
```

Kalau fungsi `doGet(e)` Anda sudah punya baris `ensureSheetsDispakot_();` di awal,
jangan ditulis dua kali — cukup tambahkan blok `if (e && e.parameter && e.parameter.api)`
saja, persis di bawahnya.

## Langkah B — Tambahkan blok API ini di mana saja dalam `Kode.gs`

Lokasi yang disarankan: dekat fungsi `getJukirDropdownPublikWeb()`, atau langsung di
akhir file. Yang penting ditempel **sekali, lengkap**, dan jangan sampai ada dua fungsi
`doPost` dalam satu project (Apps Script hanya boleh punya **satu** `doPost` dan **satu**
`doGet` per project — kalau project Anda sudah punya `doPost` lain, hapus dulu yang lama).

```js
// ════════════════════════════════════════════════════════
// REST JSON API UNTUK FRONTEND STATIS (GitHub Pages) — MELIPUTI PORTAL ADMIN + DISPAKOT.
// Dipanggil lewat ?api=1&action=<nama> (GET, hanya aksi publik tanpa token) atau
// POST text/plain JSON { action, args: [...] } (dipakai untuk SEMUA aksi, termasuk admin).
// Daftar PUBLIC_API_ hanya untuk pembacaan publik tanpa token (aman lewat GET/URL).
// Daftar ADMIN_API_ adalah SELURUH fungsi admin/DISPAKOT yang sudah ada — setiap fungsi di
// sana SENDIRI memvalidasi token lewat requireAuth_() seperti sebelumnya, jadi tidak ada
// logika otorisasi baru yang ditambahkan di sini; ini hanya jalur pemanggilan (fetch
// pengganti google.script.run), bukan perubahan aturan akses.
// ════════════════════════════════════════════════════════
function apiJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
const PUBLIC_API_ = {
  getBundle: getPublicBundle,
  getDashboard: getPublicDashboardDataWeb,
  getLokasiDropdown: getLokasiDropdownPublikWeb,
  getJukirDropdown: getJukirDropdownPublikWeb,
  getRekapSurvei: getRekapSurveiPublik
};
// Aksi yang TIDAK butuh token sama sekali tapi WAJIB lewat POST (menulis data / login).
const PUBLIC_WRITE_API_ = {
  submitContact: submitContact,
  submitSurveiPublik: submitSurveiPublik,
  submitPengaduanPublik: submitPengaduanPublik,
  login: login
};
// Seluruh fungsi admin & DISPAKOT yang sudah ada (menerima token sebagai argumen pertama,
// divalidasi oleh requireAuth_() masing-masing, TIDAK diubah sama sekali di sini).
const ADMIN_API_ = {
  dpLogout: dpLogout, dpPing: dpPing, dpGantiPassword: dpGantiPassword, dpUploadFoto: dpUploadFoto,
  adminList: adminList, adminSave: adminSave, adminDelete: adminDelete, adminSetPesanStatus: adminSetPesanStatus,
  adminUpload: adminUpload, adminDashboard: adminDashboard, adminGetSettings: adminGetSettings, adminSaveSettings: adminSaveSettings,
  getUserList: getUserList, saveUser: saveUser, deleteUser: deleteUser,
  getJalanList: getJalanList, saveJalan: saveJalan, deleteJalan: deleteJalan,
  getLokasiList: getLokasiList, saveLokasi: saveLokasi, deleteLokasi: deleteLokasi,
  getJukirList: getJukirList, saveJukir: saveJukir, deleteJukir: deleteJukir,
  getSetoranList: getSetoranList, saveSetoran: saveSetoran, deleteSetoran: deleteSetoran,
  getPengaduanList: getPengaduanList, savePengaduan: savePengaduan, deletePengaduan: deletePengaduan, getRekapPengaduan: getRekapPengaduan,
  getSanksiList: getSanksiList, saveSanksi: saveSanksi, deleteSanksi: deleteSanksi, getRekapSanksi: getRekapSanksi,
  getPengaturan: getPengaturan, savePengaturan: savePengaturan,
  getSurveiList: getSurveiList, saveSurveiAdmin: saveSurveiAdmin, deleteSurvei: deleteSurvei, getRekapSurvei: getRekapSurvei,
  getKarcisMasukList: getKarcisMasukList, saveKarcisMasuk: saveKarcisMasuk, deleteKarcisMasuk: deleteKarcisMasuk,
  getKarcisKeluarList: getKarcisKeluarList, saveKarcisKeluar: saveKarcisKeluar, deleteKarcisKeluar: deleteKarcisKeluar,
  tandaiBukuHabis: tandaiBukuHabis, getStokKarcis: getStokKarcis, getRekapKarcis: getRekapKarcis,
  getDashboardStats: getDashboardStats, getRekap: getRekap
};
function apiGetRouter_(action) {
  try {
    ensureSheetsDispakot_();
    if (!PUBLIC_API_[action]) return apiJson_(fail_(new Error('Aksi API tidak dikenal atau butuh POST: ' + action)));
    return apiJson_(PUBLIC_API_[action]());
  } catch (e) { return apiJson_(fail_(e)); }
}
function apiPostRouter_(action, args) {
  try {
    ensureSheetsDispakot_();
    args = args || [];
    if (PUBLIC_API_[action]) return apiJson_(PUBLIC_API_[action].apply(null, args));
    if (PUBLIC_WRITE_API_[action]) return apiJson_(PUBLIC_WRITE_API_[action].apply(null, args));
    if (ADMIN_API_[action]) return apiJson_(ADMIN_API_[action].apply(null, args));
    return apiJson_(fail_(new Error('Aksi API tidak dikenal: ' + action)));
  } catch (e) { return apiJson_(fail_(e)); }
}
/**
 * Entry point POST — HANYA untuk REST JSON API (Website SPA / Portal Admin HtmlService asli
 * tetap memakai google.script.run, tidak tersentuh). Frontend WAJIB mengirim header
 * Content-Type: text/plain;charset=utf-8 agar browser tidak melakukan CORS preflight
 * (yang akan diblokir Apps Script).
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    return apiPostRouter_(payload.action, payload.args || []);
  } catch (err) {
    return apiJson_(fail_(err));
  }
}
```

## Langkah C — Deploy ulang

**Deploy → Manage deployments → ikon pensil (edit) → Version: "New version" → Deploy.**

Salin URL `/exec` yang muncul (harusnya URL yang **sama** dengan yang sudah Anda pakai
sekarang) — URL ini yang diisi ke `js/config.js` di paket frontend.

## Catatan keamanan

- Tidak ada sistem login baru yang dibuat. Token sesi admin (`S.token`) yang dipakai
  frontend statis ini adalah token yang **sama persis** dengan yang sudah dipakai Portal
  Admin sekarang (`CacheService`, berlaku 6 jam, dibuat oleh fungsi `login()` yang sudah ada).
- Setiap fungsi di `ADMIN_API_` **tetap** memvalidasi token itu sendiri lewat
  `requireAuth_()` — daftar `ADMIN_API_` di atas hanyalah daftar fungsi mana yang boleh
  dipanggil lewat REST (bukan `this[nama]` bebas); tidak ada fungsi yang bisa dipanggil
  di luar daftar itu, dan tidak ada yang kehilangan pengecekan tokennya.
- Karena token dikirim lewat **body POST** (bukan parameter URL), token tidak pernah
  tercatat di riwayat browser atau log server seperti URL.
