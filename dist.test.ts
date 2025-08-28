import { describe, it, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { pathToSQLite } from "./dist";

Database.setCustomSQLite(pathToSQLite);

describe("@effect-native/libsqlite", () => {
  describe("pathToSQLite", () => {
    it("exists", async () => {
      expect(await Bun.file(pathToSQLite).exists()).toBeTrue();
    });
  });
  describe("Database", () => {
    it("can open a database", () => {
      const db = new Database(":memory:");
      expect(db).toBeInstanceOf(Database);
      expect(db.filename).toMatchInlineSnapshot(`":memory:"`);
      expect(
        db.query<{ value: number }, []>("SELECT 1 as value").get(),
      ).toEqual({
        value: 1,
      });
    });
    it("is a recent version", () => {
      const db = new Database(":memory:");

      const { version } = db
        .query<{ version: string }, []>("SELECT sqlite_version() as version")
        .get() ?? { version: "0.0.0" };

      const [_major, minor, _patch] = version
        .split(".")
        .map((it) => Number.parseInt(it, 10));

      expect(minor).toBeGreaterThanOrEqual(50);
    });
  });
});
