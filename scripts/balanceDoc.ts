/**
 * Generates docs/BALANCE.md from the actual config (so the numbers never drift).
 *   npm run docs:balance        (after `npm run sim -- --write` for fresh simulation results)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { BALANCE } from '../src/config/balance';
import { CAMPAIGN } from '../src/config/campaign';
import { CHASSIS } from '../src/config/chassis';
import { ECONOMY } from '../src/config/economy';
import { PARTS } from '../src/config/upgrades';
import { WEAPONS, WEAPON_TYPES } from '../src/config/weapons';
import { computeRobotStats } from '../src/core/robot/computeStats';
import { makeBuild } from '../src/config/presets';

const cos = { primary: '#888888', secondary: '#222222', led: '#22D3EE', decal: 'none' as const };
const f = (v: number, d = 1) => (Number.isInteger(v) ? String(v) : v.toFixed(d));
const lines: string[] = [];
const out = (s = '') => lines.push(s);

out('# Balanse');
out();
out('> Generert av `npm run docs:balance` fra `src/config/*`. Endre tallene i konfigurasjonen, ikke her.');
out();
out('## Designmål');
out();
out(
  '- En kamp varer 2–3 minutter (`matchDurationSec` = ' +
    BALANCE.matchDurationSec +
    ' s). KO skjer typisk etter 1–2 minutter.',
);
out(
  '- Ingen våpen eller oppgraderingsvariant skal ha over **60 %** vinnerrate mot likeverdige bygg (verifiseres med `npm run sim`).',
);
out(
  '- Ingen kampanjenivå skal være umulig (< 25 %) eller trivielt (> 90 %) for et forventet spillerbygg på Normal.',
);
out(
  '- Kampanjen skal kunne fullføres uten grinding hvis spilleren vinner de fleste kampene, men det skal lønne seg å spille om nivåer for stjerner.',
);
out();
out('## Globale tall');
out();
out('| Parameter | Verdi |');
out('|---|---|');
out(`| Global skademultiplikator | ${BALANCE.damage.globalMul} |`);
out(
  `| Sidemultiplikator (front / side / bak / topp) | ${Object.values(BALANCE.damage.sideMultiplier).join(' / ')} |`,
);
out(`| Maks rustning | ${BALANCE.damage.armorCap * 100} % |`);
out(
  `| Komponentskade ved HP-terskler | ${BALANCE.damage.componentThresholds.map((t) => `${t * 100} %`).join(', ')} (sjanse ${Math.round(BALANCE.damage.componentChance * 100)} %) |`,
);
out(`| Immobilisering | ${BALANCE.immobile.countdownSec} s nedtelling |`);
out(
  `| Selvretting uten modul / flipper og hammer | ${BALANCE.righting.struggleSec} s / ${BALANCE.righting.nativeSec} s |`,
);
out(`| Rammeskade | (fart − ${BALANCE.physics.ramThreshold}) × ${BALANCE.physics.ramDamagePerSpeed} |`);
out();
out('## Chassis');
out();
out('| Chassis | Vektgrense | Basis-HP | Pris | Skrap | Låses opp etter |');
out('|---|---|---|---|---|---|');
for (const c of Object.values(CHASSIS))
  out(`| ${c.id} | ${c.weightLimit} kg | ${c.base.hp} | ${c.price} | ${c.scrap} | ${c.unlockAfter ?? '–'} |`);
out();
out('## Våpen (nivå 1 → 5)');
out();
out('| Våpen | Modus | Wind-up | Skade | Kjøletid | Rekkevidde | Energi | Vekt | Pris nivå 1 | Låses opp |');
out('|---|---|---|---|---|---|---|---|---|---|');
for (const w of WEAPON_TYPES) {
  const s = WEAPONS[w];
  const lvl = (n: number) =>
    computeRobotStats(
      makeBuild({
        name: w,
        chassis: 'heavy',
        armor: ['balanced', 1],
        drive: ['wheels', 1],
        weapon: [w, n],
        power: ['capacity', 1],
        cosmetics: cos,
      }),
    );
  const a = lvl(1);
  const b = lvl(5);
  const part = PARTS.find((p) => p.id === `weapon_${w}`)!;
  out(
    `| ${w} | ${s.mode} | ${s.windup || s.spinUp || 0} s | ${f(a.damage)} → ${f(b.damage)} | ${f(a.cooldown, 2)} → ${f(b.cooldown, 2)} | ${f(a.range)} → ${f(b.range)} | ${f(a.energyCost)} → ${f(b.energyCost)} | ${s.weight} kg | ${part.levels[0]!.price} | ${s.unlockAfter ?? '–'} |`,
  );
}
out();
out(
  'Kontinuerlige våpen (sag, flammekaster, magnet, knuser i grep) oppgir skade per sekund. Spinnere skalerer skaden med turtall (rpm^1.2).',
);
out();
out('## Deler og priser');
out();
out(
  `Prisen for nivå *n* = basispris × [${ECONOMY.levelPriceCurve.join(', ')}][n]. Skrap per nivå: [${ECONOMY.levelScrapCurve.join(', ')}]. Salg gir ${ECONOMY.sellRatio * 100} % av betalt beløp.`,
);
out();
out('| Del | Kategori | Pris nivå 1–5 | Skrap 1–5 | Låses opp |');
out('|---|---|---|---|---|');
for (const p of PARTS)
  out(
    `| ${p.id} | ${p.category} | ${p.levels.map((l) => l.price).join(' / ')} | ${p.levels.map((l) => l.scrap).join(' / ')} | ${p.unlockAfter ?? '–'} |`,
  );
out();
out('## Belønninger');
out();
const R = ECONOMY.reward;
out('| Kilde | Credits |');
out('|---|---|');
out(`| Seier | ${R.winBase} + ${R.winPerLevel} × nivåindeks + nivåets bonus |`);
out(`| Tap | ${R.lossBase} |`);
out(`| Første seier på et nivå | +${R.firstWinMul * 100} % av alt over, pluss nivåets skrap |`);
out(`| Velt | ${R.flipBonus} per velt (maks ${R.maxFlipBonuses}) |`);
out(`| Gropen / KO | ${R.pitBonus} / ${R.koBonus} |`);
out(`| Perfekt (under ${R.perfectDamageFraction * 100} % skade) | ${R.perfectBonus} |`);
out(`| Rask seier (under ${R.quickWinSec} s) | ${R.quickWinBonus} |`);
out(
  `| Vanskelighetsgrad | ${Object.entries(R.difficultyMul)
    .map(([k, v]) => `${k} ×${v}`)
    .join(', ')} |`,
);
out(`| Hurtigkamp | ×${R.quickMatchMul} |`);
out();
const total = CAMPAIGN.reduce(
  (s, l, i) => s + (R.winBase + R.winPerLevel * i + l.rewardBase) * (1 + R.firstWinMul),
  0,
);
out(
  `En spiller som vinner alle 15 nivåer på første forsøk (Normal, uten stilbonuser) tjener ca. **${Math.round(total)} credits** + startkapital ${ECONOMY.startingCredits}. Et typisk sluttspill-bygg (tungt chassis, våpen nivå 4, rustning 4, belter 4, kraft 3–4, to moduler) koster rundt 20 000–25 000, så det er rom for å eksperimentere uten å grinde.`,
);
out();
out('## Reparasjon (hardcore)');
out();
out(
  `Skade følger med mellom kampanjekamper når «reparasjonskostnader» er på (alltid på «Mekaniker»). Pris = skadeandel × byggets verdi × ${ECONOMY.repair.perFractionOfValue}, minst ${ECONOMY.repair.minimum}. KO gir 85 % skade.`,
);
out();
if (existsSync('docs/SIM_RESULTS.md')) {
  out(
    readFileSync('docs/SIM_RESULTS.md', 'utf8').replace(
      '## Balance simulation',
      '## Siste balansesimulering',
    ),
  );
}
writeFileSync('docs/BALANCE.md', lines.join('\n') + '\n');
console.log('docs/BALANCE.md written');
