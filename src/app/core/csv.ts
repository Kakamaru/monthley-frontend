/**
 * Penulisan CSV — peraturan escape di SATU tempat.
 *
 * Nilai yang mengandungi koma, petikan atau baris baharu mesti
 * dibalut dan petikannya digandakan. Nama akaun seperti
 * 'Koperabar Enterprise, Sdn Bhd' memecahkan lajur secara SENYAP
 * tanpa ini — fail terbuka, tetapi turus bergeser.
 *
 * Skrin Dokumen Kewangan menulis CSV dengan helper tempatan; skrin
 * Produk memerlukan yang sama. Dua salinan peraturan escape akan
 * menyimpang (guard 6).
 */

/** Balut nilai kalau ia mengandungi aksara yang memecahkan CSV. */
export function petikCsv(v: unknown): string {
  const t = String(v ?? '');
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * Bina fail CSV lengkap.
 *
 * BOM UTF-8 di hadapan: Excel di Windows membaca CSV sebagai ANSI
 * tanpanya, dan nama dengan aksara bukan-ASCII menjadi sampah.
 *
 * CRLF, bukan LF — Excel versi lama memaparkan keseluruhan fail pada
 * satu baris dengan LF sahaja.
 */
export function binaCsv(kepala: string[], baris: unknown[][]): string {
  const isi = baris.map(r => r.map(petikCsv).join(','));
  return '\ufeff' + [kepala.map(petikCsv).join(','), ...isi].join('\r\n');
}

/** Muat turun teks sebagai fail. Nama dibersihkan daripada aksara laluan. */
export function muatTurunCsv(namaFail: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFail.replace(/[^A-Za-z0-9.\-_]/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
