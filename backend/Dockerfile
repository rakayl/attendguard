# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

# Copy go.mod (and go.sum if it exists)
COPY go.mod ./
COPY go.sum* ./

# Generate go.sum and download deps in one step
# GONOSUMCHECK and GOFLAGS allow working without a pre-existing go.sum
RUN go mod tidy && go mod download

# Copy all source files
COPY . .

# Build main API server
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /app/attendguard \
    ./cmd/main.go

# Build standalone migrate CLI
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /app/migrate \
    ./cmd/migrate

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata wget

COPY --from=builder /app/attendguard .
COPY --from=builder /app/migrate .

EXPOSE 8080

# Server runs migrations automatically on startup.
# To run migrations manually:
#   docker exec attendguard_api ./migrate status
CMD ["./attendguard"]
