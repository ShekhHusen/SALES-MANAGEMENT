import express from "express";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

let firebaseConfig = {};
try {
  firebaseConfig = require("../firebase-applet-config.json");
} catch (e) {
  console.log("No config found. Falling back to memory.");
}

const fbApp = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = fbApp ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId) : null;

const app = express();
app.use(express.json());

// In-memory fallback
let tallyLedgers = {};

app.post("/api/tally/sync", async (req, res) => {
  try {
    const { ledgers } = req.body;
    if (ledgers && Array.isArray(ledgers)) {
      let count = 0;
      for (const l of ledgers) {
        if (!l.name) continue;
        const normalizedName = l.name.toLowerCase();
        
        // Write to Firestore if available
        if (db) {
           try {
             // encode document ID carefully (Firestore IDs can't have slashes)
             const docId = encodeURIComponent(normalizedName);
             await setDoc(doc(db, "tally_ledgers", docId), l, { merge: true });
             count++;
           } catch (e) {
             console.error("Firestore sync error:", e);
           }
        }
        
        // Always write to fallback in-memory cache
        tallyLedgers[normalizedName] = l;
      }
      res.json({ success: true, count: ledgers.length, firestorePush: !!db });
    } else {
      res.status(400).json({ error: "Invalid payload format." });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/tally/ledger", async (req, res) => {
  const name = req.query.name as string;
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
      ledger = tallyLedgers[normalizedName]; // fallback memory
  }

  if (ledger) {
    res.json({ success: true, ledger });
  } else {
    // We remove the deterministic mock to avoid confusion - if data isn't there, it isn't there.
    res.json({ 
      success: false, 
      suggestion: "Please run the local tally-connector.js script again. Make sure your business name matches exactly in Tally.",
      ledger: null
    });
  }
});

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

export default app;
