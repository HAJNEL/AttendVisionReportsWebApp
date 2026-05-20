# AttendVision Reports

Professional web application for attendance report generation, integrated with PostgreSQL and HikCentral Professional.

## Features
- **Dashboard**: Real-time attendance statistics and favorite reports.
- **Reports**: Custom report generation with specific rules and custom logic.
- **Departments**: Management of departments and their corresponding payment rates.
- **HikCentral Integration**: Automatic data synchronization from HikCentral Professional to PostgreSQL.
- **Material Design**: Modern, premium aesthetic based on Material 3.

## Technology Stack
- **Frontend**: Angular 20+, Angular Material
- **Database**: PostgreSQL

---

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Node.js**: [Download](https://nodejs.org/) (LTS recommended)
2. **PostgreSQL**: Ensure a PostgreSQL instance is running and accessible.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm start
```

### 4. Build and publish changes

```bash
npm run release
```

---

## Configuration

### HikCentral API
Credentials for HikCentral OpenAPI should be configured in the background sync service (to be implemented).

---

## Project Structure
- `src/`: Angular frontend code.