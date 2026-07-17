-- Bairros atendidos e respectivas taxas de entrega.

create table if not exists public.delivery_zones (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 2 and 120),
  normalized_name text not null unique,
  fee numeric(10, 2) not null check (fee >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.prepare_delivery_zone()
returns trigger
language plpgsql
as $$
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  new.normalized_name := upper(translate(
    regexp_replace(new.name, '\s+', ' ', 'g'),
    'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
  ));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists delivery_zones_prepare on public.delivery_zones;
create trigger delivery_zones_prepare
before insert or update on public.delivery_zones
for each row execute function public.prepare_delivery_zone();

insert into public.delivery_zones (name, normalized_name, fee)
values
  ('ANTÔNIO HOLANDA', 'ANTONIO HOLANDA', 4),
  ('ARRAIAL', 'ARRAIAL', 8),
  ('ARRAIAL DA LAMBADA', 'ARRAIAL DA LAMBADA', 8),
  ('ARRAIAL DE BAIXO', 'ARRAIAL DE BAIXO', 8),
  ('BOA FÉ', 'BOA FE', 4),
  ('BOM FIM', 'BOM FIM', 5),
  ('BOM JESUS', 'BOM JESUS', 4),
  ('BOM JESUS DO CRUZEIRO', 'BOM JESUS DO CRUZEIRO', 10),
  ('BOM NOME', 'BOM NOME', 4),
  ('BROTALÂNDIA', 'BROTALANDIA', 3),
  ('CANAFISTULA', 'CANAFISTULA', 8),
  ('CENTRO', 'CENTRO', 3),
  ('CIDADE ALTA', 'CIDADE ALTA', 8),
  ('CJ FLORES', 'CJ FLORES', 4),
  ('CJ HABITAR BRASIL', 'CJ HABITAR BRASIL', 4),
  ('CÓRREGO DE AREIA', 'CORREGO DE AREIA', 8),
  ('DR JOSÉ SIMOES', 'DR JOSE SIMOES', 3),
  ('JOÃO XXIII', 'JOAO XXIII', 3),
  ('LIMOEIRINHO', 'LIMOEIRINHO', 5),
  ('LIMOEIRO ALTO', 'LIMOEIRO ALTO', 5),
  ('LUIZ ALVES', 'LUIZ ALVES', 4),
  ('MILAGRES', 'MILAGRES', 5),
  ('MONSENHOR OTÁVIO', 'MONSENHOR OTAVIO', 3),
  ('MORROS', 'MORROS', 4),
  ('PITOMBEIRA', 'PITOMBEIRA', 3),
  ('POPULARES', 'POPULARES', 3),
  ('QUIXABA', 'QUIXABA', 5),
  ('SANTA LUZIA', 'SANTA LUZIA', 4),
  ('SÃO RAIMUNDO', 'SAO RAIMUNDO', 8),
  ('SÍTIO ILHAS', 'SITIO ILHAS', 5),
  ('SOBRADO', 'SOBRADO', 4),
  ('SOCORRO', 'SOCORRO', 4),
  ('TRIÂNGULO', 'TRIANGULO', 8),
  ('VÁRZEA DO COBRA', 'VARZEA DO COBRA', 8),
  ('VILA TETEU', 'VILA TETEU', 5),
  ('EUCALIPTOS', 'EUCALIPTOS', 3)
on conflict (normalized_name) do nothing;

alter table public.delivery_zones enable row level security;

drop policy if exists delivery_zones_public_read_active on public.delivery_zones;
create policy delivery_zones_public_read_active
on public.delivery_zones
for select
to anon, authenticated
using (is_active = true);

grant select on public.delivery_zones to anon, authenticated;
revoke insert, update, delete on public.delivery_zones from anon, authenticated;

alter table public.orders
add column if not exists delivery_zone_id bigint references public.delivery_zones(id) on delete restrict;

create index if not exists orders_delivery_zone_id_idx on public.orders(delivery_zone_id);
