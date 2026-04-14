import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CompanyFormDialogData {
  company: { id?: string; name: string; description: string | null } | null;
}

@Component({
  selector: 'app-company-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Company' : 'Create Company' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="company-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Company Name</mat-label>
          <input matInput formControlName="name" required />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ isEdit ? 'Save Changes' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .company-form { display: flex; flex-direction: column; gap: 4px; min-width: 400px; padding-top: 8px; }
    .full-width  { width: 100%; }
  `],
})
export class CompanyFormDialogComponent {
  isEdit: boolean;
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CompanyFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompanyFormDialogData,
  ) {
    this.isEdit = !!data.company;
    const c = data.company;
    this.form = new FormGroup({
      name: new FormControl(c?.name ?? '', Validators.required),
      description: new FormControl(c?.description ?? ''),
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.dialogRef.close({
      name: v.name,
      description: v.description || null,
    });
  }
}

// Delete confirmation dialog
export interface CompanyConfirmDialogData {
  name: string;
}

@Component({
  selector: 'app-company-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete Company</h2>
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
export class CompanyConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CompanyConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompanyConfirmDialogData,
  ) {}
}
