# Arkitektur

IRONCLASH ARENA er delt i **simulering** (ren spillogikk) og **presentasjon** (rendering, lyd, UI). Simuleringen kjører uten nettleser – i enhetstester, i balansesimulatoren og i online-verten.

## Lag og avhengigheter

```mermaid
flowchart TB
  subgraph Data
    config["config/<br/>våpen · deler · arenaer · kampanje · AI · økonomi · balanse"]
  end
  subgraph Core["core/ (motoruavhengig, headless)"]
    match["match/MatchSim<br/>fast 60 Hz-steg"]
    combat["combat/<br/>drivverk · skade · våpen · kollisjoner"]
    entities["entities/<br/>robot · feller · husroboter"]
    ai["ai/<br/>utility-AI · farekart · flowfield"]
    physics["physics/<br/>matter-js-wrapper"]
    econ["economy · campaign · save"]
    events(["EventBus"])
  end
  subgraph Presentation
    game["game/ (Phaser)<br/>scener · rendering · FX · input"]
    audio["audio/<br/>Web Audio"]
    ui["ui/ (Preact)<br/>skjermer · HUD"]
    state["state/<br/>app-store · handlinger"]
  end
  net["net/<br/>NetTransport · protokoll · vert/gjest"]

  config --> Core
  match --> combat & entities & ai & physics
  match --> events
  events --> game
  game --> audio
  ui --> state
  game --> state
  state --> econ
  net --> match
  net --> game
```

**Regler** (håndheves av `tests/unit/architecture.test.ts` og ESLint):

- `core/` og `config/` importerer aldri fra `game/`, `ui/`, `net/`, `audio/` eller `state/`.
- Ingen sirkulære (runtime-)importer.
- Moduler holdes under ~300 linjer.

## Dataflyt i en kamp

```mermaid
sequenceDiagram
  participant Input as Input (tastatur/gamepad/touch)
  participant Scene as ArenaScene
  participant Ctrl as MatchController
  participant Sim as MatchSim (core)
  participant View as MatchView
  participant HUD as HUD (Preact)

  loop hver frame (requestAnimationFrame)
    Scene->>Ctrl: step() × N (akkumulator, 60 Hz)
    Ctrl->>Input: readPlayerInput()
    Ctrl->>Sim: step(inputs)
    Sim-->>Sim: AI tenker · robotoppdatering · våpen · feller · fysikk · kollisjoner
    Sim-->>View: events (damage, ko, launched …) → FX + lyd
    Ctrl-->>Scene: prev/curr WorldState
    Scene->>View: render(prev, curr, alpha)  (interpolert)
    Scene->>HUD: buildHud() ~15 Hz → store
  end
```

- **Fast tidssteg:** Simuleringen går alltid i 60 Hz (`DT = 1/60`). Rendering interpolerer mellom de to siste tilstandene (`alpha = akkumulator / DT`). Hit-stop og slow motion manipulerer bare akkumulatoren lokalt.
- **Determinisme:** All tilfeldighet i simuleringen går via seedet `Rng` (mulberry32). AI-er har egne seedede RNG-er. Samme seed og input gir identisk kamp (testet).
- **Event-bus:** `damage`, `ko`, `launched`, `hazardTriggered`, `matchEnd` m.fl. Effekter, lyd, statistikk og nettverk abonnerer – simuleringen vet ikke om dem.
- **WorldState:** `captureState()` lager et rent snapshot som både renderer og nettverksprotokoll bruker. Derfor tegnes en online-gjest med nøyaktig samme kode som en lokal kamp.

## MatchController-varianter

| Kontroller        | Brukes i                                            | Simulering                                      |
| ----------------- | --------------------------------------------------- | ----------------------------------------------- |
| `LocalController` | Kampanje, hurtigkamp, lokal 2P, øving, menybakgrunn | Lokal `MatchSim`                                |
| `HostController`  | Online-vert                                         | Lokal `MatchSim`, sender snapshots 30 Hz        |
| `GuestController` | Online-gjest                                        | Ingen – prediksjon + interpolering av snapshots |

## UI ↔ Phaser

Preact-UI-et ligger som et DOM-lag over Phaser-lerretet. De deler en liten typet store (`state/store.ts`). UI-et styrer kamper via `gameBridge` (registreres av `game/createGame.ts`), så UI-koden importerer ikke Phaser. Phaser skriver HUD-data til store ~15 ganger i sekundet.

## Rendering

Alt er prosedyrisk: `game/render/paint/*` tegner roboter, arenaer, feller og partikler med Canvas 2D ved oppstart, og tegningene registreres som Phaser-teksturer. Garasjens 3D-aktige forhåndsvisning gjenbruker de samme lagene med skrå projeksjon og ekstrudering. Robotteksturer fjernes når en kamp avsluttes, slik at gjentatte kamper ikke lekker minne (testet med 20 kamper på rad).

## Lagring

`core/save` bruker Zod-skjema med `version`-felt og migreringer (`MIGRATIONS[fra-versjon]`). Korrupt lagring gir en dialog med tilbud om tilbakestilling. Innstillinger lagres separat, slik at nullstilt fremgang beholder innstillingene.
