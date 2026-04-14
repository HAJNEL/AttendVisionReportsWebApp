import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { PermissionDto } from '../../models/permission.model';
import { MatListOption, MatSelectionList } from "@angular/material/list";
import { MatProgressBar } from "@angular/material/progress-bar";
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-role-permissions-dialog',
  templateUrl: './role-permissions-dialog.component.html',
  styleUrls: ['./role-permissions-dialog.component.scss'],
  imports: [CommonModule, MatDialogActions, MatListOption, MatSelectionList, MatProgressBar, MatDialogContent]
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
