import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageStore } from '@/lib/trackedFirestore';
import { Activity, Database, RefreshCw, UploadCloud, Server } from 'lucide-react';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function UsageSection() {
  const { reads, writes, deletes, lastResetDate } = useUsageStore();
  
  // Daily Quotas
  // Free tier: 50K reads, 20K writes, 20K deletes
  const MAX_READS = 50000;
  const MAX_WRITES = 20000;
  // const MAX_DELETES = 20000;

  const readPercent = Math.min((reads / MAX_READS) * 100, 100);
  const writePercent = Math.min(((writes + deletes) / MAX_WRITES) * 100, 100);

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-8 mb-8">
      <div className="bg-blue-50 dark:bg-blue-900/10 px-6 py-4 border-b border-blue-200 dark:border-blue-900 flex items-center gap-2">
        <Server className="h-5 w-5 text-blue-500" />
        <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-500">Database Token Usage</h3>
      </div>
      <CardContent className="p-6">
        <CardDescription className="mb-6 mt-0">
          This tracking reflects the estimated number of document reads and writes your account has consumed during this browser session locally or across tabs today ({lastResetDate}). Free tier allows 50,000 reads and 20,000 writes per day per project.
        </CardDescription>

        <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <Database className="w-4 h-4 text-emerald-500" />
                Document Reads
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">{reads.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">/ {MAX_READS.toLocaleString()} MAX</span>
              </div>
            </div>
            <Progress value={readPercent} className="h-2.5 bg-slate-100 dark:bg-slate-800">
              <ProgressTrack className="h-2.5">
                <ProgressIndicator className={cn("h-full", readPercent > 80 ? "bg-red-500" : "bg-emerald-500")} />
              </ProgressTrack>
            </Progress>
            <p className="text-xs text-slate-500 font-medium">Estimated read tokens remaining: {(MAX_READS - Math.min(MAX_READS, reads)).toLocaleString()}</p>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <UploadCloud className="w-4 h-4 text-blue-500" />
                Document Writes & Deletes
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base">{(writes + deletes).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">/ {MAX_WRITES.toLocaleString()} MAX</span>
              </div>
            </div>
            <Progress value={writePercent} className="h-2.5 bg-slate-100 dark:bg-slate-800">
              <ProgressTrack className="h-2.5">
                <ProgressIndicator className={cn("h-full", writePercent > 80 ? "bg-red-500" : "bg-blue-500")} />
              </ProgressTrack>
            </Progress>
            <p className="text-xs text-slate-500 font-medium">Estimated write tokens remaining: {Math.max(0, MAX_WRITES - writes - deletes).toLocaleString()}</p>
          </div>

        </div>

      </CardContent>
    </Card>
  );
}
