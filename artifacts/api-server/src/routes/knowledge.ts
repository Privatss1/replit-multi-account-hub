import { Router } from "express";
import { db } from "@workspace/db";
import { knowledgeTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function fmt(k: typeof knowledgeTable.$inferSelect) {
  return {
    id: k.id,
    projectId: k.projectId ?? null,
    title: k.title,
    content: k.content,
    type: k.type,
    tags: k.tags,
    createdAt: k.createdAt.toISOString(),
  };
}

// GET /api/knowledge
router.get("/knowledge", async (req, res) => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const type = req.query.type as string | undefined;

  let query = db.select().from(knowledgeTable).$dynamic();
  const conditions = [];
  if (projectId) conditions.push(eq(knowledgeTable.projectId, projectId));
  if (type) conditions.push(eq(knowledgeTable.type, type));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const items = await query.orderBy(knowledgeTable.createdAt);
  res.json(items.map(fmt));
});

// POST /api/knowledge
router.post("/knowledge", async (req, res) => {
  const body = z.object({
    projectId: z.number().optional(),
    title: z.string().min(1),
    content: z.string().min(1),
    type: z.string().default("note"),
    tags: z.string().default(""),
  }).parse(req.body);

  const [item] = await db.insert(knowledgeTable).values({
    ...body,
    projectId: body.projectId ?? null,
  }).returning();
  res.status(201).json(fmt(item));
});

// PATCH /api/knowledge/:id
router.patch("/knowledge/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional(),
    tags: z.string().optional(),
  }).parse(req.body);

  const [updated] = await db.update(knowledgeTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(knowledgeTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(fmt(updated));
});

// DELETE /api/knowledge/:id
router.delete("/knowledge/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(knowledgeTable).where(eq(knowledgeTable.id, id));
  res.status(204).send();
});

export default router;
