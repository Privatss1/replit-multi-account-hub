"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");

// ─── Data directory ───────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR ||
  path.join(os.homedir(), "AppData", "Roaming", "ReplitHub");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "database.db");

[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const PORT = process.env.PORT || 7891;
const FRONTEND_DIR = path.join(__dirname, "frontend");

// ─── sql.js (pure WASM, no compilation needed) ───────────────────────────────
let db;

function saveDb() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error("[db] save error:", e.message);
  }
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function insert(tableSql, params = []) {
  db.run(tableSql, params);
  const id = db.exec("SELECT last_insert_rowid()")[0]?.values?.[0]?.[0];
  saveDb();
  return id;
}

function iso() {
  return new Date().toISOString();
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      avatar_url TEXT,
      messages_used INTEGER NOT NULL DEFAULT 0,
      messages_limit INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      repl_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS project_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, account_id)
    );
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      importance INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'note',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      label TEXT NOT NULL,
      key TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      project_id INTEGER,
      account_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const mask = (s) => (!s || s.length <= 8) ? "****" : s.slice(0, 4) + "****" + s.slice(-4);

function fmtAccount(a) {
  return {
    id: a.id, name: a.name, username: a.username,
    tokenMasked: mask(a.token), status: a.status,
    avatarUrl: a.avatar_url ?? null,
    messagesUsed: a.messages_used | 0,
    messagesLimit: a.messages_limit | 0,
    usagePercent: (a.messages_limit | 0) > 0
      ? Math.round(((a.messages_used | 0) / (a.messages_limit | 0)) * 100) : 0,
    createdAt: a.created_at,
  };
}

function fmtProject(p) {
  const ac = get("SELECT COUNT(*) as c FROM project_accounts WHERE project_id=?", [p.id])?.c ?? 0;
  const mc = get("SELECT COUNT(*) as c FROM memories WHERE project_id=?", [p.id])?.c ?? 0;
  return {
    id: p.id, name: p.name, description: p.description ?? null,
    replUrl: p.repl_url ?? null, status: p.status,
    accountCount: ac | 0, memoryCount: mc | 0,
    createdAt: p.created_at, updatedAt: p.updated_at,
  };
}

const fmtMemory = (m) => ({
  id: m.id, projectId: m.project_id, title: m.title,
  content: m.content, category: m.category, importance: m.importance | 0,
  createdAt: m.created_at, updatedAt: m.updated_at,
});

const fmtSkill = (s) => ({
  id: s.id, name: s.name, description: s.description,
  prompt: s.prompt, category: s.category, usageCount: s.usage_count | 0,
  createdAt: s.created_at,
});

const fmtKnowledge = (k) => ({
  id: k.id, projectId: k.project_id ?? null, title: k.title,
  content: k.content, type: k.type, tags: k.tags, createdAt: k.created_at,
});

const fmtApiKey = (k) => ({
  id: k.id, service: k.service, label: k.label,
  keyMasked: mask(k.key), isActive: !!k.is_active, createdAt: k.created_at,
});

function fmtConversation(c) {
  const msgCount = get("SELECT COUNT(*) as cnt FROM messages WHERE conversation_id=?", [c.id])?.cnt ?? 0;
  const lastMsg = get("SELECT created_at FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1", [c.id]);
  const account = get("SELECT name FROM accounts WHERE id=?", [c.account_id]);
  return {
    id: c.id, projectId: c.project_id, accountId: c.account_id,
    accountName: account?.name ?? "Unknown", title: c.title,
    messageCount: msgCount | 0, lastMessageAt: lastMsg?.created_at ?? null,
    createdAt: c.created_at,
  };
}

const fmtMessage = (m) => ({
  id: m.id, conversationId: m.conversation_id, role: m.role,
  content: m.content, attachments: m.attachments ?? null, createdAt: m.created_at,
});

