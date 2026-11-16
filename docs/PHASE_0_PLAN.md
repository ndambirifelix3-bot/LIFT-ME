# Lift Me — Phase 0 Plan

Source of truth: `PROJECT_RULES.md`. `docs/LIFT_ME_MASTER_SPEC.md` is reference only.

## 1. Folder structure (one Expo Router app)

```
lift-me/
├─ app/                          # Expo Router screens
│  ├─ _layout.tsx                # loads fonts, Supabase session, TanStack Query
│  ├─ index.tsx                  # splash → sends the user to the right place by role
│  ├─ (auth)/                    # welcome, phone, otp, profile, choose-role
│  ├─ (passenger)/               # tabs: home, rides, account (+ ride/[id], help)
│  ├─ (driver)/                  # tabs: home, earnings, account (+ onboarding/*)
│  └─ (admin)/                   # web sidebar layout: drivers, rides, pricing, overview
├─ src/
│  ├─ components/                # Button, Input, PhoneInput, OTPInput, Card, Header, Loading, Empty, ErrorMessage
│  ├─ theme/                     # colours, Inter font, spacing
│  ├─ lib/                       # supabase client, phone formatting (+2547…), query client
│  ├─ features/                  # hooks per area: auth, rides, driver, admin, payments
│  └─ types/database.ts          # generated from Supabase
├─ supabase/
│  ├─ migrations/                # all SQL: tables, RLS, RPC functions, seeds
│  ├─ functions/                 # Edge Functions (see section 4)
│  └─ tests/                     # SQL tests for RLS + atomic accept
├─ docs/                         # PROGRESS.md, plans, spec
├─ .env.example                  # public values only
└─ PROJECT_RULES.md
```

Each route group has a guard in its `_layout.tsx` that sends you away if your role doesn't match.
That keeps the screens tidy. The real protection is RLS.

## 2. Database tables (minimal) and how roles and RLS work

| Table | One line |
|---|---|
| `profiles` | One row per user: name, phone, `role` (passenger/driver/admin), status (active/suspended). |
| `settings` | Key/value config: currency (KES), commission %, match radius (5 km), search timeout (2 min), emergency numbers. |
| `service_area` | The Nairobi pilot polygon (PostGIS). |
| `pricing` | Per ride type: base fare, per km, per minute, minimum fare. Integers, in KES. |
| `drivers` | Driver status (pending/approved/rejected/suspended), is_online, location (PostGIS point), last_seen, reject reason, approved_by/at. |
| `vehicles` | Make, model, year, colour, plate. One per driver for the pilot. |
| `document_types` | The editable list of required documents (ID, licence, PSV badge, logbook, insurance). |
| `driver_documents` | Which file was uploaded for which document type, plus its review status. |
| `quotes` | Server-made fare quote: pickup/dropoff, distance, time, price per ride type, expires_at (~10 min). |
| `rides` | The trip: passenger, driver, status, price snapshot, currency, payment method. |
| `ride_events` | History of every status change: who made it and when. |
| `ride_offers` | Which drivers were shown a request, so drivers only see rides offered to them. |
| `payments` | Cash/M-Pesa, amount, status (pending/paid/failed), M-Pesa receipt, commission, driver earnings. |
| `ratings` | 1–5 stars + comment, passenger→driver and driver→passenger. |
| `support_reports` | "Report a problem" messages for the admin. |

**Roles**
- When someone signs up, a database trigger creates their `profiles` row with role `passenger`.
- The user can switch to `driver` exactly **once**, through an RPC called `choose_role('passenger'|'driver')`. It only works while the profile is still unset.
- Nobody can make themselves `admin`. The `role` column has no update rights for normal users at all; only admin RPCs can change it. You make the first admin with one SQL line in the Supabase dashboard.
- A helper function `is_admin()` (security definer) is used inside the policies.

**RLS (on for every table)**
- Passengers see only their own profile, quotes, rides, payments and ratings.
- Drivers see their own driver row, vehicle and documents, plus rides **offered or assigned** to them.
- Admins see everything.
- `pricing`, `settings`, `service_area` and `document_types` can be read by any signed-in user. Only admins can change them.
- Ride status, payments and approvals are **never written directly** by the app. They only change through RPC functions that check the move is allowed. `accept_ride` uses `UPDATE … WHERE status='searching' AND driver_id IS NULL`, which is atomic, so only one driver can win.

## 3. Phone OTP login for Kenya (+254)

**How it works:** the user types `0712 345 678` or `712345678`. The app saves it as `+254712345678`. Then `supabase.auth.signInWithOtp({ phone })` sends a 6-digit code, and `verifyOtp({ phone, token, type: 'sms' })` checks it. The session is stored securely on the phone (web uses local storage), so the user stays logged in.

