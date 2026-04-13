mod db;

use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tauri::State;

pub struct AppState {
    pub pool: tokio::sync::RwLock<Option<PgPool>>,
}

impl AppState {
    async fn get_pool(&self) -> Result<PgPool, String> {
        self.pool.read().await
            .as_ref()
            .map(|p| p.clone())
            .ok_or_else(|| "Database not configured. Open Settings to configure the database connection.".to_string())
    }
}

#[derive(Serialize, Deserialize)]
pub struct LoginResponse {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub is_admin: bool,
}

#[derive(Serialize)]
pub struct DashboardKpisResponse {
    pub total_employees: i64,
    pub checkins_today: i64,
    pub on_site_now: i64,
    pub failed_today: i64,
}

#[derive(Serialize)]
pub struct LabeledCountResponse {
    pub label: String,
    pub count: i64,
}

#[derive(Serialize)]
pub struct DayAccessRowResponse {
    pub label: String,
    pub count: i64,
    pub names: String,
}

#[derive(Serialize)]
pub struct DayEventRowResponse {
    pub label: String,
    pub status: String,
    pub count: i64,
    pub names: String,
}

#[derive(Serialize)]
pub struct DayPersonRowResponse {
    pub person: String,
    pub department: String,
    pub event_count: i64,
    pub first_time: String,
    pub last_time: String,
    pub last_status: String,
    pub hours_worked: f64,
}

