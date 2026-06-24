# ── Cliente Angular (multi-stage: build → nginx) ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve os ficheiros estáticos com nginx NÃO-ROOT (mitiga AVD-DS-0002).
# A imagem 'nginx-unprivileged' corre como uid 101 (nginx) e escuta na 8080.
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client/browser /usr/share/nginx/html
EXPOSE 8080
