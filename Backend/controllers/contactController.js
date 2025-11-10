const path = require("path");
const nodemailer = require("nodemailer");
const Event = require(path.join(__dirname, "..", "models", "Event"));

let sgMail = null;
// Support either SENDGRID_API_KEY (common) or SENDGRID_SECRET (your secret that may contain the API key).
// Some dashboards provide a SID + SECRET pair; the SECRET typically contains the actual API key.
const sendgridKey =
  process.env.SENDGRID_API_KEY || process.env.SENDGRID_SECRET || null;
if (sendgridKey) {
  try {
    sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(sendgridKey);
    if (process.env.SENDGRID_SID) {
      // SID is informational only for our usage; the SDK requires the API key.
      console.info(
        "SendGrid SID provided (not used as API key)",
        process.env.SENDGRID_SID
      );
    }
    // Do not print keys; just confirm that a key was found and sgMail configured.
    console.info("SendGrid configured (API key present)");
  } catch (e) {
    console.warn("@sendgrid/mail not available", e && e.message);
    sgMail = null;
  }
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Create transport using env configuration. Expect these env vars:
// SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false), SMTP_USER, SMTP_PASS, MAIL_FROM
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const secure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) {
    // missing SMTP config - return null to indicate transport unavailable
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// POST /api/contact
// body: { name, regno, email, branch, college, message, eventId }
async function sendContactEmail(req, res) {
  try {
    const { name, regno, email, branch, college, message, eventId } =
      req.body || {};

    // If user is authenticated, prefer their profile values when fields missing
    let actorEmail = email;
    let actorName = name;
    if (req.user && req.user.id) {
      try {
        const User = require(path.join(__dirname, "..", "models", "User"));
        const user = await User.findById(req.user.id).lean();
        if (user) {
          actorEmail = actorEmail || user.email;
          actorName = actorName || user.name || user.regno || actorEmail;
        }
      } catch (e) {
        // ignore
      }
    }

    // require minimal fields
    if (!actorName || !actorEmail)
      return res.status(400).json({ error: "Missing name or email" });

    // Determine recipient: prefer event.managerEmail
    let recipient = process.env.CONTACT_EMAIL || process.env.MAIL_TO || null;
    let eventTitle = "event";
    if (eventId) {
      try {
        const ev = await Event.findById(eventId).lean();
        if (ev) {
          eventTitle = ev.title || eventTitle;
          if (ev.managerEmail) recipient = ev.managerEmail;
        }
      } catch (e) {
        // ignore event lookup errors
      }
    }

    if (!recipient)
      return res.status(500).json({ error: "No recipient configured" });

    // Compose message
    const fromAddress =
      process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
    const subject = `Registration request for ${eventTitle}`;
    const bodyLines = [];
    bodyLines.push(`Name: ${actorName}`);
    if (regno) bodyLines.push(`Regno: ${regno}`);
    if (branch) bodyLines.push(`Branch: ${branch}`);
    if (college) bodyLines.push(`College: ${college}`);
    bodyLines.push(`Email: ${actorEmail}`);
    bodyLines.push("\nMessage:\n");
    bodyLines.push(message || "(no message provided)");

    const text = bodyLines.join("\n");

    // Build a professional HTML email with a card layout and emoji accents.
    const html = `
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f4f6f8; margin:0; padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:20px 24px; background:linear-gradient(90deg,#0ea5e9,#6366f1); color:#fff;">
                    <h2 style="margin:0; font-size:20px;">📨 New registration request</h2>
                    <div style="opacity:0.95; font-size:13px; margin-top:6px;">A user has sent a registration request via the Tara app</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px; color:#111827;">
                    <h3 style="margin:0 0 8px 0; font-size:16px;">Event: ${escapeHtml(
                      eventTitle
                    )}</h3>
                    <p style="margin:0 0 12px 0; color:#6b7280; font-size:13px;">Recipient: ${escapeHtml(
                      recipient
                    )}</p>

                    <table style="width:100%; border-collapse:collapse; margin-top:8px;">
                      <tr>
                        <td style="vertical-align:top; width:36px;">👤</td>
                        <td>
                          <strong>${escapeHtml(actorName)}</strong><br/>
                          <span style="color:#6b7280; font-size:13px;">${escapeHtml(
                            actorEmail
                          )}</span>
                        </td>
                      </tr>
                      ${
                        regno
                          ? `<tr><td style="vertical-align:top; width:36px;">🆔</td><td style="padding-top:8px; color:#374151;">Regno: ${escapeHtml(
                              regno
                            )}</td></tr>`
                          : ""
                      }
                      ${
                        branch
                          ? `<tr><td style="vertical-align:top; width:36px;">🏫</td><td style="padding-top:8px; color:#374151;">Branch: ${escapeHtml(
                              branch
                            )}</td></tr>`
                          : ""
                      }
                      ${
                        college
                          ? `<tr><td style="vertical-align:top; width:36px;">🎓</td><td style="padding-top:8px; color:#374151;">College: ${escapeHtml(
                              college
                            )}</td></tr>`
                          : ""
                      }
                    </table>

                    <div style="margin-top:16px; padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #eef2ff;">
                      <strong style="display:block; margin-bottom:6px;">Message</strong>
                      <div style="white-space:pre-wrap; color:#374151; font-size:14px;">${escapeHtml(
                        message
                      )}</div>
                    </div>

                    <p style="margin:16px 0 0 0; color:#6b7280; font-size:12px;">Reply to this email to contact the user directly. (Reply-To is set to the user's address)</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 24px; background:#f9fafb; color:#6b7280; font-size:12px; text-align:center;">
                    Sent from <strong>Tara</strong> • <span style="opacity:0.9">Thank you for organizing great events ✨</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // If SendGrid API key present, use HTTP API to send mail (avoids SMTP/timeouts)
    if (sgMail) {
      try {
        const msg = {
          to: recipient,
          from: fromAddress,
          subject,
          text,
          html,
          replyTo: actorEmail,
        };
        await sgMail.send(msg);
        return res.json({ success: true, provider: "sendgrid" });
      } catch (sgErr) {
        // Log useful SendGrid error detail without exposing secrets.
        try {
          const sgBody = sgErr && sgErr.response && sgErr.response.body;
          if (sgBody) console.error("sendContactEmail sendgrid response body:", sgBody);
        } catch (e) {
          // ignore logging errors
        }

        // If SendGrid returned 401 Unauthorized, return early with a helpful message
        // instead of trying SMTP (which often times out in hosted environments).
        const sgCode = sgErr && (sgErr.code || (sgErr.response && sgErr.response.statusCode));
        if (sgCode === 401) {
          console.error("SendGrid authorization failed (401). Check SENDGRID_API_KEY/SECRET in env.");
          return res.status(500).json({ error: "Email provider authorization failed (SendGrid 401). Check SENDGRID_API_KEY/SECRET." });
        }

        console.error("sendContactEmail sendgrid error", sgErr && (sgErr.message || sgErr));
        // continue to try SMTP fallback below
      }
    }

    // prepare transport for SMTP
    const transport = createTransport();
    if (!transport) {
      // SMTP not configured - fallback for development: save message to a local log file
      try {
        const fs = require("fs");
        const logDir = path.join(__dirname, "..", "logs");
        await fs.promises.mkdir(logDir, { recursive: true });
        const logFile = path.join(logDir, "contact-messages.jsonl");
        const fallbackEntry = {
          timestamp: new Date().toISOString(),
          eventId: eventId || null,
          eventTitle,
          recipient,
          actorName,
          actorEmail,
          regno: regno || null,
          branch: branch || null,
          college: college || null,
          message: message || null,
        };
        await fs.promises.appendFile(
          logFile,
          JSON.stringify(fallbackEntry) + "\n"
        );
        console.warn("SMTP not configured - saved contact message to", logFile);
        return res.json({ success: true, fallback: true, savedTo: logFile });
      } catch (e) {
        console.error("Failed to write fallback contact log", e);
        return res.status(500).json({ error: "SMTP not configured on server" });
      }
    }

    const mailOptions = {
      from: `${actorName} <${fromAddress}>`, // sent by server address
      to: recipient,
      subject,
      text,
      html,
      replyTo: actorEmail,
    };

    await transport.sendMail(mailOptions);
    return res.json({ success: true, provider: "smtp" });
  } catch (err) {
    console.error("sendContactEmail error", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
}

module.exports = { sendContactEmail };
