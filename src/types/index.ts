import { Timestamp } from '@/lib/trackedFirestore';

export type BluebookStatus = 'Not Received' | 'Received';
export type NaamsariStatus = 'Pending' | 'Names of JBMT' | 'Customer Done' | 'VAT Bill Issued';
export type VehicleStatus = 'ready-to-purchase' | 'in-stock' | 'sold';
export type PartyType = 'vendor' | 'customer';

export interface Company {
  id: string;
  name: string;
}

export interface VehicleColor {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  name: string;
  companyId: string;
  termsAndConditions?: string;
  warrantyInfo?: string;
  showBatteryDetails?: boolean;
}

export interface Party {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  alternateNumber?: string;
  type: PartyType;
  tallyAccountId?: string;
  createdAt: Timestamp;
}

export interface Vehicle {
  id: string; // chassisNumber
  chassisNumber: string;
  companyId: string;
  modelId: string;
  color: string;
  registrationNumber?: string;
  bluebookStatus: BluebookStatus;
  naamsariStatus: NaamsariStatus;
  status: VehicleStatus;
  currentOwnerId?: string; // Party ID (vendor or customer)
  purchaseId?: string;
  saleId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Purchase {
  id: string;
  date: Timestamp;
  invoiceNumber: string;
  vendorId: string;
  chassisNumbers: string[];
  createdAt: Timestamp;
}

export interface Sale {
  id: string;
  date: Timestamp;
  customerId: string;
  chassisNumber: string;
  fileNumber: number;
  companyId: string;
  documentationCompleted?: boolean;
  driveFolderUrl?: string;
  otherDetails?: any;
  createdAt: Timestamp;
  status?: 'active' | 'returned';
  returnedAt?: Timestamp;
  returnReason?: string;
}

export interface OtherDetails {
  id: string;
  chassisNumber: string;
  saleId: string;
  price: number;
  batteryDetails: {
    numberOfBattery: number;
    category: string;
    model: string;
    productId: string;
    bluetoothId: string;
    serialNumbers: string[];
  };
  createdAt: Timestamp;
}

export interface DocumentUpload {
  id: string;
  chassisNumber: string;
  saleId: string;
  selfieUrl?: string;
  citizenshipFrontUrl?: string;
  citizenshipBackUrl?: string;
  passportSizePhotoUrl?: string;
  chequeUrl?: string;
  bikrinamaUrl?: string;
  createdAt: Timestamp;
}

export interface FollowUp {
  id: string;
  partyId: string;
  message: string;
  nextFollowUpDate: Timestamp | null;
  createdAt: Timestamp;
  createdByUid?: string;
  createdByName?: string;
  assignedToId?: string; // Users id (uid)
  assignedToName?: string;
  isCompleted?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface Emi {
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
}

export interface BusinessProfile {
  name: string;
  address: string;
  contactNumber: string;
}
