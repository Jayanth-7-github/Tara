const TestResult = require("../models/TestResult");

// Submit test result
exports.submitTest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      testTitle,
      answers,
      markedForReview,
      correctAnswers,
      totalQuestions,
      timeSpent,
      environment,
    } = req.body;

    if (!answers || !totalQuestions || !correctAnswers) {
      return res.status(400).json({
        error: "Answers, correctAnswers, and totalQuestions are required",
      });
    }

    // Convert answers object to Map
    const answersMap = new Map(Object.entries(answers));
    const markedMap = markedForReview
      ? new Map(Object.entries(markedForReview))
      : new Map();

    // Calculate score by comparing user answers with correct answers
    let calculatedScore = 0;
    console.log("Calculating score...");
    console.log("User answers:", answers);
    console.log("Correct answers:", correctAnswers);

    Object.keys(correctAnswers).forEach((questionId) => {
      const userAnswer = answers[questionId];
      const correctAnswer = correctAnswers[questionId];
      console.log(
        `Q${questionId}: User=${userAnswer}, Correct=${correctAnswer}, Match=${
          Number(userAnswer) === Number(correctAnswer)
        }`
      );
      // Convert both to numbers for comparison (in case they're strings)
      if (
        userAnswer !== undefined &&
        Number(userAnswer) === Number(correctAnswer)
      ) {
        calculatedScore++;
      }
    });

    console.log("Final calculated score:", calculatedScore);

    const testResult = await TestResult.create({
      userId,
      testTitle: testTitle || "Event Assessment",
      answers: answersMap,
      markedForReview: markedMap,
      score: calculatedScore,
      totalQuestions,
      timeSpent: timeSpent || 0,
      environment: environment || {},
    });

    return res.status(201).json({
      message: "Test submitted successfully",
      testResult: {
        id: testResult._id,
        score: testResult.score,
        totalQuestions: testResult.totalQuestions,
        submittedAt: testResult.submittedAt,
      },
    });
  } catch (err) {
    console.error("submitTest error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get all test results for the logged-in user
exports.getMyResults = async (req, res) => {
  try {
    // Admin-only route: admin may pass ?userId=<id> to fetch results for a specific user.
    const targetUserId = req.query.userId || req.user.id;
    const results = await TestResult.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .select("-answers -markedForReview"); // Don't send answers back

    return res.json({ results });
  } catch (err) {
    console.error("getMyResults error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific test result by ID
exports.getResultById = async (req, res) => {
  try {
    // Admin-only: fetch any result by ID. If not found, return 404.
    const { id } = req.params;

    const result = await TestResult.findById(id);
    if (!result) {
      return res.status(404).json({ error: "Test result not found" });
    }

    // Convert Map to Object for JSON response
    const resultObj = result.toObject();
    resultObj.answers = Object.fromEntries(result.answers);
    resultObj.markedForReview = Object.fromEntries(result.markedForReview);

    return res.json({ result: resultObj });
  } catch (err) {
    console.error("getResultById error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get test statistics for the logged-in user
exports.getMyStats = async (req, res) => {
  try {
    // Admin-only: allow ?userId=<id> to get stats for a specific user
    const targetUserId = req.query.userId || req.user.id;

    const totalTests = await TestResult.countDocuments({
      userId: targetUserId,
    });
    const results = await TestResult.find({ userId: targetUserId }).select(
      "score totalQuestions"
    );

    let totalScore = 0;
    let totalPossible = 0;

    results.forEach((result) => {
      totalScore += result.score || 0;
      totalPossible += result.totalQuestions || 0;
    });

    const averagePercentage =
      totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : 0;

    return res.json({
      stats: {
        totalTests,
        totalScore,
        totalPossible,
        averagePercentage: parseFloat(averagePercentage),
      },
    });
  } catch (err) {
    console.error("getMyStats error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Check whether a user (current or specified) has taken a specific test.
// If query.testTitle is provided, checks for that test; otherwise checks if any test exists.
exports.checkTaken = async (req, res) => {
  try {
    // allow non-admin users to check their own status; admins may pass ?userId= to check others
    const requesterId = req.user.id;
    const targetUserId =
      req.query.userId && req.user.role === "admin"
        ? req.query.userId
        : requesterId;
    const testTitle = req.query.testTitle;

    const filter = { userId: targetUserId };
    if (testTitle) filter.testTitle = testTitle;

    const exists = await TestResult.exists(filter);
    return res.json({ taken: Boolean(exists) });
  } catch (err) {
    console.error("checkTaken error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
