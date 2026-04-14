import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { LoginResponse } from '../models/login-response.model';
import { PermissionDto } from '../models/permission.model';

export type User = LoginResponse;
  
const STORAGE_KEY = 'auth_user';
const PERMISSIONS_KEY = 'auth_permissions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(this.loadFromStorage());

  // Store permission codes as a Set for fast lookup
  private permissionCodes = signal<Set<string>>(this.loadPermissionsFromStorage());

  readonly user = this.currentUser.asReadonly();

  readonly permissions = this.permissionCodes.asReadonly();

  constructor(private api: ApiService) {}


  async login(username: string, password: string): Promise<User> {
    const user = await this.api.login(username, password);
    this.currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    await this.fetchAndStorePermissions();
    return user;
  }

  async checkUsersExist(): Promise<boolean> {
    return this.api.checkUsersExist();
  }


  async registerFirstUser(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
  }): Promise<User> {
    const user = await this.api.registerFirstUser(
      data.username, data.email, data.password, data.fullName ?? null
    );
    this.currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    await this.fetchAndStorePermissions();
    return user;
  }


  logout(): void {
    this.currentUser.set(null);
    this.permissionCodes.set(new Set());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
  }


  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /**
   * Checks if the current user has the given permission code (case-insensitive).
   */
  hasPermission(code: string): boolean {
    if (!code) return false;
    return this.permissionCodes().has(code.toLowerCase());
  }

  /**
   * Fetch all permissions for the user from the backend and store unique codes in localStorage.
   */
  private async fetchAndStorePermissions(): Promise<void> {
    try {
      const permissions: PermissionDto[] = await this.api.getUserPermissions();
      const allCodes = new Set<string>(
        permissions.filter(p => p.uniqueCode).map(p => p.uniqueCode.toLowerCase())
      );
      this.permissionCodes.set(allCodes);
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(Array.from(allCodes)));
    } catch {
      this.permissionCodes.set(new Set());
      localStorage.removeItem(PERMISSIONS_KEY);
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
