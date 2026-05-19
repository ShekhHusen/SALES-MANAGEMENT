import express from "express";

const app = express();
app.use(express.json());

// In-memory store for Vercel Serverless environment
// Note: Vercel functions are stateless and reset occasionally,
// so this data might disappear after a few hours of inactivity.
// For production, a real database (like Firestore) should be used.
let tallyLedgers = {};

app.post("/api/tally/sync", (req, res) => {
  try {
    const { ledgers } = req.body;
    if (ledgers && Array.isArray(ledgers)) {
      ledgers.forEach(l => {
        tallyLedgers[l.name.toLowerCase()] = l;
      });
      res.json({ success: true, count: ledgers.length });
    } else {
      res.status(400).json({ error: "Invalid payload format." });
    }
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/tally/ledger", (req, res) => {
  const name = req.query.name;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: "Missing name parameter" });
  }
  const ledger = tallyLedgers[name.toLowerCase()];
  if (ledger) {
    res.json({ success: true, ledger });
  } else {
    res.json({ 
      success: false, 
      error: "Ledger not found", 
      suggestion: "Serverless memory resets occasionally. Try running the sync script again." 
    });
  }
});

app.get("/api/tally/all", (req, res) => {
  res.json({ success: true, ledgers: Object.values(tallyLedgers) });
});

export default app;
