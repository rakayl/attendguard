ALTER TABLE daily_activities
    DROP CONSTRAINT IF EXISTS chk_daily_activity_template_color;

ALTER TABLE daily_activities
    DROP COLUMN IF EXISTS template_color;
