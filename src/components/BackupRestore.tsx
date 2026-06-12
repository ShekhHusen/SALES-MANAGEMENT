import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Upload, DatabaseBackup } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, writeBatch, doc } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';

export function BackupRestore() {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    setIsProcessing(true);
    toast.info('Generating system backup...');
    try {
      const collections = ['vehicles', 'purchases', 'sales', 'parties', 'companies', 'models'];
      const backupData: any = {};

      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        backupData[colName] = snap.docs.map(d => {
          const data = d.data();
          // Convert Timestamps to ISO strings for JSON serialization
          for (const key in data) {
            if (data[key] && typeof data[key].toDate === 'function') {
              data[key] = { __type: 'timestamp', value: data[key].toDate().toISOString() };
            }
          }
          return { id: d.id, ...data };
        });
      }

      const str = JSON.stringify(backupData, null, 2);
      const blob = new Blob([str], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `System_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Backup generated successfully!');
    } catch (error) {
      console.error('Backup error', error);
      toast.error('Failed to generate backup.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('WARNING: Restoring a backup will overwrite existing data with the same IDs. Are you sure you want to proceed?')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          setIsProcessing(true);
          toast.info('Restoring backup...');
          const text = evt.target?.result as string;
          const backupData = JSON.parse(text);
          
          let currentBatch = writeBatch(db);
          let opCount = 0;
          let totalOps = 0;

          const commitBatchIfNeeded = async () => {
            if (opCount > 450) {
              await currentBatch.commit();
              currentBatch = writeBatch(db);
              opCount = 0;
            }
          };

          for (const colName of Object.keys(backupData)) {
            const records = backupData[colName];
            if (Array.isArray(records)) {
              for (const record of records) {
                const docId = record.id;
                delete record.id;

                // Re-hydrate timestamps
                for (const key in record) {
                  if (record[key] && record[key].__type === 'timestamp') {
                    record[key] = new Date(record[key].value);
                  }
                }

                currentBatch.set(doc(db, colName, docId), record, { merge: true });
                opCount++;
                totalOps++;
                await commitBatchIfNeeded();
              }
            }
          }

          if (opCount > 0) {
            await currentBatch.commit();
          }

          toast.success(`Restore complete! Processed ${totalOps} records.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
          console.error('Restore error', error);
          toast.error('Failed to restore backup. Invalid file format or database error.');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden mt-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
           <DatabaseBackup className="w-5 h-5 text-slate-500" />
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Deep Backup & Restore</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">Download a complete JSON database snapshot or restore from an existing one.</p>
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Button onClick={exportBackup} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0">
            <Download className="w-4 h-4 mr-2" />
            Download Backup (.json)
          </Button>
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept="application/json" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isProcessing} 
                variant="outline" 
                className="font-bold border-slate-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              Restore Backup
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
