from strings_a import S, add

add("stats", {
  "hp": ("Integritet (HP)", "Integrity (HP)"), "topSpeed": ("Toppfart", "Top speed"), "accel": ("Akselerasjon", "Acceleration"),
  "turnRate": ("Svingrate", "Turn rate"), "armorFront": ("Rustning foran", "Front armour"), "armorSide": ("Rustning side", "Side armour"),
  "armorRear": ("Rustning bak", "Rear armour"), "armorTop": ("Rustning topp", "Top armour"), "damage": ("Skade", "Damage"),
  "cooldown": ("Kjøletid", "Cooldown"), "range": ("Rekkevidde", "Reach"), "energyMax": ("Energi", "Energy"),
  "energyRegen": ("Regenerering", "Regeneration"), "pushForce": ("Dyttekraft", "Push force"), "flipResist": ("Anti-velt", "Flip resist"),
  "weight": ("Vekt", "Weight"),
})
add("radar", {"hp": ("HP", "HP"), "speed": ("Fart", "Speed"), "armor": ("Rustning", "Armour"), "damage": ("Skade", "Damage"),
  "energy": ("Energi", "Energy"), "handling": ("Kontroll", "Handling")})
add("controls", {"drive": ("Kjør", "Drive"), "up": ("Fremover", "Forward"), "down": ("Bakover", "Reverse"), "left": ("Sving venstre", "Turn left"),
  "right": ("Sving høyre", "Turn right"), "weapon": ("Våpen", "Weapon"), "special": ("Spesial", "Special"), "boost": ("Turbo", "Boost")})
