import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const sourcePath = process.env.VENDOR_DIRECTORY_SOURCE
  ? path.resolve(process.env.VENDOR_DIRECTORY_SOURCE)
  : path.join(projectRoot, "app", "lib", "vendor-directory.ts");
const dryRun = process.argv.includes("--dry-run");

async function loadLocalEnvironment() {
  try {
    const source = await readFile(path.join(projectRoot, ".env.local"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // Environment variables may be supplied by the shell instead.
  }
}

function parsePrivateDirectory(source) {
  const names = new Map();

  for (const line of source.split(/\r?\n/)) {
    const candidate = line.trim().replace(/,$/, "");
    if (!candidate.startsWith("{\"id\":")) continue;

    const value = JSON.parse(candidate);
    if (typeof value.name !== "string") continue;
    const displayName = value.name.normalize("NFC").trim().replace(/\s+/g, " ");
    if (displayName) names.set(displayName, displayName);
  }

  return [...names.values()];
}

await loadLocalEnvironment();
const source = await readFile(sourcePath, "utf8");
const vendorNames = parsePrivateDirectory(source);

if (vendorNames.length === 0) {
  throw new Error("ไม่พบรายชื่อผู้ประกอบการในไฟล์ส่วนตัว");
}

if (dryRun) {
  console.log(`ตรวจพบรายชื่อไม่ซ้ำ ${vendorNames.length} รายชื่อ (ยังไม่ได้ส่งข้อมูล)`);
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("ต้องกำหนด NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY สำหรับการนำเข้าครั้งเดียว");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: existingRows, error: readError } = await supabase
  .from("vendors")
  .select("display_name")
  .range(0, 4999);

if (readError) {
  throw new Error(`อ่านตาราง vendors ไม่สำเร็จ (${readError.code ?? "unknown"}) — กรุณารัน migration ก่อน`);
}

const existingNames = new Set(
  (existingRows ?? []).map((row) => row.display_name.normalize("NFC").trim().replace(/\s+/g, " ")),
);
const rowsToInsert = vendorNames
  .filter((displayName) => !existingNames.has(displayName))
  .map((displayName) => ({ display_name: displayName, active: true }));

for (let index = 0; index < rowsToInsert.length; index += 100) {
  const batch = rowsToInsert.slice(index, index + 100);
  const { error } = await supabase.from("vendors").insert(batch);
  if (error) throw new Error(`นำเข้ารายชื่อไม่สำเร็จ (${error.code ?? "unknown"})`);
}

console.log(`นำเข้าใหม่ ${rowsToInsert.length} รายชื่อ; มีอยู่เดิม ${vendorNames.length - rowsToInsert.length} รายชื่อ`);
