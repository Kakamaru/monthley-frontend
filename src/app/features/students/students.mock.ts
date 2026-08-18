/**
 * Data contoh untuk mockup Pengurusan Pelajar.
 *
 * MOCKUP SAHAJA — tiada backend di sebalik skrin ini lagi. Data hidup di
 * sini supaya skrin boleh ditunjukkan dan dibincangkan sebelum skema
 * ditetapkan; menyimpannya dalam DB terlebih dahulu bermakna migrasi
 * ditulis untuk bentuk yang belum diputuskan.
 */

export interface Student {
  no: string; name: string; ic: string;
  form: string; klass: string;
  dob: string; gender: 'L' | 'P';
  address: string;
  /**
   * Penjaga 1 wajib; penjaga 2 pilihan.
   *
   * Borang legacy meminta dua penjaga secara berasingan kerana sekolah
   * memerlukan dua nombor untuk dihubungi semasa kecemasan — satu medan
   * 'penjaga' bermakna nombor kedua hilang.
   */
  guardian: string; guardianPhone: string;
  g1Ic?: string; g1Addr?: string;
  g2Name?: string; g2Phone?: string; g2Addr?: string;
  g2SameAddr?: boolean;
  status: 'Aktif' | 'Berhenti' | 'Tamat Pengajian';
  billAcct: string; products: string;
  health: string; enrol: string;
}

export interface SchoolClass {
  klass: string; form: string; teacher: string;
  count: number; cap: number; room: string;
}

export const KELAS: SchoolClass[] = [
  { klass: '1 Amanah',  form: 'Darjah 1', teacher: 'Pn. Halimah Saadiah', count: 3, cap: 35, room: 'BK-12' },
  { klass: '2 Bestari', form: 'Darjah 2', teacher: 'En. Ganesh Kumar',    count: 3, cap: 35, room: 'BK-08' },
  { klass: '3 Cerdik',  form: 'Darjah 3', teacher: 'Pn. Siti Rahayu',     count: 2, cap: 30, room: 'BK-05' },
  { klass: '4 Dinamik', form: 'Darjah 4', teacher: 'En. Zulkifli Hassan', count: 2, cap: 30, room: 'BK-03' },
  { klass: '5 Ehsan',   form: 'Darjah 5', teacher: 'Pn. Noraini Yusof',   count: 2, cap: 30, room: 'BK-01' }
];

/**
 * Sembilan mata pelajaran KAFA mengikut format UPKK.
 *
 * `jenis` disimpan kerana kaedah pentaksiran berbeza dan itu menentukan
 * bagaimana markah dikumpul: Lisan dan Amali dinilai semasa sesi, Bertulis
 * melalui kertas, dan Berterusan sepanjang penggal. Menyimpan nama sahaja
 * bermakna maklumat itu hilang dan setiap skrin perlu mengekodkannya
 * semula.
 *
 * `pendek` untuk lajur jadual — nama penuh memecahkan susun atur slip
 * kelas yang mempunyai sembilan lajur.
 */
export interface Subjek {
  nama: string;
  pendek: string;
  jenis: 'Lisan' | 'Bertulis' | 'Amali' | 'Berterusan';
}

export const SUBJEK: Subjek[] = [
  { nama: 'Al-Quran (Lisan / Tilawah)',              pendek: 'Quran',  jenis: 'Lisan' },
  { nama: 'Akidah',                                   pendek: 'Akidah', jenis: 'Bertulis' },
  { nama: 'Sirah',                                    pendek: 'Sirah',  jenis: 'Bertulis' },
  { nama: 'Adab / Akhlak Islamiah',                   pendek: 'Adab',   jenis: 'Bertulis' },
  { nama: 'Jawi dan Khat',                            pendek: 'Jawi',   jenis: 'Bertulis' },
  { nama: 'Bahasa Arab / Asas Lughatul Quran',        pendek: 'Arab',   jenis: 'Bertulis' },
  { nama: 'Ibadah',                                   pendek: 'Ibadah', jenis: 'Bertulis' },
  { nama: 'Penghayatan Cara Hidup Islam (PCHI)',      pendek: 'PCHI',   jenis: 'Berterusan' },
  { nama: 'Amali Solat',                              pendek: 'Solat',  jenis: 'Amali' }
];

export const PENGGAL = [
  'Penilaian Pertengahan Tahun', 'Penilaian Akhir Tahun'
];

