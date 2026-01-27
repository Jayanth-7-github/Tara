const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));
const Attendance = require(path.join(__dirname, "..", "models", "Attendance"));

// Helper: format date as local "YYYY-MM-DD HH:mm"
function formatLocalYMDHM(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

exports.markAttendance = async (req, res) => {
  const { regno, eventName } = req.body || {};
  if (!regno) return res.status(400).json({ error: "regno is required" });

  try {
    // find student in DB (case-insensitive regno)
    const student = await Student.findOne({
      regno: new RegExp(`^${regno}$`, "i"),
    }).lean();
    if (!student)
      return res
        .status(404)
        .json({ error: "No student found for this registration number." });

    const event = eventName || "default";
    const now = new Date();

    // Break tracking semantics:
    // - "Check Out" records out time
    // - "Check In" records return time after a checkout
    const already = await Attendance.findOne({
      regno: student.regno,
      eventName: event,
    }).lean();
    if (already) {
      const existingCheckInAt =
        already.checkInAt || (already.isPresent ? already.timestamp : null);
      const existingCheckOutAt =
        already.checkOutAt || (!already.isPresent ? already.timestamp : null);
      const inMs = existingCheckInAt
        ? new Date(existingCheckInAt).getTime()
        : null;
      const outMs = existingCheckOutAt
        ? new Date(existingCheckOutAt).getTime()
        : null;
      const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);

      // If they're not currently out, there's nothing to "check in".
      if (!currentlyOut) {
        const checkInAt = existingCheckInAt;
        const checkOutAt = existingCheckOutAt;
        return res.json({
          message: `${student.name} is already checked in.`,
          attendance: {
            ...already,
            timestamp:
              already.timestamp instanceof Date
                ? already.timestamp.getTime()
                : already.timestamp,
            timestampText: formatLocalYMDHM(already.timestamp),
            checkInAt:
              checkInAt instanceof Date ? checkInAt.getTime() : checkInAt,
            checkInText: checkInAt ? formatLocalYMDHM(checkInAt) : "",
            checkOutAt:
              checkOutAt instanceof Date ? checkOutAt.getTime() : checkOutAt,
            checkOutText: checkOutAt ? formatLocalYMDHM(checkOutAt) : "",
            currentlyOut: false,
            returned: Boolean(checkInAt && checkOutAt && inMs > outMs),
          },
        });
      }

      // They're currently out, so this check-in represents a return.
      // IMPORTANT: preserve the prior checkout time even when flipping isPresent=true.
      const preservedCheckOutAt = already.checkOutAt || already.timestamp;
      const updated = await Attendance.findOneAndUpdate(
        { _id: already._id },
        {
          $set: {
            isPresent: true,
            timestamp: now,
            checkInAt: now,
            checkOutAt: preservedCheckOutAt,
          },
        },
        { new: true },
      ).lean();
      const responseUpdated = {
        regno: updated.regno,
        name: updated.name,
        eventName: updated.eventName,
        timestamp:
          updated.timestamp instanceof Date
            ? updated.timestamp.getTime()
            : updated.timestamp,
        timestampText: formatLocalYMDHM(updated.timestamp),
        checkInAt:
          (updated.checkInAt || updated.timestamp) instanceof Date
            ? (updated.checkInAt || updated.timestamp).getTime()
            : updated.checkInAt || updated.timestamp,
        checkInText: formatLocalYMDHM(updated.checkInAt || updated.timestamp),
        checkOutAt:
          (updated.checkOutAt || preservedCheckOutAt) instanceof Date
            ? (updated.checkOutAt || preservedCheckOutAt).getTime()
            : updated.checkOutAt || preservedCheckOutAt,
        checkOutText: formatLocalYMDHM(
          updated.checkOutAt || preservedCheckOutAt,
        ),
        currentlyOut: false,
        returned: true,
        isPresent: updated.isPresent,
        _id: updated._id,
      };
      return res.json({
        message: `Checked in successfully for ${student.name}.`,
        attendance: responseUpdated,
      });
    }

    const record = await Attendance.create({
      regno: student.regno,
      name: student.name,
      eventName: event,
      timestamp: now,
      checkInAt: now,
      isPresent: true,
      student: student._id,
    });

    // normalize response shape similar to previous implementation (timestamp as ms)
    const responseRecord = {
      regno: record.regno,
      name: record.name,
      eventName: record.eventName,
      timestamp:
        record.timestamp instanceof Date
          ? record.timestamp.getTime()
          : record.timestamp,
      timestampText: formatLocalYMDHM(record.timestamp),
      checkInAt:
        (record.checkInAt || record.timestamp) instanceof Date
          ? (record.checkInAt || record.timestamp).getTime()
          : record.checkInAt || record.timestamp,
      checkInText: formatLocalYMDHM(record.checkInAt || record.timestamp),
      checkOutAt:
        record.checkOutAt instanceof Date
          ? record.checkOutAt.getTime()
          : record.checkOutAt,
      checkOutText: record.checkOutAt
        ? formatLocalYMDHM(record.checkOutAt)
        : "",
      isPresent: record.isPresent,
      _id: record._id,
    };

    res.json({
      message: `Attendance marked successfully for ${student.name}.`,
      attendance: responseRecord,
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Check if student has marked attendance for an event
// GET /api/attendance/check/:regno?eventName=xxx
exports.checkAttendance = async (req, res) => {
  try {
    const regnoParam = req.params.regno;
    if (!regnoParam)
      return res.status(400).json({ error: "regno is required" });

    const event = (req.query?.eventName || "default").trim() || "default";

    const attendance = await Attendance.findOne({
      regno: new RegExp(`^${regnoParam}$`, "i"),
      eventName: event,
    }).lean();

    if (!attendance) {
      return res.json({ isMarked: false, isPresent: false });
    }

    const checkInAt =
      attendance.checkInAt ||
      (attendance.isPresent ? attendance.timestamp : null);
    const checkOutAt =
      attendance.checkOutAt ||
      (!attendance.isPresent ? attendance.timestamp : null);

    const inMs = checkInAt ? new Date(checkInAt).getTime() : null;
    const outMs = checkOutAt ? new Date(checkOutAt).getTime() : null;
    const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);
    const returned = Boolean(inMs && outMs && inMs > outMs);

    res.json({
      isMarked: true,
      isPresent: attendance.isPresent,
      currentlyOut,
      returned,
      attendance: {
        regno: attendance.regno,
        name: attendance.name,
        eventName: attendance.eventName,
        timestamp:
          attendance.timestamp instanceof Date
            ? attendance.timestamp.getTime()
            : attendance.timestamp,
        timestampText: formatLocalYMDHM(attendance.timestamp),
        checkInAt: checkInAt instanceof Date ? checkInAt.getTime() : checkInAt,
        checkInText: checkInAt ? formatLocalYMDHM(checkInAt) : "",
        checkOutAt:
          checkOutAt instanceof Date ? checkOutAt.getTime() : checkOutAt,
        checkOutText: checkOutAt ? formatLocalYMDHM(checkOutAt) : "",
        currentlyOut,
        returned,
        isPresent: attendance.isPresent,
        _id: attendance._id,
      },
    });
  } catch (err) {
    console.error("checkAttendance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const eventFilterRaw = req.query?.eventName;
    const eventFilter =
      typeof eventFilterRaw === "string" && eventFilterRaw.trim()
        ? eventFilterRaw.trim()
        : null;

    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 20000))
      : eventFilter
        ? 20000
        : 200;

    const allAttendance = await Attendance.find({})
      .select("eventName isPresent checkInAt checkOutAt timestamp")
      .lean();

    const total = allAttendance.length;
    const byEvent = {};
    const countsByEvent = {};

    for (const a of allAttendance) {
      const e = a.eventName || "default";
      byEvent[e] = (byEvent[e] || 0) + 1;
      if (!countsByEvent[e]) {
        countsByEvent[e] = {
          totalRecords: 0,
          totalCheckIns: 0,
          totalCheckOuts: 0,
          totalReturns: 0,
          totalCurrentlyOut: 0,
        };
      }
      countsByEvent[e].totalRecords++;

      const checkInAt = a.checkInAt || (a.isPresent ? a.timestamp : null);
      const checkOutAt = a.checkOutAt || (!a.isPresent ? a.timestamp : null);
      const inMs = checkInAt ? new Date(checkInAt).getTime() : null;
      const outMs = checkOutAt ? new Date(checkOutAt).getTime() : null;
      const checkedIn = Boolean(inMs);
      const checkedOut = Boolean(outMs);
      const returned = Boolean(inMs && outMs && inMs > outMs);
      const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);
      if (checkedIn) countsByEvent[e].totalCheckIns++;
      if (checkedOut) countsByEvent[e].totalCheckOuts++;
      if (returned) countsByEvent[e].totalReturns++;
      if (currentlyOut) countsByEvent[e].totalCurrentlyOut++;
    }

    const recordFilter = eventFilter ? { eventName: eventFilter } : {};
    const attendance = await Attendance.find(recordFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const regnos = Array.from(
      new Set(
        attendance
          .map((r) => String(r.regno || "").toLowerCase())
          .filter(Boolean),
      ),
    );
    const students = regnos.length
      ? await Student.find({
          regno: { $in: attendance.map((r) => r.regno).filter(Boolean) },
        })
          .select("regno name teamName role email branch hostelName roomNo")
          .lean()
      : [];
    const studentMap = new Map();
    for (const s of students) {
      studentMap.set(String(s.regno || "").toLowerCase(), s);
    }

    const records = attendance.map((r) => {
      const s = studentMap.get(String(r.regno || "").toLowerCase()) || {};
      const checkInAt = r.checkInAt || (r.isPresent ? r.timestamp : null);
      const checkOutAt = r.checkOutAt || (!r.isPresent ? r.timestamp : null);
      const inMs = checkInAt ? new Date(checkInAt).getTime() : null;
      const outMs = checkOutAt ? new Date(checkOutAt).getTime() : null;
      const checkedIn = Boolean(inMs);
      const checkedOut = Boolean(outMs);
      const returned = Boolean(inMs && outMs && inMs > outMs);
      const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);
      return {
        regno: r.regno,
        name: s.name || r.name,
        teamName: s.teamName || "",
        role: s.role || "",
        email: s.email || "",
        branch: s.branch || "",
        hostelName: s.hostelName || "",
        roomNo: s.roomNo || "",
        eventName: r.eventName,
        checkInAt: checkInAt instanceof Date ? checkInAt.getTime() : checkInAt,
        checkInText: checkInAt ? formatLocalYMDHM(checkInAt) : "",
        checkOutAt:
          checkOutAt instanceof Date ? checkOutAt.getTime() : checkOutAt,
        checkOutText: checkOutAt ? formatLocalYMDHM(checkOutAt) : "",
        checkedIn,
        checkedOut,
        returned,
        currentlyOut,
        isPresent: r.isPresent,
        // keep legacy fields for backward compatibility
        timestamp:
          r.timestamp instanceof Date ? r.timestamp.getTime() : r.timestamp,
        timestampText: formatLocalYMDHM(r.timestamp),
        _id: r._id,
      };
    });

    res.json({ total, byEvent, countsByEvent, records });
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export attendance as CSV (server-side)
exports.exportCSV = async (req, res) => {
  try {
    // Determine target event
    const hasEventName = Object.prototype.hasOwnProperty.call(
      req.query,
      "eventName",
    );
    let eventName = hasEventName ? String(req.query.eventName || "") : "";
    if (!hasEventName || !eventName.trim()) {
      // If not provided, fall back to the most recent event in Attendance
      const latest = await Attendance.findOne({})
        .sort({ createdAt: -1 })
        .lean();
      eventName = latest?.eventName || "default";
    }
    const allStudents = ["1", "true", "yes"].includes(
      (req.query.allStudents || req.query.all || "").toString().toLowerCase(),
    );
    const presentOnly = ["1", "true", "yes"].includes(
      (req.query.present || "").toString().toLowerCase(),
    );
    // Break tracking filters:
    // - returnedOnly => returned after a checkout (checkInAt > checkOutAt)
    // - outNowOnly   => currently out (checkout exists and no later check-in)
    // Backward-compatible aliases:
    // - checkInOnly  => returnedOnly
    // - checkOutOnly => outNowOnly
    const returnedOnly = ["1", "true", "yes"].includes(
      (req.query.returnedOnly || "").toString().toLowerCase(),
    );
    const outNowOnly = ["1", "true", "yes"].includes(
      (req.query.outNowOnly || req.query.outnow || "").toString().toLowerCase(),
    );
    const checkInOnly = ["1", "true", "yes"].includes(
      (req.query.checkInOnly || req.query.checkin || "")
        .toString()
        .toLowerCase(),
    );
    const checkOutOnly = ["1", "true", "yes"].includes(
      (req.query.checkOutOnly || req.query.checkout || "")
        .toString()
        .toLowerCase(),
    );
    const returnedFilter = returnedOnly || checkInOnly;
    const outNowFilter = outNowOnly || checkOutOnly;

    const lines = [];

    const escapeCell = (val) => {
      let sval = val == null ? "" : String(val);
      sval = sval.replace(/"/g, '""');
      if (sval.search(/,|\n|"/) >= 0) return `"${sval}"`;
      return sval;
    };

    const formatMaybe = (d) => (d ? formatLocalYMDHM(d) : "");
    const truthySymbol = (b) => (b ? "✅" : "❌");

    if (allStudents) {
      // Export every student with a Yes/No present flag for the selected event
      const students = await Student.find({}).sort({ regno: 1 }).lean();
      const attendance = await Attendance.find({ eventName }).lean();
      const map = new Map();
      for (const a of attendance) {
        map.set(String(a.regno).toLowerCase(), a);
      }

      const keys = [
        "Roll Number",
        "Name",
        "Team Name",
        "Role",
        "Email",
        "Branch",
        "Hostel Name",
        "Room No",
        "Event",
        "Check In",
        "Check Out",
        "Checked In",
        "Checked Out",
        "Returned",
        "Currently Out",
        "Present",
      ];
      lines.push(keys.join(","));

      let totalCheckIns = 0;
      let totalCheckOuts = 0;
      let totalReturns = 0;
      let totalCurrentlyOut = 0;

      for (const s of students) {
        const a = map.get(String(s.regno).toLowerCase());

        const checkInAt = a?.checkInAt || (a?.isPresent ? a?.timestamp : null);
        const checkOutAt =
          a?.checkOutAt || (!a?.isPresent ? a?.timestamp : null);
        const inMs = checkInAt ? new Date(checkInAt).getTime() : null;
        const outMs = checkOutAt ? new Date(checkOutAt).getTime() : null;
        const checkedIn = Boolean(inMs);
        const checkedOut = Boolean(outMs);
        const returned = Boolean(inMs && outMs && inMs > outMs);
        const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);

        if (checkedIn) totalCheckIns++;
        if (checkedOut) totalCheckOuts++;
        if (returned) totalReturns++;
        if (currentlyOut) totalCurrentlyOut++;

        const v = {
          "Roll Number": s.regno || "",
          Name: s.name || "",
          "Team Name": s.teamName || "",
          Role: s.role || "",
          Email: s.email || "",
          Branch: s.branch || s.department || "",
          "Hostel Name": s.hostelName || "",
          "Room No": s.roomNo || "",
          Event: eventName,
          "Check In": checkInAt ? formatMaybe(checkInAt) : "",
          "Check Out": checkOutAt ? formatMaybe(checkOutAt) : "",
          "Checked In": truthySymbol(checkedIn),
          "Checked Out": truthySymbol(checkedOut),
          Returned: truthySymbol(returned),
          "Currently Out": truthySymbol(currentlyOut),
          Present: a && a.isPresent ? "Yes" : "No",
        };
        const row = keys.map((k) => escapeCell(v[k]));
        lines.push(row.join(","));
      }

      lines.push("");
      lines.push(["TOTAL CHECK INS", totalCheckIns].map(escapeCell).join(","));
      lines.push(
        ["TOTAL CHECK OUTS", totalCheckOuts].map(escapeCell).join(","),
      );
      lines.push(["TOTAL RETURNS", totalReturns].map(escapeCell).join(","));
      lines.push(
        ["TOTAL CURRENTLY OUT", totalCurrentlyOut].map(escapeCell).join(","),
      );
    } else {
      // Export attendance records (optionally present-only)
      const filter = { eventName };
      if (presentOnly) filter.isPresent = true;
      const attendance = await Attendance.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      const filteredAttendance =
        returnedFilter || outNowFilter
          ? attendance.filter((row) => {
              const checkInAt =
                row.checkInAt || (row.isPresent ? row.timestamp : null);
              const checkOutAt =
                row.checkOutAt || (!row.isPresent ? row.timestamp : null);
              const inMs = checkInAt ? new Date(checkInAt).getTime() : null;
              const outMs = checkOutAt ? new Date(checkOutAt).getTime() : null;
              const returned = Boolean(inMs && outMs && inMs > outMs);
              const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);
              if (returnedFilter && !returned) return false;
              if (outNowFilter && !currentlyOut) return false;
              return true;
            })
          : attendance;

      const regnos = Array.from(
        new Set(filteredAttendance.map((r) => r.regno).filter(Boolean)),
      );
      const students = regnos.length
        ? await Student.find({ regno: { $in: regnos } })
            .select("regno name teamName role email branch hostelName roomNo")
            .lean()
        : [];
      const studentMap = new Map();
      for (const s of students) {
        studentMap.set(String(s.regno || "").toLowerCase(), s);
      }

      const keys = [
        "Roll Number",
        "Name",
        "Team Name",
        "Role",
        "Email",
        "Branch",
        "Hostel Name",
        "Room No",
        "Event",
        "Check In",
        "Check Out",
        "Checked In",
        "Checked Out",
        "Returned",
        "Currently Out",
        "Present",
      ];
      lines.push(keys.join(","));

      let totalCheckIns = 0;
      let totalCheckOuts = 0;
      let totalReturns = 0;
      let totalCurrentlyOut = 0;

      for (const row of filteredAttendance) {
        const s = studentMap.get(String(row.regno || "").toLowerCase()) || {};
        const checkInAt =
          row.checkInAt || (row.isPresent ? row.timestamp : null);
        const checkOutAt =
          row.checkOutAt || (!row.isPresent ? row.timestamp : null);
        const inMs = checkInAt ? new Date(checkInAt).getTime() : null;
        const outMs = checkOutAt ? new Date(checkOutAt).getTime() : null;
        const checkedIn = Boolean(inMs);
        const checkedOut = Boolean(outMs);
        const returned = Boolean(inMs && outMs && inMs > outMs);
        const currentlyOut = Boolean(outMs) && (!inMs || inMs <= outMs);
        if (checkedIn) totalCheckIns++;
        if (checkedOut) totalCheckOuts++;
        if (returned) totalReturns++;
        if (currentlyOut) totalCurrentlyOut++;

        const v = {
          "Roll Number": row.regno || "",
          Name: s.name || row.name || "",
          "Team Name": s.teamName || "",
          Role: s.role || "",
          Email: s.email || "",
          Branch: s.branch || "",
          "Hostel Name": s.hostelName || "",
          "Room No": s.roomNo || "",
          Event: row.eventName || eventName,
          "Check In": checkInAt ? formatMaybe(checkInAt) : "",
          "Check Out": checkOutAt ? formatMaybe(checkOutAt) : "",
          "Checked In": truthySymbol(checkedIn),
          "Checked Out": truthySymbol(checkedOut),
          Returned: truthySymbol(returned),
          "Currently Out": truthySymbol(currentlyOut),
          Present: row.isPresent ? "Yes" : "No",
        };
        const vals = keys.map((k) => escapeCell(v[k]));
        lines.push(vals.join(","));
      }

      lines.push("");
      lines.push(["TOTAL CHECK INS", totalCheckIns].map(escapeCell).join(","));
      lines.push(
        ["TOTAL CHECK OUTS", totalCheckOuts].map(escapeCell).join(","),
      );
      lines.push(["TOTAL RETURNS", totalReturns].map(escapeCell).join(","));
      lines.push(
        ["TOTAL CURRENTLY OUT", totalCurrentlyOut].map(escapeCell).join(","),
      );
    }

    const csv = lines.join("\n");
    // Add BOM for Excel compatibility
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        allStudents
          ? "attendance_all_students"
          : returnedFilter
            ? "attendance_returned"
            : outNowFilter
              ? "attendance_out_now"
              : presentOnly
                ? "attendance_present"
                : "attendance_export"
      }.csv"`,
    );
    res.send(bom + csv);
  } catch (err) {
    console.error("exportCSV error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a specific student's attendance record for an event
// PUT /api/attendance/:regno  (eventName can be in body or query; defaults to 'default')
// Body can include: { name?, isPresent?, timestamp?, newEventName? }
exports.updateAttendance = async (req, res) => {
  try {
    const regnoParam = req.params.regno;
    if (!regnoParam)
      return res.status(400).json({ error: "regno is required" });

    const currentEvent =
      (req.body?.eventName || req.query?.eventName || "default").trim() ||
      "default";

    // Target by case-insensitive regno and current event
    const query = {
      regno: new RegExp(`^${regnoParam}$`, "i"),
      eventName: currentEvent,
    };

    // Build update payload
    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
    // Accept boolean, 0/1, or string equivalents for isPresent
    if (typeof req.body?.isPresent === "boolean") {
      updates.isPresent = req.body.isPresent;
    } else if (typeof req.body?.isPresent === "number") {
      if (req.body.isPresent === 0 || req.body.isPresent === 1)
        updates.isPresent = req.body.isPresent === 1;
    } else if (typeof req.body?.isPresent === "string") {
      const s = req.body.isPresent.trim().toLowerCase();
      if (["1", "true", "yes"].includes(s)) updates.isPresent = true;
      if (["0", "false", "no"].includes(s)) updates.isPresent = false;
    }
    // Parse timestamp from either timestamp, or date+time fields
    const parseTimestamp = (body) => {
      if (body == null) return null;
      if (body.timestamp != null) {
        const v = body.timestamp;
        if (typeof v === "number") return new Date(v);
        if (typeof v === "string") {
          const n = Number(v);
          if (!Number.isNaN(n)) return new Date(n);
          // Support "YYYY-MM-DD HH:mm" as local time
          const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
          if (m) {
            const [, yy, mo, dd, hh, mm] = m.map(Number);
            return new Date(yy, mo - 1, dd, hh, mm, 0, 0);
          }
          return new Date(v);
        }
        if (v instanceof Date) return v;
      }
      if (body.date && body.time) {
        // date: YYYY-MM-DD, time: HH:mm
        const m = String(body.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const t = String(body.time).match(/^(\d{2}):(\d{2})$/);
        if (m && t) {
          const [, yy, mo, dd] = m.map(Number);
          const [, hh, mm] = t.map(Number);
          return new Date(yy, mo - 1, dd, hh, mm, 0, 0);
        }
        return new Date(`${body.date}T${body.time}`);
      }
      return null;
    };
    const t = parseTimestamp(req.body);
    if (t && !isNaN(t.getTime())) updates.timestamp = t;

    // Auto-populate check-in/check-out times based on isPresent toggles.
    // - isPresent=true => checkInAt
    // - isPresent=false => checkOutAt
    if (typeof updates.isPresent === "boolean") {
      const actionTime = updates.timestamp || new Date();
      updates.timestamp = actionTime;
      if (updates.isPresent === true) {
        updates.checkInAt = actionTime;
      } else {
        updates.checkOutAt = actionTime;
      }
    }

    const newEventNameRaw = req.body?.newEventName;
    if (typeof newEventNameRaw === "string" && newEventNameRaw.trim()) {
      updates.eventName = newEventNameRaw.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    // If we're flipping from out->in and the record doesn't explicitly store checkOutAt,
    // preserve the prior out time (previously stored only in timestamp while isPresent=false).
    if (updates.isPresent === true) {
      const existing = await Attendance.findOne(query)
        .select("isPresent checkOutAt timestamp")
        .lean();
      if (existing && existing.isPresent === false && !existing.checkOutAt) {
        updates.checkOutAt = existing.timestamp;
      }
    }

    // If eventName is changing, ensure no duplicate record exists for regno + newEventName
    if (updates.eventName && updates.eventName !== currentEvent) {
      const dup = await Attendance.findOne({
        regno: new RegExp(`^${regnoParam}$`, "i"),
        eventName: updates.eventName,
      }).lean();
      if (dup) {
        return res.status(409).json({
          error:
            "An attendance record already exists for this student and the target event.",
        });
      }
    }

    const updated = await Attendance.findOneAndUpdate(
      query,
      { $set: updates },
      {
        new: true,
      },
    ).lean();

    if (!updated) {
      // Allow "checkout" even if no record exists yet by creating an absent record.
      // This supports workflows where students may check out without checking in.
      if (updates.isPresent === false) {
        const student = await Student.findOne({
          regno: new RegExp(`^${regnoParam}$`, "i"),
        }).lean();
        if (!student) {
          return res.status(404).json({
            error: "No student found for this registration number.",
          });
        }

        const actionTime = updates.timestamp || new Date();
        const record = await Attendance.create({
          regno: student.regno,
          name: updates.name || student.name,
          eventName: currentEvent,
          timestamp: actionTime,
          checkOutAt: actionTime,
          isPresent: false,
          student: student._id,
        });

        const checkInAt = record.checkInAt || null;
        const checkOutAt = record.checkOutAt || record.timestamp;

        const responseRecord = {
          regno: record.regno,
          name: record.name,
          eventName: record.eventName,
          timestamp:
            record.timestamp instanceof Date
              ? record.timestamp.getTime()
              : record.timestamp,
          timestampText: formatLocalYMDHM(record.timestamp),
          checkInAt:
            checkInAt instanceof Date ? checkInAt.getTime() : checkInAt,
          checkInText: checkInAt ? formatLocalYMDHM(checkInAt) : "",
          checkOutAt:
            checkOutAt instanceof Date ? checkOutAt.getTime() : checkOutAt,
          checkOutText: checkOutAt ? formatLocalYMDHM(checkOutAt) : "",
          isPresent: record.isPresent,
          _id: record._id,
        };

        return res.json({
          message: "Checked out successfully.",
          attendance: responseRecord,
        });
      }

      return res.status(404).json({
        error: "Attendance record not found for the specified student/event.",
      });
    }

    const responseRecord = {
      regno: updated.regno,
      name: updated.name,
      eventName: updated.eventName,
      timestamp:
        updated.timestamp instanceof Date
          ? updated.timestamp.getTime()
          : updated.timestamp,
      timestampText: formatLocalYMDHM(updated.timestamp),
      checkInAt:
        (updated.checkInAt ||
          (updated.isPresent ? updated.timestamp : null)) instanceof Date
          ? (
              updated.checkInAt ||
              (updated.isPresent ? updated.timestamp : null)
            ).getTime()
          : updated.checkInAt || (updated.isPresent ? updated.timestamp : null),
      checkInText: formatLocalYMDHM(
        updated.checkInAt || (updated.isPresent ? updated.timestamp : null),
      ),
      checkOutAt:
        (updated.checkOutAt ||
          (!updated.isPresent ? updated.timestamp : null)) instanceof Date
          ? (
              updated.checkOutAt ||
              (!updated.isPresent ? updated.timestamp : null)
            ).getTime()
          : updated.checkOutAt ||
            (!updated.isPresent ? updated.timestamp : null),
      checkOutText: formatLocalYMDHM(
        updated.checkOutAt || (!updated.isPresent ? updated.timestamp : null),
      ),
      isPresent: updated.isPresent,
      _id: updated._id,
    };

    return res.json({
      message: "Attendance updated successfully.",
      attendance: responseRecord,
    });
  } catch (err) {
    console.error("updateAttendance error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a specific student's attendance record for an event
// DELETE /api/attendance/:regno  (eventName can be in body or query; defaults to 'default')
exports.deleteAttendance = async (req, res) => {
  try {
    const regnoParam = req.params.regno;
    if (!regnoParam)
      return res.status(400).json({ error: "regno is required" });

    // allow eventName from query or body
    const event =
      (req.body?.eventName || req.query?.eventName || "default").trim() ||
      "default";

    const deleted = await Attendance.findOneAndDelete({
      regno: new RegExp(`^${regnoParam}$`, "i"),
      eventName: event,
    }).lean();

    if (!deleted) {
      return res.status(404).json({
        error: "Attendance record not found for the specified student/event.",
      });
    }

    const responseRecord = {
      regno: deleted.regno,
      name: deleted.name,
      eventName: deleted.eventName,
      timestamp:
        deleted.timestamp instanceof Date
          ? deleted.timestamp.getTime()
          : deleted.timestamp,
      timestampText: formatLocalYMDHM(deleted.timestamp),
      isPresent: deleted.isPresent,
      _id: deleted._id,
    };

    return res.json({
      message: "Attendance deleted successfully.",
      attendance: responseRecord,
    });
  } catch (err) {
    console.error("deleteAttendance error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
