FROM node:18-bullseye-slim

# ── Create non-root user ─────────────────────────────────────────
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

# ── Install FULL Chromium/Puppeteer system dependencies ──────────
# Required for puppeteer headless PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
  # Core NSS and crypto
  libnss3 \
  libnspr4 \
  # AT/accessibility bridge (needed by Chrome)
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  # Printing / cups
  libcups2 \
  # DRM / GPU stubs
  libdrm2 \
  libgbm1 \
  # X11 / display
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcb-dri3-0 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  libxkbcommon0 \
  # Audio
  libasound2 \
  # Fonts
  fonts-liberation \
  fonts-noto-color-emoji \
  # Misc
  ca-certificates \
  unzip \
  chromium \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium

# ── Install Node dependencies ────────────────────────────────────
# Copy manifests first for layer caching
COPY package*.json ./
RUN rm -f package-lock.json && npm install --production

# ── Copy application source ──────────────────────────────────────
COPY . .

# ── Pre-create upload directories with correct ownership ─────────
RUN mkdir -p uploads/documents uploads/payments uploads/invoices \
  && chown -R appuser:appgroup /app

# ── Drop to non-root user ────────────────────────────────────────
USER appuser

EXPOSE 5000

CMD ["node", "server.js"]
