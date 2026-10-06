import { makeBuild } from '../presets';
import type { CampaignLevel, Cosmetics } from '../types';

const look = (primary: string, secondary: string, led: string, decal: Cosmetics['decal']): Cosmetics => ({
  primary,
  secondary,
  led,
  decal,
});

export const MASTER: CampaignLevel[] = [
  {
    id: 'c13',
    league: 'master',
    arena: 'colosseum',
    nameKey: 'campaign.c13',
    boss: false,
    hazardsOverride: 'all',
    parTime: 100,
    rewardBase: 300,
    scrapReward: 2,
    introKey: 'host.c13.intro',
    opponents: [
      {
        ai: 'champion',
        build: makeBuild({
          name: 'Sir Grindalot Mk II',
          chassis: 'heavy',
          armor: ['balanced', 4],
          drive: ['tracks', 4],
          weapon: ['hammer', 4],
          power: ['capacity', 4],
          support: [['selfRight', 3]],
          cosmetics: look('#a0aec0', '#2a2d33', '#9fd3ff', 'skull'),
        }),
      },
    ],
  },
  {
    id: 'c14',
    league: 'master',
    arena: 'colosseum',
    nameKey: 'campaign.c14',
    boss: false,
    hazardsOverride: 'all',
    parTime: 105,
    rewardBase: 350,
    scrapReward: 2,
    opponents: [
      {
        ai: 'champion',
        build: makeBuild({
          name: 'Molten Maw Reforged',
          chassis: 'heavy',
          armor: ['frontHeavy', 3],
          drive: ['tracks', 4],
          weapon: ['hSpinner', 4],
          power: ['capacity', 4],
          support: [['magnetAnchor', 3]],
          cosmetics: look('#c53030', '#2a1210', '#ff9a52', 'flames'),
        }),
      },
    ],
  },
  {
    id: 'c15',
    league: 'master',
    arena: 'colosseum',
    nameKey: 'campaign.c15',
    boss: true,
    hazardsOverride: 'all',
    parTime: 120,
    rewardBase: 800,
    scrapReward: 6,
    introKey: 'host.c15.intro',
    outroKey: 'host.c15.outro',
    opponents: [
      {
        ai: 'champion',
        hpMul: 1.0,
        build: makeBuild({
          name: 'Iron Sovereign',
          chassis: 'heavy',
          armor: ['balanced', 4],
          drive: ['tracks', 4],
          weapon: ['drum', 4],
          power: ['regen', 4],
          support: [
            ['selfRight', 4],
            ['shieldPulse', 4],
          ],
          cosmetics: look('#1a1a1a', '#FFC21A', '#FFC21A', 'stripes'),
        }),
      },
    ],
  },
];
