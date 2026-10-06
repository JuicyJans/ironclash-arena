# PROMPT: Bygg nettspillet «IRONCLASH ARENA», et komplett robotkampspill

> Kopier alt under streken og lim det inn til AI-agenten (Claude Code, Cursor, Codex o.l.).
> Navnet «IRONCLASH ARENA» er en plassholder. Bytt det gjerne ut, men **ikke** bruk «Robot Wars», for det er et beskyttet varemerke.

---

## 0. Rolle og arbeidsmåte

Du er en senior spillutvikler, teknisk arkitekt og UI/UX-designer. Du skal bygge et komplett nettspill som kan publiseres, fra tomt repo til produksjonsklar versjon. Spillet er inspirert av TV-programmet Robot Wars, men alt innhold skal være originalt: navn, roboter, arenaer, grafikk og lyd.

**Arbeidsregler:**

1. Jobb i **milepæler** (se seksjon 14). Når en milepæl er ferdig, skal spillet bygge (`npm run build`), testene skal være grønne (`npm test`), lint skal være uten feil, og spillet skal kunne kjøres. Skriv en kort statusrapport før du går videre.
2. Ta egne, fornuftige beslutninger. Spør bare når noe er genuint tvetydig og påvirker arkitekturen. Hver ikke-triviell beslutning loggføres i `docs/DECISIONS.md` (ADR-format: kontekst → beslutning → konsekvens).
3. Ikke la noe stå halvferdig. Ingen `TODO` uten tilhørende issue i `docs/BACKLOG.md`, ingen døde knapper og ingen plassholdertekst i UI-et.
4. Alt spillinnhold (roboter, oppgraderinger, nivåer, arenaer, priser, balanse) skal være **datadrevet**, altså definert i typede konfigurasjonsfiler og ikke hardkodet i logikken.
5. Spillet skal kunne kjøres **uten eksterne assets som krever lisens**. Grafikk lages prosedyrisk eller som SVG/vektor i koden, eventuelt med CC0-assets (f.eks. Kenney.nl) med kreditering i `CREDITS.md`.
6. All kode, alle kommentarer og alle filnavn skrives på engelsk. UI-tekst støtter **norsk (standard) og engelsk** via et i18n-system.

---

## 1. Visjon og spillfølelse

- **Sjanger:** 2.5D top-down arenakamp mellom fjernstyrte kamproboter, sett ovenfra i lett skrå vinkel.
- **Følelse:** Tungt, mekanisk og eksplosivt. Treff skal _kjennes_: skjermristing, hit-stop (40–80 ms frys), gnister, metallsplinter, røyk fra skadde roboter og slagkraftig lyd.
- **Tempo:** En kamp varer 2–3 minutter. Lett å lære, vanskelig å mestre.
- **Kjerneløkke:** Kjemp → tjen penger og deler → oppgrader eller bygg om roboten → møt tøffere motstandere → lås opp nye arenaer og våpen.
- **Visuell stil:** «Industriell TV-arena». Mørk arena med kraftig spotlys, neonaksenter (oransje/gul fare-stripe, cyan UI), metallteksturer, blank betong, synlige skruer og varsellys. Tenk «moderne e-sport-sending møter skraphandel».

---

## 2. Teknisk stack (obligatorisk)

