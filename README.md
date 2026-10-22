# Website UPTD Pengelolaan Parkir — versi GitHub Pages (FULL: Website + Portal Admin + seluruh DISPAKOT)

Paket ini isinya **SELURUH aplikasi** — bukan cuma halaman publik:

- 6 halaman publik: Beranda, Profil & Organisasi, Parkir, Berita, Regulasi & Layanan, Kontak.
- **Portal Admin** (login, dashboard, kelola konten Website, Pesan Masuk, Pengaturan).
- **Seluruh modul DISPAKOT**: Master Jalan, Lokasi Parkir, Juru Parkir (+ cetak kartu
  tanda anggota), Setoran Harian, Pengaduan Masyarakat, Sanksi Jukir, Survei Kepuasan,
  Pengguna (Users), Karcis Masuk/Keluar (+ cetak BAST), Stok Karcis, dan seluruh Rekap
  (Setoran, Karcis, Pengaduan, Sanksi, Survei).

Semuanya berjalan sebagai **satu SPA statis** (tidak ada reload halaman, URL tidak
pernah berubah), memanggil Apps Script Anda yang sudah ada lewat `fetch()` — **bukan**
`google.script.run` dan **bukan** HtmlService.

Data tetap satu-satunya sumber: Spreadsheet yang sama yang dipakai sekarang. Tidak ada
project Apps Script baru — hanya ditambahkan "jalur masuk" REST JSON di `Kode.gs` yang
sudah ada, di samping jalur `google.script.run` lama yang tetap berjalan seperti biasa
(Portal Admin versi HtmlService lama tidak disentuh dan tidak wajib dihapus).

## Tentang login & token sesi

Sistem login (username & password) **sama persis** dengan yang sudah ada sekarang — TIDAK
ada sistem auth baru. Setelah login, token sesi disimpan di **`sessionStorage`** browser
(sesuai pilihan Anda), artinya:

- Token otomatis terhapus saat tab/browser ditutup — pengguna admin harus login ulang
  setiap membuka sesi baru (lebih aman, tapi kurang praktis dibanding `localStorage`
  yang bertahan sampai logout manual).
- Token TIDAK dibagi antar-tab berbeda di browser yang sama.
- Berlaku 6 jam sejak login (sama seperti sebelumnya), lalu otomatis logout.

## Langkah 1 — Tambahkan API ke project Apps Script yang SUDAH ADA

**Jangan buat project Apps Script baru.** Buka project Apps Script Anda yang sekarang
(yang isinya `Kode.gs`, `Index.html`, dll — yang menjalankan Portal Admin & DISPAKOT),
lalu tambahkan dua potongan kode ke `Kode.gs` — lihat **`PANDUAN-API-TAMBAHAN.md`** di
paket ini untuk kode lengkapnya (tinggal salin-tempel, sudah mencakup SEMUA fungsi admin
dan DISPAKOT, bukan cuma data publik).

> ⚠️ Kalau Anda sebelumnya sudah menempel versi `PANDUAN-API-TAMBAHAN.md` yang lama
> (hanya 5 data publik), **ganti seluruhnya** dengan versi baru di paket ini — versi lama
> tidak mendukung Portal Admin/DISPAKOT dan harus dihapus dulu sebelum menempel yang baru.

Setelah menambahkan kode ini: **Deploy → Manage deployments → edit (ikon pensil) →
Version: New version → Deploy.** Salin URL `/exec` yang muncul (harusnya URL yang SAMA
dengan yang sudah Anda pakai sekarang).

## Langkah 2 — Isi `js/config.js`

Buka `js/config.js` dalam paket ini, ganti:
```js
const GAS_URL = 'TEMPEL_URL_EXEC_APPS_SCRIPT_DI_SINI';
```
dengan URL `/exec` dari Langkah 1.

## Langkah 3 — Push ke GitHub Pages

Ikuti panduan Git/GitHub langkah demi langkah yang akan dipandu di chat. Folder yang
Anda push adalah folder INI (tempat `index.html` ini berada) — jangan buat folder
pembungkus tambahan.

Struktur folder paket ini:
```
index.html   ← harus di root repo
css/
  style.css
js/
  config.js    ← isi GAS_URL di sini
  api.js       ← fetch helpers (pengganti google.script.run / dpApi)
  app.js       ← Website publik + shell Portal Admin
  admin.js     ← Portal Admin: dashboard, kelola konten, Pesan Masuk, Pengaturan
  dispakot.js  ← Seluruh modul DISPAKOT (CRUD, skema data)
  cetak.js     ← Stok, Rekap, & cetak (kartu jukir, BAST)
README.md
PANDUAN-API-TAMBAHAN.md
```

## Catatan

- Fitur kirim pesan, kirim pengaduan, kirim survei, login, dan SEMUA fitur Portal
  Admin/DISPAKOT (tambah/ubah/hapus data, cetak kartu & BAST, rekap, dashboard) tetap
  berfungsi — semuanya memanggil Apps Script yang sama lewat `fetch()`.
- Jika situs tampil tapi data kosong / error "Terjadi kesalahan pada server", paling
  sering sebabnya `GAS_URL` di `js/config.js` belum diisi atau salah, atau Langkah 1
  (tambahan kode di Apps Script) belum di-deploy ulang, atau project Apps Script Anda
  masih punya fungsi `doPost` lain yang bertabrakan (hanya boleh ada SATU `doPost`).
- Karena token sesi disimpan di `sessionStorage`, admin harus login ulang setiap membuka
  tab/browser baru — ini sudah sesuai pilihan yang Anda tentukan, bukan bug.
