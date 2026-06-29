import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, projectAccountsTable, accountsTable, memoriesTable, activityTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return token.slice(0, 4) + "****" + token.slice(-4);
}

function formatAccount(a: typeof accountsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    username: a.username,
    tokenMasked: maskToken(a.token),
    status: a.status,
    avatarUrl: a.avatarUrl ?? null,
    messagesUsed: a.messagesUsed,
    messagesLimit: a.messagesLimit,
    usagePercent: a.messagesLimit > 0 ? Math.round((a.messagesUsed / a.messagesLimit) * 100) : 0,
    createdAt: a.createdAt.toISOString(),
  };
}

async function formatProject(p: typeof projectsTable.$inferSelect) {
  const accountCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectAccountsTable)
    .where(eq(projectAccountsTable.projectId, p.id));
  const memoryCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(memoriesTable)
    .where(eq(memoriesTable.projectId, p.id));
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    replUrl: p.replUrl ?? null,
    status: p.status,
    accountCount: Number(accountCount[0]?.count ?? 0),
    memoryCount: Number(memoryCount[0]?.count ?? 0),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /api/projects
router.get("/projects", async (req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  const formatted = await Promise.all(projects.map(formatProject));
  res.json(formatted);
});

// POST /api/projects
router.post("/projects", async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    replUrl: z.string().optional(),
  }).parse(req.body);

  const [project] = await db.insert(projectsTable).values({
    name: body.name,
    description: body.description ?? null,
    replUrl: body.replUrl ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "project_created",
    description: `Project "${body.name}" created`,
    projectId: project.id,
  });

  res.status(201).json(await formatProject(project));
});

// GET /api/projects/:id
router.get("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(await formatProject(project));
});

// PATCH /api/projects/:id
router.patch("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    replUrl: z.string().optional(),
    status: z.string().optional(),
  }).parse(req.body);

  const [updated] = await db.update(projectsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(await formatProject(updated));
});

// DELETE /api/projects/:id
router.delete("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

// GET /api/projects/:id/accounts
router.get("/projects/:id/accounts", async (req, res) => {
  const id = parseInt(req.params.id);
  const links = await db
    .select({ account: accountsTable })
    .from(projectAccountsTable)
    .innerJoin(accountsTable, eq(projectAccountsTable.accountId, accountsTable.id))
    .where(eq(projectAccountsTable.projectId, id));
  res.json(links.map(l => formatAccount(l.account)));
});

// POST /api/projects/:id/accounts
router.post("/projects/:id/accounts", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({ accountId: z.number() }).parse(req.body);

  // check if already linked
  const existing = await db.select().from(projectAccountsTable)
    .where(and(eq(projectAccountsTable.projectId, id), eq(projectAccountsTable.accountId, body.accountId)));
  if (existing.length === 0) {
    await db.insert(projectAccountsTable).values({ projectId: id, accountId: body.accountId });
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, body.accountId));
  if (!account) return res.status(404).json({ error: "Account not found" });

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  await db.insert(activityTable).values({
    type: "account_linked",
    description: `Account "${account.name}" linked to project "${project?.name ?? id}"`,
    projectId: id,
    accountId: body.accountId,
  });

  res.json(formatAccount(account));
});

// DELETE /api/projects/:id/accounts/:accountId
router.delete("/projects/:id/accounts/:accountId", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const accountId = parseInt(req.params.accountId);
  await db.delete(projectAccountsTable)
    .where(and(eq(projectAccountsTable.projectId, projectId), eq(projectAccountsTable.accountId, accountId)));
  res.status(204).send();
});

export default router;
