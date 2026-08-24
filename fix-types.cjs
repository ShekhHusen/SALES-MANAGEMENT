const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf-8');

const emiRegex = /export interface Emi \{\n  id: string; \/\/ The emi ID\n  saleId: string;\n  chassisNumber: string;\n  customerId: string;\n  loanAmount: number;\n  interestRate: number;\n  periodMonths: number;\n  emiVehiclePrice: number;\n  emiDownPayment: number;\n  createdAt: Timestamp;\n\}/;

const emiReplacement = `export interface Emi {
  id: string; // The emi ID
  saleId: string;
  chassisNumber: string;
  customerId: string;
  loanAmount: number;
  interestRate: number;
  periodMonths: number;
  emiVehiclePrice: number;
  emiDownPayment: number;
  createdAt: Timestamp;
  startDate?: string;
  isClosed?: boolean;
  closedAt?: Timestamp;
  closedReason?: string;
}`;

code = code.replace(emiRegex, emiReplacement);
fs.writeFileSync('src/types/index.ts', code);
