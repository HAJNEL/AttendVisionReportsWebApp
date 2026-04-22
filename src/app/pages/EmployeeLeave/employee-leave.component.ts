import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmployeeLeaveDialogComponent } from './dialog/employee-leave-dialog.component';
import { ApiService } from '../../services/api.service';
import { EmployeeLeave, CreateEmployeeLeave, UpdateEmployeeLeave, EmployeeLeaveRange } from '../../models/employee-leave.model';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { FormsModule } from '@angular/forms';
import { Department } from '../../models/department.model';
import { DepartmentEmployee } from '../../models/department-user-link.model';

@Component({
  selector: 'app-employee-leave',
  templateUrl: './employee-leave.component.html',
  styleUrls: ['./employee-leave.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinner,
    MatDialogModule,
    MatMenuModule,
    FormsModule,
  ]
})
export class EmployeeLeaveComponent implements OnInit {
  loading = false;
  error: string | null = null;
  leaveEntries: EmployeeLeaveRange[] = [];
  displayedColumns: string[] = ['employee', 'department', 'leaveType', 'fromTime', 'toTime', 'dateRange', 'actions'];
  
  departments: Department[] = [];
  selectedDeptId: string = 'all';
  showAllDepartmentsOption = false;
  employees: DepartmentEmployee[] = [];
  selectedEmployeeId: string = '';
  fromDate: Date | null = null;
  toDate: Date | null = null;
  searchQuery: string = '';

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private api: ApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.departments = await this.api.getDepartments().catch(() => []);
    
    if (this.departments.length === 1) {
      this.selectedDeptId = this.departments[0].id;
      this.showAllDepartmentsOption = false;
    } else if (this.departments.length > 1) {
      this.selectedDeptId = 'all';
      this.showAllDepartmentsOption = true;
    }

    await this.loadEmployees();
    await this.load();
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

  async onDateRangeChange(): Promise<void> {
    if (this.fromDate && this.toDate) {
      await this.load();
    } else if (!this.fromDate && !this.toDate) {
      await this.load();
    }
  }

  async onSearchChange(): Promise<void> {
    // Basic local filtering or API-side if supported
    // For now we'll just reload if we wanted to do it on the server, 
    // but the API doesn't seem to have a search param.
    // We can filter the list locally.
  }

  get filteredLeaveEntries(): EmployeeLeaveRange[] {
    if (!this.searchQuery) return this.leaveEntries;
    const q = this.searchQuery.toLowerCase();
    return this.leaveEntries.filter(e => 
      e.fullName.toLowerCase().includes(q) || 
      e.type.toLowerCase().includes(q) ||
      e.departmentId.toLowerCase().includes(q)
    );
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const params: any = {};
      if (this.selectedDeptId && this.selectedDeptId !== 'all') {
        params.departmentId = this.selectedDeptId;
      }
      if (this.selectedEmployeeId) {
        params.employeeId = this.selectedEmployeeId;
      }
      if (this.fromDate) {
        params.startDate = this.formatDate(this.fromDate);
      }
      if (this.toDate) {
        params.endDate = this.formatDate(this.toDate);
      }

      this.leaveEntries = await this.api.getEmployeeLeaveRanges(params);
    } catch (e: any) {
      this.error = e.message || 'Failed to load leave records.';
    } finally {
      this.loading = false;
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  openBookLeave(): void {
    const dialogRef = this.dialog.open(EmployeeLeaveDialogComponent, {
      width: '400px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(async (result: CreateEmployeeLeave | null) => {
      if (result) {
        this.loading = true;
        try {
          await this.api.createEmployeeLeave(result);
          await this.load();
        } catch (e: any) {
          this.error = e.message || 'Failed to create leave.';
        } finally {
          this.loading = false;
        }
      }
    });
  }

  async editLeave(entry: EmployeeLeaveRange): Promise<void> {
    // Open dialog for editing, pre-filling with entry data
    const dialogRef = this.dialog.open(EmployeeLeaveDialogComponent, {
      width: '400px',
      data: {
        entry: {
          departmentId: entry.departmentId,
          employeeId: entry.employeeId,
          type: entry.type,
          fromDate: entry.fromDate,
          toDate : entry.toDate,
          fullName: entry.fullName,
          fromTime: entry.fromTime ?? null,
          toTime: entry.toTime ?? null
        }
      }
    });
    dialogRef.afterClosed().subscribe(async (result: UpdateEmployeeLeave | null) => {
      if (result) {
        this.loading = true;
        try {
          // Use employeeId as the unique identifier for update
          await this.api.updateEmployeeLeave(entry?.id, result);
          await this.load();
        } catch (e: any) {
          this.error = e.message || 'Failed to update leave.';
        } finally {
          this.loading = false;
        }
      }
    });
  }

  async deleteLeave(entry: EmployeeLeave): Promise<void> {
    if (!confirm('Delete this leave entry?')) return;
    this.loading = true;
    try {
      await this.api.deleteEmployeeLeave(entry.id);
      await this.load();
    } catch (e: any) {
      this.error = e.message || 'Failed to delete leave.';
    } finally {
      this.loading = false;
    }
  }
}
