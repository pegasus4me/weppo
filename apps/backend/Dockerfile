FROM node:22-alpine AS build

RUN corepack enable
WORKDIR /repo

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod /opt/backend

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /opt/backend ./

USER node
EXPOSE 4000

CMD ["node", "dist/server.js"]
