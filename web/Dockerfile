FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Build with env baked at build time (Vite env vars are inlined)
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_TEST_API_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_MOCK_CALLS
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_TEST_API_KEY=$VITE_TEST_API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_MOCK_CALLS=$VITE_MOCK_CALLS

RUN npm run build

# Production stage — minimal static file server
FROM node:20-alpine

WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist

# Railway injects PORT
ENV PORT=8080
EXPOSE 8080

# -s flag serves single-page apps (any unknown path falls back to index.html)
# so React Router client-side routes work on direct navigation.
CMD ["sh", "-c", "serve -s dist -l $PORT"]
