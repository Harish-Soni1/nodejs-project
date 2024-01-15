import { Router } from "express";
import { registerUser } from "../controllers/userController.js";

const router = Router()

// user routes
router.post("/user/register", registerUser)

export default router;