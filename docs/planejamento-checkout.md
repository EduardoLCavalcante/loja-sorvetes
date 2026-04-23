# Planejamento: Refatoração do Botão de Finalizar Pedido

## O Problema Atual
Durante o processo de fechamento de pedido (checkout) no componente `CheckoutModal`, usuários com baixa familiaridade em tecnologia estão relatando problemas para finalizar o pedido e de redirecionamento para o WhatsApp.
Parte dessa dificuldade surge porque os usuários tentam avançar clicando no botão final sem antes terem preenchido os campos obrigatórios do formulário de endereço e entrega. Se eles clicarem sem preencher, recebem uma mensagem de erro em vermelho que podem acabar não notando ou entendendo.

## A Solução Proposta
Para tornar a interface mais intuitiva e à prova de falhas para usuários leigos, o botão de finalização (que envia o pedido para o WhatsApp) deve se comportar de forma que **fique visualmente indisponível e não clicável até que o usuário preencha um formulário válido**.

## Passos para Implementação

1. **Validação Contínua (Em Tempo Real)**:
   Em vez de apenas usar o schema do Zod (`checkoutSchema`) dentro da função `handleSubmit`, vamos validar estado de preenchimento de todo o formulário (`props.deliveryInfo`) continuamente a cada re-renderização, utilizando o `useMemo`.
   
   ```typescript
   // Exemplo de como derivar o estado de formulário válido em tempo real
   const isFormValid = useMemo(() => {
     const result = checkoutSchema.safeParse(props.deliveryInfo);
     return result.success;
   }, [props.deliveryInfo]);
   ```

2. **Desabilitar o Botão de Confirmação**:
   Utilizar o valor `isFormValid` criado para injetar no atributo `disabled` do botão principal.
   Dessa forma, a propriedade passará a ser `disabled={props.isProcessingOrder || !isFormValid}` ao invés de apenas focar no processamento do pedido.

3. **Cuidado com o Feedback Visual**:
   Como o botão estará inabilitado, pode ser benéfico **acrescentar um pequeno texto descritivo** abaixo ou acima do próprio botão para alertar o usuário leigo:
   *Por exemplo:* Exibir "Preencha todos os campos obrigatórios primeiro" caso ele tente clicar em um botão inativo, ou simplesmente deixar uma mensagem clara de que faltam campos, melhorando a UX (Experiência de Usuário). O uso das classes `opacity-50` e `cursor-not-allowed` da Tailwind que já existem no componente ajudam nesse direcionamento de estado indisponível.

4. **Otimização dos Erros Visíveis**:
   A caixa contendo a descrição `Os campos a seguir precisam ser preenchidos corretamente...` em vermelho aparece depois de um clique malsucedido. No novo fluxo as notificações de campo errado (feedback de `formErrors`) precisarão ser combinadas ou o fluxo será totalmente trocado para validar campo-a-campo através de validações automáticas do Zod durante o evento `onBlur` (ao tirar o foco do input).

## Resumo das Tarefas
- Editar o arquivo `components/CheckoutModal/CheckoutModal.tsx`.
- Importar / Adicionar o hook `useMemo` de `react`.
- Derivar a constante `isFormValid` a partir do `checkoutSchema.safeParse`.
- Atualizar as flags `disabled` e propriedades de classe de CSS no botão "Enviar Pedido via WhatsApp".
- Revisar se os testes/usuários acham essa UX melhor ou se um simples *Tooltip* ajudaria.
