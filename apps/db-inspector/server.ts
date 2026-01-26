import postgres from 'postgres';

const DB_URL = process.env.DEV_DATABASE_URL;
if (!DB_URL) {
  console.error('DEV_DATABASE_URL environment variable is required');
  console.error('Set it in .env.local or pass it directly');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '3456', 10);
const sql = postgres(DB_URL);

interface TableInfo {
  name: string;
  type: 'table' | 'view' | 'materialized_view';
  rowCount: number;
  columns: ColumnInfo[];
  sampleData: Record<string, unknown>[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface ForeignKeyInfo {
  column: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

interface DbSummary {
  tables: number;
  views: number;
  materializedViews: number;
  totalRows: number;
  relationshipsSummary: string;
}

async function getTables() {
  return await sql`SELECT tablename as name, 'table' as type FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
}

async function getViews() {
  return await sql`SELECT viewname as name, 'view' as type FROM pg_views WHERE schemaname = 'public' ORDER BY viewname`;
}

async function getMaterializedViews() {
  return await sql`SELECT matviewname as name, 'materialized_view' as type FROM pg_matviews WHERE schemaname = 'public' ORDER BY matviewname`;
}

async function getTableInfo(tableName: string, type: string): Promise<TableInfo> {
  const columns = await sql`
    SELECT column_name as name, data_type as type, is_nullable as nullable, column_default as default
    FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName} ORDER BY ordinal_position
  `;

  const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
  const rowCount = Number(countResult[0].count);

  const sampleData = await sql`SELECT * FROM ${sql(tableName)} LIMIT 3`;

  const pkResult = await sql`
    SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ${tableName}::regclass AND i.indisprimary
  `;
  const primaryKeys = (pkResult as unknown as { attname: string }[]).map((row) => row.attname);

  const fkResult = await sql`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS references_table, ccu.column_name AS references_column,
           rc.delete_rule AS on_delete, rc.update_rule AS on_update
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${tableName} AND tc.table_schema = 'public'
  `;
  const foreignKeys = (
    fkResult as unknown as {
      column_name: string;
      references_table: string;
      references_column: string;
      on_delete: string;
      on_update: string;
    }[]
  ).map((row) => ({
    column: row.column_name,
    referencesTable: row.references_table,
    referencesColumn: row.references_column,
    onDelete: row.on_delete,
    onUpdate: row.on_update,
  }));

  const indexResult = await sql`
    SELECT i.relname AS index_name, ARRAY_AGG(a.attname) AS columns, ix.indisunique AS unique
    FROM pg_class t JOIN pg_index ix ON t.oid = ix.indrelid JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relkind = 'r' AND t.relname = ${tableName} GROUP BY i.relname, ix.indisunique
  `;
  const indexes = (
    indexResult as unknown as { index_name: string; columns: string[]; unique: boolean }[]
  ).map((row) => ({
    name: row.index_name,
    columns: row.columns,
    unique: row.unique,
  }));

  return {
    name: tableName,
    type: type as TableInfo['type'],
    rowCount,
    columns: (
      columns as unknown as {
        name: string;
        type: string;
        nullable: string;
        default: string | null;
      }[]
    ).map((col) => ({
      name: col.name,
      type: col.type,
      nullable: col.nullable === 'YES',
      default: col.default,
    })),
    sampleData,
    primaryKeys,
    foreignKeys,
    indexes,
  };
}

let cachedInfo: TableInfo[] | null = null;
let cacheTime: Date | null = null;

async function getAllDatabaseInfo(): Promise<{ summary: DbSummary; items: TableInfo[] }> {
  if (cachedInfo && cacheTime && Date.now() - cacheTime.getTime() < 3600000) {
    return buildSummary(cachedInfo);
  }

  const [tables, views, mvs] = await Promise.all([getTables(), getViews(), getMaterializedViews()]);
  const allObjects = [...tables, ...views, ...mvs].map((obj) => ({
    name: obj.name,
    type: obj.type,
  }));
  const detailedInfo = await Promise.all(allObjects.map((obj) => getTableInfo(obj.name, obj.type)));

  cachedInfo = detailedInfo;
  cacheTime = new Date();
  return buildSummary(detailedInfo);
}

function buildSummary(info: TableInfo[]): { summary: DbSummary; items: TableInfo[] } {
  const tables = info.filter((i) => i.type === 'table').length;
  const views = info.filter((i) => i.type === 'view').length;
  const materializedViews = info.filter((i) => i.type === 'materialized_view').length;
  const totalRows = info.reduce((sum, i) => sum + i.rowCount, 0);

  const rels: string[] = [];
  info.forEach((table) => {
    table.foreignKeys.forEach((fk) => {
      rels.push(
        `${table.name} references ${fk.referencesTable} (${fk.column} -> ${fk.referencesColumn})`
      );
    });
  });
  const relationshipsSummary = rels.join('; ');

  return {
    summary: { tables, views, materializedViews, totalRows, relationshipsSummary },
    items: info,
  };
}

function generateMarkdown({ summary, items }: { summary: DbSummary; items: TableInfo[] }): string {
  let md = '# Database Schema Documentation\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '## Summary\n\n';
  md += `- **Tables**: ${summary.tables}\n`;
  md += `- **Views**: ${summary.views}\n`;
  md += `- **Materialized Views**: ${summary.materializedViews}\n`;
  md += `- **Total Rows**: ${summary.totalRows.toLocaleString()}\n`;
  md += `- **Relationships**: ${summary.relationshipsSummary || 'None'}\n\n`;
  md += '---\n\n';

  for (const table of items) {
    md += `## ${table.name} (${table.type})\n\n`;
    md += `**Row Count**: ${table.rowCount.toLocaleString()}\n\n`;

    md +=
      '### Columns\n\n| Column | Type | Nullable | Default |\n|--------|------|----------|----------|\n';
    table.columns.forEach((col) => {
      md += `| ${col.name} | ${col.type} | ${col.nullable ? '✓' : '✗'} | ${col.default || '-'} |\n`;
    });

    md +=
      '\n### Primary Keys\n\n' +
      (table.primaryKeys.length ? `- ${table.primaryKeys.join(', ')}\n` : '*None*\n');

    md += '\n### Foreign Keys\n\n';
    if (table.foreignKeys.length) {
      md +=
        '| Column | References Table | References Column | On Delete | On Update |\n|--------|------------------|-------------------|-----------|-----------|\n';
      table.foreignKeys.forEach((fk) => {
        md += `| ${fk.column} | ${fk.referencesTable} | ${fk.referencesColumn} | ${fk.onDelete || '-'} | ${fk.onUpdate || '-'} |\n`;
      });
    } else md += '*None*\n';

    md += '\n### Indexes\n\n';
    if (table.indexes.length) {
      md += '| Name | Columns | Unique |\n|------|---------|--------|\n';
      table.indexes.forEach((idx) => {
        md += `| ${idx.name} | ${idx.columns.join(', ')} | ${idx.unique ? '✓' : '✗'} |\n`;
      });
    } else md += '*None*\n';

    md += '\n### Sample Data\n\n';
    if (table.sampleData.length) {
      const keys = Object.keys(table.sampleData[0]);
      md += `| ${keys.join(' | ')} |\n|${keys.map(() => '---').join('|')}|\n`;
      table.sampleData.forEach((row) => {
        md +=
          '| ' +
          keys
            .map((k) => {
              const val = row[k];
              return val === null
                ? 'NULL'
                : typeof val === 'string' && val.length > 50
                  ? `${val.substring(0, 47)}...`
                  : String(val);
            })
            .join(' | ') +
          ' |\n';
      });
    } else md += '*No data*\n';

    md += '\n---\n\n';
  }
  return md;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response(
        'Database Inspector API\n\nEndpoints:\n  /json - Full database info as JSON\n  /markdown - Full database info as Markdown\n  /prompt - LLM prompt-friendly YAML\n  /tables - List of tables\n  /table/:name - Info about specific table',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    if (url.pathname === '/json') {
      const data = await getAllDatabaseInfo();
      return Response.json(data);
    }

    if (url.pathname === '/markdown') {
      const data = await getAllDatabaseInfo();
      return new Response(generateMarkdown(data), {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    if (url.pathname === '/prompt') {
      const data = await getAllDatabaseInfo();
      const yaml = require('js-yaml');
      const promptText = `You are a database assistant. Use this schema context:\n\n${yaml.dump(data, { indent: 2 })}\n\nAnswer user queries based on this.`;
      return new Response(promptText, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    if (url.pathname === '/tables') {
      const [tables, views, mvs] = await Promise.all([
        getTables(),
        getViews(),
        getMaterializedViews(),
      ]);
      return Response.json({ tables, views, materialized_views: mvs });
    }

    if (url.pathname.startsWith('/table/')) {
      const tableName = url.pathname.split('/')[2];
      const info = await getTableInfo(tableName, 'table');
      return Response.json(info);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`http://localhost:${server.port}/markdown`);
console.log(`http://localhost:${server.port}/json`);
console.log(`http://localhost:${server.port}/prompt`);
