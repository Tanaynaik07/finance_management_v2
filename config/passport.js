const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// --- Local strategy: email + password ---
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return done(null, false, { message: "No account with that email." });
      if (!user.password) {
        return done(null, false, { message: "That account uses Google Sign-In. Try 'Continue with Google'." });
      }
      if (!user.isVerified) {
        return done(null, false, { message: "Please verify your email before logging in." });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false, { message: "Incorrect password." });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// --- Google OAuth strategy: sign in with Google ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        const email = profile.emails && profile.emails[0] && profile.emails[0].value;

        // Link to an existing email/password account if one exists
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            user.googleId = profile.id;
            user.isVerified = true; // Google already verified this email
            await user.save();
            return done(null, user);
          }
        }

        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email ? email.toLowerCase() : undefined,
          isVerified: true,
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
