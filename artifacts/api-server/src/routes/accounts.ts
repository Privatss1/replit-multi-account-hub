import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

// GET /api/accounts
router.get("/accounts", async (req, res) => {
  const accounts = await db.select().from(accountsTable).orderBy(accountsTable.createdAt);
  res.json(accounts.map(formatAccount));
});

// POST /api/accounts
router.post("/accounts", async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    username: z.string().min(1),
    token: z.string().min(1),
  }).parse(req.body);

  const [account] = await db.insert(accountsTable).values({
    name: body.name,
    username: body.username,
    token: body.token,
    status: "active",
  }).returning();

  await db.insert(activityTable).values({
    type: "account_added",
    description: `Account "${body.name}" connected`,
    accountId: account.id,
  });

  res.status(201).json(formatAccount(account));
});

// GET /api/accounts/:id
router.get("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) return res.status(404).json({ error: "Not found" });
  res.json(formatAccount(account));
});

// PATCH /api/accounts/:id
router.patch("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    name: z.string().optional(),
    username: z.string().optional(),
    token: z.string().optional(),
    status: z.string().optional(),
    messagesUsed: z.number().optional(),
    messagesLimit: z.number().optional(),
  }).parse(req.body);

  const [updated] = await db.update(accountsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(accountsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(formatAccount(updated));
});

// DELETE /api/accounts/:id
router.delete("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(accountsTable).where(eq(accountsTable.id, id));
  res.status(204).send();
});

// POST /api/accounts/:id/verify
router.post("/accounts/:id/verify", async (req, res) => {
  const id = parseInt(req.params.id);
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) return res.status(404).json({ error: "Not found" });

  try {
    const response = await fetch("https://replit.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": `connect.sid=${account.token}`,
      },
      body: JSON.stringify({
        query: `query { currentUser { username } }`,
      }),
    });

    const data = await response.json() as { data?: { currentUser?: { username?: string } }; errors?: unknown[] };
    const username = data?.data?.currentUser?.username;

    if (username) {
      await db.update(accountsTable)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(accountsTable.id, id));
      res.json({ valid: true, username, message: "Token is valid" });
    } else {
      await db.update(accountsTable)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(accountsTable.id, id));
      res.json({ valid: false, username: "", message: "Token is invalid or expired" });
    }
  } catch {
    await db.update(accountsTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(accountsTable.id, id));
    res.json({ valid: false, username: "", message: "Connection failed" });
  }
});

export default router;
