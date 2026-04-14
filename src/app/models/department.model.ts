export interface Department {
  id: number;
  departmentName: string;
  manager: string | null;
  paymentRate: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  serialNo?: string | null;
  companyId?: string | null;
}
