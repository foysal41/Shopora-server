"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const account_1 = require("../services/account");
const router = (0, express_1.Router)();
const MIN_PASSWORD_LENGTH = 8;
router.use(auth_1.requireAuth);
router.patch("/profile", async (req, res) => {
    const nameError = (0, account_1.validateName)(req.body?.name);
    if (nameError) {
        res.status(400).json({ success: false, message: nameError });
        return;
    }
    try {
        const user = await (0, account_1.updateProfile)(req.user.id, req.body.name);
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
});
router.post("/password", async (req, res) => {
    const body = req.body && typeof req.body === "object"
        ? req.body
        : {};
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(400).json({ success: false, message: "Current, new, and confirmation passwords are required" });
        return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({ success: false, message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
        return;
    }
    if (newPassword !== confirmPassword) {
        res.status(400).json({ success: false, message: "New password and confirmation do not match" });
        return;
    }
    try {
        const result = await (0, account_1.changePassword)({
            userId: req.user.id,
            currentPassword,
            newPassword,
            currentSessionToken: (0, auth_1.getSessionToken)(req),
            revokeOtherSessions: body.revokeOtherSessions === true,
        });
        if (!result.ok) {
            const message = result.reason === "same-password"
                ? "New password must be different from the current password"
                : "Current password is incorrect";
            res.status(400).json({ success: false, message });
            return;
        }
        res.json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to change password" });
    }
});
exports.default = router;
