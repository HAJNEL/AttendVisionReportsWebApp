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
import { User, Role } from '../../models/user.model';
import { ApiService } from '../../services/api.service';

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
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit User' : 'Create User' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="user-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>First Name</mat-label>
          <input matInput formControlName="firstName" required />
          <mat-error *ngIf="form.get('firstName')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Last Name</mat-label>
          <input matInput formControlName="lastName" required />
          <mat-error *ngIf="form.get('lastName')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" required />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Roles</mat-label>
          <mat-select formControlName="roles" multiple>
            <mat-option *ngFor="let role of data.roles" [value]="role">{{ role.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <ng-container *ngIf="isEdit && loadedUser">
          <h3 style="margin-top: 16px;">Assigned Roles</h3>
          <table class="mat-elevation-z1" style="width:100%;margin-bottom:16px;">
            <thead>
              <tr>
                <th style="text-align:left;">Role Name</th>
                <th style="text-align:left;">Description</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of loadedUser.roles">
                <td>{{ role.name }}</td>
                <td>{{ role.description || '-' }}</td>
                <td>
                  <button mat-icon-button color="warn" (click)="removeRole(role)" [disabled]="removingRoleId === role.id" matTooltip="Remove role">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </ng-container>
        <mat-checkbox formControlName="isActive">Active</mat-checkbox>
        <!-- Password Section -->
        <div class="password-section">
          <ng-container *ngIf="!isEdit; else editPasswordSection">
            <mat-checkbox [checked]="randomPassword" (change)="toggleRandomPassword($event)">Generate random password</mat-checkbox>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" [value]="password" (input)="onPasswordInput($event)" [readonly]="randomPassword" required />
              <button mat-icon-button matSuffix (click)="toggleShowPassword()" type="button">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <button *ngIf="randomPassword" mat-icon-button matSuffix (click)="copyPassword()" type="button">
                <mat-icon>content_copy</mat-icon>
              </button>
            </mat-form-field>
            <div class="password-strength">
              <span>Password strength: </span>
              <span [ngClass]="passwordStrength">{{ passwordStrength | titlecase }}</span>
            </div>
            <div *ngIf="!password" class="mat-error" style="margin-top:4px;">Password is required</div>
          </ng-container>
          <ng-template #editPasswordSection>
            <mat-checkbox [checked]="resetPassword" (change)="toggleResetPassword($event)">Reset password</mat-checkbox>
            <div *ngIf="resetPassword" class="password-fields">
              <mat-checkbox [checked]="randomPassword" (change)="toggleRandomPassword($event)">Generate random password</mat-checkbox>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input matInput [type]="showPassword ? 'text' : 'password'" [value]="password" (input)="onPasswordInput($event)" [readonly]="randomPassword" />
                <button mat-icon-button matSuffix (click)="toggleShowPassword()" type="button">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <button *ngIf="randomPassword" mat-icon-button matSuffix (click)="copyPassword()" type="button">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </mat-form-field>
              <div class="password-strength">
                <span>Password strength: </span>
                <span [ngClass]="passwordStrength">{{ passwordStrength | titlecase }}</span>
              </div>
            </div>
          </ng-template>
        </div>
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
    .user-form { display: flex; flex-direction: column; gap: 4px; min-width: 400px; padding-top: 8px; }
    .full-width  { width: 100%; }
    .password-section { margin-top: 16px; }
    .password-fields { margin-left: 24px; margin-top: 8px; }
    .password-strength { font-size: 0.9em; margin-top: 4px; }
    .password-strength.weak { color: #d32f2f; }
    .password-strength.medium { color: #fbc02d; }
    .password-strength.strong { color: #388e3c; }
  `],
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
    this.dialogRef.close(result);
  }
}
