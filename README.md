# AttendVision Reports

Professional Tauri-based desktop application for attendance report generation, integrated with PostgreSQL and HikCentral Professional.

## Features
- **Dashboard**: Real-time attendance statistics and favorite reports.
- **Reports**: Custom report generation with specific rules and custom logic.
- **Departments**: Management of departments and their corresponding payment rates.
- **HikCentral Integration**: Automatic data synchronization from HikCentral Professional to PostgreSQL.
- **Material Design**: Modern, premium aesthetic based on Material 3.

## Technology Stack
- **Frontend**: Angular 20+, Angular Material
- **Backend**: Rust (Tauri v2)
- **Database**: PostgreSQL (SQLx)

---

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Node.js**: [Download](https://nodejs.org/) (LTS recommended)
2. **Rust**: [Install Rust](https://www.rust-lang.org/tools/install)
3. **C++ Build Tools**: (Required for Tauri on Windows)
   - Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Select the **"Desktop development with C++"** workload.
   - Ensure "MSVC v143" and "Windows 10/11 SDK" are checked.
4. **PostgreSQL**: Ensure a PostgreSQL instance is running and accessible.

---

## Getting Started

### 1. Update PATH (if needed)

If `cargo` or `npm` are not recognized in your terminal, run the following in PowerShell:
```powershell
$env:Path += ";$HOME\.cargo\bin"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run tauri dev
```

### 4. Build and publish changes

```bash
npm run release
```

---

## Configuration

### Database
Create a `.env` file in the `src-tauri` directory with your PostgreSQL connection string:
```bash
DATABASE_URL=postgres://hikcentral_user:!Peacethin70@localhost:5432/hikcentral
```

### HikCentral API
Credentials for HikCentral OpenAPI should be configured in the background sync service (to be implemented).

---

## Project Structure
- `src/`: Angular frontend code.
- `src-tauri/`: Rust backend code, Tauri configuration, and database migrations.