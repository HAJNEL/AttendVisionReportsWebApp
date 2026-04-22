use sqlx::{postgres::PgPoolOptions, PgPool, Row};

#[derive(Debug)]
pub struct DashboardKpis {
    pub total_employees: i64,
    pub checkins_today: i64,
    pub on_site_now: i64,
    pub on_break_now: i64,
}

#[derive(Debug)]
pub struct LabeledCount {
    pub label: String,
    pub count: i64,
}

#[derive(Debug)]
pub struct DayAccessRow {
    pub label: String,
    pub count: i64,
    pub names: String,
}

#[derive(Debug)]
pub struct Department {
    pub id: i32,
    pub department_name: String,
    pub manager: Option<String>,
    pub paymentRate: Option<f64>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
}

fn map_department(r: &sqlx::postgres::PgRow) -> Department {
    use sqlx::Row;
    Department {
        id: r.get::<i32, _>("id"),
        department_name: r.get::<String, _>("department_name"),
        manager: r.get::<Option<String>, _>("manager"),
        paymentRate: r.get::<Option<f64>, _>("paymentRate"),
        address_line1: r.get::<Option<String>, _>("address_line1"),
        address_line2: r.get::<Option<String>, _>("address_line2"),
        city: r.get::<Option<String>, _>("city"),
        state: r.get::<Option<String>, _>("state"),
        postal_code: r.get::<Option<String>, _>("postal_code"),
        country: r.get::<Option<String>, _>("country"),
    }
}

pub struct DepartmentInput {
    pub department_name: String,
    pub manager: Option<String>,
    pub paymentRate: Option<f64>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
}

const DEPT_SELECT: &str =
    "SELECT id, department_name, manager, paymentRate::float8 AS paymentRate, \
     address_line1, address_line2, city, state, postal_code, country";

pub async fn get_departments(pool: &PgPool) -> Result<Vec<Department>, sqlx::Error> {
    let rows = sqlx::query(&format!("{} FROM departments ORDER BY department_name", DEPT_SELECT))
        .fetch_all(pool)
        .await?;
    Ok(rows.iter().map(map_department).collect())
}

pub async fn create_department(pool: &PgPool, inp: &DepartmentInput) -> Result<Department, sqlx::Error> {
    let row = sqlx::query(&format!(
        "INSERT INTO departments \
         (department_name, manager, paymentRate, address_line1, address_line2, city, state, postal_code, country) \
         VALUES ($1, $2, $3::numeric, $4, $5, $6, $7, $8, $9) \
         RETURNING id, department_name, manager, paymentRate::float8 AS paymentRate, \
         address_line1, address_line2, city, state, postal_code, country",
    ))
    .bind(&inp.department_name)
    .bind(&inp.manager)
    .bind(inp.paymentRate)
    .bind(&inp.address_line1)
    .bind(&inp.address_line2)
    .bind(&inp.city)
    .bind(&inp.state)
    .bind(&inp.postal_code)
    .bind(&inp.country)
    .fetch_one(pool)
    .await?;
    Ok(map_department(&row))
}

pub async fn update_department(pool: &PgPool, id: i32, inp: &DepartmentInput) -> Result<Department, sqlx::Error> {
    let row = sqlx::query(
        "UPDATE departments SET \
         department_name=$1, manager=$2, paymentRate=$3::numeric, address_line1=$4, \
         address_line2=$5, city=$6, state=$7, postal_code=$8, country=$9 \
         WHERE id=$10 \
         RETURNING id, department_name, manager, paymentRate::float8 AS paymentRate, \
         address_line1, address_line2, city, state, postal_code, country",
    )
    .bind(&inp.department_name)
    .bind(&inp.manager)
    .bind(inp.paymentRate)
    .bind(&inp.address_line1)
    .bind(&inp.address_line2)
    .bind(&inp.city)
    .bind(&inp.state)
    .bind(&inp.postal_code)
    .bind(&inp.country)
    .bind(id)
    .fetch_one(pool)
    .await?;
    Ok(map_department(&row))
}

