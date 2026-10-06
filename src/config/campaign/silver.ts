import { makeBuild } from '../presets';
import type { CampaignLevel, Cosmetics } from '../types';

const look = (primary: string, secondary: string, led: string, decal: Cosmetics['decal']): Cosmetics => ({
  primary,
  secondary,
  led,
  decal,
});

export const SILVER: CampaignLevel[] = [
  {
    id: 'c05',
    league: 'silver',
    arena: 'foundry',
    nameKey: 'campaign.c05',
    boss: false,
    parTime: 85,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'patient',
        build: makeBuild({
          name: 'Flipside',
          chassis: 'medium',
          armor: ['balanced', 2],
          drive: ['wheels', 2],
          weapon: ['flipper', 2],
          power: ['regen', 2],
          support: [['selfRight', 1]],
          cosmetics: look('#e04b2a', '#2b1a14', '#ffc29b', 'bolt'),
        }),
      },
    ],
  },
  {
    id: 'c06',
    league: 'silver',
    arena: 'foundry',
    nameKey: 'campaign.c06',
    boss: false,
    parTime: 85,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'spinner',
        build: makeBuild({
          name: 'Torque',
          chassis: 'medium',
          armor: ['balanced', 2],
          drive: ['wheels', 2],
          weapon: ['hSpinner', 2],
          power: ['capacity', 2],
          cosmetics: look('#5a67d8', '#1a1d3a', '#a3bffa', 'checker'),
        }),
      },
    ],
  },
  {
    id: 'c07',
    league: 'silver',
    arena: 'foundry',
    nameKey: 'campaign.c07',
    boss: false,
    parTime: 95,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'swarm',
        build: makeBuild({
          name: 'Twin Fang A',
          chassis: 'light',
          armor: ['balanced', 2],
          drive: ['wheels', 3],
          weapon: ['saw', 2],
          power: ['regen', 1],
          cosmetics: look('#2f855a', '#132a1e', '#7cf5b0', 'stripes'),
        }),
        hpMul: 0.6,
      },
      {
        ai: 'swarm',
        build: makeBuild({
          name: 'Twin Fang B',
          chassis: 'light',
          armor: ['balanced', 2],
          drive: ['wheels', 3],
          weapon: ['lance', 2],
          power: ['regen', 1],
          cosmetics: look('#2f855a', '#132a1e', '#7cf5b0', 'stripes'),
        }),
        hpMul: 0.6,
      },
    ],
  },
  {
    id: 'c08',
    league: 'silver',
    arena: 'foundry',
    nameKey: 'campaign.c08',
    boss: true,
    parTime: 100,
    rewardBase: 300,
    scrapReward: 3,
    introKey: 'host.c08.intro',
    outroKey: 'host.c08.outro',
    opponents: [
      {
        ai: 'tactician',
        hpMul: 1.05,
        build: makeBuild({
          name: 'Molten Maw',
          chassis: 'heavy',
          armor: ['frontHeavy', 3],
          drive: ['tracks', 3],
          weapon: ['crusher', 3],
          power: ['capacity', 3],
          support: [['shieldPulse', 2]],
          cosmetics: look('#c53030', '#2a1210', '#ff9a52', 'flames'),
        }),
      },
    ],
  },
];
