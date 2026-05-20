import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

let firebaseConfig = {};
try {
  firebaseConfig = require("./firebase-applet-config.json");
} catch (e) {
  console.log("No config found. Falling back to memory.");
}

const fbApp = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = fbApp ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId) : null;

// In-memory store for Tally Data (fallback)
let tallyLedgers: Record<string, any> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API POST: Receive sync from Local custom script
  app.post("/api/tally/sync", async (req, res) => {
    try {
      const { ledgers } = req.body;
      if (ledgers && Array.isArray(ledgers)) {
        let count = 0;
        for (const l of ledgers) {
          if (!l.name) continue;
          const normalizedName = l.name.toLowerCase();
          
          if (db) {
             try {
               const docId = encodeURIComponent(normalizedName);
               await setDoc(doc(db, "tally_ledgers", docId), l, { merge: true });
               count++;
             } catch (e) {
               console.error("Firestore sync error:", e);
             }
          }
          tallyLedgers[normalizedName] = l;
        }
        res.json({ success: true, count: ledgers.length, firestorePush: !!db });
      } else {
        res.status(400).json({ error: "Invalid payload format. Expected { ledgers: [...] }" });
      }
    } catch (e) {
      console.error('Tally Sync Error:', e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // API GET: Fetch a specific ledger
  app.get("/api/tally/ledger", async (req, res) => {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Missing name parameter" });
    }
    
    const normalizedName = name.toLowerCase();
    let ledger = null;

    if (db) {
       try {
         const docId = encodeURIComponent(normalizedName);
         const docSnap = await getDoc(doc(db, "tally_ledgers", docId));
         if (docSnap.exists()) {
            ledger = docSnap.data();
         }
       } catch (e) {
         console.error("Firestore fetch error:", e);
       }
    }
    
    if (!ledger) {
        ledger = tallyLedgers[normalizedName]; 
    }

    if (ledger) {
      res.json({ success: true, ledger });
    } else {
      res.json({ 
        success: false, 
        suggestion: "Please run the local tally-connector.js script again. Make sure your business name matches exactly in Tally.",
        ledger: null
      });
    }
  });

  // API GET: Return all tally data
  app.get("/api/tally/all", async (req, res) => {
    let ledgers = [];
    if (db) {
        try {
            const snap = await getDocs(collection(db, "tally_ledgers"));
            ledgers = snap.docs.map(d => d.data());
        } catch(e) {}
    }
    if (ledgers.length === 0) {
        ledgers = Object.values(tallyLedgers);
    }
    res.json({ success: true, ledgers });
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
