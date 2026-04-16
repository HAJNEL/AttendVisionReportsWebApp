import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CompanyFormDialogData {
	company: { id?: string; name: string; description: string | null } | null;
}

@Component({
	selector: 'app-company-form-dialog',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		MatDialogModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatIconModule,
	],
	templateUrl: './company-dialog.component.html',
	styleUrls: ['./company-dialog.component.scss'],
})
export class CompanyFormDialogComponent {
	isEdit: boolean;
	form: FormGroup;

	constructor(
		public dialogRef: MatDialogRef<CompanyFormDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: CompanyFormDialogData,
	) {
		this.isEdit = !!data.company;
		const c = data.company;
		this.form = new FormGroup({
			name: new FormControl(c?.name ?? '', Validators.required),
			description: new FormControl(c?.description ?? ''),
		});
	}

	save(): void {
		if (this.form.invalid) return;
		const v = this.form.value;
		this.dialogRef.close({
			name: v.name,
			description: v.description || null,
		});
	}
}
