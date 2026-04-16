import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { PermissionDto } from '../../../../models/permission.model';
import { MatListOption, MatSelectionList } from "@angular/material/list";
import { MatProgressBar } from "@angular/material/progress-bar";
import { ApiService } from '../../../../services/api.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-role-permissions-dialog',
  templateUrl: './role-permissions-dialog.component.html',
  styleUrls: ['./role-permissions-dialog.component.scss'],
    imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBar,
    MatSelectionList,
    MatListOption
],
})
export class RolePermissionsDialogComponent implements OnInit {
  allPermissions: PermissionDto[] = [];
  assignedIds = new Set<number>();
  loading = false;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RolePermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { roleId: string; assigned: PermissionDto[] },
    private apiService: ApiService
  ) {
    this.assignedIds = new Set((data.assigned || []).map(p => p.id));
  }

  ngOnInit() {
    this.loading = true;
    this.apiService.getAllPermissions().then(perms => {
      this.allPermissions = perms;
      // Ensure assignedIds is up to date with loaded permissions
      if (this.data.assigned) {
        this.assignedIds = new Set(this.data.assigned.map(p => p.id));
      }
      this.loading = false;
    }).catch(() => {
      this.error = 'Failed to load permissions';
      this.loading = false;
    });
  }

  togglePermission(permission: PermissionDto) {
    if (this.assignedIds.has(permission.id)) {
      this.assignedIds.delete(permission.id);
    } else {
      this.assignedIds.add(permission.id);
    }
  }

  save() {
    this.dialogRef.close(Array.from(this.assignedIds));
  }
  cancel() {
    this.dialogRef.close();
  }
}
