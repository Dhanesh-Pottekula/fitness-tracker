export function formatINR(value: number, options: { compact?: boolean; signed?: boolean } = {}) {
  const sign = options.signed && value > 0 ? '+' : '';
  const rounded = Math.round(value);

  if (options.compact) {
    const abs = Math.abs(rounded);
    if (abs >= 100000) return `${sign}₹${(rounded / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}₹${(rounded / 1000).toFixed(1)}K`;
  }

  return `${sign}₹${rounded.toLocaleString('en-IN')}`;
}
