-- Evita varrer pedidos cancelados ao descobrir a primeira compra válida dos
-- clientes que aparecem em um período da dashboard.
create index if not exists orders_valid_customer_created_at_idx
  on public.orders (customer_id, created_at)
  where status in (
    'received',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered'
  );

-- A dashboard chama esta função pelo servidor, usando a service_role. Ela
-- devolve uma linha por cliente, em vez de transferir todo o histórico de
-- pedidos para a aplicação calcular a primeira compra em JavaScript.
create or replace function public.get_first_valid_orders(
  p_customer_ids uuid[],
  p_end timestamptz
)
returns table (
  customer_id uuid,
  first_order_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    o.customer_id,
    min(o.created_at) as first_order_at
  from public.orders as o
  where o.customer_id = any(p_customer_ids)
    and o.created_at < p_end
    and o.status in (
      'received',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered'
    )
  group by o.customer_id;
$$;

revoke execute on function public.get_first_valid_orders(uuid[], timestamptz) from public;
grant execute on function public.get_first_valid_orders(uuid[], timestamptz) to service_role;