function addActivity(type, description, projectId = null, accountId = null) {
  insert("INSERT INTO activity (type, description, project_id, account_id) VALUES (?,?,?,?)",
    [type, description, projectId, accountId]);
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
if (fs.existsSync(FRONTEND_DIR)) app.use(express.static(FRONTEND_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

// ACCOUNTS
app.get("/api/accounts", (_, res) => res.json(all("SELECT * FROM accounts ORDER BY created_at").map(fmtAccount)));

app.post("/api/accounts", (req, res) => {
  const { name, username, token } = req.body;
  if (!name || !username || !token) return res.status(400).json({ error: "name, username, token required" });
  const id = insert("INSERT INTO accounts (name, username, token) VALUES (?,?,?)", [name, username, token]);
  const a = get("SELECT * FROM accounts WHERE id=?", [id]);
  addActivity("account_added", `Account "${name}" connected`, null, id);
  res.status(201).json(fmtAccount(a));
});

app.get("/api/accounts/:id", (req, res) => {
  const a = get("SELECT * FROM accounts WHERE id=?", [req.params.id]);
  if (!a) return res.status(404).json({ error: "Not found" });
  res.json(fmtAccount(a));
});

app.patch("/api/accounts/:id", (req, res) => {
  const a = get("SELECT * FROM accounts WHERE id=?", [req.params.id]);
  if (!a) return res.status(404).json({ error: "Not found" });
  const { name, username, token, status, messagesUsed, messagesLimit } = req.body;
  run(`UPDATE accounts SET
    name=COALESCE(?,name), username=COALESCE(?,username), token=COALESCE(?,token),
    status=COALESCE(?,status), messages_used=COALESCE(?,messages_used),
    messages_limit=COALESCE(?,messages_limit), updated_at=? WHERE id=?`,
    [name ?? null, username ?? null, token ?? null, status ?? null,
     messagesUsed ?? null, messagesLimit ?? null, iso(), req.params.id]);
  res.json(fmtAccount(get("SELECT * FROM accounts WHERE id=?", [req.params.id])));
});

app.delete("/api/accounts/:id", (req, res) => {
  run("DELETE FROM accounts WHERE id=?", [req.params.id]);
  res.status(204).send();
});

app.post("/api/accounts/:id/verify", async (req, res) => {
  const a = get("SELECT * FROM accounts WHERE id=?", [req.params.id]);
  if (!a) return res.status(404).json({ error: "Not found" });
  try {
    const r = await fetch("https://replit.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": `connect.sid=${a.token}`,
      },
      body: JSON.stringify({ query: "query { currentUser { username } }" }),
    });
    const data = await r.json();
    const username = data?.data?.currentUser?.username;
    if (username) {
      run("UPDATE accounts SET status='active', updated_at=? WHERE id=?", [iso(), a.id]);
      res.json({ valid: true, username, message: "Token is valid" });
    } else {
      run("UPDATE accounts SET status='error', updated_at=? WHERE id=?", [iso(), a.id]);
      res.json({ valid: false, username: "", message: "Token invalid or expired" });
    }
  } catch {
    run("UPDATE accounts SET status='error', updated_at=? WHERE id=?", [iso(), a.id]);
    res.json({ valid: false, username: "", message: "Connection failed" });
  }
});

// PROJECTS
app.get("/api/projects", (_, res) => res.json(all("SELECT * FROM projects ORDER BY created_at").map(fmtProject)));

app.post("/api/projects", (req, res) => {
  const { name, description, replUrl } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const id = insert("INSERT INTO projects (name, description, repl_url) VALUES (?,?,?)",
    [name, description ?? null, replUrl ?? null]);
  const p = get("SELECT * FROM projects WHERE id=?", [id]);
  addActivity("project_created", `Project "${name}" created`, id);
  res.status(201).json(fmtProject(p));
});

app.get("/api/projects/:id", (req, res) => {
  const p = get("SELECT * FROM projects WHERE id=?", [req.params.id]);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(fmtProject(p));
});

app.patch("/api/projects/:id", (req, res) => {
  const p = get("SELECT * FROM projects WHERE id=?", [req.params.id]);
  if (!p) return res.status(404).json({ error: "Not found" });
  const { name, description, replUrl, status } = req.body;
  run(`UPDATE projects SET name=COALESCE(?,name), description=COALESCE(?,description),
    repl_url=COALESCE(?,repl_url), status=COALESCE(?,status), updated_at=? WHERE id=?`,
    [name ?? null, description ?? null, replUrl ?? null, status ?? null, iso(), req.params.id]);
  res.json(fmtProject(get("SELECT * FROM projects WHERE id=?", [req.params.id])));
});

app.delete("/api/projects/:id", (req, res) => {
  run("DELETE FROM projects WHERE id=?", [req.params.id]);
  res.status(204).send();
});

app.get("/api/projects/:id/accounts", (req, res) => {
  res.json(all("SELECT a.* FROM project_accounts pa JOIN accounts a ON pa.account_id=a.id WHERE pa.project_id=?",
    [req.params.id]).map(fmtAccount));
});

app.post("/api/projects/:id/accounts", (req, res) => {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: "accountId required" });
  try { run("INSERT INTO project_accounts (project_id, account_id) VALUES (?,?)", [req.params.id, accountId]); } catch { /* duplicate */ }
  const a = get("SELECT * FROM accounts WHERE id=?", [accountId]);
  if (!a) return res.status(404).json({ error: "Account not found" });
  const p = get("SELECT * FROM projects WHERE id=?", [req.params.id]);
  addActivity("account_linked", `Account "${a.name}" linked to "${p?.name ?? req.params.id}"`, Number(req.params.id), accountId);
  res.json(fmtAccount(a));
});

