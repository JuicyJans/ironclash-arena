/** Interactive tutorial for the first campaign fight. Conditions are checked in game/tutorial.ts. */
export type TutorialStepId = 'drive' | 'turn' | 'weapon' | 'boost' | 'ram' | 'rules';

export interface TutorialStep {
  id: TutorialStepId;
  /** Amount needed to complete (units, radians, presses, damage or seconds). */
  goal: number;
}

export const TUTORIAL: TutorialStep[] = [
  { id: 'drive', goal: 260 },
  { id: 'turn', goal: 5 },
  { id: 'weapon', goal: 1 },
  { id: 'boost', goal: 0.8 },
  { id: 'ram', goal: 8 },
  { id: 'rules', goal: 6 },
];
