import { Injectable } from '@angular/core';
import { ApiService, DbConfig } from './api.service';

export type { DbConfig } from './api.service';

@Injectable({ providedIn: 'root' })
export class DatabaseService {

  constructor(private api: ApiService) {}

  getDbConfig(): Promise<DbConfig> {
    return this.api.getDbConfig();
  }

  testDbConnection(config: DbConfig): Promise<void> {
    return this.api.testDbConnection(config);
  }

  saveDbConfig(config: DbConfig): Promise<void> {
    return this.api.saveDbConfig(config);
  }
}
