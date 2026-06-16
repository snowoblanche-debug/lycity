import { Router, type IRouter } from "express";
import healthRouter from "./health";
import songsRouter from "./songs";
import queueRouter from "./queue";
import categoriesRouter from "./categories";
import settingsRouter from "./settings";
import statsRouter from "./stats";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(songsRouter);
router.use(queueRouter);
router.use(categoriesRouter);
router.use(settingsRouter);
router.use(statsRouter);
router.use(historyRouter);

export default router;
