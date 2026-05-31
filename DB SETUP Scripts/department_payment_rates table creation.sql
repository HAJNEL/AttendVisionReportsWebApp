CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS department_payment_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id TEXT NOT NULL,
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('hourly', 'daily', 'monthly', 'overtime', 'custom')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    casual_match_key VARCHAR(20),
    applies_to VARCHAR(20) NOT NULL CHECK (applies_to IN ('standard', 'casual')),
    CONSTRAINT department_payment_rates_casual_key_required
        CHECK (
            (applies_to = 'casual' AND casual_match_key IS NOT NULL AND LENGTH(TRIM(casual_match_key)) > 0)
            OR
            (applies_to = 'standard' AND casual_match_key IS NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_department_payment_rates_rule
    ON department_payment_rates (
        department_id,
        applies_to,
        rate_type,
        COALESCE(casual_match_key, '')
    );

CREATE INDEX IF NOT EXISTS ix_department_payment_rates_department_id
    ON department_payment_rates (department_id);

