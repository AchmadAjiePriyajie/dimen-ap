import { prisma } from './db';

// Catat transaksi lintas sistem (simulasi). BigInt dikonversi ke number agar bisa disimpan sebagai JSON.
export async function erpLog(sumber: string, tujuan: string, event: string, payload: Record<string, unknown>) {
  const json = JSON.parse(JSON.stringify(payload, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
  await prisma.erpLog.create({ data: { sumber, tujuan, event, payload: json } });
}

export const erpName = (statusErp: string) => (statusErp.includes('Oracle') ? 'Oracle ERP' : 'SAP ERP');
