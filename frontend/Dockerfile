# ──────────────────────────────────────────────
# Frontend — React + Vite (modo desarrollo)
# node:20-alpine: imagen mínima (~180MB vs ~1GB node completo)
# ──────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copiar solo package.json — la capa de dependencias se cachea
# a menos que cambie package.json (ahorra minutos en rebuilds)
COPY package.json ./

# --legacy-peer-deps: necesario para @react-oauth/google con React 19
RUN npm install --legacy-peer-deps

# Copiar el resto del código fuente
# (src/, public/ e index.html se montan como volumen en docker-compose)
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
