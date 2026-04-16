
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { User, Role } from '../../models/user.model';
import { UserConfirmDialogComponent } from './user-confirm-dialog.component';
import { UserDialogComponent } from './user-dialog.component';
import { AssignRolesDialogComponent } from './assign-roles-dialog.component';
import { AssignDepartmentsDialogComponent } from './assign-departments-dialog.component';

@Component({
  selector: 'app-users',
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
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  displayedColumns = ['fullname', 'email', 'roles', 'actions'];
  users: User[] = [];
  loading = true;
  error: string | null = null;

  constructor(private api: ApiService, private dialog: MatDialog, private snackBar: MatSnackBar) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const result = await this.api.getUsers().toPromise();
      this.users = result ?? [];
    } catch (e) {
      this.users = [];
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  async openCreateUser() {
    // Fetch roles for selection
    let roles: Role[] = [];
    try {
      roles = await this.api.getRoles() ?? [];
    } catch {}
    const ref = this.dialog.open(UserDialogComponent, {
      data: { user: null, roles },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.api.createUser(result).toPromise();
        await this.load();
        this.snackBar.open('User created', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  async openEditUser(user: User) {
    let roles: Role[] = [];
    try {
      roles = await this.api.getRoles() ?? [];
    } catch {}
    const ref = this.dialog.open(UserDialogComponent, {
      data: { user, roles },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.api.updateUser(user.id, result).toPromise();
        await this.load();
        this.snackBar.open('User updated', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

  confirmDeleteUser(user: User) {
    const ref = this.dialog.open(UserConfirmDialogComponent, {
      data: { username: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email },
      width: '400px',
    });
    ref.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.api.deleteUser(user.id).toPromise();
        this.users = this.users.filter(u => u.id !== user.id);
        this.snackBar.open('User deleted', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

    getRoleNames(user: User): string {
    return user.roles && user.roles.length > 0
      ? user.roles.map(r => r.name).join(', ')
      : '—';
  }

    async openAssignRoles(user: User) {
    let roles: Role[] = [];
    try {
      roles = await this.api.getRoles() ?? [];
    } catch {}
    const assignedRoleIds = (user.roles ?? []).map(r => r.id);
    const ref = this.dialog.open(AssignRolesDialogComponent, {
      data: { userId: user.id, roles, assignedRoleIds },
      width: '400px',
    });
    ref.afterClosed().subscribe(async (selectedRoleIds: string[] | undefined) => {
      if (!selectedRoleIds) return;
      try {
        // Remove all roles, then assign selected
        for (const role of user.roles ?? []) {
          if (!selectedRoleIds.includes(role.id)) {
            await this.api.removeRole({ userId: user.id, roleId: role.id }).toPromise();
          }
        }
        for (const roleId of selectedRoleIds) {
          if (!(user.roles ?? []).some(r => r.id === roleId)) {
            await this.api.assignRole({ userId: user.id, roleId }).toPromise();
          }
        }
        await this.load();
        this.snackBar.open('Roles updated', 'OK', { duration: 3000 });
      } catch (e) {
        this.snackBar.open(String(e), 'Dismiss', { duration: 5000 });
      }
    });
  }

    async openAssignDepartments(user: User) {
    const ref = this.dialog.open(AssignDepartmentsDialogComponent, {
      data: {
        userId: user.id,
        userName: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email
      },
      width: '480px',
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        this.snackBar.open('Department assignments updated', 'OK', { duration: 3000 });
      }
    });
  }
  }
