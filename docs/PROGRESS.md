# Lift Me — Progress

The owner asked for the whole app in one go instead of phase-by-phase, so Phases 1–8 were built together.

| Phase | Name | Status |
|---|---|---|
| 0 | Plan | DONE — `docs/PHASE_0_PLAN.md` |
| 1 | App, design and login | DONE |
| 2 | Database and prices | DONE (placeholder prices — owner must set real ones) |
| 3 | Driver sign-up and admin approval | DONE |
| 4 | Map, booking and fare estimate | DONE (needs Google keys to run) |
| 5 | Matching drivers and the trip | DONE |
| 6 | Payments (Cash + M-Pesa sandbox) | DONE (needs Daraja sandbox keys; live M-Pesa OFF) |
| 7 | History, ratings, earnings and admin tools | DONE |
| 8 | Testing and getting ready for a pilot | DONE in code — see `docs/LAUNCH_CHECKLIST.md` for what's left |

## Web app (PWA) — branch `pwa`
- Brand changed to taxi yellow + black and the client's LIFTME logo ("Move smarter."); icons generated from it.
- Installable web app: manifest, icons, service worker (app files only, offline page), install button (Android/desktop)
  and Add-to-Home-Screen steps (iPhone). Netlify config in `netlify.toml`. See docs/SETUP.md §9.
- Fixed: admin dashboard crashed (blank page) on the web.
- Phone login works with Supabase test numbers (no SMS provider yet). Test admin: 0700 000 099.

## Multi-country ("markets") — Part A, applied to the live project 2026-11-20
- Database migration `20261120000001_markets.sql` (markets, market_prices, market on areas/quotes/rides/drivers,
  per-country documents, per-market fares/commission/earnings/admin totals). Tests: `supabase/tests/markets.test.sql`.
- Edge Functions places / get-quote / mpesa-stk-push redeployed (search per country, no cross-market trips,
  M-Pesa only for KES).
- App: phone country picker (+254 / +1), money per currency (KES whole, USD cents), km/mi, payment methods and
  emergency numbers per market. Admin: market switcher, per-market Pricing, new Markets page, move driver market.
- Not done (needs the client): Stripe card payments, US SMS registration, US driver checks/insurance.

## Indianapolis test market (client is based in Indiana) — live since 2026-11-20
- Migration `20261120000002_indianapolis_test_market.sql`: market `indianapolis` (USD cents, miles, +1, 911,
  America/Indiana/Indianapolis, cash only, 15% commission), service area ≈ Marion County (downtown, airport,
  Speedway, Broad Ripple; not Carmel), PLACEHOLDER prices, US driver documents (licence, registration, insurance).
- To log in with a US number before a US SMS sender exists, add a Supabase test number, e.g. 13175550100=123456.

## Live Supabase project
- Project **lift-me** (`sfvnchzihitdpblnjfvv`), Frankfurt (eu-central-1), free plan — created 2026-11-16.
- All 6 migrations applied; RLS on all 18 tables; private `driver-documents` bucket; realtime on rides/offers/locations/payments; `no_driver_found` job runs every minute.
- Edge Functions deployed: `places`, `get-quote`, `mpesa-stk-push` (login required) and `mpesa-callback` (no login; protected by its secret).
- `.env` (git-ignored) points the app at this project.
- Still needed from the owner: Edge Function secrets (Google server key, M-Pesa sandbox keys, callback secret), phone/SMS provider + test numbers, first admin.

## Not yet tried end-to-end
Everything was checked locally:
- lint, typecheck and unit tests,
- the database migrations and security tests on Postgres 16 + PostGIS,
- the Edge Functions type-checked with Deno,
- web and Android bundles built.

Still to try once the owner has created the Supabase project and keys:
- SMS login,
- Google calls,
- M-Pesa sandbox.

## Small deviations from the plan
- The passenger, driver and admin dashboards are the folders `src/app/passenger`, `src/app/driver` and `src/app/admin`, not route groups. Passengers and drivers both have a "Home" and an "Account" tab, and route groups can't hold two screens with the same address.
- On iPhone in Expo Go the map is Apple Maps. Google is still used for search, routes and prices. Android always uses Google Maps.

