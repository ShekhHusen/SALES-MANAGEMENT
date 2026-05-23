import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import multer from "multer";
import os from "os";
import fs from "fs";
import { createReadStream } from "fs";
import readline from "readline";

let firebaseConfig = {};
try {
  // @ts-ignore
  firebaseConfig = require("./firebase-applet-config.json");
} catch (e) {
  console.log("No config found. Falling back to memory.");
}

const fbApp = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = fbApp ? getFirestore(fbApp, (firebaseConfig as any).firestoreDatabaseId) : null;

const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});



const INTERNAL_ACCOUNTS_FILE = path.join(process.cwd(), 'internal_accounts_data.json');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Internal Accounts API
  app.get('/api/internal-accounts', (req, res) => {
     if (fs.existsSync(INTERNAL_ACCOUNTS_FILE)) {
         try {
             const content = fs.readFileSync(INTERNAL_ACCOUNTS_FILE, 'utf8');
             if (content) {
                 const data = JSON.parse(content);
                 return res.json(data);
             }
         } catch(e) {}
     }
     res.json({ openings: [], transactions: [] });
  });

  app.post('/api/internal-accounts', (req, res) => {
     try {
         fs.writeFileSync(INTERNAL_ACCOUNTS_FILE, JSON.stringify(req.body), 'utf8');
         res.json({ success: true });
     } catch(e: any) {
         res.status(500).json({ error: e.message });
     }
  });

  app.post('/api/internal-accounts/clear', (req, res) => {
     try {
       let data = { openings: [], transactions: [] };
       if (fs.existsSync(INTERNAL_ACCOUNTS_FILE)) {
         const content = fs.readFileSync(INTERNAL_ACCOUNTS_FILE, 'utf8');
         if (content) {
             try {
                data = JSON.parse(content);
             } catch(e) {}
         }
       }
       if (req.body.type === 'openings') {
         data.openings = [];
       } else if (req.body.type === 'transactions') {
         data.transactions = [];
       }
       fs.writeFileSync(INTERNAL_ACCOUNTS_FILE, JSON.stringify(data), 'utf8');
       res.json({ success: true });
     } catch (e: any) {
       res.status(500).json({ error: e.message });
     }
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
