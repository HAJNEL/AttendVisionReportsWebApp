-- Table: public.access_records

-- DROP TABLE IF EXISTS public.access_records;

CREATE TABLE IF NOT EXISTS public.access_records
(
    id integer NOT NULL DEFAULT nextval('access_records_id_seq'::regclass),
    employee_id character varying(100) COLLATE pg_catalog."default",
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    person_name character varying(200) COLLATE pg_catalog."default",
    department character varying(150) COLLATE pg_catalog."default",
    card_number character varying(50) COLLATE pg_catalog."default",
    access_datetime timestamp with time zone,
    access_date date,
    access_time time without time zone,
    authentication_result character varying(20) COLLATE pg_catalog."default",
    authentication_type character varying(50) COLLATE pg_catalog."default",
    succeeded boolean,
    failed boolean,
    device_name character varying(150) COLLATE pg_catalog."default",
    device_serial_no character varying(100) COLLATE pg_catalog."default",
    resource_name character varying(150) COLLATE pg_catalog."default",
    reader_name character varying(100) COLLATE pg_catalog."default",
    direction character varying(20) COLLATE pg_catalog."default",
    direction_enter boolean DEFAULT false,
    direction_exit boolean DEFAULT false,
    attendance_status character varying(50) COLLATE pg_catalog."default",
    check_in boolean DEFAULT false,
    check_out boolean DEFAULT false,
    break_out boolean DEFAULT false,
    break_in boolean DEFAULT false,
    overtime_in boolean DEFAULT false,
    overtime_out boolean DEFAULT false,
    CONSTRAINT access_records_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.access_records
    OWNER to postgres;

REVOKE ALL ON TABLE public.access_records FROM hikcentral_user;

GRANT INSERT, SELECT ON TABLE public.access_records TO hikcentral_user;

GRANT ALL ON TABLE public.access_records TO postgres;
-- Index: idx_access_records_access_datetime

-- DROP INDEX IF EXISTS public.idx_access_records_access_datetime;

CREATE INDEX IF NOT EXISTS idx_access_records_access_datetime
    ON public.access_records USING btree
    (access_datetime DESC NULLS FIRST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_access_records_device_name

-- DROP INDEX IF EXISTS public.idx_access_records_device_name;

CREATE INDEX IF NOT EXISTS idx_access_records_device_name
    ON public.access_records USING btree
    (device_name COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_access_records_employee_id

-- DROP INDEX IF EXISTS public.idx_access_records_employee_id;

CREATE INDEX IF NOT EXISTS idx_access_records_employee_id
    ON public.access_records USING btree
    (employee_id COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;