import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function fmt(k: typeof apiKeysTable.$inferSelect) {
  return {
    id: k.id,
    service: k.service,
    label: k.label,
    keyMasked: maskKey(k.key),
    isActive: k.isActive,
    createdAt: k.createdAt.toISOString(),
  };
}

// GET /api/apikeys
router.get("/apikeys", async (req, res) => {
  const keys = await db.select().from(apiKeysTable).orderBy(apiKeysTable.service);
  res.json(keys.map(fmt));
});

// POST /api/apikeys
router.post("/apikeys", async (req, res) => {
  const body = z.object({
    service: z.string().min(1),
    label: z.string().min(1),
    key: z.string().min(1),
  }).parse(req.body);

  const [key] = await db.insert(apiKeysTable).values(body).returning();
  res.status(201).json(fmt(key));
});

// PATCH /api/apikeys/:id
router.patch("/apikeys/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = z.object({
    service: z.string().optional(),
    label: z.string().optional(),
    key: z.string().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);

  const [updated] = await db.update(apiKeysTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(apiKeysTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(fmt(updated));
});

// DELETE /api/apikeys/:id
router.delete("/apikeys/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id));
  res.status(204).send();
});

export default router;
