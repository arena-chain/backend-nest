# ArenaChain Fixture Data — Import Guide

## What's included

| File | Collection | Count |
|------|------------|-------|
| `users.json` | `users` | 68 (60 players + 8 team managers) |
| `playerprofiles.json` | `playerprofiles` | 60 |
| `teams.json` | `teams` | 8 |
| `teammanagerprofiles.json` | `teammanagerprofiles` | 8 |
| `channels.json` | `channels` | 20 |

## Default password

All users have password: **`secret`**
(bcrypt hash: `$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW`)

## ID Reference Map

| Range | Collection |
|-------|------------|
| `...0001` → `...0060` | Player users |
| `...0061` → `...0068` | Team manager users |
| `...0101` → `...0108` | Teams |
| `...0201` → `...0220` | Channels |
| `...0301` → `...0360` | Player profiles |
| `...0401` → `...0408` | Team manager profiles |

## Teams & Rosters

| Team | ID | Players | Manager |
|------|----|---------|---------|
| Team Liquid | `...101` | AhmedVAL, MoTrabelsi, YassinePro, AnisBadri, HamzaKing | KMansouri |
| Fnatic | `...102` | BilelIfa, MaherVAL, RiadhG, OussamaHD, SaadBG | SBenchikh |
| Natus Vincere | `...103` | FaiceLF, Mortadha, BassemS, NaimSliti, WajdiK | WAlRashid |
| Cloud9 | `...104` | YENesyri, BoufVAL, AHarit, AyoubEK, JawadEY | TElFassi |
| 100 Thieves | `...105` | ZakariaA, BilalEK, IliasC, AdamM, NayefA | NZiani |
| Sentinels | `...106` | RMahrez (PRO), IBennacer (PRO), YoucefA, Feghouli, RGhezzal | YAlQahtani |
| LOUD | `...107` | MZerkane, SBenrahma, HAouar, OIdrissi, DBenlamri | RTounsi |
| Evil Geniuses | `...108` | MSalah (PRO/RADIANT), MostaVAL, OMarmoush, AHegazi, ASayed | AElRifai |

**Free agents (no team):** Players 41–60

## How to import

### Using mongoimport (recommended)

```bash
MONGO_URI="mongodb://localhost:27017/arenachain"

mongoimport --uri "$MONGO_URI" --collection users           --jsonArray --file fixtures/users.json
mongoimport --uri "$MONGO_URI" --collection playerprofiles  --jsonArray --file fixtures/playerprofiles.json
mongoimport --uri "$MONGO_URI" --collection teams           --jsonArray --file fixtures/teams.json
mongoimport --uri "$MONGO_URI" --collection teammanagerprofiles --jsonArray --file fixtures/teammanagerprofiles.json
mongoimport --uri "$MONGO_URI" --collection channels        --jsonArray --file fixtures/channels.json
```

### Using MongoDB Compass

1. Open the target database
2. Select collection → **ADD DATA** → **Import JSON file**
3. Import each file into its matching collection name (see table above)

### Drop & re-import (clean slate)

```bash
MONGO_URI="mongodb://localhost:27017/arenachain"

mongoimport --uri "$MONGO_URI" --collection users               --jsonArray --drop --file fixtures/users.json
mongoimport --uri "$MONGO_URI" --collection playerprofiles      --jsonArray --drop --file fixtures/playerprofiles.json
mongoimport --uri "$MONGO_URI" --collection teams               --jsonArray --drop --file fixtures/teams.json
mongoimport --uri "$MONGO_URI" --collection teammanagerprofiles --jsonArray --drop --file fixtures/teammanagerprofiles.json
mongoimport --uri "$MONGO_URI" --collection channels            --jsonArray --drop --file fixtures/channels.json
```

## Notable players

| Nickname | Rank | Country | Notes |
|----------|------|---------|-------|
| MSalah | Radiant (2100 elo) | Egypt | Pro, Riot-verified, EG captain |
| RMahrez | Immortal (1950 elo) | Algeria | Pro, Riot-verified, Sentinels captain |
| IBennacer | Immortal (1800 elo) | Algeria | Pro, Riot-verified |
| RiadhG | Immortal (1890 elo) | Tunisia | Fnatic, highest non-pro |
| OmarAR | Ascendant (1740 elo) | UAE | Free agent, channel owner |

## Player nationality breakdown

| Country | Count | Team |
|---------|-------|------|
| Tunisia | 15 | Team Liquid (5), Fnatic (5), NAVI (5) |
| Morocco | 10 | Cloud9 (5), 100 Thieves (5) |
| Algeria | 10 | Sentinels (5), LOUD (5) |
| Egypt | 8 | EG (5) + 3 free agents |
| Saudi Arabia | 7 | Free agents |
| UAE | 5 | Free agents |
| Jordan | 2 | Free agents |
| Lebanon | 1 | Free agent |
| Iraq | 1 | Free agent |
| Kuwait | 1 | Free agent |

## Channels (20 players have channels, 40 do not)

Players **with** channels: IDs 01,03,07,09,12,15,17,20,23,26,28,31,34,38,41,44,47,51,55,58

Most subscribed channel: **Mahrez Valorant** (7 subscribers, pro player)
