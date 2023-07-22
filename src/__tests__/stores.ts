import { Store } from "../core/Store";
import { User } from "./types";

export const usersStore = new Store<User>({
  name: "users",
  keyPath: "username",
  indices: ["registrationDate"],
});
