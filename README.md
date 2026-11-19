# Lift Me — *Move smarter.*

A simple ride-hailing app for a small Nairobi pilot. **One app, one codebase, three dashboards**:

| Dashboard | Who | Where | What it does |
|---|---|---|---|
| Passenger | riders | Android / iPhone | book a ride, see the price, track the driver live, pay (M-Pesa or cash), receipts, ratings, help & SOS |
| Driver | drivers | Android / iPhone | apply (details, photo, documents, vehicle), go online, accept requests, run the trip, collect cash, earnings |
| Admin | your team | web browser | approve/reject drivers, see rides + history, set prices & commission, suspend users, support reports |

Built with **Expo (React Native) + TypeScript + Expo Router** and **Supabase** (phone login, Postgres + PostGIS, private storage, realtime, Edge Functions).

> 👉 **Start here: [docs/SETUP.md](docs/SETUP.md)** — step-by-step, written for non-developers.

## Folder map

```
src/app/            screens (every file is a screen)
  (auth)/           welcome, phone, otp, complete-profile, choose-role
  passenger/        Home · Rides · Account tabs + booking, live trip, receipts, help
  driver/           Home · Earnings · Account tabs + onboarding, trip summary, help
  admin/            web sidebar: Overview, Drivers, Rides, Pricing, Users, Reports
  share/[token]     public "follow my trip" page
src/components/     Button, Input, PhoneInput, OTPInput, Card, Header, Loading, Empty, Error, Map…
src/features/       data hooks per area (auth, rides, driver, booking, places, support, admin)
src/theme/          brand colours + Inter font
supabase/
  migrations/       ALL database code: tables, RLS, ride state machine (RPC), storage, seeds
  functions/        Edge Functions: places, get-quote, mpesa-stk-push, mpesa-callback
  tests/            database security + "two drivers accept at once" tests
docs/               setup, security, testing, launch checklist, progress
```

## Everyday commands

```bash
npm install
```

```bash
npm start
```

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:db
```

`npm run test:db` needs a local Postgres 16 + PostGIS (it runs the migrations on a throwaway database and tries to break the security rules).

## The rules this code follows

See [PROJECT_RULES.md](PROJECT_RULES.md). In short: RLS on every table, fares calculated only on the server, ride status changed only by database functions, atomic accept, money as whole KES, M-Pesa success only from the verified callback, private documents, no secrets in the app, prices/area/currency in tables, no fake data.
