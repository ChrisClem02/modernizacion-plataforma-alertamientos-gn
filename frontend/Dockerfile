# Contenedor minimo para servir el frontend en modo desarrollo con Vite.
FROM node:20-alpine

# Directorio de trabajo interno.
WORKDIR /usr/src/app

# Se copian primero los manifests para aprovechar cache entre builds.
COPY package*.json ./

# Instalacion de dependencias del frontend.
RUN npm install

# Se copian archivos necesarios para Vite y React.
COPY index.html ./
COPY vite.config.js ./
COPY src ./src

# Puerto por defecto del servidor de desarrollo de Vite.
EXPOSE 5173

# Se arranca Vite accesible desde fuera del contenedor.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
