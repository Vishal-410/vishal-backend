import { Router } from "express";
import { changeCurrentPasswod, getCurrentUser, getUserProfileDetails, getWatchHistory, loginUser, logoutUser, refreshToken, registerUser, updateAccountDetail, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    }
  ]),
  registerUser
)

// router.post("/register",registerUser) // only use this route for post request

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshToken)
router.route("/change-password").post(verifyJWT,changeCurrentPasswod)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetail)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/c/:username").get(verifyJWT,getUserProfileDetails)
router.route("/history").get(verifyJWT,getWatchHistory)








export default router;