app.delete("/api/projects/:id/accounts/:accountId", (req, res) => {
  run("DELETE FROM project_accounts WHERE project_id=? AND account_id=?", [req.params.id, req.params.accountId]);
  res.status(204).send();
});

// MEMORIES
app.get("/api/memories", (req, res) => {
  const { projectId, category } = req.query;
  let q = "SELECT * FROM memories WHERE 1=1";
  const p = [];
  if (projectId) { q += " AND project_id=?"; p.push(projectId); }
  if (category) { q += " AND category=?"; p.push(category); }
  q += " ORDER BY importance DESC, created_at";
  res.json(all(q, p).map(fmtMemory));
});

app.post("/api/memories", (req, res) => {
  const { projectId, title, content, category = "general", importance = 3 } = req.body;
  if (!projectId || !title || !content) return res.status(400).json({ error: "projectId, title, content required" });
  const id = insert("INSERT INTO memories (project_id, title, content, category, importance) VALUES (?,?,?,?,?)",
    [projectId, title, content, category, importance]);
  res.status(201).json(fmtMemory(get("SELECT * FROM memories WHERE id=?", [id])));
});

app.patch("/api/memories/:id", (req, res) => {
  if (!get("SELECT id FROM memories WHERE id=?", [req.params.id])) return res.status(404).json({ error: "Not found" });
  const { title, content, category, importance } = req.body;
  run("UPDATE memories SET title=COALESCE(?,title), content=COALESCE(?,content), category=COALESCE(?,category), importance=COALESCE(?,importance), updated_at=? WHERE id=?",
    [title ?? null, content ?? null, category ?? null, importance ?? null, iso(), req.params.id]);
  res.json(fmtMemory(get("SELECT * FROM memories WHERE id=?", [req.params.id])));
});

app.delete("/api/memories/:id", (req, res) => {
  run("DELETE FROM memories WHERE id=?", [req.params.id]);
  res.status(204).send();
});

// SKILLS
app.get("/api/skills", (req, res) => {
  const { category } = req.query;
  let q = "SELECT * FROM skills WHERE 1=1";
  const p = [];
  if (category) { q += " AND category=?"; p.push(category); }
  q += " ORDER BY usage_count DESC";
  res.json(all(q, p).map(fmtSkill));
});

app.post("/api/skills", (req, res) => {
  const { name, description, prompt, category = "general" } = req.body;
  if (!name || !description || !prompt) return res.status(400).json({ error: "name, description, prompt required" });
  const id = insert("INSERT INTO skills (name, description, prompt, category) VALUES (?,?,?,?)",
    [name, description, prompt, category]);
  res.status(201).json(fmtSkill(get("SELECT * FROM skills WHERE id=?", [id])));
});

app.patch("/api/skills/:id", (req, res) => {
  if (!get("SELECT id FROM skills WHERE id=?", [req.params.id])) return res.status(404).json({ error: "Not found" });
  const { name, description, prompt, category } = req.body;
  run("UPDATE skills SET name=COALESCE(?,name), description=COALESCE(?,description), prompt=COALESCE(?,prompt), category=COALESCE(?,category), updated_at=? WHERE id=?",
    [name ?? null, description ?? null, prompt ?? null, category ?? null, iso(), req.params.id]);
  res.json(fmtSkill(get("SELECT * FROM skills WHERE id=?", [req.params.id])));
});

