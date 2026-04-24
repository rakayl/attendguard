# ── Build stage ─────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

# FIX: proxy biar gak EOF
ENV GOPROXY=https://goproxy.io,direct

COPY go.mod ./
COPY go.sum* ./

RUN go mod tidy || true
RUN go mod download

COPY . .

# Build API
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /app/attendguard \
    ./cmd/main.go

# Build migrate CLI
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /app/migrate \
    ./cmd/migrate


# ── Runtime stage ───────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata wget

COPY --from=builder /app/attendguard .
COPY --from=builder /app/migrate .

EXPOSE 8080

CMD ["./attendguard"]