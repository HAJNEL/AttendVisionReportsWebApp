export type PaymentRateType = 'hourly' | 'daily' | 'monthly' | 'overtime' | 'custom';

export type PaymentRateAppliesTo = 'standard' | 'other';


export interface DepartmentPaymentRate {
  id: string;
  departmentId: string;
  rateType: PaymentRateType;
  amount: number;
  matchKey: string | null;
  appliesTo: PaymentRateAppliesTo;
  otherLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DepartmentPaymentRateInput {
  rateType: PaymentRateType;
  amount: number;
  matchKey: string | null;
  appliesTo: PaymentRateAppliesTo;
  otherLabel?: string | null;
}