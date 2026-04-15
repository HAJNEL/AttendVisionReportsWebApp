import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/user.model';
import { RoleDialogComponent } from './role-dialog.component';
import { RoleConfirmDialogComponent } from './role-confirm-dialog.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatMenuModule,
  ],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
})
export class RolesComponent implements OnInit {
  displayedColumns = ['name', 'description', 'actions'];
  roles: Role[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const result = await this.api.getRoles();
      this.roles = result ?? [];
    } catch (e) {
      this.roles = [];
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

    getParentName(parentId: string | undefined): string {
    if (!parentId) return '—';
    const parent = this.roles.find(r => r.id === parentId);
    return parent ? parent.name : '—';
  }

  async openCreateRole() {
    // Fetch roles for parent selection
    let roles: Role[] = [];
    try {
      roles = await this.api.getRoles() ?? [];
    } catch {}
    const ref = this.dialog.open(RoleDialogComponent, {
      data: { role: null, roles },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        const created = await this.api.createRole(result).toPromise();
        if (created) {
          this.roles = [...this.roles, created];
        }
        this.snackBar.open('Role created', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  async openEditRole(role: Role) {
    let roles: Role[] = [];
    try {
      roles = await this.api.getRoles() ?? [];
    } catch {}
    const ref = this.dialog.open(RoleDialogComponent, {
      data: { role, roles },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        const updated = await this.api.updateRole(role.id, result).toPromise();
        this.roles = this.roles.map(r => r.id === role.id ? updated : r).filter((r): r is Role => !!r);
        this.snackBar.open('Role updated', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  confirmDeleteRole(role: Role) {
    const ref = this.dialog.open(RoleConfirmDialogComponent, {
      data: { name: role.name },
      width: '400px',
    });
    ref.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.api.deleteRole(role.id).toPromise();
        this.roles = this.roles.filter(r => r.id !== role.id);
        this.snackBar.open('Role deleted', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

    async openPermissionsDialog(role: Role) {
      // Get assigned permissions for the role
      let assigned: any[] = [];
      try {
        assigned = (await this.apiService.getPermissionsForRole(role.id)) ?? [];
      } catch {}
      const ref = this.dialog.open(
        (await import('./role-permissions-dialog.component')).RolePermissionsDialogComponent,
        {
          data: { roleId: role.id, assigned },
          width: '480px',
        }
      );
      ref.afterClosed().subscribe(async (selectedIds: number[]) => {
        if (!selectedIds) return;
        try {
          await this.apiService.bulkAssignPermissionsToRole(role.id, selectedIds);
          await this.authService.refreshPermissions();
          this.snackBar.open('Permissions updated', 'OK', { duration: 3000 });
        } catch (e: any) {
          const msg = e?.error?.title || e?.message || 'Failed to update permissions';
          this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
        }
      });
    }
}
