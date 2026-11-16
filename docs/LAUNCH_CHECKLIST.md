# Pilot launch checklist

## ✅ Done in the code
- [x] Phone OTP login (+254), stay logged in, logout, role routing (passenger / driver / admin)
- [x] Driver application: details, photo, 5 documents (editable list), vehicle; private storage; admin approve/reject with reason; audit log
- [x] Booking: location permission explained first, address search, drag-pin pickup + landmark note, server-side quote valid for 10 min, Lift / Lift Premium
- [x] Matching within 5 km of drivers seen in the last 2 min; 2-minute timeout; atomic accept; full trip flow; live updates via Realtime; recovery after reopening the app
- [x] Payments: cash ("Cash received"), M-Pesa **sandbox** STK Push + verified callback, commission and driver earnings stored per ride, receipts
- [x] Ratings both ways, ride history, earnings (today / week / total), help page (999/112, report a problem, share trip link)
- [x] Admin: overview (real numbers), drivers, rides + status history, pricing + settings, users (suspend), support reports
- [x] Background location for online drivers (needs the EAS build), with the in-app disclosure
- [x] RLS on every table + automated security tests; no secrets in code

## ⏳ Still to do before real passengers
- [ ] Replace the **PLACEHOLDER prices** and commission (Admin → Pricing), then switch off "placeholders"
- [ ] Draw the real **pilot polygon** (SETUP.md §7)
- [ ] Choose an SMS provider and fund it (Twilio, or Africa's Talking via an SMS hook)
- [ ] Supabase **Pro plan** for the pilot (the free tier pauses after a week of inactivity; Pro also adds daily backups)
- [ ] Google Maps keys restricted, with budget alerts and quotas set
- [ ] EAS Android build sent to pilot drivers; iOS through TestFlight if needed
- [ ] Set `support_phone` in Admin → Pricing & settings
- [ ] Put a **privacy policy** and **terms** online (needed for the stores and for Kenyan data protection), and link them from the Welcome screen
- [ ] Push notifications for new ride requests while the app is in the background (not built — drivers keep the app open during the pilot)
- [ ] Finish account deletions by hand: Admin → Users shows requests; delete in Supabase → Authentication
- [ ] Live M-Pesa (only after the items below):
  - set a production Paybill/Till and production URLs,
  - change `assertSandbox()` deliberately,
  - test with small real amounts.

## 🏛 Outside the code (your responsibility)
- [ ] **Business registration** (eCitizen / BRS) and KRA PIN
- [ ] **NTSA** requirements for digital ride-hailing operators, and checks that drivers hold a valid licence, PSV badge and vehicle inspection
- [ ] **Insurance**: PSV/commercial cover for drivers' vehicles, and consider passenger liability cover
- [ ] **Office of the Data Protection Commissioner (ODPC)**: register as a data controller/processor, and do a data protection impact assessment (you process location data and ID documents)
- [ ] **M-Pesa production**: Paybill or Till number, then Daraja "Go Live" approval
- [ ] **County / Nairobi** licensing where applicable
- [ ] Driver agreement (commission, conduct, cancellations) and a passenger terms of service
- [ ] Support process: who answers reports and safety incidents, and how fast
