CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    manager VARCHAR(100),                    -- Manager's name; for a reference, use INTEGER and FK
    paymentRate NUMERIC(12, 2),
    address_line1 VARCHAR(255),              -- Street address
    address_line2 VARCHAR(255),              -- Apt, suite, unit, building, etc.
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100)
);