add("hud", {
  "you": ("DEG", "YOU"), "energy": ("Energi", "Energy"), "ko": ("KO", "KO"), "flipped": ("VELTET", "FLIPPED"),
  "driveDamaged": ("DRIVVERK SKADET", "DRIVE DAMAGED"), "weaponDamaged": ("VÅPEN SKADET", "WEAPON DAMAGED"),
  "immobile": ("IMMOBIL {s}", "IMMOBILE {s}"), "special": ("Spesial {s}s", "Special {s}s"), "timeLeft": ("Tid igjen", "Time left"),
  "practice": ("Øving", "Practice"), "judges": ("Dommerne: {a} – {b}", "Judges: {a} – {b}"), "pitOpen": ("Gropen er åpen!", "The pit is open!"),
  "fight": ("Kamp", "Fight"), "go": ("KJØR!", "FIGHT!"), "minimap": ("Minikart over arenaen", "Arena minimap"),
  "moveHint": ("Beveg deg – ellers blir du telt ut!", "Move – or you'll be counted out!"),
  "selfRightHint": ("Hold {weapon} / {special} for å snu deg!", "Hold {weapon} / {special} to self-right!"),
  "disconnected": ("Tilkoblingen ble brutt – venter", "Connection lost – waiting"),
  "waitingHost": ("Venter på verten …", "Waiting for host …"),
})
add("local", {
  "title": ("Lokal 2-spiller", "Local 2-player"), "subtitle": ("To spillere på samme maskin", "Two players on one machine"),
  "player": ("Spiller {n}", "Player {n}"), "noPad": ("Ingen gamepad – tastatur", "No gamepad – keyboard"),
  "fair": ("Rettferdig modus", "Fair mode"),
  "fairHint": ("Utjevner budsjettforskjeller med en liten HP-justering, så dyre bygg ikke vinner automatisk.",
               "Evens out budget differences with a small HP adjustment so expensive builds don't win automatically."),
  "start": ("Start kamp", "Start match"),
})
add("online", {
  "title": ("Online", "Online"), "subtitle": ("Privat rom med romkode – direkte mellom nettlesere (WebRTC)", "Private room with code – browser to browser (WebRTC)"),
  "you": ("Deg", "You"), "name": ("Spillernavn", "Player name"), "robot": ("Robot", "Robot"),
  "create": ("Lag rom", "Create room"), "createHint": ("Få en 6-tegns kode og en lenke du kan dele.", "Get a 6-character code and a link to share."),
  "createBtn": ("Lag rom", "Create room"), "join": ("Bli med", "Join"), "joinHint": ("Skriv inn romkoden fra vennen din.", "Enter your friend's room code."),
  "joinBtn": ("Bli med", "Join"), "code": ("Romkode", "Room code"),
  "p2pNote": ("Tilkoblingen går direkte mellom spillerne. Bak strenge brannmurer kan det trengs en TURN-server (se README).",
              "The connection is peer-to-peer. Behind strict firewalls a TURN server may be needed (see README)."),
  "connecting": ("Kobler til", "Connecting"), "pleaseWait": ("Vent litt …", "Please wait …"),
  "errorTitle": ("Kunne ikke koble til", "Could not connect"),
  "errors.network": ("Nettverksfeil. Sjekk tilkoblingen og prøv igjen.", "Network error. Check your connection and try again."),
  "errors.notFound": ("Fant ikke rommet. Sjekk koden.", "Room not found. Check the code."),
  "errors.version": ("Dere har ulike spillversjoner. Last inn siden på nytt begge to.", "You are running different game versions. Both of you should reload."),
  "errors.full": ("Rommet er fullt.", "The room is full."), "errors.closed": ("Den andre spilleren forlot rommet.", "The other player left the room."),
  "errors.codeTaken": ("Romkoden er opptatt – prøv igjen.", "Room code taken – try again."),
  "room": ("Rom", "Room"), "copyLink": ("Kopier lenke", "Copy link"), "copied": ("Lenken er kopiert!", "Link copied!"),
  "waiting": ("Venter på motstander …", "Waiting for opponent …"), "ping": ("Ping {ms} ms", "Ping {ms} ms"),
  "players": ("Spillere", "Players"), "ready": ("KLAR", "READY"), "notReady": ("IKKE KLAR", "NOT READY"),
  "readyToggle": ("Jeg er klar", "I'm ready"), "leave": ("Forlat rom", "Leave room"), "start": ("Start kamp", "Start match"),
  "hostStarts": ("Verten starter kampen når begge er klare.", "The host starts the match when both are ready."),
})
add("pause", {"title": ("Pause", "Paused"), "menu": ("Meny", "Menu"), "resume": ("Fortsett", "Resume"), "restart": ("Start på nytt", "Restart"),
  "quit": ("Avslutt kamp", "Quit match"), "forfeit": ("Gi opp og forlat", "Forfeit and leave"),
  "onlineNote": ("Online-kamper kan ikke pauses – kampen fortsetter i bakgrunnen.", "Online matches can't be paused – the fight continues in the background.")})
add("practice", {"title": ("Øvingsarena", "Practice arena"), "subtitle": ("Uendelig HP-dummy og synlige skadetall", "Infinite-HP dummy with visible damage numbers"),
  "hazards": ("Feller og husroboter", "Hazards and house robots"), "dummy": ("Treningsdukke", "Training dummy"),
  "info": ("Du kjører {name}. Dukken står i ro og tåler alt.", "You drive {name}. The dummy stands still and takes everything."),
  "start": ("Start øving", "Start practice")})
add("quick", {"title": ("Hurtigkamp", "Quick match"), "subtitle": ("Velg arena, motstander og AI", "Choose arena, opponent and AI"),
  "ai": ("Motstander-AI", "Opponent AI"), "personality": ("Personlighet", "Personality"), "opponent": ("Motstander", "Opponent"),
  "rewardNote": ("Hurtigkamper gir små belønninger.", "Quick matches give small rewards."),
  "you": ("Du kjører: {name}", "You drive: {name}"), "start": ("Start", "Start")})
add("ai", {"rookie": ("Nybegynner", "Rookie"), "pusher": ("Dytter", "Pusher"), "berserker": ("Berserk", "Berserker"),
  "bruiser": ("Slåsskjempe", "Bruiser"), "patient": ("Tålmodig", "Patient"), "spinner": ("Spinner-fanatiker", "Spinner fanatic"),
  "tactician": ("Taktiker", "Tactician"), "speedster": ("Fartsfantom", "Speedster"), "champion": ("Mester", "Champion")})
