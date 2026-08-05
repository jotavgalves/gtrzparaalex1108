# GTRZ System

PDV desktop offline para operação e gestão de eventos da GTRZ.

> Estado atual: **implementação da fundação técnica iniciada** na branch `feat/fundacao-tecnica`.

## Objetivo

Centralizar, em um único aplicativo Windows e sem dependência de internet, a gestão de:

- eventos;
- estoque e produtos;
- combos;
- mesas e balcão;
- vendas e pagamentos;
- vouchers;
- caixa;
- despesas;
- ingressos;
- auditoria;
- backups e configurações.

## Fundação implementada

- workspace modular com aplicativo e pacotes separados;
- Electron com processos `main`, `preload` e `renderer` isolados;
- uma única raiz React e um único roteador;
- onze abas registradas como módulos independentes;
- SQLite local com versão de esquema e verificação de integridade;
- contrato IPC tipado e validado com Zod;
- tema escuro GTRZ com Lucide e Inter incorporados ao bundle;
- testes unitários, smoke estrutural e smoke E2E do Electron;
- portões automáticos para TypeScript, lint, formatação, ciclos, código morto e arquitetura;
- instalador Windows preparado com Electron Builder;
- recursos de marca reservados para os arquivos oficiais contidos em `LOGOS.zip`.

As telas atuais representam a fundação navegável. Os fluxos comerciais serão implementados por fase, começando por eventos, perfis e configurações básicas.

## Perfis de acesso

O sistema terá somente dois perfis:

- **Produção:** acesso administrativo completo a todos os módulos e configurações.
- **Caixa:** acesso às mesas e à consulta operacional do estoque. Não acessa ingressos, custos, margens, despesas, relatórios administrativos, auditoria ou configurações. Edições e cancelamentos protegidos exigem senha da Produção.

## Características obrigatórias

- Aplicativo desktop para um único computador.
- Funcionamento integralmente offline após a instalação.
- Banco de dados local SQLite.
- Interface escura com vermelho vivo e branco.
- Ícones Lucide incorporados ao aplicativo para uso offline.
- Fonte incorporada ao pacote do aplicativo para uso offline.
- Separação completa dos dados por evento.
- Auditoria de todas as operações relevantes.
- Backup automático, manual, ao encerrar evento, restauração e importação de backup.
- Testes unitários, de integração, interface e smoke identificados por função.
- Arquitetura de monólito modular, com cada aba isolada por domínio.
- Uma única raiz React e um único roteador.
- Bloqueios automáticos contra dependências circulares, imports indevidos, código morto, implementações duplicadas e sobreposição de código legado.

## Executar localmente

Requisitos:

- Windows 10 ou 11 x64;
- Node.js 22.13 ou superior;
- npm 10.9.8 ou compatível.

```bash
npm install
npm run dev
```

Validação completa:

```bash
npm run quality
npm run test:e2e
```

Gerar o instalador:

```bash
npm run package:win
```

## Estrutura principal

```text
apps/desktop/
├─ src/main/       # janela, ciclo do Electron e banco
├─ src/preload/    # API mínima exposta ao renderer
├─ src/renderer/   # interface, rotas e features
└─ resources/      # identidade visual e instalador

packages/
├─ contracts/      # contratos IPC validados
├─ database/       # SQLite, esquema e migrações
└─ domain/         # regras puras e cálculos
```

## Documentação

- [`docs/PLANO_GERAL.md`](docs/PLANO_GERAL.md): escopo funcional consolidado.
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): arquitetura técnica proposta.
- [`docs/PADRAO_DE_CODIGO.md`](docs/PADRAO_DE_CODIGO.md): modularidade obrigatória e portões contra código sujo ou legado.
- [`docs/MODELO_DE_DADOS.md`](docs/MODELO_DE_DADOS.md): entidades e relacionamentos.
- [`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md): regras críticas e invariantes.
- [`docs/TESTES_SMOKE.md`](docs/TESTES_SMOKE.md): catálogo inicial de testes automatizados.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases de implementação e critérios de conclusão.
- [`docs/DECISOES.md`](docs/DECISOES.md): decisões já confirmadas e pendências futuras.

## Stack

- Electron 43
- React 19
- TypeScript estrito
- Vite 7 e Electron Vite 5
- SQLite e Drizzle ORM
- Zod
- Lucide React
- Inter Variable local
- Vitest
- Playwright
- ESLint
- Madge e Knip

A stack somente poderá ser ajustada mediante decisão documentada antes da implementação do módulo afetado.
