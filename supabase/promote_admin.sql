-- Run in Supabase SQL Editor after the owner has registered on the site.
-- Promote the owner's game account after registering with this exact username.
update public.profiles
   set role = 'admin'
 where lower(username) = lower('shroud');
