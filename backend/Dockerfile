# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git (needed for some go mod downloads)
RUN apk add --no-cache git

# Download dependencies first (layer cache)
COPY go.mod go.sum* ./
RUN go mod download

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

# ca-certificates for HTTPS, tzdata for timezone support
RUN apk add --no-cache ca-certificates tzdata

# Copy binaries from builder
COPY --from=builder /app/attendguard .
COPY --from=builder /app/migrate .

# Expose API port
EXPOSE 8080

# The server runs migrations automatically on startup.
# To run migrations manually inside the container:
#   docker exec attendguard_api ./migrate status
CMD ["./attendguard"]
