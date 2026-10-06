/** Global tuning numbers. Logic must read from here instead of using magic numbers. */
export const BALANCE = {
  tickRate: 60,
  matchDurationSec: 150,
  practiceDurationSec: 3600,
  snapshotRate: 30,

  physics: {
    wallRestitution: 0.35,
    robotRestitution: 0.15,
    frictionAir: 0.02,
    /** Gravity for airborne robots in world units/s^2 (height axis). */
    gravity: 1500,
    /** Collision impulse (relative speed, units/s) needed before ramming deals damage. */
    ramThreshold: 140,
    ramDamagePerSpeed: 0.05,
    wallDamagePerSpeed: 0.012,
    /** Seconds after a launch during which landing may flip the robot. */
    maxAirTime: 1.6,
    /** Launch speed above which a landing flips the robot over. */
    flipLaunchThreshold: 520,
    /** Max relative impulse applied by a single weapon hit (units/s). */
    maxKnockback: 900,
    /** Vertical launch speed = launch power * this factor. */
    launchHeightFactor: 0.55,
    landingDamagePerPower: 0.012,
    /** Accel multiplier while touching another robot = pushForce * (base + grip * gripShare). */
    pushBase: 0.6,
    pushGripShare: 0.5,
    liftedTraction: 0.08,
  },

  damage: {
    /** Global multiplier on all damage – the main knob for match length. */
    globalMul: 0.45,
    sideMultiplier: { front: 0.8, side: 1.15, rear: 1.4, top: 1.0 },
    /** Angular half-width (rad) of the front and rear arcs. */
    frontArc: Math.PI / 4,
    rearArc: Math.PI / 4,
    armorCap: 0.6,
    /** HP fractions where component damage may occur. */
    componentThresholds: [0.5, 0.25],
    componentChance: 0.55,
    driveDamagedMul: 0.72,
    weaponDamagedMul: 0.75,
    weaponDamagedCooldownMul: 1.4,
    burnDps: 7,
    minDisplayedDamage: 1,
  },

  immobile: {
    countdownSec: 10,
    /** Moving less than this (world units) within the window counts as immobile. */
    mobilityDistance: 26,
    mobilityWindowSec: 1.2,
    /** Grace period before the countdown is shown. */
    showAfterSec: 1.5,
  },

  righting: {
    /** Flippers and hammers can push themselves back over with the weapon. */
    nativeSec: 1.0,
    nativeWeapons: ['flipper', 'hammer'] as readonly string[],
    /** Everyone else can rock themselves over slowly by holding weapon/special. */
    struggleSec: 4.0,
    energyCost: 10,
  },

  energy: {
    boostCostPerSec: 32,
    weaponLowEnergyMul: 0.5,
  },

  support: {
    shieldRadius: 150,
    shieldDuration: 0.6,
    shieldDamageReduction: 0.5,
    smokeDuration: 3.5,
    smokeRadius: 170,
    shieldKnockback: 430,
  },

  judges: {
    damageWeight: 1,
    aggressionWeight: 0.6,
    controlWeight: 0.8,
    /** Points per second for aggression when moving towards the opponent within range. */
    aggressionRange: 320,
    aggressionPointsPerSec: 4,
    flipControlPoints: 25,
    pushControlPerSec: 8,
    /** Forward speed (units/s) towards an enemy that counts as pushing it. */
    pushSpeed: 40,
  },

  hitStop: { minMs: 40, maxMs: 80, damageForMax: 60 },
  slowMo: { durationSec: 0.3, timeScale: 0.3 },
  shake: { maxIntensity: 0.012, damageForMax: 70 },

  pit: { fallSec: 0.6, buttonHoldSec: 0.4 },

  house: { maxIntrusionSec: 6, retreatSpeedMul: 0.6, attackReach: 72 },

  dummyHp: 1e9,
} as const;

export const DT = 1 / BALANCE.tickRate;
