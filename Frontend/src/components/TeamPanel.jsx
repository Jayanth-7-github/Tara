import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  Hash,
  BadgeCheck,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Crown,
  Target,
  Camera,
} from "lucide-react";
import { uploadTeamAvatar } from "../services/api";

// Subcomponent: Avatar with initials and optional active indicator
function Avatar({ name, size = 48, showOnline = true }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full flex items-center justify-center rounded-full bg-linear-to-br from-blue-600 via-blue-500 to-cyan-400 text-white font-bold shadow-lg border border-white/10"
        style={{ fontSize: size * 0.35 }}
      >
        {initials}
      </div>
      {showOnline && (
        <span 
          className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-neutral-950 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" 
          aria-label="Active status indicator"
        />
      )}
    </div>
  );
}

// Subcomponent: InfoTile (glass tile displaying structured information)
function InfoTile({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="bg-neutral-900/30 border border-white/5 hover:border-white/10 hover:bg-neutral-900/60 rounded-xl p-3 flex items-start gap-3 transition-all duration-300 shadow-sm">
      <div className="p-2 rounded-lg bg-white/5 text-blue-400 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
        <span className="block text-sm font-medium text-neutral-200 truncate mt-0.5" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}

// Subcomponent: CopyButton (Premium action button for clipboard action with success state)
function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 text-neutral-300 hover:text-blue-300 text-xs font-semibold transition-all duration-300 cursor-pointer shadow-md select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// Subcomponent: EmailButton (Mail link ActionButton)
function EmailButton({ email }) {
  if (!email) return null;
  return (
    <a
      href={`mailto:${email}`}
      aria-label="Send Email"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 text-neutral-300 hover:text-blue-300 text-xs font-semibold transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
    >
      <Mail className="w-3.5 h-3.5" />
      <span>Email</span>
    </a>
  );
}

// Subcomponent: CallButton (Phone link ActionButton)
function CallButton({ phone }) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone}`}
      aria-label="Call phone number"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 text-neutral-300 hover:text-emerald-300 text-xs font-semibold transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Phone className="w-3.5 h-3.5" />
      <span>Call</span>
    </a>
  );
}

// Subcomponent: TeamHeader (Top dashboard summary row)
function TeamHeader({ team, event, onTeamUpdate }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image size exceeds 3MB limit");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result;
        const mimeType = file.type;
        
        const response = await uploadTeamAvatar(team._id, base64, mimeType);
        if (response.success && response.team) {
          if (onTeamUpdate) {
            onTeamUpdate(response.team);
          }
        }
      } catch (err) {
        console.error("Failed to upload team avatar", err);
        alert(err.message || "Failed to upload avatar");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const regDate = team?.createdAt
    ? new Date(team.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="relative border-b border-white/5 pb-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Team Avatar Circle with Upload Trigger */}
          <div className="relative group shrink-0">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border border-white/10 bg-neutral-900/60 shadow-lg flex items-center justify-center">
              {team?.avatarUrl ? (
                <img
                  src={team.avatarUrl}
                  alt="Team Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-black text-white uppercase">
                  {(team?.name || "T")[0]}
                </span>
              )}
              
              <label 
                htmlFor="team-avatar-input"
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                {uploading ? (
                  <span className="text-[10px] text-white font-semibold animate-pulse">Up...</span>
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </label>
            </div>
            <input 
              id="team-avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                {team?.name || team?.teamName || "Team"}
              </h1>
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-400 mt-2">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <span>Registered: {regDate}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Event Title Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {event?.title || "Event"}
          </div>

          {/* Registration Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold shadow-[0_0_15px_rgba(52,211,153,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Registered
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: StatsCards (Horizontal key figures)
function StatsCards({ team, event, leader, members }) {
  const teamSize = 1 + (members?.length || 0);
  const maxTeamSize = event?.maxTeamSize || 5;
  const hasLeader = !!leader;
  const completionRate = Math.round((teamSize / maxTeamSize) * 100);

  const stats = [
    {
      title: "Team Size",
      value: `${teamSize} / ${maxTeamSize}`,
      sub: "Members added",
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/5 border-blue-500/10",
      progress: completionRate,
    },
    {
      title: "Team Leader",
      value: hasLeader ? "Assigned" : "Missing",
      sub: hasLeader ? "Role filled" : "Action required",
      icon: Crown,
      color: hasLeader ? "text-amber-400" : "text-rose-400",
      bg: hasLeader ? "bg-amber-500/5 border-amber-500/10" : "bg-rose-500/5 border-rose-500/10",
      statusDot: hasLeader ? "bg-amber-400" : "bg-rose-400",
    },
    {
      title: "Completion",
      value: `${completionRate}%`,
      sub: teamSize === maxTeamSize ? "Fully complete" : "Pending members",
      icon: BadgeCheck,
      color: teamSize === maxTeamSize ? "text-emerald-400" : "text-cyan-400",
      bg: teamSize === maxTeamSize ? "bg-emerald-500/5 border-emerald-500/10" : "bg-cyan-500/5 border-cyan-500/10",
      progress: completionRate,
    },
    {
      title: "Target Event",
      value: event?.title || "Hackathon",
      sub: "Active registration",
      icon: Target,
      color: "text-purple-400",
      bg: "bg-purple-500/5 border-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="relative overflow-hidden bg-neutral-900/40 border border-white/5 rounded-2xl p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-white/10"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none ${stat.color.replace("text-", "bg-")}`} />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{stat.title}</span>
                <div className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                  {stat.value}
                  {stat.statusDot && (
                    <span className={`w-2 h-2 rounded-full ${stat.statusDot} animate-pulse`} />
                  )}
                </div>
                <span className="text-xs text-neutral-400 mt-1 block font-medium">{stat.sub}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            {stat.progress !== undefined && (
              <div className="w-full bg-neutral-800/60 rounded-full h-1 mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// Subcomponent: LeaderCard (Premium leader display)
function LeaderCard({ leader }) {
  if (!leader) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-neutral-900/35 backdrop-blur-md p-6 shadow-xl hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 mb-6">
        <div className="flex items-center gap-5">
          <Avatar name={leader?.name} size={64} />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {leader?.name || "Team Leader"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold shadow-[0_0_10px_rgba(59,130,246,0.05)]">
                <Crown className="w-3 h-3 text-amber-400" />
                Leader
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Registration No: {leader?.regno || "N/A"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={leader?.regno} label="Reg No" />
          <EmailButton email={leader?.email} />
          <CallButton phone={leader?.phone} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InfoTile icon={Hash} label="Registration No" value={leader?.regno} />
        <InfoTile icon={Mail} label="Email Address" value={leader?.email} />
        <InfoTile icon={Phone} label="Phone Number" value={leader?.phone} />
        <InfoTile icon={Building2} label="Branch / Dept" value={leader?.branch} />
        <InfoTile icon={GraduationCap} label="College Name" value={leader?.college} />
        <InfoTile icon={GraduationCap} label="Year of Study" value={leader?.year} />
      </div>
    </motion.div>
  );
}

// Subcomponent: MemberCard (Collapsible accordion member item)
function MemberCard({ member, idx }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      layout="position"
      className="overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/20 backdrop-blur-xs shadow-md transition-all duration-300 hover:border-white/10"
    >
      {/* Header (always visible) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-4">
          <Avatar name={member?.name} size={48} showOnline={false} />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-md font-semibold text-neutral-200">
                {member?.name || `Member ${idx + 1}`}
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-bold tracking-wider uppercase border border-neutral-700/30">
                Member
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Click to toggle details</p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Collapse details" : "Expand details"}
          className="p-2 rounded-lg bg-neutral-900/60 border border-white/5 text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded body details */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-4 pb-5 pt-2 border-t border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                <InfoTile icon={Hash} label="Registration No" value={member?.regno} />
                <InfoTile icon={Mail} label="Email Address" value={member?.email} />
                <InfoTile icon={Phone} label="Phone Number" value={member?.phone} />
                <InfoTile icon={Building2} label="Branch / Dept" value={member?.branch} />
                <InfoTile icon={GraduationCap} label="College Name" value={member?.college} />
                <InfoTile icon={GraduationCap} label="Year of Study" value={member?.year} />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/5">
                <span className="text-xs text-neutral-500 mr-2 font-semibold">Quick Actions:</span>
                <CopyButton value={member?.regno} label="Reg No" />
                <EmailButton email={member?.email} />
                <CallButton phone={member?.phone} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Subcomponent: EmptyState (Premium fallback design)
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-10 text-center max-w-lg mx-auto shadow-2xl"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <div className="absolute -inset-1 rounded-full bg-linear-to-r from-blue-500 to-cyan-400 opacity-20 blur-sm animate-pulse" />
          <div className="relative p-5 rounded-full bg-neutral-900/80 border border-white/10 text-blue-400 shadow-xl">
            <Users className="w-10 h-10" />
          </div>
        </div>

        <h3 className="text-xl font-bold mb-2 text-white">No Team Registered</h3>
        <p className="text-neutral-400 text-sm max-w-sm mx-auto leading-relaxed">
          Your team information and registration status will appear here once you register for this event.
        </p>

        <div className="mt-8 px-6 py-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300 font-semibold">
          Need help registering? Contact the event coordinator or administrator.
        </div>
      </div>
    </motion.div>
  );
}

// Main Component: TeamPanel
export default function TeamPanel({ team, event, onTeamUpdate }) {
  if (!team) {
    return <EmptyState />;
  }

  const hasLeader = !!team.leader;
  const leaderId = team.leader?._id || team.leader;
  
  const members = (Array.isArray(team.members) ? team.members : [])
    .filter((m) => {
      const mId = m?._id || m;
      return mId && String(mId) !== String(leaderId);
    });
  const hasMembers = members.length > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-950/80 p-6 md:p-8 shadow-2xl border border-white/5 max-w-4xl mx-auto">
      {/* Soft background radial glow decorations */}
      <div className="absolute top-0 -left-12 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-12 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <TeamHeader team={{ ...team, members }} event={event} onTeamUpdate={onTeamUpdate} />

      <StatsCards
        team={team}
        event={event}
        leader={team.leader}
        members={members}
      />

      {hasLeader && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">
            Team Leader
          </h2>
          <LeaderCard leader={team.leader} />
        </div>
      )}

      {hasMembers && (
        <div className="mt-8">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">
            Team Members ({members.length})
          </h2>
          <div className="space-y-4">
            {members.map((member, idx) => (
              <MemberCard key={member._id || idx} member={member} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {!hasLeader && !hasMembers && (
        <div className="text-center text-neutral-500 py-12 bg-neutral-900/10 rounded-2xl border border-dashed border-white/5 mt-6">
          <Users className="w-8 h-8 mx-auto mb-2 text-neutral-600 animate-pulse" />
          <p className="text-sm">No leader or members assigned yet.</p>
        </div>
      )}
    </div>
  );
}

