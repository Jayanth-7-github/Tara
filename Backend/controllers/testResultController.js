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
      return res
        .status(400)
        .json({
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
      testTitle: testTitle || "Polymorphism Assessment",
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
    const userId = req.user.id;
    const results = await TestResult.find({ userId })
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
    const userId = req.user.id;
    const { id } = req.params;

    const result = await TestResult.findOne({ _id: id, userId });
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
    const userId = req.user.id;

    const totalTests = await TestResult.countDocuments({ userId });
    const results = await TestResult.find({ userId }).select(
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
