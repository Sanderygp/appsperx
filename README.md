# MEESTER — Studieplatform Handhaving, Toezicht & Veiligheid (MBO 3, KW1C)

> **IJzeren vuist. Slimme methode. Altijd winnen.**
> Christmas Edition — dark navy night, sneeuwval, goud/rood/groen accents, iOS-glassmorphism.

Meester is een complete studieplatform-webapp voor een eerstejaars MBO Niveau 3-student
(Handhaving, Toezicht en Veiligheid, KW1C), met real-time cloudsynchronisatie via **Supabase
(PostgreSQL)** zodat telefoon en laptop altijd exact dezelfde voortgang tonen.

---

## Functionaliteit

| Domein | Wat het doet |
|---|---|
| **Cloudsync (Supabase)** | Elke wijziging (les, toetsscore, SRS-review, puzzelscore, Feynman-notitie, streak) wordt direct naar de PostgreSQL-database van Supabase geschreven. Bij inloggen op een ander apparaat wordt de volledige state teruggehaald (`GET /api/progress`). |
| **Authenticatie** | E-mail + wachtwoord (scrypt-hash), httpOnly-cookie-sessie (HMAC-getekend, 30 dagen, via `SESSION_SECRET`). |
| **9 vakken** | Rekenen, BOA Rechtskennis, BOA Praktijk, Zelfverdediging, Engels, Nederlands, Coaching, Professionele Vaardigheden, RTGB & Politie — elk met lessen, flashcards en oefentoetsen (volledig in het Nederlands). |
| **Oefentoetsen** | Elke toets vraagt een **perfecte 10/10** om te slagen. Minder = opnieuw, met per-vraag uitleg. |
| **SRS — "De IJzeren Vuist"** | Spaced Repetition volgens SM-2/Ebbinghaus (`src/lib/srs.ts`). De app zegt exact welke kaarten vandaag herhaald moeten worden en toont per knop het volgende interval. |
| **Breingym** | Dual N-Back (werkgeheugen, Web Speech API), Logic Grid Puzzels (deductie), Feynman-techniek (4-staps wizard, opgeslagen in de cloud). |
| **Gamificatie** | Dagelijkse-discipline-streak (server-berekend, Europe/Amsterdam), XP, rangleer van Recluut → Meester, ornamenten-badges, en een **Gouden Draak-vuurwerk** bij elke 10/10 ("Doel bereikt. Discipline overwint."). |
| **Kerst-editie** | Canvas-sneeuwval (`Snowfall.tsx`), glassmorphism-kaarten, donkernavy-basis met gouden kerstster, kerstrood en dennegroen (`globals.css`). |

## Technische stack

- **Next.js 16** (App Router) + **TypeScript** → gehost op **Vercel**
- **Tailwind CSS 4** + shadcn/ui + **Framer Motion** (iOS-achtige animaties)
- **Prisma + Supabase PostgreSQL** — alle 8 modellen (User, Streak, LessonProgress,
  TestAttempt, SrsCard, PuzzleScore, FeynmanEntry, DailyActivity) staan in Supabase
- **Zustand** (client-state) met sync-engine: elke mutatie → POST → volledige payload terug → atomische state-replace
- Routes: één SPA-view (`/`), alle navigatie is client-side state; 11 API-routes voor auth + sync

## Projectstructuur (kern)

```
prisma/schema.prisma               # databasetabellen (in de zip: PostgreSQL/Supabase)
prisma/schema.postgres.prisma      # identieke Supabase-variant (sandbox/dev-versie)
supabase/schema.sql                # SQL voor de Supabase SQL Editor (tabellen + RLS)
src/lib/auth.ts                    # scrypt-passwords + HMAC-sessiecookie
src/lib/srs.ts                     # SM-2/Ebbinghaus-algoritme (SRS-logica, gedocumenteerd)
src/lib/ranks.ts                   # XP-rangleer (Recluut → Meester)
src/lib/progress.ts                # server-side sync: full payload + streak/XP-logica
src/lib/store.ts                   # Zustand-store met sync-engine
src/lib/curriculum/*.ts            # 9 vakken: lessen, flashcards, toetsen (Nederlands)
src/lib/logicPuzzles.ts            # 3 handgemaakte logic-grid puzzels
src/app/api/auth/*                 # register / login / logout / me
src/app/api/progress/*             # lesson / test / srs / puzzle / feynman / activity
src/components/meester/*           # UI: Dashboard, Snowfall, Celebration (vuurwerk),
                                   # Flashcards, Test, NBack, LogicGrid, Feynman, Profile…
```