| Område              | Valg                                                                                                          | Begrunnelse                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Språk               | **TypeScript** (strict mode, `noUncheckedIndexedAccess`)                                                      | Typesikkerhet og vedlikeholdbarhet                |
| Bygg                | **Vite**                                                                                                      | Rask utvikling og statisk build                   |
| Spillmotor          | **Phaser 3** (siste stabile) med **Matter.js**-fysikk                                                         | Modent, scene-system, input, lyd og partikler     |
| Menyer/HUD-overlegg | **Preact** + CSS Modules (eller ren DOM med komponenter) over canvas                                          | Skarp tekst, tilgjengelighet, enkel styling       |
| State               | Enkel typet store (Zustand vanilla eller egen event-emitter)                                                  | Deles mellom Phaser og UI                         |
| Online flerspiller  | **WebRTC via PeerJS**, vertsautoritativ (host-authoritative)                                                  | Ingen egen spillserver, så alt kan hostes statisk |
| Lagring             | `localStorage` med versjonert skjema og migreringer, eksport/import av lagring som JSON                       | Ingen backend nødvendig                           |
| Tester              | **Vitest** (logikk), **Playwright** (røyktester av UI-flyt)                                                   |                                                   |
| Kvalitet            | ESLint (typescript-eslint), Prettier, Husky + lint-staged                                                     |                                                   |
| CI/CD               | **GitHub Actions** → build, test og deploy til **GitHub Pages** (alternativ: Netlify/Vercel/Cloudflare Pages) | Én-klikks publisering                             |
| PWA                 | `vite-plugin-pwa`                                                                                             | Installerbar og fungerer offline for singleplayer |

Nettverkslaget skal ligge bak et grensesnitt (`NetTransport`), slik at det senere kan byttes ut med en autoritativ server (f.eks. Colyseus) uten endringer i spillogikken.

---

## 3. Arkitektur og mappestruktur

Skill **simulering** (ren spillogikk) fra **presentasjon** (rendering, lyd, UI). Simuleringen skal kunne kjøres headless i tester.

```
/
├─ src/
│  ├─ main.ts                    # Bootstrap
│  ├─ config/                    # ALT datadrevet innhold
│  │  ├─ upgrades.ts             # Oppgraderingskategorier og -nivåer
│  │  ├─ weapons.ts
│  │  ├─ chassis.ts
│  │  ├─ arenas.ts
│  │  ├─ campaign.ts             # Nivåer, motstandere, belønninger
│  │  ├─ aiProfiles.ts           # AI-personligheter
│  │  ├─ economy.ts              # Priser, belønninger, kurver
│  │  └─ balance.ts              # Globale tall (skade, friksjon, tid)
│  ├─ core/                      # Motoruavhengig logikk
│  │  ├─ ecs/ eller entities/    # Robot, Weapon, Hazard, Projectile
│  │  ├─ combat/                 # Skademodell, kollisjoner, knockback
│  │  ├─ robot/                  # Byggesystem: chassis + moduler → stats
│  │  ├─ ai/                     # Behaviour tree / utility AI
│  │  ├─ match/                  # Kamptilstand, timer, dommerpoeng
│  │  ├─ economy/
│  │  └─ save/                   # Skjema, migrering, persistering
│  ├─ game/                      # Phaser-lag
│  │  ├─ scenes/                 # Boot, Preload, Arena, Results ...
│  │  ├─ render/                 # Robot-tegning, arenatiles, lys
│  │  ├─ fx/                     # Partikler, screen shake, hit-stop
│  │  └─ input/                  # Tastatur, gamepad, touch, keymaps
│  ├─ net/                       # NetTransport, PeerJS-impl, protokoll, prediksjon
│  ├─ audio/                     # Lydmanager, musikklag, SFX
│  ├─ ui/                        # Preact-komponenter, skjermer, tema
│  │  ├─ screens/                # MainMenu, Garage, Campaign, Lobby, Settings ...
│  │  ├─ components/             # Button, Card, StatBar, Modal, Tooltip ...
│  │  └─ theme/                  # Design-tokens (farger, typografi, spacing)
│  ├─ i18n/                      # no.json, en.json
│  └─ utils/
├─ tests/ (unit + e2e)
├─ public/ (ikoner, manifest, CC0-assets)
├─ docs/ (ARCHITECTURE.md, DECISIONS.md, BALANCE.md, BACKLOG.md)
├─ .github/workflows/deploy.yml
└─ README.md
```

**Arkitekturkrav:**

