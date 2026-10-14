export type TripStatus = 'draft' | 'planned' | 'ongoing' | 'completed' | 'cancelled';
export function tripStatus(start: string, end: string, today = new Date().toISOString().slice(0, 10)): TripStatus {
  if (end < today) return 'completed';
  if (start <= today && today <= end) return 'ongoing';
  return 'planned';
}
export type Activity = { id: number; dayId: number; name: string; start: string; duration: number; location: string; category: string; cost: number; notes: string };
export function findOverlaps(input: Pick<Activity, 'start' | 'duration'>, existing: Pick<Activity, 'start' | 'duration'>[]) {
  const start = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  const a = start(input.start), b = a + input.duration;
  return existing.some(item => { const c = start(item.start), d = c + item.duration; return a < d && c < b; });
}
export function equalShares(total: number, people: string[]) {
  if (people.length < 2) throw new Error('Choose at least two travelers.');
  const cents = Math.round(total * 100), each = Math.floor(cents / people.length);
  return people.map((person, index) => ({ person, amount: (each + (index < cents % people.length ? 1 : 0)) / 100 }));
}
export function percentageShares(total: number, parts: { person: string; percentage: number }[]) {
  if (Math.abs(parts.reduce((sum, p) => sum + p.percentage, 0) - 100) > 0.001) throw new Error('Percentages must add up to 100%.');
  const cents = Math.round(total * 100);
  let assigned = 0;
  return parts.map((p, i) => { const amount = i === parts.length - 1 ? cents - assigned : Math.round(cents * p.percentage / 100); assigned += amount; return { person: p.person, amount: amount / 100 }; });
}
export function settlements(balances: Record<string, number>) {
  const debtors = Object.entries(balances).filter(([, v]) => v < -0.005).map(([person, v]) => ({ person, amount: -v }));
  const creditors = Object.entries(balances).filter(([, v]) => v > 0.005).map(([person, v]) => ({ person, amount: v }));
  const result: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    result.push({ from: debtors[i].person, to: creditors[j].person, amount: Math.round(amount * 100) / 100 });
    debtors[i].amount -= amount; creditors[j].amount -= amount;
    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }
  return result;
}
