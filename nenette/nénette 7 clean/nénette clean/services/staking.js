export const stakingPools = [
  { name: "Bronze", lock: "30 Days", apr: 5, status: "Planned" },
  { name: "Silver", lock: "90 Days", apr: 10, status: "Planned" },
  { name: "Gold", lock: "180 Days", apr: 15, status: "Planned" },
  { name: "Diamond", lock: "365 Days", apr: 20, status: "Planned" }
];

export function estimateRewards(amount, apr) {
  const principal = Number(amount);
  const rate = Number(apr);
  if (!principal || principal <= 0) return 0;
  return principal * rate / 100;
}