**SMS providers:**
- **Built into Supabase:** Twilio, Twilio Verify, MessageBird, Vonage, Textlocal.
  - **Twilio** and **Vonage** both deliver to Safaricom, Airtel and Telkom numbers in Kenya.
  - They cost roughly US$0.05–0.25 per SMS, so check current prices.
  - Kenya may need a registered sender ID for good delivery.
- **Cheaper local option:** Africa's Talking, which is Kenyan and much cheaper per SMS.
  - Supabase doesn't support it out of the box. You connect it through Supabase's **"Send SMS" Auth Hook**, which is a small Edge Function we would write.
- **My recommendation:** start with Twilio, because it is the least setup. Move to Africa's Talking through the hook if SMS costs grow.

**Free testing:** go to Supabase Dashboard → Authentication → Sign In / Providers → Phone. Turn it on and add **Test Phone Numbers**, for example `254700000001=123456`. Those numbers log in with the fixed code and no SMS is sent. Supabase still asks you to set an SMS provider before phone login can be turned on, so you may need a Twilio trial account even for testing. I'll confirm the exact behaviour in Phase 1.

## 4. What needs Edge Functions

| Function | Why it must be on the server |
|---|---|
| `places-search` / `place-details` | Uses the secret Google Maps server key. |
| `get-quote` | Checks the service area, calls Google Directions and calculates the fare from `pricing`. |
| `mpesa-stk-push` | Uses the Daraja consumer key/secret and passkey. |
| `mpesa-callback` | Receives the M-Pesa result, confirms it with the status query, and records it once (duplicates are ignored). |
| `send-sms` (optional) | Auth Hook for Africa's Talking, only if we choose it. |

Everything else is Postgres RPC + RLS: ride requests, accept/arrive/start/complete/cancel, matching, approvals and earnings. A scheduled job (`pg_cron`) marks rides as `no_driver_found` after 2 minutes.

## 5. Keys and env values

| Key | Where it goes | Secret? |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (app) | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` (app) | No (protected by RLS) |
| Google Maps **Android SDK** key | `app.json` via EAS env. Restricted to the Android package + SHA-1. | Restricted |
| Google Maps **iOS SDK** key | `app.json` via EAS env. Restricted to the iOS bundle ID. | Restricted |
| Google Maps **server** key (Places, Directions) | Supabase Edge Function secret `GOOGLE_MAPS_SERVER_KEY` | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only (Supabase provides it automatically) | **Yes, never in the app** |
| Twilio Account SID / Auth Token / Message Service SID | Supabase Dashboard → Auth → Phone provider | **Yes** |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_ENV=sandbox` | Supabase Edge Function secrets | **Yes** |
| `EXPO_TOKEN` (only for CI builds later) | EAS / CI secrets | Yes |

`.env` is git-ignored. `.env.example` lists only the names, with no values.

## 6. Risks and things to watch (in plain words)

1. **SMS cost and delivery.** Every login costs an SMS. Keep sessions long so users rarely re-login, and use test numbers during development.
2. **The map on the web.** `react-native-maps` does not work in a web browser. The admin dashboard doesn't need a live map for the pilot. If we want one later, we use a web map component there.
3. **Expo Go limits.** Background location, and Google Maps on Android with your own key, need a **development build** (EAS), not Expo Go. Phases 1–4 work in Expo Go. From Phase 5 drivers should use a dev build.
4. **Background location approval.** Google Play and Apple review this strictly. You'll need a privacy policy and a clear explanation. We only track drivers while they are online or on a trip.
5. **Matching without Redis.** Using Postgres/PostGIS for "drivers within 5 km" is fine for a pilot (tens or hundreds of drivers). Location updates every ~5 seconds per driver are OK at that scale.
6. **"No driver found" timer.** If a timer runs only in the app, closing the app breaks it. It must be a database job (`pg_cron`) or be checked whenever the ride is read.
7. **M-Pesa callbacks** can arrive late, twice or never. We always confirm with the status query and never trust the app. Payment can stay `pending` while the ride stays `completed`.
8. **Legal.** NTSA/TLB licensing, insurance, Data Protection (ODPC) registration and a production Paybill/Till are needed **before real passengers ride**. That is outside the code.
9. **Supabase free tier** pauses projects after a week of no activity. That's fine for development; for the pilot, use the Pro plan.
10. **From the big spec, left out on purpose:** NestJS backend, separate admin app, microservices, Redis, multi-market/USA setup, refunds and payouts. Currency, area and prices are still kept in tables, so expanding later stays possible.
