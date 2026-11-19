PROJECT RULES — Lift Me (Simple Version)
Read this file at the start of every work session and follow it throughout. Keep the build SIMPLE. If a
choice adds complexity that a small Nairobi pilot doesn't need, don't do it — suggest it for later
instead.

 What we are building
Lift Me — a simple ride-hailing app (like Uber/Bolt) for a small pilot in Nairobi, Kenya. Tagline:
"Move with confidence."
ONE app, ONE codebase, THREE dashboards:
      Passenger dashboard — book a ride, track the driver, pay, see history.
      Driver dashboard — sign up, upload documents, go online, accept rides, see earnings.
      Admin dashboard — approve drivers, see rides, set prices. Used in a web browser.

 Tech stack (keep it to this)
      Expo (React Native) + TypeScript + Expo Router — one app that runs on Android, iPhone
      and the web.
      Supabase as the whole backend: Auth (phone OTP), Postgres + PostGIS, Storage (private
      bucket for driver documents), Realtime (live ride updates), Edge Functions (fare quotes, M-
      Pesa, anything secret).
      TanStack Query for data fetching, Zustand only if needed, React Hook Form + Zod for
      forms.
      Google Maps (react-native-maps + Google Places/Directions through an Edge Function).
      No NestJS, no microservices, no separate admin project, no Redis unless the owner
      approves it.

 How roles work
      Every user has ONE row in profiles with a role : passenger , driver or admin .
      After login the app sends the user to the right dashboard based on their role (route groups:
      (passenger) , (driver) , (admin) ).
      Roles can ONLY be changed by an admin or by the database — never by the app.
      Drivers can only go online after an admin approves them.
      Admin screens are hidden in the UI, but REAL security comes from Supabase Row Level
      Security (RLS). Hiding a button is not security.

 Rules that stay, even in the simple version
   1. Work in phases. Stop at the end of each phase, report, and wait for the owner's approval.
   2. RLS is ON for every table. Users only see their own data; drivers only see rides offered or
      assigned to them; admins see everything.
   3. Fares are calculated on the server (Edge Function or database function), never in the app.
   4. Ride status changes go through database functions (RPC) that check the move is allowed.
      The app never writes status directly.
   5. Accepting a ride must be atomic — two drivers can never get the same ride.
   6. Money is stored as whole numbers (integers, KES). Never floats.
   7. M-Pesa payment success only comes from the M-Pesa callback, never from the app.
   8. Driver documents are in a PRIVATE storage bucket. Only the driver and admins can view
      them.
   9. Secrets (service role key, M-Pesa keys, Maps server key) live only in Edge Function secrets
      or .env — never in app code, never committed.
  10. Don't hard-code prices, currency or the service area; keep them in a settings / pricing
      table so they can change later.
  11. Never fake data: no fake drivers, fake ETAs or fake payment success outside tests.
  12. Don't delete or overwrite working code without explaining why.

 Brand
Taxi yellow + black + white (changed from champagne gold on 2026-11-19 at the owner's request).
Midnight Black #101010 · Lift Yellow #FFC107 · Yellow Pressed #E0A800 · Pale Yellow #FFF4CC ·
White #FFFFFF · Light Grey #F5F5F5 · Text #171717 · Secondary #666666 · Border #E5E5E5 ·
Success #237A50 · Error #B3261E. Font: Inter. Colours live in src/theme (colors.brand = yellow).
Yellow is for fills (main buttons, badges, plates) with BLACK text on top, and for accents on black.
Never use yellow for text, thin borders or small icons on white — use black there.
Logo: the client's LIFTME logo (assets/brand/logo-source.png). All icons and the in-app <Logo />
are generated from it by scripts/make-brand-assets.py — only place it on dark backgrounds.
Tagline: "Move smarter." (from the logo; replaced "Move with confidence.").
Bold, clean, friendly. Don't copy Uber, Bolt or any other company's design or logo.

 End-of-phase report (always use this)
   1. What was built (in plain English)
   2. How to try it (phone / browser steps)
   3. Checks run (lint, typecheck, tests) and results
   4. What is real vs. still fake/mock
   5. What the owner needs to do next (accounts, keys, decisions) Then update
      docs/PROGRESS.md and stop.
