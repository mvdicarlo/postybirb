import { Injectable } from '@angular/core';
import { IdbService } from './idb.service';
import { IDataBase } from 'jsstore';
import { PostyBirbTables } from '../tables';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly DATABASE_NAME: string = 'PostyBirb_DB';

  constructor() {
    this.connection.setLogStatus(false);
    this._initJsStore();
  }

  get connection() {
    return IdbService.idbCon;
  }

  private _initJsStore(): void {
    this.connection.isDbExist(this.DATABASE_NAME)
      .then(isExist => {
        if (isExist) {
          this.connection.openDb(this.DATABASE_NAME);
        } else {
          const dataBase = this.getDatabase();
          this.connection.createDb(dataBase);
        }
      }).catch(err => {
        console.log(err.message);
      });
  }

  private getDatabase(): IDataBase {
    const dataBase: IDataBase = {
      name: this.DATABASE_NAME,
      tables: PostyBirbTables
    }

    return dataBase;
  }

  // Drops all Database data
  public dropAll(): Promise<any> {
    return this.connection.dropDb();
  }
}
