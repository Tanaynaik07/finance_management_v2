function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash("error", "Please log in to continue.");
  res.redirect("/login");
}

function ensureGuest(req, res, next) {
  if (!req.isAuthenticated()) return next();
  res.redirect("/dashboard");
}

module.exports = { ensureAuthenticated, ensureGuest };
