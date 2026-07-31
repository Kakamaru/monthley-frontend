/**
 * Tarikh tempatan sebagai rentetan ISO — TANPA melalui UTC.
 *
 * `new Date().toISOString()` menukar ke UTC dahulu. Malaysia ialah UTC+8,
 * jadi apa-apa antara 00:00 dan 08:00 waktu tempatan jatuh ke HARI
 * SEBELUMNYA:
 *
 *   1 Ogos 2026, 02:13 MYT -> 2026-07-31T18:13Z -> "2026-07-31"
 *
 * Ditemui 1 Ogos 2026 pukul 2 pagi: Manual Payment melalaikan tarikh
 * kepada 31 Julai. doc_date resit ialah tarikh DUIT DITERIMA dan mesti
 * tally dengan penyata bank, jadi setiap resit yang dimasukkan antara
 * tengah malam dan 8 pagi jatuh ke kutipan hari yang salah.
 *
 * Skrin Jana Bil lebih teruk lagi: pada 1 haribulan pagi ia melalaikan
 * period kepada BULAN SEBELUMNYA — tepat pada hari SP biasanya menjana
 * bil.
 *
 * Satu tempat, bukan lapan (guard 6).
 */

/** `YYYY-MM-DD` mengikut zon waktu tempatan. */
export function tarikhIso(d: Date = new Date()): string {
  const b = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${b}-${h}`;
}

/** `YYYY-MM` mengikut zon waktu tempatan. */
export function bulanIso(d: Date = new Date()): string {
  return tarikhIso(d).slice(0, 7);
}