pub async fn delete_department(pool: &PgPool, id: i32) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM departments WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

#[derive(sqlx::FromRow)]
pub struct UserRow {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub is_active: bool,
    pub is_admin: bool,
}

pub async fn create_pool(url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(url)
        .await
}

pub async fn find_user_by_username(
    pool: &PgPool,
    username: &str,
) -> Result<Option<UserRow>, sqlx::Error> {
    sqlx::query_as::<_, UserRow>(
        "SELECT id, username, email, password_hash, full_name, is_active, is_admin \
         FROM users WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(pool)
    .await
}

pub async fn update_last_login(pool: &PgPool, id: i32) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET last_login_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn users_exist(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?;
    Ok(row.0 > 0)
}

pub async fn create_user(
    pool: &PgPool,
    username: &str,
    email: &str,
    password_hash: &str,
    full_name: Option<&str>,
    is_admin: bool,
) -> Result<UserRow, sqlx::Error> {
    sqlx::query_as::<_, UserRow>(
        "INSERT INTO users (username, email, password_hash, full_name, is_active, is_admin) \
         VALUES ($1, $2, $3, $4, TRUE, $5) \
         RETURNING id, username, email, password_hash, full_name, is_active, is_admin",
    )
    .bind(username)
    .bind(email)
    .bind(password_hash)
    .bind(full_name)
    .bind(is_admin)
    .fetch_one(pool)
    .await
}

pub async fn get_dashboard_kpis(pool: &PgPool, dept: Option<&str>, date_from: &str, date_to: &str) -> Result<DashboardKpis, sqlx::Error> {
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT employee_id) FROM access_records \
         WHERE employee_id IS NOT NULL \
         AND access_date BETWEEN $1::date AND LEAST($2::date, CURRENT_DATE) \
         AND ($3::text IS NULL OR department = $3)",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .fetch_one(pool)
    .await?;

    let checkins: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT employee_id) FROM access_records \
         WHERE access_date BETWEEN $1::date AND LEAST($2::date, CURRENT_DATE) \
         AND attendance_status = 'check_in' AND employee_id IS NOT NULL \
         AND ($3::text IS NULL OR department = $3)",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .fetch_one(pool)
    .await?;

    let on_site: (i64,) = sqlx::query_as(
        "WITH per_employee AS ( \
           SELECT employee_id, \
             MAX(CASE WHEN attendance_status = 'check_in'  THEN 1 ELSE 0 END) AS has_checkin, \
             MAX(CASE WHEN attendance_status = 'check_out' THEN 1 ELSE 0 END) AS has_checkout \
           FROM access_records \
           WHERE access_date = LEAST($2::date, CURRENT_DATE) \
             AND employee_id IS NOT NULL \
             AND ($3::text IS NULL OR department = $3) \
           GROUP BY employee_id \
         ) \
         SELECT COUNT(*) FROM per_employee \
         WHERE has_checkin = 1 AND has_checkout = 0",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .fetch_one(pool)
    .await?;

    let failed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM access_records \
         WHERE access_date BETWEEN $1::date AND LEAST($2::date, CURRENT_DATE) \
         AND attendance_status = '' \
         AND ($3::text IS NULL OR department = $3)",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .fetch_one(pool)
    .await?;

    Ok(DashboardKpis {
        total_employees: total.0,
        checkins_today: checkins.0,
        on_site_now: on_site.0,
        on_break_now: on_break.0,
    })
}

