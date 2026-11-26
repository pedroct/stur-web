# stur-web

Frontend da **Consulta de reserva do Stur**: Next.js (App Router), React, Tailwind e shadcn/ui.
Fala com a API `stur-api` por `/api/...`.

## Como rodar

Requisitos: Node 24 (`.node-version`) e pnpm 11 (via corepack).

```bash
pnpm install
# backend (stur-api) em http://localhost:8000
pnpm dev
```

Em desenvolvimento o Next repassa `/api/*` para o backend (`STUR_API_INTERNO`, padrão
`http://localhost:8000`). Em produção o Traefik separa as rotas.

## Ganchos de commit

O `pnpm install` liga o husky. O pre-commit roda o `lint-staged` (Biome), o `gitleaks` e o
verificador de dados reais; o commit-msg roda o commitlint (Conventional Commits). Instale à parte:

```bash
brew install gitleaks
```

## Verificações

O CI roda, nesta ordem: `pnpm lint`, `pnpm typecheck`, `pnpm test` (com `TZ=UTC`), o verificador
de dados reais (`node scripts/verificar-dados-reais.mjs`) e o semgrep e o SonarQube nas mudanças.
Localmente: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Repositório público

Nenhum dado real entra aqui: nem em código, nem em teste, nem em captura de tela. Use sempre números
de teste (reserva `90000001` em diante, `idreserva` `1001` em diante) e nomes inventados
(`CLIENTE EXEMPLO LTDA`, `FORNECEDOR EXEMPLO`). O verificador recusa o commit que traga número de
reserva real ou o identificador da A3, no conteúdo ou no caminho do arquivo.
