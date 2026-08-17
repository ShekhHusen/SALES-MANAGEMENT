const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

// add state for confirmation
code = code.replace(
  "const [selectedEmiForView, setSelectedEmiForView] = useState<EmiRecord | null>(null);",
  "const [selectedEmiForView, setSelectedEmiForView] = useState<EmiRecord | null>(null);\n  const [isCloseFileConfirmOpen, setIsCloseFileConfirmOpen] = useState(false);"
);

// update handleCloseFile to not ask for confirm natively
const handleCloseFileRegex = /  const handleCloseFile = async \(\) => \{\n    if \(!selectedEmiForView\) return;\n    if \(confirm\('Are you sure you want to close this file\? No further EMIs can be received\.'\)\) \{\n      try \{\n        await updateDoc\(doc\(db, 'emis', selectedEmiForView\.id\), \{\n          isClosed: true,\n          closedAt: Timestamp\.now\(\),\n          closedReason: 'Manually closed'\n        \}\);\n        toast\.success\('File closed successfully'\);\n        setSelectedEmiForView\(\{ \.\.\.selectedEmiForView, isClosed: true \}\);\n      \} catch \(error\) \{\n        console\.error\('Error closing file:', error\);\n        toast\.error\('Failed to close file'\);\n      \}\n    \}\n  \};/;

const handleCloseFileReplacement = `  const handleCloseFile = async () => {
    if (!selectedEmiForView) return;
    try {
      await updateDoc(doc(db, 'emis', selectedEmiForView.id), {
        isClosed: true,
        closedAt: Timestamp.now(),
        closedReason: 'Manually closed'
      });
      toast.success('File closed successfully');
      setSelectedEmiForView({ ...selectedEmiForView, isClosed: true });
      setIsCloseFileConfirmOpen(false);
    } catch (error) {
      console.error('Error closing file:', error);
      toast.error('Failed to close file');
    }
  };`;
code = code.replace(handleCloseFileRegex, handleCloseFileReplacement);

// Update Close File button to open custom dialog
const closeBtnRegex = /onClick=\{handleCloseFile\}/;
code = code.replace(closeBtnRegex, "onClick={() => setIsCloseFileConfirmOpen(true)}");

// Add confirmation dialog to the JSX
const dialogsRegex = /      \{\/\* Add Follow up Dialog \*\/\}/;
const dialogsReplacement = `      {/* Close File Confirmation Dialog */}
      <Dialog open={isCloseFileConfirmOpen} onOpenChange={setIsCloseFileConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Close EMI File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to close this file? No further EMIs can be received. This action cannot be undone easily.
            </p>
          </div>
          <DialogFooter className="flex gap-2 justify-end sm:justify-end">
            <Button variant="outline" onClick={() => setIsCloseFileConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCloseFile}>Yes, Close File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Follow up Dialog */}`;
code = code.replace(dialogsRegex, dialogsReplacement);

fs.writeFileSync('src/pages/emi-management.tsx', code);
