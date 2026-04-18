export interface LoginResponse {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  resetPassword?: boolean;
}
