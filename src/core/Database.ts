export async function createDB(
  dbName: string,
  version?: number,
): Promise<Database> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, version);

    request.addEventListener("success", () => {
      console.log(`Opened DB instance ${dbName}`);
      resolve(new Database(request.result));
    });

    request.addEventListener("error", () => {
      console.log(request.error);
      reject(request.error);
    });
  });
}

export class Database {
  _db: IDBDatabase;
  constructor(db: IDBDatabase) {
    this._db = db;
  }
}
