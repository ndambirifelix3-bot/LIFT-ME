# Lift Me — Security summary

**Hiding a button is not security.** Every rule below is enforced by the database or the server, so it holds even if someone modifies the app.

## Roles
- `profiles.role` is `passenger`, `driver` or `admin`. New users start as passenger.
- `choose_role()` lets a user pick passenger or driver **once**. It refuses `admin`.
- The app has no permission to update `role`, `role_chosen`, `is_suspended` or `phone`. Column grants plus a trigger enforce this.
- Only `admin_set_role()` (admins) or SQL you run yourself can change a role. An admin can't change their own role.

## Row Level Security (on for every table)

| Table | Who can read | Who can write (from the app) |
|---|---|---|
| profiles | self, admins | self: `full_name` only |
| drivers | self, admins | self: ID no., licence no., email, photo — only while pending/rejected |
| driver_locations | the driver, admins, the passenger on an **active** ride with that driver | only via `update_driver_location()` (approved drivers) |
| vehicles, driver_documents | the driver, admins | the driver, only while pending/rejected |
| storage `driver-documents` (PRIVATE) | the driver's own folder, admins, plus the driver's photo for their current passenger | the driver's own folder while pending/rejected; images/PDF only, 10 MB max |
| quotes | the passenger, admins | **server only** (`get-quote` Edge Function → `create_quote()`) |
| rides | passenger, assigned driver, drivers with a pending offer, admins | **RPC only** |
| ride_events, ride_offers | the people on the ride / the offered driver, admins | RPC only |
| payments | passenger + driver of the ride, admins | RPC (cash) / M-Pesa callback only |
| ratings | rater, rated person, admins | `rate_ride()` only, completed rides, participants only |
| support_reports | author, admins | author inserts (own rides only); admins resolve |
| pricing, settings, service_area, document_types | any signed-in user | admins only (audited) |
| admin_actions, mpesa_callbacks | admins | server only |

## The ride state machine (`supabase/migrations/…_functions.sql`)
`searching → accepted → arrived → in_progress → completed`, plus `cancelled` and `no_driver_found`.
Each move is a function that checks the caller and the current status, and records a row in `ride_events`.
`accept_ride()` is a single conditional `UPDATE … WHERE status = 'searching' AND driver_id IS NULL`, so only one driver can ever win. This is tested with 10 real parallel races.

## Money
- All amounts are integers (whole KES).
- The fare is calculated only in `calculate_fare()` (database), from the `pricing` table, using Google's route distance and time fetched by the server.
- The commission % is read from `settings` at completion. The commission and driver earnings are stored per ride.
- M-Pesa: the app can only *ask* for an STK push. A payment becomes `paid` only in `mpesa-callback`, and only when:
  - the URL secret matches,
  - M-Pesa's status query confirms success,
  - the amount is correct,
  - the update is conditional (`status <> 'paid'`) and the receipt number is unique.

  So a duplicate callback can never record the payment twice.

## Secrets
- The app contains only the Supabase URL + anon key and the restricted Google SDK keys.
- The service role key, Google server key and M-Pesa keys are Edge Function secrets.
- `.env` files are git-ignored. Checked: no secret values are in the repository or git history.

## Note for future migrations
Supabase automatically grants new tables and functions to `anon`/`authenticated`. Every new migration must:
- enable RLS on its tables,
- revoke the default grants,
- grant only what is needed (see `…_security.sql`).

Then run `npm run test:db`.
