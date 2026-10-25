# Production image for self-hosting (VPS, Railway, Render, Fly.io…).
#   docker build -t roopmohana .
#   docker run -p 3000:3000 --env-file .env roopmohana
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
# Seed script + catalogue so `docker exec … npm run db:seed` style setup is possible
COPY --from=build /app/data ./data
RUN mkdir -p /app/.data/uploads && chown -R app:app /app/.data
USER app
VOLUME ["/app/.data"]
EXPOSE 3000
CMD ["node", "server.js"]
