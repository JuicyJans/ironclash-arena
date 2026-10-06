# Beslutningslogg (ADR)

Hver ikke-triviell beslutning: kontekst → beslutning → konsekvens.

## ADR-001: Stabile hovedversjoner av verktøykjeden

- **Kontekst:** Ved oppstart (oktober 2026) fantes nyere hovedversjoner (Phaser 4, Preact 11, Vite 8, TypeScript 7, ESLint 10). Promptet krever Phaser 3.
- **Beslutning:** Phaser 3.90, Preact 10, Vite 6, Vitest 3, TypeScript 5.9, ESLint 9 og Zod 3 – modne versjoner med godt økosystem.
- **Konsekvens:** Forutsigbar oppførsel og typer. Oppgradering til nye hovedversjoner er notert i BACKLOG.

## ADR-002: matter-js direkte i `core/`, Phaser kun til rendering

- **Kontekst:** Promptet ønsker Phaser + Matter.js, men krever også at simuleringen kjører headless i tester og at `core/` aldri importerer `game/`.
- **Beslutning:** `core/physics/world.ts` bruker `matter-js`-pakken direkte. Phaser sin Matter-integrasjon brukes ikke. Phaser tegner kun ut fra `WorldState`.
- **Konsekvens:** Samme simulering kjører i nettleseren, i Vitest, i balansesimulatoren (worker threads) og som online-vert. Fysikken er deterministisk gitt samme seed og input.

## ADR-003: Hastighetsbasert tanks-drivverk i stedet for krefter

- **Kontekst:** Kraftbasert styring i matter-js gir sleip og uforutsigbar følelse og er vanskelig å predikere på nettet.
- **Beslutning:** `stepDrive()` er en ren funksjon som justerer fart mot målfart med akselerasjon, grep og svingrespons, og som deles av simuleringen og klientprediksjonen. Dyttekamper avgjøres av matter-js' kollisjonsløser + en dyttekraft-multiplikator ved kontakt.
- **Konsekvens:** Tett kontroll, ens prediksjon på klient og vert, og meningsfulle forskjeller mellom hjul, belter og shuffler.

## ADR-004: Robotens «høyde» simuleres separat

- **Kontekst:** Spillet er top-down 2D-fysikk, men flippere, trommer og gulvflippere skal kaste roboter i luften og velte dem.
- **Beslutning:** Roboter har egen `z`/`vz` med tyngdekraft. I luften kolliderer de ikke (`collisionFilter.mask = 0`). Om landingen gir velt avgjøres med seedet RNG ved oppskyting (og vises som flip-animasjon).
- **Konsekvens:** Enkle og deterministiske luftmanøvrer uten 3D-fysikk.

## ADR-005: Velt og selvretting

- **Kontekst:** Promptet sier at en veltet robot uten selvretting taper etter 10 s. Ren «velt = tap» gjorde flippere for sterke.
- **Beslutning:** Alle kan «riste seg» rundt på 4 s ved å holde våpen/spesial. Flippere og hammere retter seg opp på 1 s med våpenet. Selvrettingsmodulen gir 2,2 → 0,8 s. Nedtellingen løper mens man er veltet.
- **Konsekvens:** Velt er farlig (gropen, husroboter, nedtelling), men ikke automatisk tap. Selvrettingsmodulen er verdifull.

## ADR-006: Immobilisering måles som bevegelse

- **Kontekst:** «En robot som ikke kan bevege seg på 10 sekunder taper.»
- **Beslutning:** Roboten må flytte seg > 26 enheter eller snu > 0,8 rad innen 1,2 s; ellers teller nedtellingen. Veltet, holdt eller lammet teller alltid. Å dytte en motstander teller som bevegelse. Øvingsarenaen og tutorialen teller aldri.
- **Konsekvens:** Passive spillere telles ut som i TV-formatet; fastklemte roboter som kjemper imot blir ikke straffet urettferdig.

## ADR-007: Utility-AI med forsinket persepsjon

