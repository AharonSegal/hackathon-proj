/**
 * lib/db.ts
 * ----------
 * Turso (libSQL / cloud SQLite) database client — shared by all API routes.
 *
 * Design: singleton pattern — one client instance per serverless cold start.
 * This avoids creating a new connection on every function invocation.
 *
 * Tables managed:
 * - events             — calendar events with soft-delete support
 * - message_logs       — email / WhatsApp delivery log
 * - notes              — rich-text notes with soft-delete
 * - folders            — folder containers for notes and events
 * - trash              — soft-deleted entity references
 * - todos              — tasks with priority, scheduling, recurrence
 * - worklog_entries    — daily work log entries (Daily Log feature)
 * - worklog_schema     — user-defined projects / categories / technologies
 * - worklog_preferences — UI preferences for the Daily Log page
 *
 * Exports:
 * - ensureInit()            — get the db client, creating tables + indexes if needed
 * - rowToEvent()            — DB row → CalendarEvent
 * - rowToLog()              — DB row → MessageLog
 * - rowToNote()             — DB row → Note
 * - rowToFolder()           — DB row → Folder
 * - rowToTrashNote()        — DB row → TrashNote
 * - rowToTrashEvent()       — DB row → TrashEvent
 * - rowToWorklogEntry()     — DB row → WorklogEntry
 * - rowToTodo()             — DB row → Todo
 *
 * Process Flow:
 * 1. First call to ensureInit() creates the libSQL client from env vars
 * 2. Runs CREATE TABLE IF NOT EXISTS for all tables (safe to call repeatedly)
 * 3. Creates performance indexes on hot query columns
 * 4. Runs backward-compat ALTER TABLE migrations (errors silently ignored)
 * 5. Seeds initial data with INSERT OR IGNORE (idempotent)
 * 6. Sets _initialized = true — subsequent calls skip all setup steps
 * 7. Returns the client ready for queries
 */

import { createClient, type Client } from '@libsql/client';

// ── Singleton client (one per cold start) ────────────────────────────────────

