# ── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Accept build-time env vars (Vite bakes these into the JS bundle)
ARG VITE_API_URL=/api
ARG VITE_ENABLE_AUTOFILL=false
ARG VITE_ENABLE_TIME_MACHINE=false

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENABLE_AUTOFILL=$VITE_ENABLE_AUTOFILL
ENV VITE_ENABLE_TIME_MACHINE=$VITE_ENABLE_TIME_MACHINE

# Install deps
COPY package*.json ./
RUN rm -f package-lock.json && npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────
FROM nginx:alpine

# Copy compiled Vite output
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
