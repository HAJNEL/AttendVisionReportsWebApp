export interface TimeOverride {
  id: string;
  departmentId: string;
  fromTime: string; // e.g. "08:00:00"
  toTime: string;
  overrideTime: string;
}

export interface CreateTimeOverride {
  departmentId: string;
  fromTime: string;
  toTime: string;
  overrideTime: string;
}

export interface UpdateTimeOverride {
  fromTime?: string;
  toTime?: string;
  overrideTime?: string;
}
