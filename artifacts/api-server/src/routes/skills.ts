import { Router } from "express";
import { db } from "@workspace/db";
import { skillsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function fmt(s: typeof skillsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    prompt: s.prompt,
    category: s.category,
    usageCount: s.usageCount,
    createdAt: s.createdAt.toISOString(),
  };
}

// GET /api/skills
router.get("/skills", async (req, res) => {
  const category = req.query.category as string | undefined;
  let query = db.select().from(skillsTable).$dynamic();
  if (category) query = query.where(eq(skillsTable.category, category));
  const skills = await query.orderBy(skillsTable.usageCount);
  res.json(skills.map(fmt));
});

// POST /api/skills
router.post("/skills", async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    prompt: z.string().min(1),
    category: z.string().default("general"),
  }).parse(req.body);

  const [skill] = await db.insert(skillsTable).values(body).returning();
  res.status(201).json(fmt(skill));
});

// PATCH /api/skills/:id
router.patch("/skills/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    prompt: z.string().optional(),
    category: z.string().optional(),
  }).parse(req.body);

  const [updated] = await db.update(skillsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(skillsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(fmt(updated));
});

// DELETE /api/skills/:id
router.delete("/skills/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(skillsTable).where(eq(skillsTable.id, id));
  res.status(204).send();
});

export default router;