pub async fn get_hourly_traffic(pool: &PgPool, date: &str, dept: Option<&str>) -> Result<Vec<DayAccessRow>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT TO_CHAR(date_trunc('minute', access_time), 'HH24:MI') AS label, \
                COUNT(*)::bigint AS count, \
                STRING_AGG(COALESCE(NULLIF(TRIM(person_name), ''), employee_id, 'Unknown'), ', ' ORDER BY access_time) AS names \
         FROM access_records \
         WHERE access_date = $1::date \
         AND ($2::text IS NULL OR department = $2) \
         GROUP BY date_trunc('minute', access_time) \
         ORDER BY date_trunc('minute', access_time)",
    )
    .bind(date)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    let result = rows
        .iter()
        .map(|r| DayAccessRow {
            label: r.get::<String, _>("label"),
            count: r.get::<i64, _>("count"),
            names: r.get::<String, _>("names"),
        })
        .collect();
    Ok(result)
}

pub async fn get_monthly_attendance(pool: &PgPool, dept: Option<&str>) -> Result<Vec<LabeledCount>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT access_date::text AS label, COUNT(DISTINCT employee_id)::bigint AS count \
         FROM access_records \
         WHERE access_date >= date_trunc('month', CURRENT_DATE)::date \
           AND employee_id IS NOT NULL \
           AND ($1::text IS NULL OR department = $1) \
         GROUP BY access_date ORDER BY access_date",
    )
    .bind(dept)
    .fetch_all(pool)
    .await?;

    let result: Vec<LabeledCount> = rows
        .iter()
        .map(|r| LabeledCount {
            label: r.get::<String, _>("label"),
            count: r.get::<i64, _>("count"),
        })
        .collect();
    Ok(result)
}

pub async fn get_dept_breakdown(pool: &PgPool, dept: Option<&str>) -> Result<Vec<LabeledCount>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT COALESCE(department, 'Unknown') AS label, COUNT(DISTINCT employee_id)::bigint AS count \
         FROM access_records \
         WHERE access_date = CURRENT_DATE AND check_in = true \
         AND ($1::text IS NULL OR department = $1) \
         GROUP BY department ORDER BY count DESC LIMIT 10",
    )
    .bind(dept)
    .fetch_all(pool)
    .await?;

    let result = rows
        .iter()
        .map(|r| LabeledCount {
            label: r.get::<String, _>("label"),
            count: r.get::<i64, _>("count"),
        })
        .collect();
    Ok(result)
}

/// Total access events per day for a given year+month
pub async fn get_monthly_traffic(pool: &PgPool, year: i32, month: i32, dept: Option<&str>) -> Result<Vec<LabeledCount>, sqlx::Error> {
    let date_start = format!("{}-{:02}-01", year, month);
    let rows = sqlx::query(
        "SELECT access_date::text AS label, COUNT(*)::bigint AS count \
         FROM access_records \
         WHERE access_date >= $1::date AND access_date < ($1::date + INTERVAL '1 month') \
         AND ($2::text IS NULL OR department = $2) \
         GROUP BY access_date ORDER BY access_date",
    )
    .bind(&date_start)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    let result: Vec<LabeledCount> = rows
        .iter()
        .map(|r| LabeledCount {
            label: r.get::<String, _>("label"),
            count: r.get::<i64, _>("count"),
        })
        .collect();
    Ok(result)
}

/// Total access events per month for a given year
pub async fn get_yearly_traffic(pool: &PgPool, year: i32, dept: Option<&str>) -> Result<Vec<LabeledCount>, sqlx::Error> {
    let date_start = format!("{}-01-01", year);
    let rows = sqlx::query(
        "SELECT TO_CHAR(access_date, 'YYYY-MM') AS label, COUNT(*)::bigint AS count \
         FROM access_records \
         WHERE access_date >= $1::date AND access_date < ($1::date + INTERVAL '1 year') \
         AND ($2::text IS NULL OR department = $2) \
         GROUP BY label ORDER BY label",
    )
    .bind(&date_start)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    let result: Vec<LabeledCount> = rows
        .iter()
        .map(|r| LabeledCount {
            label: r.get::<String, _>("label"),
            count: r.get::<i64, _>("count"),
        })
        .collect();
    Ok(result)
}

// ─── Day events by status (15-min buckets) ───────────────────────────────────

