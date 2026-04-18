import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-password-reset-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './password-reset-dialog.component.html',
  styleUrls: ['./password-reset-dialog.component.scss']
})
export class PasswordResetDialogComponent {
  form: FormGroup;
  isLoading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
     public dialogRef: MatDialogRef<PasswordResetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { onPasswordReset: (password: string) => Promise<void> }
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.error = '';
    try {
      await this.data.onPasswordReset(this.form.get('password')!.value);
      this.dialogRef.close(true);
    } catch (e: any) {
      this.error = e?.error || e?.message || 'Failed to update password.';
    } finally {
      this.isLoading = false;
    }
  }
}
