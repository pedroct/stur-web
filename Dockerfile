# syntax=docker/dockerfile:1
# Imagem base fixada por digest (índice multi-arquitetura de node:24-alpine, consultado com
# `docker buildx imagetools inspect node:24-alpine`); a tag fica ao lado para leitura.
ARG NODE_IMAGEM=node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

# ── Stage: base ────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGEM} AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
# Base de fusos (o alpine não traz) + fuso padrão do produto (padrão §5.5)
ENV TZ="America/Fortaleza"
RUN apk add --no-cache tzdata && corepack enable pnpm

# ── Stage: deps ────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# pnpm-workspace.yaml guarda a lista de scripts de instalação aprovados (allowBuilds).
# Sem .npmrc nem segredo de build: não há pacote privado.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# HUSKY=0: o `prepare` não instala ganchos de git dentro da imagem
RUN HUSKY=0 pnpm install --frozen-lockfile

# ── Stage: builder ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Stage: runner ──────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Non-root com UID/GID explícito
RUN addgroup -S -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nextjs \
    && chown -R nextjs:nodejs /app
USER nextjs
# O standalone do Next usa HOSTNAME como endereço de escuta; sem isto escuta só na IP interna.
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
# Sem curl na imagem alpine: o healthcheck usa o wget do busybox.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]
