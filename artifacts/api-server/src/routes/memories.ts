import { Router } from "express";
import { db } from "@workspace/db";
import { memoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function fmt(m: typeof memoriesTable.$inferSelect) {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    content: m.content,
    category: m.category,
    importance: m.importance,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

// GET /api/memories
router.get("/memories", async (req, res) => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const category = req.query.category as string | undefined;

  let query = db.select().from(memoriesTable).$dynamic();
  const conditions = [];
  if (projectId) conditions.push(eq(memoriesTable.projectId, projectId));
  if (category) conditions.push(eq(memoriesTable.category, category));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const memories = await query.orderBy(memoriesTable.importance, memoriesTable.createdAt);
  res.json(memories.map(fmt));
});

// POST /api/memories
router.post("/memories", async (req, res) => {
  const body = z.object({
    projectId: z.number(),
    title: z.string().min(1),
    content: z.string().min(1),
    category: z.string().default("general"),
    importance: z.number().min(1).max(5).default(3),
  }).parse(req.body);

  const [memory] = await db.insert(memoriesTable).values(body).returning();
  res.status(201).json(fmt(memory));
});

// PATCH /api/memories/:id
router.patch("/memories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    category: z.string().optional(),
    importance: z.number().optional(),
  }).parse(req.body);

  const [updated] = await db.update(memoriesTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(memoriesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(fmt(updated));
});

// DELETE /api/memories/:id
router.delete("/memories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(memoriesTable).where(eq(memoriesTable.id, id));
  res.status(204).send();
});

export default router;
