import { makeBuild } from '../presets';
import type { CampaignLevel, Cosmetics } from '../types';

const look = (primary: string, secondary: string, led: string, decal: Cosmetics['decal']): Cosmetics => ({
  primary,
  secondary,
  led,
  decal,
});

export const GOLD: CampaignLevel[] = [
  {
    id: 'c09',
    league: 'gold',
    arena: 'icefactory',
    nameKey: 'campaign.c09',
    boss: false,
    parTime: 95,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'controller',
        build: makeBuild({
          name: 'Glacier',
          chassis: 'heavy',
          armor: ['frontHeavy', 3],
          drive: ['shuffler', 2],
          weapon: ['wedge', 4],
          power: ['capacity', 3],
          support: [['magnetAnchor', 3]],
          cosmetics: look('#90cdf4', '#1a2a38', '#e6fbff', 'none'),
        }),
      },
    ],
  },
  {
    id: 'c10',
    league: 'gold',
    arena: 'icefactory',
    nameKey: 'campaign.c10',
    boss: false,
    parTime: 95,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'speedster',
        build: makeBuild({
          name: 'Overclock',
          chassis: 'medium',
          armor: ['balanced', 3],
          drive: ['wheels', 4],
          weapon: ['drum', 3],
          power: ['regen', 3],
          cosmetics: look('#ecc94b', '#1a1a1a', '#fff27a', 'bolt'),
        }),
      },
    ],
  },
  {
    id: 'c11',
    league: 'gold',
    arena: 'icefactory',
    nameKey: 'campaign.c11',
    boss: false,
    parTime: 100,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'mimic',
        mirror: true,
        build: makeBuild({
          name: 'Mirror',
          chassis: 'medium',
          armor: ['balanced', 3],
          drive: ['wheels', 3],
          weapon: ['flipper', 3],
          power: ['capacity', 3],
          cosmetics: look('#cbd5e0', '#2d3748', '#ffffff', 'checker'),
        }),
      },
    ],
  },
  {
    id: 'c12',
    league: 'gold',
    arena: 'icefactory',
    nameKey: 'campaign.c12',
    boss: true,
    parTime: 110,
    rewardBase: 400,
    scrapReward: 4,
    introKey: 'host.c12.intro',
    outroKey: 'host.c12.outro',
    opponents: [
      {
        ai: 'adaptive',
        hpMul: 1.08,
        build: makeBuild({
          name: 'Voltress',
          chassis: 'heavy',
          armor: ['balanced', 4],
          drive: ['tracks', 4],
          weapon: ['magnet', 4],
          power: ['regen', 4],
          support: [
            ['shieldPulse', 3],
            ['selfRight', 3],
          ],
          cosmetics: look('#6b46c1', '#1a1033', '#b794f4', 'bolt'),
        }),
      },
    ],
  },
];
