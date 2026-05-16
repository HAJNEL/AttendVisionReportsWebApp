import { PermissionDto } from './permission.model';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  resetPassword?: boolean;
  companyId?: string | null;
  companyName?: string | null;
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  children?: Role[];
  permissions?: PermissionDto[];
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
}
