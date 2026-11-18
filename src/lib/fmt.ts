type Num = bigint | number | null | undefined;

export const rp = (n: Num) => 'Rp ' + Number(n ?? 0).toLocaleString('id-ID');

export const rpShort = (n: Num) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1e12) return `Rp ${(v / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 })} T`;
  if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
  return rp(v);
};

export const tgl = (d: Date) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
