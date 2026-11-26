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

O CI (`.github/workflows/ci.yml`) roda, em jobs separados:

- `quality`: `pnpm lint`, `pnpm typecheck`, `pnpm test` (com `TZ=UTC`), o verificador de dados reais
  (`node scripts/verificar-dados-reais.mjs`) e `pnpm audit --prod`;
- `contrato`: `pnpm contrato` e `git diff --exit-code src/contrato` (os tipos versionados têm de ser
  os da tag de `contrato.json`);
- `e2e`: os fluxos no navegador (`pnpm e2e`, Playwright com Chromium);
- `sast`: semgrep (`p/javascript`, `p/typescript`, `p/security-audit`, `p/secrets`);
- `segredos`: gitleaks;
- `imagem`: build `linux/amd64` sem push, sobe o contêiner e espera a página inicial responder.

Localmente: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

Os fluxos no navegador rodam contra a build de produção na porta 3100, com a API simulada no
próprio navegador (`e2e/apoio.ts`): não precisam do backend. Na primeira vez, baixe o Chromium:

```bash
pnpm exec playwright install chromium
pnpm e2e
```

## Imagem

```bash
docker build --platform linux/amd64 -t stur-web:local .
docker run --rm -p 3000:3000 stur-web:local   # http://localhost:3000/
```

O `Dockerfile` usa `node:24-alpine` fixado por digest, o `output: "standalone"` do Next, fuso
`America/Fortaleza`, usuário `nextjs` (1001) e `HEALTHCHECK` com o `wget` do busybox. Não há
`.npmrc` nem segredo de build: nenhum pacote é privado.

## SonarQube

A análise não roda no CI: roda da máquina de quem desenvolve, contra `https://sonar.pedroct.com.br`
(projeto `stur-consulta-web`, que precisa existir no servidor; configuração em
`sonar-project.properties`). Os tipos gerados de `src/contrato` ficam fora da análise e da duplicação.

```bash
scripts/sonar.sh                  # pnpm test:cobertura e, em seguida, o scan
scripts/sonar.sh --somente-scan   # reaproveita o coverage/lcov.info existente
scripts/sonar.sh --tentativas 5   # repete o scan em falha de rede (1 a 5, padrão 3)
```

O script lê `SONAR_TOKEN_WEB` (e `SONAR_HOST_URL`, se existir) do ambiente ou do primeiro `.env`
que os tiver, subindo a partir desta pasta; o token nunca vai na linha de comando. É um token de
análise do projeto `stur-consulta-web`; o `SONAR_TOKEN` fica para o `stur-api`. Ele usa
`pnpm dlx @sonar/scan@5.1.0 -Dsonar.qualitygate.wait=true`, para na hora quando o quality gate
reprova e sai com erro se `coverage/lcov.info` não existir depois dos testes.

## Release

`.github/workflows/release.yml` roda depois que o workflow `ci` termina verde num push na `main`
(`workflow_run`), no commit que o CI aprovou. O semantic-release (`.releaserc.json`) lê os
Conventional Commits, grava a versão no `package.json` (sem publicar no npm) e o `CHANGELOG.md`,
cria o commit `chore(release)`, a tag `vX.Y.Z` e o GitHub Release. Se houve versão nova, o job
`imagem` publica `ghcr.io/pedroct/stur-web:<versão>` (`linux/amd64`).

Diferenças em relação ao backend (`stur-api`, que usa o python-semantic-release):

- o semantic-release não publica quando a `main` andou durante o CI: a versão sai no push seguinte;
- a primeira versão é a `1.0.0`, não a `0.x`.

## Repositório público

Nenhum dado real entra aqui: nem em código, nem em teste, nem em captura de tela. Use sempre números
de teste (reserva `90000001` em diante, `idreserva` `1001` em diante) e nomes inventados
(`CLIENTE EXEMPLO LTDA`, `FORNECEDOR EXEMPLO`). O verificador recusa o commit que traga número de
reserva real ou o identificador da A3, no conteúdo ou no caminho do arquivo.
