CREATE TABLE IF NOT EXISTS workspaces (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL UNIQUE,
    description TEXT,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_workspace_member_role CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS boards (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    theme VARCHAR(40) NOT NULL DEFAULT 'ocean',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_board_visibility CHECK (visibility IN ('private', 'public'))
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON boards(workspace_id);

CREATE TABLE IF NOT EXISTS board_members (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_board_member_role CHECK (role IN ('owner', 'editor', 'member', 'viewer')),
    CONSTRAINT uq_board_member UNIQUE (board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

CREATE TABLE IF NOT EXISTS board_lists (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_lists_board_id ON board_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_board_lists_board_position ON board_lists(board_id, position);

CREATE TABLE IF NOT EXISTS board_cards (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    list_id BIGINT NOT NULL REFERENCES board_lists(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    markdown_description TEXT,
    cover_image TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    position INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_board_card_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_board_cards_board_id ON board_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_list_position ON board_cards(list_id, position);

CREATE TABLE IF NOT EXISTS board_card_members (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_board_card_member UNIQUE (card_id, user_id)
);

CREATE TABLE IF NOT EXISTS board_card_labels (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#06b6d4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_card_labels_card_id ON board_card_labels(card_id);

CREATE TABLE IF NOT EXISTS board_card_checklists (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_card_checklists_card_id ON board_card_checklists(card_id);

CREATE TABLE IF NOT EXISTS board_card_checklist_items (
    id BIGSERIAL PRIMARY KEY,
    checklist_id BIGINT NOT NULL REFERENCES board_card_checklists(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_card_checklist_items_checklist_id ON board_card_checklist_items(checklist_id);

CREATE TABLE IF NOT EXISTS board_card_comments (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_card_comments_card_id ON board_card_comments(card_id, created_at DESC);

CREATE TABLE IF NOT EXISTS board_activities (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    board_id BIGINT REFERENCES boards(id) ON DELETE CASCADE,
    list_id BIGINT REFERENCES board_lists(id) ON DELETE CASCADE,
    card_id BIGINT REFERENCES board_cards(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_activities_board_id ON board_activities(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_activities_card_id ON board_activities(card_id, created_at DESC);

INSERT INTO permissions (name, display_name, module, description) VALUES
    ('board:view', 'View Boards', 'board', 'View workspaces, boards, lists, and cards'),
    ('board:create', 'Create Boards', 'board', 'Create workspaces and boards'),
    ('board:update', 'Update Boards', 'board', 'Manage boards, lists, cards, and memberships'),
    ('board:archive', 'Archive Boards', 'board', 'Archive boards, lists, and cards'),
    ('board:comment', 'Comment on Cards', 'board', 'Create and manage card comments')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('board:view', 'board:create', 'board:update', 'board:archive', 'board:comment')
WHERE r.name IN ('admin', 'manager', 'hr', 'employee')
ON CONFLICT DO NOTHING;
