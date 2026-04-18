import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { User, Role } from '../../../../models/user.model';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-user-dialog',
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
    MatCheckboxModule,
  ],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
})
export class UserDialogComponent {
  isEdit: boolean;
  form: FormGroup;
  resetPassword = false;
  randomPassword = false;
  password = '';
  showPassword = false;
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';
  loadedUser?: User;
  removingRoleId: string | null = null;
  async removeRole(role: Role) {
    if (!this.loadedUser?.id) return;
    this.removingRoleId = role.id;
    try {
      await this.api.removeRole({ userId: this.loadedUser.id, roleId: role.id }).toPromise();
      // Remove role from UI
      this.loadedUser.roles = (this.loadedUser.roles || []).filter(r => r.id !== role.id);
    } finally {
      this.removingRoleId = null;
    }
  }

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: User; roles: Role[] },
    private api: ApiService
  ) {
    this.isEdit = !!data.user;
    const u = data.user;
    this.resetPassword = !!u?.resetPassword;
    this.form = new FormGroup({
      firstName: new FormControl(u?.firstName ?? '', Validators.required),
      lastName: new FormControl(u?.lastName ?? '', Validators.required),
      username: new FormControl({ value: u ? `${u.firstName?.toLowerCase()}.${u.lastName?.toLowerCase()}` : '', disabled: true }),
      email: new FormControl(u?.email ?? '', [Validators.required, Validators.email]),
      roles: new FormControl(u?.roles ?? []),
      isActive: new FormControl(u?.isActive ?? true),
    });

    // Auto-generate username as FIRSTNAME.LASTNAME
    this.form.get('firstName')!.valueChanges.subscribe(() => this.updateUsername());
    this.form.get('lastName')!.valueChanges.subscribe(() => this.updateUsername());
    this.updateUsername();

    // If editing, fetch latest user details (with roles)
    if (this.isEdit && u?.id) {
      this.api.getUserById(u.id).then(user => {
        this.loadedUser = user;
        // Optionally update form fields if backend is source of truth
        // this.form.patchValue({
        //   firstName: user.full_name?.split(' ')[0] ?? '',
        //   lastName: user.full_name?.split(' ')[1] ?? '',
        //   email: user.email,
        //   roles: user.roles ?? [],
        //   isActive: user.is_active ?? true,
        // });
      });
    }
  }

  updateUsername() {
    const first = (this.form.get('firstName')!.value || '').trim().toLowerCase();
    const last = (this.form.get('lastName')!.value || '').trim().toLowerCase();
    const username = first && last ? `${first}.${last}` : '';
    this.form.get('username')!.setValue(username, { emitEvent: false });
  }

  toggleResetPassword(event: any) {
    this.resetPassword = event.checked;
    if (!this.resetPassword) {
      this.password = '';
      this.randomPassword = false;
    }
  }

  toggleRandomPassword(event: any) {
    this.randomPassword = event.checked;
    if (this.randomPassword) {
      this.password = this.generateRandomPassword();
      this.checkPasswordStrength();
    } else {
      this.password = '';
      this.checkPasswordStrength();
    }
  }

  onPasswordInput(event: any) {
    this.password = event.target.value;
    this.checkPasswordStrength();
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  copyPassword() {
    navigator.clipboard.writeText(this.password);
  }

  generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  checkPasswordStrength() {
    const pwd = this.password;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (pwd.length >= 12) score++;
    if (score >= 5) this.passwordStrength = 'strong';
    else if (score >= 3) this.passwordStrength = 'medium';
    else this.passwordStrength = 'weak';
  }

  save(): void {
    if (this.form.invalid) return;
    // On create, password is required
    if (!this.isEdit && !this.password) return;
    const v = this.form.getRawValue();
    // Prepare payload to match UpdateUserDto
    const result: any = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      isActive: v.isActive,
      roles: Array.isArray(v.roles) ? v.roles.map((r: any) => r.id) : [],
    };
    if (this.isEdit) {
      if (this.resetPassword) {
        result.password = this.password;
      }
    } else {
      result.password = this.password;
    }
    result.resetPassword = this.resetPassword;
    this.dialogRef.close(result);
  }
}
