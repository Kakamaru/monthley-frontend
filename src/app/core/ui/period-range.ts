/**
 * Tempoh yang dibilkan, sebagai teks — SATU tempat (cara-kerja guard 6).
 *
 * Dua skrin melaporkan penjanaan bil: Jana Bil (pukal) dan Generate
 * Single Invoice. Kedua-duanya menghadapi masalah yang sama.
 *
 * BULAN LARIAN BUKAN TEMPOH INVOIS. Postpaid pada Julai membilkan Jun;
 * melaporkan 'Julai' memberitahu kerani sesuatu yang tidak muncul pada
 * mana-mana invois.
 *
 * MENYENARAIKAN SEMUA TIDAK BOLEH. Akaun YEAR dengan produk MONTHLY
 * menghasilkan dua belas tempoh dalam satu larian, dan dengan dua
 * produk, dua puluh empat. Julat kekal pendek tidak kira berapa banyak.
 *
 * Senarai dijangka sudah tersusun ikut masa — backend menyusunnya ikut
 * fi_period.start_dt.
 */
export function periodRange(periods: string[] | undefined | null,
                            fallback = ''): string {
  if (!periods?.length) return fallback;
  if (periods.length === 1) return periods[0];
  return `${periods[0]} – ${periods[periods.length - 1]}`;
}
