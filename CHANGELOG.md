# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-06

### Corregido
- Añadida la dependencia `marked` y `@types/marked` faltante en `package.json` que causaba el fallo de compilación en Docker (`TS2307: Cannot find module 'marked'`).
- Desactivadas las analíticas de Angular CLI en `angular.json` para entornos no interactivos de CI/Docker.

## [0.1.0] - 2026-09-06

### Añadido
- Workflow de GitHub Actions (`.github/workflows/docker-publish.yml`) para compilar y publicar automáticamente imágenes Docker multiplataforma (`linux/amd64`, `linux/arm64`) en Docker Hub en ramas `main`/`master`.
- Servidor estático con Express (`express-server.js`) para servir la aplicación web y assets generados.
- Configuración para despliegue en homelab con `docker-compose.yml` utilizando la imagen pública `pmarzoa/sudoku-book:latest` expuesta en el puerto 9093.
- Guía de ejecución en ZimaOS (`docker-cli-zimaos.txt`).

### Cambiado
- Actualizada la configuración de `docker-compose.yml` para usar imagen de Docker Hub y estandarizar el nombre del servicio.