- Fast simuleringssteg (**fixed timestep, 60 Hz**) med interpolert rendering. Dette er avgjørende for nettverk og rettferdig fysikk.
- Spillet skal ha en **seedet RNG** (f.eks. mulberry32), slik at kamper kan reproduseres og testes.
- Bruk en event-bus for hendelser (`damage`, `ko`, `hazardTriggered`, `matchEnd`) som FX, lyd, UI og statistikk lytter på.
- Ingen sirkulære avhengigheter. `core/` får aldri importere fra `game/`, `ui/` eller `net/`.
- `docs/ARCHITECTURE.md` skal inneholde et diagram (Mermaid) over lagene og dataflyten.

---

## 4. Robotene

### 4.1 Robotmodell

En robot består av **chassis + drivverk + rustning + strømkilde + primærvåpen + (valgfri) hjelpemodul**. Endelige stats beregnes av en ren funksjon `computeRobotStats(build) → RobotStats` som skal være godt testet.

**Stats:** HP (strukturell integritet), masse, toppfart, akselerasjon, svingrate, energikapasitet, energiregenerering, rustning per side (front/sider/bak/topp), skade, våpenkjøletid og «selvretting» (evne til å snu seg igjen).

**Vekt og balanse:** Hver robot har en **vektgrense** per vektklasse. Tunge deler gir mer slagkraft og rustning, men lavere fart. Bygget kan ikke overskride grensen, og garasjen viser dette tydelig.

### 4.2 Skademodell

- **Retningsbasert skade:** Treff mot bakside og sider gjør mer skade enn mot fronten.
- **Komponentskade:** Ved bestemte HP-terskler kan drivverket eller våpenet bli svekket, noe som synes som røyk, gnister og at roboten halter.
- **Immobilisering:** En robot som ikke kan bevege seg på 10 sekunder (velta uten selvretting, fastklemt, i hullet) taper («KO»). Vis en tydelig nedtelling.
- **Seier** oppnås ved KO, ved å dytte motstanderen i «The Pit» eller ut av arenaen, eller på **dommerpoeng** når tiden er ute (poeng for skade, aggresjon og kontroll).

### 4.3 Våpentyper (minst 7, hver med unik fysikk og animasjon)

| Våpen                                                                          | Mekanikk                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Flipper** (pneumatisk)                                                       | Kaster motstanderen opp i luften og kan velte den. Energikrevende og med lang kjøletid. |
| **Horisontal spinner**                                                         | Bygger opp turtall over tid, og skaden skalerer med turtallet. Rekyl rammer begge.      |
| **Vertikal spinner/trommel**                                                   | Kaster motstanderen oppover. Høy skade, men gyroeffekt gir dårligere svingrate.         |
| **Hammer/øks**                                                                 | Overhead-slag med høy skade mot topprustning.                                           |
| **Knuser/klo**                                                                 | Griper og holder, og gir skade over tid mens motstanderen holdes fast.                  |
| **Sag**                                                                        | Kontinuerlig skade ved kontakt med lav rekkevidde.                                      |
| **Kile/ramme**                                                                 | Ingen aktiv skade, men overlegen dytting og sjanse til å komme under motstanderen.      |
| _(Bonus)_ **Lanse/pigg**, **flammekaster** (skade over tid), **elektromagnet** |                                                                                         |

Hvert våpen skal ha tydelig **telegrafering** (oppladingsanimasjon og lyd), slik at motstanderen kan reagere.

---

## 5. Oppgraderingssystem: 5 kategorier

Hver kategori har **minst 5 nivåer** og **minst 2 forgreninger/varianter**, slik at spilleren tar meningsfulle valg og ikke bare kjøper «neste nivå».

