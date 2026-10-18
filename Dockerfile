# One container: the API plus the built website (/) and dashboard (/admin/) on the same origin.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN VITE_API_MODE=http VITE_API_BASE_URL=/api/v1 npm run build && npm run server:build

FROM node:22-slim
ENV NODE_ENV=production TZ=Asia/Riyadh PORT=8080 SERVE_STATIC_DIR=/app/dist
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 8080
# Applies database migrations on start, then serves.
CMD ["node", "dist-server/index.js"]
