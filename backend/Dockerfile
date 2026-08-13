# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
RUN npm install -g pm2
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY ecosystem.config.js ./

EXPOSE 4000
# Apply any pending migrations before serving traffic — without this, a schema change (new
# model, new column, etc.) can ship in the image while the actual database it connects to
# (e.g. a Supabase project) never receives it, so the app boots fine but fails at query time
# with "relation ... does not exist". `migrate deploy` is a safe no-op when nothing is pending,
# and takes its own advisory lock, so it's also safe if multiple container replicas happen to
# start at once during a deploy.
CMD ["sh", "-c", "npx prisma migrate deploy && pm2-runtime start ecosystem.config.js"]