let _client: Client | undefined;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL env var is not set');
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export async function ensureInit(): Promise<Client> {
  const db = getClient();
  if (_initialized) return db;

  // Create tables — IF NOT EXISTS makes this safe to call multiple times
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id                 TEXT PRIMARY KEY,
      title              TEXT NOT NULL,
      description        TEXT,
      date               TEXT NOT NULL,
      start_time         TEXT,
      end_time           TEXT,
      color              TEXT DEFAULT 'indigo',
      all_day            INTEGER DEFAULT 1,
      scheduled_email    TEXT,
      scheduled_whatsapp TEXT,
      tags               TEXT NOT NULL DEFAULT '[]',
      folder_id          TEXT,
      recurrence         TEXT NOT NULL DEFAULT 'none',
      recurrence_end     TEXT,
      deleted_at         TEXT,
      created_at         TEXT DEFAULT (datetime('now')),
      updated_at         TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      recipient    TEXT NOT NULL,
      subject      TEXT,
      message      TEXT,
      scheduled_at TEXT NOT NULL,
      sent_at      TEXT,
      error        TEXT,
      event_id     TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT 'Untitled Note',
      content    TEXT NOT NULL DEFAULT '[]',
      pinned     INTEGER NOT NULL DEFAULT 0,
      tags       TEXT NOT NULL DEFAULT '[]',
      folder_id  TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL DEFAULT 'New Folder',
      color      TEXT NOT NULL DEFAULT 'slate',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Backward-compat migrations for DBs created before these columns existed
  // (safe to re-run — try/catch ignores "column already exists")
  const backcompatMigrations = [
    'ALTER TABLE notes  ADD COLUMN folder_id  TEXT',
    'ALTER TABLE notes  ADD COLUMN deleted_at TEXT',
    "ALTER TABLE events ADD COLUMN tags          TEXT NOT NULL DEFAULT '[]'",
    'ALTER TABLE events ADD COLUMN folder_id     TEXT',
    "ALTER TABLE events ADD COLUMN recurrence    TEXT NOT NULL DEFAULT 'none'",
    'ALTER TABLE events ADD COLUMN recurrence_end TEXT',
    'ALTER TABLE events ADD COLUMN deleted_at    TEXT',
    'ALTER TABLE worklog_entries ADD COLUMN deleted_at TEXT',
  ];
  for (const sql of backcompatMigrations) {
    try { await db.execute(sql); } catch { /* column already exists — ignore */ }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS trash (
      id          TEXT PRIMARY KEY,
      entity_id   TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      deleted_at  TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      description     TEXT,
      completed       INTEGER NOT NULL DEFAULT 0,
      completed_at    TEXT,
      due_date        TEXT,
      due_time        TEXT,
      deadline        TEXT,
      priority        INTEGER NOT NULL DEFAULT 4,
      location        TEXT,
      reminder_config TEXT,
      recurrence      TEXT NOT NULL DEFAULT 'none',
      recurrence_end  TEXT,
      project         TEXT NOT NULL DEFAULT 'Inbox',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS worklog_entries (
      id               TEXT PRIMARY KEY,
      date             TEXT NOT NULL,
      day_number       INTEGER NOT NULL DEFAULT 1,
      project          TEXT NOT NULL DEFAULT '',
      categories       TEXT NOT NULL DEFAULT '[]',
      title            TEXT NOT NULL,
      description      TEXT,
      technologies     TEXT NOT NULL DEFAULT '[]',
      team_type        TEXT NOT NULL DEFAULT 'solo',
      team_size        INTEGER,
      coding_languages TEXT NOT NULL DEFAULT '[]',
      created_at       TEXT DEFAULT (datetime('now')),
      deleted_at       TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS worklog_schema (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS worklog_preferences (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  // ── Performance indexes for worklog_entries ───────────────────────────────
  // Queries filter / sort by date and project; indexes make these O(log n).
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_worklog_entries_date
    ON worklog_entries(date DESC, created_at DESC)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_worklog_entries_project
    ON worklog_entries(project)
  `);
  await db.execute(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

  // Seed worklog schema with user's real schema (INSERT OR IGNORE — idempotent)
  const _userSchema = JSON.stringify({
    "projects": ["Study","Weekeye"],
    "categories": ["bug fix","feature","meeting","research","code review","devops","documentation","backend — api development","infrastructure","data pipeline","Fullstack"],
    "projectInfos": {},
    "technologies": [
      {"name":"Python","group":"languages","subTechs":["Flask","Django","FastAPI","Pandas","NumPy","SQLAlchemy","Celery","Pytest","Pydantic","BeautifulSoup","Pytesseract","Streamlit","NLTK"]},
      {"name":"JavaScript","group":"languages","subTechs":["React","Vue","Angular","Next.js","Express.js","Node.js","jQuery","D3.js","Webpack","Vite"]},
      {"name":"TypeScript","group":"languages","subTechs":["React","Angular","Next.js","NestJS","Zod","Prisma"]},
      {"name":"C#","group":"languages","subTechs":[".NET","ASP.NET","Entity Framework","Blazor","Unity","LINQ"]},
      {"name":"Java","group":"languages","subTechs":["Spring Boot","Hibernate","Maven","Gradle","JUnit","Kafka Client"]},
      {"name":"Go","group":"languages","subTechs":["Gin","Echo","GORM","Cobra"]},
      {"name":"Rust","group":"languages","subTechs":["Tokio","Actix","Serde","Diesel"]},
      {"name":"C++","group":"languages","subTechs":["Qt","Boost","CMake","OpenCV"]},
      {"name":"PHP","group":"languages","subTechs":["Laravel","Symfony","WordPress","Composer"]},
      {"name":"Ruby","group":"languages","subTechs":["Rails","Sinatra","RSpec","Sidekiq"]},
      {"name":"Swift","group":"languages","subTechs":["SwiftUI","UIKit","Combine","CoreData"]},
      {"name":"Kotlin","group":"languages","subTechs":["Ktor","Jetpack Compose","Coroutines","Room"]},
      {"name":"SQL","group":"languages","subTechs":["PostgreSQL","MySQL","SQLite","T-SQL","PL/pgSQL"]},
      {"name":"MongoDB","group":"data_engineering","subTechs":["Mongoose","Atlas","Aggregation Pipeline","Realm"]},
      {"name":"MySQL","group":"data_engineering","subTechs":["InnoDB","MySQL Workbench","Replication"]},
      {"name":"PostgreSQL","group":"data_engineering","subTechs":["pgAdmin","PostGIS","pg_dump","Citus","TimescaleDB"]},
      {"name":"Kafka","group":"data_engineering","subTechs":["Kafka Streams","Kafka Connect","Schema Registry","KSQL","Confluent"]},
      {"name":"Redis","group":"data_engineering","subTechs":["Redis Cluster","Redis Streams","RedisJSON","Redis Pub/Sub"]},
      {"name":"Kubernetes","group":"data_engineering","subTechs":["Helm","kubectl","Istio","ArgoCD","Kustomize","K9s"]},
      {"name":"OpenShift","group":"data_engineering","subTechs":["OC CLI","Routes","BuildConfig","Operators"]},
      {"name":"Docker","group":"data_engineering","subTechs":["Docker Compose","Dockerfile","Docker Swarm","Buildkit"]},
      {"name":"Spark","group":"data_engineering","subTechs":["PySpark","Spark SQL","Spark Streaming","MLlib"]},
      {"name":"Airflow","group":"data_engineering","subTechs":["DAGs","Operators","Sensors","XComs"]},
      {"name":"Elasticsearch","group":"data_engineering","subTechs":["Kibana","Logstash","Beats","ELK Stack"]},
      {"name":"Snowflake","group":"data_engineering","subTechs":["Snowpipe","Streams","Tasks","dbt + Snowflake"]},
      {"name":"dbt","group":"data_engineering","subTechs":["dbt Core","dbt Cloud","Jinja","dbt Tests"]},
      {"name":"Terraform","group":"data_engineering","subTechs":["HCL","Terraform Cloud","Modules","State Management"]},
      {"name":"BigQuery","group":"data_engineering","subTechs":["BigQuery ML","Scheduled Queries","Data Transfer Service"]},
      {"name":"Redshift","group":"data_engineering","subTechs":["Redshift Spectrum","Redshift Serverless","COPY Command"]},
      {"name":"Cassandra","group":"data_engineering","subTechs":["CQL","DataStax","Replication Strategies"]},
      {"name":"DynamoDB","group":"data_engineering","subTechs":["DynamoDB Streams","GSI/LSI","DAX","PartiQL"]},
      {"name":"Neo4j","group":"data_engineering","subTechs":["Cypher","Graph Data Science","APOC"]},
      {"name":"ClickHouse","group":"data_engineering","subTechs":["MergeTree","Materialized Views","ClickHouse Cloud"]},
      {"name":"Flink","group":"data_engineering","subTechs":["Flink SQL","DataStream API","Flink CDC"]},
      {"name":"Hive","group":"data_engineering","subTechs":["HiveQL","Partitioning","Bucketing"]},
      {"name":"Presto/Trino","group":"data_engineering","subTechs":["Connectors","Federation","Trino CLI"]},
      {"name":"Delta Lake","group":"data_engineering","subTechs":["Time Travel","MERGE","Z-Ordering"]},
      {"name":"Iceberg","group":"data_engineering","subTechs":["Partition Evolution","Schema Evolution","Hidden Partitioning"]},
      {"name":"Databricks","group":"data_engineering","subTechs":["Notebooks","Unity Catalog","Workflows","MLflow"]},
      {"name":"Grafana","group":"data_engineering","subTechs":["Dashboards","Alerting","Loki","Tempo"]},
      {"name":"Prometheus","group":"data_engineering","subTechs":["PromQL","Alertmanager","Exporters","Thanos"]},
      {"name":"RabbitMQ","group":"data_engineering","subTechs":["Exchanges","Queues","Bindings","Management UI"]},
      {"name":"NATS","group":"data_engineering","subTechs":["JetStream","NATS Streaming","Subject-Based Messaging"]},
      {"name":"AWS","group":"cloud_and_platforms","subTechs":["EC2","S3","Lambda","RDS","ECS","EKS","SQS","SNS","CloudFormation","IAM","CloudWatch","API Gateway","Step Functions","Glue"]},
      {"name":"Azure","group":"cloud_and_platforms","subTechs":["Azure Functions","AKS","Blob Storage","Azure SQL","CosmosDB","Azure DevOps","Event Hub","Data Factory"]},
      {"name":"GCP","group":"cloud_and_platforms","subTechs":["Cloud Functions","GKE","Cloud Storage","Cloud SQL","Pub/Sub","Dataflow","Cloud Run"]},
      {"name":"Git","group":"cloud_and_platforms","subTechs":["GitHub","GitLab","Bitbucket","Git Flow","GitHub Actions","GitLab CI"]},
      {"name":"Jenkins","group":"cloud_and_platforms","subTechs":["Jenkinsfile","Pipeline","Blue Ocean","Shared Libraries"]}
    ]
  });
  await db.execute({
    sql: 'INSERT OR IGNORE INTO worklog_schema (id, data) VALUES (?, ?)',
    args: ['default', _userSchema],
  });

  // Seed worklog entries from CSV export
  type _WE = [string, string, number, string, string, string, string, string, string, number | null, string];
  const _wEntries: _WE[] = [
    ['SEED-WL-001','2026-02-18',2,'Study','["data pipeline","backend — api development"]','FastAPI-mongo-sql-redis-kafka on openshift data pipline','A project to learn how to process and format text in a data pipeline, with simultaneous producers and consumers connected to Kafka, redis integration for fast caching. Scalable and clear structure and code.','[{"tech":"Python","subTechs":["FastAPI","Pydantic"]},{"tech":"MongoDB","subTechs":[]},{"tech":"MySQL","subTechs":[]},{"tech":"Kafka","subTechs":[]},{"tech":"Redis","subTechs":[]},{"tech":"OpenShift","subTechs":[]},{"tech":"Kubernetes","subTechs":[]}]','solo',null,'2026-02-18T07:12:21.725Z'],
    ['SEED-WL-002','2026-02-23',3,'Study','["data pipeline","backend — api development"]','Image Text Pipeline — OCR to Elasticsearch','A microservices system that ingests images, extracts text via OCR, and stores the binary files in MongoDB GridFS. The extracted text flows through a Kafka pipeline where it\'s cleaned and analyzed, with all stages indexed into Elasticsearch by image_id. A Streamlit dashboard queries Elasticsearch to let users search and explore the processed results','[{"tech":"Python","subTechs":["FastAPI","Pydantic","Pytesseract"]},{"tech":"MongoDB","subTechs":[]},{"tech":"Kafka","subTechs":["Confluent"]},{"tech":"Elasticsearch","subTechs":["Kibana"]}]','solo',null,'2026-02-23T14:55:27.147Z'],
    ['SEED-WL-003','2026-02-24',4,'Study','["data pipeline","backend — api development"]','elastic search pipline','worked on classes and architecture. added image to text and text filter NLTK','[{"tech":"Python","subTechs":["FastAPI","Pydantic","Pytesseract","Streamlit","NLTK"]},{"tech":"MongoDB","subTechs":[]},{"tech":"Kafka","subTechs":["Confluent"]},{"tech":"Elasticsearch","subTechs":["Kibana"]}]','solo',null,'2026-02-24T15:17:38.784Z'],
    ['SEED-WL-004','2026-03-01',5,'Study','["data pipeline","backend — api development"]','podcast data pipline','python speach to text then labling and modding in pipline','[{"tech":"Python","subTechs":["FastAPI","Pydantic"]},{"tech":"Kafka","subTechs":["Confluent"]}]','solo',null,'2026-03-01T21:41:16.419Z'],
    ['SEED-WL-005','2026-03-02',5,'Weekeye','["backend — api development","Fullstack"]','configuration and familierizing with the code base, the repos in the whole organization','configuration and familierizing with the code base, the repos in the whole organization\nmy team is incharge of converting python scripts that are communicating with ai to fast api optimized code to manage the same task','[{"tech":"Python","subTechs":["FastAPI"]},{"tech":"C#","subTechs":[]},{"tech":"SQL","subTechs":[]}]','team',3,'2026-03-02T23:14:08.428Z'],
  ];
  for (const [id, date, dayNum, project, cats, title, desc, techs, teamType, teamSize, createdAt] of _wEntries) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO worklog_entries (id, date, day_number, project, categories, title, description, technologies, team_type, team_size, coding_languages, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
      args: [id, date, dayNum, project, cats, title, desc, techs, teamType, teamSize, createdAt],
    });
  }

  // ── Seed example data (INSERT OR IGNORE — idempotent on every cold start) ───
  const _d = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const _now = new Date().toISOString();

  // Sample todos
  for (const [id, title, days] of [
    ['SEED-TODO-001', 'Plan Shabbat dinner menu 🍽️',          2],
    ['SEED-TODO-002', 'Buy candles for Friday night 🕯️',      1],
    ['SEED-TODO-003', 'Send weekly status update to team',    0],
  ] as [string, string, number][]) {
    const ts = days === 0 ? _now : _d(days);
    await db.execute({
      sql: 'INSERT OR IGNORE INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
      args: [id, title, ts, ts],
    });
  }

  // Trashed note
  await db.execute({
    sql: 'INSERT OR IGNORE INTO notes (id, title, content, pinned, tags, deleted_at, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)',
    args: ['SEED-TRASH-NOTE-001', 'Old Shopping List', '[]', '[]', _d(3), _d(7), _d(3)],
  });
  await db.execute({
    sql: 'INSERT OR IGNORE INTO trash (id, entity_id, entity_type, deleted_at) VALUES (?, ?, ?, ?)',
    args: ['SEED-TRASH-ENTRY-001', 'SEED-TRASH-NOTE-001', 'note', _d(3)],
  });

  // Trashed event
  await db.execute({
    sql: "INSERT OR IGNORE INTO events (id, title, date, color, all_day, tags, recurrence, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)",
    args: ['SEED-TRASH-EVENT-001', 'Cancelled Team Meeting', '2026-03-10', 'rose', '[]', 'none', _d(5), _d(10), _d(5)],
  });
  await db.execute({
    sql: 'INSERT OR IGNORE INTO trash (id, entity_id, entity_type, deleted_at) VALUES (?, ?, ?, ?)',
    args: ['SEED-TRASH-ENTRY-002', 'SEED-TRASH-EVENT-001', 'event', _d(5)],
  });

  _initialized = true;
  return db;
}

// ── Row → camelCase response mappers ─────────────────────────────────────────

type Row = Record<string, unknown>;

export function rowToEvent(row: Row) {
  let scheduledEmail: unknown;
  let scheduledWhatsApp: unknown;

  if (row.scheduled_email && typeof row.scheduled_email === 'string') {
    try { scheduledEmail = JSON.parse(row.scheduled_email); } catch { /* ignore */ }
  }
  if (row.scheduled_whatsapp && typeof row.scheduled_whatsapp === 'string') {
    try { scheduledWhatsApp = JSON.parse(row.scheduled_whatsapp); } catch { /* ignore */ }
  }

  let tags: string[] = [];
  if (row.tags && typeof row.tags === 'string') {
    try { tags = JSON.parse(row.tags); } catch { /* ignore */ }
  }

  return {
    id:               row.id as string,
    title:            row.title as string,
    description:      (row.description as string | null) ?? undefined,
    date:             row.date as string,
    startTime:        (row.start_time as string | null) ?? undefined,
    endTime:          (row.end_time as string | null) ?? undefined,
    color:            (row.color as string) ?? 'indigo',
    allDay:           Boolean(row.all_day),
    scheduledEmail:   scheduledEmail,
    scheduledWhatsApp: scheduledWhatsApp,
    tags,
    folderId:         (row.folder_id as string | null) ?? null,
    recurrence:       (row.recurrence as string) ?? 'none',
    recurrenceEnd:    (row.recurrence_end as string | null) ?? undefined,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  };
}

export function rowToLog(row: Row) {
  return {
    id:          row.id as string,
    type:        row.type as 'whatsapp' | 'email',
    status:      row.status as 'pending' | 'sent' | 'failed',
    recipient:   row.recipient as string,
    subject:     (row.subject as string | null) ?? undefined,
    message:     (row.message as string) ?? '',
    scheduledAt: row.scheduled_at as string,
    sentAt:      (row.sent_at as string | null) ?? undefined,
    error:       (row.error as string | null) ?? undefined,
    eventId:     (row.event_id as string | null) ?? undefined,
    createdAt:   row.created_at as string,
  };
}

export function rowToNote(row: Row) {
  let tags: string[] = [];
  if (row.tags && typeof row.tags === 'string') {
    try { tags = JSON.parse(row.tags); } catch { /* ignore */ }
  }
  return {
    id:        row.id as string,
    title:     row.title as string,
    content:   (row.content as string) ?? '[]',
    pinned:    Boolean(row.pinned),
    tags,
    folderId:  (row.folder_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToFolder(row: Row) {
  return {
    id:        row.id as string,
    name:      row.name as string,
    color:     (row.color as string) ?? 'slate',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToTrashNote(row: Row) {
  return {
    trashId:    row.trash_id as string,
    entityId:   row.id as string,
    entityType: 'note' as const,
    deletedAt:  row.deleted_at as string,
    title:      row.title as string,
    folderId:   (row.folder_id as string | null) ?? null,
  };
}

export function rowToTrashEvent(row: Row) {
  return {
    trashId:    row.trash_id as string,
    entityId:   row.id as string,
    entityType: 'event' as const,
    deletedAt:  row.deleted_at as string,
    title:      row.title as string,
    date:       row.date as string,
    folderId:   (row.folder_id as string | null) ?? null,
  };
}

export function rowToTrashWorklogEntry(row: Row) {
  return {
    trashId:    row.trash_id as string,
    entityId:   row.id as string,
    entityType: 'worklog_entry' as const,
    deletedAt:  row.deleted_at as string,
    title:      row.title as string,
    date:       row.date as string,
    project:    row.project as string,
  };
}

export function rowToWorklogEntry(row: Row) {
  let categories: string[] = [];
  let technologies: unknown[] = [];
  let codingLanguages: string[] = [];
  try { categories = JSON.parse(row.categories as string); } catch { /* ignore */ }
  try { technologies = JSON.parse(row.technologies as string); } catch { /* ignore */ }
  try { codingLanguages = JSON.parse(row.coding_languages as string); } catch { /* ignore */ }
  return {
    id:              row.id as string,
    date:            row.date as string,
    dayNumber:       row.day_number as number,
    project:         row.project as string,
    categories,
    title:           row.title as string,
    description:     (row.description as string | null) ?? '',
    technologies,
    teamType:        (row.team_type as string) as 'solo' | 'team',
    teamSize:        (row.team_size as number | null) ?? undefined,
    codingLanguages,
    createdAt:       row.created_at as string,
  };
}

export function rowToTodo(row: Row) {
  let reminderConfig = null;
  if (row.reminder_config && typeof row.reminder_config === 'string') {
    try { reminderConfig = JSON.parse(row.reminder_config); } catch { /* ignore */ }
  }
  return {
    id:            row.id as string,
    title:         row.title as string,
    description:   (row.description as string | null) ?? null,
    completed:     Boolean(row.completed),
    completedAt:   (row.completed_at as string | null) ?? null,
    dueDate:       (row.due_date as string | null) ?? null,
    dueTime:       (row.due_time as string | null) ?? null,
    deadline:      (row.deadline as string | null) ?? null,
    priority:      (row.priority as number | null) ?? 4,
    location:      (row.location as string | null) ?? null,
    reminderConfig,
    recurrence:    (row.recurrence as string | null) ?? 'none',
    recurrenceEnd: (row.recurrence_end as string | null) ?? null,
    project:       (row.project as string | null) ?? 'Inbox',
    createdAt:     row.created_at as string,
    updatedAt:     row.updated_at as string,
  };
}
