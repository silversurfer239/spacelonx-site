export function fmt(value, maxDecimals = 8) {
  if (value === undefined || value === null || value === "") return "N/A";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (num === 0) return "0";
  if (num < 0.0001) return num.toExponential(3);
  return num.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

export function usd(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "$N/A";
  if (num < 0.01) return "$" + num.toFixed(8);
  return "$" + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function shortTime(iso) {
  try { return new Date(iso).toLocaleTimeString(); } catch { return "N/A"; }
}

export function shortAddress(address) {
  if (!address) return "N/A";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
