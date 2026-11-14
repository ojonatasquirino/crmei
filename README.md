# CRMEI

Gestão financeira simples para MEI e pequenos negócios. Responde em um minuto por dia:
quanto tenho, quanto posso usar e se vai faltar dinheiro nos próximos 90 dias.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind v4 · componentes no padrão shadcn/ui · Recharts · Firebase (Auth + Firestore) · Zod · Vitest.

## Rodar local

O projeto Firebase já está criado e configurado: **crmei-86ea4** (Firestore em São Paulo, login Google e link por e-mail ativos, regras publicadas). As chaves públicas estão em `.env`.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # motor financeiro
```

Para republicar as regras depois de mudar `firestore.rules`:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

## Deploy na Vercel

1. Importe o repositório na Vercel. O `.env` já vai junto, então não precisa cadastrar variáveis.
2. Depois do primeiro deploy, adicione o domínio (ex.: `crmei.vercel.app`) em Firebase › Authentication › Configurações › Domínios autorizados. Sem isso, o login não funciona em produção.

## Regras financeiras (src/lib/domain)

- Valores sempre em **centavos inteiros**. Datas financeiras sempre `YYYY-MM-DD`, sem fuso.
- **Saldo nunca é armazenado.** É sempre `saldo inicial + tudo que já aconteceu`, recalculado a partir dos lançamentos.
- **Previsto não é dinheiro.** Uma venda a receber entra na previsibilidade, nunca no saldo.
- **Pagamento parcial:** só a parte paga entra no saldo. O restante continua previsto.
- **Transferência** (inclusive para o Guardado) move dinheiro entre contas e nunca conta como entrada ou saída.
- **Guardado** é uma conta do tipo reserva: aparece separado e fica fora do saldo disponível e do "livre para usar".
- **Fixas mensais** são regras. As ocorrências de cada mês são calculadas, e viram lançamento real quando você marca "Feito". Dia 31 vira o último dia em meses curtos.
- **Atrasado** não é um status salvo: é um previsto com vencimento passado. Na projeção, ele entra como se fosse hoje.
- **Livre para usar** = menor saldo projetado nos próximos 90 dias − margem de segurança (nunca negativo).
- **Excluir** é soft delete. Toda alteração grava `updatedBy` e `updatedAt`.

## Segurança

- Cada empresa vive em `companies/{id}` com suas subcoleções. As **Firestore Rules** (`firestore.rules`) só liberam leitura e escrita para membros, validam tipos e valores, limitam a 2 pessoas por empresa e bloqueiam exclusão física.
- O convite é por e-mail. A pessoa entra com esse e-mail e é adicionada automaticamente, e só consegue incluir a si mesma.

## Estrutura

```
src/
  app/
    login/  onboarding/
    (app)/  page.tsx (Início) · lancamentos/ · previsibilidade/ · ajustes/
  components/   ui/ (button, card, input, badge, segmented, sheet) · charts · new-tx · shell · tx-row
  lib/
    domain/     engine.ts (saldo, projeção, fixas, resumo) + testes · money.ts · dates.ts · types.ts
    firebase/   client.ts · session.tsx
    data.tsx    leitura em tempo real e escritas validadas com Zod
```

## Fora do MVP (de propósito)

Cartão de crédito, importação de extrato (OFX), PDF, planos pagos e mais de 2 usuários.
