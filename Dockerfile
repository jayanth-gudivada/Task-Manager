# ---- Stage 1: build the Vite frontend ----
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Relative API path: frontend and backend live in the same container
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Stage 2: backend serving API + built frontend ----
FROM node:20-alpine

WORKDIR /usr/src/app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# Vite output served by Express as static files
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 5001

CMD ["node", "server.js"]
