# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY server ./server
RUN npm install --workspaces --include-workspace-root
RUN npm --workspace shared run build && npm --workspace server run build
# --- run ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
