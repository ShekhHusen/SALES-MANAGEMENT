import { Timestamp } from 'firebase/firestore';

export type BluebookStatus = 'Not Received' | 'Received';
export type NaamsariStatus = 'Pending' | 'Names of JBMT' | 'Customer Done';
export type VehicleStatus = 'ready-to-purchase' | 'in-stock' | 'sold';
export type PartyType = 'vendor' | 'customer';

export interface Company {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  name: string;
  companyId: string;
}

export interface Party {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  type: PartyType;
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
  otherDetails?: any;
  createdAt: Timestamp;
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
}
