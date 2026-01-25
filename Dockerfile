# Multi stage build to make image smaller
FROM node:24-bookworm-slim AS builder

# For ca-certificates
RUN apt-get update && apt-get install -y curl 

WORKDIR /source

COPY . .

# Cache does not match fix
RUN rm -rf .nx 

RUN corepack install

RUN corepack yarn install --inline-builds

RUN corepack yarn dist:linux --dir

RUN cp -r ./release/linux-unpacked/ /app

FROM node:24-bookworm-slim

COPY --from=builder /app /app

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
    # For ca-certificates
    curl \ 
    xvfb \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

ENV DISPLAY=:99

EXPOSE 8080

# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD curl -f http://localhost:8080/ || exit 1

ENTRYPOINT [ "/bin/bash" ]

CMD set -o pipefail && xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" ./PostyBirb --headless --port=8080 | grep -v -E "ERROR:viz_main_impl\.cc\(183\)|ERROR:object_proxy\.cc\(576\)|ERROR:bus\.cc\(408\)"
