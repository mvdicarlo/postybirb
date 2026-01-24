# Use a base image with Node.js and required dependencies for Electron
FROM node:24-bullseye-slim

# Install dependencies for Electron and headless display
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    libxss1 \
    libgconf-2-4 \
    libgbm-dev \
    libxshmfence-dev \
    libdrm-dev \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the AppImage
COPY . .

RUN corepack install

RUN corepack yarn install --inline-builds

RUN corepack yarn build:prod

# # Switch to non-root user
# USER appuser

# Set display for headless operation
ENV DISPLAY=:99

# Expose the port (default from your app)
EXPOSE 8080

# Health check (adjust port as needed)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD curl -f http://localhost:8080/ || exit 1

# Command to run with xvfb for headless execution
CMD set -o pipefail \
    && xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" \
    electron . --headless --port=${PORT:-8080} \
    | grep -v -E "ERROR:viz_main_impl\.cc\(183\)|ERROR:object_proxy\.cc\(576\)|ERROR:bus\.cc\(408\)"'