1. **Rustning og chassis:** aluminium → titan → komposittkeramikk. Varianter: _Jevn rustning_ eller _Tung front, lett bak_. Påvirker HP, masse og rustning per side.
2. **Drivverk og motorer:** hjul vs. belter vs. «shuffler». Fart, akselerasjon, svingrate, dyttekraft og grep.
3. **Våpen:** nye våpentyper låses opp, og hver type har egne oppgraderingsnivåer for skade, kjøletid og rekkevidde.
4. **Kraft og elektronikk:** batterikapasitet, regenerering og overboost (kort turbo). Variant: _Høy kapasitet_ eller _Rask regenerering_.
5. **Støttesystemer/spesial:** selvrettingsmekanisme, skjold-pulse, røykskjerm, magnetfeste mot arenagulvet (anti-flip) og sensor (viser motstanderens kjøletid). Spilleren kan bare utstyre **1–2** samtidig.

**Krav:**

- Garasjeskjermen viser **før/etter-sammenligning** av stats før kjøp, med grønne og røde piler og et radardiagram.
- Visuell endring: oppgraderinger skal **synes på roboten** (tykkere plater, andre hjul, ny våpenmodell, LED-farger).
- Spilleren kan lagre **3 robot-oppsett (loadouts)** og bytte fritt mellom dem.
- Spilleren kan selge deler tilbake for 60 % av prisen.
- Kosmetikk: maling/farge, dekaler og navn på roboten.

---

## 6. Økonomi og progresjon

- **Valuta:** «Credits» (penger) og «Skrapdeler» (sjelden ressurs til toppnivå-oppgraderinger).
- Belønningen for en kamp avhenger av seier/tap, vanskelighetsgrad, stil (bonus for flip, pit-KO, «perfekt» uten skade), kampens varighet og første seier på et nivå.
- **Reparasjonskostnad:** Skade må repareres mellom kampene i kampanjen (valgfri «hardcore»-innstilling), noe som gir en interessant avveining.
- Kostnadskurver defineres i `economy.ts` og dokumenteres i `docs/BALANCE.md`. Det skal være mulig å fullføre kampanjen uten «grinding» hvis spilleren vinner de fleste kampene, men det skal lønne seg å spille om nivåer.
- Lag et **balanse-simuleringsskript** (`npm run sim`) som kjører tusenvis av headless AI-mot-AI-kamper med ulike bygg og rapporterer vinnerrate per våpen og oppgradering. Ingen strategi skal ha over 60 % vinnerrate mot likeverdige bygg.

---

## 7. Kampanje: minst 12 nivåer

Strukturen er en turneringsstige delt i **4 ligaer** (én per arena), med en sjefskamp på slutten av hver liga.

| #     | Liga/Arena          | Motstander (eksempel)      | AI-profil                       | Spesielt                     |
| ----- | ------------------- | -------------------------- | ------------------------------- | ---------------------------- |
| 1     | Bronse – Verkstedet | «Rusty Rex»                | Nybegynner, treg og forutsigbar | Interaktiv tutorial          |
| 2     | Bronse              | «Wedgie»                   | Dytter, kile                    | Lærer pit-mekanikken         |
| 3     | Bronse              | «Buzzkill»                 | Sag, aggressiv                  |                              |
| 4     | **SJEF** Bronse     | «Sir Grindalot»            | Tung, hammer                    | Arena-«husrobot» patruljerer |
| 5     | Sølv – Støperiet    | «Flipside»                 | Flipper, avventende             | Lava/flammer i gulvet        |
| 6     | Sølv                | «Torque»                   | Horisontal spinner              |                              |
| 7     | Sølv                | «Twin Fang»                | 2 mot 1 (to lette roboter)      |                              |
| 8     | **SJEF** Sølv       | «Molten Maw»               | Knuser, taktisk                 |                              |
| 9     | Gull – Isfabrikken  | «Glacier»                  | Kontroll/kile                   | Glatt is, lav friksjon       |
| 10    | Gull                | «Overclock»                | Trommel, svært rask             |                              |
| 11    | Gull                | «Mirror»                   | Kopierer spillerens bygg        |                              |
| 12    | **SJEF** Gull       | «Voltress»                 | Elektromagnet, adaptiv          |                              |
| 13–15 | Mester – Kolosseum  | Rematch-gauntlet og finale | Adaptiv AI med alle triks       | Alle hazards aktive          |

