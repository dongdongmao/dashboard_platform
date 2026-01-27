FROM node:20-alpine AS build

WORKDIR /app/front-end

# Install dependencies
COPY package*.json ./
# Use npm install instead of npm ci because:
# 1. npm ci requires exact match between package.json and package-lock.json
# 2. We just added d3 dependency, so lockfile might be outdated
# 3. npm install will update lockfile if needed (acceptable in Docker builds)
RUN npm install

# Copy source and build SSR bundle
COPY . .
RUN npm run build

# Runtime image
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Only copy the compiled artifacts into the runtime image
COPY --from=build /app/front-end/dist ./dist

EXPOSE 4000

# Start the Angular SSR server
CMD ["node", "dist/front-end/server/server.mjs"]