## Suggested later (not needed for the pilot)
Push notifications, in-app chat, scheduled rides, promo codes, driver payouts via M-Pesa B2C, Swahili translation, a web map for admins, and a cheaper SMS route (Africa's Talking).

## Push notifications (web) — live 2026-11-20
- Migration `20261120000003_push_notifications.sql`, Edge Function `push-send`, service worker push handlers,
  "Turn on notifications" card. Server pipeline verified live (trigger → pg_net → function → web push; dead
  devices removed). Verified on a real iPhone (Home Screen app): test alert, "New ride request", accept from
  the alert, "Ride cancelled". Android Chrome still to try.

## Free maps (no Google needed yet) — live 2026-11-21
- Web map: MapLibre + OpenFreeMap. Address search: Photon on the device (server hands over countries + centre).
  Routes: OSRM in get-quote with a ~20 km/h city floor; straight-line estimate if OSRM is down.
- Booking tested end to end through the screens on the live project (CBD → Sarit Centre, 3.7 km, real prices).


## Ride types: bodas + car sizes — live 2026-11-21
- Migration `20261121000002_vehicle_types.sql`: Boda Electric, Boda, Lift Mini, Lift, Lift XL, Lift Premium
  (`pricing.vehicle_kind`, `is_electric`, `can_take`). Bodas Nairobi only; PLACEHOLDER prices.
- Matching uses `can_take` (electric boda also takes fuel boda trips; XL takes Lift + Mini; cars never get bodas).
- Drivers pick their type in onboarding; admins can change it ("Save category"). Tests: `vehicle_types.test.sql`.
- Verified live on a real iPhone: Boda Electric request → "New boda request 🏍️" in ~1 s → accept → cancel alert;
  a Lift Mini request was not offered to the boda rider.
- Fixed: bottom tab labels were cut off on phones.

## New home: https://rideliftme.com (Cloudflare) — live 2026-11-22
- Web app hosted on Cloudflare Workers (static assets) in the developer's Cloudflare account, built from branch `pwa`
  on every push (`npm run build:web`, `npx wrangler deploy`, settings in `wrangler.jsonc`, headers in `public/_headers`).
  No "Powered by Netlify" badge. Domain rideliftme.com + www bought 2026-11-22 on Cloudflare (owner details: client).
- Can move to the client's Cloudflare account after 2026-12-02 (Cloudflare blocks moves for 10 days after purchase).
- liftme.pro (client's account) not used yet — plan: forward it to rideliftme.com.
- Speed: fonts subset to WOFF2 (7.7 MB -> 0.6 MB), per-set icon imports; first load on slow 3G 9.9 s -> 6.2 s.
- Verified on real phones: iPhone (driver) + Android Chrome (passenger) notifications; boda request -> accept ->
  "driver on the way". Drivers must keep the app open on screen (web apps can't send location in the background).
- Netlify site (liftmerides.netlify.app) is retired: its free credits ran out and deploys are paused.

## Driver money (wallet) — live 2026-11-22
- Migration `20261122000001_driver_wallet.sql`: `driver_ledger` (permanent entries) + `drivers.wallet_balance`.
  Cash trip completed -> driver owes the commission (charged at completion, not only on "cash received");
  M-Pesa paid -> Lift Me owes the driver their share. Admin records payouts / driver payments / corrections.
- Per-city debt limit (Nairobi KES 1,000, Indianapolis $50) and "how to pay" text, in Admin -> Markets.
  Over the limit: taken offline, alerted, can't go online, no ride offers until they pay.
- App: wallet card + money history in driver Earnings, warning on driver Home, Admin -> Driver money (list +
  per-driver page with record form). Tests: `supabase/tests/driver_wallet.test.sql`.
- Not yet automatic: drivers paying by M-Pesa from the app (STK push) and payouts by M-Pesa B2C — need the live Paybill.

## Exit question + auto-offline — live 2026-11-22
- Web app: phone Back on a main screen asks "Exit Lift Me?" (src/features/pwa/ExitGuard.tsx); admin Log out asks too.
- Migration `20261122000002_auto_offline.sql`: every minute, online drivers with no trip whose app sent no
  location for `auto_offline_seconds` (150 s) are set offline and notified. Test: `auto_offline.test.sql`.
