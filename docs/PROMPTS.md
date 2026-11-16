LIFT ME — Simple Version Prompt Pack
One app, three dashboards (Passenger / Driver / Admin), Supabase backend. Paste the prompts
one at a time. Start a fresh conversation for each phase, and commit to git after each phase you
approve.


 SETUP (do once)
Install: Node.js LTS, Git, VS Code, and the Expo Go app on your phone.
Create accounts:

 Account                                          What it's for              Needed by
 Supabase (free tier is fine to start)            Login, database, file      Phase 1
                                                  storage, live updates
 Expo                                             Running and building the   Phase 1
                                                  app
 Google Cloud (Maps)                              Map, address search,       Phase 4
                                                  route distance
 Safaricom Daraja (developer portal)              M-Pesa test payments       Phase 6
 An SMS provider that Supabase supports (the      Sending login codes        Phase 1 (test
 options for Kenya are checked in Phase 0)                                   numbers until then)

Folder:

  mkdir lift-me
  cd lift-me
  git init
  mkdir docs
  code .


Put PROJECT_RULES.md in the lift-me folder. Optionally save the big spec as
docs/LIFT_ME_MASTER_SPEC.md for reference. PROJECT_RULES.md overrides it wherever they
differ.
PHASE 0 — Plan (no code)
Read PROJECT_RULES.md. (docs/LIFT_ME_MASTER_SPEC.md is the original big spec; use it
only as reference — PROJECT_RULES.md's simple version wins where they differ.)

Don't write code yet. Give me a short plan:
1. Folder structure for one Expo Router app with (auth), (passenger), (driver) and
(admin) route groups.
2. The database tables you'll create (keep it minimal) and how roles + RLS will work.
3. How phone OTP login will work with Supabase for Kenyan numbers (+254), which SMS
providers work, and how I can test with test phone numbers for free.
4. Which parts need Edge Functions.
5. The list of keys/env values I'll need and where each one goes.
6. Anything in my plan you think is risky or a bad idea, explained simply.

Create docs/PROGRESS.md listing Phases 1–8 as NOT STARTED. Then stop.




PHASE 1 — App, design and login
Phase 1. Read PROJECT_RULES.md first. Build the foundation:
- Create the Expo + TypeScript + Expo Router app with web support.
- Connect Supabase (URL + anon key from .env; create .env.example; make sure .env is
git-ignored).
- Simple theme file with the brand colours and Inter font; reusable components:
Button, Input, PhoneInput, OTPInput, Card, Header, Loading, Empty state, Error
message.
- Screens: Splash, Welcome, Phone login (+254 default, numbers saved in +2547XXXXXXXX
format), OTP, "Complete your profile" (name), and "How will you use Lift Me?"
(Passenger or Driver).
- profiles table (id, full_name, phone, role, created_at) with RLS. A new user can
choose passenger or driver ONCE at signup; after that only an admin can change the
role. Nobody can make themselves admin.
- After login, send each role to its own dashboard: passenger tabs (Home, Rides,
Account), driver tabs (Home, Earnings, Account), admin web layout with a sidebar
(Drivers, Rides, Pricing). Placeholder screens are fine for now.
- Logout and "stay logged in".
- Tell me how to make my own account an admin (SQL to run once in Supabase).

Run lint and typecheck. Give the end-of-phase report and stop.
PHASE 2 — Database and prices
Phase 2. Read PROJECT_RULES.md first. Create the database with Supabase migrations
(saved in the repo):
- Enable PostGIS.
- Tables: profiles (exists), drivers (status: pending/approved/rejected/suspended,
is_online, current location, last_seen), vehicles, driver_documents, service_area (one
Nairobi polygon), pricing (ride type, base fare, per km, per minute, minimum fare —
integers in KES), rides, ride_events (history of status changes), payments, ratings.
- RLS policies for every table, following PROJECT_RULES.md.
- Seed: one Nairobi pilot area (sample polygon I can edit) and two ride types, "Lift"
and "Lift Premium", with PLACEHOLDER prices clearly marked for me to change.
- Explain each table in one line so I understand it.

Generate TypeScript types from the database. Run checks. Report and stop.




PHASE 3 — Driver sign-up and admin approval
Phase 3. Read PROJECT_RULES.md first. Driver onboarding + admin approval.

Driver dashboard:
- Steps: personal details → photo → documents (National ID, Driving Licence, PSV
badge, vehicle logbook, insurance — make the list editable later) → vehicle details
(make, model, year, colour, plate).
- Upload with camera or gallery to a PRIVATE Supabase Storage bucket; only images/PDF,
size limit.
- Application status screen: Pending / Approved / Rejected (with reason).

Admin dashboard (web):
- Drivers list with filter by status.
- Driver detail: view documents (short-lived signed links), approve, or reject with a
reason.
- Log who approved/rejected and when.

Security: drivers can't approve themselves or see other drivers' documents. Prove it
with a test or by showing me the RLS policies.
Run checks. Report and stop.
PHASE 4 — Map, booking and fare estimate
Phase 4. Read PROJECT_RULES.md first. Passenger booking.

- Passenger Home: map with current location (explain the permission first; if refused,
let them pick on the map). Pickup and "Where to?" search using Google Places through
an Edge Function (keep the server key secret).
- Confirm pickup by dragging the pin, with a note field for landmarks ("near the Shell
petrol station").
- Edge Function `get-quote`: checks pickup is inside the Nairobi service area, gets
distance and time from Google Directions, calculates the fare from the pricing table,
saves the quote (valid for ~10 min), returns prices for each ride type.
- Ride options screen showing the prices, ride type choice, payment choice (Cash or M-
Pesa), and "Request Lift" button (just saves the choice for now).

Tell me exactly which Google APIs to turn on, and which key goes where (app vs Edge
Function) with restrictions. Run checks. Report and stop.




PHASE 5 — Matching drivers and the trip (most important)
Phase 5. Read PROJECT_RULES.md first. Ride matching and the full trip.

Database functions (RPC), not app code, control the ride:
- request_ride(quote_id) → creates a ride with status 'searching' at the quoted price.
- Ride statuses: searching → accepted → arrived → in_progress → completed; plus
cancelled and no_driver_found. Only allowed moves work; each move is saved in
ride_events.
- accept_ride(ride_id): ATOMIC — only one driver can ever win (use a conditional
update / row lock). Driver must be approved and online.
- Simple matching: show the request to approved, online drivers within X km (setting,
start with 5 km) whose location was updated in the last 2 minutes. If nobody accepts
within 2 minutes → no_driver_found.
- cancel_ride, driver_arrived, start_trip, complete_trip.

Driver dashboard: Online/Offline switch (only if approved), sends location every few
seconds while online, incoming request card with countdown, Accept/Decline, buttons
for Arrived → Start trip → Complete trip, "Navigate" button that opens Google Maps.
Passenger dashboard: "Finding your driver…", driver + car + plate card, driver moving
on the map, trip in progress, trip completed screen.
Use Supabase Realtime so both screens update live; when the app reopens, reload the
ride from the database.

Test: 2 drivers accepting the same ride at the same time → only one wins. Tell me how
to test a full ride with two phones (one passenger, one driver). Run checks. Report
and stop.
PHASE 6 — Payments (Cash + M-Pesa test mode)
Phase 6. Read PROJECT_RULES.md first. Payments.

- Cash: at trip end the driver taps "Cash received"; payment marked paid.
- M-Pesa (SANDBOX ONLY): Edge Function sends an STK Push to the passenger's phone; a
callback Edge Function receives the result; check the result with M-Pesa's status
query before marking paid; handle duplicate callbacks safely (don't double-record);
payment statuses: pending / paid / failed.
- The ride stays "completed" even if payment is still pending.
- Simple receipt on the trip-completed screen and in ride history.
- Store a commission percentage in settings; save platform commission and driver
earnings per ride (integers).

List exactly what I need to do on the Daraja portal and which secrets to set in
Supabase. Live M-Pesa stays OFF. Run checks. Report and stop.




PHASE 7 — History, ratings, earnings and admin tools
Phase 7. Read PROJECT_RULES.md first. Finishing the dashboards.

Passenger: ride history with receipts, rate the driver (1–5 stars + comment), account
page (name, phone, logout, delete account request), Help page (report a problem,
emergency number 999/112, share trip link).
Driver: earnings today/this week/total from the database, trip history, rate the
passenger, account page with vehicle and document status.
Admin (web): overview numbers (rides today, online drivers, pending drivers, money
collected — real data only), rides list + ride detail with its status history, edit
prices and commission, see support reports, suspend a driver or passenger.

Run checks. Report and stop.
 PHASE 8 — Testing and getting ready for a pilot
  Phase 8. Read PROJECT_RULES.md first. Testing and launch prep.

  - Check every table's RLS: try to read/change other users' data as passenger and as
  driver, and to make myself admin. Fix anything that leaks.
  - Make sure no secret keys are in the app code or git history.
  - Test weak internet, location turned off, app closed mid-trip, cancelling while
  searching.
  - Set up background location for drivers during trips (explain Android/iOS permission
  rules and what Google Play/App Store will ask me).
  - Make the Android build with EAS and explain how to share it with pilot drivers for
  testing. Explain the iOS steps too.
  - Give me a simple launch checklist: what's done, what's missing, and what I must
  handle outside the code (business registration, NTSA/licensing, insurance, Data
  Protection registration, M-Pesa production Paybill/Till, privacy policy and terms).

  Don't turn on live M-Pesa. Report and stop.




 HANDY PROMPTS (anytime)
Continue after a break

  Read PROJECT_RULES.md and docs/PROGRESS.md. Tell me where we are and what's next.
  Don't change anything yet.


Fix errors

  Run lint, typecheck and tests and fix all errors properly — don't switch off security,
  RLS or tests to make things pass. Explain the fixes simply.


Something's broken

  This is what happened: [describe it + paste the error]. Find the real cause, fix it,
  and tell me how to check it's fixed.


Explain simply

  Explain what we built in this phase as if I'm not a developer, and tell me exactly how
  to try it on my phone and in the browser.


Double-check before I approve

  Review this phase strictly against PROJECT_RULES.md: prices calculated in the app?
  status changed from the app? tables without RLS? secret keys in the app? fake data?
  Fix what you find.
