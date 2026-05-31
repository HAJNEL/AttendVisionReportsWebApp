import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { DynamicDialogComponent, DynamicDialogConfig } from '../../../../shared/components/dynamic-dialog/dynamic-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  DepartmentPaymentRate,
  DepartmentPaymentRateInput,
  PaymentRateAppliesTo,
  PaymentRateType,
} from '../../../../models/department-payment-rate.model';
import { ApiService } from '../../../../services/api.service';

type PaymentRateDialogResult = {
  updated: boolean;
  localOnly: boolean;
};

@Component({
  selector: 'app-payment-rates-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    DynamicDialogComponent,
  ],
  templateUrl: './payment-rates-dialog.component.html',
  styleUrls: ['./payment-rates-dialog.component.scss'],
})
export class PaymentRatesDialogComponent implements OnInit {
  readonly rateTypes: Array<{ value: PaymentRateType; label: string; hint: string }> = [
    { value: 'hourly', label: 'Hourly', hint: 'Used for standard per-hour payroll calculations.' },
    { value: 'daily', label: 'Daily', hint: 'Applies a single rate for a completed work day.' },
    { value: 'monthly', label: 'Monthly', hint: 'Useful for salaried or fixed-rate reporting.' },
    { value: 'overtime', label: 'Overtime', hint: 'Captures separate overtime compensation.' },
    { value: 'custom', label: 'Custom', hint: 'Use a custom category when the standard rate types do not fit.' },
  ];

  readonly appliesToOptions: Array<{ value: PaymentRateAppliesTo; label: string; note: string }> = [
    { value: 'standard', label: 'Standard', note: 'Use for regular employees in this department.' },
    { value: 'other', label: 'Other', note: 'Use for a custom audience. You must provide a label.' },
  ];

  readonly form;

  rates: DepartmentPaymentRate[] = [];
  loading = true;
  saving = false;
  error: string | null = null;
  infoMessage: string | null = null;
  editingRateId: string | null = null;
  localOnly = false;
  hasUpdates = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { departmentId: string; departmentName: string },
    private dialogRef: MatDialogRef<PaymentRatesDialogComponent, PaymentRateDialogResult>,
    private api: ApiService,
    private fb: FormBuilder,
    private matDialog: MatDialog,
  ) {
    this.form = this.fb.group({
      appliesTo: ['standard' as PaymentRateAppliesTo, Validators.required],
      rateType: ['hourly' as PaymentRateType, Validators.required],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      otherLabel: [''],
      matchKey: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    this.form.controls.appliesTo.valueChanges.subscribe(() => this.applyDynamicValidation());
    this.form.controls.rateType.valueChanges.subscribe(() => this.applyDynamicValidation());
    this.applyDynamicValidation();
    await this.loadRates();
  }

  get editingRate(): DepartmentPaymentRate | null {
    return this.rates.find((rate) => rate.id === this.editingRateId) ?? null;
  }

  get isCustomRate(): boolean {
    return this.form.controls.rateType.value === 'custom';
  }

  get isOtherRate(): boolean {
    return this.form.controls.appliesTo.value === 'other';
  }

  async loadRates(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.rates = this.sortRates(await this.api.getDepartmentPaymentRates(this.data.departmentId));
      this.localOnly = false;
      this.infoMessage = null;
    } catch {
      this.enableLocalPreview('Payment rate endpoints are not available yet. Changes in this dialog are stored locally in your browser so you can review the experience.');
      this.rates = this.sortRates(this.readLocalRates());
    } finally {
      this.loading = false;
    }
  }

  startCreate(): void {
    this.editingRateId = null;
    this.error = null;
    this.form.reset({
      appliesTo: 'standard',
      rateType: 'hourly',
      amount: null,
      otherLabel: '',
      matchKey: '',
    });
    this.applyDynamicValidation();
  }

  startEdit(rate: DepartmentPaymentRate): void {
    this.editingRateId = rate.id;
    this.error = null;
    this.form.reset({
      appliesTo: rate.appliesTo,
      rateType: rate.rateType,
      amount: rate.amount,
      otherLabel: rate.otherLabel ?? '',
      matchKey: rate.matchKey ?? '',
    });
    this.applyDynamicValidation();
  }

  cancelEdit(): void {
    this.startCreate();
  }

  async save(): Promise<void> {
    this.error = null;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload = this.toPayload();
    const duplicate = this.findDuplicate(payload);
    if (duplicate) {
      this.error = 'A payment rate with the same audience, type, and label already exists.';
      return;
    }

    this.saving = true;
    try {
      if (this.localOnly) {
        this.saveLocally(payload);
      } else if (this.editingRateId) {
        const updated = await this.api.updateDepartmentPaymentRate(this.editingRateId, payload);
        this.rates = this.sortRates(this.rates.map((rate) => (rate.id === updated.id ? updated : rate)));
      } else {
        const created = await this.api.createDepartmentPaymentRate(this.data.departmentId, payload);
        this.rates = this.sortRates([...this.rates, created]);
      }

      this.hasUpdates = true;
      this.startCreate();
    } catch {
      this.enableLocalPreview('Live payment rate endpoints are unavailable right now. New changes will stay in local preview mode until the backend is wired.');
      this.saveLocally(payload);
      this.hasUpdates = true;
      this.startCreate();
    } finally {
      this.saving = false;
    }
  }

  async delete(rate: DepartmentPaymentRate): Promise<void> {


    const dialogRef = this.matDialog.open(DynamicDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Payment Rate',
        icon: 'warning',
        message: `Delete the ${this.displayTitle(rate)} rate for ${this.data.departmentName}?`,
        buttons: [
          { label: 'Cancel', color: undefined, value: false, icon: undefined },
          { label: 'Delete', color: 'warn', value: true, icon: 'delete' },
        ],
      } as DynamicDialogConfig,
      disableClose: true,
    });
    const confirmed = await dialogRef.afterClosed().toPromise();
    if (!confirmed) {
      return;
    }

