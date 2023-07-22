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

  test("Valid bulk insert lots of records", async () => {
    const records: User[] = [];
    for (let i = 0; i < 10000; i++) {
      records.push({
        username: i.toString(),
        age: i,
        registrationDate: i,
        verified: !!i,
      });
    }

    await expect(usersStore.bulkAdd(records, false)).resolves.not.toThrow();
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
