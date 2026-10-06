# Source of truth for UI strings: key -> (Norwegian, English). Run scripts/i18n/build.py to regenerate the JSON files.
S = {}
def add(prefix, d):
    for k, v in d.items():
        S[f"{prefix}.{k}" if prefix else k] = v

add("common", {
  "back": ("Tilbake", "Back"), "cancel": ("Avbryt", "Cancel"), "continue": ("Fortsett", "Continue"),
  "credits": ("Credits", "Credits"), "scrap": ("Skrapdeler", "Scrap"), "locked": ("Låst", "Locked"),
  "skip": ("Hopp over", "Skip"), "stars": ("stjerner", "stars"), "tryAgain": ("Prøv igjen", "Try again"),
})
add("splash", {
  "title": ("Tittelskjerm", "Title screen"),
  "tagline": ("Bygg kamproboten din, oppgrader den i garasjen og knus konkurrentene i arenaer fulle av feller.",
              "Build your combat robot, upgrade it in the garage and smash rivals in trap-filled arenas."),
  "press": ("Trykk en tast for å starte", "Press any key to start"),
})
add("menu", {
  "title": ("Hovedmeny", "Main menu"), "campaign": ("Kampanje", "Campaign"), "quick": ("Hurtigkamp", "Quick match"),
  "quickHint": ("Én kamp mot AI", "One fight vs AI"), "local": ("Lokal 2-spiller", "Local 2-player"),
  "localHint": ("Delt tastatur / gamepad", "Shared keyboard / gamepad"), "online": ("Online", "Online"),
  "onlineHint": ("Privat rom med kode", "Private room with code"), "practice": ("Øvingsarena", "Practice arena"),
  "practiceHint": ("Test våpen og bygg", "Test weapons and builds"), "garage": ("Garasje", "Garage"),
  "garageHint": ("Bygg og oppgrader", "Build and upgrade"), "settings": ("Innstillinger", "Settings"),
  "credits": ("Kreditering", "Credits"), "yourRobot": ("Din robot", "Your robot"),
  "record": ("{wins} seire på {matches} kamper", "{wins} wins in {matches} matches"),
  "footer": ("Ingen sporing · Lagres lokalt i nettleseren", "No tracking · Saved locally in your browser"),
})
add("campaign", {
  "title": ("Kampanje", "Campaign"), "subtitle": ("Turneringsstigen · {stars}/{max} stjerner", "Tournament ladder · {stars}/{max} stars"),
  "league.bronze": ("Bronseligaen", "Bronze League"), "league.silver": ("Sølvligaen", "Silver League"),
  "league.gold": ("Gullligaen", "Gold League"), "league.master": ("Mesterligaen", "Master League"),
  "boss": ("SJEF", "BOSS"), "details": ("Kampdetaljer", "Fight details"), "opponent": ("Motstander", "Opponent"),
  "arena": ("Arena", "Arena"),
  "starRules": ("★ Vinn · ★★ Vinn innen {par} s · ★★★ Vinn innen {par} s og ta under {dmg} % skade",
                "★ Win · ★★ Win within {par} s · ★★★ Win within {par} s taking less than {dmg}% damage"),
  "reward": ("Seierspremie", "Victory reward"), "best": ("Beste tid", "Best time"), "difficulty": ("Vanskelighetsgrad", "Difficulty"),
  "damaged": ("Roboten er {pct} % skadet.", "Your robot is {pct}% damaged."), "repair": ("Reparer (⛁ {cost})", "Repair (⛁ {cost})"),
  "repaired": ("Roboten er reparert!", "Robot repaired!"), "fight": ("Kjemp!", "Fight!"),
  "c01": ("Første gnist", "First Spark"), "c02": ("Kiletrøbbel", "Wedge Trouble"), "c03": ("Sagbruket", "The Sawmill"),
  "c04": ("Verkstedets herre", "Lord of the Workshop"), "c05": ("Glødende gulv", "Glowing Floor"),
  "c06": ("Virvelvind", "Whirlwind"), "c07": ("To mot én", "Two Against One"), "c08": ("Smeltedigelen", "The Crucible"),
  "c09": ("Tynn is", "Thin Ice"), "c10": ("Overturtall", "Over-revved"), "c11": ("Speilbildet", "The Reflection"),
  "c12": ("Høyspenning", "High Voltage"), "c13": ("Gamle fiender", "Old Enemies"), "c14": ("Gjenfødt i ild", "Reborn in Fire"),
  "c15": ("Jerntronen", "The Iron Throne"),
})
add("difficulty", {"easy": ("Lett", "Easy"), "normal": ("Normal", "Normal"), "hard": ("Hard", "Hard"), "mechanic": ("Mekaniker", "Mechanic")})
add("garage", {
  "title": ("Garasje", "Garage"), "subtitle": ("Bygg, oppgrader og mal roboten din", "Build, upgrade and paint your robot"),
  "loadouts": ("Robotoppsett", "Loadouts"), "previewLabel": ("3D-forhåndsvisning av {name}. Bruk piltastene for å rotere.", "3D preview of {name}. Use the arrow keys to rotate."),
  "weight": ("Vekt", "Weight"), "overweight": ("For tung! Fjern eller bytt deler for å komme under vektgrensen.", "Overweight! Remove or swap parts to get under the weight limit."),
  "stats": ("Egenskaper", "Stats"), "categories": ("Delkategorier", "Part categories"),
  "tabs.chassis": ("Chassis", "Chassis"), "tabs.armor": ("Rustning", "Armour"), "tabs.drive": ("Drivverk", "Drive"),
  "tabs.weapon": ("Våpen", "Weapon"), "tabs.power": ("Kraft", "Power"), "tabs.support": ("Støtte", "Support"), "tabs.paint": ("Lakk", "Paint"),
  "equipped": ("MONTERT", "EQUIPPED"), "equip": ("Monter", "Equip"), "unequip": ("Demonter", "Unequip"),
  "equippedMsg": ("{name} montert", "{name} equipped"), "level": ("Nivå", "Level"), "levelOf": ("Nivå {level} av {max}", "Level {level} of {max}"),
  "owned": ("Du eier nivå {level} av {max}.", "You own level {level} of {max}."),
  "unlockHint": ("Låses opp ved å vinne «{level}».", "Unlocked by winning “{level}”."),
  "chassisInfo": ("Vektgrense {limit} kg · {hp} HP basis", "Weight limit {limit} kg · {hp} base HP"),
  "hint": ("Hold over en del for å se før/etter. Vektgrense: {limit} kg. Deler kan selges for 60 % av prisen.",
           "Hover a part to compare before/after. Weight limit: {limit} kg. Parts sell for 60% of their price."),
  "paint.name": ("Robotnavn", "Robot name"), "paint.primary": ("Hovedfarge", "Primary colour"), "paint.secondary": ("Sekundærfarge", "Secondary colour"),
  "paint.led": ("LED-farge", "LED colour"), "paint.decal": ("Dekal", "Decal"),
  "decals.none": ("Ingen", "None"), "decals.stripes": ("Striper", "Stripes"), "decals.flames": ("Flammer", "Flames"),
  "decals.skull": ("Hodeskalle", "Skull"), "decals.bolt": ("Lyn", "Bolt"), "decals.checker": ("Rutete", "Checker"), "decals.number": ("Nummer", "Number"),
})
add("shop", {
  "buy": ("Kjøp", "Buy"), "upgrade": ("Oppgrader", "Upgrade"), "sell": ("Selg", "Sell"),
  "sellTitle": ("Selge del?", "Sell part?"), "sellConfirm": ("Selge {name} for ⛁ {value}? Alle nivåer går tapt.", "Sell {name} for ⛁ {value}? All levels are lost."),
  "sold": ("Delen er solgt.", "Part sold."), "bought": ("{name} nivå {level} kjøpt!", "{name} level {level} purchased!"),
  "errors.locked": ("Delen er ikke låst opp ennå.", "This part is not unlocked yet."), "errors.maxed": ("Allerede på maks nivå.", "Already at max level."),
  "errors.credits": ("Ikke nok credits.", "Not enough credits."), "errors.scrap": ("Ikke nok skrapdeler.", "Not enough scrap."),
  "errors.equipped": ("Delen er montert på en robot – bytt den ut først.", "The part is equipped on a robot – swap it out first."),
  "errors.notOwned": ("Du eier ikke denne delen.", "You don't own this part."),
  "errors.overweight": ("Det ville gjort roboten for tung.", "That would make the robot overweight."),
  "errors.slots": ("Maks to støttemoduler samtidig.", "At most two support modules at once."),
})
