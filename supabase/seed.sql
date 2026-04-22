-- Minimal dev seed. Run manually after migrations.

insert into public.plans (id, slug, name, price_cents, currency, billing_interval, is_active)
values
  (gen_random_uuid(), 'plus-annuale', 'Ulilearn Plus — Annuale', 0, 'EUR', 'year', true)
on conflict (slug) do nothing;