> **Note over de schema-bestanden:** in de **zip/productie-versie** staat `prisma/schema.prisma`
> al ingesteld op `provider = "postgresql"` (Supabase) — niks aanpassen. In de
> development-sandbox draait dezelfde code lokaal op SQLite, met `schema.postgres.prisma`
> als 1:1-variant. De modellen zijn in beide bestanden identiek.

---

## Deployen op Vercel + Supabase (stap-voor-stap)

### Stap 1 — Supabase-project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project**.
2. Kies een naam (bijv. `meester-prod`) en een regio dichtbij, bijv. **West EU (London/Paris)**.
3. Stel een sterk database-wachtwoord in en **bewaar het** (je hebt het zo nodig).
4. Wacht tot het project klaar is met initialiseren.

### Stap 2 — Databasetabellen aanmaken (2 opties)

**Optie A — Supabase SQL Editor (aanbevolen, geen tools nodig):**
1. Open in Supabase: **SQL Editor** → **New query**.
2. Plak de volledige inhoud van **`supabase/schema.sql`** (zit in dit project).
3. Klik **Run**. Klaar — alle 8 tabellen + indexes + Row Level Security staan erin.
   Controleer via **Table Editor**: je ziet `User`, `Streak`, `LessonProgress`,
   `TestAttempt`, `SrsCard`, `PuzzleScore`, `FeynmanEntry`, `DailyActivity`.

**Optie B — Prisma CLI (vanaf je eigen computer):**
```bash
npm install                       # of: bun install
cp .env.example .env              # vul DATABASE_URL + DIRECT_URL in (zie stap 3)
npx prisma db push                # dit gebruikt DIRECT_URL en maakt alle tabellen
```

### Stap 3 — Verbindingsstrings ophalen

In Supabase: klik op de knop **Connect** (bovenaan) of ga naar
**Project Settings → Database → Connection string**. Je hebt **twee** strings nodig:

| Variabele | Wat je kiest | Waarvoor |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler** (poort **6543**, voeg `?pgbouncer=true&connection_limit=1&sslmode=require` toe) | Runtime op Vercel (serverless) |
| `DIRECT_URL` | **Session pooler** (poort **5432**) of directe verbinding | Alleen voor `prisma db push` (migraties) |

Ze zien er zo uit (kopieer de echte waarden uit jouw dashboard):

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<WACHTWOORD>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.<PROJECT_REF>:<WACHTWOORD>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

> Als je wachtwoord speciale tekens bevat (`@ : / # ?`), URL-encode ze dan
> (`@` → `%40`, `:` → `%3A`, `/` → `%2F`), anders faalt de verbinding.

Genereer ook meteen een `SESSION_SECRET`:

```bash
openssl rand -hex 32
```

### Stap 4 — Code naar GitHub pushen

```bash
git init
git add .
git commit -m "Meester — studieplatform (Supabase + Vercel-klaar)"
git branch -M main
git remote add origin https://github.com/<jouw-gebruikersnaam>/meester.git
git push -u origin main
```

> Het bestand `.gitignore` zorgt dat `node_modules`, `.next`, `.env` (met je
> wachtwoorden!) en logbestanden níét worden meegepushd. `.env.example` wél,
> zodat duidelijk blijft welke variabelen nodig zijn.

### Stap 5 — Deployen op Vercel

