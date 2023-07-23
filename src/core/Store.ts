import { SearchQualifier, StoreConfig } from "../types/types";
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
      "readwrite",
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
  async addMany(
    records: T[],
    ignoreErrors: boolean,
    transaction?: IDBTransaction,
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
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

      // To keep track of successfully added records
      let addedCount = 0;

      /**
       * Function to call when no error has occured (ignoreError == true counts as a pass)
       * @param i Count of the for loop
       */
      const handlePass = (i: number, success: boolean) => {
        if (success) addedCount++;
        if (
          addedCount === records.length ||
          (ignoreErrors && i == records.length - 1)
        ) {
          if (transaction) {
            resolve(addedCount);
          } else {
            tx.oncomplete = () => {
              resolve(addedCount);
            };
          }
        }
      };

      for (let i = 0; i < records.length; i++) {
        const req = activeStore.add(records[i]);

        // Handle error
        req.onerror = (event) => {
          event.preventDefault();
          if (!ignoreErrors) {
            reject(convertDOMException(req.error));
          } else {
            handlePass(i, false);
          }
        };

        // Handle success
        req.onsuccess = () => {
          handlePass(i, true);
        };
      }

      tx.onerror = () => {
        if (!ignoreErrors) reject(convertDOMException(tx.error));
      };
    });
  }

  async deleteByKey(
    key: T[this["_cfg"]["keyPath"]],
    transaction?: IDBTransaction,
  ): Promise<void> {
    return _wrapTxOp<T, void>(
      this,
      (tx) => tx.objectStore(this._cfg.name).delete(IDBKeyRange.only(key)),
      "readwrite",
      () => {},
      transaction,
    );
  }

  // TODO: fix type to constrain the input to the actual type of keyPath instead of T[keyof T]
  /**
   * Retrieves a record from the store by the given key
   * @param key Key to find
   * @param transaction A transaction, if one has already been started
   * @returns A matching record or null if nothing has been found
   */
  async getOneByKey(
    key: T[this["_cfg"]["keyPath"]],
    transaction?: IDBTransaction,
  ): Promise<T | null> {
    return _wrapTxOp<T, T | null>(
      this,
      (tx) => tx.objectStore(this._cfg.name).get(IDBKeyRange.only(key)),
      "readonly",
      (req) => req.result ?? null,
      transaction,
    );
  }

  /**
   * Gets a record by the given index and corresponding value
   * @param index Index to search by
   * @param value Value to search for
   * @returns Object of type T if something was found, null if nothing was found
   */
  async getOneByIndex(
    index: this["_cfg"]["indices"][number],
    value: T[typeof index],
    transaction?: IDBTransaction,
  ): Promise<T | null> {
    if (!this._cfg.indices.includes(index)) {
      throw new Error(
        "The index you passed in isn't an index you listed in the constructor of this store.",
      );
    }

    return _wrapTxOp(
      this,
      (tx) =>
        tx
          .objectStore(this._cfg.name)
          .index(index)
          .get(IDBKeyRange.only(value)),
      "readonly",
      (req) => req.result ?? null,
      transaction,
    );
  }

  async getManyByKey(
    range: IDBKeyRange,
    transaction?: IDBTransaction,
  ): Promise<T[]> {
    return _wrapTxOp(
      this,
      (tx) => tx.objectStore(this._cfg.name).getAll(range),
      "readonly",
      (res) => res.result,
      transaction,
    );
  }

  async getManyByIndex(
    index: this["_cfg"]["indices"][number],
    range: IDBKeyRange,
    transaction?: IDBTransaction,
  ): Promise<T[]> {
    if (!this._cfg.indices.includes(index)) {
      throw new Error(
        "The index you passed in isn't an index you listed in the constructor of this store.",
      );
    }

    return _wrapTxOp(
      this,
      (tx) => tx.objectStore(this._cfg.name).index(index).getAll(range),
      "readonly",
      (res) => res.result,
      transaction,
    );
  }

  /**
   * Puts a record in the store (updates if key exists, adds if it doesn't)
   * @param record Record to put in the store
   * @param transaction A transaction, if one has already been started
   * @returns Void
   */
  async put(record: T, transaction?: IDBTransaction): Promise<void> {
    return _wrapTxOp(
      this,
      (tx) => tx.objectStore(this._cfg.name).put(record),
      "readwrite",
      () => {},
      transaction,
    );
  }

  /**
   * Returns an array of objects that satisfy the given qualifying function
   * @param qualifier A function that evaluates if a record satisfies the query by returning a boolean
   * @param transaction A transaction, if one has already been started
   * @returns Array of objects of type T
   */
  async filter(
    qualifier: SearchQualifier<T>,
    limit = Number.POSITIVE_INFINITY,
    transaction?: IDBTransaction,
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      // Ensure the DB is defined
      if (this.database == undefined) {
        reject(
          new Error("Database object hasn't been injected into this store."),
        );
        return;
      }

      const records: T[] = [];
      let numFound = 0;

      // Create transaction if one isn't provided already
      const tx =
        transaction ?? this.database.transaction([this._cfg.name], "readonly");

      const cursorReq = tx.objectStore(this._cfg.name).openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && numFound < limit) {
          if (qualifier(cursor.value)) {
            records.push(cursor.value);
            numFound++;
          }
          cursor.continue();
        }
      };

      cursorReq.onerror = () => {
        reject(convertDOMException(cursorReq.error));
      };

      // Handle transaction resolution if it's original
      if (!transaction) {
        tx.oncomplete = () => {
          resolve(records);
        };

        tx.onerror = () => {
          reject(convertDOMException(tx.error));
        };
      }
    });
  }

  /**
   * Returns the number of records in the store
   * @param transaction Transaction, if one has already been created
   * @returns Number of records in the store
   */
  async count(transaction?: IDBTransaction): Promise<number> {
    return _wrapTxOp<T, number>(
      this,
      (tx) => tx.objectStore(this._cfg.name).count(),
      "readonly",
      (req) => req.result,
      transaction,
    );
  }

  /**
   * Deletes all documents in the store
   * @param transaction Transaction, if one has already been created
   * @returns Void
   */
  async clear(transaction?: IDBTransaction): Promise<void> {
    return _wrapTxOp<T, void>(
      this,
      (tx) => tx.objectStore(this._cfg.name).clear(),
      "readwrite",
      () => {},
      transaction,
    );
  }
}

