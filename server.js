// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");

const app = express();
const PORT = process.env.PORT || 3000;

/* ========== DB ========== */
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Mongo connected"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

/* ========== Middlewares ========== */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  })
);

// CSRF protection (apply to routes that render forms)
// app.use(csrf({ cookie: true }));

// // // expose csrfToken and currentUser minimal helper
// app.use((req, res, next) => {
//   res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
//   res.locals.user = req.session.user || null;
//   next();
// });

// /* ========== Routes (mount later) ========== */
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/register/form"); // redirect logged-in users to form
  } else {
    res.redirect("/auth/login"); // redirect guests to login
  }
});

const authRoutes = require("./routes/auth");
const regRoutes = require("./routes/reg");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");

app.use("/auth", authRoutes);
app.use("/register", regRoutes);
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);

/* ========== Start ========== */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
