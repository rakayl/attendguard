ALTER TABLE daily_activities
    ADD COLUMN IF NOT EXISTS template_color VARCHAR(24) NOT NULL DEFAULT 'cyan';

UPDATE daily_activities
SET template_color = 'cyan'
WHERE template_color IS NULL OR template_color = '';

ALTER TABLE daily_activities
    DROP CONSTRAINT IF EXISTS chk_daily_activity_template_color;

ALTER TABLE daily_activities
    ADD CONSTRAINT chk_daily_activity_template_color
    CHECK (template_color IN ('cyan', 'emerald', 'amber', 'rose', 'violet', 'slate'));
