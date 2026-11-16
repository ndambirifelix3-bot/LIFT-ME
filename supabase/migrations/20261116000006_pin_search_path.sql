-- Supabase security advisor: pin search_path on every function.
alter function public.ride_transition_allowed(public.ride_status, public.ride_status) set search_path = public, pg_temp;
