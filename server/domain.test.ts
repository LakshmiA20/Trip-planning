import { describe, expect, it } from 'vitest';
import { equalShares, findOverlaps, percentageShares, settlements, tripStatus } from './domain.js';

describe('trip lifecycle', () => {
  it('derives planned, ongoing and completed from trip dates', () => {
    expect(tripStatus('2026-11-02','2026-11-04','2026-10-14')).toBe('planned');
    expect(tripStatus('2026-10-14','2026-10-18','2026-10-14')).toBe('ongoing');
    expect(tripStatus('2026-10-10','2026-10-13','2026-10-14')).toBe('completed');
  });
});

describe('itinerary overlap rule', () => {
  const existing = [{start:'09:00',duration:90}];
  it('detects intersecting activities and permits back-to-back plans', () => {
    expect(findOverlaps({start:'10:00',duration:45},existing)).toBe(true);
    expect(findOverlaps({start:'10:30',duration:30},existing)).toBe(false);
  });
});

describe('expense sharing and minimum settlements', () => {
  it('splits cents fairly across equal shares', () => {
    expect(equalShares(100,['A','B','C']).map(s=>s.amount)).toEqual([33.34,33.33,33.33]);
  });
  it('validates percentage totals and preserves the total', () => {
    expect(percentageShares(240,[{person:'A',percentage:25},{person:'B',percentage:75}]).map(s=>s.amount)).toEqual([60,180]);
    expect(()=>percentageShares(100,[{person:'A',percentage:60}])).toThrow(/100/);
  });
  it('minimizes transfers for net balances', () => {
    expect(settlements({A:-40,B:-60,C:100})).toEqual([{from:'A',to:'C',amount:40},{from:'B',to:'C',amount:60}]);
  });
});
