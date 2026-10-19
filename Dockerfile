FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM dependencies AS development
ENV NODE_ENV=development EVIDENCE_DIR=/data/evidence
COPY . .
RUN mkdir -p /data/evidence && chown -R node:node /app /data
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/init-db.mjs && node scripts/init-development-accounts.mjs && exec node node_modules/vinext/dist/cli.js dev --hostname 0.0.0.0 --port 3000"]

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 EVIDENCE_DIR=/data/evidence
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/drizzle-mysql ./drizzle-mysql
COPY --from=build --chown=node:node /app/package.json ./package.json
RUN mkdir -p /data/evidence && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/init-db.mjs && exec node node_modules/vinext/dist/cli.js start --hostname 0.0.0.0 --port 3000"]
