import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, accountsTable, projectsTable, activityTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

async function formatConversation(c: typeof conversationsTable.$inferSelect) {
  const msgCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, c.id));

  const lastMsg = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, c.id))
    .orderBy(messagesTable.createdAt)
    .limit(1);

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, c.accountId));

  return {
    id: c.id,
    projectId: c.projectId,
    accountId: c.accountId,
    accountName: account?.name ?? "Unknown",
    title: c.title,
    messageCount: Number(msgCount[0]?.count ?? 0),
    lastMessageAt: lastMsg[0]?.createdAt.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

function fmtMessage(m: typeof messagesTable.$inferSelect) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    attachments: m.attachments ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

// GET /api/conversations
router.get("/conversations", async (req, res) => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;

  let query = db.select().from(conversationsTable).$dynamic();
  const conditions = [];
  if (projectId) conditions.push(eq(conversationsTable.projectId, projectId));
  if (accountId) conditions.push(eq(conversationsTable.accountId, accountId));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const convs = await query.orderBy(conversationsTable.updatedAt);
  const formatted = await Promise.all(convs.map(formatConversation));
  res.json(formatted);
});

// GET /api/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);
  res.json(messages.map(fmtMessage));
});

// POST /api/conversations/:id/send
router.post("/conversations/:id/send", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    content: z.string().min(1),
    attachments: z.string().optional(),
  }).parse(req.body);

  // Store user message
  const [userMsg] = await db.insert(messagesTable).values({
    conversationId: id,
    role: "user",
    content: body.content,
    attachments: body.attachments ?? null,
  }).returning();

  // Get conversation + account info for context building
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, conv.accountId));

  // Simulate agent response (in production: call Replit Agent API with account token)
  // Increment message usage counter
  if (account) {
    const newUsed = Math.min(account.messagesUsed + 1, account.messagesLimit);
    await db.update(accountsTable)
      .set({ messagesUsed: newUsed, updatedAt: new Date() })
      .where(eq(accountsTable.id, account.id));

    // Log activity if limit is approaching
    if (newUsed >= account.messagesLimit * 0.8) {
      await db.insert(activityTable).values({
        type: "limit_warning",
        description: `Account "${account.name}" is at ${Math.round((newUsed / account.messagesLimit) * 100)}% of free tier limit`,
        accountId: account.id,
        projectId: conv.projectId,
      });
    }
  }

  // Update conversation timestamp
  await db.update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, id));

  // Return the user message (agent response comes via streaming in production)
  res.status(201).json(fmtMessage(userMsg));
});

// POST /api/projects/:id/chat
router.post("/projects/:id/chat", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const body = z.object({
    accountId: z.number(),
    title: z.string().min(1),
    initialMessage: z.string().optional(),
  }).parse(req.body);

  const [conv] = await db.insert(conversationsTable).values({
    projectId,
    accountId: body.accountId,
    title: body.title,
  }).returning();

  if (body.initialMessage) {
    await db.insert(messagesTable).values({
      conversationId: conv.id,
      role: "user",
      content: body.initialMessage,
    });
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, body.accountId));
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));

  await db.insert(activityTable).values({
    type: "chat_started",
    description: `New chat started on "${project?.name ?? projectId}" with account "${account?.name ?? body.accountId}"`,
    projectId,
    accountId: body.accountId,
  });

  res.status(201).json(await formatConversation(conv));
});

export default router;
