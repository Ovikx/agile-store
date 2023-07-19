export class Database {
  _db: IDBDatabase;
  constructor(db: IDBDatabase) {
    this._db = db;
  }
}
