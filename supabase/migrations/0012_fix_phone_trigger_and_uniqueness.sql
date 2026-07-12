-- Fix handle_new_user trigger to read phone from raw_user_meta_data when
-- auth.users.phone is null (always the case for email/password signups).
-- Also add a unique index on profiles.phone so duplicate numbers are blocked
-- at the DB level, regardless of which code path created the user.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.phone, ''),
      nullif(new.raw_user_meta_data->>'phone', ''),
      ''
    ),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), '')
  );
  insert into public.wallets (user_id)
  values (new.id);
  return new;
end;
$$;

-- Unique index on non-empty phone values (allows multiple empty-string phones
-- for users who signed up via Google OAuth without providing a number).
create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null and phone != '';
