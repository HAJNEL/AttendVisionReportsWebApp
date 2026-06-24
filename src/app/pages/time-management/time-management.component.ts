import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService } from '../../services/api.service';
import { Department } from '../../models/department.model';
import { DepartmentEmployee } from '../../models/department-user-link.model';
import { DaySummaryRow, AutoFixApplyRequest, AutoFixAction, AccessRecordDto, TimeManagementConfig } from '../../models/time-management.model';
import { AutoFixConfirmDialogComponent } from './dialogs/auto-fix-confirm-dialog.component';
import { TimeManagementSettingsDialogComponent } from './dialogs/time-management-settings-dialog.component';

@Component({
  selector: 'app-time-management',
  standalone: true,
  templateUrl: './time-management.component.html',
  styleUrls: ['./time-management.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
  ],
})
export class TimeManagementComponent implements OnInit {
  loading = false;
  error: string | null = null;

  departments: Department[] = [];
  employees: DepartmentEmployee[] = [];
  rows: DaySummaryRow[] = [];

  selectedDeptId = 'all';
  showAllDepts = false;
  selectedEmployeeId = '';
  selectedDate: Date | null = new Date();

  fixingEmployeeId: string | null = null;

  config: TimeManagementConfig | null = null;
  loadingConfig = false;

  displayedColumns = ['personName', 'department', 'firstEntry', 'lastEntry', 'totalRecords', 'issues', 'actions'];

  constructor(
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  async ngOnInit(): Promise<void> {
    const savedFilter: { deptId: string; employeeId: string; date: string } | undefined =
      history.state?.savedFilter;

    this.departments = await this.api.getDepartments().catch(() => []);
    if (this.departments.length === 1) {
      this.selectedDeptId = this.departments[0].id;
      this.showAllDepts = false;
    } else if (this.departments.length > 1) {
      this.selectedDeptId = 'all';
      this.showAllDepts = true;
    }

    if (savedFilter) {
      this.selectedDeptId = savedFilter.deptId;
      this.selectedEmployeeId = savedFilter.employeeId;
      this.selectedDate = savedFilter.date ? new Date(savedFilter.date) : new Date();
    }

    this.config = await this.api.getTimeManagementConfig().catch(() => null);

    await this.loadEmployees();
    await this.load();
  }

  openSettings(): void {
    this.loadingConfig = true;
    this.api.getTimeManagementConfig()
      .then(config => {
        this.config = config;
        const ref = this.dialog.open(TimeManagementSettingsDialogComponent, {
          width: '600px',
          data: { config },
        });
        ref.afterClosed().subscribe(async (saved: TimeManagementConfig | null) => {
          if (!saved) return;
          this.config = saved;
          // re-evaluate issue counts under the new rules
          await this.load();
        });
      })
      .catch((e: any) => {
        this.snackBar.open(e?.error?.error || e?.message || 'Failed to load settings.', 'Dismiss', { duration: 4000 });
      })
      .finally(() => { this.loadingConfig = false; });
  }

  async loadEmployees(): Promise<void> {
    const deptId = this.selectedDeptId && this.selectedDeptId !== 'all' ? this.selectedDeptId : null;
    this.employees = await this.api.getEmployees(deptId).catch(() => []);
  }

  async onDeptChange(): Promise<void> {
    this.selectedEmployeeId = '';
    await this.loadEmployees();
    await this.load();
  }

  async onEmployeeChange(): Promise<void> {
    await this.load();
  }

  async onDateChange(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.selectedDate) return;
    this.loading = true;
    this.error = null;
    try {
      const date = this.formatDate(this.selectedDate);
      const deptId = this.selectedDeptId !== 'all' ? this.selectedDeptId : null;
      const empId = this.selectedEmployeeId || null;
      this.rows = await this.api.getTimeManagementDaySummary(date, deptId, empId);
    } catch (e: any) {
      this.error = e.message || 'Failed to load data.';
    } finally {
      this.loading = false;
    }
  }

  async autoFix(row: DaySummaryRow): Promise<void> {
    const date = this.formatDate(this.selectedDate!);
    this.fixingEmployeeId = row.employeeId;
    try {
      const [preview, records] = await Promise.all([
        this.api.getAutoFixPreview(date, row.employeeId),
        this.api.getTimeManagementUserRecords(date, row.employeeId).catch((): AccessRecordDto[] => []),
      ]);
      if (preview.issues.length === 0) {
        this.snackBar.open('No issues detected — this day looks good!', 'OK', { duration: 3500 });
        return;
      }
      const ref = this.dialog.open(AutoFixConfirmDialogComponent, {
        width: '600px',
        data: { preview, personName: row.personName, date, records, config: this.config },
      });
      ref.afterClosed().subscribe(async (editedActions: AutoFixAction[] | null) => {
        if (!editedActions?.length) return;
        try {
          const deleteActions = editedActions.filter(a => a.actionType === 'delete');
          const insertActions = editedActions.filter(a => a.actionType !== 'delete');

          await Promise.all(deleteActions.map(a => this.api.deleteAccessRecord(a.recordId!)));

          if (insertActions.length > 0) {
            const request: AutoFixApplyRequest = {
              employeeId: row.employeeId,
              personName: row.personName,
              department: row.department,
              date,
              actions: insertActions,
            };
            await this.api.applyAutoFix(request);
          }

          this.snackBar.open('Auto-fix applied successfully.', 'OK', { duration: 3000 });
          await this.load();
        } catch (e: any) {
          this.snackBar.open(e.message || 'Failed to apply fix.', 'Dismiss', { duration: 4000 });
        }
      });
    } catch (e: any) {
      this.snackBar.open(e.message || 'Failed to get auto-fix preview.', 'Dismiss', { duration: 4000 });
    } finally {
      this.fixingEmployeeId = null;
    }
  }

  manageUser(row: DaySummaryRow): void {
    const date = this.formatDate(this.selectedDate!);
    this.router.navigate(['/time-management', row.employeeId, date], {
      state: {
        savedFilter: {
          deptId: this.selectedDeptId,
          employeeId: this.selectedEmployeeId,
          date: this.selectedDate?.toISOString(),
        },
      },
    });
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
