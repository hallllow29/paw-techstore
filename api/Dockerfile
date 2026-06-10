# ── API (Node + Express) ──
FROM node:22-alpine

WORKDIR /app

# Instala dependências primeiro (melhor cache de layers)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

# Healthcheck usa a rota /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
