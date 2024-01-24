import { Router } from "express";
import { logIn, logOut, registerUser } from "../controllers/userController.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router()

// user routes
router.post("/user/register", upload, registerUser)
router.post("/user/login", logIn)
router.post("/user/logout", verifyJWT, logOut)

export default router;