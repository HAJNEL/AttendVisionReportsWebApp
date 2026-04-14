import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Role } from '../../models/user.model';

@Component({
  selector: 'app-assign-roles-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Assign Roles</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Roles</mat-label>
          <mat-select formControlName="roles" multiple>
            <mat-option *ngFor="let role of data.roles" [value]="role.id">{{ role.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`],
})
export class AssignRolesDialogComponent {
  form: FormGroup;
  constructor(
    public dialogRef: MatDialogRef<AssignRolesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userId: string, roles: Role[], assignedRoleIds: string[] }
  ) {
    this.form = new FormGroup({
      roles: new FormControl(data.assignedRoleIds ?? [])
    });
  }

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value.roles);
  }
}
