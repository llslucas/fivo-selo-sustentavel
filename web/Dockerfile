# syntax=docker/dockerfile:1

# Web (Next.js). Contexto de build: a pasta web/.
#   docker build --build-arg API_URL=http://api:3000 -t fivo-web ./web
#
# API_URL é argumento de build porque o Next fixa os rewrites do proxy
# /api/* no `next build`; trocar a variável só no runtime não tem efeito.

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
ARG API_URL=http://api:3000
ENV API_URL=$API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runtime
ARG API_URL=http://api:3000
ENV NODE_ENV=production \
    API_URL=$API_URL \
    PORT=3001
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next ./.next
RUN npm prune --omit=dev
USER node
EXPOSE 3001
CMD ["npx", "next", "start", "-p", "3001"]
