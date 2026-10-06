# Balanse

> Generert av `npm run docs:balance` fra `src/config/*`. Endre tallene i konfigurasjonen, ikke her.

## Designmål

- En kamp varer 2–3 minutter (`matchDurationSec` = 150 s). KO skjer typisk etter 1–2 minutter.
- Ingen våpen eller oppgraderingsvariant skal ha over **60 %** vinnerrate mot likeverdige bygg (verifiseres med `npm run sim`).
- Ingen kampanjenivå skal være umulig (< 25 %) eller trivielt (> 90 %) for et forventet spillerbygg på Normal.
- Kampanjen skal kunne fullføres uten grinding hvis spilleren vinner de fleste kampene, men det skal lønne seg å spille om nivåer for stjerner.

## Globale tall

| Parameter                                     | Verdi                    |
| --------------------------------------------- | ------------------------ |
| Global skademultiplikator                     | 0.45                     |
| Sidemultiplikator (front / side / bak / topp) | 0.8 / 1.15 / 1.4 / 1     |
| Maks rustning                                 | 60 %                     |
| Komponentskade ved HP-terskler                | 50 %, 25 % (sjanse 55 %) |
| Immobilisering                                | 10 s nedtelling          |
| Selvretting uten modul / flipper og hammer    | 4 s / 1 s                |
| Rammeskade                                    | (fart − 140) × 0.05      |

## Chassis

| Chassis | Vektgrense | Basis-HP | Pris | Skrap | Låses opp etter |
| ------- | ---------- | -------- | ---- | ----- | --------------- |
| light   | 100 kg     | 210      | 0    | 0     | –               |
| medium  | 140 kg     | 290      | 1800 | 0     | c02             |
| heavy   | 185 kg     | 380      | 4200 | 2     | c05             |

## Våpen (nivå 1 → 5)

| Våpen        | Modus | Wind-up | Skade     | Kjøletid    | Rekkevidde | Energi    | Vekt  | Pris nivå 1 | Låses opp |
| ------------ | ----- | ------- | --------- | ----------- | ---------- | --------- | ----- | ----------- | --------- |
| wedge        | press | 0.15 s  | 19 → 25   | 1.60 → 1    | 10 → 10    | 18 → 18   | 10 kg | 0           | –         |
| flipper      | press | 0.22 s  | 10 → 18   | 2.40 → 1.76 | 34 → 46    | 30 → 24   | 22 kg | 700         | c02       |
| hSpinner     | hold  | 1.5 s   | 25 → 43   | 0.45 → 0.45 | 20 → 28    | 9 → 7.4   | 28 kg | 1100        | c04       |
| drum         | hold  | 1.15 s  | 17 → 29   | 0.55 → 0.55 | 14 → 20    | 8 → 6.8   | 24 kg | 1200        | c06       |
| hammer       | press | 0.36 s  | 18 → 40   | 1.70 → 1.34 | 42 → 54    | 16 → 16   | 22 kg | 800         | c03       |
| crusher      | press | 0.22 s  | 11 → 21   | 2.20 → 1.72 | 24 → 24    | 12 → 9.6  | 26 kg | 1300        | c08       |
| saw          | hold  | 0.3 s   | 20 → 36   | 0 → 0       | 18 → 24    | 7 → 5.8   | 15 kg | 450         | –         |
| lance        | press | 0.26 s  | 26 → 42   | 1.10 → 0.86 | 62 → 78    | 13 → 13   | 14 kg | 900         | c05       |
| flamethrower | hold  | 0.35 s  | 12 → 20   | 0 → 0       | 95 → 119   | 15 → 12.6 | 16 kg | 1000        | c07       |
| magnet       | hold  | 0.3 s   | 12 → 16.8 | 0 → 0       | 135 → 167  | 13 → 11   | 22 kg | 1500        | c12       |

Kontinuerlige våpen (sag, flammekaster, magnet, knuser i grep) oppgir skade per sekund. Spinnere skalerer skaden med turtall (rpm^1.2).

## Deler og priser

Prisen for nivå _n_ = basispris × [1, 1.2, 1.8, 2.6, 3.6][n]. Skrap per nivå: [0, 0, 0, 1, 2]. Salg gir 60 % av betalt beløp.