- Hvert nivå har **stjerner (1–3)** basert på seier, tid og skade tatt.
- **Vanskelighetsgrader:** Lett, Normal, Hard og «Mekaniker» (ingen reparasjon og hardere AI). Disse påvirker AI-ens reaksjonstid, treffsikkerhet, aggresjon og evne til å bruke hazards. Vanskelighetsgradene skal **ikke** gi AI-en mer HP i stedet for bedre oppførsel. Bruk det bare som en liten justering på de høyeste nivåene.
- Korte mellomsekvenser i tekst med «programleder-kommentar» før og etter sjefskamper (tekst-overlegg, ingen video nødvendig).

---

## 8. AI-motstandere

- Implementer en **utility AI** eller et **behaviour tree** med disse atferdene: _Angrip_, _Flankér (gå for baksiden)_, _Unngå hazard_, _Lokk inn i hazard_, _Trekk deg tilbake og lad energi_, _Rett deg opp_, _Unngå å bli dyttet mot vegg/pit_, _Bruk spesialmodul_.
- **Personlighetsprofiler** (`aiProfiles.ts`) med parametere for aggresjon, forsiktighet, presisjon, reaksjonstid (ms), sannsynlighet for å utnytte hazards og ferdighet i flanking.
- AI-en skal ha **menneskelignende feil**: reaksjonsforsinkelse, sikte som ikke er perfekt og av og til feilvurderinger. Den skal **aldri** jukse ved å se input før det skjer.
- Bruk enkel styring (steering behaviors) og prediksjon av motstanderens posisjon. Pathfinding rundt hazards med grid/flowfield.
- En **debug-visning** (`?debug=ai`) viser AI-ens nåværende tilstand, mål og nytteverdier.

---

## 9. Arenaer: minst 4, hver med unike utfordringer

Felles for alle: «The Pit» (som åpnes ved en knapp eller etter en viss tid), **husroboter** som patruljerer hjørnesonene (CPZ, «Corner Patrol Zones») og straffer roboter som blir der for lenge, vegger med støtdemping og et tydelig visuelt fareområde-språk (gul/svart stripe).

1. **Verkstedet (Bronse):** Enkel og oversiktlig. Gulvspikere som går opp periodisk og én husrobot. Varmt lys og verkstedstøy.
2. **Støperiet (Sølv):** Flammestråler fra gulvet med telegrafering (rødt glødende rist før utbrudd), smeltet metall-kanal langs én kant (skade over tid) og pulserende oransje lys.
3. **Isfabrikken (Gull):** Lav friksjon på deler av gulvet, roterende plattform i midten og en presse fra taket som knuser i et markert område. Kald blå belysning og damp.
4. **Kolosseum (Mester):** Stor arena med flere hull, flipperplater i gulvet, sirkelsager som stikker opp langs veggene, to husroboter og dynamiske hazards som endrer seg i løpet av kampen.
5. _(Bonus)_ **Skraphaugen:** Ødeleggbare hinder og løse objekter (fysikk-props) som kan skyves.

**Krav til hver hazard:** tydelig telegrafering (minst 0,75 s), egen lyd, konfigurerbare parametere og deterministisk timing (seedet), slik at nettverksspill holder seg synkronisert.

---

## 10. Spillmoduser

1. **Kampanje** (seksjon 7).
2. **Hurtigkamp:** Velg arena, motstander-AI og vanskelighetsgrad. Gir små belønninger.
3. **Lokal flerspiller (2 spillere på én maskin):**
   - Spiller 1: WASD + Space (våpen) + Shift (spesial). Spiller 2: piltaster + Enter + høyre Ctrl. **Gamepad-støtte** for begge (Gamepad API) med automatisk tildeling.
   - Begge velger blant sine lagrede bygg eller ferdiglagde roboter. «Rettferdig modus» normaliserer budsjettet.
   - Tastaturoppsettet må støtte samtidige tastetrykk (test for ghosting-vennlige standarder) og kunne endres i innstillinger.
