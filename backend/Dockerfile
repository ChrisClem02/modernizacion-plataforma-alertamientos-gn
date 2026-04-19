# Imagen base ligera para una API Express sencilla.
FROM node:20-alpine

# Directorio de trabajo interno del contenedor.
WORKDIR /usr/src/app

# Se copia primero package.json para aprovechar cache de capas en builds futuros.
COPY package*.json ./

# En esta fase inicial basta con instalar dependencias de aplicacion.
RUN npm install

# Se copia unicamente el codigo del backend.
COPY src ./src

# El puerto real se define por variable de entorno, pero se documenta aqui.
EXPOSE 3001

# Arranque minimo del backend en modo servidor.
CMD ["npm", "run", "start"]
