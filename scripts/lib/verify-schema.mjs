import { readFile, readdir } from "node:fs/promises";

export async function verifyMariaSchema(connection, { checkRows = false } = {}) {
  const directory = new URL("../../drizzle-mysql/meta/", import.meta.url);
  const latest = (await readdir(directory)).filter((name) => /^\d+_snapshot\.json$/.test(name)).sort().at(-1);
  if (!latest) throw new Error("MariaDB schema snapshot missing");
  const snapshot = JSON.parse(await readFile(new URL(latest, directory), "utf8"));
  const [[settings]] = await connection.query("SELECT @@SESSION.foreign_key_checks AS enabled");
  if (Number(settings.enabled) !== 1) throw new Error("MariaDB foreign key checks must be enabled");
  const [tables] = await connection.query("SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
  const [references] = await connection.query("SELECT TABLE_NAME AS child,COLUMN_NAME AS columnName,REFERENCED_TABLE_NAME AS parent,REFERENCED_COLUMN_NAME AS parentColumn FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL");
  let count = 0;
  for (const table of Object.values(snapshot.tables)) {
    if (!tables.some((actual) => actual.name === table.name && actual.engine === "InnoDB")) throw new Error(`Transactional InnoDB table required: ${table.name}`);
    for (const fk of Object.values(table.foreignKeys)) {
      for (const [index, column] of fk.columnsFrom.entries()) {
        const parentColumn = fk.columnsTo[index];
        if (!references.some((actual) => actual.child === table.name && actual.columnName === column && actual.parent === fk.tableTo && actual.parentColumn === parentColumn)) throw new Error(`Missing MariaDB foreign key: ${table.name}.${column}`);
        if (checkRows) {
          const [[result]] = await connection.query(`SELECT COUNT(*) total FROM \`${table.name}\` child WHERE child.\`${column}\` IS NOT NULL AND NOT EXISTS(SELECT 1 FROM \`${fk.tableTo}\` parent WHERE parent.\`${parentColumn}\`=child.\`${column}\`)`);
          if (Number(result.total)) throw new Error(`Orphan rows: ${table.name}.${column}`);
        }
        count++;
      }
    }
  }
  return { applicationTables: Object.keys(snapshot.tables).length, foreignKeys: count, orphanRows: checkRows ? 0 : "not-checked" };
}
