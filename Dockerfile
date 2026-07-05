# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* vars are inlined at build time — pass them from docker-compose or CLI
ARG VITE_BASEMAP_SOURCE=pmtiles
ARG VITE_TILESERVER_URL=http://localhost:8085
ARG VITE_PMTILES_URL=http://localhost:8087
ARG VITE_NOMINATIM_BASE_URL=http://localhost:8086

ENV VITE_BASEMAP_SOURCE=$VITE_BASEMAP_SOURCE
ENV VITE_TILESERVER_URL=$VITE_TILESERVER_URL
ENV VITE_PMTILES_URL=$VITE_PMTILES_URL
ENV VITE_NOMINATIM_BASE_URL=$VITE_NOMINATIM_BASE_URL

RUN npm run build

# Stage 2: Serve static output with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