| Del                  | Kategori | Pris nivå 1–5                    | Skrap 1–5         | Låses opp |
| -------------------- | -------- | -------------------------------- | ----------------- | --------- |
| armor_balanced       | armor    | 0 / 600 / 900 / 1300 / 1800      | 0 / 0 / 0 / 1 / 2 | –         |
| armor_frontHeavy     | armor    | 560 / 670 / 1010 / 1460 / 2020   | 0 / 0 / 0 / 1 / 2 | c01       |
| drive_wheels         | drive    | 0 / 540 / 810 / 1170 / 1620      | 0 / 0 / 0 / 1 / 2 | –         |
| drive_tracks         | drive    | 800 / 960 / 1440 / 2080 / 2880   | 0 / 0 / 0 / 1 / 2 | c02       |
| drive_shuffler       | drive    | 1100 / 1320 / 1980 / 2860 / 3960 | 0 / 0 / 0 / 1 / 2 | c06       |
| weapon_wedge         | weapon   | 0 / 480 / 720 / 1040 / 1440      | 0 / 0 / 0 / 1 / 2 | –         |
| weapon_flipper       | weapon   | 700 / 840 / 1260 / 1820 / 2520   | 0 / 0 / 0 / 1 / 2 | c02       |
| weapon_hSpinner      | weapon   | 1100 / 1320 / 1980 / 2860 / 3960 | 0 / 0 / 0 / 1 / 2 | c04       |
| weapon_drum          | weapon   | 1200 / 1440 / 2160 / 3120 / 4320 | 0 / 0 / 0 / 1 / 2 | c06       |
| weapon_hammer        | weapon   | 800 / 960 / 1440 / 2080 / 2880   | 0 / 0 / 0 / 1 / 2 | c03       |
| weapon_crusher       | weapon   | 1300 / 1560 / 2340 / 3380 / 4680 | 1 / 1 / 1 / 2 / 3 | c08       |
| weapon_saw           | weapon   | 450 / 540 / 810 / 1170 / 1620    | 0 / 0 / 0 / 1 / 2 | –         |
| weapon_lance         | weapon   | 900 / 1080 / 1620 / 2340 / 3240  | 0 / 0 / 0 / 1 / 2 | c05       |
| weapon_flamethrower  | weapon   | 1000 / 1200 / 1800 / 2600 / 3600 | 0 / 0 / 0 / 1 / 2 | c07       |
| weapon_magnet        | weapon   | 1500 / 1800 / 2700 / 3900 / 5400 | 2 / 2 / 2 / 3 / 4 | c12       |
| power_capacity       | power    | 0 / 480 / 720 / 1040 / 1440      | 0 / 0 / 0 / 1 / 2 | –         |
| power_regen          | power    | 450 / 540 / 810 / 1170 / 1620    | 0 / 0 / 0 / 1 / 2 | c01       |
| support_selfRight    | support  | 500 / 600 / 900 / 1300 / 1800    | 0 / 0 / 0 / 1 / 2 | –         |
| support_shieldPulse  | support  | 700 / 840 / 1260 / 1820 / 2520   | 0 / 0 / 0 / 1 / 2 | c03       |
| support_smokeScreen  | support  | 550 / 660 / 990 / 1430 / 1980    | 0 / 0 / 0 / 1 / 2 | c05       |
| support_magnetAnchor | support  | 650 / 780 / 1170 / 1690 / 2340   | 0 / 0 / 0 / 1 / 2 | c04       |
| support_sensor       | support  | 600 / 720 / 1080 / 1560 / 2160   | 0 / 0 / 0 / 1 / 2 | c07       |

## Belønninger

| Kilde                     | Credits                                        |
| ------------------------- | ---------------------------------------------- |
| Seier                     | 380 + 70 × nivåindeks + nivåets bonus          |
| Tap                       | 110                                            |
| Første seier på et nivå   | +100 % av alt over, pluss nivåets skrap        |
| Velt                      | 40 per velt (maks 3)                           |
| Gropen / KO               | 180 / 120                                      |
| Perfekt (under 5 % skade) | 260                                            |
| Rask seier (under 60 s)   | 180                                            |
| Vanskelighetsgrad         | easy ×0.8, normal ×1, hard ×1.3, mechanic ×1.6 |
| Hurtigkamp                | ×0.35                                          |

