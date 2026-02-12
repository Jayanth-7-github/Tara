const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const User = require(path.join(__dirname, "..", "models", "User"));

// Configure Google OAuth 2.0 strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const primaryEmail =
          (profile.emails && profile.emails[0] && profile.emails[0].value) ||
          null;

        if (!primaryEmail) {
          return done(null, false, {
            message: "No email returned from Google profile",
          });
        }

        const email = String(primaryEmail).toLowerCase();
        const name = profile.displayName || "Google User";

        let user = await User.findOne({ email });

        if (!user) {
          // For Google sign-in users we don't have a local password.
          // Store a random hash so the schema requirement is satisfied.
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const hash = await bcrypt.hash(randomPassword, 10);

          user = await User.create({
            email,
            name,
            password: hash,
          });
        }

        return done(null, user);
      } catch (err) {
        console.error("GoogleStrategy verify error:", err);
        return done(err);
      }
    },
  ),
);

// Basic (de)serialization in case it's ever needed by middleware.
passport.serializeUser((user, done) => {
  done(null, user.id || user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
