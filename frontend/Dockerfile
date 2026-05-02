# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────
# Frontend — React + Vite (modo desarrollo)
# node:20-alpine: imagen mínima (~180MB vs ~1GB node completo)
# ──────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos para maximizar cache de dependencias
COPY package.json package-lock.json ./

# --legacy-peer-deps: necesario para @react-oauth/google con React 19
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --prefer-offline

# Copiar el resto del código fuente
# (src/, public/ e index.html se montan como volumen en docker-compose)
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
