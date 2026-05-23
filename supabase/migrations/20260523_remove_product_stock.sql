alter table if exists public.products
  drop column if exists stock;

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'reduce_product_stock'
  loop
    execute format(
      'drop function if exists %I.%I(%s)',
      fn.schema_name,
      fn.function_name,
      fn.arguments
    );
  end loop;
end $$;
