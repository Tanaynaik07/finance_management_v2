const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const router = express.Router();

const User = require("../models/User");
const { sendMail } = require("../utils/gmail");
const { ensureGuest } = require("../middleware/auth");

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ---------- Signup ----------
router.get("/signup", ensureGuest, (req, res) => res.render("signup"));

router.post("/signup", ensureGuest, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      req.flash("error", "All fields are required.");
      return res.redirect("/signup");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      req.flash("error", "An account with that email already exists.");
      return res.redirect("/signup");
    }

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = makeToken();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      isVerified: false,
      verifyToken,
      verifyTokenExpires: Date.now() + TOKEN_TTL_MS,
    });

    const verifyUrl = `${process.env.BASE_URL}/verify/${verifyToken}`;
    await sendMail({
      to: user.email,
      subject: "Verify your Finance Manager account",
      html: `<p>Hi ${name},</p>
             <p>Click the link below to verify your email (expires in 1 hour):</p>
             <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    req.flash("success", "Account created! Check your email to verify before logging in.");
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/signup");
  }
});

// ---------- Email verification ----------
router.get("/verify/:token", async (req, res) => {
  const user = await User.findOne({
    verifyToken: req.params.token,
    verifyTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Verification link is invalid or has expired.");
    return res.redirect("/login");
  }

  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();

  req.flash("success", "Email verified! You can now log in.");
  res.redirect("/login");
});

// ---------- Login / Logout ----------
router.get("/login", ensureGuest, (req, res) => res.render("login"));

router.post("/login", ensureGuest, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash("error", info?.message || "Login failed.");
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/dashboard");
    });
  })(req, res, next);
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
});

// ---------- Google OAuth ----------
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
  (req, res) => res.redirect("/dashboard")
);

// ---------- Forgot / reset password ----------
router.get("/forgot-password", ensureGuest, (req, res) => res.render("forgot-password"));

router.post("/forgot-password", ensureGuest, async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });

  // Always show the same message, whether or not the account exists,
  // so the form can't be used to check which emails are registered.
  const genericMessage = "If that email is registered, a reset link has been sent.";

  if (!user || !user.password) {
    req.flash("success", genericMessage);
    return res.redirect("/forgot-password");
  }

  const resetToken = makeToken();
  user.resetToken = resetToken;
  user.resetTokenExpires = Date.now() + TOKEN_TTL_MS;
  await user.save();

  const resetUrl = `${process.env.BASE_URL}/reset-password/${resetToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Finance Manager password",
    html: `<p>Click the link below to reset your password (expires in 1 hour):</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>If you didn't request this, you can ignore this email.</p>`,
  });

  req.flash("success", genericMessage);
  res.redirect("/forgot-password");
});

router.get("/reset-password/:token", ensureGuest, async (req, res) => {
  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Reset link is invalid or has expired.");
    return res.redirect("/forgot-password");
  }

  res.render("reset-password", { token: req.params.token });
});

router.post("/reset-password/:token", ensureGuest, async (req, res) => {
  const { password, confirmPassword } = req.body;
  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Reset link is invalid or has expired.");
    return res.redirect("/forgot-password");
  }

  if (!password || password !== confirmPassword) {
    req.flash("error", "Passwords do not match.");
    return res.redirect(`/reset-password/${req.params.token}`);
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  req.flash("success", "Password updated. Please log in.");
  res.redirect("/login");
});

module.exports = router;
