# Etapa 1: Construcción de la aplicación Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor Nginx para hostear la aplicación
FROM nginx:alpine
# Copiamos los archivos estáticos compilados en la etapa anterior
COPY --from=build /app/dist/sudoku-book-app/browser /usr/share/nginx/html

# Configuramos Nginx para que soporte el enrutamiento de Angular
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
