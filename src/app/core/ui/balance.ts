/**
 * Peraturan paparan baki — SATU tempat (ADR 0009, cara-kerja guard 6).
 *
 * Baki boleh negatif. Negatif bermakna pelanggan ada KREDIT, bukan ralat:
 *   positif  → ada hutang        → merah
 *   sifar    → lunas             → hijau
 *   negatif  → ada kredit        → hijau
 *
 * Merah untuk sifar atau negatif bercanggah — SP nampak amaran sedangkan
 * keadaan baik.
 */

export function balanceColor(v: number | null | undefined): string {
  return (v ?? 0) > 0 ? 'var(--red)' : 'var(--green)';
}

/** Baki negatif dipapar dalam kurungan, ikut konvensyen perakaunan. */
export function balanceText(v: number | null | undefined, currency = 'MYR'): string {
  const n = v ?? 0;
  const abs = Math.abs(n).toLocaleString('en-MY', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  return n < 0 ? `(${currency} ${abs})` : `${currency} ${abs}`;
}

/** Untuk jumlah tunggakan: kredit tidak mengurangkan hutang orang lain. */
export function arrearsOnly(v: number | null | undefined): number {
  return Math.max(0, v ?? 0);
}
