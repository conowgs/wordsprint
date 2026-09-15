FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY client ./client
RUN npm install --workspaces --include-workspace-root
RUN npm --workspace shared run build && npm --workspace client run build
FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