- **Kontekst:** AI-en skal være menneskelig og aldri jukse.
- **Beslutning:** AI-en ser verden gjennom en ringbuffer med `reactionMs` forsinkelse, har siktestøy og «feilvurderinger», og velger blant 8 handlinger med nytteverdier og hysterese. Røykskjerm fryser motstanderens persepsjon. Navigasjon rundt feller bruker farekart + Dijkstra-flowfield.
- **Konsekvens:** Vanskelighetsgrad endrer reaksjonstid, presisjon, aggresjon, felle-bruk og feilrate – ikke HP (bortsett fra +10 % på sjefer på «Mekaniker»).

## ADR-008: Prosedyrisk grafikk og lyd

- **Kontekst:** Ingen lisensbelagte assets, men spillet skal se gjennomarbeidet ut.
- **Beslutning:** Roboter, arenaer, feller og partikler tegnes med Canvas 2D ved oppstart og registreres som Phaser-teksturer (`addImage` på lerret, ikke `addCanvas`, for å unngå `getImageData` på store lerreter). Lyd og musikk er Web Audio-synteser og en enkel sequencer.
- **Konsekvens:** ~0,5 MB gzip totalt, ingen lisensfiler, alt kan endres i kode. Oppgraderinger endrer tegningen (plater, bolter, farger, våpenmodell).

## ADR-009: Preact-DOM over lerretet, delt store

- **Kontekst:** Menyer og HUD krever skarp tekst, tilgjengelighet og tastaturnavigasjon.
- **Beslutning:** Preact rendrer alle skjermer og HUD i et DOM-lag. En liten typet store deles; Phaser skriver HUD-data ~15 Hz. UI styrer kamper gjennom `gameBridge`.
- **Konsekvens:** ARIA-roller, fokusringer, skalerbar tekst og fargeblind-modi. CSS Modules gir lokal styling; design-tokens ligger i `ui/theme`.

## ADR-010: Vertsautoritativ P2P med snapshots og prediksjon

- **Kontekst:** Ingen egen spillserver; fysikk med matter-js er ikke garantert bit-identisk mellom ulike JS-motorer.
- **Beslutning:** Verten kjører simuleringen; gjesten sender input (60 Hz) og får snapshots (30 Hz). Egen robot predikeres med samme drivverksmodell, alt annet interpoleres ~100 ms bak. Felles `WorldState` rendres likt lokalt og online.
- **Konsekvens:** Ingen desynk mulig (verten eier sannheten). Litt forsinkelse på motstanderens handlinger, men umiddelbar respons på egen kjøring. Se NETCODE.md.

## ADR-011: Balansering med parallell headless-simulering

- **Kontekst:** Krav om at ingen strategi har over 60 % vinnerrate og at ingen nivåer er umulige/trivielle.
- **Beslutning:** `npm run sim` kjører round-robin-turneringer på alle CPU-kjerner (worker threads) og rapporterer vinnerrater per våpen, oppgraderingsvariant og kampanjenivå.
- **Konsekvens:** Balansering er datadrevet og reproduserbar. Simuleringen avdekket også en alvorlig feil (Float32-presisjon i Dijkstra som ga flere sekunders tick og minneutmattelse).

## ADR-012: Elektromagneten som «elektronikkforstyrrer»

- **Kontekst:** En ren trekkemagnet trakk motstanderen inn i sitt eget våpen og vant nesten aldri.
- **Beslutning:** Magneten bremser drivverket, tapper energi og senker spinnernes turtall i tillegg til lett trekk.
- **Konsekvens:** Tydelig rolle som kontring mot spinnere, og balanse innenfor målene.

## ADR-013: Språk velges fra nettleseren, norsk som standard

- **Kontekst:** UI skal støtte norsk (standard) og engelsk.
- **Beslutning:** Første besøk: engelsk hvis `navigator.language` er engelsk, ellers norsk. Valget lagres. Strengene lages fra én kilde (`scripts/i18n/*.py`) slik at begge språk alltid har nøyaktig samme nøkler (testet).
- **Konsekvens:** Ingen manglende oversettelser. Playwright-testene kjører med `nb-NO`.

## ADR-014: `state/`-mappe utenfor den foreslåtte strukturen

- **Kontekst:** Promptets mappestruktur har ingen plass for delt app-tilstand som både Phaser og UI bruker.
- **Beslutning:** `src/state/` inneholder store, handlinger og `gameBridge`.
- **Konsekvens:** `ui/` importerer ikke Phaser, og `game/` importerer ikke Preact.
