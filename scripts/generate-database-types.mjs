import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const column = z.object({
  table_name: z.string(),
  column_name: z.string(),
  udt_name: z.string(),
  is_nullable: z.enum(["YES", "NO"]),
  column_default: z.string().nullable(),
  is_generated: z.string(),
  is_identity: z.enum(["YES", "NO"]),
  identity_generation: z.string().nullable(),
  ordinal_position: z.number(),
});
const metadataSchema = z.object({
  views: z.array(z.string()).default([]),
  columns: z.array(column).min(1),
  enums: z.record(z.string(), z.array(z.string())).nullable(),
  relations: z
    .array(
      z.object({
        table_name: z.string(),
        constraint_name: z.string(),
        columns: z.array(z.string()),
        referenced_table: z.string(),
        referenced_schema: z.string(),
        referenced_columns: z.array(z.string()),
        one_to_one: z.boolean(),
      }),
    )
    .nullable(),
  functions: z
    .array(
      z.object({
        name: z.string(),
        names: z.array(z.string()).nullable(),
        modes: z.array(z.string()).nullable(),
        types: z.array(z.string()),
        defaults: z.number(),
        input_count: z.number(),
        return_type: z.string(),
        returns_set: z.boolean(),
      }),
    )
    .nullable(),
});

/** Accepts JSON or the single-column CSV exported by database-type-metadata.sql. */
export function readMetadata(source) {
  const text = source.replace(/^\uFEFF/, "").trim();
  if (text.startsWith("{")) return metadataSchema.parse(JSON.parse(text));
  const newline = text.indexOf("\n");
  if (text.slice(0, newline).trim().replaceAll('"', "") !== "schema_metadata") {
    throw new Error("Expected a schema_metadata export, not application data");
  }
  const cell = text.slice(newline + 1).trim();
  if (!cell.startsWith('"') || !cell.endsWith('"')) throw new Error("Invalid metadata CSV");
  return metadataSchema.parse(JSON.parse(cell.slice(1, -1).replaceAll('""', '"')));
}

export function generateDatabaseTypes(input) {
  const metadata = metadataSchema.parse(input);
  const enums = metadata.enums ?? {};
  const tables = [...new Set(metadata.columns.map((c) => c.table_name))]
    .filter((name) => !metadata.views.includes(name))
    .sort();
  const quote = JSON.stringify;
  function type(name) {
    if (name.startsWith("_")) return `Array<${type(name.slice(1))}>`;
    if (Object.hasOwn(enums, name)) return `Database["public"]["Enums"][${quote(name)}]`;
    if (["int2", "int4", "int8", "float4", "float8", "numeric", "oid"].includes(name))
      return "number";
    if (
      [
        "uuid",
        "text",
        "varchar",
        "bpchar",
        "date",
        "timestamp",
        "timestamptz",
        "time",
        "timetz",
        "interval",
        "bytea",
      ].includes(name)
    )
      return "string";
    if (["json", "jsonb"].includes(name)) return "Json";
    if (name === "bool") return "boolean";
    if (name === "void") return "undefined";
    if (tables.includes(name)) return `Database["public"]["Tables"][${quote(name)}]["Row"]`;
    if (metadata.views.includes(name)) return `Database["public"]["Views"][${quote(name)}]["Row"]`;
    throw new Error(`Unsupported PostgreSQL type: ${name}. Review instead of widening to any.`);
  }
  const lines = [
    "// Generated from read-only public-schema metadata; do not edit manually.",
    "// Regeneration and provenance: docs/type-safety.md.",
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];",
    "export type Database = { public: { Tables: {",
  ];
  for (const table of tables) {
    const columns = metadata.columns
      .filter((c) => c.table_name === table)
      .sort((a, b) => a.ordinal_position - b.ordinal_position);
    lines.push(`${quote(table)}: {`);
    for (const operation of ["Row", "Insert", "Update"]) {
      lines.push(`${operation}: {`);
      for (const c of columns) {
        const generated = c.is_generated !== "NEVER" || c.identity_generation === "ALWAYS";
        const optional =
          operation === "Update" ||
          (operation === "Insert" &&
            (generated ||
              c.is_identity === "YES" ||
              c.column_default !== null ||
              c.is_nullable === "YES"));
        const valueType =
          operation !== "Row" && generated
            ? "never"
            : type(c.udt_name) + (c.is_nullable === "YES" ? " | null" : "");
        lines.push(`${quote(c.column_name)}${optional ? "?" : ""}: ${valueType};`);
      }
      lines.push("};");
    }
    lines.push("Relationships: [");
    for (const relation of metadata.relations ?? []) {
      if (relation.table_name !== table || relation.referenced_schema !== "public") continue;
      lines.push(
        `{ foreignKeyName: ${quote(relation.constraint_name)}; columns: ${quote(relation.columns)}; isOneToOne: ${relation.one_to_one}; referencedRelation: ${quote(relation.referenced_table)}; referencedColumns: ${quote(relation.referenced_columns)}; },`,
      );
    }
    lines.push("]; };");
  }
  lines.push("}; Views: {");
  if (!metadata.views.length) lines.push("[_ in never]: never");
  for (const view of [...metadata.views].sort()) {
    lines.push(`${quote(view)}: { Row: {`);
    for (const c of metadata.columns
      .filter((c) => c.table_name === view)
      .sort((a, b) => a.ordinal_position - b.ordinal_position)) {
      lines.push(
        `${quote(c.column_name)}: ${type(c.udt_name)}${c.is_nullable === "YES" ? " | null" : ""};`,
      );
    }
    lines.push("}; Relationships: []; };");
  }
  lines.push("}; Functions: {");
  const seen = new Set();
  for (const fn of metadata.functions ?? []) {
    if (seen.has(fn.name)) throw new Error(`Overloaded function ${fn.name} requires review`);
    seen.add(fn.name);
    const args = [],
      output = [];
    let inputIndex = 0;
    fn.types.forEach((pgType, i) => {
      const mode = fn.modes?.[i] ?? "i";
      const name = fn.names?.[i];
      if (!name) throw new Error(`Unnamed argument in ${fn.name}`);
      if (!["i", "o", "t", "b"].includes(mode))
        throw new Error(`Unsupported argument mode ${mode}`);
      if (mode === "i" || mode === "b") {
        const optional = inputIndex >= fn.input_count - fn.defaults;
        // PostgreSQL functions accept NULL unless their implementation rejects it.
        args.push(`${quote(name)}${optional ? "?" : ""}: ${type(pgType)} | null;`);
        inputIndex++;
      }
      if (["o", "t", "b"].includes(mode)) output.push(`${quote(name)}: ${type(pgType)};`);
    });
    const result = output.length ? `{ ${output.join(" ")} }` : type(fn.return_type);
    lines.push(
      `${quote(fn.name)}: { Args: ${args.length ? `{ ${args.join(" ")} }` : "Record<PropertyKey, never>"}; Returns: ${result}${fn.returns_set ? "[]" : ""}; };`,
    );
  }
  lines.push("}; Enums: {");
  for (const name of Object.keys(enums).sort())
    lines.push(`${quote(name)}: ${enums[name].map(quote).join(" | ")};`);
  lines.push(
    "}; CompositeTypes: { [_ in never]: never }; }; };",
    'export type Tables<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"];',
    'export type Enums<Name extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][Name];',
  );
  return lines.join("\n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2])
    throw new Error("Pass the metadata JSON/CSV exported by scripts/database-type-metadata.sql");
  process.stdout.write(generateDatabaseTypes(readMetadata(readFileSync(process.argv[2], "utf8"))));
}
