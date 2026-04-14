export interface PermissionDto {
  id: number;
  parentId?: number;
  name: string;
  description?: string;
  uniqueCode: string;
}

export interface CreatePermissionDto {
  parentId?: number;
  name: string;
  description?: string;
  uniqueCode: string;
}

export interface UpdatePermissionDto {
  parentId?: number;
  name: string;
  description?: string;
  uniqueCode: string;
}

export interface AssignPermissionDto {
  roleId: string;
  permissionId: number;
}
