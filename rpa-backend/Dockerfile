FROM ghcr.io/puppeteer/puppeteer:latest

# Cambiar a usuario root temporalmente para evitar problemas de permisos
USER root

WORKDIR /app

# Copiar los archivos dándoles propiedad al usuario de puppeteer
COPY --chown=pptruser:pptruser package*.json ./
COPY --chown=pptruser:pptruser . .

# Volver al usuario seguro de puppeteer
USER pptruser

# Instalar dependencias
RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
