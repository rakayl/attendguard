# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.23-alpine3.19 AS builder

WORKDIR /app

ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org
ENV GOFLAGS=-buildvcs=false

# Download dependencies first (layer cache)
COPY go.mod go.sum* ./
RUN sh -c 'for i in 1 2 3 4 5; do go mod download && exit 0; echo "go mod download failed, retry $i"; sleep 5; done; exit 1'

# Copy source
COPY . .

# Build main server binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.version=$(date -u +%Y%m%d)" \
    -o /app/attendguard \
    ./cmd/main.go

# Build standalone migrate CLI (optional — useful for manual ops)
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /app/migrate \
    ./cmd/migrate

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# Avoid network-dependent apk install in runtime stage.
# Reuse CA certificates from the builder image so final builds stay stable
# even when Alpine mirrors are slow or temporarily unavailable.
COPY --from=builder /etc/ssl/certs /etc/ssl/certs

# Copy binaries from builder
COPY --from=builder /app/attendguard .
COPY --from=builder /app/migrate .

# Expose API port
EXPOSE 8080

# The server runs migrations automatically on startup.
# To run migrations manually inside the container:
#   docker exec attendguard_api ./migrate status
CMD ["./attendguard"]