4. **Online flerspiller:**
   - **Privat rom med romkode** (6 tegn) og delbar lenke (`?join=ABC123`).
   - Vertsautoritativ simulering: verten kjører fysikken, og gjesten sender input og mottar snapshots (20–30 Hz) med **klient-side prediksjon for egen robot og interpolering for motstanderen**.
   - Lobby med valg av robot, arena og «klar»-status, ping-indikator og håndtering av frakobling (pause og nedtelling, deretter seier på walkover).
   - Prøv **WebRTC direkte**, og fall tilbake på en TURN-server hvis det trengs (konfigurerbart via miljøvariabel og dokumentert).
   - Versjonssjekk ved tilkobling, slik at klienter med ulik versjon ikke kan spille mot hverandre.
   - Protokollen defineres med typer i `net/protocol.ts`. Ikke send hele objekter, men komprimerte tall/arrays.
5. **Øvingsarena:** Uendelig HP-dummy, synlige skadetall og bryter for hazards av/på.

---

## 11. Grafikk, visuell design og «juice»

### 11.1 Roboter og arena

- Robotene tegnes **prosedyrisk i lag** (chassis, rustningsplater, hjul/belter, våpen og LED-er) med Phaser Graphics/RenderTexture eller SVG → tekstur ved oppstart. De skal se gjennomarbeidet ut, med skygger, kantlys (rim light), skruer/detaljer, slitasje og fargeskjema fra spillerens valg.
- **Skadetilstander synes:** riper, bulker, løse plater, røyk ved lav HP og gnister fra skadde komponenter.
- Animasjoner: hjulrotasjon og beltebevegelse, våpen med anticipation → strike → follow-through og turtallsuskarphet på spinnere (motion blur-sprite).
- Arenaen har lagdelt dybde: gulv med tekstur og fliser, dekaler (gamle brennmerker og olje), dynamiske skygger fra roboter og hazards, publikumsfelt eller sperrer med blinkende lys rundt kanten.
- **Lys:** Phaser Light2D/normal maps eller falske lys med additive gradienter. Spotlys over arenaen, og hazards lyser når de aktiveres.

### 11.2 Effekter («game feel»)

Gnistpartikler ved metall-mot-metall, skjermristing skalert etter treffkraft, hit-stop, kamerazoom og slow motion (0,3 s) ved KO eller pit, metallsplinter som blir liggende, røyk- og flammepartikler, skadetall (kan skrus av) og vignett ved lav HP. Alt skal kunne dempes i innstillinger (reduser bevegelse/ristingsintensitet).

### 11.3 UI/UX-design

- **Design-tokens** i `ui/theme`: fargepalett (mørk grafitt `#121418`, stålgrå, fare-gul `#FFC21A`, signal-oransje `#FF5A1F`, cyan `#22D3EE` for interaktive elementer), typografi (en kraftig kondensert overskriftsfont som _Rajdhani_/_Oxanium_ og en lesbar brødtekstfont som _Inter_, via Google Fonts eller selvhostet), spacing-skala og radius.
- Menyer i stil med «industrielt HUD»: vinklede hjørner, tynne glødende kantlinjer, subtile scanlines og mikroanimasjoner (hover, press og overganger på 150–250 ms).
- **Skjermer:** Splash/tittel (animert robot-silhuett og logo), Hovedmeny, Kampanjekart (liga-stige med låste og ulåste noder), Garasje (3D-aktig rotérbar forhåndsvisning av roboten, kategori-faner, stat-sammenligning), Pre-kamp «VS»-skjerm (begge roboter med stats, à la boksekamp), HUD i kamp (HP-barer med segmenter, energi, våpenkjøletid, timer, minikart over hazards), Resultatskjerm (belønninger som telles opp med lyd, stjerner, statistikk), Online-lobby, Innstillinger og Kreditering.
- **HUD-et** skal være lesbart på et øyeblikk, aldri dekke kampområdet og være tilpasset to spillere i lokal modus (venstre/høyre).
- **Responsivt:** 16:9 med letterboxing og skalering fra 1280×720 til 4K. Spillbar på mobil/nettbrett med virtuelle styrespaker (bonus, men UI skal ikke knekke).
- **Tilgjengelighet:** fargeblind-vennlige modi (ikke formidle informasjon kun med farge), tekststørrelse, tastaturnavigasjon i alle menyer, fokus-ringer og ARIA i DOM-UI.

