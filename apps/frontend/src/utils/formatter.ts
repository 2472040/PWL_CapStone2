export const fmtRp = (n: number): string => 'Rp ' + n.toLocaleString('id-ID');

export const fmtRpShort = (n: number): string => {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1) + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n;
};
