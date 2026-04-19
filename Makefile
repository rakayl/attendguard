.PHONY: all backend frontend docker-up docker-down migrate seed help

# ── Colors ──────────────────────────────────────────────────
CYAN=\033[0;36m
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-20s$(NC) %s\n", $$1, $$2}'

# ── Docker (recommended) ─────────────────────────────────────
docker-up: ## Start all services with Docker Compose
	@echo "$(GREEN)Starting AttendGuard...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ Frontend: http://localhost:3000$(NC)"
	@echo "$(GREEN)✓ API:      http://localhost:8080$(NC)"

docker-down: ## Stop all services
	docker compose down

docker-logs: ## Follow logs from all services
	docker compose logs -f

docker-rebuild: ## Rebuild and restart all services
	docker compose down
	docker compose build --no-cache
	docker compose up -d

# ── Backend (manual) ─────────────────────────────────────────
backend-deps: ## Install backend Go dependencies
	cd backend && go mod download && go mod tidy

backend-dev: ## Run backend in development mode (hot reload via air)
	@which air > /dev/null 2>&1 || go install github.com/air-verse/air@latest
	cd backend && air -c .air.toml

backend-run: ## Run backend directly
	cd backend && go run cmd/main.go

backend-build: ## Build backend binary
	cd backend && go build -ldflags="-s -w" -o attendguard ./cmd/main.go

backend-test: ## Run backend tests
	cd backend && go test ./... -v

# ── Frontend (manual) ─────────────────────────────────────────
frontend-deps: ## Install frontend npm dependencies
	cd frontend && npm install

frontend-dev: ## Run frontend development server
	cd frontend && npm run dev

frontend-build: ## Build frontend for production
	cd frontend && npm run build

# ── Database ──────────────────────────────────────────────────
db-start: ## Start only PostgreSQL
	docker compose up -d postgres

db-migrate: ## Run SQL migration manually
	@echo "$(YELLOW)Running migration...$(NC)"
	docker compose exec postgres psql -U postgres -d attendance_db -f /docker-entrypoint-initdb.d/init.sql

db-shell: ## Open psql shell
	docker compose exec postgres psql -U postgres -d attendance_db

db-reset: ## Drop and recreate database (DESTRUCTIVE)
	@echo "$(YELLOW)Resetting database...$(NC)"
	docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS attendance_db;"
	docker compose exec postgres psql -U postgres -c "CREATE DATABASE attendance_db;"

# ── Utilities ────────────────────────────────────────────────
postman: ## Copy Postman collection path
	@echo "Import: $(CYAN)$(PWD)/AttendGuard.postman_collection.json$(NC)"

env-setup: ## Copy .env.example files
	@cp backend/.env.example backend/.env 2>/dev/null && echo "$(GREEN)✓ backend/.env created$(NC)" || true
	@cp frontend/.env.example frontend/.env 2>/dev/null && echo "$(GREEN)✓ frontend/.env created$(NC)" || true
