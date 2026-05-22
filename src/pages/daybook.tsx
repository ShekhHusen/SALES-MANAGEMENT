import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Settings, RefreshCw, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function Daybook() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'upload' | 'auto'>('view');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/tally/daybook?t=${timestamp}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      toast.error('Failed to fetch daybook data');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'view') {
      fetchData();
    }
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size limit on client side just to warn
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File is too large! Maximum allowed is 500MB');
      return;
    }

    setUploading(true);
    
    try {
       // Chunking logic to bypass limits
       const CHUNK_SIZE = 15 * 1024 * 1024; // 15MB chunks for faster upload
       const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
       const fileId = Date.now().toString() + "-" + encodeURIComponent(file.name);
       
       toast.loading(`Uploading file in ${totalChunks} chunks...`, { id: 'upload' });
       
       const uploadPromises = [];
       const maxConcurrent = 5; // higher concurrency
       let completed = 0;
       
       for (let i = 0; i < totalChunks; i++) {
           const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
           const formData = new FormData();
           formData.append('chunk', chunk, 'chunk');
           formData.append('fileId', fileId);
           formData.append('chunkIndex', i.toString());
           formData.append('totalChunks', totalChunks.toString());
           
           const uploadTask = async () => {
               const res = await fetch('/api/tally/daybook/upload-chunk', {
                   method: 'POST',
                   body: formData
               });
               if (!res.ok) throw new Error(`Chunk ${i} failed to upload`);
               completed++;
               toast.loading(`Uploaded chunk ${completed} of ${totalChunks}...`, { id: 'upload' });
           };
           
           uploadPromises.push(uploadTask);
       }
       
       // Run with concurrency limit
       for (let i = 0; i < uploadPromises.length; i += maxConcurrent) {
           const batch = uploadPromises.slice(i, i + maxConcurrent).map(fn => fn());
           await Promise.all(batch);
       }
       
       toast.loading('Processing uploaded file...', { id: 'upload' });
       
       // File fully uploaded, call finish
       const finishRes = await fetch('/api/tally/daybook/upload-finish', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ fileId, fileName: file.name, totalChunks })
       });
       
       if (!finishRes.ok) {
           const errData = await finishRes.json().catch(() => null);
           throw new Error(errData?.error || `Upload failed with status: ${finishRes.status}`);
       }
       
       const json = await finishRes.json();
       if (json.success) {
          toast.success(`Successfully parsed daybook! Extracted ${json.loaded} recent vouchers.`, { id: 'upload' });
          setActiveTab('view');
       } else {
          toast.error(json.error || 'Failed to parse file', { id: 'upload' });
       }
    } catch (e: any) {
       toast.error("Upload failed: " + e.message, { id: 'upload' });
    } finally {
       setUploading(false);
       if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
           <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-500" />
           Tally Daybook
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          View your complete Daybook data exported from Tally (supports large 500MB+ files).
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button 
           onClick={() => setActiveTab('view')}
           className={cn("px-4 py-2 font-bold text-sm rounded-t-lg transition-colors border-b-2", activeTab === 'view' ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400")}
        >Data Viewer</button>
        <button 
           onClick={() => setActiveTab('upload')}
           className={cn("px-4 py-2 font-bold text-sm rounded-t-lg transition-colors border-b-2 flex items-center gap-2", activeTab === 'upload' ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400")}
        ><Upload className="w-4 h-4" /> Manual Upload</button>
        <button 
           onClick={() => setActiveTab('auto')}
           className={cn("px-4 py-2 font-bold text-sm rounded-t-lg transition-colors border-b-2 flex items-center gap-2", activeTab === 'auto' ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800/50 dark:text-slate-400")}
        ><Settings className="w-4 h-4" /> Automatic Sync</button>
      </div>

      {activeTab === 'view' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Showing recent {data.length} transactions uploaded to memory.</CardDescription>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" className="h-9">
               <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
               Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto flex-1">
             {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">No daybook data found. Please use the Manual Upload tab or configure Automatic Sync to feed data into the web app.</p>
                  <Button onClick={() => setActiveTab('upload')} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-xl">
                    <Upload className="w-4 h-4 mr-2" /> Upload XML File
                  </Button>
                </div>
             ) : (
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                   <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider sticky top-0">
                     <tr>
                       <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">Date</th>
                       <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">Particulars (Party)</th>
                       <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">Vch Type</th>
                       <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">Vch No.</th>
                       <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody>
                     {data.map((row, i) => (
                       <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 group">
                         <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{row.date}</td>
                         <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">{row.party}</td>
                         <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                           <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide", row.type.toLowerCase().includes('sale') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : row.type.toLowerCase().includes('receipt') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>{row.type}</span>
                         </td>
                         <td className="px-6 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{row.number}</td>
                         <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100 text-right">₹ {row.amount}</td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'upload' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Manual Upload</CardTitle>
            <CardDescription>Upload large Tally Daybook exports directly from your browser.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="max-w-xl mx-auto space-y-6">
              
              <div 
                 onClick={() => !uploading && fileInputRef.current?.click()}
                 className={cn("border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200", uploading ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20 opacity-70" : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md")}
              >
                 <input 
                   type="file" 
                   className="hidden" 
                   ref={fileInputRef} 
                   onChange={handleFileUpload} 
                   accept=".xml,.json"
                 />
                 
                 {uploading ? (
                    <div className="flex flex-col items-center">
                       <RefreshCw className="w-12 h-12 text-indigo-600 dark:text-indigo-500 animate-spin mb-4" />
                       <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Processing large file...</h3>
                       <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Parsing Daybook transactions safely. This is optimized for files up to 500MB.</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center">
                       <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
                       <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Click to select Daybook XML/JSON</h3>
                       <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">We parse the XML intelligently via streams.</p>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full mt-4">Max Size: 500 MB</span>
                    </div>
                 )}
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'auto' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-indigo-900 border-b border-indigo-800 text-white">
            <CardTitle className="flex items-center gap-2 font-bold mb-1"><Settings className="w-5 h-5 text-indigo-400" /> Automatic Background Sync</CardTitle>
            <CardDescription className="text-indigo-200/80 font-medium">Keep your Dashboard up-to-date automatically by running a watcher script on the local machine.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-slate-50 dark:bg-slate-900">
             
             <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">1</div>
                   <div className="space-y-2">
                     <h4 className="font-bold text-slate-900 dark:text-slate-100">Setup Tally Export Directory</h4>
                     <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Configure Tally Prime or your TDL to export the Daybook (XML payload) periodically into a specific folder on your PC.</p>
                     <code className="text-xs font-mono font-medium block bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 p-3 rounded-lg border border-slate-200 dark:border-slate-700">C:\TallySync\Daybook</code>
                   </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">2</div>
                   <div className="space-y-4 w-full">
                     <h4 className="font-bold text-slate-900 dark:text-slate-100">Run the Automatic Watcher Script</h4>
                     <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Copy the following Node.js script to your computer and run it. It efficiently uploads 500MB+ files to this Cloud web app whenever a new file is exported.</p>
                     
                     <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-inner border border-slate-800">
                        <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-black/40">
                           <div className="flex items-center gap-2">
                             <FileCode className="w-4 h-4 text-emerald-400" />
                             <span className="text-xs font-bold text-slate-300 font-mono">tally-auto-sync.js</span>
                           </div>
                        </div>
                        <pre className="p-4 text-[11px] md:text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar'); // npm install chokidar form-data node-fetch (if <Node 18)
const FormData = require('form-data');

const WATCH_DIR = 'C:\\\\TallySync\\\\Daybook';
// NOTE: Replace 'localhost:3000' with your hosted Web App URL
const API_URL = 'http://localhost:3000';

console.log('🔄 Watcher started in:', WATCH_DIR);

chokidar.watch(WATCH_DIR).on('add', async (filePath) => {
  if (!filePath.endsWith('.xml') && !filePath.endsWith('.json')) return;
  console.log('🚀 Found new export:', filePath);

  try {
     const stats = fs.statSync(filePath);
     const CHUNK_SIZE = 5 * 1024 * 1024;
     const totalChunks = Math.ceil(stats.size / CHUNK_SIZE);
     const fileId = Date.now() + '-' + path.basename(filePath);
     
     const fd = fs.openSync(filePath, 'r');
     
     for (let i = 0; i < totalChunks; i++) {
        console.log(\`Uploading chunk \${i+1}/\${totalChunks}...\`);
        const buffer = Buffer.alloc(CHUNK_SIZE);
        const bytesRead = fs.readSync(fd, buffer, 0, CHUNK_SIZE, i * CHUNK_SIZE);
        const chunk = buffer.slice(0, bytesRead);
        
        const form = new FormData();
        form.append('chunk', chunk, 'chunk');
        form.append('fileId', fileId);
        
        const res = await fetch(API_URL + '/api/tally/daybook/upload-chunk', {
           method: 'POST', body: form
        });
        if (!res.ok) throw new Error('Chunk failed');
     }
     
     fs.closeSync(fd);
     console.log('✅ File uploaded. Processing...');
     
     const finish = await fetch(API_URL + '/api/tally/daybook/upload-finish', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ fileId, fileName: path.basename(filePath) })
     });
     
     const json = await finish.json();
     console.log('✅ Web App recognized data:', json);
  } catch (err) {
     console.error('❌ Upload failed:', err.message);
  }
});`}
                        </pre>
                     </div>
                   </div>
                </div>

             </div>

          </CardContent>
        </Card>
      )}

    </div>
  );
}
