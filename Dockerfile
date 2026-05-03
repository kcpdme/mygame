# Base Stage
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY . .

# Build Stage
FROM base AS build
# Remove restrictive package overrides that might break Docker builds on different architectures
RUN sed -i '/overrides:/,$d' pnpm-workspace.yaml || true
# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build variables for Vite
ENV PORT=8080
ENV BASE_PATH=/
RUN pnpm -r --filter "./artifacts/**" build

# Deploy isolated backend workspace
RUN pnpm deploy --filter @workspace/api-server --prod --legacy /prod/api-server

# Backend Production Image
FROM node:20-alpine AS backend
WORKDIR /app
COPY --from=build /prod/api-server .
ENV PORT=3000
ENV NODE_ENV=production
CMD ["node", "dist/index.mjs"]

# Frontend Production Image
FROM nginx:alpine AS frontend
# Install openssl for self-signed cert generation
RUN apk add --no-cache openssl
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy built static files from 3d-game artifact
COPY --from=build /app/artifacts/3d-game/dist/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
