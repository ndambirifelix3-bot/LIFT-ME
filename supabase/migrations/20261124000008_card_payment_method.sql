-- Lift Me — card payments (Stripe). Step 1: the new payment method value.
-- (A new enum value can't be used in the same transaction that adds it, so the rest is in the next file.)
alter type public.payment_method add value if not exists 'card';