app.delete("/api/skills/:id", (req, res) => {
  run("DELETE FROM skills WHERE id=?", [req.params.id]);
  res.status(204).send();
});

// KNOWLEDGE
app.get("/api/knowledge", (req, res) => {
  const { projectId, type } = req.query;
  let q = "SELECT * FROM knowledge WHERE 1=1";
  const p = [];
  if (projectId) { q += " AND project_id=?"; p.push(projectId); }
  if (type) { q += " AND type=?"; p.push(type); }
  q += " ORDER BY created_at";
  res.json(all(q, p).map(fmtKnowledge));
});

app.post("/api/knowledge", (req, res) => {
  const { projectId, title, content, type = "note", tags = "" } = req.body;
  if (!title || !content) return res.status(400).json({ error: "title, content required" });
  const id = insert("INSERT INTO knowledge (project_id, title, content, type, tags) VALUES (?,?,?,?,?)",
    [projectId ?? null, title, content, type, tags]);
  res.status(201).json(fmtKnowledge(get("SELECT * FROM knowledge WHERE id=?", [id])));
});

app.patch("/api/knowledge/:id", (req, res) => {
  if (!get("SELECT id FROM knowledge WHERE id=?", [req.params.id])) return res.status(404).json({ error: "Not found" });
  const { title, content, type, tags } = req.body;
  run("UPDATE knowledge SET title=COALESCE(?,title), content=COALESCE(?,content), type=COALESCE(?,type), tags=COALESCE(?,tags), updated_at=? WHERE id=?",
    [title ?? null, content ?? null, type ?? null, tags ?? null, iso(), req.params.id]);
  res.json(fmtKnowledge(get("SELECT * FROM knowledge WHERE id=?", [req.params.id])));
});

app.delete("/api/knowledge/:id", (req, res) => {
  run("DELETE FROM knowledge WHERE id=?", [req.params.id]);
  res.status(204).send();
});

// API KEYS
app.get("/api/apikeys", (_, res) => res.json(all("SELECT * FROM api_keys ORDER BY service").map(fmtApiKey)));

app.post("/api/apikeys", (req, res) => {
  const { service, label, key } = req.body;
  if (!service || !label || !key) return res.status(400).json({ error: "service, label, key required" });
  const id = insert("INSERT INTO api_keys (service, label, key) VALUES (?,?,?)", [service, label, key]);
  res.status(201).json(fmtApiKey(get("SELECT * FROM api_keys WHERE id=?", [id])));
});

app.patch("/api/apikeys/:id", (req, res) => {
  if (!get("SELECT id FROM api_keys WHERE id=?", [req.params.id])) return res.status(404).json({ error: "Not found" });
  const { service, label, key, isActive } = req.body;
  run("UPDATE api_keys SET service=COALESCE(?,service), label=COALESCE(?,label), key=COALESCE(?,key), is_active=COALESCE(?,is_active), updated_at=? WHERE id=?",
    [service ?? null, label ?? null, key ?? null, isActive != null ? (isActive ? 1 : 0) : null, iso(), req.params.id]);
  res.json(fmtApiKey(get("SELECT * FROM api_keys WHERE id=?", [req.params.id])));
});

app.delete("/api/apikeys/:id", (req, res) => {
  run("DELETE FROM api_keys WHERE id=?", [req.params.id]);
  res.status(204).send();
});

// CONVERSATIONS
app.get("/api/conversations", (req, res) => {
  const { projectId, accountId } = req.query;
  let q = "SELECT * FROM conversations WHERE 1=1";
  const p = [];
  if (projectId) { q += " AND project_id=?"; p.push(projectId); }
  if (accountId) { q += " AND account_id=?"; p.push(accountId); }
  q += " ORDER BY updated_at DESC";
  res.json(all(q, p).map(fmtConversation));
});

app.get("/api/conversations/:id/messages", (req, res) => {
  res.json(all("SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at", [req.params.id]).map(fmtMessage));
});

