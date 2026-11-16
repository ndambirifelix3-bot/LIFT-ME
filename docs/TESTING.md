# Testing Lift Me

## Automatic checks

| Command | What it checks | Result (last run) |
|---|---|---|
| `npm run lint` | code style / common bugs | ✅ 0 problems |
| `npm run typecheck` | TypeScript types (app) | ✅ 0 errors |
| `npm test` | phone number rules, money/distance formatting, polyline decoding, error messages | ✅ 15 passed |
| `npm run test:db` | migrations + **security (RLS)** + full ride flow + **two drivers accepting at the same moment** (10 races) | ✅ all passed |
| `npx deno check supabase/functions/*/index.ts` + `npx deno test --allow-env supabase/functions` | Edge Functions types + M-Pesa helpers | ✅ |

What `npm run test:db` proves (see `supabase/tests/rls_and_rides.test.sql`):

- A user can't choose admin, can't change their own role or suspension, and can't pick a role twice.
- Passengers see only their own profile, rides, quotes, payments and reports.
- Drivers can't approve themselves, change their own status or online flag, or see/upload other drivers' documents (database **and** storage).
- Quotes and fares can't be created or calculated from the app — only by the server.
- Nobody can write a ride status or a payment directly. Only the allowed status moves work (e.g. you can't complete a trip that hasn't started), and every move is logged in `ride_events`.
- An unapproved driver can't accept or share location. Lift Premium rides aren't offered to regular cars.
- Two drivers pressing Accept at the same instant: **exactly one wins, every time**.
- Commission and driver earnings are whole KES. Cash can be confirmed only by the ride's driver.
- After the trip the passenger can no longer see the driver's location or photo, and the share link stops working.
- Search timeout → `no_driver_found`. Admins see everything, and price changes are audited.
- Logged-out visitors can read nothing.

## Test a full ride with two phones

You need two phones (or one phone + an Android emulator) and the Supabase test numbers from SETUP.md.

**Phone B (driver):**
1. Log in with `0700 000 011` / `123456` → name → **I want to drive**.
2. Fill in: Personal details → Photo → all 5 documents (photos of anything are fine in testing) → Vehicle → **Submit application**.

**Browser (admin):** `npm start`, then press `w` → log in as your admin number → **Drivers** → open the driver → view a document → **Approve**.

**Phone B:** pull down to refresh → turn **Online** on → allow location.

**Phone A (passenger):**
1. Log in with `0700 000 001` / `123456` → **I need rides**.
2. Allow location → **Where to?** → type a Nairobi place → confirm the pickup pin, optionally adding a note → see prices → choose **Cash** → **Request Lift**.

**Phone B:** the request card appears with a countdown → **Accept**.

**Phone A:** shows the driver, car and plate, with the car moving on the map.

**Phone B:** **Navigate**, then **I've arrived** → **Start trip** → **Complete trip** → **Cash received** → rate the passenger.

**Phone A:** receipt → rate the driver.

**Admin:** **Overview** shows the ride and the money collected. **Rides** → open it to see the full status history.

Both phones must be **within 5 km** of each other, and **inside the service area polygon**. If you are testing outside Nairobi, temporarily edit the polygon (SETUP.md §7).

The Expo Go app keeps sending the driver's location only while it's open. Background location needs the EAS build.

## Things to try (resilience)

| Situation | What should happen |
|---|---|
| Weak / no internet | Error messages say "No internet connection"; screens refresh every 10–20 s and on pull-down; nothing is lost because the server holds the state |
| Location turned off | Passenger: "Use your location?" card + type the pickup or choose it on the map. Driver: can't go online (location is required) |
| App closed mid-trip | Reopening goes straight back to the live trip (passenger) or the active ride card (driver), reloaded from the database |
| Cancel while searching | Ride → *Cancelled*; the drivers' request cards disappear |
| Nobody accepts | After 2 minutes → "No driver found" (server job + server check) |
| Two drivers accept | One gets the ride; the other sees "Another driver took this ride" |
| M-Pesa sandbox | Pay with M-Pesa → STK prompt → enter PIN → status turns *paid* only after the callback is confirmed with M-Pesa |
