# Multi stage build to make image smaller
FROM node:24-bookworm-slim AS builder

# For ca-certificates
RUN apt-get update && apt-get install -y curl python[latest] build-essential

WORKDIR /source

COPY . .

# Conditional build - only build if release/linux*-unpacked doesn't exist.
# Note: the directory name varies by arch (linux-unpacked, linux-arm64-unpacked),
# Make TARGETARCH available (BuildKit sets this automatically when building with --platform)
ARG TARGETARCH

# Map Docker's TARGETARCH to Electron Builder's Linux output directory name
RUN ARCH_DIR=$(case "$TARGETARCH" in \
      amd64)   echo "linux-unpacked" ;; \
      arm64)   echo "linux-arm64-unpacked" ;; \
      *)       echo "linux-${TARGETARCH}-unpacked" ;; \
    esac) \
    && if [ -d "./release/$ARCH_DIR" ]; then \
        echo "Found existing build for $TARGETARCH, copying..."; \
        cp -r "./release/$ARCH_DIR/." /app; \
    else \
        echo "Building from source..."; rm -rf .nx && \
        CYPRESS_INSTALL_BINARY=0 corepack yarn install --inline-builds && \
        corepack yarn dist:linux --dir && \
        cp -r "./release/$ARCH_DIR/." /app; \
    fi
    
FROM node:24-bookworm-slim

COPY --from=builder /app /app

# Install dependencies for Electron and headless display
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    libxss1 \
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

ENV POSTYBIRB_PORT=8080

# Note that this isn't dynamic, so if you use a port
# Other than 8080 you'll need to map it when you run 
# the docker image
EXPOSE $POSTYBIRB_PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=5 \
    CMD curl http://127.0.0.1:${POSTYBIRB_PORT} || [ $? -eq 52 ] && exit 0 || exit 1

COPY ./entrypoint.sh .

ENTRYPOINT [ "bash" ]

CMD [ "entrypoint.sh" ]
