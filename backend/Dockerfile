# ========================
# STAGE 1: BUILD
# ========================
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/main.go


# ========================
# STAGE 2: RUN
# ========================
FROM alpine:3.19

WORKDIR /app

RUN apk update && apk add --no-cache ca-certificates tzdata

# ⬇️ INI YANG PENTING (ambil dari stage builder)
COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]