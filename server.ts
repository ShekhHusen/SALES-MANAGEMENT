import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// In-memory store for Tally Data (Ledgers)
let tallyLedgers: Record<string, any> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API POST: Receive sync from Local custom script
  app.post("/api/tally/sync", (req, res) => {
    try {
      const { ledgers } = req.body;
      if (ledgers && Array.isArray(ledgers)) {
        // Store ledgers locally keyed by name or a normalized name
        ledgers.forEach(l => {
          tallyLedgers[l.name.toLowerCase()] = l;
        });
        console.log(`Synced ${ledgers.length} ledgers from Tally.`);
        res.json({ success: true, count: ledgers.length });
      } else {
        res.status(400).json({ error: "Invalid payload format. Expected { ledgers: [...] }" });
      }
    } catch (e) {
      console.error('Tally Sync Error:', e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // API GET: Fetch a specific ledger
  app.get("/api/tally/ledger", (req, res) => {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Missing name parameter" });
    }
    const ledger = tallyLedgers[name.toLowerCase()];
    if (ledger) {
      res.json({ success: true, ledger });
    } else {
      res.json({ success: false, error: "Ledger not found", suggestion: "Make sure you ran the tally-connector script to sync realtime data." });
    }
  });

  // API GET: Return all tally data
  app.get("/api/tally/all", (req, res) => {
      res.json({ success: true, ledgers: Object.values(tallyLedgers) });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
