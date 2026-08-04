import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import analyzeRouter from "./analyze";
import coachRouter from "./coach";
import userDataRouter from "./userData";
import phoneRouter from "./phone";
import twilioWebhooksRouter from "./twilioWebhooks";
import telnyxWebhooksRouter from "./telnyxWebhooks";
import socialProofRouter from "./socialProof";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(analyzeRouter);
router.use(coachRouter);
router.use(userDataRouter);
router.use(phoneRouter);
router.use(twilioWebhooksRouter);
router.use(telnyxWebhooksRouter);
router.use(socialProofRouter);

export default router;
