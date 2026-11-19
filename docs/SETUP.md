# Lift Me — Setup guide (plain English)

Follow the steps in order. Anything marked 🔒 is a **secret**: never paste it into the app code, chat, or git.

---

## 1. Install the tools (once)

- Node.js LTS, Git, VS Code
- **Expo Go** app on your phone (Play Store / App Store)
- In the project folder:

```bash
npm install
```

---

## 2. Supabase (login, database, storage, live updates)

1. Create a project at supabase.com. Region: pick the closest to Kenya (e.g. *Frankfurt* or *London*). Choose a strong DB password and keep it 🔒.
2. Link this folder to it and push the database (tables, security rules, prices, Nairobi area):

```bash
npx supabase login
```

```bash
npx supabase link --project-ref YOUR-PROJECT-REF
```

```bash
npx supabase db push
```

3. **App keys** — Supabase → Project Settings → API. Copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` = Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the `anon` / publishable key (safe in the app — RLS protects data)
   - ⚠️ The `service_role` key 🔒 is **never** put in `.env` or the app.

### Phone login (SMS)

Supabase → Authentication → Sign In / Providers → **Phone** → enable.

- **SMS provider** (Kenya): Supabase supports **Twilio**, Twilio Verify, MessageBird, Vonage and Textlocal out of the box. **Twilio** is the simplest and delivers to Safaricom, Airtel and Telkom. Paste the Twilio Account SID, Auth Token 🔒 and Messaging Service SID there.
  - Cheaper later: **Africa's Talking** (Kenyan) through Supabase's *Send SMS hook* — needs a small extra Edge Function. Ask when SMS costs matter.
- **Free testing — no SMS sent:** in the same Phone page add **Test Phone Numbers and OTPs**:

```
254700000001=123456
254700000011=123456
254700000099=123456
```

  Log in with `0700 000 001` and code `123456`. (Supabase may still ask for an SMS provider to be filled in before phone login can be enabled — a Twilio trial account is enough.)

### Make yourself admin (run once)

1. Log in once in the app with your own number (choose "I need rides" — it doesn't matter).
2. Supabase → SQL Editor → run (with your number):

```sql
update public.profiles
   set role = 'admin', role_chosen = true
 where phone = '+254712345678';
```

3. Close and reopen the app (or the web page) → you land on the Admin dashboard.

Nobody can make themselves admin from the app — only this SQL (run by you) or another admin can.

---

## 3. Google Maps (map, address search, route distance)

Google Cloud Console → create a project → enable billing (Maps has a monthly free credit) → **APIs & Services → Library**, enable:

| API | Used for | Called from |
|---|---|---|
| **Maps SDK for Android** | the map in the Android app | phone |
| **Maps SDK for iOS** | the map in the iPhone app (only if you switch iOS to Google maps) | phone |
| **Places API (New)** | "Where to?" address search | Edge Function `places` |
| **Geocoding API** | address of the dragged pickup pin | Edge Function `places` |
| **Routes API** | real driving distance + time for the fare | Edge Function `get-quote` |

Create **three keys** (Credentials → Create credentials → API key) and restrict each:

| Key | Application restriction | API restriction | Goes in |
|---|---|---|---|
| Android key | Android apps: package `com.liftme.app` + SHA-1 from `npx eas-cli credentials` | Maps SDK for Android | `.env` → `GOOGLE_MAPS_ANDROID_KEY` (used at build time) |
| iOS key | iOS apps: bundle id `com.liftme.app` | Maps SDK for iOS | `.env` → `GOOGLE_MAPS_IOS_KEY` |
| 🔒 Server key | None (Edge Functions have no fixed IP) | Places API (New), Geocoding API, Routes API | Supabase secret `GOOGLE_MAPS_SERVER_KEY` |

Also set a **budget alert** and per-API **quotas** in Google Cloud so a bug can never run up a big bill.

In Expo Go, Android uses Expo's built-in map key and iPhone uses Apple Maps, so the map works without your keys while testing.

---

## 4. Edge Functions + secrets

Copy `supabase/functions/.env.example` to `supabase/functions/.env` (git-ignored), fill it in, then:

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

```bash
npx supabase functions deploy places get-quote mpesa-stk-push
```

```bash
npx supabase functions deploy mpesa-callback --no-verify-jwt
```

(`mpesa-callback` is called by Safaricom, which has no Supabase login; it protects itself with `MPESA_CALLBACK_SECRET` and double-checks every result with M-Pesa.)

---

## 5. M-Pesa — SANDBOX only (live stays OFF)

On **developer.safaricom.co.ke** (Daraja):

1. Create an account → **My Apps → Create app** → tick **M-Pesa Express (Lipa na M-Pesa Sandbox)**.
2. Copy the app's **Consumer Key** and **Consumer Secret** 🔒.
3. From **APIs → M-Pesa Express → Simulate** (test credentials), copy the sandbox **Business Shortcode** (usually `174379`) and **Passkey** 🔒.
4. Put them in `supabase/functions/.env`:

```
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_SECRET=<any long random string>
```

5. Run the two `npx supabase` commands from step 4 again.

The callback URL is built automatically: `https://YOUR-PROJECT.supabase.co/functions/v1/mpesa-callback?secret=…`.
Sandbox prompts go to the phone number you enter; use the Daraja test number for simulated success.

