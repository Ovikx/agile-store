import { StoreConfig } from "../types/types";
import { convertDOMException } from "../utils";

export class Store<T> {
  readonly _cfg: StoreConfig<T>;
  database: IDBDatabase | undefined;

  constructor(readonly cfg: StoreConfig<T>) {
    this._cfg = cfg;
  }

  /**
   * Injects an active database into the `_db` property of this class
   * @param db Database to inject into the store
   */
  injectDB(db: IDBDatabase) {
    this.database = db;
  }

  /**
   * Adds a record to the store
   * @param record Record to add to the store
   * @param transaction A transaction, if one has already been started
   * @returns Void
   */
  async add(record: T, transaction?: IDBTransaction): Promise<void> {
    return _wrapTxOp(
      this,
      (tx) => tx.objectStore(this._cfg.name).add(record),
      () => {},
      transaction,
    );
  }

  /**
   * Adds many records at once
   * @param records Records to add
   * @param ignoreErrors Whether or not to error silently
   * @param transaction Transaction to perform this operation in
   * @returns Void
   */
  async bulkAdd(
    records: T[],
    ignoreErrors: boolean,
    transaction?: IDBTransaction,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Ensure the DB is defined
      if (this.database == undefined) {
        reject(
          new Error("Database object hasn't been injected into this store."),
        );
        return;
      }

      // Create transaction if one isn't provided already
      const tx =
        transaction ?? this.database.transaction([this._cfg.name], "readwrite");

      const activeStore = tx.objectStore(this._cfg.name);
      for (let i = 0; i < records.length; i++) {
        const req = activeStore.add(records[i]);

        // Handle error
        if (!ignoreErrors) {
          req.onerror = () => {
            reject(convertDOMException(req.error));
          };
        }
        // Handle last record success
        if (i == records.length - 1) {
          req.onsuccess = () => {
            if (transaction) resolve();
          };

          if (!transaction) {
            tx.oncomplete = () => {
              resolve();
            };

            if (!ignoreErrors) {
              tx.onerror = () => {
                reject(convertDOMException(tx.error));
              };
            }
          }
        }
      }
    });
  }

  // TODO: fix type to constrain the input to the actual type of keyPath instead of T[keyof T]
  /**
   * Retrieves a record from the store by the given key
   * @param key Key to find
   * @param transaction A transaction, if one has already been started
   * @returns A matching record or null if nothing has been found
   */
  async getByKey(
    key: T[this["_cfg"]["keyPath"]],
    transaction?: IDBTransaction,
  ): Promise<T | null> {
    return _wrapTxOp<T, T | null>(
      this,
      (tx) => tx.objectStore(this._cfg.name).get(IDBKeyRange.only(key)),
      (req) => req.result ?? null,
      transaction,
    );
  }

  //async getByIndex(index: T[this["_cfg"]["indices"][number]]);
}

async function _wrapTxOp<T, K>(
  store: Store<T>,
  txOp: (tx: IDBTransaction) => IDBRequest,
  resolution: (request: IDBRequest) => K,
  givenTx?: IDBTransaction,
): Promise<K> {
  return new Promise<K>((resolve, reject) => {
    // Ensure the DB is defined
    if (store.database == undefined) {
      reject(
        new Error("Database object hasn't been injected into this store."),
      );
      return;
    }

    // Create transaction if one isn't provided already
    const tx =
      givenTx ?? store.database.transaction([store._cfg.name], "readwrite");

    // Make the request
    const req = txOp(tx);

    req.onsuccess = () => {
      // If transaction was provided, we resolve on request success and not on transaction completion
      if (givenTx) resolve(resolution(req));
    };

    req.onerror = () => {
      reject(convertDOMException(req.error));
    };

    // Handle transaction resolution if it's original
    if (!givenTx) {
      tx.oncomplete = () => {
        resolve(resolution(req));
      };

      tx.onerror = () => {
        reject(convertDOMException(tx.error));
      };
    }
  });
}

export async function createStores<T extends object>(
  dbName: string,
  version: number,
  stores: Store<T>[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

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
      reject(convertDOMException(request.error));
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Process the configs of each store
      // This involves adding each store and indices within each store
      for (const store of stores) {
        const storeExists = db.objectStoreNames.contains(store._cfg.name);
        const objStore = storeExists
          ? request.transaction!.objectStore(store._cfg.name)
          : db.createObjectStore(store._cfg.name, {
              ...((store._cfg.keyPath &&
                ({ keyPath: store._cfg.keyPath } as object)) as object),
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
