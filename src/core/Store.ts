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

  /**
   * Gets a record by the given index and corresponding value
   * @param index Index to search by
   * @param value Value to search for
   * @returns Object of type T if something was found, null if nothing was found
   */
  async getByIndex(
    index: this["_cfg"]["indices"][number],
    value: T[typeof index],
  ): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this._cfg.indices.includes(index)) {
        reject(
          new Error(
            "The index you passed in isn't an index you listed in the constructor of this store.",
          ),
        );
        return;
      }

      _wrapTxOp(
        this,
        (tx) =>
          tx
            .objectStore(this._cfg.name)
            .index(index)
            .get(IDBKeyRange.only(value)),
        (req) => req.result ?? null,
      );
    });
  }
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
