-- Lift Me — log in with email (6-digit code by email) as well as phone.
--
-- * profiles.email mirrors the login email (so admins can see it), kept in step with auth.users.
-- * profiles.phone mirrors the login phone when there is one. People who log in by email can add a
--   CONTACT phone (not verified by SMS) so drivers and passengers can call each other; for a driver it
--   also decides their country (market), like a phone login does.

alter table public.profiles add column email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id,
          case when new.phone is null or new.phone = '' then null
               when left(new.phone, 1) = '+' then new.phone
               else '+' || new.phone end,
          nullif(lower(new.email), ''))
  on conflict (id) do nothing;
  return new;
end $$;

-- When someone adds or changes their login email / phone, update the profile too.
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.profiles
     set email = nullif(lower(new.email), ''),
         phone = case when new.phone is null or new.phone = '' then phone
                      when left(new.phone, 1) = '+' then new.phone
                      else '+' || new.phone end
   where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_contact_changed on auth.users;
create trigger on_auth_user_contact_changed
  after update of email, phone on auth.users
  for each row
  when (old.email is distinct from new.email or old.phone is distinct from new.phone)
  execute function public.sync_profile_from_auth();

update public.profiles p set email = nullif(lower(u.email), '') from auth.users u where u.id = p.id;

/**
 * A contact phone for people who log in by email (the app checks the format per country first).
 * Not allowed when the account logs in with a phone: that number is the contact phone.
 * For a driver without a country yet, the number's country code decides it.
 */
create or replace function public.set_my_contact_phone(p_phone text)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.profiles; v_market text;
begin
  v := public.assert_active_user();
  if exists (select 1 from auth.users where id = v.id and coalesce(phone, '') <> '') then
    raise exception 'phone_is_login_phone';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;

  update public.profiles set phone = p_phone where id = v.id returning * into v;

  if exists (select 1 from public.drivers where id = v.id and market_code is null) then
    v_market := public.market_for_phone(p_phone);
    if v_market is null then raise exception 'phone_country_not_served'; end if;
    update public.drivers set market_code = v_market where id = v.id;
  end if;
  return v;
end $$;

revoke all on function public.set_my_contact_phone(text) from public, anon;
grant execute on function public.set_my_contact_phone(text) to authenticated;
revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;
