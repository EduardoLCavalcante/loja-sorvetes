-- Enable extension for UUID generation (available by default on Supabase)
create extension if not exists pgcrypto;

-- Images metadata table: stores storage path and public urls
create table if not exists public.images (
  file_name text primary key,
  path text not null,
  public_url text not null,
  categories text[] default '{}'::text[],
  checksum text,
  created_at timestamptz not null default now()
);

-- Indexes
create unique index if not exists images_file_name_key on public.images (file_name);
create index if not exists images_categories_gin on public.images using gin (categories);

-- Core catalog (optional now, ready for future migration)
create table if not exists public.categories (
  id serial primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists public.products (
  id serial primary key,
  slug text not null unique,
  nome_produto text not null,
  descricao text,
  price numeric(10,2),
  is_new boolean not null default false,
  is_best_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  product_id integer not null references public.products(id) on delete cascade,
  category_id integer not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists public.product_images (
  id serial primary key,
  product_id integer not null references public.products(id) on delete cascade,
  image_id integer not null references public.images(id) on delete cascade,
  position integer not null default 0
);

-- RLS and policies (read for anon; write for service_role)
alter table public.images enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_images enable row level security;

-- Read for anyone (anon)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='categories_read_anon') then
    create policy categories_read_anon on public.categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products_read_anon') then
    create policy products_read_anon on public.products for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_categories' and policyname='product_categories_read_anon') then
    create policy product_categories_read_anon on public.product_categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='product_images_read_anon') then
    create policy product_images_read_anon on public.product_images for select using (true);
  end if;
end$$;

-- Write with service_role
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='categories_write_service') then
    create policy categories_write_service on public.categories
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products_write_service') then
    create policy products_write_service on public.products
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_categories' and policyname='product_categories_write_service') then
    create policy product_categories_write_service on public.product_categories
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='product_images_write_service') then
    create policy product_images_write_service on public.product_images
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end$$;

-- Optional: allow authenticated inserts/updates (service_role bypasses RLS anyway)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='authenticated_upsert') then
    create policy authenticated_upsert on public.categories
      for insert
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='authenticated_update') then
    create policy authenticated_update on public.categories
      for update
      using (true)
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='authenticated_upsert') then
    create policy authenticated_upsert on public.products
      for insert
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='authenticated_update') then
    create policy authenticated_update on public.products
      for update
      using (true)
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_categories' and policyname='authenticated_upsert') then
    create policy authenticated_upsert on public.product_categories
      for insert
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_categories' and policyname='authenticated_update') then
    create policy authenticated_update on public.product_categories
      for update
      using (true)
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='authenticated_upsert') then
    create policy authenticated_upsert on public.product_images
      for insert
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='authenticated_update') then
    create policy authenticated_update on public.product_images
      for update
      using (true)
      with check (true);
  end if;
end$$;

-- Public read images policy
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'Public read images'
  ) then
    create policy "Public read images"
      on public.images
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- Authenticated write images policy
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'Authenticated write images'
  ) then
    create policy "Authenticated write images"
      on public.images
      for insert
      to authenticated
      with check (true);

    create policy "Authenticated update images"
      on public.images
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end$$;
