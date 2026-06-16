import React, { useState, useEffect } from "react";
import { UserProfile, Bank } from "../types";
import { Send, CheckCircle2, AlertCircle, HelpCircle, Loader2, Search } from "lucide-react";

interface TransferFormProps {
  user: UserProfile;
  onTransferSuccess: (newTx: any, newBalance: number) => void;
}

const NIGERIAN_BANKS: Bank[] = [
  { id: "1", code: "035", name: "Wema Bank" },
  { id: "2", code: "044", name: "Access Bank" },
  { id: "3", code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { id: "4", code: "033", name: "United Bank for Africa (UBA)" },
  { id: "5", code: "057", name: "Zenith Bank" },
  { id: "6", code: "50211", name: "Kuda Microfinance Bank" },
  { id: "7", code: "101", name: "Providus Bank" },
  { id: "8", code: "039", name: "Stanbic IBTC Bank" },
  { id: "9", code: "011", name: "First Bank of Nigeria" },
  { id: "10", code: "214", name: "FCMB" }
];

export function TransferForm({ user, onTransferSuccess }: TransferFormProps) {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [pin, setPin] = useState("");
  
  const [isResolving, setIsResolving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto resolve when bank and account number match 10 digits
  useEffect(() => {
    if (bankCode && accountNumber.length === 10) {
      handleResolve();
    } else {
      setRecipientName("");
    }
  }, [bankCode, accountNumber]);

  const handleResolve = async () => {
    if (accountNumber.length !== 10) return;
    setIsResolving(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/transfer/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, accountNumber })
      });
      const data = await response.json();
      if (data.success) {
        setRecipientName(data.accountName);
      } else {
        setErrorMsg(data.message || "Unable to confirm account name. Check details.");
        setRecipientName("");
      }
    } catch (e) {
      setErrorMsg("Network offline. Reverting to sandbox simulator resolution.");
      setRecipientName("Demo Sandbox Client");
    } finally {
      setIsResolving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Initial validations
    if (!bankCode || !accountNumber || !amount || !pin) {
      setErrorMsg("All payment credentials and PIN are required.");
      return;
    }

    if (accountNumber.length !== 10) {
      setErrorMsg("Nigerian account numbers must be exactly 10 digits.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      setErrorMsg("Minimum transfer value is 100 NGN.");
      return;
    }

    if (user.balance < (numericAmount + 10)) {
      setErrorMsg(`Insufficient ledger funds. Required: ₦${(numericAmount + 10).toLocaleString()} (includes fees).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenBank = NIGERIAN_BANKS.find(b => b.code === bankCode);
      const response = await fetch("/api/transfer/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode,
          bankName: chosenBank ? chosenBank.name : "Target Bank",
          accountNumber,
          recipientName: recipientName || "Sandbox Beneficiary",
          amount: numericAmount,
          narration,
          pin
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMsg(data.message);
        // Dispatch callback upstream to synchronize balance and records
        onTransferSuccess(data.transaction, user.balance - (numericAmount + 10));
        
        // Reset local variables
        setAccountNumber("");
        setAmount("");
        setNarration("");
        setPin("");
        setRecipientName("");
        setBankCode("");
      } else {
        setErrorMsg(data.message || "Transfer transaction was declined by Flutterwave gateway.");
      }
    } catch (err: any) {
      setErrorMsg("Connection failure during API handshake: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const transferVal = parseFloat(amount) || 0;
  const totalCost = transferVal > 0 ? transferVal + 10 : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">Flutterwave Instasend</h2>
          <p className="text-xs text-slate-400">Direct instant bank disbursement gateway</p>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="space-y-5">
        
        {/* Destination Bank Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Destination Bank
          </label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="w-full h-11 px-4.5 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl text-sm focus:outline-hidden transition-all text-slate-700"
            id="bank-selector"
            required
          >
            <option value="">-- Choose Beneficiary Institution --</option>
            {NIGERIAN_BANKS.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* NUBAN Account Numbers Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Account Number (NUBAN)
          </label>
          <div className="relative">
            <input
              type="text"
              pattern="[0-9]*"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g., 0123456789 (10 Digits)"
              className="w-full h-11 pl-4.5 pr-12 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl text-sm font-mono focus:outline-hidden transition-all text-slate-800 placeholder-slate-400"
              required
              id="account-input"
            />
            <div className="absolute right-3.5 top-2.5">
              {isResolving ? (
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              ) : (
                <Search className="w-5 h-5 text-slate-400" id="account-lookup-icon" />
              )}
            </div>
          </div>
        </div>

        {/* Account Resolution Display */}
        {recipientName && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest">
                VERIFIED BENEFICIARY NAME
              </span>
              <span className="text-sm font-bold font-display text-indigo-800 mt-0.5">
                {recipientName}
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-white border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Resolved
            </span>
          </div>
        )}

        {/* Transfer Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Amount (NGN)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 font-bold text-slate-400 select-none">₦</span>
              <input
                type="number"
                min="100"
                step="0.01"
                placeholder="Min 100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 pl-8 pr-4 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl text-sm focus:outline-hidden transition-all font-semibold"
                required
                id="amount-input"
              />
            </div>
          </div>

          {/* Secure 4 Digit Trans Pin */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Transaction PIN
            </label>
            <input
              type="password"
              maxLength={4}
              pattern="[0-9]*"
              placeholder="•••• (Def: 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full h-11 px-4.5 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl text-sm text-center tracking-widest focus:outline-hidden transition-all font-mono placeholder:tracking-normal placeholder-slate-400"
              required
              id="pin-input"
            />
          </div>
        </div>

        {/* Narration Memo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Narration / Description Note
          </label>
          <input
            type="text"
            placeholder="What is this transfer for?"
            maxLength={100}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="w-full h-11 px-4.5 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl text-sm focus:outline-hidden transition-all text-slate-700 placeholder-slate-400"
            id="narration-input"
          />
        </div>

        {/* Dynamic transaction commission pricing details */}
        {transferVal > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Transfer Value:</span>
              <span>₦{transferVal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Flutterwave Fee:</span>
              <span>₦10.00</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
              <span>Total Ledger Debit:</span>
              <span>₦{totalCost.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Errors & Warning labels */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span id="transfer-error-field">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span id="transfer-success-field">{successMsg}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || isResolving}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
          id="send-now-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Flutterwave Handshake...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Funds Instantly
            </>
          )}
        </button>

      </form>
    </div>
  );
}
