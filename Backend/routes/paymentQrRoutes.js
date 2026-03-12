const express = require("express");

const {
  listPaymentQrs,
  getActivePaymentQr,
  createPaymentQr,
  updatePaymentQrStatus,
  deletePaymentQr,
} = require("../controllers/paymentQrController");
const { protect } = require("../middleware/auth");
const { delegate } = require("../engine/router");

const router = express.Router();

router.get("/active", delegate("getActivePaymentQr", getActivePaymentQr));
router.get("/", protect, delegate("listPaymentQrs", listPaymentQrs));
router.post("/", protect, delegate("createPaymentQr", createPaymentQr));
router.patch(
  "/:id/status",
  protect,
  delegate("updatePaymentQrStatus", updatePaymentQrStatus),
);
router.delete("/:id", protect, delegate("deletePaymentQr", deletePaymentQr));

module.exports = router;
