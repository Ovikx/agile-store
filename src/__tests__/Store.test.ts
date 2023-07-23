import "fake-indexeddb/auto";
import { createStores } from "../core/Store";
import { usersStore } from "./stores";
import { generateRecord, populate } from "./populator";
import { User } from "./types";

beforeAll(() => {
  return new Promise<void>((resolve, reject) => {
    createStores("test", 1, [usersStore])
      .then(() => populate(usersStore, 5000).then(() => resolve()))
      .catch(() => reject());
  });
});

describe("Post-setup tests", () => {
  test("Store name", () => {
    expect(usersStore._cfg.name).toBe("users");
  });

  test("Database injection", () => {
    expect(usersStore.database).toBeDefined();
  });
});

describe("Insert tests", () => {
  test("Add fresh record", async () => {
    await expect(
      usersStore.add({
        username: "test dummy",
        age: 18,
        registrationDate: 0,
        verified: false,
      }),
    ).resolves.not.toThrow();
  });

  test("Add record with duplicate key", async () => {
    await expect(
      usersStore.add({
        username: "test dummy",
        age: 18,
        registrationDate: 0,
        verified: false,
      }),
    ).rejects.toThrow();
  });

  test("Bulk insert lots of records", async () => {
    const records: User[] = [];
    const numRecords = 1000;
    for (let i = 0; i < numRecords; i++) {
      records.push({
        username: i.toString(),
        age: i,
        registrationDate: i,
        verified: !!i,
      });
    }

    await expect(usersStore.addMany(records, false)).resolves.toBe(numRecords);
  });

  test("Bulk insert lots of duplicate records (ignore errors)", async () => {
    const records: User[] = [];
    for (let i = 0; i < 1000; i++) {
      records.push({
        username: i.toString(),
        age: i,
        registrationDate: i,
        verified: !!i,
      });
    }

    await expect(usersStore.addMany(records, true)).resolves.not.toThrow();
  });

  test("Bulk insert lots of duplicate records (allow errors)", async () => {
    const records: User[] = [];
    for (let i = 0; i < 1000; i++) {
      records.push({
        username: i.toString(),
        age: i,
        registrationDate: i,
        verified: !!i,
      });
    }

    await expect(usersStore.addMany(records, false)).rejects.toThrow();
  });
});

describe("Read tests", () => {
  test("Get existing record by key", async () => {
    const key = 500;
    await expect(
      usersStore.getOneByKey(key.toString()),
    ).resolves.toMatchObject<User>({
      username: key.toString(),
      age: key,
      registrationDate: key,
      verified: !!key,
    });
  });

  test("Get nonexistent record by key", async () => {
    const key = -1;
    await expect(usersStore.getOneByKey(key.toString())).resolves.toBeNull();
  });

  test("Get existing record by index", async () => {
    const key = 500;
    await expect(
      usersStore.getOneByIndex("registrationDate", key),
    ).resolves.toMatchObject<User>({
      username: key.toString(),
      age: key,
      registrationDate: key,
      verified: !!key,
    });
  });

  test("Get nonexistent record by index", async () => {
    const key = -1;

    await expect(
      usersStore.getOneByIndex("registrationDate", key),
    ).resolves.toBeNull();
  });

  test("Get record by nonexistent index", async () => {
    const key = 1;

    await expect(usersStore.getOneByIndex("age", key)).rejects.toThrow();
  });

  test("Get many nonexistent records by key", async () => {
    const records = await usersStore.getManyByKey(
      IDBKeyRange.only("googooggaaaga"),
    );
    expect(records).toHaveLength(0);
  });

  test("Get many records by key", async () => {
    const records = await usersStore.getManyByKey(
      IDBKeyRange.bound("501", "600"),
    );

    expect(records).not.toHaveLength(0);
  });

  test("Get many records by nonexistent index", async () => {
    await expect(
      usersStore.getManyByIndex("age", IDBKeyRange.only(-1)),
    ).rejects.toThrow();
  });

  test("Get many nonexistent records by index", async () => {
    await expect(
      usersStore.getManyByIndex("registrationDate", IDBKeyRange.only(-1)),
    ).resolves.toHaveLength(0);
  });

  test("Get many records by index", async () => {
    await expect(
      usersStore.getManyByIndex("registrationDate", IDBKeyRange.bound(1, 100)),
    ).resolves.toHaveLength(100);
  });

  test("Filter with limit", async () => {
    const key = 999;
    await expect(
      usersStore.filter((record) => record.username == key.toString(), 1),
    ).resolves.toMatchObject<User[]>([
      {
        username: key.toString(),
        age: key,
        registrationDate: key,
        verified: !!key,
      },
    ]);
  });
});

describe("Delete tests", () => {
  test("Delete record by key", async () => {
    const key = "NONEXISTENT";
    await usersStore.add({
      username: key,
      age: 0,
      registrationDate: 0,
      verified: false,
    });

    await usersStore.deleteByKey(key);
    const res = await usersStore.getOneByKey(key);

    expect(res).toBeNull();
  });
});

describe("Update tests", () => {
  test("Update by key", async () => {
    const key = "UPDATE";
    const newAge = 18;
    const record = {
      username: key,
      age: 0,
      registrationDate: 0,
      verified: false,
    };
    await usersStore.add(record);

    await usersStore.put({ ...record, age: newAge });
    const res = await usersStore.getOneByKey(key);

    expect(res?.age).toBe(newAge);
  });
});

describe("Misc. tests", () => {
  test("Clear store", async () => {
    await expect(usersStore.clear()).resolves.not.toThrow();
  });

  test("Count all records in empty store", async () => {
    const res = await usersStore.count();
    expect(res).toBe(0);
  });

  test("Count all records in populated store", async () => {
    const toAdd: User[] = [];
    for (let i = 0; i < 1000; i++) {
      toAdd.push(generateRecord());
    }
    await usersStore.addMany(toAdd, true);
    await expect(usersStore.count()).resolves.toBeGreaterThan(0);
  });
});
