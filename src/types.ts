export interface VirtualAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  orderRef?: string;
  bvn?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  balance: number;
  virtualAccount: VirtualAccount | null;
  pin: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'incoming_transfer' | 'outgoing_transfer' | 'bill_payment';
  amount: number;
  fee: number;
  description: string;
  status: 'success' | 'failed' | 'pending';
  reference: string;
  timestamp: string;
  senderName?: string;
  senderAccount?: string;
  senderBank?: string;
  recipientAccount?: string;
  recipientBank?: string;
  recipientName?: string;
  // Specific fields for bill payment
  billType?: 'airtime' | 'data' | 'electricity' | 'cable';
  billDetails?: {
    mobile?: string;
    billerId?: string;
    meterNumber?: string;
    provider?: string;
    packageCode?: string;
    utilityToken?: string;
  };
}

export interface Bank {
  id: string;
  code: string;
  name: string;
}

export interface BillProvider {
  id: string;
  name: string;
  code: string;
  type: 'airtime' | 'data' | 'electricity' | 'cable';
}
