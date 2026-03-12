const express = require("express");

const {
  listPaymentVerifications,
  reviewPaymentVerification,
} = require("../controllers/paymentVerificationController");
const { protect } = require("../middleware/auth");
const { delegate } = require("../engine/router");

const router = express.Router();

router.get(
  "/",
  protect,
  delegate("listPaymentVerifications", listPaymentVerifications),
);
router.patch(
  "/:id/review",
  protect,
  delegate("reviewPaymentVerification", reviewPaymentVerification),
);

module.exports = router;
