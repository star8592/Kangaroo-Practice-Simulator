#!/usr/bin/env tsx
import { createAdmin } from "../src/lib/auth";

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((value, index, values) =>
    value.startsWith("--") && values[index + 1] && !values[index + 1].startsWith("--")
      ? [[value.slice(2), values[index + 1]]]
      : [],
  ),
) as Record<string, string>;

for (const key of ["username", "name", "pin"]) {
  if (!args[key]) {
    console.error(`missing --${key}`);
    process.exit(2);
  }
}

try {
  console.log(JSON.stringify(createAdmin({
    username: args.username,
    name: args.name,
    pin: args.pin,
  }), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(3);
}