add("setup", {"arena": ("Arena", "Arena")})
add("vs", {"label": ("Kampoppstilling", "Fight card"), "continue": ("Trykk en tast", "Press any key")})
add("results", {
  "title": ("Resultat", "Result"), "victory": ("Seier!", "Victory!"), "defeat": ("Tap", "Defeat"),
  "winner": ("{name} vinner!", "{name} wins!"), "nobody": ("Ingen", "Nobody"),
  "reason.ko": ("Knockout", "Knockout"), "reason.pit": ("Ned i gropen", "Into the pit"), "reason.judges": ("Dommeravgjørelse", "Judges' decision"),
  "reason.walkover": ("Walkover", "Walkover"), "reason.draw": ("Uavgjort", "Draw"),
  "starsLabel": ("{n} av 3 stjerner", "{n} of 3 stars"), "stats": ("Kampstatistikk", "Match stats"), "robot": ("Robot", "Robot"),
  "dealt": ("Skade gitt", "Damage dealt"), "taken": ("Skade tatt", "Damage taken"), "flips": ("Velt", "Flips"), "hp": ("Status", "Status"),
  "ko.destroyed": ("Ødelagt", "Destroyed"), "ko.immobile": ("Immobil", "Immobilised"), "ko.pit": ("I gropen", "In the pit"), "ko.walkover": ("Forlot", "Left"),
  "judgeScores": ("Dommerpoeng: {a} – {b}", "Judges' points: {a} – {b}"), "rewards": ("Belønninger", "Rewards"),
  "reward.win": ("Seier", "Victory"), "reward.loss": ("Deltakelse", "Participation"), "reward.flips": ("Velt-bonus", "Flip bonus"),
  "reward.pit": ("Gropen-bonus", "Pit bonus"), "reward.ko": ("KO-bonus", "KO bonus"), "reward.perfect": ("Perfekt kamp", "Perfect fight"),
  "reward.quick": ("Rask seier", "Quick win"), "reward.firstWin": ("Første seier", "First win"), "reward.stars": ("Tre stjerner", "Three stars"),
  "total": ("Totalt", "Total"), "repairNeeded": ("Reparasjon koster ⛁ {cost} (gjøres i garasjen eller kampanjekartet).", "Repairs cost ⛁ {cost} (in the garage or campaign map)."),
  "unlocked": ("Låst opp", "Unlocked"), "nextLevel": ("Neste kamp", "Next fight"), "toMap": ("Kampanjekart", "Campaign map"),
  "retry": ("Prøv igjen", "Try again"), "rematch": ("Omkamp", "Rematch"), "backToLobby": ("Tilbake til lobbyen", "Back to lobby"),
  "menu": ("Hovedmeny", "Main menu"),
})
add("save", {"corruptTitle": ("Lagringen er skadet", "Save data is corrupted"),
  "corruptText": ("Vi klarte ikke å lese lagringsfilen. Du kan starte på nytt med en ny lagring.", "We couldn't read your save file. You can start over with a fresh save."),
  "reset": ("Start på nytt", "Start over")})
