import { StoreConfig } from "../types/types";

export class Store<T> {
  readonly _cfg: StoreConfig<T>;
  dbInjected: boolean;
  _db: IDBDatabase | undefined;

  constructor(cfg: StoreConfig<T>) {
    this._cfg = cfg;
    this.dbInjected = false;
  }

  /**
   * Injects an active database into the `_db` property of this class
   * @param db Database to inject into the store
   */
  injectDB(db: IDBDatabase) {
    this._db = db;
    this.dbInjected = true;
  }
}

export async function createStores<const T extends Store<never>[]>(
  dbName: string,
  version: number,
  stores: T,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, version);

    /** Inject the database into each Store */
    request.onsuccess = () => {
      console.log(`Opened DB instance ${dbName}`);
      for (const store of stores) {
        store.injectDB(request.result);
        console.log(`Opened store: ${store._cfg.name}`);
      }
      resolve();
    };

    request.onerror = () => {
      console.log(request.error);
      reject(new Error(`[${request.error?.name}] ${request.error?.message}`));
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Process the configs of each store
      // This involves adding each store and indices within each store
      for (const store of stores) {
        const objStore = db.createObjectStore(store._cfg.name, {
          ...(store._cfg.keyPath && { keyPath: store._cfg.keyPath }),
          ...(store._cfg.autoIncrement && { autoIncrement: true }),
        });

        // Create indices
        if (store._cfg.indices != undefined) {
          // Ensure key isn't one of the indices
          if (
            store._cfg.keyPath &&
            store._cfg.indices.includes(store._cfg.keyPath)
          ) {
            reject(
              new Error(
                "You can't create an index for the key. Remove the key from your indices array.",
              ),
            );
          }

          // Create indices
          for (const index of store._cfg.indices as string[]) {
            objStore.createIndex(index, index);
          }
        }
      }
    };
  });
}
