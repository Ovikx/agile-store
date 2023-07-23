import { Store } from "../core/Store";
import { User } from "./types";
import { faker } from "@faker-js/faker";

faker.seed(1);

/**
 * Populates the store with fake data
 * @param store Store to populate
 */
export async function populate(
  store: Store<User>,
  numRecords: number,
): Promise<void> {
  const records: User[] = [];
  for (let i = 0; i < numRecords; i++) {
    records.push(generateRecord());
  }

  await store.addMany(records, true);
}

export function generateRecord(): User {
  return {
    username: faker.person.fullName(),
    age: faker.number.int({
      min: 13,
      max: 60,
    }),
    registrationDate: faker.date.recent().valueOf(),
    verified: faker.datatype.boolean(),
  };
}