async function _wrapTxOp<T, K>(
  store: Store<T>,
  txOp: (tx: IDBTransaction) => IDBRequest,
  mode: IDBTransactionMode,
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
    const tx = givenTx ?? store.database.transaction([store._cfg.name], mode);

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

// async function _wrapCursorGetOp<T>(
//   store: Store<T>,
//   txOp: (tx: IDBTransaction) => IDBRequest,
//   givenTx?: IDBTransaction,
// ): Promise<T[]> {
//   return new Promise<T[]>((resolve, reject) => {
//     // Ensure the DB is defined
//     if (store.database == undefined) {
//       reject(
//         new Error("Database object hasn't been injected into this store."),
//       );
//       return;
//     }

//     const records: T[] = [];
//     let iter = 0;

//     // Create transaction if one isn't provided already
//     const tx =
//       givenTx ?? store.database.transaction([store._cfg.name], "readonly");
//     const cursorReq = txOp(tx);

//     cursorReq.onsuccess = () => {
//       const cursor = cursorReq.result;
//       if (iter == 0) console.log(cursor);
//       if (cursor) {
//         iter++;
//         records.push(cursor.value);
//         cursor.continue();
//       } else if (iter == 0) {
//         resolve(records);
//       }
//     };

//     cursorReq.onerror = () => {
//       reject(convertDOMException(cursorReq.error));
//     };

//     // Handle transaction resolution if it's original
//     if (!givenTx) {
//       tx.oncomplete = () => {
//         resolve(records);
//       };

//       tx.onerror = () => {
//         reject(convertDOMException(tx.error));
//       };
//     }
//   });
// }

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
