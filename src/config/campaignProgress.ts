/**
 * What a player who wins most fights can be expected to own when reaching each level.
 * Used by the balance simulator to verify no level is impossible or trivial.
 * Format: chassis, armor level, drive, drive level, weapon, weapon level, power level, support.
 */
export const EXPECTED_PROGRESS: Record<
  string,
  [string, number, string, number, string, number, number, [string, number][]]
> = {
  c01: ['light', 1, 'wheels', 1, 'wedge', 1, 1, []],
  c02: ['light', 2, 'wheels', 1, 'saw', 1, 1, []],
  c03: ['light', 2, 'wheels', 2, 'saw', 2, 1, []],
  c04: ['medium', 2, 'wheels', 2, 'saw', 2, 2, []],
  c05: ['medium', 3, 'wheels', 2, 'flipper', 2, 2, []],
  c06: ['medium', 3, 'wheels', 3, 'flipper', 2, 2, [['selfRight', 1]]],
  c07: ['medium', 3, 'wheels', 3, 'flipper', 3, 2, [['selfRight', 1]]],
  c08: ['medium', 3, 'tracks', 2, 'flipper', 3, 3, [['selfRight', 1]]],
  c09: ['heavy', 3, 'tracks', 3, 'flipper', 3, 3, [['selfRight', 2]]],
  c10: ['heavy', 3, 'tracks', 3, 'hSpinner', 3, 3, [['selfRight', 1]]],
  c11: ['heavy', 4, 'tracks', 3, 'hSpinner', 3, 3, [['selfRight', 1]]],
  c12: ['heavy', 4, 'tracks', 3, 'hSpinner', 4, 3, [['selfRight', 2]]],
  c13: ['heavy', 4, 'tracks', 4, 'hSpinner', 4, 4, [['selfRight', 2]]],
  c14: [
    'heavy',
    4,
    'tracks',
    4,
    'hSpinner',
    4,
    4,
    [
      ['selfRight', 2],
      ['magnetAnchor', 1],
    ],
  ],
  c15: [
    'heavy',
    5,
    'tracks',
    4,
    'hSpinner',
    4,
    4,
    [
      ['selfRight', 3],
      ['magnetAnchor', 2],
    ],
  ],
};
