# Backlog

Ting som er bevisst utsatt. Koden inneholder ingen `TODO` uten en linje her.

| #   | Område     | Beskrivelse                                                                                                                                                                | Prioritet |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Online     | Autoritativ server (Colyseus/WebSocket) som ny `NetProvider` for rangerte kamper og anti-juks.                                                                             | Middels   |
| 2   | Online     | Mer enn to spillere online (2v2) – lobby og protokoll støtter i dag én gjest.                                                                                              | Lav       |
| 3   | Grafikk    | Ekte normal maps/Light2D for robotene (i dag falske lys med additive gradienter).                                                                                          | Lav       |
| 4   | Grafikk    | Tilpasset internoppløsning for svake mobiler (rendrer alltid 1920×1080 og skalerer).                                                                                       | Middels   |
| 5   | Lyd        | Valgfri lazy-lastet innspilt musikk (CC0) som alternativ til den prosedyriske sequenceren.                                                                                 | Lav       |
| 6   | Innhold    | Bonusvåpen fra promptet som ennå ikke har egne mekanikker utover de 10 som finnes.                                                                                         | Lav       |
| 7   | Kontroller | Alternativ «pek og kjør»-styring (i dag kun tanks-styring).                                                                                                                | Middels   |
| 8   | Verktøy    | Oppgradering til Phaser 4 / Vite 7+ / ESLint 10 når økosystemet er modent (se ADR-001).                                                                                    | Lav       |
| 9   | Balanse    | Kilen ligger rundt 30 % vinnerrate i simuleringen (under målet om balanse, men innenfor 60 %-taket). Vurder et unikt kile-triks, f.eks. bedre sjanse til å dytte i gropen. | Middels   |
| 10  | Testing    | Playwright-test av online-flyt i CI (krever to nettleserkontekster og nettverk til PeerJS). Testet manuelt/skriptet lokalt.                                                | Middels   |
