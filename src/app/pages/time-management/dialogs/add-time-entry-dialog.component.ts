import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ApiService } from '../../../services/api.service';
import { Department } from '../../../models/department.model';
import { DepartmentEmployee } from '../../../models/department-user-link.model';
import { CreateAccessRecordDto } from '../../../models/time-management.model';

export interface AddTimeEntryDialogData {
  departments: Department[];
  defaultDate: Date | null;
}

const STATUS_OPTIONS = [
  { value: 'check_in',  label: 'Check In'  },
  { value: 'check_out', label: 'Check Out' },
  { value: 'break_out', label: 'Break Out' },
  { value: 'break_in',  label: 'Break In'  },
];

@Component({
  selector: 'app-add-time-entry-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">add_circle</mat-icon>
      Add Time Entry
    </h2>

    <mat-dialog-content>
      <mat-button-toggle-group class="mode-toggle" [value]="mode" (change)="setMode($event)" aria-label="Employee mode">
        <mat-button-toggle value="existing">Existing Employee</mat-button-toggle>
        <mat-button-toggle value="new">New Employee</mat-button-toggle>
      </mat-button-toggle-group>

      @if (mode === 'existing') {
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Department</mat-label>
            <mat-select [(ngModel)]="selectedDeptId" (ngModelChange)="onDeptChange()">
              <mat-option value="">All Departments</mat-option>
              <mat-option *ngFor="let d of departments" [value]="d.id">{{ d.departmentName }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Employee</mat-label>
            <mat-select [(ngModel)]="selectedEmployeeId" [disabled]="loadingEmployees || employees.length === 0">
              <mat-option *ngFor="let e of employees" [value]="e.employeeId">{{ e.name }}</mat-option>
            </mat-select>
            <mat-hint *ngIf="!loadingEmployees && employees.length === 0">No employees found for this department.</mat-hint>
          </mat-form-field>
        </div>
      } @else {
        <div class="new-employee-hint">
          <mat-icon>info_outline</mat-icon>
          <span>This creates a brand-new employee record. Make sure the Employee ID doesn't already exist.</span>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Employee ID</mat-label>
            <input matInput [(ngModel)]="newEmployeeId" placeholder="e.g. EMP-1042">
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Full Name</mat-label>
            <input matInput [(ngModel)]="newPersonName" placeholder="e.g. Jane Doe">
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Department</mat-label>
            <mat-select [(ngModel)]="newDepartmentId">
              <mat-option *ngFor="let d of departments" [value]="d.id">{{ d.departmentName }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      }

      <div class="form-row two-col">
        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="entryDatePicker" [(ngModel)]="date">
          <mat-datepicker-toggle matSuffix [for]="entryDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #entryDatePicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Time</mat-label>
          <input matInput type="time" [(ngModel)]="time" step="60">
        </mat-form-field>
      </div>

      <div class="form-row">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Attendance Status</mat-label>
          <mat-select [(ngModel)]="attendanceStatus">
            <mat-option *ngFor="let s of statusOptions" [value]="s.value">{{ s.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (validationError) {
        <div class="validation-error">
          <mat-icon>error_outline</mat-icon> {{ validationError }}
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()">
        <mat-icon>add</mat-icon>
        Add Entry
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex; align-items: center; gap: 8px;
      .title-icon { color: #58a6ff; }
    }
    mat-dialog-content { min-width: 420px; max-width: 480px; padding-top: 8px; }
    .mode-toggle {
      display: flex;
      width: 100%;
      margin-bottom: 16px;
      ::ng-deep .mat-button-toggle { flex: 1; text-align: center; }
    }
    .form-row { margin-bottom: 8px; }
    .form-row.two-col {
      display: flex;
      gap: 12px;
      mat-form-field { flex: 1; }
    }
    .full-width { width: 100%; }
    .new-employee-hint {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; margin-bottom: 12px;
      background: rgba(88, 166, 255, 0.08);
      border: 1px solid rgba(88, 166, 255, 0.25);
      border-radius: 6px;
      font-size: 12px; color: #8b949e;
      mat-icon { color: #58a6ff; flex-shrink: 0; font-size: 18px; width: 18px; height: 18px; }
    }
    .validation-error {
      display: flex; align-items: center; gap: 6px;
      color: #f85149; font-size: 13px; margin-top: 4px;
    }
    @media (max-width: 599px) {
      mat-dialog-content { min-width: 0; max-width: none; }
      .form-row.two-col { flex-wrap: wrap; }
    }
  `],
})
export class AddTimeEntryDialogComponent implements OnInit {
  statusOptions = STATUS_OPTIONS;
  departments: Department[];

  mode: 'existing' | 'new' = 'existing';

  // existing-employee mode
  selectedDeptId = '';
  employees: DepartmentEmployee[] = [];
  loadingEmployees = false;
  selectedEmployeeId = '';

  // new-employee mode
  newEmployeeId = '';
  newPersonName = '';
  newDepartmentId = '';

  // common
  date: Date;
  time = '';
  attendanceStatus = '';

  validationError: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<AddTimeEntryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddTimeEntryDialogData,
    private api: ApiService,
  ) {
    this.departments = data.departments ?? [];
    this.date = data.defaultDate ? new Date(data.defaultDate) : new Date();
    if (this.departments.length === 1) {
      this.newDepartmentId = this.departments[0].id;
    }
  }

  async ngOnInit(): Promise<void> {
    await this.onDeptChange();
  }

  setMode(change: MatButtonToggleChange): void {
    this.mode = change.value;
    this.validationError = null;
  }

  async onDeptChange(): Promise<void> {
    this.selectedEmployeeId = '';
    this.loadingEmployees = true;
    const deptId = this.selectedDeptId || null;
    this.employees = await this.api.getEmployees(deptId).catch(() => []);
    this.loadingEmployees = false;
  }

  get canConfirm(): boolean {
    if (!this.date || !this.time || !this.attendanceStatus) return false;
    if (this.mode === 'existing') return !!this.selectedEmployeeId;
    return !!this.newEmployeeId.trim() && !!this.newPersonName.trim() && !!this.newDepartmentId;
  }

  confirm(): void {
    if (!this.canConfirm) {
      this.validationError = 'Please fill in all required fields.';
      return;
    }

    let employeeId: string;
    let personName: string;
    let department: string;

    if (this.mode === 'existing') {
      const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
      if (!emp) {
        this.validationError = 'Please select an employee.';
        return;
      }
      employeeId = emp.employeeId;
      personName = emp.name;
      department = emp.departmentName;
    } else {
      const dept = this.departments.find(d => d.id === this.newDepartmentId);
      employeeId = this.newEmployeeId.trim();
      personName = this.newPersonName.trim();
      department = dept?.departmentName ?? '';
    }

    const dto: CreateAccessRecordDto = {
      employeeId,
      personName,
      department,
      date: this.formatDate(this.date),
      time: this.time,
      attendanceStatus: this.attendanceStatus,
    };

    this.dialogRef.close(dto);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
