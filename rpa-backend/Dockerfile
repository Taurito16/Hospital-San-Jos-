# Usar una versión específica y estable para Railway
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Optimizar caché de npm
COPY package*.json ./
RUN npm install --only=production

# Copiar solo el código necesario
COPY server.js ./

# Railway asigna el puerto automáticamente
CMD ["npm", "start"]
