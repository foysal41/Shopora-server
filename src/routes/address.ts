import { Router } from "express";
import {
    getAddressesByUser,
    createAddress,
    updateAddress,
    deleteAddress,
    type AddressInput,
} from "../services/address.js";

const router = Router();

/* =========================================================
   GET /api/v1/addresses?userId=xxx
   List the logged-in customer's addresses.
========================================================= */
router.get("/", async (req, res) => {
    try {
        const userId =
            typeof req.query.userId === "string" ? req.query.userId : undefined;

        if (!userId) {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }

        const addresses = await getAddressesByUser(userId);

        res.status(200).json({
            success: true,
            message: "Addresses fetched successfully",
            data: addresses,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch addresses",
        });
    }
});

/* =========================================================
   POST /api/v1/addresses
   body: { userId, label?, fullName, phone, addressLine,
           city, postalCode?, country, isDefault? }
========================================================= */
router.post("/", async (req, res) => {
    try {
        const { userId, ...rest } = req.body ?? {};

        if (!userId) {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }

        // Required fields for a usable address.
        const missing = ["fullName", "phone", "addressLine", "city", "country"].filter(
            (field) => !rest[field] || String(rest[field]).trim() === ""
        );

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(", ")}`,
            });
            return;
        }

        const address = await createAddress(userId, rest as AddressInput);

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            data: address,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to add address",
        });
    }
});

/* =========================================================
   PATCH /api/v1/addresses/:id
   body: { userId, ...fieldsToUpdate }
========================================================= */
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, ...rest } = req.body ?? {};

        if (!userId) {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }

        const updated = await updateAddress(userId, id, rest as Partial<AddressInput>);

        if (!updated) {
            res.status(404).json({
                success: false,
                message: "Address not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Address updated successfully",
            data: updated,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to update address",
        });
    }
});

/* =========================================================
   DELETE /api/v1/addresses/:id?userId=xxx
========================================================= */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const userId =
            typeof req.query.userId === "string"
                ? req.query.userId
                : req.body?.userId;

        if (!userId) {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }

        const removed = await deleteAddress(userId, id);

        if (!removed) {
            res.status(404).json({
                success: false,
                message: "Address not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Address deleted successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to delete address",
        });
    }
});

export default router;
