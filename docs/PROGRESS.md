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

## Not yet tried against a real Supabase project
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