app.post("/api/conversations/:id/send", (req, res) => {
  const { content, attachments } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });
  const conv = get("SELECT * FROM conversations WHERE id=?", [req.params.id]);
  if (!conv) return res.status(404).json({ error: "Not found" });
  const msgId = insert("INSERT INTO messages (conversation_id, role, content, attachments) VALUES (?,?,?,?)",
    [conv.id, "user", content, attachments ?? null]);
  const account = get("SELECT * FROM accounts WHERE id=?", [conv.account_id]);
  if (account) {
    const newUsed = Math.min((account.messages_used | 0) + 1, account.messages_limit | 0);
    run("UPDATE accounts SET messages_used=?, updated_at=? WHERE id=?", [newUsed, iso(), account.id]);
    if (newUsed >= (account.messages_limit | 0) * 0.8) {
      addActivity("limit_warning", `Account "${account.name}" at ${Math.round(newUsed / (account.messages_limit | 0) * 100)}% limit`, conv.project_id, account.id);
    }
  }
  run("UPDATE conversations SET updated_at=? WHERE id=?", [iso(), conv.id]);
  res.status(201).json(fmtMessage(get("SELECT * FROM messages WHERE id=?", [msgId])));
});

app.post("/api/projects/:id/chat", (req, res) => {
  const { accountId, title, initialMessage } = req.body;
  if (!accountId || !title) return res.status(400).json({ error: "accountId, title required" });
  const convId = insert("INSERT INTO conversations (project_id, account_id, title) VALUES (?,?,?)",
    [req.params.id, accountId, title]);
  if (initialMessage) insert("INSERT INTO messages (conversation_id, role, content) VALUES (?,?,?)", [convId, "user", initialMessage]);
  const account = get("SELECT * FROM accounts WHERE id=?", [accountId]);
  const project = get("SELECT * FROM projects WHERE id=?", [req.params.id]);
  addActivity("chat_started", `Chat on "${project?.name}" with "${account?.name}"`, Number(req.params.id), accountId);
  res.status(201).json(fmtConversation(get("SELECT * FROM conversations WHERE id=?", [convId])));
});

// DASHBOARD
app.get("/api/dashboard/summary", (_, res) => {
  const cnt = (q) => get(q)?.c ?? 0;
  res.json({
    totalAccounts: cnt("SELECT COUNT(*) as c FROM accounts"),
    activeAccounts: cnt("SELECT COUNT(*) as c FROM accounts WHERE status='active'"),
    totalProjects: cnt("SELECT COUNT(*) as c FROM projects"),
    activeProjects: cnt("SELECT COUNT(*) as c FROM projects WHERE status='active'"),
    totalMemories: cnt("SELECT COUNT(*) as c FROM memories"),
    totalSkills: cnt("SELECT COUNT(*) as c FROM skills"),
    totalConversations: cnt("SELECT COUNT(*) as c FROM conversations"),
    totalMessages: cnt("SELECT COUNT(*) as c FROM messages"),
  });
});

app.get("/api/dashboard/recent-activity", (_, res) => {
  const rows = all(`
    SELECT a.*, p.name as project_name, acc.name as account_name
    FROM activity a
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN accounts acc ON a.account_id = acc.id
    ORDER BY a.created_at DESC LIMIT 30
  `);
  res.json(rows.map(r => ({
    id: r.id, type: r.type, description: r.description,
    projectName: r.project_name ?? null, accountName: r.account_name ?? null,
    createdAt: r.created_at,
  })));
});

app.get("/api/healthz", (_, res) => res.json({ status: "ok" }));

// SPA fallback
app.get("*", (req, res) => {
  const idx = path.join(FRONTEND_DIR, "index.html");
  if (fs.existsSync(idx)) res.sendFile(idx);
  else res.json({ status: "API only — frontend not found" });
});

// ─── Init DB and start ────────────────────────────────────────────────────────
async function main() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log(`[db] Loaded existing database from ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(`[db] Created new database at ${DB_PATH}`);
  }

  createSchema();

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`READY`);
    console.log(`Replit Hub running at http://localhost:${PORT}`);
    console.log(`Data: ${DATA_DIR}`);
  });
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
