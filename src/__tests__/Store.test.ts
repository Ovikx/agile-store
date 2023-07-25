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

describe("Single-record reading tests with particular methods (getOneByKey, getOneByIndex)", () => {
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
});

describe("Single-record reading tests with general method (getOne)", () => {
  test("Get existing record by key (getOne)", async () => {
    const key = 500;
    await expect(
      usersStore.getOne("username", key.toString()),
    ).resolves.toMatchObject<User>({
      username: key.toString(),
      age: key,
      registrationDate: key,
      verified: !!key,
    });
  });

  test("Get nonexistent record by key (getOne)", async () => {
    const key = -1;
    await expect(
      usersStore.getOne("username", key.toString()),
    ).resolves.toBeNull();
  });

  test("Get existing record by index (getOne)", async () => {
    const key = 500;
    await expect(
      usersStore.getOne("registrationDate", key),
    ).resolves.toMatchObject<User>({
      username: key.toString(),
      age: key,
      registrationDate: key,
      verified: !!key,
    });
  });

  test("Get nonexistent record by index (getOne)", async () => {
    const key = -1;

    await expect(
      usersStore.getOne("registrationDate", key),
    ).resolves.toBeNull();
  });

  test("Get record by nonexistent index (getOne)", async () => {
    const key = 1;

    await expect(usersStore.getOne("age", key)).rejects.toThrow();
  });
});

describe("Multiple-record reading tests with particular methods (getManyByKey, getManyByIndex)", () => {
  test("Get many nonexistent records by key", async () => {
    const records = await usersStore.getManyByKey({ only: "googoogaagaa" });
    expect(records).toHaveLength(0);
  });

  test("Get many records by key", async () => {
    const records = await usersStore.getManyByKey({
      lower: "501",
      upper: "600",
    });

    expect(records).not.toHaveLength(0);
  });

  test("Get many records by nonexistent index", async () => {
    await expect(
      usersStore.getManyByIndex("age", {
        only: -1,
      }),
    ).rejects.toThrow();
  });

  test("Get many nonexistent records by index", async () => {
    await expect(
      usersStore.getManyByIndex("registrationDate", { only: -1 }),
    ).resolves.toHaveLength(0);
  });

  test("Get many records by index", async () => {
    await expect(
      usersStore.getManyByIndex("registrationDate", { lower: 1, upper: 100 }),
    ).resolves.toHaveLength(100);
  });
});

describe("Multiple-record reading tests with general method", () => {
  test("Get many nonexistent records by key (getMany)", async () => {
    const records = await usersStore.getMany("username", {
      only: "googoogaagaa",
    });
    expect(records).toHaveLength(0);
  });

  test("Get many records by key (getMany)", async () => {
    const records = await usersStore.getMany("username", {
      lower: "501",
      upper: "600",
    });

    expect(records).not.toHaveLength(0);
  });

  test("Get many records by nonexistent index (getMany)", async () => {
    await expect(
      usersStore.getMany("age", {
        only: -1,
      }),
    ).rejects.toThrow();
  });

  test("Get many nonexistent records by index (getMany)", async () => {
    await expect(
      usersStore.getMany("registrationDate", { only: -1 }),
    ).resolves.toHaveLength(0);
  });

  test("Get many records by index (getMany)", async () => {
    await expect(
      usersStore.getMany("registrationDate", { lower: 1, upper: 100 }),
    ).resolves.toHaveLength(100);
  });
});

describe("Filter tests", () => {
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

describe("Delete tests with particular methods", () => {
  test("Delete record by key", async () => {
    const key = "NONEXISTENT";
    await usersStore.add({
      username: key,
      age: 0,
      registrationDate: 0,
      verified: false,
    });

    await usersStore.deleteOne(key);
    const res = await usersStore.getOneByKey(key);

    expect(res).toBeNull();
  });

  test("Delete many by index", async () => {
    const value = 3141592;
    await usersStore.addMany(
      [
        {
          username: value.toString(),
          age: 0,
          registrationDate: value,
          verified: false,
        },
        {
          username: (value + 1).toString(),
          age: 0,
          registrationDate: value,
          verified: false,
        },
      ],
      false,
    );

    const res = await usersStore.deleteManyByIndex("registrationDate", {
      only: value,
    });

    expect(res).toBe(2);
  });

  test("Delete many by key range", async () => {
    const value = 3141592;
    await usersStore.addMany(
      [
        {
          username: value.toString(),
          age: 0,
          registrationDate: 0,
          verified: false,
        },
        {
          username: (value + 1).toString(),
          age: 0,
          registrationDate: 0,
          verified: false,
        },
      ],
      false,
    );

    await usersStore.deleteManyByKeyRange({
      lower: value.toString(),
      upper: (value + 1).toString(),
    });

    const res = await usersStore.getMany("username", {
      lower: value.toString(),
      upper: (value + 1).toString(),
    });

    expect(res).toMatchObject([undefined, undefined]);
  });
});

describe("Delete tests with general methods (deleteOne, deleteMany)", () => {
  test("Delete many by index", async () => {
    const value = 3141592;
    await usersStore.addMany(
      [
        {
          username: value.toString(),
          age: 0,
          registrationDate: value,
          verified: false,
        },
        {
          username: (value + 1).toString(),
          age: 0,
          registrationDate: value,
          verified: false,
        },
      ],
      false,
    );

    const res = await usersStore.deleteMany("registrationDate", {
      only: value,
    });

    expect(res).toBe(2);
  });

  test("Delete many by key range", async () => {
    const value = 3141592;
    await usersStore.addMany(
      [
        {
          username: value.toString(),
          age: 0,
          registrationDate: 0,
          verified: false,
        },
        {
          username: (value + 1).toString(),
          age: 0,
          registrationDate: 0,
          verified: false,
        },
      ],
      false,
    );

    await usersStore.deleteMany("username", {
      lower: value.toString(),
      upper: (value + 1).toString(),
    });

    const res = await usersStore.getMany("username", {
      lower: value.toString(),
      upper: (value + 1).toString(),
    });

    expect(res).toMatchObject([undefined, undefined]);
  });
});

describe("Update tests", () => {
  test("Update by key", async () => {
    const key = "UPDATEBYKEY";
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

  test("Partial update by key", async () => {
    const key = "PARTIALUPDATEBYKEY";
    const newAge = 18;
    const record = {
      username: key,
      age: 0,
      registrationDate: 0,
      verified: false,
    };
    await usersStore.add(record);

    await usersStore.updateOne(key, { age: newAge });
    const res = await usersStore.getOneByKey(key);

    expect(res).toMatchObject({ ...record, age: newAge });
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
