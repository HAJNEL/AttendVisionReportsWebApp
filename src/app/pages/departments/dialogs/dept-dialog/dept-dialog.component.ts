import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { Company } from '../../../../models/company.model';

export interface DepartmentRow {
  id: number;
  departmentName: string;
  manager: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  serialNo?: string | null;
  companyId?: string | null;
}

export interface DeptFormDialogData {
  dept: DepartmentRow | null;
}

// ─── Create / Edit form dialog ───────────────────────────────────────────────

import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-dept-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
  ],
  templateUrl: './dept-dialog.component.html',
  styleUrls: ['./dept-dialog.component.scss'],
})
export class DeptFormDialogComponent implements OnInit {
  isEdit: boolean;
  form: FormGroup;
  companies: Company[] = [];

  constructor(
    public dialogRef: MatDialogRef<DeptFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeptFormDialogData,
    private api: ApiService,
  ) {
    this.isEdit = data.dept !== null;
    const d = data.dept;
    this.form = new FormGroup({
      departmentName: new FormControl(d?.departmentName ?? '', Validators.required),
      manager:         new FormControl(d?.manager ?? ''),
      address_line1:   new FormControl(d?.address_line1 ?? ''),
      address_line2:   new FormControl(d?.address_line2 ?? ''),
      city:            new FormControl(d?.city ?? ''),
      state:           new FormControl(d?.state ?? ''),
      postalCode:      new FormControl(d?.postalCode ?? ''),
      country:         new FormControl(d?.country ?? ''),
      serialNo:        new FormControl(d?.serialNo ?? ''),
      companyId:       new FormControl(d?.companyId ?? null),
    });
  }

  async ngOnInit(): Promise<void> {
    this.companies = await this.api.getCompanies().catch(() => []);
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    // Convert empty strings → null for optional fields
    this.dialogRef.close({
      departmentName: v.departmentName,
      manager:        v.manager || null,
      addressLine1:   v.address_line1 || null,
      addressLine2:   v.address_line2 || null,
      city:           v.city || null,
      state:          v.state || null,
      postalCode:     v.postalCode || null,
      country:        v.country || null,
      serialNo:       v.serialNo || null,
      companyId:      v.companyId || null,
    });
  }
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

export interface DeptConfirmDialogData {
  name: string;
}

@Component({
  selector: 'app-dept-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete Department</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete <strong>{{ data.name }}</strong>?</p>
      <p style="color:#8b949e;font-size:13px;">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-flat-button color="warn" (click)="dialogRef.close(true)">Delete</button>
    </mat-dialog-actions>
  `,
})
export class DeptConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeptConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeptConfirmDialogData,
  ) {}
}
