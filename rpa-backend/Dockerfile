FROM ghcr.io/puppeteer/puppeteer:latest

# Cambiar a usuario root temporalmente
USER root

# Crear la carpeta de la app y darle propiedad absoluta al usuario pptruser
RUN mkdir -p /app && chown -R pptruser:pptruser /app

WORKDIR /app

# Copiar los archivos con la propiedad correcta
COPY --chown=pptruser:pptruser package*.json ./
COPY --chown=pptruser:pptruser . .

# Volver al usuario seguro de puppeteer
USER pptruser

# Instalar dependencias (ahora sí tiene permisos para crear node_modules)
RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