add("settings", {
  "title": ("Innstillinger", "Settings"), "tabs.general": ("Generelt", "General"), "tabs.audio": ("Lyd", "Audio"), "tabs.graphics": ("Grafikk", "Graphics"),
  "tabs.controls": ("Kontroller", "Controls"), "tabs.access": ("Tilgjengelighet", "Accessibility"), "tabs.data": ("Data", "Data"),
  "language": ("Språk", "Language"), "repairCosts": ("Hardcore: reparasjonskostnader", "Hardcore: repair costs"),
  "repairHint": ("Skade følger med mellom kampanjekamper og må repareres for credits. «Mekaniker»-vanskelighetsgrad slår alltid dette på.",
                 "Damage carries over between campaign fights and must be repaired with credits. The Mechanic difficulty always enables this."),
  "touch": ("Berøringskontroller", "Touch controls"), "touchModes.auto": ("Auto", "Auto"), "touchModes.on": ("På", "On"), "touchModes.off": ("Av", "Off"),
  "volume.master": ("Hovedvolum", "Master volume"), "volume.music": ("Musikk", "Music"), "volume.sfx": ("Effekter", "Effects"), "volume.ui": ("Grensesnitt", "Interface"),
  "quality": ("Grafikkvalitet", "Graphics quality"), "qualities.low": ("Lav", "Low"), "qualities.medium": ("Middels", "Medium"), "qualities.high": ("Høy", "High"),
  "shake": ("Skjermristing", "Screen shake"), "damageNumbers": ("Skadetall", "Damage numbers"), "fps": ("FPS-teller", "FPS counter"),
  "fullscreen": ("Fullskjerm", "Fullscreen"), "toggleFullscreen": ("Slå av/på", "Toggle"),
  "pressKey": ("Trykk en tast …", "Press a key …"), "resetKeys": ("Tilbakestill tastatur", "Reset keyboard"),
  "gamepadHint": ("Gamepad: venstre spak/D-pad kjører, A/RB = våpen, B/LB = spesial, X = turbo, Start = pause. Gamepads tildeles automatisk.",
                  "Gamepad: left stick/D-pad drives, A/RB = weapon, B/LB = special, X = boost, Start = pause. Gamepads are assigned automatically."),
  "colorBlind": ("Fargeblind-modus", "Colour-blind mode"), "cb.off": ("Av", "Off"), "cb.deuteranopia": ("Deuteranopi", "Deuteranopia"),
  "cb.protanopia": ("Protanopi", "Protanopia"), "cb.tritanopia": ("Tritanopi", "Tritanopia"),
  "textScale": ("Tekststørrelse", "Text size"), "reduceMotion": ("Reduser bevegelse", "Reduce motion"),
  "accessHint": ("Alle menyer kan brukes med tastatur (Tab, piltaster, Enter, Esc). Faresoner vises både med farge og mønster.",
                 "All menus work with the keyboard (Tab, arrows, Enter, Esc). Hazards are shown with both colour and pattern."),
  "export": ("Eksporter lagring", "Export save"), "exportBtn": ("Last ned fil", "Download file"), "import": ("Importer lagring", "Import save"),
  "importFailed": ("Filen er ikke en gyldig lagring.", "The file is not a valid save."), "imported": ("Lagringen er importert!", "Save imported!"),
  "reset": ("Nullstill fremgang", "Reset progress"), "resetBtn": ("Nullstill", "Reset"),
  "resetConfirm": ("Dette sletter alle credits, deler og kampanjefremgang. Innstillinger beholdes.", "This deletes all credits, parts and campaign progress. Settings are kept."),
  "resetDone": ("Fremgangen er nullstilt.", "Progress reset."),
})
add("credits", {"title": ("Kreditering", "Credits"), "game": ("Spillet", "The game"),
  "made": ("IRONCLASH ARENA – laget med TypeScript, Phaser og mye metallisk kjærlighet.", "IRONCLASH ARENA – made with TypeScript, Phaser and lots of metallic love."),
  "original": ("Alle roboter, arenaer, navn og figurer er originale og fiktive.", "All robots, arenas, names and characters are original and fictional."),
  "procedural": ("All grafikk, musikk og lyd genereres prosedyrisk i koden – ingen lisensierte ressurser.", "All graphics, music and sound are generated procedurally in code – no licensed assets."),
  "libraries": ("Åpen kildekode", "Open source"), "full": ("Full liste i CREDITS.md.", "Full list in CREDITS.md.")})
add("error", {"title": ("Noe gikk i stykker", "Something broke"),
  "text": ("Beklager! Spillet støtte på en uventet feil. Last inn på nytt – fremgangen din er lagret.", "Sorry! The game hit an unexpected error. Reload – your progress is saved."),
  "copy": ("Kopier feillogg", "Copy error log"), "copied": ("Feilloggen er kopiert.", "Error log copied."),
  "reload": ("Last inn på nytt", "Reload"), "resetSave": ("Nullstill lagring", "Reset save")})
