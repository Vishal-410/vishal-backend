import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router=Router();

router.route("/register").post(registerUser)
// router.post("/register",registerUser) // only use this route for post request


export default router;