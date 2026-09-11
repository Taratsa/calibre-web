FROM oven/bun:1.4.2-slim AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run build

FROM oven/bun:1.4.2-slim AS runtime

ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/data ./src/data
EXPOSE 4321
CMD ["bun", "./dist/server/entry.mjs"]