#[derive(Debug)]
pub struct DayEventRow {
    pub label: String,
    pub status: String,
    pub count: i64,
    pub names: String,
}

pub async fn get_day_events_by_status(
    pool: &PgPool,
    date: &str,
    dept: Option<&str>,
) -> Result<Vec<DayEventRow>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT \
           TO_CHAR( \
             date_trunc('hour', access_time) + \
             (EXTRACT(MINUTE FROM access_time)::int / 15) * INTERVAL '15 minutes', \
             'HH24:MI' \
           ) AS label, \
           COALESCE(attendance_status, 'unknown') AS status, \
           COUNT(*)::bigint AS count, \
           STRING_AGG( \
             COALESCE(NULLIF(TRIM(person_name), ''), employee_id, 'Unknown'), \
             ', ' \
             ORDER BY access_time \
           ) AS names \
         FROM access_records \
         WHERE access_date = $1::date \
           AND ($2::text IS NULL OR department = $2) \
         GROUP BY 1, 2 \
         ORDER BY 1, 2",
    )
    .bind(date)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| DayEventRow {
            label: r.get::<String, _>("label"),
            status: r.get::<String, _>("status"),
            count: r.get::<i64, _>("count"),
            names: r.get::<String, _>("names"),
        })
        .collect())
}

// ─── Day people summary ───────────────────────────────────────────────────────

#[derive(Debug)]
pub struct DayPersonRow {
    pub person: String,
    pub department: String,
    pub event_count: i64,
    pub first_time: String,
    pub last_time: String,
    pub last_status: String,
    pub hours_worked: f64,
}

pub async fn get_day_people(
    pool: &PgPool,
    date: &str,
    dept: Option<&str>,
) -> Result<Vec<DayPersonRow>, sqlx::Error> {
    let rows = sqlx::query(
        "WITH all_records AS ( \
           SELECT \
             COALESCE(NULLIF(TRIM(person_name), ''), employee_id, 'Unknown') AS person, \
             COALESCE(department, 'Unknown') AS department, \
             access_datetime, \
             access_time, \
             attendance_status \
           FROM access_records \
           WHERE access_date = $1::date \
             AND ($2::text IS NULL OR department = $2) \
         ), \
         deduped AS ( \
           SELECT *, \
             LAG(attendance_status) OVER ( \
               PARTITION BY person \
               ORDER BY access_datetime \
             ) AS prev_status \
           FROM all_records \
         ), \
         first_breaks AS ( \
           SELECT person, access_datetime \
           FROM deduped \
           WHERE attendance_status = 'break_out' \
             AND (prev_status IS NULL OR prev_status != 'break_out') \
         ), \
         break_durations AS ( \
           SELECT \
             fb.person, \
             fb.access_datetime AS break_start, \
             ( \
               SELECT MIN(ar.access_datetime) \
               FROM all_records ar \
               WHERE ar.person = fb.person \
                 AND ar.attendance_status = 'break_in' \
                 AND ar.access_datetime > fb.access_datetime \
             ) AS break_end \
           FROM first_breaks fb \
         ), \
         break_totals AS ( \
           SELECT \
             person, \
             COALESCE(SUM( \
               CASE WHEN break_end IS NOT NULL \
                 THEN EXTRACT(EPOCH FROM (break_end - break_start)) / 3600.0 \
                 ELSE 0 \
               END \
             ), 0)::float8 AS break_hours \
           FROM break_durations \
           GROUP BY person \
         ), \
         day_summary AS ( \
           SELECT \
             person, department, \
             COUNT(*)::bigint AS event_count, \
             COALESCE(MIN(TO_CHAR(access_time, 'HH24:MI')), '')::text AS first_time, \
             COALESCE(MAX(TO_CHAR(access_time, 'HH24:MI')), '')::text AS last_time, \
             (ARRAY_AGG(COALESCE(attendance_status, 'unknown') ORDER BY access_datetime DESC))[1] AS last_status, \
             COALESCE( \
               EXTRACT(EPOCH FROM ( \
                 MAX(CASE WHEN attendance_status = 'check_out' THEN access_datetime END) - \
                 MIN(CASE WHEN attendance_status = 'check_in'  THEN access_datetime END) \
               )) / 3600.0, \
             0)::float8 AS gross_hours \
           FROM all_records \
           GROUP BY person, department \
         ) \
         SELECT \
           ds.person, ds.department, ds.event_count, \
           ds.first_time, ds.last_time, ds.last_status, \
           GREATEST(ds.gross_hours - COALESCE(bt.break_hours, 0), 0)::float8 AS hours_worked \
         FROM day_summary ds \
         LEFT JOIN break_totals bt ON ds.person = bt.person \
         ORDER BY ds.event_count DESC, ds.person",
    )
    .bind(date)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| DayPersonRow {
            person: r.get::<String, _>("person"),
            department: r.get::<String, _>("department"),
            event_count: r.get::<i64, _>("event_count"),
            first_time: r.get::<String, _>("first_time"),
            last_time: r.get::<String, _>("last_time"),
            last_status: r.get::<String, _>("last_status"),
            hours_worked: r.get::<f64, _>("hours_worked"),
        })
        .collect())
}

