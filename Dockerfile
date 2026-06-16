# Usar la versión oficial de Node.js más ligera
FROM node:18-alpine

# Establecer la ruta de trabajo que pide la pauta
WORKDIR /srv/cruz_azul-erp

# Copiar los archivos de dependencias e instalar
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto del servidor
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]