En spiller som vinner alle 15 nivåer på første forsøk (Normal, uten stilbonuser) tjener ca. **30800 credits** + startkapital 900. Et typisk sluttspill-bygg (tungt chassis, våpen nivå 4, rustning 4, belter 4, kraft 3–4, to moduler) koster rundt 20 000–25 000, så det er rom for å eksperimentere uten å grinde.

## Reparasjon (hardcore)

Skade følger med mellom kampanjekamper når «reparasjonskostnader» er på (alltid på «Mekaniker»). Pris = skadeandel × byggets verdi × 0.22, minst 20. KO gir 85 % skade.

## Siste balansesimulering

_Generated by `npm run sim`: 3360 matches, 48 per pairing, 19 s._

### Weapons (equal medium builds, level 3 parts)

| Build        | Win rate | Best matchup      | Worst matchup     |
| ------------ | -------- | ----------------- | ----------------- |
| hammer       | 56.6 %   | magnet 100 %      | saw 31 %          |
| drum         | 55.2 %   | flamethrower 81 % | magnet 2 %        |
| lance        | 55.0 %   | magnet 88 %       | crusher 10 %      |
| saw          | 53.9 %   | flamethrower 94 % | flipper 29 %      |
| hSpinner     | 53.5 %   | flipper 98 %      | lance 19 %        |
| crusher      | 52.7 %   | lance 90 %        | flamethrower 2 %  |
| flipper      | 48.5 %   | magnet 73 %       | hSpinner 2 %      |
| flamethrower | 47.0 %   | crusher 98 %      | saw 6 %           |
| wedge        | 41.8 %   | hammer 63 %       | flamethrower 17 % |
| magnet       | 35.9 %   | drum 98 %         | hammer 0 %        |

Matches: 2160, average duration 80.4 s, outcomes: judges 9 %, pit 8 %, ko 83 %, draw 0 %

### Upgrade variants (mirror weapons)

| Build            | Win rate | Best matchup          | Worst matchup         |
| ---------------- | -------- | --------------------- | --------------------- |
| drive:tracks     | 58.1 %   | armor:frontHeavy 67 % | armor:balanced 54 %   |
| armor:frontHeavy | 53.9 %   | armor:balanced 65 %   | drive:tracks 33 %     |
| drive:shuffler   | 46.9 %   | armor:balanced 56 %   | drive:tracks 44 %     |
| armor:balanced   | 45.6 %   | power:regen 52 %      | armor:frontHeavy 35 % |
| power:regen      | 45.6 %   | drive:shuffler 54 %   | armor:frontHeavy 38 % |

Matches: 480, average duration 84.2 s, outcomes: ko 76 %, pit 11 %, judges 11 %, draw 1 %

### Campaign levels (expected player build, Normal)

| Level | Opponent                  | Player win rate | Avg. duration | Verdict |
| ----- | ------------------------- | --------------- | ------------- | ------- |
| c01   | Rusty Rex                 | 98 %            | 47 s          | trivial |
| c02   | Wedgie                    | 48 %            | 70 s          | ok      |
| c03   | Buzzkill                  | 67 %            | 47 s          | ok      |
| c04   | Sir Grindalot             | 54 %            | 78 s          | ok      |
| c05   | Flipside                  | 81 %            | 147 s         | ok      |
| c06   | Torque                    | 46 %            | 70 s          | ok      |
| c07   | Twin Fang A + Twin Fang B | 50 %            | 56 s          | ok      |
| c08   | Molten Maw                | 50 %            | 107 s         | ok      |
| c09   | Glacier                   | 38 %            | 133 s         | ok      |
| c10   | Overclock                 | 52 %            | 65 s          | ok      |
| c11   | Mirror                    | 44 %            | 67 s          | ok      |
| c12   | Voltress                  | 67 %            | 133 s         | ok      |
| c13   | Sir Grindalot Mk II       | 54 %            | 75 s          | ok      |
| c14   | Molten Maw Reforged       | 90 %            | 62 s          | ok      |
| c15   | Iron Sovereign            | 50 %            | 62 s          | ok      |
