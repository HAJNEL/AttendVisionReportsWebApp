export interface DepartmentUserLink {
  id: string;
  departmentId: string;
  userId: string;
  assignedAt?: string;
}

export interface DepartmentEmployee {
  departmentId: string;
  departmentName: string;
  name: string;
  employeeId: string;
}
