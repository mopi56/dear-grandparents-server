FROM node:24.21.0-alpine3.24

# Dossier de travail
WORKDIR /app

# Installer ffmpeg
RUN apk add --no-cache ffmpeg

# Copier les fichiers de dépendances
COPY --chown=node:node package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev

# Copier le reste de l'application
COPY --chown=node:node . .

USER node

# Port utilisé par Express
EXPOSE 3000

# Lancer le serveur
CMD ["node", "server.js"]