# syntax=docker/dockerfile:1

# API (NestJS + Prisma). Contexto de build: a pasta api/.
#   docker build -t fivo-api ./api
#
# A imagem final mantém as devDependencies de propósito: o CLI do Prisma
# (`prisma migrate deploy`) e o ts-node (`npm run backfill:slugs` e
# `npm run seed:demo`) moram nelas, e os dois precisam rodar a partir desta
# mesma imagem no deploy.

FROM node:24-bookworm-slim AS base
# Os engines do Prisma precisam do OpenSSL; a imagem slim não traz.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
# O postinstall roda `prisma generate`, que precisa do schema.
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_DIR=/data/storage
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
RUN mkdir -p /data/storage && chown node:node /data/storage
USER node
VOLUME ["/data/storage"]
EXPOSE 3000
CMD ["node", "dist/infra/main"]
