import { makeBuild } from '../presets';
import type { CampaignLevel, Cosmetics } from '../types';

const look = (primary: string, secondary: string, led: string, decal: Cosmetics['decal']): Cosmetics => ({
  primary,
  secondary,
  led,
  decal,
});

export const BRONZE: CampaignLevel[] = [
  {
    id: 'c01',
    league: 'bronze',
    arena: 'workshop',
    nameKey: 'campaign.c01',
    boss: false,
    tutorial: true,
    parTime: 75,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'rookie',
        build: makeBuild({
          name: 'Rusty Rex',
          chassis: 'light',
          armor: ['balanced', 1],
          drive: ['wheels', 1],
          weapon: ['wedge', 1],
          power: ['capacity', 1],
          cosmetics: look('#8b5e3c', '#3b2a1e', '#ffb347', 'none'),
        }),
      },
    ],
  },
  {
    id: 'c02',
    league: 'bronze',
    arena: 'workshop',
    nameKey: 'campaign.c02',
    boss: false,
    parTime: 80,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'pusher',
        build: makeBuild({
          name: 'Wedgie',
          chassis: 'light',
          armor: ['frontHeavy', 1],
          drive: ['wheels', 2],
          weapon: ['wedge', 2],
          power: ['capacity', 1],
          cosmetics: look('#d4a72c', '#2d2d2d', '#ffe066', 'stripes'),
        }),
      },
    ],
  },
  {
    id: 'c03',
    league: 'bronze',
    arena: 'workshop',
    nameKey: 'campaign.c03',
    boss: false,
    parTime: 80,
    rewardBase: 0,
    scrapReward: 0,
    opponents: [
      {
        ai: 'berserker',
        build: makeBuild({
          name: 'Buzzkill',
          chassis: 'light',
          armor: ['balanced', 2],
          drive: ['wheels', 2],
          weapon: ['saw', 2],
          power: ['regen', 1],
          cosmetics: look('#e8b923', '#1d1d1d', '#ff4d4d', 'checker'),
        }),
      },
    ],
  },
  {
    id: 'c04',
    league: 'bronze',
    arena: 'workshop',
    nameKey: 'campaign.c04',
    boss: true,
    parTime: 90,
    rewardBase: 200,
    scrapReward: 2,
    introKey: 'host.c04.intro',
    outroKey: 'host.c04.outro',
    opponents: [
      {
        ai: 'bruiser',
        build: makeBuild({
          name: 'Sir Grindalot',
          chassis: 'medium',
          armor: ['balanced', 2],
          drive: ['tracks', 1],
          weapon: ['hammer', 2],
          power: ['capacity', 2],
          cosmetics: look('#7a7f8a', '#2a2d33', '#9fd3ff', 'skull'),
        }),
      },
    ],
  },
];
