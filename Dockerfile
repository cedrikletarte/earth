# Stage 1: Install dependencies
# Needs the scripts/ directory so the postinstall can copy Cesium assets into public/cesium
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/ ./scripts/
RUN npm ci

# Stage 2: Build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app

# Reuse installed modules and generated Cesium assets from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/public/cesium ./public/cesium

COPY . .

# NEXT_PUBLIC_* vars are inlined at build time — pass them from docker-compose or CLI
ARG NEXT_PUBLIC_CESIUM_ION_TOKEN
ARG NEXT_PUBLIC_TILESERVER_URL=http://localhost:8085
ARG NEXT_PUBLIC_NOMINATIM_BASE_URL=http://localhost:8086

ENV NEXT_PUBLIC_CESIUM_ION_TOKEN=$NEXT_PUBLIC_CESIUM_ION_TOKEN
ENV NEXT_PUBLIC_TILESERVER_URL=$NEXT_PUBLIC_TILESERVER_URL
ENV NEXT_PUBLIC_NOMINATIM_BASE_URL=$NEXT_PUBLIC_NOMINATIM_BASE_URL

RUN npm run build

# Stage 3: Minimal production runtime using Next.js standalone output
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
