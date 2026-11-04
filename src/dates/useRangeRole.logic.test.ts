import {describe, it, expect} from 'vitest';
import {applyRangeRole, rangeRoleBounds, rangeSentence} from './useRangeRole';
import type {DateRange} from './dateTypes';

const value: DateRange = {start: '2026-07-09', end: '2026-07-15'};

describe('rangeRoleBounds', () => {
  it('passes the caller bounds through with no role', () => {
    expect(rangeRoleBounds(undefined, value, '2026-07-01', '2026-07-31')).toEqual({min: '2026-07-01', max: '2026-07-31'});
  });

  it('stops a start role at the value end, and an end role at the value start', () => {
    expect(rangeRoleBounds('start', value, '2026-07-01', '2026-07-31')).toEqual({min: '2026-07-01', max: '2026-07-15'});
    expect(rangeRoleBounds('end', value, '2026-07-01', '2026-07-31')).toEqual({min: '2026-07-09', max: '2026-07-31'});
  });

  it('bounds a role with no caller bounds by the other end alone', () => {
    expect(rangeRoleBounds('start', value, undefined, undefined)).toEqual({min: undefined, max: '2026-07-15'});
    expect(rangeRoleBounds('end', value, undefined, undefined)).toEqual({min: '2026-07-09', max: undefined});
  });

  it('keeps the caller bounds on an empty value', () => {
    expect(rangeRoleBounds('start', undefined, '2026-07-01', undefined)).toEqual({min: '2026-07-01', max: undefined});
    expect(rangeRoleBounds('end', null, undefined, '2026-07-31')).toEqual({min: undefined, max: '2026-07-31'});
  });

  it('never crosses the bounds when the other end sits outside the caller bounds', () => {
    // The value ends before min: bounding the start role by it would disable every day.
    expect(rangeRoleBounds('start', value, '2026-07-20', undefined)).toEqual({min: '2026-07-20', max: undefined});
    // The value starts after max: the same for the end role.
    expect(rangeRoleBounds('end', value, undefined, '2026-07-01')).toEqual({min: undefined, max: '2026-07-01'});
  });

  it('accepts the other end on a bound itself', () => {
    expect(rangeRoleBounds('start', value, '2026-07-15', undefined)).toEqual({min: '2026-07-15', max: '2026-07-15'});
  });
});

describe('applyRangeRole', () => {
  it('gives a one-day range on an empty value', () => {
    expect(applyRangeRole('start', '2026-07-12', undefined)).toEqual({start: '2026-07-12', end: '2026-07-12'});
    expect(applyRangeRole('end', '2026-07-12', null)).toEqual({start: '2026-07-12', end: '2026-07-12'});
  });

  it('moves only its own end', () => {
    expect(applyRangeRole('start', '2026-07-01', value)).toEqual({start: '2026-07-01', end: '2026-07-15'});
    expect(applyRangeRole('end', '2026-08-02', value)).toEqual({start: '2026-07-09', end: '2026-08-02'});
  });

  it('gives a one-day range, never a reversed one, on a click past the other end', () => {
    expect(applyRangeRole('start', '2026-07-20', value)).toEqual({start: '2026-07-20', end: '2026-07-20'});
    expect(applyRangeRole('end', '2026-07-01', value)).toEqual({start: '2026-07-01', end: '2026-07-01'});
  });

  it('keeps a one-day range on a click on the other end', () => {
    expect(applyRangeRole('start', '2026-07-15', value)).toEqual({start: '2026-07-15', end: '2026-07-15'});
  });
});

describe('rangeSentence', () => {
  it('reads both ends in the long form', () => {
    const s = rangeSentence(value);
    expect(s).toContain(' to ');
    expect(s).toContain('2026');
  });
});
