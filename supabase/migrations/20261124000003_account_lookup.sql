-- Lift Me — "Log in" or "Sign up": does this email / phone already have an account?
-- Lets the login screen say "you already have an account — log in" or "no account yet — sign up"
-- before a code is sent. Only accounts that finished signing up once (confirmed email / phone) count,
-- so an abandoned attempt doesn't block a real sign-up.
-- Note: like most apps, this reveals whether an email/phone is registered. It says nothing else.

create or replace function public.account_exists(p_email text default null, p_phone text default null)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when nullif(trim(p_email), '') is not null then
      exists (select 1 from auth.users u
               where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null)
    when nullif(trim(p_phone), '') is not null then
      exists (select 1 from auth.users u
               where u.phone = ltrim(trim(p_phone), '+') and u.phone_confirmed_at is not null)
    else false
  end
$$;

revoke all on function public.account_exists(text, text) from public;
grant execute on function public.account_exists(text, text) to anon, authenticated;
