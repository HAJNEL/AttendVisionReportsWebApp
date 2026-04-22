import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Department } from '../../models/department.model';
import { AssignDepartmentUsersDialogComponent } from './dialogs/assign-department-users-dialog/assign-department-users-dialog.component';

import {
  DeptFormDialogComponent,
  DeptConfirmDialogComponent,
} from './dialogs/dept-dialog/dept-dialog.component';
import { TimeOverridesDialogComponent } from './dialogs/time-overrides-dialog/time-overrides-dialog.component';

export type DepartmentRow = Department;


import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './departments.component.html',
  styleUrl: './departments.component.scss',
})

export class DepartmentsComponent implements OnInit {
  displayedColumns = ['name', 'manager', 'rate', 'location', 'companyName', 'actions'];
  mobileColumns = ['name', 'manager', 'actions'];
  departments: DepartmentRow[] = [];
  loading = true;
  error: string | null = null;
  isMobile = false;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private api: ApiService,
    private breakpointObserver: BreakpointObserver
  ) {}

  async ngOnInit(): Promise<void> {
    this.breakpointObserver.observe([Breakpoints.Handset, '(max-width: 600px)'])
      .subscribe(result => {
        this.isMobile = result.matches;
        this.displayedColumns = this.isMobile ? this.mobileColumns : ['name', 'manager', 'rate', 'location', 'companyName', 'actions'];
      });
    await this.load();
  }

  openAssignUsers(dept: DepartmentRow): void {
    const ref = this.dialog.open(AssignDepartmentUsersDialogComponent, {
      data: {
        departmentId: dept.id,
        departmentName: dept.departmentName
      },
      width: '520px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        this.snackBar.open('User assignments updated', 'OK', { duration: 3000 });
      }
    });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.departments = await this.api.getDepartments();
      console.log('Loaded departments:', this.departments);
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  openCreate(): void {
    const ref = this.dialog.open(DeptFormDialogComponent, {
      data: { dept: null },
      width: '560px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        const created = await this.api.createDepartment(result);
        this.departments = [...this.departments, created].sort((a, b) =>
          a.departmentName.localeCompare(b.departmentName));
        this.snackBar.open('Department created', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  openEdit(dept: DepartmentRow): void {
    const ref = this.dialog.open(DeptFormDialogComponent, {
      data: { dept },
      width: '560px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        const updated = await this.api.updateDepartment(dept.id, result);
        this.departments = this.departments.map(d => d.id === dept.id ? updated : d)
          .sort((a, b) => a.departmentName.localeCompare(b.departmentName));
        this.snackBar.open('Department saved', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  confirmDelete(dept: DepartmentRow): void {
    const ref = this.dialog.open(DeptConfirmDialogComponent, {
      data: { name: dept.departmentName },
      width: '400px',
    });
    ref.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.api.deleteDepartment(dept.id);
        this.departments = this.departments.filter(d => d.id !== dept.id);
        this.snackBar.open('Department deleted', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  locationOf(dept: DepartmentRow): string {
    return [dept.addressLine1, dept.addressLine2, dept.city].filter(Boolean).join(', ') || '—';
  }

  openTimeOverrides(dept: DepartmentRow): void {
    this.dialog.open(TimeOverridesDialogComponent, {
      data: { departmentId: dept.id, departmentName: dept.departmentName },
      width: '600px',
    });
  }
}
