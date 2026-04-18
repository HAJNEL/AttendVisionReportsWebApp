import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Role } from '../../../../models/user.model';

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
  templateUrl: './assign-roles-dialog.component.html',
  styleUrls: ['./assign-roles-dialog.component.scss'],
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
