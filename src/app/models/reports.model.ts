export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  filterConfig?: any;
}

export interface ReportConfigSettings {
  companyId: string | null;
  monthStartDay: number | null;
  monthEndDay: number | null;
}