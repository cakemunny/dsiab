// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file formatFilterValue.logic.test.ts
 * @input formatFilterValue
 * @output Tests for the single filter-value formatter, incl. the two fixed stubs
 * @position Testing; validates formatFilterValue.ts
 *
 * Covers the ported formatter behavior (truncate, enum label, number+units, list
 * collapse, absolute date) PLUS the two bug fixes this port makes over Astryx:
 *   - BUG 1 date_range: real "{start} – {end}" instead of the literal 'date range'.
 *   - BUG 2 date_relative: human "7 days ago" instead of the raw "7d_ago" code.
 */

import {describe, it, expect} from 'vitest';
import {formatFilterValue} from './formatFilterValue';
import {createInternalConfig} from './useInternalConfig';
import type {OperatorValue, FilterValue} from './types';

const CONFIG = createInternalConfig({name: 'Test', fields: []});
const BIG = 100;

function fmt(
  operatorValue: OperatorValue,
  filterValue: FilterValue,
  maxLength = BIG,
  timezoneID?: string,
): string {
  return formatFilterValue(CONFIG, operatorValue, filterValue, maxLength, timezoneID);
}

// Local, no-timeZone short-date format — matches how the date engine renders an
// extracted Y/M/D (plainDateFormat with DATE_FORMAT_SHORT_WITH_YEAR).
function expectedShortDate(year: number, month1: number, day: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month1 - 1, day));
}

describe('formatFilterValue — ported behavior', () => {
  it('empty → empty string', () => {
    expect(fmt({type: 'empty'}, {type: 'empty'})).toBe('');
  });

  it('string is returned, truncated with an ellipsis past maxLength', () => {
    expect(fmt({type: 'string'}, {type: 'string', value: 'hello'})).toBe(
      'hello',
    );
    expect(
      fmt({type: 'string'}, {type: 'string', value: 'abcdefghij'}, 5),
    ).toBe('abcd…');
  });

  it('enum renders the label for the value', () => {
    const op: OperatorValue = {
      type: 'enum',
      values: [
        {value: 'active', label: 'Active'},
        {value: 'inactive', label: 'Inactive'},
      ],
    };
    expect(fmt(op, {type: 'enum', value: 'active'})).toBe('Active');
    // unknown value falls back to the raw value
    expect(fmt(op, {type: 'enum', value: 'ghost'})).toBe('ghost');
  });

  it('numbers format via Intl and append units when provided', () => {
    expect(fmt({type: 'float', units: 'kg'}, {type: 'float', value: 1500})).toBe(
      '1,500 kg',
    );
    expect(fmt({type: 'integer', units: 'ms'}, {type: 'integer', value: 42})).toBe(
      '42 ms',
    );
    expect(fmt({type: 'float'}, {type: 'float', value: 7})).toBe('7');
  });

  it('string_list collapses to "N items" when the join exceeds maxLength', () => {
    const op: OperatorValue = {type: 'string_list'};
    expect(fmt(op, {type: 'string_list', value: ['solo']})).toBe('solo');
    expect(fmt(op, {type: 'string_list', value: ['a', 'b']}, 20)).toBe('a, b');
    expect(
      fmt(op, {type: 'string_list', value: ['alpha', 'bravo', 'charlie']}, 10),
    ).toBe('3 items');
  });

  it('date_absolute renders a real datetime containing the year', () => {
    const unixSeconds = Math.floor(Date.UTC(2026, 0, 25, 12, 0) / 1000);
    const out = fmt(
      {type: 'date_absolute'},
      {type: 'date_absolute', unixSeconds},
      BIG,
      'UTC',
    );
    expect(out).toContain('2026');
  });

  it('nested collapses to a filter count', () => {
    expect(
      fmt({type: 'nested'}, {type: 'nested', value: [] as never}),
    ).toBe('0 filters');
  });
});

describe('formatFilterValue — BUG 1 (date_range)', () => {
  const op: OperatorValue = {type: 'date_range'};

  it('renders "{start} – {end}", NOT the literal string "date range"', () => {
    const start = Math.floor(Date.UTC(2026, 0, 25) / 1000);
    const end = Math.floor(Date.UTC(2026, 1, 10) / 1000);
    const out = fmt(
      op,
      {
        type: 'date_range',
        value: {
          start: {type: 'ABSOLUTE', unixSeconds: start},
          end: {type: 'ABSOLUTE', unixSeconds: end},
        },
      },
      BIG,
      'UTC',
    );
    expect(out).not.toBe('date range');
    expect(out).toBe(
      `${expectedShortDate(2026, 1, 25)} – ${expectedShortDate(2026, 2, 10)}`,
    );
  });

  it('resolves NOW and RELATIVE endpoints to human strings', () => {
    const out = fmt(op, {
      type: 'date_range',
      value: {
        start: {type: 'RELATIVE', backValue: 3, unit: 'day'},
        end: {type: 'NOW'},
      },
    });
    expect(out).toBe('3 days ago – now');
  });

  it('RELATIVE backValue 1 is singular; backValue 0 reads "now"', () => {
    expect(
      fmt(op, {
        type: 'date_range',
        value: {
          start: {type: 'RELATIVE', backValue: 1, unit: 'week'},
          end: {type: 'RELATIVE', backValue: 0, unit: 'day'},
        },
      }),
    ).toBe('1 week ago – now');
  });
});

describe('formatFilterValue — BUG 2 (date_relative)', () => {
  const op: OperatorValue = {type: 'date_relative'};

  it('maps the machine code to a human label, NOT the raw code', () => {
    expect(fmt(op, {type: 'date_relative', value: '7d_ago'})).toBe('7 days ago');
    expect(fmt(op, {type: 'date_relative', value: '7d_ago'})).not.toBe('7d_ago');
  });

  it('handles weeks/months and future direction', () => {
    expect(fmt(op, {type: 'date_relative', value: '1w_from_now'})).toBe(
      '1 week from now',
    );
    expect(fmt(op, {type: 'date_relative', value: '3m_ago'})).toBe(
      '3 months ago',
    );
  });

  it('is singular for an amount of 1', () => {
    expect(fmt(op, {type: 'date_relative', value: '1d_ago'})).toBe('1 day ago');
  });

  it('falls back to the raw value for an unrecognized code', () => {
    expect(fmt(op, {type: 'date_relative', value: 'someday'})).toBe('someday');
  });
});
