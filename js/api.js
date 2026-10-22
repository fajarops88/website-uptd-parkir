// ============================================================
// FETCH HELPERS — pengganti google.script.run di Website SPA lama.
// GET  -> ?api=1&action=<nama>
// POST -> body JSON { action, data }, WAJIB header text/plain
//         (menghindari CORS preflight yang diblokir Apps Script).
// ============================================================

function apiGet(action) {
  const url = GAS_URL + '?api=1&action=' + encodeURIComponent(action);
  return fetch(url).then(function (res) { return res.json(); }).then(function (res) {
    if (!res || !res.success) throw new Error((res && res.message) || 'Terjadi kesalahan pada server.');
    return res;
  });
}

function apiPost(action, data) {
  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, data: data || {} })
  }).then(function (res) { return res.json(); }).then(function (res) {
    if (!res || !res.success) throw new Error((res && res.message) || 'Terjadi kesalahan pada server.');
    return res;
  });
}

// Pemetaan nama fungsi lama (dipakai di seluruh kode halaman publik yang diporting
// dari Website SPA) ke nama action REST API backend (lihat apiRouter_ di Kode.gs).
const API_ACTION_MAP = {
  getPublicBundle: 'getBundle',
  getPublicDashboardDataWeb: 'getDashboard',
  getLokasiDropdownPublikWeb: 'getLokasiDropdown',
  getJukirDropdownPublikWeb: 'getJukirDropdown',
  getRekapSurveiPublik: 'getRekapSurvei'
};
const API_WRITE_ACTIONS = ['submitContact', 'submitSurveiPublik', 'submitPengaduanPublik'];

// Pembungkus bergaya api() lama (JavaScript.html) — supaya kode halaman publik yang
// diporting dari Website SPA tetap memakai pola api('namaFungsi', data).then()/.catch()
// yang sama persis, tanpa perlu diubah satu per satu.
function api(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  if (API_WRITE_ACTIONS.indexOf(fn) >= 0) return apiPost(fn, args[0]);
  const action = API_ACTION_MAP[fn] || fn;
  return apiGet(action);
}

// ════════════════════════════════════════════════════════
// PORTAL ADMIN / DISPAKOT — pengganti google.script.run.
// Backend (Kode.gs) menerima POST { action, args: [...] } dan memanggil fungsi yang
// sama persis dengan nama 'action' (lihat whitelist ADMIN_API_ di apiRouter_ Kode.gs).
// Kontrak dipertahankan SAMA seperti semula:
//  - dpApi(fn, ...args)      : panggilan mentah, TANPA token otomatis.
//  - dpAuthApi(fn, ...args)  : seperti dpApi, tapi otomatis menyisipkan S.token di awal.
//  - adminApi(fn, ...args)   : sama seperti dpAuthApi (dipakai oleh kode Website admin).
// Semua fungsi backend yang dipanggil di sini SENDIRI memvalidasi token lewat
// requireAuth_() seperti sebelumnya — tidak ada aturan otorisasi baru di sisi klien.
// ════════════════════════════════════════════════════════
function apiPostArgs(action, argsArray) {
  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, args: argsArray || [] })
  }).then(function (res) { return res.json(); });
}
function dpApi(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  return apiPostArgs(fn, args).then(function (res) {
    // Meniru kontrak withFailureHandler lama: hasil {success:false,...} (baik yang
    // dikembalikan fungsi backend sendiri, atau dibungkus dari Error yang dilempar
    // backend) membuat promise ini REJECT, bukan resolve dengan objek gagal.
    if (res && typeof res === 'object' && !Array.isArray(res) && res.success === false) {
      throw new Error(res.message || 'Terjadi kesalahan pada server.');
    }
    return res;
  });
}
function dpAuthApi(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  return dpApi.apply(null, [fn, S.token].concat(args)).catch(function (e) {
    if (/^Sesi/.test(e.message)) forceLogout(e.message);
    throw e;
  });
}
function adminApi(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  return dpApi.apply(null, [fn, S.token].concat(args)).catch(function (e) {
    if (/^Sesi/.test(e.message)) forceLogout(e.message);
    throw e;
  });
}