// ─── Issues ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct IssueRow {
    pub date: String,
    pub time_of: String,
    pub person: String,
    pub employee_id: String,
    pub department: String,
    pub issue_type: String,
}

pub async fn get_issues(
    pool: &PgPool,
    date_from: &str,
    date_to: &str,
    dept: Option<&str>,
) -> Result<Vec<IssueRow>, sqlx::Error> {
    let rows = sqlx::query(
        "WITH base AS ( \
           SELECT \
             COALESCE(NULLIF(TRIM(person_name), ''), employee_id, 'Unknown') AS person, \
             COALESCE(employee_id, '')::text AS employee_id, \
             COALESCE(department, 'Unknown') AS department, \
             access_datetime, \
             access_date, \
             attendance_status, \
             COALESCE(failed, false) AS is_failed \
           FROM access_records \
           WHERE access_date BETWEEN $1::date AND $2::date \
             AND ($3::text IS NULL OR department = $3) \
         ), \
         failed_issues AS ( \
           SELECT \
             access_date::text AS date, \
             TO_CHAR(access_datetime, 'HH24:MI')::text AS time_of, \
             person, employee_id, department, \
             'failed_attempt'::text AS issue_type \
           FROM base \
           WHERE is_failed = true \
         ), \
         normal_records AS ( \
           SELECT * FROM base WHERE is_failed = false \
         ), \
         no_checkout AS ( \
           SELECT \
             access_date::text AS date, \
             MIN(TO_CHAR(access_datetime, 'HH24:MI'))::text AS time_of, \
             person, employee_id, department, \
             'no_checkout'::text AS issue_type \
           FROM normal_records \
           GROUP BY person, employee_id, department, access_date \
           HAVING \
             MAX(CASE WHEN attendance_status = 'check_in'  THEN 1 ELSE 0 END) = 1 \
             AND MAX(CASE WHEN attendance_status = 'check_out' THEN 1 ELSE 0 END) = 0 \
         ), \
         break_events AS ( \
           SELECT person, employee_id, department, access_date, access_datetime, attendance_status, \
             LEAD(attendance_status) OVER ( \
               PARTITION BY person, access_date ORDER BY access_datetime \
             ) AS next_status \
           FROM normal_records \
           WHERE attendance_status IN ('break_out', 'break_in') \
         ), \
         unmatched_break AS ( \
           SELECT \
             access_date::text AS date, \
             TO_CHAR(access_datetime, 'HH24:MI')::text AS time_of, \
             person, employee_id, department, \
             'unmatched_break'::text AS issue_type \
           FROM break_events \
           WHERE attendance_status = 'break_out' \
             AND (next_status IS NULL OR next_status != 'break_in') \
         ) \
         SELECT date, time_of, person, employee_id, department, issue_type \
         FROM ( \
           SELECT * FROM failed_issues \
           UNION ALL SELECT * FROM no_checkout \
           UNION ALL SELECT * FROM unmatched_break \
         ) combined \
         ORDER BY date, time_of NULLS LAST, issue_type, person",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| IssueRow {
            date:        r.get::<String, _>("date"),
            time_of:     r.get::<String, _>("time_of"),
            person:      r.get::<String, _>("person"),
            employee_id: r.get::<String, _>("employee_id"),
            department:  r.get::<String, _>("department"),
            issue_type:  r.get::<String, _>("issue_type"),
        })
        .collect())
}

