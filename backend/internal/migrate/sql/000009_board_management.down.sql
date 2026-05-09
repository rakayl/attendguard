DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE name IN ('board:view', 'board:create', 'board:update', 'board:archive', 'board:comment')
);

DELETE FROM permissions
WHERE name IN ('board:view', 'board:create', 'board:update', 'board:archive', 'board:comment');

DROP TABLE IF EXISTS board_activities;
DROP TABLE IF EXISTS board_card_comments;
DROP TABLE IF EXISTS board_card_checklist_items;
DROP TABLE IF EXISTS board_card_checklists;
DROP TABLE IF EXISTS board_card_labels;
DROP TABLE IF EXISTS board_card_members;
DROP TABLE IF EXISTS board_cards;
DROP TABLE IF EXISTS board_lists;
DROP TABLE IF EXISTS board_members;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
