#!/usr/bin/env bash
# Two drivers press "Accept" on the same ride at the same moment -> exactly one wins.
# Repeats the race several times, using two separate database connections.
set -euo pipefail
PORT="$1"
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt)
D1='00000000-0000-0000-0000-0000000000d1'
D2='00000000-0000-0000-0000-0000000000d2'
P='00000000-0000-0000-0000-0000000000a1'
ROUNDS=10

# Clean slate for passenger 1 and both drivers.
"${PSQL[@]}" -c "update public.profiles set is_suspended = false;
  update public.vehicles set ride_type = 'lift';
  update public.drivers set is_online = true where id in ('$D1','$D2');
  update public.driver_locations set updated_at = now();" >/dev/null

accept() { # $1 driver, $2 ride, $3 start-at epoch
  "${PSQL[@]}" -c "select pg_sleep_until(to_timestamp($3));
    select set_config('request.jwt.claim.sub', '$1', false);
    set role authenticated;
    select public.accept_ride('$2');" >/dev/null 2>&1 && echo WIN || echo LOSE
}

for i in $(seq 1 $ROUNDS); do
  RIDE=$("${PSQL[@]}" -c "
    update public.rides set status = 'completed' where passenger_id = '$P' and status in ('accepted','arrived','in_progress','searching');
    update public.rides set status = 'completed' where driver_id in ('$D1','$D2') and status in ('accepted','arrived','in_progress');
    select set_config('request.jwt.claim.sub', '$P', false);
    with q as (select * from public.create_quote('$P', -1.2864, 36.8172, 'CBD', null, -1.2676, 36.8108, 'Westlands', 5000, 900, null))
    select id from q;" | tail -1)
  RID=$("${PSQL[@]}" -c "select set_config('request.jwt.claim.sub', '$P', false);
    set role authenticated;
    select id from public.request_ride('$RIDE', 'lift', 'cash');" | tail -1)
  OFFERS=$("${PSQL[@]}" -c "select count(*) from public.ride_offers where ride_id = '$RID'")
  [ "$OFFERS" = "2" ] || { echo "expected 2 offers, got $OFFERS"; exit 1; }
  START=$(python3 -c 'import time; print(time.time() + 0.6)')
  R1=$(mktemp); R2=$(mktemp)
  accept "$D1" "$RID" "$START" >"$R1" & accept "$D2" "$RID" "$START" >"$R2" & wait
  WINS=$(cat "$R1" "$R2" | grep -c WIN || true)
  WINNER=$("${PSQL[@]}" -c "select driver_id from public.rides where id = '$RID'")
  rm -f "$R1" "$R2"
  if [ "$WINS" != "1" ] || [ -z "$WINNER" ]; then
    echo "FAILED round $i: $WINS winners"; exit 1
  fi
  echo "round $i: exactly one driver won ($WINNER)"
done
echo "concurrent_accept.test.sh: ALL PASSED ($ROUNDS races, always exactly one winner)"
