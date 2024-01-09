import { Router } from "express";
import { registerUser } from "../controllers/userController.js";

const router = Router()

router.post("/user/register", registerUser)

export default router;