import React from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaUniversity,
  FaBuilding,
  FaHashtag,
  FaCheckCircle,
  FaUsers,
} from "react-icons/fa";

// Helper: Avatar with initials
function Avatar({ name, size = 48 }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-cyan-400 text-white font-bold text-xl shadow-lg`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

// Team Stats Bar
function TeamStatsBar({ team, event, leader, members }) {
  const teamSize = 1 + (members?.length || 0);
  const complete = teamSize === event?.maxTeamSize;
  return (
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm text-blue-300 font-semibold">
        Members Added: {teamSize} / {event?.maxTeamSize}
      </span>
      <span className="text-sm text-green-400 flex items-center gap-1">
        Leader Assigned: <FaCheckCircle className="inline text-green-400" />
      </span>
      <span
        className={`text-sm flex items-center gap-1 ${complete ? "text-green-400" : "text-yellow-400"}`}
      >
        Team Complete: {complete ? <FaCheckCircle className="inline" /> : "✗"}
      </span>
    </div>
  );
}

// Team Header
function TeamHeader({ team, event }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-300 mb-1 flex items-center gap-2">
          <FaUsers className="text-blue-400" />{" "}
          {team?.name || team?.teamName || "Team"}
        </h2>
        <div className="flex gap-4 flex-wrap text-sm text-neutral-300">
          <span>
            Event:{" "}
            <span className="font-semibold text-white">{event?.title}</span>
          </span>
          <span>
            Members:{" "}
            <span className="font-semibold text-white">
              {1 + (team?.members?.length || 0)} / {event?.maxTeamSize}
            </span>
          </span>
          <span>
            Status:{" "}
            <span className="inline-block px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 font-semibold">
              Registered
            </span>
          </span>
          <span>
            Registered: {new Date(team?.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Leader Card
function LeaderCard({ leader }) {
  return (
    <div className="rounded-xl border-2 border-blue-500/60 bg-neutral-900/80 p-6 mb-6 shadow-lg flex flex-col md:flex-row items-center gap-6">
      <Avatar name={leader?.name} size={64} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-blue-300">Team Leader</h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-700/30 text-blue-200 text-xs font-semibold">
            Leader
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" value={leader?.name} icon={<FaUser />} />
          <Field
            label="Reg No"
            value={leader?.regno}
            icon={<FaHashtag />}
            copy
          />
          <Field
            label="Email"
            value={leader?.email}
            icon={<FaEnvelope />}
            email
          />
          <Field label="Phone" value={leader?.phone} icon={<FaPhone />} phone />
          <Field label="Branch" value={leader?.branch} icon={<FaBuilding />} />
          <Field
            label="College"
            value={leader?.college}
            icon={<FaUniversity />}
          />
          <Field label="Year" value={leader?.year} icon={<FaUniversity />} />
        </div>
      </div>
    </div>
  );
}

// Member Card
function MemberCard({ member, idx }) {
  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900/80 p-6 shadow-lg flex flex-col md:flex-row items-center gap-6">
      <Avatar name={member?.name} size={56} />
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-blue-200">Member {idx + 1}</h3>
          <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 text-xs font-semibold">
            Member
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" value={member?.name} icon={<FaUser />} />
          <Field
            label="Reg No"
            value={member?.regno}
            icon={<FaHashtag />}
            copy
          />
          <Field
            label="Email"
            value={member?.email}
            icon={<FaEnvelope />}
            email
          />
          <Field label="Phone" value={member?.phone} icon={<FaPhone />} phone />
          <Field label="Branch" value={member?.branch} icon={<FaBuilding />} />
          <Field
            label="College"
            value={member?.college}
            icon={<FaUniversity />}
          />
          <Field label="Year" value={member?.year} icon={<FaUniversity />} />
        </div>
      </div>
    </div>
  );
}

// Field with icon, copy/email/phone actions
function Field({ label, value, icon, copy, email, phone }) {
  return (
    <div className="flex items-start gap-2 text-sm text-neutral-300 flex-wrap">
      <span className="text-blue-400 mt-0.5 shrink-0">{icon}</span>
      <span className="font-semibold text-neutral-400 w-24 shrink-0">
        {label}:
      </span>
      <span className="text-white min-w-0 flex-1 break-all">{value}</span>
      <span className="flex items-center gap-2 shrink-0">
        {copy && value && (
          <button
            className="px-2 py-0.5 rounded bg-blue-800/40 text-blue-200 text-xs hover:bg-blue-700/60"
            title="Copy"
            onClick={() => navigator.clipboard.writeText(value)}
          >
            Copy
          </button>
        )}
        {email && value && (
          <a
            href={`mailto:${value}`}
            className="px-2 py-0.5 rounded bg-blue-800/40 text-blue-200 text-xs hover:bg-blue-700/60"
            title="Send Email"
          >
            Email
          </a>
        )}
        {phone && value && (
          <a
            href={`tel:${value}`}
            className="px-2 py-0.5 rounded bg-blue-800/40 text-blue-200 text-xs hover:bg-blue-700/60"
            title="Call"
          >
            Call
          </a>
        )}
      </span>
    </div>
  );
}

// Main Team Panel
export default function TeamPanel({ team, event }) {
  if (!team) {
    return (
      <div className="rounded-xl bg-neutral-900/80 p-8 text-center text-neutral-400 shadow-lg">
        <h3 className="text-xl font-bold mb-2 text-white">
          No team registered for this event.
        </h3>
        <p className="mb-4">
          Your team information will appear here once registered.
        </p>
      </div>
    );
  }
  const hasLeader = !!team.leader;
  const hasMembers = Array.isArray(team.members) && team.members.length > 0;
  return (
    <div className="rounded-3xl bg-neutral-950/90 p-8 shadow-2xl backdrop-blur-lg max-w-4xl mx-auto">
      <TeamHeader team={team} event={event} />
      <TeamStatsBar
        team={team}
        event={event}
        leader={team.leader}
        members={team.members}
      />
      {hasLeader && <LeaderCard leader={team.leader} />}
      {hasMembers && (
        <div className="mt-2 space-y-6">
          {team.members.map((member, idx) => (
            <MemberCard key={member._id || idx} member={member} idx={idx} />
          ))}
        </div>
      )}
      {!hasLeader && !hasMembers && (
        <div className="text-center text-neutral-400 py-8">
          No leader or members assigned yet.
        </div>
      )}
    </div>
  );
}