// ─── Clockings report ────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct ClockingRow {
    pub date: String,
    pub person: String,
    pub employee_id: String,
    pub department: String,
    pub access_time: String,
    pub attendance_status: String,
    pub authentication_result: String,
}

pub async fn get_clockings_report(
    pool: &PgPool,
    dept: Option<&str>,
    date_from: &str,
    date_to: &str,
    user: Option<&str>,
) -> Result<Vec<ClockingRow>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT \
           access_date::text AS date, \
           COALESCE(NULLIF(TRIM(person_name), ''), employee_id, 'Unknown') AS person, \
           COALESCE(employee_id, '')::text AS employee_id, \
           COALESCE(department, 'Unknown') AS department, \
           COALESCE(TO_CHAR(access_time, 'HH24:MI:SS'), '')::text AS access_time, \
           COALESCE(attendance_status, '')::text AS attendance_status, \
           COALESCE(authentication_result, '')::text AS authentication_result \
         FROM access_records \
         WHERE access_date BETWEEN $1::date AND $2::date \
           AND ($3::text IS NULL OR department = $3) \
           AND ($4::text IS NULL \
                OR COALESCE(NULLIF(TRIM(person_name), ''), employee_id) = $4) \
         ORDER BY access_date, access_time, person",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .bind(user)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| ClockingRow {
            date:                  r.get::<String, _>("date"),
            person:                r.get::<String, _>("person"),
            employee_id:           r.get::<String, _>("employee_id"),
            department:            r.get::<String, _>("department"),
            access_time:           r.get::<String, _>("access_time"),
            attendance_status:     r.get::<String, _>("attendance_status"),
            authentication_result: r.get::<String, _>("authentication_result"),
        })
        .collect())
}

// ─── Timesheet report ────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct TimesheetRow {
    pub person: String,
    pub employee_id: String,
    pub department: String,
    pub date: String,
    pub first_entry: String,
    pub last_entry: String,
    pub hours_worked: f64,
    pub break_hours: f64,
}

/// Distinct list of employees that have records in the given date range / department.
pub async fn get_timesheet_users(
    pool: &PgPool,
    dept: Option<&str>,
    date_from: &str,
    date_to: &str,
) -> Result<Vec<String>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT DISTINCT COALESCE(NULLIF(TRIM(person_name), ''), employee_id) AS name \
         FROM access_records \
         WHERE access_date BETWEEN $1::date AND $2::date \
           AND ($3::text IS NULL OR department = $3) \
           AND COALESCE(NULLIF(TRIM(person_name), ''), employee_id) IS NOT NULL \
         ORDER BY name",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(|r| r.get::<String, _>("name")).collect())
}

