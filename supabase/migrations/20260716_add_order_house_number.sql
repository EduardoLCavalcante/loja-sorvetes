alter table if exists public.orders
  add column if not exists house_number_snapshot text,
  add column if not exists has_no_house_number boolean not null default false;