/**
 * Pangkat mengikut MARKAH, bukan tahap.
 *
 * Diterbitkan daripada slip sebenar SRITI: 26 dan 35 → Musaadah; 40, 47,
 * 52 → Maqbul; 70, 74 → Jayyid; 76, 80 → Jayyid Jiddan. Bahagian
 * berwajaran pada slip yang sama menepati skala ini (55.5% → Maqbul,
 * 76% → Jayyid Jiddan, 92% → Mumtaz, 73.2% → Jayyid).
 *
 * Sempadan tepat (59/60, 74/75, 89/90) ialah anggaran daripada sembilan
 * titik data — sahkan dengan sekolah sebelum digunakan untuk slip rasmi.
 */
export interface Pangkat {
  min: number; max: number; nama: string; bg: string; c: string;
}

export const PANGKAT: Pangkat[] = [
  { min: 90, max: 100, nama: 'MUMTAZ',        bg: '#e0f5ea', c: '#0f7a52' },
  { min: 75, max: 89,  nama: 'JAYYID JIDDAN', bg: '#e7f6ec', c: '#128a41' },
  { min: 60, max: 74,  nama: 'JAYYID',        bg: '#eef4ff', c: '#2a6fdb' },
  { min: 40, max: 59,  nama: 'MAQBUL',        bg: '#fdf9e6', c: '#a3891f' },
  { min: 0,  max: 39,  nama: 'MUSAADAH',      bg: '#fdf0e6', c: '#c26a1f' }
];

export function pangkatBagi(markah: number): Pangkat {
  return PANGKAT.find(p => markah >= p.min && markah <= p.max) ?? PANGKAT[PANGKAT.length - 1];
}

/**
 * Komponen berwajaran pada slip.
 *
 * Markah mata pelajaran hanya 40% daripada keseluruhan. Baki datang
 * daripada hafazan, adab, dan penilaian ibu bapa — sekolah menilai lebih
 * daripada apa yang muncul dalam kertas peperiksaan.
 */
export interface Komponen { nama: string; wajaran: number; }

export const KOMPONEN: Komponen[] = [
  { nama: 'Subjek',              wajaran: 40 },
  { nama: 'Hafazan & Tilawah',   wajaran: 25 },
  { nama: 'Adab & Tarbiyyah',    wajaran: 25 },
  { nama: 'Ibubapa',             wajaran: 10 }
];

