// cmd/migrate/main.go — Standalone database migration CLI
//
// Usage:
//   go run ./cmd/migrate up           Apply all pending migrations
//   go run ./cmd/migrate down         Roll back the last migration
//   go run ./cmd/migrate down 3       Roll back last 3 migrations
//   go run ./cmd/migrate status       Show migration status table
//   go run ./cmd/migrate version      Print current schema version number
//   go run ./cmd/migrate fresh        ⚠ Drop all + re-migrate (dev only)
//
// Reads DB config from environment / .env file (same as main server).
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"

	"attendance-system/config"
	"attendance-system/internal/migrate"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName,
	)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("❌ Cannot open DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Cannot connect to DB: %v\nCheck your .env or environment variables.", err)
	}
	log.Printf("✓ Connected to database: %s@%s/%s", cfg.DBUser, cfg.DBHost, cfg.DBName)

	m := migrate.New(db)
	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	switch cmd {
	// ── up ────────────────────────────────────────────────────────────────────
	case "up":
		log.Println("▶ Applying pending migrations...")
		if err := m.Up(); err != nil {
			log.Fatalf("❌ %v", err)
		}

	// ── down ──────────────────────────────────────────────────────────────────
	case "down":
		n := 1
		if len(os.Args) > 2 {
			if v, err := strconv.Atoi(os.Args[2]); err == nil && v > 0 {
				n = v
			}
		}
		log.Printf("▶ Rolling back %d migration(s)...", n)
		if err := m.Down(n); err != nil {
			log.Fatalf("❌ %v", err)
		}

	// ── status ────────────────────────────────────────────────────────────────
	case "status":
		migrations, err := m.Status()
		if err != nil {
			log.Fatalf("❌ %v", err)
		}
		fmt.Printf("\n  %-6s  %-42s  %-9s  %s\n", "VER", "NAME", "STATUS", "APPLIED AT")
		fmt.Printf("  %s\n", fill("─", 80))
		for _, mg := range migrations {
			status := "⏳ pending"
			appliedAt := ""
			if mg.IsApplied {
				status = "✅ applied"
				if mg.AppliedAt != nil {
					appliedAt = mg.AppliedAt.Format("2006-01-02 15:04:05 MST")
				}
			}
			fmt.Printf("  %-6d  %-42s  %-9s  %s\n", mg.Version, mg.Name, status, appliedAt)
		}
		pending := 0
		for _, mg := range migrations {
			if !mg.IsApplied {
				pending++
			}
		}
		fmt.Printf("\n  %d total, %d pending\n\n", len(migrations), pending)

	// ── version ───────────────────────────────────────────────────────────────
	case "version":
		migrations, err := m.Status()
		if err != nil {
			log.Fatalf("❌ %v", err)
		}
		current := 0
		for _, mg := range migrations {
			if mg.IsApplied && mg.Version > current {
				current = mg.Version
			}
		}
		fmt.Printf("Current schema version: %d\n", current)

	// ── fresh ─────────────────────────────────────────────────────────────────
	case "fresh":
		if os.Getenv("APP_ENV") == "production" {
			log.Fatal("❌ 'fresh' is not allowed in production (APP_ENV=production)")
		}
		fmt.Println()
		fmt.Println("  ⚠️  WARNING: This will DROP all tables and re-apply all migrations.")
		fmt.Println("  All data will be permanently lost.")
		fmt.Print("\n  Type 'yes' to confirm: ")
		var confirm string
		fmt.Scanln(&confirm)
		if confirm != "yes" {
			fmt.Println("  Cancelled.")
			return
		}
		log.Println("▶ Dropping all tables...")
		if err := dropAllTables(db); err != nil {
			log.Fatalf("❌ Drop failed: %v", err)
		}
		log.Println("▶ Applying all migrations...")
		if err := m.Up(); err != nil {
			log.Fatalf("❌ %v", err)
		}
		log.Println("✓ Fresh migration complete")

	// ── help ──────────────────────────────────────────────────────────────────
	default:
		fmt.Printf("\n  Unknown command: %q\n\n", cmd)
		printHelp()
		os.Exit(1)
	}
}

func dropAllTables(db *sql.DB) error {
	_, err := db.Exec(`
		DO $$ DECLARE r RECORD;
		BEGIN
			FOR r IN (
				SELECT tablename FROM pg_tables
				WHERE schemaname = 'public'
			) LOOP
				EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
			END LOOP;
		END $$;
	`)
	return err
}

func printHelp() {
	fmt.Println("  Usage: migrate <command> [args]")
	fmt.Println()
	fmt.Println("  Commands:")
	fmt.Println("    up           Apply all pending migrations")
	fmt.Println("    down [n]     Roll back n migrations (default: 1)")
	fmt.Println("    status       Show applied / pending status table")
	fmt.Println("    version      Print current schema version number")
	fmt.Println("    fresh        ⚠ Drop all tables + re-migrate (dev only)")
	fmt.Println()
	fmt.Println("  Environment variables (or .env file):")
	fmt.Println("    DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME")
	fmt.Println()
}

func fill(ch string, n int) string {
	s := ""
	for i := 0; i < n; i++ {
		s += ch
	}
	return s
}
