# Base Stage
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Build Stage
FROM base AS build
# Copy configuration and ALL workspace package.json files to leverage caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Explicitly copy all package.json files for artifacts and libs
COPY artifacts/3d-game/package.json ./artifacts/3d-game/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/db/package.json ./lib/db/

# Remove restrictive package overrides
RUN sed -i '/overrides:/,$d' pnpm-workspace.yaml || true

# Install dependencies (cached if locks/packages haven't changed)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Now copy the rest of the source code
COPY . .

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
