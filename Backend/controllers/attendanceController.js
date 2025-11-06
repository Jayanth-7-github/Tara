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

    // Prevent double-marking for same event
    const already = await Attendance.findOne({
      regno: student.regno,
      eventName: event,
    }).lean();
    if (already) {
      if (already.isPresent) {
        return res.json({
          message: `Attendance already marked for ${student.name}`,
          attendance: already,
        });
      }
      // Flip to present if an absent record exists
      const updated = await Attendance.findOneAndUpdate(
        { _id: already._id },
        { $set: { isPresent: true } },
        { new: true }
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
        isPresent: updated.isPresent,
        _id: updated._id,
      };
      return res.json({
        message: `Attendance updated to present for ${student.name}.`,
        attendance: responseUpdated,
      });
    }

    const record = await Attendance.create({
      regno: student.regno,
      name: student.name,
      eventName: event,
      // timestamp handled by model default with minute rounding
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

exports.getSummary = async (req, res) => {
  try {
    const attendance = await Attendance.find({}).sort({ createdAt: -1 }).lean();
    const total = attendance.length;
    const byEvent = {};
    attendance.forEach((a) => {
      const e = a.eventName || "default";
      byEvent[e] = byEvent[e] || 0;
      byEvent[e]++;
    });

    // recent 50 records (reverse of previous implementation)
    const records = attendance.slice(0, 50).map((r) => ({
      regno: r.regno,
      name: r.name,
      eventName: r.eventName,
      timestamp:
        r.timestamp instanceof Date ? r.timestamp.getTime() : r.timestamp,
      timestampText: formatLocalYMDHM(r.timestamp),
      isPresent: r.isPresent,
      _id: r._id,
    }));

    res.json({ total, byEvent, records });
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
      "eventName"
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
      (req.query.allStudents || req.query.all || "").toString().toLowerCase()
    );
    const presentOnly = ["1", "true", "yes"].includes(
      (req.query.present || "").toString().toLowerCase()
    );

    const lines = [];

    if (allStudents) {
      // Export every student with a Yes/No present flag for the selected event
      const students = await Student.find({}).sort({ regno: 1 }).lean();
      const attendance = await Attendance.find({ eventName }).lean();
      const map = new Map();
      for (const a of attendance) {
        map.set(String(a.regno).toLowerCase(), a);
      }

      const keys = [
        "regno",
        "name",
        "department",
        "year",
        "phone",
        "eventName",
        "timestamp",
        "present",
      ];
      lines.push(keys.join(","));

      for (const s of students) {
        const a = map.get(String(s.regno).toLowerCase());
        const v = {
          regno: s.regno || "",
          name: s.name || "",
          department: s.department || "",
          year: s.year || "",
          phone: s.phone || "",
          eventName,
          timestamp: a ? formatLocalYMDHM(a.timestamp) : "",
          present: a && a.isPresent ? "Yes" : "No",
        };
        const row = keys.map((k) => {
          let val = v[k];
          let sval = val == null ? "" : String(val);
          sval = sval.replace(/"/g, '""');
          if (sval.search(/,|\n|"/) >= 0) return `"${sval}"`;
          return sval;
        });
        lines.push(row.join(","));
      }
    } else {
      // Export attendance records (optionally present-only)
      const filter = { eventName };
      if (presentOnly) filter.isPresent = true;
      const attendance = await Attendance.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      const keys = ["regno", "name", "eventName", "timestamp", "isPresent"];
      lines.push(keys.join(","));

      for (const row of attendance) {
        const vals = keys.map((k) => {
          let v = row[k];
          if (k === "timestamp") v = row[k] ? formatLocalYMDHM(row[k]) : "";
          if (k === "isPresent") v = row[k] ? "Yes" : "No";
          let s = v == null ? "" : String(v);
          s = s.replace(/"/g, '""');
          if (s.search(/,|\n|"/) >= 0) return `"${s}"`;
          return s;
        });
        lines.push(vals.join(","));
      }
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
          : presentOnly
          ? "attendance_present"
          : "attendance_export"
      }.csv"`
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

    const newEventNameRaw = req.body?.newEventName;
    if (typeof newEventNameRaw === "string" && newEventNameRaw.trim()) {
      updates.eventName = newEventNameRaw.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    // Ensure we target by case-insensitive regno and current event
    const query = {
      regno: new RegExp(`^${regnoParam}$`, "i"),
      eventName: currentEvent,
    };

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
      }
    ).lean();

    if (!updated) {
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
