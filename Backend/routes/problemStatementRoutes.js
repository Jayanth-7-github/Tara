const express = require("express");

const {
  listProblemStatements,
  createProblemStatement,
  updateProblemStatement,
  deleteProblemStatement,
  toggleAllProblemStatements,
} = require("../controllers/problemStatementController");
const { protect } = require("../middleware/auth");
const { delegate } = require("../engine/router");

const router = express.Router();

router.get(
  "/",
  protect,
  delegate("listProblemStatements", listProblemStatements),
);
router.post(
  "/",
  protect,
  delegate("createProblemStatement", createProblemStatement),
);
router.post(
  "/actions/toggle-all",
  protect,
  delegate("toggleAllProblemStatements", toggleAllProblemStatements),
);
router.put(
  "/:id",
  protect,
  delegate("updateProblemStatement", updateProblemStatement),
);
router.delete(
  "/:id",
  protect,
  delegate("deleteProblemStatement", deleteProblemStatement),
);

module.exports = router;
