import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { PermissionDto, CreatePermissionDto, UpdatePermissionDto } from '../../../../models/permission.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-permission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './permission-dialog.component.html',
  styleUrls: ['./permission-dialog.component.scss']
})
export class PermissionDialogComponent {
  isEdit: boolean;
  form: FormGroup;
  allPermissions: PermissionDto[] = [];

  constructor(
    public dialogRef: MatDialogRef<PermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { permission?: PermissionDto } = {},
    private api: ApiService
  ) {
    this.isEdit = !!data.permission;
    const p = data.permission;
    this.form = new FormGroup({
      parentId: new FormControl(p?.parentId ?? null),
      name: new FormControl(p?.name ?? '', Validators.required),
      description: new FormControl(p?.description ?? ''),
      uniqueCode: new FormControl(p?.uniqueCode ?? '', Validators.required),
    });
    // Load all permissions for parent selection
    this.api.getAllPermissions().then(perms => {
      this.allPermissions = perms.filter(x => !p || x.id !== p.id); // Exclude self
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    // parentId is optional, send as null if not set
    this.dialogRef.close({
      parentId: v.parentId || null,
      name: v.name,
      description: v.description || null,
      uniqueCode: v.uniqueCode,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