#[derive(Serialize)]
pub struct DepartmentResponse {
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

#[derive(Deserialize)]
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

fn dept_to_response(d: db::Department) -> DepartmentResponse {
    DepartmentResponse {
        id: d.id,
        department_name: d.department_name,
        manager: d.manager,
        paymentRate: d.paymentRate,
        address_line1: d.address_line1,
        address_line2: d.address_line2,
        city: d.city,
        state: d.state,
        postal_code: d.postal_code,
        country: d.country,
    }
}

#[tauri::command]
async fn check_users_exist(state: State<'_, AppState>) -> Result<bool, String> {
    db::users_exist(&state.get_pool().await?)
        .await
        .map_err(|e| format!("Database error: {e}"))
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[tauri::command]
async fn register_first_user(
    state: State<'_, AppState>,
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
) -> Result<LoginResponse, String> {
    // Only allow registration if no users exist
    let pool = state.get_pool().await?;
    let exists = db::users_exist(&pool)
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    if exists {
        return Err("Registration is disabled. Users already exist.".to_string());
    }

    let password_hash = hash(&password, DEFAULT_COST)
        .map_err(|_| "Failed to hash password".to_string())?;

    let user = db::create_user(
        &pool,
        &username,
        &email,
        &password_hash,
        full_name.as_deref(),
        true, // first user is always admin
    )
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    Ok(LoginResponse {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
    })
}

#[tauri::command]
async fn login(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> Result<LoginResponse, String> {
    let pool = state.get_pool().await?;
    let user = db::find_user_by_username(&pool, &username)
        .await
        .map_err(|e| format!("Database error: {e}"))?;

    let user = user.ok_or_else(|| "Invalid username or password".to_string())?;

    if !user.is_active {
        return Err("Account is disabled. Contact your administrator.".to_string());
    }

    let valid = verify(&password, &user.password_hash)
        .map_err(|_| "Invalid username or password".to_string())?;

    if !valid {
        return Err("Invalid username or password".to_string());
    }

    db::update_last_login(&pool, user.id)
        .await
        .map_err(|e| format!("Database error: {e}"))?;

    Ok(LoginResponse {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
    })
}

#[tauri::command]
async fn get_departments(state: State<'_, AppState>) -> Result<Vec<DepartmentResponse>, String> {
    let rows = db::get_departments(&state.get_pool().await?)
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows.into_iter().map(dept_to_response).collect())
}

#[tauri::command]
async fn create_department(state: State<'_, AppState>, input: DepartmentInput) -> Result<DepartmentResponse, String> {
    let inp = db::DepartmentInput {
        department_name: input.department_name,
        manager: input.manager,
        paymentRate: input.paymentRate,
        address_line1: input.address_line1,
        address_line2: input.address_line2,
        city: input.city,
        state: input.state,
        postal_code: input.postal_code,
        country: input.country,
    };
    db::create_department(&state.get_pool().await?, &inp)
        .await
        .map(dept_to_response)
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
async fn update_department(state: State<'_, AppState>, id: i32, input: DepartmentInput) -> Result<DepartmentResponse, String> {
    let inp = db::DepartmentInput {
        department_name: input.department_name,
        manager: input.manager,
        paymentRate: input.paymentRate,
        address_line1: input.address_line1,
        address_line2: input.address_line2,
        city: input.city,
        state: input.state,
        postal_code: input.postal_code,
        country: input.country,
    };
    db::update_department(&state.get_pool().await?, id, &inp)
        .await
        .map(dept_to_response)
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
async fn delete_department(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    db::delete_department(&state.get_pool().await?, id)
        .await
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
async fn get_dashboard_kpis(state: State<'_, AppState>, department: Option<String>, date_from: String, date_to: String) -> Result<DashboardKpisResponse, String> {
    let kpis = db::get_dashboard_kpis(&state.get_pool().await?, department.as_deref(), &date_from, &date_to)
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(DashboardKpisResponse {
        total_employees: kpis.total_employees,
        checkins_today: kpis.checkins_today,
        on_site_now: kpis.on_site_now,
        failed_today: kpis.failed_today,
    })
}

#[tauri::command]
async fn get_hourly_traffic(state: State<'_, AppState>, date: String, department: Option<String>) -> Result<Vec<DayAccessRowResponse>, String> {
    let rows = db::get_hourly_traffic(&state.get_pool().await?, &date, department.as_deref())
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows.into_iter().map(|r| DayAccessRowResponse { label: r.label, count: r.count, names: r.names }).collect())
}

#[tauri::command]
async fn get_monthly_attendance(state: State<'_, AppState>, department: Option<String>) -> Result<Vec<LabeledCountResponse>, String> {
    db::get_monthly_attendance(&state.get_pool().await?, department.as_deref())
        .await
        .map(|v| v.into_iter().map(|r| LabeledCountResponse { label: r.label, count: r.count }).collect())
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
async fn get_dept_breakdown(state: State<'_, AppState>, department: Option<String>) -> Result<Vec<LabeledCountResponse>, String> {
    db::get_dept_breakdown(&state.get_pool().await?, department.as_deref())
        .await
        .map(|v| v.into_iter().map(|r| LabeledCountResponse { label: r.label, count: r.count }).collect())
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
async fn get_monthly_traffic(state: State<'_, AppState>, year: i32, month: i32, department: Option<String>) -> Result<Vec<LabeledCountResponse>, String> {
    let rows = db::get_monthly_traffic(&state.get_pool().await?, year, month, department.as_deref())
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows.into_iter().map(|r| LabeledCountResponse { label: r.label, count: r.count }).collect())
}

#[tauri::command]
async fn get_yearly_traffic(state: State<'_, AppState>, year: i32, department: Option<String>) -> Result<Vec<LabeledCountResponse>, String> {
    let rows = db::get_yearly_traffic(&state.get_pool().await?, year, department.as_deref())
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows.into_iter().map(|r| LabeledCountResponse { label: r.label, count: r.count }).collect())
}

#[tauri::command]
async fn get_day_events_by_status(
    state: State<'_, AppState>,
    date: String,
    department: Option<String>,
) -> Result<Vec<DayEventRowResponse>, String> {
    let rows = db::get_day_events_by_status(&state.get_pool().await?, &date, department.as_deref())
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows
        .into_iter()
        .map(|r| DayEventRowResponse {
            label: r.label,
            status: r.status,
            count: r.count,
            names: r.names,
        })
        .collect())
}

#[tauri::command]
async fn get_day_people(
    state: State<'_, AppState>,
    date: String,
    department: Option<String>,
) -> Result<Vec<DayPersonRowResponse>, String> {
    let rows = db::get_day_people(&state.get_pool().await?, &date, department.as_deref())
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows
        .into_iter()
        .map(|r| DayPersonRowResponse {
            person: r.person,
            department: r.department,
            event_count: r.event_count,
            first_time: r.first_time,
            last_time: r.last_time,
            last_status: r.last_status,
            hours_worked: r.hours_worked,
        })
        .collect())
}

#[derive(Serialize)]
pub struct IssueRowResponse {
    pub date: String,
    pub time_of: String,
    pub person: String,
    pub employee_id: String,
    pub department: String,
    pub issue_type: String,
}

#[tauri::command]
async fn get_issues(
    state: State<'_, AppState>,
    date_from: String,
    date_to: String,
    department: Option<String>,
) -> Result<Vec<IssueRowResponse>, String> {
    let rows = db::get_issues(&state.get_pool().await?, &date_from, &date_to, department.as_deref())
        .await
        .map_err(|e| format!("Database error: {e}"))?;
    Ok(rows
        .into_iter()
        .map(|r| IssueRowResponse {
            date:        r.date,
            time_of:     r.time_of,
            person:      r.person,
            employee_id: r.employee_id,
            department:  r.department,
            issue_type:  r.issue_type,
        })
        .collect())
}

// ─── Clockings report commands ───────────────────────────────────────────────

#[derive(Serialize)]
pub struct ClockingRowResponse {
    pub date: String,
    pub person: String,
    pub employee_id: String,
    pub department: String,
    pub access_time: String,
    pub attendance_status: String,
    pub authentication_result: String,
}

#[tauri::command]
async fn get_clockings_report(
    state: State<'_, AppState>,
    dept: Option<String>,
    date_from: String,
    date_to: String,
    user: Option<String>,
) -> Result<Vec<ClockingRowResponse>, String> {
    let rows = db::get_clockings_report(
        &state.get_pool().await?,
        dept.as_deref(),
        &date_from,
        &date_to,
        user.as_deref(),
    )
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    Ok(rows
        .into_iter()
        .map(|r| ClockingRowResponse {
            date:                  r.date,
            person:                r.person,
            employee_id:           r.employee_id,
            department:            r.department,
            access_time:           r.access_time,
            attendance_status:     r.attendance_status,
            authentication_result: r.authentication_result,
        })
        .collect())
}

// ─── Timesheet report commands ───────────────────────────────────────────────

#[derive(Serialize)]
pub struct TimesheetRowResponse {
    pub person: String,
    pub employee_id: String,
    pub department: String,
    pub date: String,
    pub first_entry: String,
    pub last_entry: String,
    pub hours_worked: f64,
    pub break_hours: f64,
}

#[tauri::command]
async fn get_timesheet_users(
    state: State<'_, AppState>,
    dept: Option<String>,
    date_from: String,
    date_to: String,
) -> Result<Vec<String>, String> {
    db::get_timesheet_users(&state.get_pool().await?, dept.as_deref(), &date_from, &date_to)
        .await
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
async fn get_timesheet_report(
    state: State<'_, AppState>,
    dept: Option<String>,
    date_from: String,
    date_to: String,
    user: Option<String>,
) -> Result<Vec<TimesheetRowResponse>, String> {
    let rows = db::get_timesheet_report(
        &state.get_pool().await?,
        dept.as_deref(),
        &date_from,
        &date_to,
        user.as_deref(),
    )
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    Ok(rows
        .into_iter()
        .map(|r| TimesheetRowResponse {
            person:       r.person,
            employee_id:  r.employee_id,
            department:   r.department,
            date:         r.date,
            first_entry:  r.first_entry,
            last_entry:   r.last_entry,
            hours_worked: r.hours_worked,
            break_hours:  r.break_hours,
        })
        .collect())
}

// ─── Native file save ─────────────────────────────────────────────────────────

#[tauri::command]
async fn save_excel_file(default_name: String, data: Vec<u8>) -> Result<bool, String> {
    let handle = rfd::AsyncFileDialog::new()
        .add_filter("Excel Workbook", &["xlsx"])
        .set_file_name(&default_name)
        .save_file()
        .await;

    match handle {
        Some(path) => std::fs::write(path.path(), &data)
            .map(|_| true)
            .map_err(|e| format!("Failed to save file: {e}")),
        None => Ok(false), // user cancelled
    }
}

fn default_port() -> u16 { 5432 }

#[derive(Serialize, Deserialize, Clone)]
pub struct DbConfig {
    #[serde(default)]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default)]
    pub user: String,
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub database: String,
}

impl Default for DbConfig {
    fn default() -> Self {
        DbConfig {
            host: "localhost".to_string(),
            port: 5432,
            user: String::new(),
            password: String::new(),
            database: String::new(),
        }
    }
}

impl DbConfig {
    fn is_configured(&self) -> bool {
        !self.host.is_empty() && !self.user.is_empty() && !self.database.is_empty()
    }

    async fn connect(&self) -> Result<PgPool, sqlx::Error> {
        sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect_with(
                sqlx::postgres::PgConnectOptions::new()
                    .host(&self.host)
                    .port(self.port)
                    .username(&self.user)
                    .password(&self.password)
                    .database(&self.database),
            )
            .await
    }
}

fn load_config_file(config_dir: &std::path::Path) -> DbConfig {
    std::fs::read_to_string(config_dir.join("config.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[tauri::command]
async fn get_db_config(app: tauri::AppHandle) -> Result<DbConfig, String> {
    use tauri::Manager;
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Config dir error: {e}"))?;
    Ok(load_config_file(&config_dir))
}

#[tauri::command]
async fn test_db_connection(config: DbConfig) -> Result<(), String> {
    config.connect().await
        .map(|_| ())
        .map_err(|e| format!("Connection failed: {e}"))
}

#[tauri::command]
async fn save_db_config(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    config: DbConfig,
) -> Result<(), String> {
    use tauri::Manager;
    let new_pool = config.connect().await
        .map_err(|e| format!("Connection failed: {e}"))?;
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Config dir error: {e}"))?;
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Create dir: {e}"))?;
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Serialize: {e}"))?;
    std::fs::write(config_dir.join("config.json"), &json)
        .map_err(|e| format!("Write config: {e}"))?;
    let mut guard = state.pool.write().await;
    *guard = Some(new_pool);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            let pool = if let Ok(url) = std::env::var("DATABASE_URL") {
                tauri::async_runtime::block_on(db::create_pool(&url)).ok()
            } else {
                let config_dir = app.path().app_config_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."));
                let config = load_config_file(&config_dir);
                if config.is_configured() {
                    tauri::async_runtime::block_on(config.connect()).ok()
                } else {
                    None
                }
            };
            app.manage(AppState { pool: tokio::sync::RwLock::new(pool) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            check_users_exist,
            register_first_user,
            get_departments,
            create_department,
            update_department,
            delete_department,
            get_dashboard_kpis,
            get_hourly_traffic,
            get_monthly_traffic,
            get_yearly_traffic,
            get_monthly_attendance,
            get_dept_breakdown,
            get_day_events_by_status,
            get_day_people,
            get_issues,
            get_clockings_report,
            get_timesheet_users,
            get_timesheet_report,
            save_excel_file,
            get_db_config,
            test_db_connection,
            save_db_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