---

## 12. Lyd

- Lydmanager med separate volumkanaler (Master, Musikk, Effekter, UI) som lagres i innstillingene.
- SFX: motorbrumming som følger farten (pitch-modulering), spinner-hyl som stiger med turtallet, metallsmell (flere varianter, tilfeldig pitch ±8 %), pneumatisk sus, hazard-varsler, publikumsjubel ved store treff og UI-klikk.
- Musikk: energisk elektronisk/industriell loop i kamp og roligere i garasjen. Lag gjerne lag som intensiveres når HP er lav eller tiden nesten er ute.
- Lag lyden prosedyrisk med Web Audio, bruk CC0-filer eller begge deler. Alt skal krediteres. Lyden starter først etter første brukerinteraksjon (autoplay-regler).

---

## 13. Lagring, innstillinger og robusthet

- Lagringsfil med `version`-felt og migreringsfunksjoner. Den valideres med et skjema (Zod) ved innlasting, og korrupt lagring håndteres pent med tilbud om tilbakestilling.
- Autolagring etter hver kamp og hvert kjøp. Eksport/import av lagringen som fil.
- Innstillinger: språk, volum, tastaturoppsett, grafikk-kvalitet (lav/middels/høy: antall partikler, lys og skygger), skjermristing, skadetall, FPS-teller og fullskjerm.
- Pause-meny (Esc/Start) med «fortsett», «start på nytt», «innstillinger» og «avslutt». Online-modus kan ikke pauses, men har en meny.
- Feilhåndtering: global error boundary med en vennlig feilskjerm og mulighet til å kopiere feillogg.

---

## 14. Milepæler (følg rekkefølgen)

1. **M1 – Fundament:** Repo, Vite+TS+Phaser+Preact, lint/format/test, CI som bygger og deployer en «Hello Arena» til GitHub Pages, mappestruktur, design-tokens og i18n-grunnmur.
2. **M2 – Kjernekamp:** Én robot styrt av spilleren i én arena, fysikk, kollisjon, skademodell, én motstander som står i ro, fixed timestep og event-bus.
3. **M3 – Våpen og juice:** Alle våpentyper, partikler, skjermristing, hit-stop, skadetilstander og grunnleggende lyd.
4. **M4 – AI:** Utility AI/behaviour tree, profiler, vanskelighetsgrader og debug-visning.
5. **M5 – Arenaer og hazards:** Alle 4 arenaer, pit, husroboter og alle hazards.
6. **M6 – Bygg og økonomi:** Robotmodell, 5 oppgraderingskategorier, garasje-UI, valuta, lagring og balanse-sim.
7. **M7 – Kampanje:** Alle nivåer, liga-kart, stjerner, sjefer, tutorial og programleder-tekster.
8. **M8 – Lokal 2-spiller:** Delt tastatur, gamepad og tilpasset HUD.
9. **M9 – Online:** NetTransport, PeerJS, lobby, romkoder, prediksjon/interpolering og frakoblingshåndtering.
10. **M10 – Polering og publisering:** Alle menyer ferdige, overganger, musikk, innstillinger, tilgjengelighet, PWA, ytelsesoptimalisering, README, CREDITS, skjermbilder og endelig deploy.

---

## 15. Kvalitetskrav og akseptkriterier

**Kode:**

