
import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { LoginResponse } from '../models/login-response.model';
import { PermissionDto } from '../models/permission.model';

export type User = LoginResponse;

const STORAGE_KEY = 'auth_user';
const PERMISSIONS_KEY = 'auth_permissions';
const TOKEN_KEY = 'auth_token';
const RESET_PASSWORD_KEY = 'reset_password';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(this.loadFromStorage());
  private resetPassword = signal<boolean>(this.loadResetPasswordFlag());

  // Store permission codes as a Set for fast lookup
  private permissionCodes = signal<Set<string>>(this.loadPermissionsFromStorage());

  readonly user = this.currentUser.asReadonly();

  readonly permissions = this.permissionCodes.asReadonly();

  constructor(private api: ApiService) {}



  async login(username: string, password: string): Promise<User> {
    const result = await this.api.login(username, password);
    const { token, resetPassword, ...user } = result;
    if (!token) throw new Error('No token in login response');
    this.currentUser.set(user as User);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    this.resetPassword.set(!!resetPassword);
    localStorage.setItem(RESET_PASSWORD_KEY, (!!resetPassword).toString());
    await this.refreshPermissions();
    return user as User;
  }

  /**
   * Returns true if the current user must reset their password.
   */
  mustResetPassword(): boolean {
    return this.resetPassword();
  }

  /**
   * Update the user's password and clear the resetPassword flag.
   */
  async updatePassword(newPassword: string): Promise<void> {
    await this.api.updatePassword(newPassword);
    this.resetPassword.set(false);
    localStorage.setItem(RESET_PASSWORD_KEY, 'false');
  }

  async checkUsersExist(): Promise<boolean> {
    return this.api.checkUsersExist();
  }


  async registerFirstUser(data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const result = await this.api.registerFirstUser(
      data.username, data.email, data.password, data.firstName, data.lastName
    );
    // result: { token, ...userFields }
    const { token, ...user } = result;
    if (!token) throw new Error('No token in register response');
    this.currentUser.set(user as User);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    await this.refreshPermissions();
    return user as User;
  }


  logout(): void {
    this.currentUser.set(null);
    this.permissionCodes.set(new Set());
    this.resetPassword.set(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(RESET_PASSWORD_KEY);
  }
  /**
   * Load resetPassword flag from localStorage.
   */
  private loadResetPasswordFlag(): boolean {
    try {
      const raw = localStorage.getItem(RESET_PASSWORD_KEY);
      return raw === 'true';
    } catch {
      return false;
    }
  }


  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /**
   * Checks if the current user has the given permission code (case-insensitive).
   */
  hasPermission(code: string): boolean {
    if (!code) {
      return false;
    }
    const codes = this.permissionCodes();
    const result = codes.has(code.toLowerCase());
    return result;
  }

  /**
   * Fetch all permissions for the user from the backend and store unique codes in localStorage.
   * This method is now public so it can be called after permission changes.
   */
  async refreshPermissions(): Promise<void> {
    try {
      const permissions: PermissionDto[] = await this.api.getUserPermissions();
      const allCodes = new Set<string>(
        permissions.filter(p => p.uniqueCode).map(p => p.uniqueCode.toLowerCase())
      );
      this.permissionCodes.set(allCodes);
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(Array.from(allCodes)));
      console.log('[refreshPermissions] Permissions fetched from backend:', permissions);
      console.log('[refreshPermissions] Codes stored in localStorage:', Array.from(allCodes));
    } catch (e) {
      this.permissionCodes.set(new Set());
      localStorage.removeItem(PERMISSIONS_KEY);
      console.error('[refreshPermissions] Failed to fetch permissions:', e);
    }
  }

  /**
   * Load permissions from localStorage (if present) on service init.
   */
  private loadPermissionsFromStorage(): Set<string> {
    try {
      const raw = localStorage.getItem(PERMISSIONS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set((arr as string[]).map(x => x.toLowerCase()));
    } catch {
      return new Set();
    }
  }

  private loadFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