export const PELAJAR: Student[] = [
  { no: 'STU-0001', name: 'Ahmad Danish Haikal', ic: '120504-10-1123',
    form: 'Darjah 1', klass: '1 Amanah', dob: '04/05/2012', gender: 'L',
    address: 'No. 12, Jln Melur 3/2, Shah Alam, Selangor',
    guardian: 'Ahmad Faizal bin Ismail', guardianPhone: '012-3456789',
    status: 'Aktif', billAcct: 'ACC-1001',
    products: 'Yuran Bulanan · Bas Sekolah', health: 'Alahan kacang',
    enrol: '02/01/2024' },
  { no: 'STU-0002', name: 'Nur Batrisyia Qaisara', ic: '120812-14-2244',
    form: 'Darjah 1', klass: '1 Amanah', dob: '12/08/2012', gender: 'P',
    address: 'No. 5, Jln Kenanga 7, Klang, Selangor',
    guardian: 'Kamarul Ariffin', guardianPhone: '013-2244556',
    status: 'Aktif', billAcct: 'ACC-1002',
    products: 'Yuran Bulanan', health: '—', enrol: '02/01/2024' },
  { no: 'STU-0003', name: 'Muhammad Rayyan Adam', ic: '110320-10-3391',
    form: 'Darjah 2', klass: '2 Bestari', dob: '20/03/2011', gender: 'L',
    address: 'No. 88, Jln Mawar 2, Petaling Jaya',
    guardian: 'Ahmad Ridzuan bin Halim', guardianPhone: '019-7788221',
    status: 'Aktif', billAcct: 'ACC-1003',
    products: 'Yuran Bulanan · Bas Sekolah · Asrama', health: 'Asma',
    enrol: '05/01/2023' },
  { no: 'STU-0004', name: 'Nur Qaseh Eliya', ic: '110705-08-1177',
    form: 'Darjah 2', klass: '2 Bestari', dob: '05/07/2011', gender: 'P',
    address: 'No. 21, Jln Cempaka, Subang Jaya',
    guardian: 'Mohd Faiz bin Rahman', guardianPhone: '012-9001234',
    status: 'Aktif', billAcct: 'ACC-1004',
    products: 'Yuran Bulanan', health: '—', enrol: '05/01/2023' },
  { no: 'STU-0005', name: 'Aisyah Humaira', ic: '100211-10-4402',
    form: 'Darjah 3', klass: '3 Cerdik', dob: '11/02/2010', gender: 'P',
    address: 'No. 3, Jln Anggerik 5, Puchong',
    guardian: 'Rosli bin Ahmad', guardianPhone: '017-3344556',
    status: 'Aktif', billAcct: 'ACC-1005',
    products: 'Yuran Bulanan', health: '—', enrol: '03/01/2022' },
  { no: 'STU-0006', name: 'Muhammad Irfan Danial', ic: '100918-14-5513',
    form: 'Darjah 3', klass: '3 Cerdik', dob: '18/09/2010', gender: 'L',
    address: 'No. 45, Jln Teratai, Kajang',
    guardian: 'Norhayati binti Osman', guardianPhone: '011-22334455',
    status: 'Aktif', billAcct: 'ACC-1006',
    products: 'Yuran Bulanan · Bas Sekolah', health: '—', enrol: '03/01/2022' },
  { no: 'STU-0007', name: 'Siti Nur Aleya', ic: '090612-10-6624',
    form: 'Darjah 4', klass: '4 Dinamik', dob: '12/06/2009', gender: 'P',
    address: 'No. 9, Jln Dahlia 2, Seri Kembangan',
    guardian: 'Azman bin Yusof', guardianPhone: '012-7788990',
    status: 'Aktif', billAcct: 'ACC-1007',
    products: 'Yuran Bulanan', health: '—', enrol: '04/01/2021' },
  { no: 'STU-0008', name: 'Muhammad Adam Hakim', ic: '090103-08-7735',
    form: 'Darjah 4', klass: '4 Dinamik', dob: '03/01/2009', gender: 'L',
    address: 'No. 17, Jln Kemuning, Cyberjaya',
    guardian: 'Suhaimi bin Daud', guardianPhone: '019-1122334',
    status: 'Berhenti', billAcct: 'ACC-1008',
    products: '—', health: '—', enrol: '04/01/2021' },
  { no: 'STU-0009', name: 'Nurul Ain Sofiya', ic: '080722-10-8846',
    form: 'Darjah 5', klass: '5 Ehsan', dob: '22/07/2008', gender: 'P',
    address: 'No. 30, Jln Melati 8, Bangi',
    guardian: 'Ismail bin Karim', guardianPhone: '013-9988776',
    status: 'Aktif', billAcct: 'ACC-1009',
    products: 'Yuran Bulanan · Asrama', health: '—', enrol: '05/01/2020' },
  { no: 'STU-0010', name: 'Muhammad Luqman Hakim', ic: '080415-14-9957',
    form: 'Darjah 5', klass: '5 Ehsan', dob: '15/04/2008', gender: 'L',
    address: 'No. 62, Jln Seroja, Nilai',
    guardian: 'Zainab binti Hamid', guardianPhone: '016-4455667',
    status: 'Tamat Pengajian', billAcct: 'ACC-1010',
    products: '—', health: '—', enrol: '05/01/2020' },
  { no: 'STU-0011', name: 'Nurul Iman Sofea', ic: '120115-10-1156',
    form: 'Darjah 1', klass: '1 Amanah', dob: '15/01/2012', gender: 'P',
    address: 'No. 7, Jln Bunga Raya, Bangi, Selangor',
    guardian: 'Shahrul Nizam', guardianPhone: '012-1122334',
    status: 'Aktif', billAcct: 'ACC-1011',
    products: 'Yuran Bulanan', health: '—', enrol: '02/01/2024' },
  { no: 'STU-0012', name: 'Muhammad Zharfan Hakimi', ic: '110428-08-1267',
    form: 'Darjah 2', klass: '2 Bestari', dob: '28/04/2011', gender: 'L',
    address: 'No. 14, Jln Seri Kembangan, Serdang',
    guardian: 'Hafizuddin bin Latif', guardianPhone: '016-5544332',
    status: 'Aktif', billAcct: 'ACC-1012',
    products: 'Yuran Bulanan · Bas Sekolah', health: '—', enrol: '05/01/2023' }
];

export function inisial(nama: string): string {
  const p = nama.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}

export function warnaStatus(s: string): { bg: string; c: string } {
  switch (s) {
    case 'Aktif':           return { bg: '#e7f6ec', c: '#128a41' };
    case 'Berhenti':        return { bg: '#fdecec', c: '#d64545' };
    case 'Tamat Pengajian': return { bg: '#eef4ff', c: '#2a6fdb' };
    default:                return { bg: '#f1f5f2', c: '#6b7f86' };
  }
}


/** Guru kelas bagi satu kelas — untuk slip penilaian. */
export function guruKelas(klass: string): string {
  return KELAS.find(k => k.klass === klass)?.teacher ?? '—';
}

