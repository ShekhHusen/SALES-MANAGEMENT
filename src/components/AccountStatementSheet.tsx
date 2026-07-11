import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Party } from '@/types';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAccountBalances } from '@/hooks/useAccountBalances';

interface AccountStatementSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    party: Party | null;
}

export function AccountStatementSheet({ open, onOpenChange, party }: AccountStatementSheetProps) {
    const { parties } = useGlobalData();
    const { mappings, openings, transactions } = useAccountBalances(parties);

    const statementData = useMemo(() => {
        if (!party) return { opening: null, transactions: [] };
        
        // Find mapped name
        const mappedAccountName = Object.keys(mappings).find(key => mappings[key] === party.id);
        const accountName = mappedAccountName || party.name;
        
        if (!accountName) return { opening: null, transactions: [] };

        const accNameKey = accountName.trim().toLowerCase();

        const opp = openings.find(o => o.accountName && o.accountName.trim().toLowerCase() === accNameKey);

        const txs = transactions.filter(t => t.particulars && t.particulars.trim().toLowerCase() === accNameKey)
            .sort((a, b) => {
                // sort by date
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

        // Calculate running balance
        let runningBal = (opp?.debit || 0) - (opp?.credit || 0);
        
        let txDebitTotal = 0;
        let txCreditTotal = 0;

        const mappedTxs = txs.map(t => {
            runningBal += (t.debit || 0) - (t.credit || 0);
            txDebitTotal += (t.debit || 0);
            txCreditTotal += (t.credit || 0);
            return {
                ...t,
                runningBalance: `${Math.abs(runningBal).toFixed(2)} ${runningBal >= 0 ? (runningBal > 0 ? 'Dr' : '') : 'Cr'}`
            }
        });

        return { opening: opp, transactions: mappedTxs, txDebitTotal, txCreditTotal, finalBal: runningBal };
    }, [party, mappings, openings, transactions]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-4">
                        Account Statement: {party?.name}
                    </SheetTitle>
                </SheetHeader>
                
                {party && (
                    <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold w-[100px]">Date</th>
                                        <th className="px-4 py-3 font-semibold">Type</th>
                                        <th className="px-4 py-3 font-semibold">Vch No.</th>
                                        <th className="px-4 py-3 font-semibold max-w-[250px]">Narration</th>
                                        <th className="px-4 py-3 font-semibold text-right">Debit</th>
                                        <th className="px-4 py-3 font-semibold text-right">Credit</th>
                                        <th className="px-4 py-3 font-semibold text-right text-blue-600 dark:text-blue-400 min-w-[120px]">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-b dark:border-slate-800">
                                        <td className="px-4 py-3 font-medium text-slate-500">{statementData.opening?.date || '-'}</td>
                                        <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">Opening Balance</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-right font-medium">{statementData.opening?.debit ? statementData.opening.debit.toFixed(2) : ''}</td>
                                        <td className="px-4 py-3 text-right font-medium">{statementData.opening?.credit ? statementData.opening.credit.toFixed(2) : ''}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {(() => {
                                                const db = statementData.opening?.debit || 0;
                                                const cr = statementData.opening?.credit || 0;
                                                const isDr = db >= cr;
                                                return `${Math.abs(db - cr).toFixed(2)} ${isDr && (db > cr) ? 'Dr' : cr > db ? 'Cr' : ''}`;
                                            })()}
                                        </td>
                                    </tr>
                                    {statementData.transactions.map((tx, i) => (
                                        <tr key={i} className="border-b dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900">
                                            <td className="px-4 py-3 text-slate-500">{tx.date}</td>
                                            <td className="px-4 py-3 font-medium">{tx.vchType}</td>
                                            <td className="px-4 py-3 font-medium text-slate-500">{tx.vchNo}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[250px] truncate" title={tx.narration}>{tx.narration}</td>
                                            <td className="px-4 py-3 text-right font-medium">{tx.debit ? tx.debit.toFixed(2) : ''}</td>
                                            <td className="px-4 py-3 text-right font-medium">{tx.credit ? tx.credit.toFixed(2) : ''}</td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{tx.runningBalance}</td>
                                        </tr>
                                    ))}
                                    {statementData.transactions.length === 0 && !statementData.opening && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No account history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                                {statementData.transactions.length > 0 && (
                                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold sticky bottom-0 z-10">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-right">Grand Total</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-blue-600 dark:text-blue-400">{statementData?.txDebitTotal?.toFixed(2) || ''}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-blue-600 dark:text-blue-400">{statementData?.txCreditTotal?.toFixed(2) || ''}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">
                                                {Math.abs(statementData.finalBal || 0).toFixed(2)} {(statementData.finalBal || 0) >= 0 ? ((statementData.finalBal || 0) > 0 ? 'Dr' : '') : 'Cr'}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
