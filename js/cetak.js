/**
 * ============================================================
 * PORTAL DISPAKOT — Stok, Rekap & Cetak — diporting dari DispakotCetak.html.
 * ============================================================
 */
'use strict';

function dpKeyValList(obj) {
  const keys = Object.keys(obj || {});
  if (!keys.length) return '<p class="text-body-sm text-on-surface-variant">Belum ada data.</p>';
  return '<ul class="flex flex-col gap-2">' + keys.map(function (k) {
    return '<li class="flex justify-between text-body-sm"><span>' + esc(k) + '</span><span class="num font-semibold">' + fmtNum(obj[k]) + '</span></li>';
  }).join('') + '</ul>';
}

// ════════════════════════════════════════════════════════
// STOK KARCIS (dihitung otomatis dari selisih Masuk - Keluar)
// ════════════════════════════════════════════════════════
async function dpStok() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const d = await dpAuthApi('getStokKarcis');
    if (S.adm.tab !== 'stok' || !$('#admMain')) return;
    const jenisList = Object.keys(d.stokGudang || {});
    m.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">' + jenisList.map(function (j) {
      return '<div class="card p-5"><h2 class="text-title-md text-primary font-bold">Stok Gudang — Karcis ' + esc(j) + '</h2>' +
        '<p class="text-headline-lg text-primary font-bold mt-2 num">' + fmtNum(d.stokGudang[j]) + ' <span class="text-body-md text-on-surface-variant">buku</span></p></div>';
    }).join('') + '</div>' +
      sectionTitle('Buku Beredar di Juru Parkir', 'Hanya buku berstatus Aktif') +
      '<div class="card tbl-wrap mt-3">' + (d.beredarPerJukir && d.beredarPerJukir.length ?
        '<table class="tbl"><thead><tr><th>Juru Parkir</th><th>Motor (buku)</th><th>Mobil (buku)</th></tr></thead><tbody>' +
        d.beredarPerJukir.map(function (r) { return '<tr><td>' + esc(r.Nama) + '</td><td class="num">' + fmtNum(r.Motor || 0) + '</td><td class="num">' + fmtNum(r.Mobil || 0) + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<div class="p-8">' + emptyState('inventory_2', 'Belum ada buku beredar', '') + '</div>') + '</div>';
  } catch (e) { if (S.adm.tab === 'stok' && $('#admMain')) m.innerHTML = errorCard(e, "dpGo('stok')"); }
}

// ════════════════════════════════════════════════════════
// REKAP SETORAN (per periode, dikelompokkan per ruas jalan)
// ════════════════════════════════════════════════════════
async function dpRekapSetoran() {
  const m = $('#admMain');
  m.innerHTML = '<div class="flex flex-wrap items-end gap-3 mb-5">' +
    '<div><label class="label" for="rkSetPeriode">Periode</label><div class="select-wrap"><select id="rkSetPeriode" class="input" onchange="dpRekapSetoranReload()">' +
    '<option value="harian">Harian</option><option value="mingguan">Mingguan</option><option value="bulanan" selected>Bulanan</option></select>' + ic('expand_more') + '</div></div>' +
    '<div><label class="label" for="rkSetTgl">Tanggal acuan</label><input id="rkSetTgl" class="input" type="date" value="' + new Date().toISOString().slice(0, 10) + '" onchange="dpRekapSetoranReload()"></div></div>' +
    '<div id="rkSetBody">' + admLoading() + '</div>';
  dpRekapSetoranReload();
}
async function dpRekapSetoranReload() {
  const box = $('#rkSetBody'); if (!box) return;
  box.innerHTML = admLoading();
  const periode = $('#rkSetPeriode').value, tgl = $('#rkSetTgl').value;
  try {
    const d = await dpAuthApi('getRekap', periode, tgl);
    if (S.adm.tab !== 'rekapSetoran' || !$('#rkSetBody')) return;
    box.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">' +
      statBox('Total Setoran', fmtRp(d.totalSetoran), d.mulai + ' s.d. ' + d.akhir) +
      statBox('Jumlah Transaksi', fmtNum(d.jumlahTransaksi)) + '</div>' +
      '<div class="card tbl-wrap">' + (d.rekapPerJalan && d.rekapPerJalan.length ?
        '<table class="tbl"><thead><tr><th>Ruas Jalan</th><th>Total Setoran</th><th>Transaksi</th></tr></thead><tbody>' +
        d.rekapPerJalan.map(function (g) { return '<tr><td>' + esc(g.namaJalan) + '</td><td class="num">' + fmtRp(g.totalSetoran) + '</td><td class="num">' + fmtNum(g.jumlahTransaksi) + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<div class="p-8">' + emptyState('payments', 'Belum ada setoran pada periode ini', '') + '</div>') + '</div>';
  } catch (e) { if (S.adm.tab === 'rekapSetoran' && $('#rkSetBody')) box.innerHTML = errorCard(e, 'dpRekapSetoranReload()'); }
}

// ════════════════════════════════════════════════════════
// REKAP KARCIS (potensi nilai karcis keluar vs setoran aktual)
// ════════════════════════════════════════════════════════
async function dpRekapKarcis() {
  const m = $('#admMain');
  m.innerHTML = '<div class="flex flex-wrap items-end gap-3 mb-5">' +
    '<div><label class="label" for="rkKarPeriode">Periode</label><div class="select-wrap"><select id="rkKarPeriode" class="input" onchange="dpRekapKarcisReload()">' +
    '<option value="harian">Harian</option><option value="mingguan">Mingguan</option><option value="bulanan" selected>Bulanan</option></select>' + ic('expand_more') + '</div></div>' +
    '<div><label class="label" for="rkKarTgl">Tanggal acuan</label><input id="rkKarTgl" class="input" type="date" value="' + new Date().toISOString().slice(0, 10) + '" onchange="dpRekapKarcisReload()"></div></div>' +
    '<div id="rkKarBody">' + admLoading() + '</div>';
  dpRekapKarcisReload();
}
async function dpRekapKarcisReload() {
  const box = $('#rkKarBody'); if (!box) return;
  box.innerHTML = admLoading();
  const periode = $('#rkKarPeriode').value, tgl = $('#rkKarTgl').value;
  try {
    const d = await dpAuthApi('getRekapKarcis', periode, tgl);
    if (S.adm.tab !== 'rekapKarcis' || !$('#rkKarBody')) return;
    box.innerHTML = '<p class="help mb-3">Periode ' + esc(d.mulai) + ' s.d. ' + esc(d.akhir) + ' — potensi dihitung dari jumlah lembar karcis keluar × tarif per jenis kendaraan.</p>' +
      '<div class="card tbl-wrap">' + (d.rekap && d.rekap.length ?
        '<table class="tbl"><thead><tr><th>Juru Parkir</th><th>Lembar Karcis</th><th>Potensi</th><th>Setoran</th><th>Selisih</th></tr></thead><tbody>' +
        d.rekap.map(function (r) {
          const warn = r.selisihRp > 0;
          return '<tr><td>' + esc(r.Nama) + '</td><td class="num">' + fmtNum(r.lembarKarcis) + '</td><td class="num">' + fmtRp(r.potensiRp) + '</td><td class="num">' + fmtRp(r.setoranRp) + '</td>' +
            '<td class="num" style="color:rgb(var(--' + (warn ? 'error' : 'on-surface-variant') + '))">' + fmtRp(r.selisihRp) + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<div class="p-8">' + emptyState('confirmation_number', 'Belum ada data pada periode ini', '') + '</div>') + '</div>';
  } catch (e) { if (S.adm.tab === 'rekapKarcis' && $('#rkKarBody')) box.innerHTML = errorCard(e, 'dpRekapKarcisReload()'); }
}

// ════════════════════════════════════════════════════════
// REKAP PENGADUAN / SANKSI / SURVEI (statistik ringkas)
// ════════════════════════════════════════════════════════
async function dpRekapPengaduan() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const d = await dpAuthApi('getRekapPengaduan');
    if (S.adm.tab !== 'rekapPengaduan' || !$('#admMain')) return;
    m.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">' + statBox('Total Pengaduan', fmtNum(d.total)) + '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Per Status</h2>' + dpKeyValList(d.perStatus) + '</div>' +
      '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Per Kategori</h2>' + dpKeyValList(d.perKategori) + '</div></div>';
  } catch (e) { if (S.adm.tab === 'rekapPengaduan' && $('#admMain')) m.innerHTML = errorCard(e, "dpGo('rekapPengaduan')"); }
}
async function dpRekapSanksi() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const d = await dpAuthApi('getRekapSanksi');
    if (S.adm.tab !== 'rekapSanksi' || !$('#admMain')) return;
    m.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">' + statBox('Total Sanksi', fmtNum(d.total)) + '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Per Jenis Sanksi</h2>' + dpKeyValList(d.perJenis) + '</div>' +
      '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Per Juru Parkir</h2>' + dpKeyValList(d.perJukir) + '</div></div>';
  } catch (e) { if (S.adm.tab === 'rekapSanksi' && $('#admMain')) m.innerHTML = errorCard(e, "dpGo('rekapSanksi')"); }
}
async function dpRekapSurvei() {
  const m = $('#admMain'); m.innerHTML = admLoading();
  try {
    const d = await dpAuthApi('getRekapSurvei');
    if (S.adm.tab !== 'rekapSurvei' || !$('#admMain')) return;
    const unsurLabel = { Nilai_Kemudahan: 'Kemudahan', Nilai_Keramahan: 'Keramahan', Nilai_Tarif: 'Kesesuaian Tarif', Nilai_Karcis: 'Karcis', Nilai_Keamanan: 'Keamanan' };
    const unsur = Object.keys(d.perUnsur || {});
    m.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">' + statBox('Jumlah Responden', fmtNum(d.jumlahResponden)) + statBox('Rata-rata Keseluruhan', d.rataRataKeseluruhan + ' / 5') + '</div>' +
      '<div class="card p-5"><h2 class="text-title-md text-primary font-bold mb-3">Rata-rata per Unsur</h2>' +
      (unsur.length ? '<ul class="flex flex-col gap-2">' + unsur.map(function (u) {
        return '<li class="flex justify-between text-body-sm"><span>' + esc(unsurLabel[u] || u) + '</span><span class="num font-semibold">' + esc(d.perUnsur[u]) + ' / 5</span></li>';
      }).join('') + '</ul>' : '<p class="text-body-sm text-on-surface-variant">Belum ada data.</p>') + '</div>';
  } catch (e) { if (S.adm.tab === 'rekapSurvei' && $('#admMain')) m.innerHTML = errorCard(e, "dpGo('rekapSurvei')"); }
}

// ════════════════════════════════════════════════════════
// TANDAI BUKU HABIS (Karcis Keluar)
// ════════════════════════════════════════════════════════
function dpTandaiHabis(id) {
  openModal({
    title: 'Tandai buku habis?', size: 'sm',
    body: '<p class="text-body-md">Buku karcis ini akan ditandai <strong>Habis</strong> — jukir yang bersangkutan perlu diberi buku baru lewat menu Karcis Keluar.</p>',
    foot: '<button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="button" class="btn btn-amber" id="thOk" data-id="' + esc(id) + '" onclick="dpTandaiHabisOk(this)">' + ic('inventory_2') + 'Tandai Habis</button>'
  });
}
async function dpTandaiHabisOk(btn) {
  setBusy(btn, true, 'Menyimpan…');
  try {
    await dpAuthApi('tandaiBukuHabis', btn.dataset.id);
    closeModal(); showToast('Berhasil', 'Status buku diperbarui.');
    if (S.adm.tab === 'karcisKeluar') dpEntity('karcisKeluar');
  } catch (er) { if (S.token) { setBusy(btn, false); showToast('Gagal', er.message, 'err'); } }
}

// ════════════════════════════════════════════════════════
// CETAK: KARTU TANDA ANGGOTA JURU PARKIR (ukuran kartu ID fisik + QR)
// ════════════════════════════════════════════════════════
function dpCetakKartu(id) {
  const j = (S.adm.rows.jukir || []).filter(function (r) { return r.ID_Jukir === id; })[0];
  if (!j) { showToast('Data tidak ditemukan', 'Muat ulang halaman ini.', 'err'); return; }
  const qrImg = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(j.QR_Value || '');
  const foto = j.Foto ? imgUrl(j.Foto, 300) : '';
  const win = window.open('', '_blank', 'width=480,height=720');
  if (!win) { showToast('Pop-up diblokir', 'Izinkan pop-up untuk mencetak kartu.', 'err'); return; }
  win.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Kartu Tanda Anggota - ' + esc(j.Nama) + '</title><style>' +
    '@page{size:85.6mm 54mm;margin:0} body{margin:0;font-family:"Segoe UI",Arial,sans-serif}' +
    '.card{width:85.6mm;height:54mm;box-sizing:border-box;padding:4mm;background:linear-gradient(135deg,#0F2B5C,#15386b);color:#fff;display:flex;flex-direction:column;justify-content:space-between}' +
    '.hd b{font-size:9px;line-height:1.3}' +
    '.bd{display:flex;gap:3mm;align-items:center}' +
    '.foto{width:16mm;height:20mm;object-fit:cover;border-radius:2px;background:rgba(255,255,255,.15);flex-shrink:0}' +
    '.info b{font-size:10px;display:block} .info span{font-size:7px;opacity:.9;display:block;margin-top:1mm}' +
    '.qr{width:16mm;height:16mm;background:#fff;border-radius:2px;padding:1mm;margin-left:auto}' +
    '.ft{font-size:6px;opacity:.8;text-align:center}' +
    '</style></head><body onload="setTimeout(function(){window.print();},300)"><div class="card">' +
    '<div class="hd"><b>KARTU TANDA ANGGOTA<br>JURU PARKIR</b></div>' +
    '<div class="bd">' + (foto ? '<img class="foto" src="' + esc(foto) + '">' : '<div class="foto"></div>') +
    '<div class="info"><b>' + esc(j.Nama) + '</b><span>No. Reg: ' + esc(j.No_Registrasi || '-') + '</span><span>Lokasi: ' + esc(j.Nama_Lokasi || '-') + '</span><span>Berlaku s.d.: ' + esc(fmtTgl(j.Masa_Berlaku)) + '</span></div>' +
    '<img class="qr" src="' + esc(qrImg) + '"></div>' +
    '<div class="ft">Dinas Perhubungan Kota Balikpapan — DISPAKOT</div>' +
    '</div></body></html>'
  );
  win.document.close();
}

// ════════════════════════════════════════════════════════
// CETAK: BAST KARCIS (Masuk & Keluar)
// ════════════════════════════════════════════════════════
function dpCetakBast_(o) {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) { showToast('Pop-up diblokir', 'Izinkan pop-up untuk mencetak BAST.', 'err'); return; }
  win.document.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(o.judul) + '</title><style>' +
    'body{font-family:"Segoe UI",Arial,sans-serif;font-size:13px;color:#111;max-width:720px;margin:24px auto;line-height:1.6}' +
    'h1{font-size:16px;text-align:center;text-transform:uppercase;margin-bottom:2px}.sub{text-align:center;font-size:12px;margin-bottom:20px}' +
    'table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:4px 8px;vertical-align:top}td.k{width:200px;color:#444}' +
    '.ttd{display:flex;justify-content:space-between;margin-top:40px}.ttd div{width:45%;text-align:center}' +
    '.ttd .line{margin-top:60px;border-top:1px solid #111;padding-top:4px;font-weight:600}' +
    '</style></head><body onload="setTimeout(function(){window.print();},300)">' +
    '<h1>' + esc(o.judul) + '</h1><div class="sub">Dinas Perhubungan Kota Balikpapan — DISPAKOT<br>Nomor: ' + esc(o.nomor || '-') + ' &nbsp;|&nbsp; Tanggal: ' + esc(fmtTgl(o.tanggal)) + '</div>' +
    '<table>' + o.rows.map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '</td><td>: ' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' +
    '<div class="ttd"><div>' + esc(o.pihak1.peran) + '<div class="line">' + esc(o.pihak1.nama || '-') + '<br><span style="font-weight:400;font-size:11px">' + esc(o.pihak1.jabatan || '') + '</span></div></div>' +
    '<div>' + esc(o.pihak2.peran) + '<div class="line">' + esc(o.pihak2.nama || '-') + '<br><span style="font-weight:400;font-size:11px">' + esc(o.pihak2.jabatan || '') + '</span></div></div></div>' +
    '</body></html>'
  );
  win.document.close();
}
function dpCetakBastMasuk(id) {
  const r = (S.adm.rows.karcisMasuk || []).filter(function (x) { return x.ID_KarcisMasuk === id; })[0];
  if (!r) { showToast('Data tidak ditemukan', 'Muat ulang halaman ini.', 'err'); return; }
  dpCetakBast_({
    judul: 'Berita Acara Serah Terima Karcis Parkir', nomor: r.No_BAST, tanggal: r.Tanggal,
    rows: [['Jenis Karcis', r.Jenis_Karcis], ['Jumlah Buku', fmtNum(r.Jumlah_Buku) + ' buku'], ['No. Seri', (r.No_Seri_Awal || '-') + ' s.d. ' + (r.No_Seri_Akhir || '-')], ['Keterangan', r.Keterangan || '-']],
    pihak1: { peran: 'PIHAK PERTAMA (Penyerah)', nama: r.Nama_Penyerah, jabatan: r.Jabatan_Penyerah },
    pihak2: { peran: 'PIHAK KEDUA (Penerima)', nama: r.Nama_Penerima, jabatan: r.Jabatan_Penerima }
  });
}
function dpCetakBastKeluar(id) {
  const r = (S.adm.rows.karcisKeluar || []).filter(function (x) { return x.ID_KarcisKeluar === id; })[0];
  if (!r) { showToast('Data tidak ditemukan', 'Muat ulang halaman ini.', 'err'); return; }
  const fallback = function (p) {
    dpCetakBast_({
      judul: 'Berita Acara Serah Terima Karcis Parkir', nomor: r.No_BAST, tanggal: r.Tanggal,
      rows: [['Diserahkan kepada', r.Nama_Jukir || r.ID_Jukir], ['Jenis Karcis', r.Jenis_Karcis], ['Jumlah Buku', fmtNum(r.Jumlah_Buku) + ' buku'],
      ['No. Seri', (r.No_Seri_Awal || '-') + ' s.d. ' + (r.No_Seri_Akhir || '-')], ['Status', r.Status_Buku], ['Keterangan', r.Keterangan || '-']],
      pihak1: { peran: 'PIHAK PERTAMA (Penyerah)', nama: r.Nama_Penyerah || (p && p.Nama_Pejabat) || '-', jabatan: (p && p.Nama_Jabatan) || '-' },
      pihak2: { peran: 'PIHAK KEDUA (Penerima)', nama: r.Nama_Jukir || '-', jabatan: 'Juru Parkir' }
    });
  };
  dpAuthApi('getPengaturan').then(fallback).catch(function () { fallback(null); });
}
