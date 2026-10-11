import { describe, expect, it } from "vitest";
import { generateDatabaseTypes, readMetadata } from "../../scripts/generate-database-types.mjs";

const column = (column_name: string, udt_name: string, ordinal_position: number) => ({
  table_name: "example",
  column_name,
  udt_name,
  ordinal_position,
  is_nullable: "NO",
  column_default: null,
  is_generated: "NEVER",
  is_identity: "NO",
  identity_generation: null,
});
const metadata = {
  views: [],
  columns: [
    column("id", "uuid", 1),
    { ...column("note", "text", 2), is_nullable: "YES" },
    { ...column("total", "numeric", 3), is_generated: "ALWAYS" },
    { ...column("active", "bool", 4), column_default: "true" },
    column("status", "sample_status", 5),
  ],
  enums: { sample_status: ["draft", "approved"] },
  relations: [
    {
      table_name: "example",
      constraint_name: "example_self_fkey",
      columns: ["id"],
      referenced_schema: "public",
      referenced_table: "example",
      referenced_columns: ["id"],
      one_to_one: true,
    },
  ],
  functions: [
    {
      name: "lookup",
      names: ["query", "id"],
      modes: ["i", "t"],
      types: ["text", "uuid"],
      defaults: 1,
      input_count: 1,
      return_type: "record",
      returns_set: true,
    },
  ],
};

describe("read-only schema type generation", () => {
  it("generates read-only view contracts without Insert/Update operations", () => {
    const output = generateDatabaseTypes({
      ...metadata,
      views: ["list_view"],
      columns: [...metadata.columns, { ...column("id", "uuid", 1), table_name: "list_view" }],
    });
    expect(output).toContain('Views: {\n"list_view": { Row: {');
    expect(output.split('"list_view":')[1].split("Functions:")[0]).not.toMatch(/Insert|Update/);
    const legacy = { ...metadata, views: undefined };
    expect(readMetadata(JSON.stringify(legacy)).views).toEqual([]);
  });
  it("accepts JSON and the escaped single-column CSV export", () => {
    const json = JSON.stringify(metadata);
    expect(readMetadata(json)).toEqual(metadata);
    expect(readMetadata(`\uFEFFschema_metadata\r\n"${json.replaceAll('"', '""')}"\r\n`)).toEqual(
      metadata,
    );
  });
  it("rejects unrelated data exports and incomplete metadata", () => {
    expect(() => readMetadata('name,email\n"test","test"')).toThrow("schema_metadata");
    expect(() => readMetadata('{"columns":[]}')).toThrow();
  });
  it("preserves required/nullable/default/generated fields and relationships", () => {
    const result = generateDatabaseTypes(metadata);
    expect(result).toContain('"id": string;');
    expect(result).toContain('"note"?: string | null;');
    expect(result).toContain('"total"?: never;');
    expect(result).toContain('"active"?: boolean;');
    expect(result).toContain('"draft" | "approved"');
    expect(result).toContain("isOneToOne: true");
    expect(result).toContain('"query"?: string | null;');
    expect(result).toContain('Returns: { "id": string; }[]');
    expect(result).not.toMatch(/\bany\b/);
  });
  it("produces deterministic output independent of column order", () => {
    expect(generateDatabaseTypes({ ...metadata, columns: [...metadata.columns].reverse() })).toBe(
      generateDatabaseTypes(metadata),
    );
  });
  it("stops instead of guessing unsupported database types", () => {
    expect(() =>
      generateDatabaseTypes({ ...metadata, columns: [column("location", "geometry", 1)] }),
    ).toThrow("Unsupported PostgreSQL type");
  });
  it("stops on overloaded or unnamed RPC arguments", () => {
    expect(() =>
      generateDatabaseTypes({
        ...metadata,
        functions: [...metadata.functions, ...metadata.functions],
      }),
    ).toThrow("Overloaded function");
    expect(() =>
      generateDatabaseTypes({
        ...metadata,
        functions: [{ ...metadata.functions[0], names: null }],
      }),
    ).toThrow("Unnamed argument");
  });
});
