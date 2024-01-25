import { Router } from "express";
import { changePassword, getCurrentUser, logIn, logOut, refreshAccessToken, registerUser, updateUserAvatar, updateUserCover, updateUserProfile } from "../controllers/userController.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router()

// user routes
router.post("/user/register", upload.fields([
    {
        name: "avatar",
        maxCount: 1
    }, 
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)
router.post("/user/login", logIn)
router.post("/user/logout", verifyJWT, logOut)
router.post("/user/refreshToken", refreshAccessToken)
router.post("/user/update", verifyJWT, updateUserProfile)
router.post("/user/update/password", verifyJWT, changePassword)
router.get("/user/current", verifyJWT, getCurrentUser)
router.post("/user/update/avatar", verifyJWT, updateUserAvatar)
router.post("/user/update/coverImage", verifyJWT, updateUserCover)

export default router;
