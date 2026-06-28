-- FUNCTION: public.get_sage_timesheet(date, date, text, text, text, uuid)

-- DROP FUNCTION IF EXISTS public.get_sage_timesheet(date, date, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.get_sage_timesheet(
	p_date_from date,
	p_date_to date,
	p_dept text,
	p_employee_id text,
	p_employee_type text,
	p_user_id uuid)
    RETURNS TABLE(empno text, emp_fullname text, company_code text, normal_hours double precision, overtime_hours double precision, public_holiday_hours double precision)
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    WITH base_timesheet AS (
        -- Pass through employee type
        SELECT *
        FROM public.get_timesheet(p_date_from, p_date_to, p_dept, p_employee_id, p_employee_type, p_user_id)
    ),
    public_holidays AS (
        SELECT ph.date::text
        FROM public_holidays ph
        WHERE ph.date BETWEEN p_date_from AND p_date_to
    ),
    classified_hours AS (
        SELECT
            bt.employee_id,
            bt.person,
            bt.company_code,
            bt.date::date AS work_date,
            ph.date IS NOT NULL AS is_public_holiday,
            GREATEST(bt.hours_worked - COALESCE(bt.break_hours, 0), 0) AS hours_worked
        FROM base_timesheet bt
        LEFT JOIN public_holidays ph ON bt.date = ph.date::text
        WHERE bt.status = 'Worked'
    ),
    per_day_alloc AS (
        SELECT
            ch.employee_id,
            ch.person,
            ch.company_code,
            CASE WHEN ch.is_public_holiday THEN 0
                 ELSE ch.hours_worked
            END AS normal_hours,
            0.0 AS overtime_hours, -- always zero for now
            CASE WHEN ch.is_public_holiday THEN ch.hours_worked
                 ELSE 0
            END AS public_holiday_hours
        FROM classified_hours ch
    ),
    sage_layout AS (
        SELECT
            per_day_alloc.employee_id,
            per_day_alloc.person,
            per_day_alloc.company_code,
            ROUND(SUM(per_day_alloc.normal_hours)::numeric, 2)::double precision AS normal_hours,
            0.0::double precision AS overtime_hours, -- remains always 0
            ROUND(SUM(per_day_alloc.public_holiday_hours)::numeric, 2)::double precision AS public_holiday_hours
        FROM per_day_alloc
        GROUP BY per_day_alloc.employee_id, per_day_alloc.person, per_day_alloc.company_code
    )
    SELECT
        sage_layout.employee_id AS empno,
        sage_layout.person AS emp_fullname,
        sage_layout.company_code,
        sage_layout.normal_hours,
        sage_layout.overtime_hours,
        sage_layout.public_holiday_hours
    FROM sage_layout
    ORDER BY sage_layout.employee_id;
END;
$BODY$;

ALTER FUNCTION public.get_sage_timesheet(date, date, text, text, text, uuid)
    OWNER TO postgres;
