import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import projectsRouter from "./projects";
import memoriesRouter from "./memories";
import skillsRouter from "./skills";
import knowledgeRouter from "./knowledge";
import apikeysRouter from "./apikeys";
import conversationsRouter from "./conversations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountsRouter);
router.use(projectsRouter);
router.use(memoriesRouter);
router.use(skillsRouter);
router.use(knowledgeRouter);
router.use(apikeysRouter);
router.use(conversationsRouter);
router.use(dashboardRouter);

export default router;
