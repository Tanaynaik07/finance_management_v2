const express = require("express");
const router = express.Router();

const Transaction = require("../models/Transaction");
const { ensureAuthenticated } = require("../middleware/auth");

router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  res.render("dashboard", {
    user: req.user,
    transactions,
    income: totals.income,
    expense: totals.expense,
    balance: totals.income - totals.expense,
  });
});

router.post("/transactions", ensureAuthenticated, async (req, res) => {
  const { type, category, amount, description, date } = req.body;

  if (!type || !category || !amount) {
    req.flash("error", "Type, category, and amount are required.");
    return res.redirect("/dashboard");
  }

  await Transaction.create({
    user: req.user._id,
    type,
    category,
    amount: Number(amount),
    description,
    date: date ? new Date(date) : Date.now(),
  });

  res.redirect("/dashboard");
});

router.post("/transactions/:id/delete", ensureAuthenticated, async (req, res) => {
  await Transaction.deleteOne({ _id: req.params.id, user: req.user._id });
  res.redirect("/dashboard");
});

module.exports = router;
