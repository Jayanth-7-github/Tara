const axios = require("axios");

const BACKENDS = {
  default:
    process.env.SERVICE_URL || `http://localhost:${process.env.PORT || 3000}`,
  // Example specific services (can be customised per task)
  authService:
    process.env.AUTH_SERVICE_URL ||
    process.env.SERVICE_URL ||
    `http://localhost:${process.env.PORT || 3000}`,
  eventService:
    process.env.EVENT_SERVICE_URL ||
    process.env.SERVICE_URL ||
    `http://localhost:${process.env.PORT || 3000}`,
  studentService:
    process.env.STUDENT_SERVICE_URL ||
    process.env.SERVICE_URL ||
    `http://localhost:${process.env.PORT || 3000}`,
};

const SERVICE_MAP = {
  // Auth
  signup: "authService",
  login: "authService",
  logout: "authService",
  getMe: "authService",
  checkLogin: "authService",
  verifyEventKey: "authService",

  // Attendance
  markAttendance: "default",
  getAttendanceSummary: "default",
  exportAttendance: "default",
  checkAttendance: "default",
  updateAttendance: "default",
  deleteAttendance: "default",

  // Contact
  sendContactMessage: "default",
  getMyContacts: "default",
  getMyContactRequests: "default",
  getOrganizerApplications: "default",
  updateContactStatus: "default",
  approveContact: "default",
  rejectContact: "default",
  addContactAsStudent: "default",
  promoteToMember: "default",

  // Events
  createEvent: "eventService",
  getEvents: "eventService",
  getEventImage: "eventService",
  registerEvent: "eventService",
  updateEvent: "eventService",
  deleteEvent: "eventService",
  generateEventKey: "eventService",
  revokeEventKey: "eventService",

  // Roles
  getRoles: "default",
  upsertRoles: "default",

  // Students
  searchStudents: "studentService",
  getStudentByRegNo: "studentService",
  createStudent: "studentService",
  createStudentsBulk: "studentService",

  // Test Results
  submitTest: "default",
  checkTaken: "default",
  getAllResults: "default",
  getMyResults: "default",
  getMyStats: "default",
  getResultById: "default",
};

const route = async (taskName, req, res) => {
  // Prevent infinite routing loops
  if (req.headers["x-engine-routed"]) {
    return res.status(500).json({
      error: "Engine loop detected",
    });
  }

  const serviceKey = SERVICE_MAP[taskName] || "default";
  const baseURL = BACKENDS[serviceKey] || BACKENDS["default"];

  if (!baseURL) {
    return res.status(500).json({
      error: "No backend found for task " + taskName,
    });
  }

  const targetUrl = `${baseURL}${req.originalUrl}`;
  console.debug(`[Engine] Routing '${taskName}' to: ${targetUrl}`);

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data:
        req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      // params: req.query, // Removed to avoid duplicate query params since they are already in targetUrl
      headers: (() => {
        const h = { ...req.headers };
        delete h["host"];
        delete h["content-length"];
        delete h["content-type"]; // axios will set it based on data
        h["x-engine-routed"] = "true";
        return h;
      })(),
      // Use arraybuffer so we can faithfully proxy both JSON and binary (images, files)
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    console.debug(`[Engine] Received response for '${taskName}': Status ${response.status}`);

    Object.keys(response.headers).forEach((key) => {
      if (key !== "content-length" && key !== "transfer-encoding") {
        res.setHeader(key, response.headers[key]);
      }
    });

    if (response.data == null) {
      console.debug(`[Engine] Response data is null for '${taskName}'`);
      return res.status(response.status).end();
    }

    const body = Buffer.isBuffer(response.data)
      ? response.data
      : Buffer.from(response.data);

    console.debug(`[Engine] Sending response for '${taskName}': Status ${response.status}, Body Length ${body.length}`);
    res.status(response.status).send(body);
  } catch (error) {
    console.error(`[Engine] Error forwarding '${taskName}':`, error.message);
    res.status(502).json({
      error: "Bad Gateway",
      message: "Failed to forward request via Engine",
      details: error.message,
    });
  }
};

/**
 * Controller wrapper to automatically route through engine
 * @param {string} taskName - The name of the task in SERVICE_MAP
 * @param {function} controller - The original controller function
 */
const delegate = (taskName, controller) => {
  return (req, res, next) => {
    if (req.headers["x-engine-routed"]) {
      // console.log(`[Delegate] Executing controller for ${taskName}`);
      if (typeof controller !== "function") {
        console.error(
          `[Delegate] CRITICAL ERROR: Controller for ${taskName} is not a function! It is ${typeof controller}`,
        );
        return res.status(500).send("Controller invalid");
      }
      return controller(req, res, next);
    }
    return route(taskName, req, res);
  };
};

module.exports = { route, delegate };
