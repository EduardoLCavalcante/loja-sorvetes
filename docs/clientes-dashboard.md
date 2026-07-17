# Clientes e dashboard administrativa

## Ativação

1. Aplique a migration `supabase/migrations/20260716_add_customers_orders_and_analytics.sql` no projeto Supabase.
2. Em seguida, aplique `supabase/migrations/20260716_add_order_house_number.sql` e `supabase/migrations/20260716_optimize_dashboard_customer_history.sql`.
3. Confirme que `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas no ambiente de produção.
4. Faça um pedido de teste pelo checkout. Ele será salvo com status `received` antes da abertura do WhatsApp e então aparecerá na dashboard.

## Regras implementadas

- O telefone brasileiro normalizado é único por cliente.
- Um pedido com telefone conhecido preserva o nome principal já salvo.
- Um nome diferente no mesmo telefone gera uma pendência para o administrador; não cria outro cliente.
- O administrador pode manter o nome, usar o nome informado ou marcar o telefone como compartilhado.
- O preenchimento automático acontece apenas a partir de dados salvos no mesmo navegador, após consentimento explícito. A aplicação não devolve dados pessoais a partir de um telefone digitado.
- Pedidos `received`, `confirmed`, `preparing`, `out_for_delivery` e `delivered` contam nas métricas. Pedidos cancelados ficam de fora.

## Dados históricos

O checkout anterior enviava o pedido diretamente ao WhatsApp e não possuía uma tabela de pedidos. Portanto, não há registros históricos no banco para migrar automaticamente. A contagem começa a partir dos pedidos registrados após a ativação desta migration.
