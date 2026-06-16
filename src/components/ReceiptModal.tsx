import { Transaction } from "../types";
import { X, Printer, Download, CheckCircle, Smartphone, Zap, ArrowDownLeft, ArrowUpRight, Award } from "lucide-react";

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  const isIncoming = transaction.type === "incoming_transfer";
  const isOutgoing = transaction.type === "outgoing_transfer";
  const isBill = transaction.type === "bill_payment";

  // Setup visual styling based on transaction type
  const getSuccessIcon = () => {
    if (isIncoming) return <ArrowDownLeft className="w-8 h-8 text-emerald-600" />;
    if (isOutgoing) return <ArrowUpRight className="w-8 h-8 text-rose-600" />;
    if (transaction.billType === "electricity") return <Zap className="w-8 h-8 text-amber-600" />;
    return <Smartphone className="w-8 h-8 text-blue-600" />;
  };

  const getSuccessBg = () => {
    if (isIncoming) return "bg-emerald-50";
    if (isOutgoing) return "bg-rose-50";
    if (transaction.billType === "electricity") return "bg-amber-50";
    return "bg-blue-50";
  };

  // Convert Date
  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate a mock receipt reference verification URL QR code
  const verificationUrl = `https://flw.co/v/tx-${transaction.reference}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden print-area border border-slate-100">
        
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-dashed border-slate-100 flex items-center justify-between no-print bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Transaction Receipt
          </span>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
            id="close-receipt-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area content */}
        <div className="p-8 relative">
          
          {/* Mock Watermark Bank Stamp */}
          <div className="absolute right-6 top-8 opacity-[0.04] pointer-events-none rotate-12">
            <Award className="w-48 h-48 text-slate-900" />
          </div>

          <div className="flex flex-col items-center text-center pb-6 border-b border-dashed border-slate-200">
            {/* Payment Badge Icon */}
            <div className={`p-4 rounded-full ${getSuccessBg()} mb-3 ring-4 ring-white shadow-xs`}>
              {getSuccessIcon()}
            </div>
            
            <h3 className="text-md font-medium text-slate-400 uppercase tracking-wide font-sans">
              Transaction Successful
            </h3>
            
            <div className="text-3xl font-bold font-display tracking-tight text-slate-900 mt-1">
              ₦{(transaction.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
            
            <span className="inline-block mt-2 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-100 rounded-full">
              Settle Complete ✓
            </span>
          </div>

          <div className="py-6 space-y-4 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-sans">Merchant/Gateway</span>
              <span className="font-semibold text-slate-800 font-display text-right">
                {isBill ? "Nellobyte API engine" : "Flutterwave Gateway"}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-sans">Reference ID</span>
              <span className="font-mono text-xs font-semibold text-slate-700 select-all max-w-[200px] break-all text-right">
                {transaction.reference}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-sans">Timestamp</span>
              <span className="font-medium text-slate-700 text-right">
                {formatDateTime(transaction.timestamp)}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-sans">Payment Type</span>
              <span className="font-semibold text-slate-700 capitalize text-right">
                {transaction.type.replace(/_/g, " ")}
              </span>
            </div>

            {/* Inbound Transfers Details */}
            {isIncoming && (
              <>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-start">
                  <span className="text-slate-400 font-sans">Sender Name</span>
                  <span className="font-medium text-slate-800 text-right">{transaction.senderName || "System Origin"}</span>
                </div>
                {transaction.senderBank && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 font-sans">Sender Bank</span>
                    <span className="font-medium text-slate-800 text-right">{transaction.senderBank}</span>
                  </div>
                )}
                {transaction.senderAccount && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 font-sans">Sender Account</span>
                    <span className="font-mono text-slate-700 text-right">{transaction.senderAccount}</span>
                  </div>
                )}
              </>
            )}

            {/* Outbound Transfer Details */}
            {isOutgoing && (
              <>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-start">
                  <span className="text-slate-400 font-sans">Recipient Name</span>
                  <span className="font-semibold text-slate-800 text-right">{transaction.recipientName || "Direct Client"}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-sans">Recipient Bank</span>
                  <span className="font-medium text-slate-800 text-right">{transaction.recipientBank}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-sans">Account Number</span>
                  <span className="font-mono text-slate-700 text-right">{transaction.recipientAccount}</span>
                </div>
              </>
            )}

            {/* Bills Utility Details */}
            {isBill && (
              <>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-start">
                  <span className="text-slate-400 font-sans">Biller Provider</span>
                  <span className="font-semibold text-slate-800 text-right">{transaction.billDetails?.provider || "Biller Engine"}</span>
                </div>
                
                {transaction.billDetails?.mobile && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 font-sans">Mobile Phone</span>
                    <span className="font-mono text-slate-700 text-right">{transaction.billDetails.mobile}</span>
                  </div>
                )}

                {transaction.billDetails?.meterNumber && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400" id="meter-no-label">Smartcard / Meter #</span>
                    <span className="font-mono text-slate-700 text-right">{transaction.billDetails.meterNumber}</span>
                  </div>
                )}

                {transaction.billDetails?.utilityToken && (
                  <div className="mt-4 p-4.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">Electricity Purchase Token</span>
                    <span className="font-mono text-lg font-bold text-indigo-700 mt-1 select-all tracking-wider">
                      {transaction.billDetails.utilityToken}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Enter this token on your physical meter keypad to retrieve unit loads.
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Sub-amount</span>
                <span>₦{(transaction.amount - transaction.fee).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Processing Commission Fee</span>
                <span>₦{(transaction.fee).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Narration Description</span>
                <span className="italic max-w-[200px] truncate text-right">{transaction.description}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 flex flex-col items-center justify-center text-center mt-4">
            {/* Dynamic visual barcode block */}
            <div className="w-full flex items-center justify-center gap-1.5 mb-2 px-6">
              <div className="w-3 h-10 bg-slate-900"></div>
              <div className="w-1.5 h-10 bg-slate-900"></div>
              <div className="w-4 h-10 bg-slate-900"></div>
              <div className="w-1 h-10 bg-slate-900"></div>
              <div className="w-2.5 h-10 bg-slate-900"></div>
              <div className="w-4 h-10 bg-slate-900"></div>
              <div className="w-1.5 h-10 bg-slate-900"></div>
              <div className="w-3 h-10 bg-slate-900"></div>
              <div className="w-1 h-10 bg-slate-900"></div>
              <div className="w-2 h-10 bg-slate-900"></div>
              <div className="w-3.5 h-10 bg-slate-900"></div>
              <div className="w-1 h-10 bg-slate-900"></div>
            </div>
            
            <p className="text-[10px] font-mono text-slate-400 select-none">
              VERIFIED BY FLUTTERWAVE & NELLOBYTE CORE SECURE API v3.4.1
            </p>
          </div>

        </div>

        {/* Modal Buttons Footer (excluded during print operations) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
            id="print-receipt-action-btn"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-xl transition-all text-sm cursor-pointer"
            id="dismiss-receipt-action-btn"
          >
            Go Back
          </button>
        </div>

      </div>
    </div>
  );
}
