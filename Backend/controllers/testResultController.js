const TestResult = require("../models/TestResult");
const Event = require("../models/Event");
const User = require("../models/User");

// Submit test result
exports.submitTest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      testTitle,
      eventId,
      eventName,
      answers,
      markedForReview,
      correctAnswers,
      totalQuestions,
      timeSpent,
      environment,
      marksPerQuestion, // Extract custom marks per question
    } = req.body;

    if (!answers || !totalQuestions || !correctAnswers) {
      return res.status(400).json({
        error: "Answers, correctAnswers, and totalQuestions are required",
      });
    }

    const marks = marksPerQuestion ? Number(marksPerQuestion) : 1;

    // Convert answers object to Map
    const answersMap = new Map(Object.entries(answers));
    const markedMap = markedForReview
      ? new Map(Object.entries(markedForReview))
      : new Map();

    // Calculate score: Use provided score if available, otherwise calculate for MCQs
    let calculatedScore = 0;

    if (req.body.score !== undefined) {
      calculatedScore = req.body.score;
      console.log("Using frontend provided score:", calculatedScore);
    } else {
      console.log("Calculating score on backend (MCQ fallback)...");
      console.log("User answers:", answers);
      console.log("Correct answers:", correctAnswers);
      console.log("Marks per question:", marks);

      Object.keys(correctAnswers).forEach((questionId) => {
        const userAnswer = answers[questionId];
        const correctAnswer = correctAnswers[questionId];
        console.log(
          `Q${questionId}: User=${userAnswer}, Correct=${correctAnswer}, Match=${Number(userAnswer) === Number(correctAnswer)
          }`
        );
        // Convert both to numbers for comparison (in case they're strings)
        if (
          userAnswer !== undefined &&
          Number(userAnswer) === Number(correctAnswer)
        ) {
          calculatedScore += marks;
        }
      });
    }

    console.log("Final calculated score:", calculatedScore);

    // Ensure totalQuestions represents total possible score if using weighted marks
    const finalTotalMaxScore = (totalQuestions || 0) * marks;

    let finalEventId = eventId;
    let finalEventName = eventName || testTitle || "Event Assessment";

    // Smart Event Linking: If eventId is missing, try to find an event with matching title
    // This fixes cases where frontend doesn't send eventId but testTitle matches event title
    if (!finalEventId && testTitle) {
      try {
        const linkedEvent = await Event.findOne({
          title: { $regex: new RegExp(`^${testTitle}$`, 'i') }
        });
        if (linkedEvent) {
          finalEventId = linkedEvent._id;
          finalEventName = linkedEvent.title;
          console.log(`Auto-linked test "${testTitle}" to event "${linkedEvent.title}" (${linkedEvent._id})`);
        }
      } catch (err) {
        console.warn("Failed to auto-link event:", err);
      }
    }

    const testResult = await TestResult.create({
      userId,
      testTitle: testTitle || finalEventName,
      eventId: finalEventId || null,
      eventName: finalEventName,
      answers: answersMap,
      markedForReview: markedMap,
      score: calculatedScore,
      totalQuestions: finalTotalMaxScore,
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

// Get all results (for admins/managers)
exports.getAllResults = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    // Only allow admin or member
    if (user.role !== "admin" && user.role !== "member") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { testTitle } = req.query;
    const filter = {};

    // If specific test title requested, use it
    if (testTitle) {
      filter.testTitle = testTitle;
    }

    // MEMBER SPECIFIC LOGIC: Only show results for their events
    if (user.role === "member") {
      const userEmail = (user.email || "").toLowerCase().trim();
      // Find events managed by this user
      const managedEvents = await Event.find({
        managerEmail: { $regex: new RegExp(`^${userEmail}$`, "i") },
      });

      const managedTitles = managedEvents.map((ev) => ev.title);
      const managedEventIds = managedEvents.map((ev) => ev._id);

      // If specific test title requested
      if (testTitle) {
        // Verify ownership: requested title must match one of their events
        const targetEvent = managedEvents.find((e) => e.title === testTitle);
        if (!targetEvent) {
          // Title requested is not one of theirs -> return empty
          return res.json({ results: [] });
        }

        // Smart Filter: Match by Title OR by the ID of that matched event
        // This handles cases where testTitle is generic but eventId is specific
        delete filter.testTitle; // Remove simple string match
        filter.$or = [
          { testTitle: testTitle },
          { eventName: testTitle },
          { eventId: targetEvent._id },
        ];
      } else {
        // No specific title requested, restrict to ALL their events (by ID or Title)
        filter.$or = [
          { eventId: { $in: managedEventIds } },
          { testTitle: { $in: managedTitles } },
          { eventName: { $in: managedTitles } },
        ];
      }
    }

    const results = await TestResult.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email regno")
      .select("-markedForReview");

    return res.json({ results });
  } catch (err) {
    console.error("getAllResults error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
