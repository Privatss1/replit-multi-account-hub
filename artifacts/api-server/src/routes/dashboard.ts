import { Router } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  projectsTable,
  memoriesTable,
  skillsTable,
  conversationsTable,
  messagesTable,
  activityTable,
  projectAccountsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /api/dashboard/summary
router.get("/dashboard/summary", async (req, res) => {
  const [accounts, activeAccounts, projects, activeProjects, memories, skills, conversations, messages] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(accountsTable),
      db.select({ count: sql<number>`count(*)` }).from(accountsTable).where(eq(accountsTable.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(projectsTable),
      db.select({ count: sql<number>`count(*)` }).from(projectsTable).where(eq(projectsTable.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(memoriesTable),
      db.select({ count: sql<number>`count(*)` }).from(skillsTable),
      db.select({ count: sql<number>`count(*)` }).from(conversationsTable),
      db.select({ count: sql<number>`count(*)` }).from(messagesTable),
    ]);

  res.json({
    totalAccounts: Number(accounts[0]?.count ?? 0),
    activeAccounts: Number(activeAccounts[0]?.count ?? 0),
    totalProjects: Number(projects[0]?.count ?? 0),
    activeProjects: Number(activeProjects[0]?.count ?? 0),
    totalMemories: Number(memories[0]?.count ?? 0),
    totalSkills: Number(skills[0]?.count ?? 0),
    totalConversations: Number(conversations[0]?.count ?? 0),
    totalMessages: Number(messages[0]?.count ?? 0),
  });
});

// GET /api/dashboard/recent-activity
router.get("/dashboard/recent-activity", async (req, res) => {
  const activities = await db
    .select({
      id: activityTable.id,
      type: activityTable.type,
      description: activityTable.description,
      projectId: activityTable.projectId,
      accountId: activityTable.accountId,
      createdAt: activityTable.createdAt,
      projectName: projectsTable.name,
      accountName: accountsTable.name,
    })
    .from(activityTable)
    .leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
    .leftJoin(accountsTable, eq(activityTable.accountId, accountsTable.id))
    .orderBy(activityTable.createdAt)
    .limit(30);

  res.json(
    activities.map(a => ({
      id: a.id,
      type: a.type,
      description: a.description,
      projectName: a.projectName ?? null,
      accountName: a.accountName ?? null,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

export default router;
