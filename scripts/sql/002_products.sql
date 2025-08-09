-- Products table (idempotent)
create table if not exists public.products (
  id bigserial primary key,
  nome_produto text not null unique,              -- slug/código
  nome_exibicao text,                             -- opcional para exibição
  descricao text,
  preco numeric(10,2) not null,
  original_price numeric(10,2),
  categoria text[] not null default '{}',
  caminho text not null,                          -- nome do arquivo da imagem (ex: "bombom-2l.webp")
  is_new boolean default false,
  is_best_seller boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_products_caminho on public.products (caminho);
create index if not exists idx_products_categoria on public.products using gin (categoria);

-- Enable RLS and allow public reads
alter table public.products enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where polname = 'products_select_anon' and tablename = 'products'
  ) then
    create policy products_select_anon
      on public.products
      for select
      using (true);
  end if;
end$$;
