// Konstanta alur bisnis (dipakai server & client).
export const ROLES = {
  PUSAT: 'Manajemen Pusat (Direktur / VP Komersial)',
  COE: 'Unit CoE (VP CoE)',
  OPERASIONAL: 'Unit Operasional (Kepala Cabang)',
  LAPANGAN: 'User Lapangan (PM / Inspektor)',
} as const;
export type Role = keyof typeof ROLES;

// Approval berjenjang dokumen keuangan: Kacab -> VP CoE -> Cabang Komersial -> Direksi
export const DOC_STEPS = [
  { status: 'Review Kacab', label: 'Kacab', role: 'OPERASIONAL' },
  { status: 'Review VP CoE', label: 'VP CoE', role: 'COE' },
  { status: 'Review Cabang Komersial', label: 'Cab. Komersial', role: 'OPERASIONAL' },
  { status: 'Review Direksi', label: 'Direksi', role: 'PUSAT' },
] as const;
export const DOC_APPROVED = 'Approved Direksi';
export const JENIS_DOKUMEN = ['RAB', 'Dropping', 'BDD', 'PAD', 'Invoice'] as const;
export const JENIS_DESC: Record<string, string> = {
  RAB: 'Rencana Anggaran Biaya — batas budget pelaksanaan proyek.',
  Dropping: 'Pengajuan dana modal awal sebelum pekerjaan dimulai, wajib LPJ.',
  BDD: 'Biaya Dibayar di Muka — biaya operasional yang dikeluarkan lebih awal.',
  PAD: 'Pendapatan Akan Diterima — hak pendapatan yang pembayarannya masih ditangguhkan.',
  Invoice: 'Tagihan resmi (piutang) saat termin/tahap pekerjaan selesai.',
};
