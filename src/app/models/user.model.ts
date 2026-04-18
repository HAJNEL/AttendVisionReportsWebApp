export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roles?: Role[];
  resetPassword?: boolean; // Indicates if user must reset password
}
import { PermissionDto } from './permission.model';

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
