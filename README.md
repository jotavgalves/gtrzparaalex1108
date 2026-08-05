# GTRZ System

PDV desktop offline para operação e gestão de eventos da GTRZ.

> Estado atual: **planejamento técnico e funcional**. A implementação ainda não foi iniciada.

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

## Documentação

- [`docs/PLANO_GERAL.md`](docs/PLANO_GERAL.md): escopo funcional consolidado.
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): arquitetura técnica proposta.
- [`docs/PADRAO_DE_CODIGO.md`](docs/PADRAO_DE_CODIGO.md): modularidade obrigatória e portões contra código sujo ou legado.
- [`docs/MODELO_DE_DADOS.md`](docs/MODELO_DE_DADOS.md): entidades e relacionamentos.
- [`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md): regras críticas e invariantes.
- [`docs/TESTES_SMOKE.md`](docs/TESTES_SMOKE.md): catálogo inicial de testes automatizados.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases de implementação e critérios de conclusão.
- [`docs/DECISOES.md`](docs/DECISOES.md): decisões já confirmadas e pendências futuras.

## Stack planejada

- Electron
- React
- TypeScript estrito
- Vite
- SQLite
- Drizzle ORM
- Zod
- Lucide React
- fonte local empacotada
- Vitest
- Playwright
- ESLint com regras de boundaries
- verificação de ciclos e código morto

A stack poderá ser ajustada somente mediante decisão documentada antes da implementação do módulo afetado.
