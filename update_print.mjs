import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

const search = `  const handlePrint = () => {
    if (!selectedEmiForView) return;
    const doc = new jsPDF();
    doc.text("EMI Schedule & Details", 14, 15);
    
    // Customer Details
    doc.setFontSize(10);
    doc.text(\\\`Customer Name: \${selectedEmiForView.customerName}\\\`, 14, 25);
    doc.text(\\\`Contact: \${selectedEmiForView.customerContact}\\\`, 14, 30);
    doc.text(\\\`File No: \${selectedEmiForView.fileNumber || '---'}\\\`, 14, 35);
    
    // Inventory Details
    doc.text(\\\`Chassis Number: \${selectedEmiForView.chassisNumber}\\\`, 100, 25);
    doc.text(\\\`Vehicle Price: ₹\${(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}\\\`, 100, 30);
    doc.text(\\\`Down Payment: ₹\${(selectedEmiForView.emiDownPayment || 0).toLocaleString()}\\\`, 100, 35);
    doc.text(\\\`Loan Amount: ₹\${(selectedEmiForView.loanAmount || 0).toLocaleString()}\\\`, 100, 40);

    // Calculate Schedule
    const principal = selectedEmiForView.loanAmount || 0;
    const rate = selectedEmiForView.interestRate || 0;
    const months = selectedEmiForView.periodMonths || 0;
    const monthlyRate = rate / 12 / 100;
    const monthlyEmi = months > 0 
      ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;
    
    const basePrincipal = months > 0 && rate > 0 
      ? (principal * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : (months > 0 ? principal / months : 0);
    
    const startDate = selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date();

    let balance = principal;
    const tableData = [];

    for (let i = 0; i < months; i++) {
      const emiNo = i + 1;
      const emiDate = new Date(startDate);
      emiDate.setMonth(emiDate.getMonth() + emiNo);
      
      let principalForMonth = 0;
      let interestForMonth = 0;
      
      if (rate === 0) {
        principalForMonth = basePrincipal;
        interestForMonth = 0;
      } else {
        principalForMonth = basePrincipal * Math.pow(1 + monthlyRate, i);
        interestForMonth = monthlyEmi - principalForMonth;
      }
      
      balance -= principalForMonth;
      if (balance < 0) balance = 0;
      
      const paymentRecord = emiPaymentsList.find(p => p.emiNo === emiNo);
      const paymentDateStr = paymentRecord?.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : '';
      const paymentInfo = paymentRecord ? \\\`\${paymentRecord.receiptNumber} / ₹\${paymentRecord.amount.toLocaleString()} (\${paymentDateStr})\\\` : '-';

      tableData.push([
        \\\`#\${emiNo}\\\`,
        emiDate.toLocaleDateString('en-GB'),
        \\\`₹\${Math.round(principalForMonth).toLocaleString()}\\\`,
        \\\`₹\${Math.round(interestForMonth).toLocaleString()}\\\`,
        \\\`₹\${Math.round(balance).toLocaleString()}\\\`,
        paymentInfo
      ]);
    }

    autoTable(doc, {
      startY: 45,
      head: [['EMI No.', 'Date', 'Principle', 'Interest', 'Balance', 'Payment Info']],
      body: tableData,
    });
    
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };`;

const replace = `  const handlePrint = () => {
    if (!selectedEmiForView) return;

    const principal = selectedEmiForView.loanAmount || 0;
    const rate = selectedEmiForView.interestRate || 0;
    const months = selectedEmiForView.periodMonths || 0;
    const monthlyRate = rate / 12 / 100;
    const monthlyEmi = months > 0 
      ? (rate === 0 ? principal / months : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;
    
    const basePrincipal = months > 0 && rate > 0 
      ? (principal * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : (months > 0 ? principal / months : 0);
    
    const startDate = selectedEmiForView.createdAt ? new Date(selectedEmiForView.createdAt.seconds * 1000) : new Date();

    let balance = principal;
    
    let tableRows = '';

    for (let i = 0; i < months; i++) {
      const emiNo = i + 1;
      const emiDate = new Date(startDate);
      emiDate.setMonth(emiDate.getMonth() + emiNo);
      
      let principalForMonth = 0;
      let interestForMonth = 0;
      
      if (rate === 0) {
        principalForMonth = basePrincipal;
        interestForMonth = 0;
      } else {
        principalForMonth = basePrincipal * Math.pow(1 + monthlyRate, i);
        interestForMonth = monthlyEmi - principalForMonth;
      }
      
      balance -= principalForMonth;
      if (balance < 0) balance = 0;
      
      const paymentRecord = emiPaymentsList.find(p => p.emiNo === emiNo);
      const paymentDateStr = paymentRecord?.createdAt ? (paymentRecord.createdAt.seconds ? new Date(paymentRecord.createdAt.seconds * 1000) : new Date(paymentRecord.createdAt)).toLocaleDateString('en-GB') : '';
      const paymentInfo = paymentRecord ? \\\`\${paymentRecord.receiptNumber} / ₹\${paymentRecord.amount.toLocaleString()} (\${paymentDateStr})\\\` : '';

      tableRows += \\\`
        <tr>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">\${emiNo}</td>
          <td style="border: 1px solid black; padding: 8px;">\${emiDate.toLocaleDateString('en-GB')}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">₹\${Math.round(principalForMonth).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">₹\${Math.round(interestForMonth).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: right;">₹\${Math.round(balance).toLocaleString()}</td>
          <td style="border: 1px solid black; padding: 8px;">\${paymentInfo}</td>
        </tr>
      \\\`;
    }

    const printContent = \\\`
      <html>
        <head>
          <title>EMI Schedule - \${selectedEmiForView.fileNumber || selectedEmiForView.customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-decoration: underline; margin-bottom: 30px; }
            .details-container { display: flex; justify-content: space-between; margin-bottom: 30px; max-width: 800px; }
            .details-col { width: 48%; }
            .details-row { display: flex; margin-bottom: 8px; }
            .details-label { width: 150px; font-weight: normal; }
            table { width: 100%; max-width: 800px; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid black; padding: 8px; text-align: left; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>EMI Schedule and Details</h2>
          <div class="details-container">
            <div class="details-col">
              <div class="details-row"><div class="details-label">Customer Name:</div><div>\${selectedEmiForView.customerName || '---'}</div></div>
              <div class="details-row"><div class="details-label">Mobile Number:</div><div>\${selectedEmiForView.customerContact || '---'}</div></div>
              <div class="details-row"><div class="details-label">Chassis Number:</div><div>\${selectedEmiForView.chassisNumber || '---'}</div></div>
            </div>
            <div class="details-col">
              <div class="details-row"><div class="details-label">Vehicle Price:</div><div>₹\${(selectedEmiForView.emiVehiclePrice || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Down Payment:</div><div>₹\${(selectedEmiForView.emiDownPayment || 0).toLocaleString()}</div></div>
              <div class="details-row"><div class="details-label">Interest Rate:</div><div>\${selectedEmiForView.interestRate}%</div></div>
              <div class="details-row"><div class="details-label">Period:</div><div>\${selectedEmiForView.periodMonths} Months</div></div>
              <div class="details-row"><div class="details-label">Loan Amount:</div><div>₹\${(selectedEmiForView.loanAmount || 0).toLocaleString()}</div></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>EMI No.</th>
                <th>Date</th>
                <th>Principle</th>
                <th>Interest</th>
                <th>Balance</th>
                <th>Payment Info</th>
              </tr>
            </thead>
            <tbody>
              \${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    \\\`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };\``;

content = content.replace(search, replace);
fs.writeFileSync('src/pages/emi-management.tsx', content);
