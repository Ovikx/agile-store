import "fake-indexeddb/auto";
import { createStores } from "../core/Store";
import { usersStore } from "./stores";
import { populate } from "./populator";
import { User } from "./types";

beforeAll(() => {
  return new Promise<void>((resolve, reject) => {
    createStores("test", 1, [usersStore])
      .then(() => populate(usersStore, 500).then(() => resolve()))
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

  test("Valid bulk insert lots of records", () => {
    const records: User[] = [];
    const numRecords = 10000;
    for (let i = 0; i < numRecords; i++) {
      records.push({
        username: i.toString(),
        age: i,
        registrationDate: i,
        verified: !!i,
      });
    }

    usersStore
      .bulkAdd(records, false)
      .then((res) => expect(res).toBe(numRecords));
  });

  test("Invalid bulk insert lots of records (ignore errors)", async () => {
    const records: User[] = [];
    for (let i = 0; i < 10000; i++) {
      records.push({
        username: i.toString(),
        age: i,
        registrationDate: i,
        verified: !!i,
      });
    }

    await expect(usersStore.bulkAdd(records, true)).resolves.not.toThrow();
  });
});

describe("Read tests", () => {
  test("Get existing record by key", () => {
    const key = 5000;
    usersStore.getByKey(key.toString()).then((res) =>
      expect(res).toMatchObject<User>({
        username: key.toString(),
        age: key,
        registrationDate: key,
        verified: !!key,
      }),
    );
  });

  test("Get nonexistent record by key", () => {
    const key = -1;
    usersStore.getByKey(key.toString()).then((res) => expect(res).toBeNull());
  });
});
