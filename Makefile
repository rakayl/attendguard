.PHONY: help up down status version fresh build run dev db-shell db-reset env-setup

CYAN  = \033[36m
GREEN = \033[32m
YELLOW= \033[33m
RED   = \033[31m
NC    = \033[0m

help: ## Show available commands
	@printf "\n$(CYAN)AttendGuard — Makefile Commands$(NC)\n\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  $(CYAN)%-18s$(NC) %s\n",$$1,$$2}'
	@printf "\n"

# ── Docker (recommended) ─────────────────────────────────────────────────────
docker-up: ## Start all services (postgres + backend + frontend)
	@printf "$(GREEN)Starting AttendGuard...$(NC)\n"
	docker compose up -d
	@printf "$(GREEN)✓ Frontend → http://localhost:3000$(NC)\n"
	@printf "$(GREEN)✓ API      → http://localhost:8080$(NC)\n"
	@printf "$(GREEN)✓ Health   → http://localhost:8080/health$(NC)\n"

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## Tail logs from all containers
	docker compose logs -f

docker-rebuild: ## Rebuild images from scratch and restart
	docker compose down
	docker compose build --no-cache
	docker compose up -d

docker-backend: ## Rebuild only the backend container
	docker compose build backend
	docker compose up -d backend

# ── Database migrations (direct — no Docker needed) ──────────────────────────
migrate-up: ## Apply all pending migrations
	@printf "$(GREEN)▶ Applying migrations...$(NC)\n"
	cd backend && go run ./cmd/migrate up

migrate-down: ## Roll back 1 migration
	@printf "$(YELLOW)▶ Rolling back 1 migration...$(NC)\n"
	cd backend && go run ./cmd/migrate down

migrate-down-all: ## Roll back ALL migrations (destructive)
	@printf "$(RED)▶ Rolling back all migrations...$(NC)\n"
	cd backend && go run ./cmd/migrate down 99

migrate-status: ## Show migration status table
	cd backend && go run ./cmd/migrate status

migrate-version: ## Print current schema version
	cd backend && go run ./cmd/migrate version

migrate-fresh: ## ⚠ Drop all tables + re-migrate (DEV only)
	@printf "$(RED)⚠  This will DESTROY all data!$(NC)\n"
	cd backend && go run ./cmd/migrate fresh

# ── Backend ───────────────────────────────────────────────────────────────────
build: ## Build backend binary → backend/attendguard
	@printf "$(GREEN)▶ Building backend...$(NC)\n"
	cd backend && go build -ldflags="-s -w" -o attendguard ./cmd/main.go
	@printf "$(GREEN)✓ Binary: backend/attendguard$(NC)\n"

run: build ## Build + run backend binary
	./backend/attendguard

dev: ## Run backend with hot-reload (requires: go install github.com/air-verse/air@latest)
	@which air > /dev/null 2>&1 || (printf "$(YELLOW)Installing air...$(NC)\n" && go install github.com/air-verse/air@latest)
	cd backend && air -c .air.toml

deps: ## Download / tidy Go dependencies
	cd backend && go mod download && go mod tidy

# ── Frontend ──────────────────────────────────────────────────────────────────
frontend-install: ## Install npm dependencies
	cd frontend && npm install

frontend-dev: ## Start frontend dev server (http://localhost:5173)
	cd frontend && npm run dev

frontend-build: ## Build frontend for production
	cd frontend && npm run build

# ── Database utilities ────────────────────────────────────────────────────────
db-shell: ## Open psql shell inside Docker postgres container
	docker compose exec postgres psql -U $${DB_USER:-postgres} -d $${DB_NAME:-attendance_db}

db-reset: ## ⚠ Drop + recreate database inside Docker (DESTRUCTIVE)
	@printf "$(RED)⚠ Resetting database...$(NC)\n"
	docker compose exec postgres psql -U $${DB_USER:-postgres} -c \
		"DROP DATABASE IF EXISTS $${DB_NAME:-attendance_db};"
	docker compose exec postgres psql -U $${DB_USER:-postgres} -c \
		"CREATE DATABASE $${DB_NAME:-attendance_db};"

# ── Setup ─────────────────────────────────────────────────────────────────────
env-setup: ## Copy .env.example files → .env (first time setup)
	@cp -n .env.example .env 2>/dev/null && \
		printf "$(GREEN)✓ .env created (edit JWT_SECRET and DB_PASS!)$(NC)\n" || \
		printf "$(YELLOW)⚠ .env already exists, skipping$(NC)\n"
	@cp -n backend/.env.example backend/.env 2>/dev/null && \
		printf "$(GREEN)✓ backend/.env created$(NC)\n" || true
	@cp -n frontend/.env.example frontend/.env 2>/dev/null && \
		printf "$(GREEN)✓ frontend/.env created$(NC)\n" || true

postman: ## Print path to Postman collection
	@printf "Import: $(CYAN)$(PWD)/AttendGuard.postman_collection.json$(NC)\n"
