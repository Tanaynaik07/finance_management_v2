require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");

const connectDB = require("./config/db");
const passport = require("./config/passport");

const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");

const app = express();

connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Make flash messages + current user available in every view
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user || null;
  next();
});

app.get("/", (req, res) =>
  req.isAuthenticated() ? res.redirect("/dashboard") : res.render("landing")
);
app.get("/privacy", (req, res) => res.render("privacy"));
app.get("/terms", (req, res) => res.render("terms"));

app.use(authRoutes);
app.use(transactionRoutes);

app.use((req, res) => res.status(404).render("404"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));