// Confirmation dialog component for delete
// (Moved to end of file to avoid 'used before its declaration' error)

    this.error = null;
    this.saving = true;
    try {
      if (this.localOnly) {
        this.deleteLocally(rate.id);
      } else {
        await this.api.deleteDepartmentPaymentRate(rate.id);
        this.rates = this.sortRates(this.rates.filter((entry) => entry.id !== rate.id));
      }
      this.hasUpdates = true;
      if (this.editingRateId === rate.id) {
        this.startCreate();
      }
    } catch {
      this.enableLocalPreview('Live payment rate endpoints are unavailable right now. Changes will stay in local preview mode until the backend is wired.');
      this.deleteLocally(rate.id);
      this.hasUpdates = true;
      if (this.editingRateId === rate.id) {
        this.startCreate();
      }
    } finally {
      this.saving = false;
    }
  }

  close(): void {
    this.dialogRef.close({ updated: this.hasUpdates, localOnly: this.localOnly });
  }

  rateTypeLabel(type: PaymentRateType): string {
    return this.rateTypes.find((option) => option.value === type)?.label ?? type;
  }

  appliesToLabel(appliesTo: PaymentRateAppliesTo, otherLabel?: string | null): string {
    if (appliesTo === 'other') {
      return otherLabel || 'Other';
    }
    return 'Standard';
  }

  displayTitle(rate: DepartmentPaymentRate): string {
    return `${this.rateTypeLabel(rate.rateType)} ${this.appliesToLabel(rate.appliesTo, rate.otherLabel)}`;
  }

  audienceDescription(rate: DepartmentPaymentRate): string {
    if (rate.appliesTo === 'other') {
      return `Applied to: ${rate.otherLabel ?? 'Other'}`;
    }
    return 'Applied to standard employees in this department.';
  }

  trackByRateId(_: number, rate: DepartmentPaymentRate): string {
    return rate.id;
  }

  private applyDynamicValidation(): void {
    const otherLabelControl = this.form.controls.otherLabel;
    const matchKeyControl = this.form.controls.matchKey;
    if (this.isOtherRate) {
      otherLabelControl.setValidators([Validators.required, Validators.maxLength(40)]);
      matchKeyControl.setValidators([Validators.required, Validators.maxLength(20)]);
    } else {
      otherLabelControl.setValidators([Validators.maxLength(40)]);
      otherLabelControl.setValue('', { emitEvent: false });
      matchKeyControl.setValidators([Validators.maxLength(20)]);
      matchKeyControl.setValue('', { emitEvent: false });
    }
    otherLabelControl.updateValueAndValidity({ emitEvent: false });
    matchKeyControl.updateValueAndValidity({ emitEvent: false });
  }

  private toPayload(): DepartmentPaymentRateInput {
    const rawAmount = this.form.controls.amount.value ?? 0;
    const rateType = this.form.controls.rateType.value ?? 'hourly';
    const appliesTo = this.form.controls.appliesTo.value ?? 'standard';
    const otherLabel = appliesTo === 'other' ? this.normalizeText(this.form.controls.otherLabel.value) : null;
    const matchKey = appliesTo === 'other' ? this.normalizeText(this.form.controls.matchKey.value) : null;

    return {
      rateType,
      appliesTo,
      amount: Number(rawAmount),
      matchKey,
      otherLabel,
    };
  }

  private findDuplicate(payload: DepartmentPaymentRateInput): DepartmentPaymentRate | undefined {
    return this.rates.find((rate) => {
      if (rate.id === this.editingRateId) {
        return false;
      }
      if (rate.appliesTo !== payload.appliesTo || rate.rateType !== payload.rateType) {
        return false;
      }
      if (payload.appliesTo === 'other') {
        return (
          (rate.otherLabel?.trim().toLowerCase() ?? '') === (payload.otherLabel?.trim().toLowerCase() ?? '') &&
          (rate.matchKey?.trim().toLowerCase() ?? '') === (payload.matchKey?.trim().toLowerCase() ?? '')
        );
      }
      return true;
    });
  }

  private saveLocally(payload: DepartmentPaymentRateInput): void {
    const now = new Date().toISOString();
    const nextRate: DepartmentPaymentRate = this.editingRate
      ? {
          ...this.editingRate,
          ...payload,
          updatedAt: now,
        }
      : {
          id: this.generateId(),
          departmentId: this.data.departmentId,
          ...payload,
          createdAt: now,
          updatedAt: now,
        };

    this.rates = this.sortRates(
      this.editingRate
        ? this.rates.map((rate) => (rate.id === this.editingRateId ? nextRate : rate))
        : [...this.rates, nextRate],
    );
    this.writeLocalRates();
  }

  private deleteLocally(rateId: string): void {
    this.rates = this.sortRates(this.rates.filter((rate) => rate.id !== rateId));
    this.writeLocalRates();
  }

  private enableLocalPreview(message: string): void {
    this.localOnly = true;
    this.infoMessage = message;
    this.error = null;
  }

  private readLocalRates(): DepartmentPaymentRate[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey());
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as DepartmentPaymentRate[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeLocalRates(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.storageKey(), JSON.stringify(this.rates));
  }

  private storageKey(): string {
    return `department-payment-rates:${this.data.departmentId}`;
  }

  private normalizeText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private duplicateToken(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private generateId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private sortRates(rates: DepartmentPaymentRate[]): DepartmentPaymentRate[] {
    return [...rates].sort((left, right) => {
      if (left.appliesTo !== right.appliesTo) {
        return left.appliesTo === 'standard' ? -1 : 1;
      }

      const titleComparison = this.displayTitle(left).localeCompare(this.displayTitle(right));
      if (titleComparison !== 0) {
        return titleComparison;
      }

      return left.rateType.localeCompare(right.rateType);
    });
  }
}