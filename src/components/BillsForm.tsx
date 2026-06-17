import React, { useState } from "react";
import { UserProfile, BillProvider } from "../types";
import { Smartphone, Zap, Tv, CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface BillsFormProps {
  user: UserProfile;
  onBillSuccess: (newTx: any, newBalance: number) => void;
}

const BILL_VIDS: BillProvider[] = [
  // AIRTIMES
  { id: "mtn", name: "MTN Airtime VTU", code: "MTN", type: "airtime" },
  { id: "glo", name: "Glo Airtime VTU", code: "GLO", type: "airtime" },
  { id: "airtel", name: "Airtel Airtime VTU", code: "AIRTEL", type: "airtime" },
  { id: "mobile9", name: "9mobile Airtime VTU", code: "9MOBILE", type: "airtime" },
  
  // DATA DEALS
  { id: "mtn-data", name: "MTN SME - 1GB (30 days)", code: "MTN_1GB", type: "data" },
  { id: "mtn-data-5gb", name: "MTN SME - 5GB (30 days)", code: "MTN_5GB", type: "data" },
  { id: "glo-data-1gb", name: "Glo CG - 1.25GB (30 days)", code: "GLO_1GB", type: "data" },
  { id: "airtel-data-2gb", name: "Airtel CG - 2GB (30 days)", code: "AIRTEL_2GB", type: "data" },

  // ELECTRIC DISCOS
  { id: "ikeja", name: "Ikeja Electricity (IKEDC)", code: "IKEDC", type: "electricity" },
  { id: "eko", name: "Eko Electricity (EKEDC)", code: "EKEDC", type: "electricity" },
  { id: "abuja", name: "Abuja Electricity (AEDC)", code: "AEDC", type: "electricity" },
  
  // CABLES
  { id: "dstv", name: "DSTV Great Wall TV subscription", code: "DSTV_GW", type: "cable" },
  { id: "gotv", name: "GOtv Max subscription bundle", code: "GOTV_MAX", type: "cable" },
  { id: "startimes", name: "Startimes Nova bouquet", code: "ST_NOVA", type: "cable" }
];

// Flat pricing registry for fixed product bundles
const BILL_PRICES: Record<string, number> = {
  "mtn-data": 290,
  "mtn-data-5gb": 1400,
  "glo-data-1gb": 450,
  "airtel-data-2gb": 550,
  "dstv": 2500,
  "gotv": 4850,
  "startimes": 1500
};

export function BillsForm({ user, onBillSuccess }: BillsFormProps) {
  const [activeTab, setActiveTab ] = useState<"airtime" | "data" | "electricity" | "cable">("airtime");
  
  const [providerId, setProviderId] = useState("");
  const [mobile, setMobile] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pre-payment validation states for cables & electricity (Feature 2)
  const [validatedOwner, setValidatedOwner] = useState<string | null>(null);
  const [isValidatingOwner, setIsValidatingOwner] = useState(false);

  // Auto validate when meter or provider changes
  React.useEffect(() => {
    let active = true;
    const triggerValidation = async () => {
      if ((activeTab === "electricity" || activeTab === "cable") && meterNumber.length >= 10 && providerId) {
        setIsValidatingOwner(true);
        setValidatedOwner(null);
        try {
          const res = await fetch("/api/bills/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ billType: activeTab, providerId, meterNumber })
          });
          const data = await res.json();
          if (active) {
            if (res.ok && data.success) {
              setValidatedOwner(data.customerName);
            } else {
              setValidatedOwner(null);
            }
          }
        } catch (err) {
          console.warn("Pre-billing meter validation request failed", err);
        } finally {
          if (active) setIsValidatingOwner(false);
        }
      } else {
        setValidatedOwner(null);
      }
    };
    triggerValidation();
    return () => {
      active = false;
    };
  }, [meterNumber, providerId, activeTab]);

  // Auto-set amount for data & cable products that have fixed prices
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setProviderId(id);
    if (activeTab === "data" || activeTab === "cable") {
      const fixedPrice = BILL_PRICES[id];
      if (fixedPrice) {
        setAmount(fixedPrice.toString());
      } else {
        setAmount("");
      }
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setProviderId("");
    setAmount("");
    setMobile("");
    setMeterNumber("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const processBillPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Dynamic checks
    if (!providerId || !pin) {
      setErrorMsg("Provider and PIN parameters are required.");
      return;
    }

    if (activeTab === "airtime" || activeTab === "data") {
      if (mobile.length !== 11) {
        setErrorMsg("Please enter a valid 11-digit mobile phone number.");
        return;
      }
    } else {
      if (!meterNumber.trim()) {
        setErrorMsg("A valid pre-paid Smartcard or Meter reference number must be supplied.");
        return;
      }
    }

    const billPrice = parseFloat(amount);
    if (isNaN(billPrice) || billPrice <= 0) {
      setErrorMsg("Please verify a valid billing price amount.");
      return;
    }

    // Direct commissions rules: 100 NGN convenient fee on cables/utilities
    const fee = activeTab === "electricity" || activeTab === "cable" ? 100 : 0;
    const totalDeduction = billPrice + fee;

    if (user.balance < totalDeduction) {
      setErrorMsg(`Insufficient ledger funds. Required: ₦${totalDeduction.toLocaleString()} (incl. convenience commissions).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billType: activeTab,
          providerId,
          mobile: activeTab === "airtime" || activeTab === "data" ? mobile : undefined,
          meterNumber: activeTab === "electricity" || activeTab === "cable" ? meterNumber : undefined,
          amount: billPrice,
          pin
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMsg(data.message);
        onBillSuccess(data.transaction, user.balance - totalDeduction);
        
        // Reset inputs
        setPin("");
        setMobile("");
        setMeterNumber("");
        setAmount("");
        setProviderId("");
      } else {
        setErrorMsg(data.message || "Failed to process bill payment transaction.");
      }
    } catch (err: any) {
      setErrorMsg("Nellobyte API communication failure: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProviders = BILL_VIDS.filter(p => p.type === activeTab);
  const billPriceVal = parseFloat(amount) || 0;
  const currentFee = activeTab === "electricity" || activeTab === "cable" ? 100 : 0;
  const grandTotal = billPriceVal > 0 ? billPriceVal + currentFee : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs">
      
      {/* Mini Title Block */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">Utility & Telecom Bills</h2>
          <p className="text-xs text-slate-400">Bills payment powered by Nellobyte Core API</p>
        </div>
      </div>

      {/* Selector Tabs Category */}
      <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => handleTabChange("airtime")}
          className={`py-2 text-xs font-semibold rounded-lg flex flex-col md:flex-row items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${activeTab === "airtime" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
          type="button"
          id="tab-airtime"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Airtime</span>
        </button>

        <button
          onClick={() => handleTabChange("data")}
          className={`py-2 text-xs font-semibold rounded-lg flex flex-col md:flex-row items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${activeTab === "data" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
          type="button"
          id="tab-data"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Data</span>
        </button>

        <button
          onClick={() => handleTabChange("electricity")}
          className={`py-2 text-xs font-semibold rounded-lg flex flex-col md:flex-row items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${activeTab === "electricity" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
          type="button"
          id="tab-electricity"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Power</span>
        </button>

        <button
          onClick={() => handleTabChange("cable")}
          className={`py-2 text-xs font-semibold rounded-lg flex flex-col md:flex-row items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${activeTab === "cable" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
          type="button"
          id="tab-cable"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Cable TV</span>
        </button>
      </div>

      {/* Main Core Form */}
      <form onSubmit={processBillPayment} className="space-y-4">
        
        {/* Dynamic Provider selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Select Biller Provider
          </label>
          <select
            value={providerId}
            onChange={handleProviderChange}
            className="w-full h-11 px-4 text-slate-700 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-sm focus:outline-hidden transition-all"
            required
            id="provider-selector"
          >
            <option value="">-- Choose {activeTab.toUpperCase()} Provider --</option>
            {activeProviders.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {BILL_PRICES[p.id] ? `(₦${BILL_PRICES[p.id]})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Input Identifier Details */}
        {(activeTab === "airtime" || activeTab === "data") ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recipient Mobile Number
            </label>
            <input
              type="text"
              pattern="[0-9]*"
              maxLength={11}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g., 08123456789 (11 digits)"
              className="w-full h-11 px-4 bg-slate-50 font-mono border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-sm focus:outline-hidden transition-all text-slate-800 tracking-wider placeholder-slate-400 placeholder:tracking-normal"
              required
              id="bill-mobile-input"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {activeTab === "electricity" ? "Pre-Paid Meter Number" : "Smartcard Decoder Number"}
            </label>
            <input
              type="text"
              pattern="[0-9]*"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, ""))}
              placeholder={activeTab === "electricity" ? "e.g., 440918413998" : "e.g., 1029482931"}
              className="w-full h-11 px-4 bg-slate-50 font-mono border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-sm focus:outline-hidden transition-all text-slate-800 tracking-wider placeholder-slate-400 placeholder:tracking-normal"
              required
              id="bill-meter-input"
            />
            {isValidatingOwner && (
              <span className="text-[10px] text-indigo-500 font-semibold animate-pulse flex items-center gap-1 mt-0.5" id="billing-resolving-label">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                Verifying ownership registry on Nellobyte Core API...
              </span>
            )}
            {validatedOwner && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5" id="billing-owner-badge">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Verified Customer Name: {validatedOwner}
              </span>
            )}
          </div>
        )}

        {/* Billing Amount Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payment Amount (₦)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 font-bold text-slate-400">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={activeTab === "data" || activeTab === "cable"}
                placeholder="0.00"
                className="w-full h-11 pl-8 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-sm focus:outline-hidden transition-all text-slate-800 disabled:opacity-75 disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                required
                id="bill-amount-input"
              />
            </div>
          </div>

          {/* Secure Trans PIN verification */}
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
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-sm text-center tracking-widest focus:outline-hidden transition-all font-mono placeholder:tracking-normal placeholder-slate-400"
              required
              id="bill-pin-input"
            />
          </div>
        </div>

        {/* Cost Breakdown */}
        {billPriceVal > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Biller Product Retail Cost:</span>
              <span>₦{billPriceVal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            {currentFee > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Convenience Commission Fee:</span>
                <span>₦{currentFee.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
              <span>Grand Deduction Total:</span>
              <span>₦{grandTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Informational warning for Utilities tokens */}
        {activeTab === "electricity" && (
          <p className="text-[10px] text-slate-400 leading-normal italic text-center">
            * Utility Meter purchases automatically generate pre-paid electrical token keys on successful Nellobyte completion.
          </p>
        )}

        {/* Success / Error messaging panels */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span id="bill-error-field">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span id="bill-success-field">{successMsg}</span>
          </div>
        )}

        {/* Trigger Button submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer animate-fade-in"
          id="bill-pay-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying Nellobyte API Handshake...
            </>
          ) : (
            <>
              <span>Pay & Generate Receipt</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