**Live M-Pesa is blocked in code** (`supabase/functions/_shared/mpesa.ts → assertSandbox`). Going live needs a production Paybill/Till, Safaricom "Go Live" approval, and a deliberate code change — see the launch checklist.

---

## 6. Run it

```bash
npm start
```

- **Phone:** scan the QR code with Expo Go (Android) or the Camera app (iPhone).
- **Browser (admin):** press `w`, or open http://localhost:8081 → log in with your admin number.

---

## 7. Edit the Nairobi pilot area

The sample polygon is a rough outline of Nairobi. To use your exact zone, draw it on geojson.io, then in the SQL Editor:

```sql
update public.service_area
   set area = st_geogfromtext('SRID=4326;MULTIPOLYGON(((lng lat, lng lat, ..., first point again)))')
 where name = 'Nairobi pilot (sample)';
```

Prices, commission, match radius (5 km), search timeout (2 min) are edited in **Admin → Pricing**.

---

## 8. Builds for pilot drivers (Android) and iPhone

Background location, your own Google Maps key and notifications need a real build (not Expo Go).

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

```bash
npx eas-cli@latest build -p android --profile preview
```

This gives you an **APK download link** — send it to pilot drivers (WhatsApp/SMS). They allow "Install unknown apps" once, then install.
Set the same `EXPO_PUBLIC_*` and `GOOGLE_MAPS_*` values as EAS environment variables (expo.dev → project → Environment variables) so cloud builds get them.

**iPhone:** needs an Apple Developer account (US$99/year).

- Testers' devices: `npx eas-cli@latest device:create`, then `npx eas-cli@latest build -p ios --profile preview`.
- Or TestFlight: `npx eas-cli@latest build -p ios --profile production`, then `npx eas-cli@latest submit -p ios`.

**Store review of background location:**
- **Google Play** asks you to fill the *Location permissions declaration*: explain "drivers share location while online/on a trip for matching and passenger tracking", and upload a short video showing the in-app notice (shown when a driver taps *Go online*) and the feature. You also need a privacy policy URL.
- **Apple** checks the "Always" location text in `app.config.ts` and that the feature is clearly needed; same privacy policy.

---

## 9. Installable web app (PWA) on Netlify

The same code runs as a website that people can **install on their phone's home screen** (no app store).

- PWA files live in `public/`: `manifest.webmanifest` (name, colours, icons), `index.html` (page template with
  the install tags), `sw.js` (service worker: caches only the app's own files and shows an offline page — never
  Supabase data) and `icons/` (made from the logo by `python3 scripts/make-brand-assets.py`).
- `netlify.toml` tells Netlify how to build and serve it.

Put it online:

1. netlify.com → sign up with GitHub → **Add new site → Import an existing project → GitHub** → pick `LIFT-ME`.
2. Branch to deploy: `pwa` (later `main`). Build settings are read from `netlify.toml` — leave them.
3. **Environment variables** → add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public values).
4. **Deploy**. Open the `https://….netlify.app` link on your phone:
   - Android (Chrome): tap **Install the Lift Me app** on the welcome screen.
   - iPhone (Safari): **Share → Add to Home Screen** (the welcome screen shows these steps).

Limits of the web app (why drivers will later need the real Android app): it cannot send the driver's location
while the screen is off or the app is in the background, and iPhones only allow notifications once the app is
added to the home screen.


---

## Where every key goes (summary)

| Value | Where | Secret? |
|---|---|---|
| Supabase URL, anon key | `.env` (`EXPO_PUBLIC_…`) + EAS env | no |
| Google Android / iOS SDK keys | `.env` + EAS env (restricted to the app) | restricted |
| Supabase service role key | nowhere you manage — Edge Functions get it automatically | 🔒 |
| Google server key, M-Pesa keys, callback secret | Supabase Edge Function secrets | 🔒 |
| Twilio credentials | Supabase dashboard → Auth → Phone | 🔒 |
