const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

const handlePrintRegex = /  const handlePrint = \(\) => \{/;

const handleCloseFile = `
  const handleCloseFile = async () => {
    if (!selectedEmiForView) return;
    if (confirm('Are you sure you want to close this file? No further EMIs can be received.')) {
      try {
        await updateDoc(doc(db, 'emis', selectedEmiForView.id), {
          isClosed: true,
          closedAt: Timestamp.now(),
          closedReason: 'Manually closed'
        });
        toast.success('File closed successfully');
        setSelectedEmiForView({ ...selectedEmiForView, isClosed: true });
      } catch (error) {
        console.error('Error closing file:', error);
        toast.error('Failed to close file');
      }
    }
  };

  const handlePrint = () => {`;

code = code.replace(handlePrintRegex, handleCloseFile);

const printBtnRegex = /<Button variant="outline" size="sm" onClick=\{handlePrint\} className="gap-2 h-9 px-3">\n\s*<Printer className="w-4 h-4" \/>\n\s*Print\n\s*<\/Button>/;

const updatedPrintBtn = `<Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 h-9 px-3">
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                    {!selectedEmiForView.isClosed && (
                      <Button variant="outline" size="sm" onClick={handleCloseFile} className="gap-2 h-9 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/30">
                        <Lock className="w-4 h-4" />
                        Close File
                      </Button>
                    )}
                    {selectedEmiForView.isClosed && (
                      <Badge variant="outline" className="h-9 px-3 gap-1 bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900/50">
                        <Lock className="w-3.5 h-3.5" />
                        Closed
                      </Badge>
                    )}`;

code = code.replace(printBtnRegex, updatedPrintBtn);

// Also need to prevent adding payments if the file is closed.
const receivePaymentRegex = /<DialogTitle>Receive EMI Payment - #\{paymentEmiDetail\?\.emiNo\}<\/DialogTitle>/;
const receivePaymentReplacement = `<DialogTitle>Receive EMI Payment - #{paymentEmiDetail?.emiNo}</DialogTitle>
            {selectedEmiForView?.isClosed && (
              <p className="text-sm text-red-500 mt-2 font-medium">This file is closed. You cannot add new payments.</p>
            )}`;
code = code.replace(receivePaymentRegex, receivePaymentReplacement);

// Disable "Receive Payment" button inside the modal
const receivePaymentBtnRegex = /<Button \n\s*onClick=\{handleReceivePayment\} \n\s*disabled=\{isSavingPayment \|\| !paymentAmount\}/;
const receivePaymentBtnReplacement = `<Button 
              onClick={handleReceivePayment} 
              disabled={isSavingPayment || !paymentAmount || selectedEmiForView?.isClosed}`;
code = code.replace(receivePaymentBtnRegex, receivePaymentBtnReplacement);

// Disable Checkbox
const checkboxRegex = /<Checkbox \n\s*checked=\{isPaid\} \n\s*disabled=\{isPaid\} \n\s*onCheckedChange=\{\(\) => \{/;
const checkboxReplacement = `<Checkbox 
                                      checked={isPaid} 
                                      disabled={isPaid || selectedEmiForView.isClosed} 
                                      onCheckedChange={() => {`;
code = code.replace(checkboxRegex, checkboxReplacement);


fs.writeFileSync('src/pages/emi-management.tsx', code);
