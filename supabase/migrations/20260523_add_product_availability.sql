alter table if exists public.products
  add column if not exists is_available boolean not null default true;
