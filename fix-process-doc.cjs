const fs = require('fs');
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf-8');

// State
code = code.replace(
  "const [emiInterest, setEmiInterest] = useState<number | ''>(''); // in annum percentage",
  "const [emiInterest, setEmiInterest] = useState<number | ''>(''); // in annum percentage\n  const [emiStartDate, setEmiStartDate] = useState(''); // manually start date"
);

// Save to DB (addDoc)
const addDocEmiRegex = /emiDownPayment: Number\(emiDownPayment\) \|\| 0,\n\s*createdAt: serverTimestamp\(\),/;
const addDocEmiReplacement = `emiDownPayment: Number(emiDownPayment) || 0,
            startDate: emiStartDate ? new Date(emiStartDate).toISOString() : new Date().toISOString(),
            createdAt: serverTimestamp(),`;
code = code.replace(addDocEmiRegex, addDocEmiReplacement);

// otherDetails load (useEffect / handleEdit)
code = code.replace(
  "setEmiPeriod(selectedSale.otherDetails?.emiPeriod ?? '');",
  "setEmiPeriod(selectedSale.otherDetails?.emiPeriod ?? '');\n      setEmiStartDate(selectedSale.otherDetails?.emiStartDate ?? '');"
);

// handleNext
code = code.replace(
  "setEmiPeriod(selectedSale.otherDetails?.emiPeriod ?? '');",
  "setEmiPeriod(selectedSale.otherDetails?.emiPeriod ?? '');\n      setEmiStartDate(selectedSale.otherDetails?.emiStartDate ?? '');"
);

// handleTempSave
code = code.replace(
  "emiInterest: emiInterest !== '' ? Number(emiInterest) : null,",
  "emiInterest: emiInterest !== '' ? Number(emiInterest) : null,\n        emiStartDate,"
);

// UI
const uiEmiRegex = /<div className="space-y-3">\n\s*<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interest \(\% p\.a\.\)<\/label>\n\s*<Input \n\s*type="number" \n\s*value=\{emiInterest\} \n\s*onChange=\{\(e\) => setEmiInterest\(e\.target\.value \? Number\(e\.target\.value\) : ''\)\}\n\s*className="h-\[40px\] rounded-xl bg-white dark:bg-slate-900"\n\s*\/>\n\s*<\/div>/;

const uiEmiReplacement = `<div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interest (% p.a.)</label>
                    <Input 
                      type="number" 
                      value={emiInterest} 
                      onChange={(e) => setEmiInterest(e.target.value ? Number(e.target.value) : '')}
                      className="h-[40px] rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">EMI Start Date</label>
                    <Input 
                      type="date" 
                      value={emiStartDate} 
                      onChange={(e) => setEmiStartDate(e.target.value)}
                      className="h-[40px] rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>`;

code = code.replace(uiEmiRegex, uiEmiReplacement);

fs.writeFileSync('src/pages/process-document.tsx', code);
