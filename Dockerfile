# Multi stage build to make image smaller
FROM node:24-bookworm-slim AS builder

# For ca-certificates
RUN apt-get update && apt-get install -y curl 

WORKDIR /source

COPY . .

# Conditional build - only build if release/linux-unpacked doesn't exist
RUN if [ -d "./release/linux-unpacked" ]; then \
        echo "Found existing build, copying..."; \
        cp -r ./release/linux-unpacked/ /app;\
    else \
        echo "Building from source..."; rm -rf .nx && \
        CYPRESS_INSTALL_BINARY=0 corepack yarn install --inline-builds && \
        corepack yarn dist:linux --dir && \
        cp -r ./release/linux-unpacked/ /app;\
    fi 
    
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
    # For ca-certificates and healthcheck
    curl \ 
    xvfb \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

# Contains database, submissions, tags etc
VOLUME [ "/root/PostyBirb" ]
# Contains startup options, remote config, partitions etc
VOLUME [ "/root/.config/postybirb" ]

ENV DISPLAY=:99

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=5 \
    CMD curl http://127.0.0.1:8080 || [ $? -eq 52 ] && exit 0 || exit 1

COPY ./entrypoint.sh .

ENTRYPOINT [ "bash" ]

CMD [ "entrypoint.sh" ]
