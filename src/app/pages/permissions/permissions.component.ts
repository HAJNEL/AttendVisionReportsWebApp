import { Component, OnInit } from '@angular/core';
import { PermissionDto, CreatePermissionDto, UpdatePermissionDto } from '../../models/permission.model';
import { MatDialog } from '@angular/material/dialog';
import { PermissionDialogComponent } from './permission-dialog.component';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MatCard } from "@angular/material/card";
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinner } from "@angular/material/progress-spinner";

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTableModule, MatProgressBarModule, MatCard, MatMenuModule, MatProgressSpinner],
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent implements OnInit {
  permissions: PermissionDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.loading = true;
    this.apiService.getAllPermissions().then((perms: PermissionDto[]) => {
      this.permissions = perms;
      this.loading = false;
    }).catch(() => {
      this.error = 'Failed to load permissions';
      this.loading = false;
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(PermissionDialogComponent, { width: '400px', data: {} });
    dialogRef.afterClosed().subscribe((result: CreatePermissionDto | undefined) => {
      if (result) {
        this.apiService.createPermission(result).then(() => this.loadPermissions()).catch(() => {
          this.error = 'Failed to create permission';
        });
      }
    });
  }

  openEditDialog(permission: PermissionDto) {
    const dialogRef = this.dialog.open(PermissionDialogComponent, { width: '400px', data: { permission } });
    dialogRef.afterClosed().subscribe((result: UpdatePermissionDto | undefined) => {
      if (result) {
        this.apiService.updatePermission(permission.id, result).then(() => this.loadPermissions()).catch(() => {
          this.error = 'Failed to update permission';
        });
      }
    });
  }

  deletePermission(permission: PermissionDto) {
    if (confirm(`Delete permission '${permission.name}'?`)) {
      this.apiService.deletePermission(permission.id).then(() => this.loadPermissions()).catch(() => {
        this.error = 'Failed to delete permission';
      });
    }
  }
}
