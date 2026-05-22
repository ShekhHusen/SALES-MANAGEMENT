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

const CACHE_FILE = path.join(process.cwd(), 'daybook_cache.json');
let inMemoryDaybook: any[] = [];

// Load from cache on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    inMemoryDaybook = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded ${inMemoryDaybook.length} daybook records from cache.`);
  }
} catch (err) {
  console.log("Error loading cached daybook data:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // GET the daybook data
  app.get('/api/tally/daybook', (req, res) => {
     res.json({ success: true, data: inMemoryDaybook });
  });

  // POST upload daybook chunk (bypass 413)
  app.post('/api/tally/daybook/upload-chunk', upload.single('chunk'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No chunk uploaded" });
    try {
      const { fileId, chunkIndex } = req.body;
      const chunkFilePath = path.join(os.tmpdir(), `${fileId}_${chunkIndex}`);
      
      fs.renameSync(req.file.path, chunkFilePath);
      
      res.json({ success: true });
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  });

  // POST upload finish
  app.post('/api/tally/daybook/upload-finish', async (req, res) => {
    try {
      const { fileId, fileName, totalChunks } = req.body;
      const filePath = path.join(os.tmpdir(), fileId);
      
      // Combine chunks if totalChunks is provided
      if (totalChunks) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          for (let i = 0; i < totalChunks; i++) {
             const chunkPath = path.join(os.tmpdir(), `${fileId}_${i}`);
             if (fs.existsSync(chunkPath)) {
                 fs.appendFileSync(filePath, fs.readFileSync(chunkPath));
                 fs.unlinkSync(chunkPath);
             } else {
                 return res.status(400).json({ error: `Missing chunk ${i}` });
             }
          }
      }

      if (!fs.existsSync(filePath)) {
          return res.status(400).json({ error: "Uploaded file not found" });
      }

      const fileExt = fileName.toLowerCase();
      const isXml = fileExt.endsWith('.xml');
      
      let newRecords: any[] = [];
      let count = 0;

      if (isXml) {
        let fileEncoding: BufferEncoding = 'utf8';
        try {
           const fd = fs.openSync(filePath, 'r');
           const headerBuf = Buffer.alloc(4);
           fs.readSync(fd, headerBuf, 0, 4, null);
           fs.closeSync(fd);
           if ((headerBuf[0] === 0xFF && headerBuf[1] === 0xFE) || 
               (headerBuf[0] === 0x3C && headerBuf[1] === 0x00)) {
               fileEncoding = 'utf16le';
               console.log("Detected UTF-16LE encoding for XML.");
           }
        } catch(e) {}
        
        const fileStream = fs.createReadStream(filePath, { encoding: fileEncoding, highWaterMark: 256 * 1024 });
        let buffer = '';

        for await (const chunk of fileStream) {
           buffer += chunk;
           
           while (true) {
              const uBuffer = buffer.toUpperCase();
              const startIndex = uBuffer.indexOf('<VOUCHER');
              if (startIndex === -1) break;
              
              const remainingBuffer = uBuffer.substring(startIndex);
              const relativeEndIndex = remainingBuffer.indexOf('</VOUCHER>');
              
              if (relativeEndIndex === -1) {
                 break;
              }
              
              const endIndex = startIndex + relativeEndIndex + 10;
              const currentBlock = buffer.substring(startIndex, endIndex);
              
              const dateMatch = currentBlock.match(/<DATE[^>]*>([\\s\\S]*?)<\/DATE>/i);
              const typeMatch = currentBlock.match(/<(?:VOUCHERTYPENAME|VCHTYPE)[^>]*>([\\s\\S]*?)<\/(?:VOUCHERTYPENAME|VCHTYPE)>/i);
              const noMatch = currentBlock.match(/<(?:VOUCHERNUMBER|VCHNO)[^>]*>([\\s\\S]*?)<\/(?:VOUCHERNUMBER|VCHNO)>/i);
              const partyMatch = currentBlock.match(/<PARTYLEDGERNAME[^>]*>([\\s\\S]*?)<\/PARTYLEDGERNAME>/i);
              const amtMatch = currentBlock.match(/<AMOUNT[^>]*>([\\s\\S]*?)<\/AMOUNT>/i);
              
              if (typeMatch || dateMatch || partyMatch || amtMatch) {
                 newRecords.push({
                   id: count.toString() + Math.random().toString().slice(2, 6),
                   date: dateMatch ? dateMatch[1].trim() : 'Unknown',
                   type: typeMatch ? typeMatch[1].trim() : 'Unknown',
                   number: noMatch ? noMatch[1].trim() : '-',
                   party: partyMatch ? partyMatch[1].trim() : 'Unknown',
                   amount: amtMatch ? amtMatch[1].replace('-', '').trim() : '0.00',
                 });
                 count++;
                 if (newRecords.length > 50000) {
                     newRecords.shift(); // keep only last 50000 to avoid OOM
                 }
              }
              
              buffer = buffer.substring(endIndex);
           }
           
           if (buffer.length > 2000000) {
              buffer = buffer.substring(buffer.length - 1000); // Prevent infinite growth
           }
        }
      } else {
         // Basic JSON block counter fallback
         const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
         for await (const chunk of fileStream) {
            const matches = chunk.match(/"VOUCHERTYPENAME"/g);
            if (matches) {
               for (let i = 0; i < matches.length; i++) {
                 count++;
                 newRecords.push({
                     id: count.toString(),
                     date: "JSON Record",
                     type: "JSON Extracted",
                     party: "Party",
                     amount: "0"
                 });
                 if (newRecords.length > 500) newRecords.shift();
               }
            }
         }
      }

      inMemoryDaybook = newRecords.reverse();
      try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(inMemoryDaybook, null, 2), 'utf8');
      } catch (err) {
        console.error("Failed to write daybook to cache file:", err);
      }
      fs.unlinkSync(filePath); // clean up temp file
      res.json({ success: true, count, loaded: inMemoryDaybook.length });
    } catch (e: any) {
       console.error("Finish Upload Error:", e);
       res.status(500).json({ error: "Failed to parse file: " + e.message });
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