1. Ga naar [vercel.com](https://vercel.com) → **Add New → Project** → importeer je repo.
2. Framework-preset: **Next.js** (wordt automatisch gedetecteerd; het build-commando
   `vercel-build` draait eerst `prisma generate` en dan `next build`).
3. Voeg bij **Environment Variables** (voor *Production, Preview en Development*) toe:

   | Naam | Waarde |
   |---|---|
   | `DATABASE_URL` | Transaction-pooler-URL uit stap 3 (poort 6543) |
   | `DIRECT_URL` | Session-pooler-URL uit stap 3 (poort 5432) |
   | `SESSION_SECRET` | de gegenereerde hex-string uit stap 3 |

4. Klik **Deploy** en wacht ~2 minuten.
5. Open je app op `https://<jouw-project>.vercel.app` → registreer een account.

### Stap 6 — Verifiëren (multi-device sync)

- Voltooi een les, haal 10/10 op een oefentoets, doe een SRS-review.
- Log in op je **telefoon** in hetzelfde account: streak, XP, SRS-schema en
  toetsresultaten zijn exact identiek.
- In Supabase → **Table Editor** zie je live de rijen in `Streak`, `SrsCard`,
  `TestAttempt`, `DailyActivity` verschijnen.

### Problemen oplossen

| Probleem | Oorzaak / oplossing |
|---|---|
| `P1001: Can't reach database server` | Verkeerde poort of host. Runtime moet de **pooler-URL met poort 6543** zijn, met `?pgbouncer=true&sslmode=require`. |
| `P1012: Environment variable not found: DIRECT_URL` | Zet óók `DIRECT_URL` in Vercel (de build valideert beide variabelen). |
| `P1003: Database ... does not exist` / tabellen ontbreken | Stap 2 nog niet uitgevoerd — run `supabase/schema.sql` in de SQL Editor. |
| Wachtwoord-fout bij verbinden | Speciale tekens in het wachtwoord URL-encoderen (zie stap 3). |
| Sessies blijven niet bewaard / uitgelogd | `SESSION_SECRET` ontbreekt in Vercel — de app waarschuwt hiervoor in de functielogs. |
| 401 op `/api/auth/me` bij eerste bezoek | Normaal: je bent nog niet ingelogd. Registreer eerst een account. |

### Google-login toevoegen (optioneel)

De app gebruikt e-mail/wachtwoord-authenticatie via de eigen API. Wil je later
Google-login via Supabase Auth? Zet dan in Supabase **Authentication → Providers →
Google** aan met je Google Cloud OAuth-client, en vervang `src/lib/auth.ts` door
`createServerClient()` uit `@supabase/ssr` — alle API-routes blijven werken omdat
ze alleen `getCurrentUser()` aanroepen.

---

## Lokaal draaien (development)

```bash
npm install
npx prisma db push      # schema naar de database uit .env
npm run dev             # http://localhost:3000
npm run lint            # ESLint
```

In de zip staat `prisma/schema.prisma` op PostgreSQL gericht; voor lokaal
experimenteren zonder Supabase kun je in `.env` de SQLite-regel activeren en in
het schema `provider = "sqlite"` zetten (zie `prisma/schema.postgres.prisma` voor
de exacte Supabase-versie).

## Kerst-theme & SRS — waar zit de code?

- **Kerst-theme**: `src/app/globals.css` (bovenin gedocumenteerd: navy-basis, goud/rood/groen
  via `--color-gold`/`--color-crimson`/`--color-pine`, `.glass`/`.glass-strong` glassmorphism),
  plus `src/components/meester/Snowfall.tsx` (canvas-sneeuwval) en `Celebration.tsx`
  (Gouden Draak-vuurwerk bij 10/10).
- **SRS-logica**: `src/lib/srs.ts` — het volledige SM-2-algoritme met Ebbinghaus-uitleg in
  de comments, inclusief interval-preview per beoordelingsknop.
- **Databaseschema**: `prisma/schema.postgres.prisma` (Supabase) en `supabase/schema.sql`
  (identiek, als SQL) — elk veld is van commentaar voorzien.
