const Team = require("../models/Team");
const Event = require("../models/Event");
const Student = require("../models/Student");

/**
 * Create a team for an event. Validates team size and links students.
 * Expects JSON body: { eventId, name, leaderRegno, memberRegnos: [regno1, regno2, ...] }
 */
async function createTeam(req, res) {
  try {
    const { eventId, name, leader, members } = req.body;
    // leader: { regno, name, email, phone, branch, section, college, year }
    // members: array of { regno, name, email, phone, branch, section, college, year }
    if (!eventId || !name || !leader || !Array.isArray(members)) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.participationType !== "team") {
      return res
        .status(400)
        .json({ error: "This event does not support team registration" });
    }
    // Team size includes leader
    const teamSize = 1 + members.length;
    if (teamSize < event.minTeamSize || teamSize > event.maxTeamSize) {
      return res.status(400).json({
        error: `Team size must be between ${event.minTeamSize} and ${event.maxTeamSize}`,
      });
    }

    // Upsert leader with role 'Leader'
    let leaderDoc = await Student.findOne({ regno: leader.regno });
    if (!leaderDoc) {
      leaderDoc = await Student.create({ ...leader, role: "Leader" });
    } else {
      Object.assign(leaderDoc, leader, { role: "Leader" });
      await leaderDoc.save();
    }

    // Upsert members with role 'Member'
    const memberDocs = [];
    for (const m of members) {
      let student = await Student.findOne({ regno: m.regno });
      if (!student) {
        student = await Student.create({ ...m, role: "Member" });
      } else {
        Object.assign(student, m, { role: "Member" });
        await student.save();
      }
      memberDocs.push(student._id);
    }

    // Prevent duplicate teams for same event and leader
    const existing = await Team.findOne({
      event: event._id,
      leader: leaderDoc._id,
    });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Leader already has a team for this event" });
    }

    // Create team
    const team = await Team.create({
      event: event._id,
      name,
      leader: leaderDoc._id,
      members: memberDocs,
    });
    // Optionally, update students' registrations
    // Add event registration for leader and members if not already registered
    const allStudents = [leaderDoc, ...memberDocs.map((id) => ({ _id: id }))];
    for (const s of allStudents) {
      const student = await Student.findById(s._id);
      if (!student.registrations) student.registrations = [];
      const already = student.registrations.some(
        (r) => r.event && r.event.toString() === event._id.toString(),
      );
      if (!already) {
        student.registrations.push({
          event: event._id,
          eventName: event.title || "",
          registeredAt: new Date(),
        });
        await student.save();
      }
    }
    // Increment event registeredCount by team size
    await Event.findByIdAndUpdate(event._id, {
      $inc: { registeredCount: teamSize },
    });
    // Populate event name and members for response
    const populatedTeam = await Team.findById(team._id)
      .populate({ path: "event", select: "title" })
      .populate({
        path: "leader",
        select: "name regno email phone branch section college year",
      })
      .populate({
        path: "members",
        select: "name regno email phone branch section college year",
      });
    return res.status(201).json({ success: true, team: populatedTeam });
  } catch (err) {
    console.error("createTeam error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Fetch teams for an event or all teams, with event name and member details
async function getTeams(req, res) {
  try {
    const filter = {};
    if (req.query.eventId) filter.event = req.query.eventId;
    const teams = await Team.find(filter)
      .populate({ path: "event", select: "title" })
      .populate({
        path: "leader",
        select: "name regno email phone branch section college year",
      })
      .populate({
        path: "members",
        select: "name regno email phone branch section college year",
      });
    res.json({ success: true, teams });
  } catch (err) {
    console.error("getTeams error", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { createTeam, getTeams };