/// Per-employee, per-day summary: first entry, last entry, total span, and break time.
/// Break time is calculated by finding all break_out/break_in pairs where consecutive
/// break_out records are deduplicated (only the first in each run is used).
pub async fn get_timesheet_report(
    pool: &PgPool,
    dept: Option<&str>,
    date_from: &str,
    date_to: &str,
    user: Option<&str>,
) -> Result<Vec<TimesheetRow>, sqlx::Error> {
    let rows = sqlx::query(
        "WITH all_records AS ( \
           SELECT \
             COALESCE(NULLIF(TRIM(person_name), ''), employee_id, 'Unknown') AS person, \
             COALESCE(employee_id, '')                                        AS employee_id, \
             COALESCE(department, 'Unknown')                                  AS department, \
             access_date, \
             access_time, \
             access_datetime, \
             attendance_status \
           FROM access_records \
           WHERE access_date BETWEEN $1::date AND $2::date \
             AND ($3::text IS NULL OR department = $3) \
             AND ($4::text IS NULL \
                  OR COALESCE(NULLIF(TRIM(person_name), ''), employee_id) = $4) \
         ), \
         deduped AS ( \
           SELECT *, \
             LAG(attendance_status) OVER ( \
               PARTITION BY person, access_date \
               ORDER BY access_datetime \
             ) AS prev_status \
           FROM all_records \
         ), \
         first_breaks AS ( \
           SELECT person, employee_id, department, access_date, access_datetime \
           FROM deduped \
           WHERE attendance_status = 'break_out' \
             AND (prev_status IS NULL OR prev_status != 'break_out') \
         ), \
         break_durations AS ( \
           SELECT \
             fb.person, fb.employee_id, fb.department, fb.access_date, \
             fb.access_datetime AS break_start, \
             ( \
               SELECT MIN(ar.access_datetime) \
               FROM all_records ar \
               WHERE ar.person = fb.person \
                 AND ar.access_date = fb.access_date \
                 AND ar.attendance_status = 'break_in' \
                 AND ar.access_datetime > fb.access_datetime \
             ) AS break_end \
           FROM first_breaks fb \
         ), \
         break_totals AS ( \
           SELECT \
             person, employee_id, department, access_date, \
             COALESCE(SUM( \
               CASE WHEN break_end IS NOT NULL \
                 THEN EXTRACT(EPOCH FROM (break_end - break_start)) / 3600.0 \
                 ELSE 0 \
               END \
             ), 0)::float8 AS break_hours \
           FROM break_durations \
           GROUP BY person, employee_id, department, access_date \
         ), \
         day_summary AS ( \
           SELECT \
             person, employee_id, department, access_date, \
             COALESCE(MIN(CASE WHEN attendance_status = 'check_in'  THEN access_time END)::text, '') AS first_entry, \
             COALESCE(MAX(CASE WHEN attendance_status = 'check_out' THEN access_time END)::text, '') AS last_entry, \
             COALESCE( \
               EXTRACT(EPOCH FROM ( \
                 MAX(CASE WHEN attendance_status = 'check_out' THEN access_datetime END) - \
                 MIN(CASE WHEN attendance_status = 'check_in'  THEN access_datetime END) \
               )) / 3600.0, \
             0)::float8 AS hours_worked \
           FROM all_records \
           GROUP BY person, employee_id, department, access_date \
         ) \
         SELECT \
           ds.person, ds.employee_id, ds.department, \
           ds.access_date::text AS date, \
           ds.first_entry, ds.last_entry, ds.hours_worked, \
           COALESCE(bt.break_hours, 0)::float8 AS break_hours \
         FROM day_summary ds \
         LEFT JOIN break_totals bt \
           ON ds.person = bt.person AND ds.access_date = bt.access_date \
         ORDER BY ds.access_date, ds.person",
    )
    .bind(date_from)
    .bind(date_to)
    .bind(dept)
    .bind(user)
    .fetch_all(pool)
    .await?;

    let result = rows
        .iter()
        .map(|r| TimesheetRow {
            person:       r.get::<String, _>("person"),
            employee_id:  r.get::<String, _>("employee_id"),
            department:   r.get::<String, _>("department"),
            date:         r.get::<String, _>("date"),
            first_entry:  r.get::<String, _>("first_entry"),
            last_entry:   r.get::<String, _>("last_entry"),
            hours_worked: r.get::<f64, _>("hours_worked"),
            break_hours:  r.get::<f64, _>("break_hours"),
        })
        .collect();
    Ok(result)
}
