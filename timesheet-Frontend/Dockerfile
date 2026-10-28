# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better cache)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source and build
COPY . .

# Build-time env for Vite (proxied via nginx at runtime)
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
  VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