- TypeScript strict uten `any` (unntak må begrunnes i en kommentar). Ingen ESLint-feil.
- Enhetstester for: stat-beregning, skademodell, økonomi/priser, lagringsmigrering, AI-beslutningsfunksjoner, seedet RNG/determinisme og nettverksprotokollens serialisering. **Mål: over 70 % dekning i `core/` og `net/protocol`.**
- Playwright-røyktest som starter spillet, går gjennom hovedmenyen → garasjen → starter kamp 1 → kampen lastes uten konsollfeil.
- Små, fokuserte moduler (helst under 300 linjer per fil) og tydelige navn. Ingen magiske tall i logikken (bruk `balance.ts`).

**Ytelse:**

- Stabil 60 FPS på en middels bærbar PC (integrert GPU) med «høy» grafikk, og 60 FPS på «lav» på eldre maskiner.
- Første innlasting under 3 MB gzip (utenom valgfri musikk som lastes lazy). Tid til spillbar meny under 3 s på vanlig bredbånd.
- Object pooling for partikler og prosjektiler. Ingen minnelekkasjer ved gjentatte kamper (test 20 kamper på rad).

**Opplevelse (sjekkliste før ferdig):**

- [ ] En ny spiller forstår styring og mål innen 60 sekunder (tutorial).
- [ ] Hvert våpen føles unikt og tydelig forskjellig.
- [ ] Hver arena krever en annen taktikk.
- [ ] Hver oppgradering gir en synlig og merkbar forskjell.
- [ ] Ingen nivåer er umulige eller trivielle på «Normal» (verifisert med balanse-sim).
- [ ] Online-kamp mellom to nettlesere på ulike nett fungerer i 3 minutter uten desynk.
- [ ] Lokal 2-spiller fungerer med tastatur+tastatur og gamepad+tastatur.
- [ ] Alt UI finnes på norsk og engelsk.

---

## 16. Publisering

- `npm run build` gir en ren statisk `dist/`. `vite.config.ts` har riktig `base` for GitHub Pages (konfigurerbart via env).
- `.github/workflows/deploy.yml`: på push til `main` installeres avhengigheter, så kjøres lint og test, deretter bygges og deployes det til GitHub Pages. PR-er kjører lint og test.
- Alternative oppsett dokumenteres i README (Netlify, Vercel og Cloudflare Pages: én-klikks deploy, og legg ved `netlify.toml`).
- Miljøvariabler (`.env.example`): `VITE_PEER_HOST`, `VITE_PEER_PORT`, `VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_CREDENTIAL`. Standard er PeerJS sin gratis sky-server, og README forklarer hvordan man kjører egen PeerJS-server og TURN (coturn) ved behov.
- SEO og deling: `<title>`, meta-beskrivelse, Open Graph-bilde (lag et stilig delingsbilde), favicon-sett og web-manifest.
- Ingen sporing eller tredjeparts-cookies som standard.

---

## 17. Dokumentasjon som skal leveres

- **README.md:** pitch, skjermbilder/GIF, funksjoner, kontroller, hvordan kjøre lokalt, bygge, teste og publisere, prosjektstruktur, og hvordan legge til nytt våpen, ny arena og nytt nivå (steg for steg, siden alt er datadrevet).
- **docs/ARCHITECTURE.md**, **docs/DECISIONS.md**, **docs/BALANCE.md** (tabeller med stats, priser og sim-resultater), **docs/NETCODE.md** (protokoll, tickrate og prediksjon), **CREDITS.md** og **LICENSE** (MIT for koden).

---

## 18. Juridisk/innhold

- Alt skal være originalt. Ikke bruk «Robot Wars», BBC-materiale, kjente robotnavn fra serien eller lignende logoer.
- Fonter og lyder må ha åpne lisenser, og alt krediteres.
- Innholdet skal passe for alle aldre: mekanisk ødeleggelse, ingen vold mot mennesker.

---

**Start nå med M1.** Presenter først en kort plan for M1 (filer som lages og avhengigheter), og implementer deretter. Etter hver milepæl rapporterer du hva som er gjort, hvordan det kan testes manuelt, testresultater og hva som kommer neste.
