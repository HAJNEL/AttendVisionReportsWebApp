CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Per-company time management / auto-fix rule configuration.
CREATE TABLE IF NOT EXISTS time_management_config (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                UUID NOT NULL,

    -- Detection rule toggles
    detect_missing_check_in   BOOLEAN NOT NULL DEFAULT TRUE,
    detect_missing_check_out  BOOLEAN NOT NULL DEFAULT TRUE,
    detect_missing_break      BOOLEAN NOT NULL DEFAULT TRUE,
    detect_duplicates         BOOLEAN NOT NULL DEFAULT TRUE,
    enable_double_shift       BOOLEAN NOT NULL DEFAULT TRUE,

    -- Auto-fix parameters
    workday_hours             NUMERIC(4, 2) NOT NULL DEFAULT 8   CHECK (workday_hours > 0 AND workday_hours <= 24),
    double_shift_hours        NUMERIC(4, 2) NOT NULL DEFAULT 16  CHECK (double_shift_hours > 0 AND double_shift_hours <= 24),
    break_default_minutes     INTEGER NOT NULL DEFAULT 30        CHECK (break_default_minutes >= 0 AND break_default_minutes <= 1440),
    check_in_offset_minutes   INTEGER NOT NULL DEFAULT 8         CHECK (check_in_offset_minutes >= 0 AND check_in_offset_minutes <= 1440),
    check_out_offset_minutes  INTEGER NOT NULL DEFAULT 8         CHECK (check_out_offset_minutes >= 0 AND check_out_offset_minutes <= 1440),

    duplicate_keep_strategy   VARCHAR(40) NOT NULL DEFAULT 'remove_failed_then_second'
        CHECK (duplicate_keep_strategy IN ('remove_failed_then_second', 'always_second')),

    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_time_management_config_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

-- One config row per company.
CREATE UNIQUE INDEX IF NOT EXISTS ux_time_management_config_company
    ON time_management_config (company_id);
