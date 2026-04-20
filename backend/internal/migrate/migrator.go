// Package migrate provides a versioned, embedded SQL migration engine.
//
// SQL files are embedded at compile time from the ./sql directory.
// Each migration is a pair of files:
//
//	000001_description.up.sql    — forward migration
//	000001_description.down.sql  — rollback migration
//
// The schema_migrations table in PostgreSQL tracks applied versions.
package migrate

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Embed all SQL files under ./sql at compile time.
//
//go:embed sql/*.sql
var migrationsFS embed.FS

// Migration holds metadata for a single versioned migration.
type Migration struct {
	Version   int
	Name      string
	UpSQL     string
	DownSQL   string
	IsApplied bool
	AppliedAt *time.Time
}

// Migrator manages database migrations against a *sql.DB.
type Migrator struct {
	db *sql.DB
}

// New returns a Migrator backed by the given *sql.DB.
func New(db *sql.DB) *Migrator {
	return &Migrator{db: db}
}

// ── schema_migrations table ───────────────────────────────────────────────────

func (m *Migrator) ensureTable() error {
	_, err := m.db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    INTEGER      NOT NULL PRIMARY KEY,
			name       VARCHAR(255) NOT NULL,
			applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func (m *Migrator) appliedVersions() (map[int]time.Time, error) {
	rows, err := m.db.Query(`SELECT version, applied_at FROM schema_migrations ORDER BY version`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int]time.Time)
	for rows.Next() {
		var v int
		var t time.Time
		if err := rows.Scan(&v, &t); err != nil {
			return nil, err
		}
		result[v] = t
	}
	return result, rows.Err()
}

// ── SQL file loading ──────────────────────────────────────────────────────────

var fileRegex = regexp.MustCompile(`^(\d+)_(.+)\.(up|down)\.sql$`)

func (m *Migrator) load() ([]Migration, error) {
	entries, err := fs.ReadDir(migrationsFS, "sql")
	if err != nil {
		return nil, fmt.Errorf("reading embedded sql dir: %w", err)
	}

	type pair struct {
		name string
		up   string
		down string
	}
	byVer := make(map[int]*pair)

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		base := filepath.Base(e.Name())
		m := fileRegex.FindStringSubmatch(base)
		if m == nil {
			continue
		}
		ver, _ := strconv.Atoi(m[1])
		name, dir := m[2], m[3]

		content, err := migrationsFS.ReadFile("sql/" + base)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", base, err)
		}

		if byVer[ver] == nil {
			byVer[ver] = &pair{name: name}
		}
		switch dir {
		case "up":
			byVer[ver].up = string(content)
		case "down":
			byVer[ver].down = string(content)
		}
	}

	out := make([]Migration, 0, len(byVer))
	for ver, p := range byVer {
		out = append(out, Migration{Version: ver, Name: p.name, UpSQL: p.up, DownSQL: p.down})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Version < out[j].Version })
	return out, nil
}

// ── Public API ────────────────────────────────────────────────────────────────

// Up applies every pending migration in ascending version order.
// Already-applied migrations are skipped (idempotent).
func (m *Migrator) Up() error {
	if err := m.ensureTable(); err != nil {
		return fmt.Errorf("schema_migrations table: %w", err)
	}

	migrations, err := m.load()
	if err != nil {
		return err
	}

	applied, err := m.appliedVersions()
	if err != nil {
		return fmt.Errorf("reading applied versions: %w", err)
	}

	pending := 0
	for _, mg := range migrations {
		if _, ok := applied[mg.Version]; ok {
			log.Printf("  ✓ skip  v%04d_%s (already applied)", mg.Version, mg.Name)
			continue
		}
		if strings.TrimSpace(mg.UpSQL) == "" {
			log.Printf("  ⚠ skip  v%04d_%s (empty up.sql)", mg.Version, mg.Name)
			continue
		}

		log.Printf("  ↑ apply v%04d_%s ...", mg.Version, mg.Name)
		if err := m.execTx(mg.UpSQL); err != nil {
			return fmt.Errorf("v%04d_%s: %w", mg.Version, mg.Name, err)
		}
		if _, err := m.db.Exec(
			`INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
			mg.Version, mg.Name,
		); err != nil {
			return fmt.Errorf("recording v%04d: %w", mg.Version, err)
		}
		log.Printf("  ✓ done  v%04d_%s", mg.Version, mg.Name)
		pending++
	}

	if pending == 0 {
		log.Println("  ✓ schema is up to date — no migrations to apply")
	} else {
		log.Printf("  ✓ applied %d migration(s) successfully", pending)
	}
	return nil
}

// Down rolls back the last n applied migrations (default n=1).
func (m *Migrator) Down(n int) error {
	if n <= 0 {
		n = 1
	}
	if err := m.ensureTable(); err != nil {
		return err
	}

	migrations, err := m.load()
	if err != nil {
		return err
	}

	applied, err := m.appliedVersions()
	if err != nil {
		return err
	}

	// Process in reverse
	for i, j := 0, len(migrations)-1; i < j; i, j = i+1, j-1 {
		migrations[i], migrations[j] = migrations[j], migrations[i]
	}

	rolled := 0
	for _, mg := range migrations {
		if rolled >= n {
			break
		}
		if _, ok := applied[mg.Version]; !ok {
			continue
		}
		if strings.TrimSpace(mg.DownSQL) == "" {
			log.Printf("  ⚠ skip rollback v%04d_%s (no down.sql)", mg.Version, mg.Name)
			continue
		}

		log.Printf("  ↓ rollback v%04d_%s ...", mg.Version, mg.Name)
		if err := m.execTx(mg.DownSQL); err != nil {
			return fmt.Errorf("rollback v%04d_%s: %w", mg.Version, mg.Name, err)
		}
		if _, err := m.db.Exec(`DELETE FROM schema_migrations WHERE version = $1`, mg.Version); err != nil {
			return fmt.Errorf("removing record v%04d: %w", mg.Version, err)
		}
		log.Printf("  ✓ rolled back v%04d_%s", mg.Version, mg.Name)
		rolled++
	}
	return nil
}

// Status returns all migrations annotated with their applied state.
func (m *Migrator) Status() ([]Migration, error) {
	if err := m.ensureTable(); err != nil {
		return nil, err
	}

	migrations, err := m.load()
	if err != nil {
		return nil, err
	}

	applied, err := m.appliedVersions()
	if err != nil {
		return nil, err
	}

	for i := range migrations {
		if t, ok := applied[migrations[i].Version]; ok {
			migrations[i].IsApplied = true
			cp := t
			migrations[i].AppliedAt = &cp
		}
	}
	return migrations, nil
}

// ── Transaction helper ────────────────────────────────────────────────────────

// execTx runs a multi-statement SQL block inside a single transaction.
// Statements are split on semicolons; blank / comment-only statements skipped.
func (m *Migrator) execTx(block string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	for _, stmt := range strings.Split(block, ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || isComment(stmt) {
			continue
		}
		if _, err = tx.Exec(stmt); err != nil {
			return fmt.Errorf("%w\n→ SQL: %s", err, clip(stmt, 300))
		}
	}
	return tx.Commit()
}

func isComment(s string) bool {
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "--") {
			continue
		}
		return false
	}
	return true
}

func clip(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
