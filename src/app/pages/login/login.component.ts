import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { PasswordResetDialogComponent } from '../../components/password-reset-dialog/password-reset-dialog.component';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  hidePassword = true;
  hideConfirm = true;
  isLoading = false;
  isCheckingUsers = true;
  isRegistering = false;
  loginError = '';
  currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^\S+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  async ngOnInit(): Promise<void> {
    try {
      const exists = await this.authService.checkUsersExist();
      this.isRegistering = !exists;
    } catch {
      this.isRegistering = false;
    } finally {
      this.isCheckingUsers = false;
    }
  }

  // Login form getters
  get username() { return this.loginForm.get('username')!; }
  get password() { return this.loginForm.get('password')!; }

  // Register form getters
  get regFirstName() { return this.registerForm.get('firstName')!; }
  get regLastName() { return this.registerForm.get('lastName')!; }
  get regUsername() { return this.registerForm.get('username')!; }
  get regEmail() { return this.registerForm.get('email')!; }
  get regPassword() { return this.registerForm.get('password')!; }
  get regConfirm() { return this.registerForm.get('confirmPassword')!; }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.loginError = '';
    try {
      await this.authService.login(this.username.value, this.password.value);
      if (this.authService.mustResetPassword()) {
        const dialogRef = this.dialog.open(PasswordResetDialogComponent, {
          disableClose: true,
          data: {
            onPasswordReset: async (newPassword: string) => {
              await this.authService.updatePassword(newPassword);
            }
          }
        });
        const result = await dialogRef.afterClosed().toPromise();
        if (result) {
          this.router.navigate(['/dashboard']);
        }
        // If dialog was cancelled, do not navigate or log in
        return;
      }
      this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.loginError = err.error ?? err.message ?? 'Login failed.';
      } else {
        this.loginError = typeof err === 'string' ? err : 'Login failed. Please try again.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.loginError = '';
    try {
      await this.authService.registerFirstUser({
        username: this.regUsername.value,
        email: this.regEmail.value,
        password: this.regPassword.value,
        firstName: this.regFirstName.value,
        lastName: this.regLastName.value,
      });
      this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.loginError = err.error ?? err.message ?? 'Registration failed.';
      } else {
        this.loginError = typeof err === 'string' ? err : 'Registration failed. Please try again.';
      }
    } finally {
      this.isLoading = false;
    }
  }
}
