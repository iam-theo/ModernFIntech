import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "src", "db_store.json");

app.use(express.json());

// List of Nigerian Banks
const NIGERIAN_BANKS = [
  { id: "1", code: "035", name: "Wema Bank" },
  { id: "2", code: "044", name: "Access Bank" },
  { id: "3", code: "058", name: "Guaranty Trust Bank" },
  { id: "4", code: "033", name: "United Bank for Africa (UBA)" },
  { id: "5", code: "057", name: "Zenith Bank" },
  { id: "6", code: "50211", name: "Kuda Microfinance Bank" },
  { id: "7", code: "101", name: "Providus Bank" },
  { id: "8", code: "039", name: "Stanbic IBTC Bank" },
  { id: "9", code: "011", name: "First Bank of Nigeria" },
  { id: "10", code: "214", name: "FCMB" }
];

// Bill providers structure
const BILL_PROVIDERS = [
  { id: "mtn", name: "MTN Nigeria", code: "MTN", type: "airtime" },
  { id: "glo", name: "Glo Mobile", code: "GLO", type: "airtime" },
  { id: "airtel", name: "Airtel Nigeria", code: "AIRTEL", type: "airtime" },
  { id: "mobile9", name: "9mobile", code: "9MOBILE", type: "airtime" },
  
  { id: "mtn-data", name: "MTN 1GB (SME)", code: "MTN_1GB", type: "data", price: 290 },
  { id: "mtn-data-5gb", name: "MTN 5GB (SME)", code: "MTN_5GB", type: "data", price: 1400 },
  { id: "glo-data-1gb", name: "Glo 1.25GB (SME)", code: "GLO_1GB", type: "data", price: 450 },
  { id: "airtel-data-2gb", name: "Airtel 2GB (SME)", code: "AIRTEL_2GB", type: "data", price: 550 },

  { id: "ikeja", name: "Ikeja Electricity (IKEDC)", code: "IKEDC", type: "electricity" },
  { id: "eko", name: "Eko Electricity (EKEDC)", code: "EKEDC", type: "electricity" },
  { id: "abuja", name: "Abuja Electricity (AEDC)", code: "AEDC", type: "electricity" },
  
  { id: "dstv", name: "DSTV Great Wall", code: "DSTV_GW", type: "cable", price: 2500 },
  { id: "gotv", name: "GOtv Max", code: "GOTV_MAX", type: "cable", price: 4850 },
  { id: "startimes", name: "Startimes Nova", code: "ST_NOVA", type: "cable", price: 1500 }
];

// Initialize JSON database
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    // Initial standard mockup database
    const initialDb = {
      user: {
        id: "usr_theo_desmon",
        fullName: "Theo Desmon",
        email: "TheoDesmon71@gmail.com",
        phone: "08123456789",
        balance: 452000,
        pin: "1234",
        virtualAccount: {
          accountNumber: "9021831843",
          accountName: "Theo Desmon / Fintech Demo",
          bankName: "Wema Bank FLW",
          orderRef: "flw-demo-virtual-acct",
          bvn: "22233445566"
        }
      },
      transactions: [
        {
          id: "tx_init_balance",
          userId: "usr_theo_desmon",
          type: "incoming_transfer",
          amount: 500000,
          fee: 0,
          description: "Genesis Account Funding",
          status: "success",
          reference: "TX-GENESIS-2026",
          timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
          senderName: "Flutterwave Allocator",
          senderAccount: "8841773199",
          senderBank: "Standard Chartered Bank"
        },
        {
          id: "tx_first_bill",
          userId: "usr_theo_desmon",
          type: "bill_payment",
          amount: 48000,
          fee: 100,
          description: "AEDC Token Purchase",
          status: "success",
          reference: "TX-BILL-AEDC-9482",
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          billType: "electricity",
          billDetails: {
            meterNumber: "45091841399",
            provider: "Abuja Electricity (AEDC)"
          }
        }
      ],
      notifications: [
        {
          id: "nt_init",
          type: "push",
          recipient: "TheoDesmon71@gmail.com",
          title: "System Ready",
          message: "Welcome to the Fintech Dashboard. Real-time Toast Alerts and Termii SMS services are successfully live!",
          status: "delivered",
          timestamp: new Date().toISOString()
        }
      ],
      apiSettings: {
        mode: "sandbox", // can be "sandbox" or "live"
        flutterwavePublicKey: "",
        flutterwaveSecretKey: "",
        nellobyteApiKey: "",
        nellobyteUserId: "",
        termiiApiKey: "",
        termiiSenderId: "FW_ALERT",
        termiiChannel: "generic"
      }
    };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  
  const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  // Backwards compatibility guarantees
  if (!parsed.notifications) {
    parsed.notifications = [];
  }
  if (!parsed.apiSettings.termiiApiKey) {
    parsed.apiSettings.termiiApiKey = parsed.apiSettings.termiiApiKey || "";
    parsed.apiSettings.termiiSenderId = parsed.apiSettings.termiiSenderId || "FW_ALERT";
    parsed.apiSettings.termiiChannel = parsed.apiSettings.termiiChannel || "generic";
  }
  return parsed;
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ----------------------
// Notification Helper
// ----------------------
async function sendNotificationDispatch(params: {
  email: string;
  phone: string;
  title: string;
  message: string;
}) {
  const db = getDb();
  if (!db.notifications) {
    db.notifications = [];
  }

  const timestamp = new Date().toISOString();
  
  // 1. Push Notification
  const pushId = `nt_push_${Date.now()}`;
  db.notifications.unshift({
    id: pushId,
    type: "push",
    recipient: params.email,
    title: params.title,
    message: params.message,
    status: "delivered",
    timestamp
  });

  // 2. Email Notification
  const emailId = `nt_email_${Date.now()}`;
  db.notifications.unshift({
    id: emailId,
    type: "email",
    recipient: params.email,
    title: params.title,
    message: params.message,
    status: "delivered",
    timestamp
  });

  // 3. SMS Notification using Termii API if key is present
  const smsId = `nt_sms_${Date.now()}`;
  const termiiApiKey = db.apiSettings.termiiApiKey;
  const termiiSenderId = db.apiSettings.termiiSenderId || "FW_ALERT";
  const termiiChannel = db.apiSettings.termiiChannel || "generic";
  
  const smsPayload: any = {
    id: smsId,
    type: "sms",
    recipient: params.phone,
    title: params.title,
    message: params.message,
    status: "pending",
    gatewayResponse: null,
    timestamp
  };

  const hasTermii = !!termiiApiKey;
  if (hasTermii) {
    try {
      console.log(`[Termii API] Triggering actual Termii SMS send to ${params.phone}...`);
      // API call to Termii SMS Gateway
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: termiiApiKey,
          to: params.phone,
          from: termiiSenderId,
          sms: params.message,
          type: "plain",
          channel: termiiChannel
        })
      });

      const data = await response.json();
      console.log(`[Termii API] Raw Response:`, data);

      if (response.ok && (data.status === "success" || data.message === "Successfully Sent" || data.ok)) {
        smsPayload.status = "delivered";
        smsPayload.gatewayResponse = data;
      } else {
        smsPayload.status = "failed";
        smsPayload.gatewayResponse = data;
      }
    } catch (err: any) {
      console.error(`[Termii API Error] Failed:`, err);
      smsPayload.status = "failed";
      smsPayload.gatewayResponse = { error: err.message };
    }
  } else {
    // Sandbox Simulation Mode
    smsPayload.status = "delivered";
    smsPayload.gatewayResponse = { simulation: true, status: "success", info: "Simulated Delivery" };
  }

  db.notifications.unshift(smsPayload);
  saveDb(db);
}

// ----------------------
// API Endpoints Definition
// ----------------------

// Get current state
app.get("/api/state", (req, res) => {
  const db = getDb();
  res.json(db);
});

// Get notification logs
app.get("/api/notifications", (req, res) => {
  const db = getDb();
  res.json(db.notifications || []);
});

// Update API keys / settings
app.post("/api/settings", (req, res) => {
  const db = getDb();
  const { 
    mode, 
    flutterwavePublicKey, 
    flutterwaveSecretKey, 
    nellobyteApiKey, 
    nellobyteUserId,
    termiiApiKey,
    termiiSenderId,
    termiiChannel
  } = req.body;
  
  db.apiSettings = {
    mode: mode || "sandbox",
    flutterwavePublicKey: flutterwavePublicKey ?? db.apiSettings.flutterwavePublicKey,
    flutterwaveSecretKey: flutterwaveSecretKey ?? db.apiSettings.flutterwaveSecretKey,
    nellobyteApiKey: nellobyteApiKey ?? db.apiSettings.nellobyteApiKey,
    nellobyteUserId: nellobyteUserId ?? db.apiSettings.nellobyteUserId,
    termiiApiKey: termiiApiKey ?? db.apiSettings.termiiApiKey,
    termiiSenderId: termiiSenderId ?? db.apiSettings.termiiSenderId,
    termiiChannel: termiiChannel ?? db.apiSettings.termiiChannel
  };
  
  saveDb(db);
  res.json({ message: "Settings updated successfully", settings: db.apiSettings });
});

// Reset simulation data
app.post("/api/settings/reset", (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  res.json({ message: "Sandbox state reset to clean defaults" });
});

// Create/Generate dedicated Virtual Account
app.post("/api/user/virtual-account", async (req, res) => {
  const db = getDb();
  const { bvn, phone, fullName, email } = req.body;
  
  const selectedEmail = email || db.user.email;
  const selectedPhone = phone || db.user.phone;
  const selectedName = fullName || db.user.fullName;
  
  // Clean names
  const nameParts = selectedName.split(" ");
  const firstname = nameParts[0] || "Client";
  const lastname = nameParts.slice(1).join(" ") || "Demo";

  const isLive = db.apiSettings.mode === "live" && db.apiSettings.flutterwaveSecretKey;

  if (isLive) {
    try {
      // Activating standard live account creation against Flutterwave
      console.log(`[Flutterwave API] Initiating Permanent Virtual Account call for: ${selectedEmail}`);
      const response = await fetch("https://api.flutterwave.com/v3/virtual-account-numbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
        },
        body: JSON.stringify({
          email: selectedEmail,
          is_permanent: true,
          bvn: bvn || "22233445566",
          tx_ref: `v-acct-${Date.now()}`,
          phonenumber: selectedPhone,
          firstname,
          lastname
        })
      });

      const responseData = await response.json();
      console.log(`[Flutterwave API] Response Received:`, responseData);

      if (responseData.status === "success" && responseData.data) {
        db.user.virtualAccount = {
          accountNumber: responseData.data.account_number,
          accountName: responseData.data.account_name || `${firstname} ${lastname}`,
          bankName: responseData.data.bank_name,
          orderRef: responseData.data.order_ref || responseData.data.flw_ref,
          bvn: bvn
        };
        saveDb(db);
        
        // Dispatch notifications
        await sendNotificationDispatch({
          email: selectedEmail,
          phone: selectedPhone,
          title: "Virtual Account Activated",
          message: `FW Alert: Your dedicated live virtual account at ${db.user.virtualAccount.bankName} is provisioned! Account No: ${db.user.virtualAccount.accountNumber}`
        }).catch(e => console.error("Notification trigger failed", e));

        return res.json({ 
          success: true, 
          message: "Flutterwave virtual account provisioned successfully!",
          virtualAccount: db.user.virtualAccount,
          rawResponse: responseData
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: responseData.message || "Failed to provision through Flutterwave gateway",
          rawResponse: responseData 
        });
      }
    } catch (error: any) {
      console.error("[Flutterwave API Error]:", error);
      return res.status(500).json({ 
        success: false, 
        message: `HTTP Connection error: ${error.message}. Flutterwave endpoint could not be reached.`
      });
    }
  } else {
    // Sandbox simulation
    console.log(`[Flutterwave SANDBOX] Simulating virtual account generation for ${selectedEmail}`);
    
    // Gen a random 10-digit Nigerian account number
    const randomAcctNum = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const banks = ["Wema Bank FLW", "Providus Bank FLW", "Sterling Bank FLW"];
    const chosenBank = banks[Math.floor(Math.random() * banks.length)];

    db.user.virtualAccount = {
      accountNumber: randomAcctNum,
      accountName: `${selectedName} / Fintech Sandbox`,
      bankName: chosenBank,
      orderRef: `order-sandbox-${Math.floor(Math.random() * 999999)}`,
      bvn: bvn || "22223333444"
    };
    
    // Create an automatic transaction tracking this event
    const seedTx = {
      id: `tx_acct_${Date.now()}`,
      userId: db.user.id,
      type: "incoming_transfer" as const,
      amount: 15000, // Seed money to make testing immediately exciting!
      fee: 0,
      description: "Signup Direct Seeding",
      status: "success" as const,
      reference: `FLW-ACCD-SEED-${Math.floor(Math.random() * 100000)}`,
      timestamp: new Date().toISOString(),
      senderName: "Flutterwave Sandbox Integrator",
      senderAccount: "8839000001",
      senderBank: chosenBank
    };

    db.transactions.unshift(seedTx);
    db.user.balance += 15000; // Crediting user balance
    saveDb(db);

    // Dispatch notifications
    await sendNotificationDispatch({
      email: selectedEmail,
      phone: selectedPhone,
      title: "Virtual Account Created",
      message: `FW Sandbox: Dedicated virtual account created! Account No: ${db.user.virtualAccount.accountNumber} with ${db.user.virtualAccount.bankName}. Seeded with NGN 15,000.`
    }).catch(e => console.error("Notification trigger failed", e));

    return res.json({
      success: true,
      message: "Sandbox Virtual Account successfully generated with 15,000 NGN starting bonus!",
      isSandbox: true,
      virtualAccount: db.user.virtualAccount
    });
  }
});

// Resolve recipient account before transfer
app.post("/api/transfer/resolve", async (req, res) => {
  const { bankCode, accountNumber } = req.body;
  const db = getDb();
  const isLive = db.apiSettings.mode === "live" && db.apiSettings.flutterwaveSecretKey;

  if (isLive) {
    try {
      console.log(`[Flutterwave API] Resolving account: ${accountNumber} at ${bankCode}`);
      const response = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
        },
        body: JSON.stringify({
          account_number: accountNumber,
          account_bank: bankCode
        })
      });

      const responseData = await response.json();
      if (responseData.status === "success" && responseData.data) {
        return res.json({
          success: true,
          accountName: responseData.data.account_name,
          accountNumber: responseData.data.account_number
        });
      } else {
        return res.status(400).json({
          success: false,
          message: responseData.message || "Could not resolve account details. Verify bank and account number."
        });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, message: `Could not reach Flutterwave: ${error.message}` });
    }
  } else {
    // Sandbox resolution: generate descriptive names based on digits to feel ultra realistic
    const firstDigit = accountNumber[0] || "5";
    const lastDigit = accountNumber[accountNumber.length - 1] || "3";
    const mappedNames: Record<string, string> = {
      "0": "Amina Dangote",
      "1": "Ngozi Obi",
      "2": "Chidi Nwachukwu",
      "3": "Emeka Adebayo",
      "4": "Olawale Sanusi",
      "5": "Zubairu Mahmud",
      "6": "Yusuf Oyedepo",
      "7": "Chinyere Alao",
      "8": "Florence Otedola",
      "9": "Bature Gambo"
    };

    const resolvedName = `${mappedNames[firstDigit] || "Femi"} ${mappedNames[lastDigit] || "Ibrahim"}`;
    return res.json({
      success: true,
      accountName: resolvedName,
      accountNumber,
      isSandbox: true
    });
  }
});

// Send transfer via Flutterwave Gateway
app.post("/api/transfer/send", async (req, res) => {
  const { bankCode, bankName, accountNumber, recipientName, amount, narration, pin } = req.body;
  const db = getDb();

  // Validate request
  if (!bankCode || !accountNumber || !amount || !pin) {
    return res.status(400).json({ success: false, message: "Missing required fields (bankCode, accountNumber, amount, pin)" });
  }

  // Validate user has virtual account
  if (!db.user.virtualAccount) {
    return res.status(400).json({ success: false, message: "You must generate your Dedicated Virtual Account before initiating transfers." });
  }

  // Pin check
  if (pin !== db.user.pin) {
    return res.status(401).json({ success: false, message: "Security Warning: Invalid transaction PIN." });
  }

  const transferAmount = parseFloat(amount);
  const fee = 10; // Standard 10 NGN Flutterwave Transfer Fee
  const totalDeduction = transferAmount + fee;

  if (db.user.balance < totalDeduction) {
    return res.status(400).json({ success: false, message: "Insufficient ledger funds for this transaction." });
  }

  const isLive = db.apiSettings.mode === "live" && db.apiSettings.flutterwaveSecretKey;
  const flw_ref = `TX-FLW-TRF-${Date.now()}`;

  if (isLive) {
    try {
      console.log(`[Flutterwave API] Initiating payout: ${transferAmount} to ${accountNumber} at ${bankCode}`);
      const response = await fetch("https://api.flutterwave.com/v3/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
        },
        body: JSON.stringify({
          account_bank: bankCode,
          account_number: accountNumber,
          amount: transferAmount,
          narration: narration || "App Fintech Transfer",
          currency: "NGN",
          reference: flw_ref
        })
      });

      const responseData = await response.json();
      console.log(`[Flutterwave API] Transfer Response:`, responseData);

      if (responseData.status === "success" || responseData.status === "pending") {
        // Successful/Pending Flutterwave api route
        db.user.balance -= totalDeduction;
        
        const newTx = {
          id: `tx_${Date.now()}`,
          userId: db.user.id,
          type: "outgoing_transfer" as const,
          amount: transferAmount,
          fee: fee,
          description: narration || `Transfer to ${recipientName || 'account'}`,
          status: (responseData.status === "success" ? "success" : "pending") as any,
          reference: responseData.data?.reference || flw_ref,
          timestamp: new Date().toISOString(),
          recipientAccount: accountNumber,
          recipientBank: bankName || bankCode,
          recipientName: recipientName || responseData.data?.full_name || "Recipient"
        };

        db.transactions.unshift(newTx);
        saveDb(db);

        // Dispatch notifications (debit alert)
        await sendNotificationDispatch({
          email: db.user.email,
          phone: db.user.phone,
          title: "Debit Notification",
          message: `FW Alert: Debit of NGN ${transferAmount.toLocaleString()} to ${newTx.recipientName}. Ref: ${newTx.reference}. Balance: NGN ${db.user.balance.toLocaleString()}`
        }).catch(e => console.error("Notification trigger failed", e));

        return res.json({
          success: true,
          message: `Payout initiated successfully via Flutterwave! Status: ${newTx.status}`,
          transaction: newTx,
          rawResponse: responseData
        });
      } else {
        return res.status(400).json({
          success: false,
          message: responseData.message || "Flutterwave declined transfer creation.",
          rawResponse: responseData
        });
      }
    } catch (error: any) {
      console.error("[Flutterwave Transfer Error]:", error);
      return res.status(500).json({ success: false, message: `Could not construct HTTP request: ${error.message}` });
    }
  } else {
    // Sandbox simulation
    db.user.balance -= totalDeduction;
    const mockRef = `FLW-MOCK-TRF-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const newTx = {
      id: `tx_sandbox_${Date.now()}`,
      userId: db.user.id,
      type: "outgoing_transfer" as const,
      amount: transferAmount,
      fee: fee,
      description: narration || `Sandbox Transfer to ${recipientName}`,
      status: "success" as const,
      reference: mockRef,
      timestamp: new Date().toISOString(),
      recipientAccount: accountNumber,
      recipientBank: bankName || "Wema bank",
      recipientName: recipientName || "Sandbox Beneficiary"
    };

    db.transactions.unshift(newTx);
    saveDb(db);

    // Dispatch notifications (debit alert)
    await sendNotificationDispatch({
      email: db.user.email,
      phone: db.user.phone,
      title: "Debit Notification",
      message: `FW Alert: Sandbox Debit of NGN ${transferAmount.toLocaleString()} to ${newTx.recipientName}. Ref: ${newTx.reference}. Balance: NGN ${db.user.balance.toLocaleString()}`
    }).catch(e => console.error("Notification trigger failed", e));

    return res.json({
      success: true,
      message: "Sandbox Transfer completed instantly and receipt auto-generated!",
      isSandbox: true,
      transaction: newTx
    });
  }
});

// Pay bills using Nellobyte API
app.post("/api/bills/pay", async (req, res) => {
  const { billType, providerId, mobile, meterNumber, billCode, amount, pin } = req.body;
  const db = getDb();

  if (!billType || !pin || !amount) {
    return res.status(400).json({ success: false, message: "Missing required bill, pin, or amount fields." });
  }

  if (p_checks() === false) {
    return res.status(401).json({ success: false, message: "Security Warning: Invalid transaction PIN." });
  }

  function p_checks() {
    return pin === db.user.pin;
  }

  const billAmount = parseFloat(amount);
  const fee = billType === "airtime" || billType === "data" ? 0 : 100; // Electricity & Cable fetch a minor 100 NGN convenience fee
  const totalDeduction = billAmount + fee;

  if (db.user.balance < totalDeduction) {
    return res.status(400).json({ success: false, message: "Insufficient balance for this bill payment." });
  }

  const selectedProvider = BILL_PROVIDERS.find(p => p.id === providerId || p.code === providerId);
  const providerName = selectedProvider ? selectedProvider.name : providerId;

  const isLive = db.apiSettings.mode === "live" && db.apiSettings.nellobyteApiKey;

  if (isLive) {
    try {
      console.log(`[Nellobyte API] Initiating live purchase of ${billType} (${providerName}) for ${amount} NGN`);
      
      // Traditional Nellobyte API specifications for routing calls
      // The payload structure targets commonly deployed endpoints on Nellobyte API documentation
      const requestPayload: any = {
        api_key: db.apiSettings.nellobyteApiKey,
        userid: db.apiSettings.nellobyteUserId || "demo",
        amount: billAmount,
        phone: mobile || meterNumber || "08000000000"
      };

      let endpoint = "https://api.nellobyte.com/api/v1/airtime";

      if (billType === "airtime") {
        requestPayload.network = selectedProvider?.code || "MTN";
      } else if (billType === "data") {
        endpoint = "https://api.nellobyte.com/api/v1/data";
        requestPayload.network = selectedProvider?.code || "MTN_1GB";
      } else if (billType === "electricity") {
        endpoint = "https://api.nellobyte.com/api/v1/electricity";
        requestPayload.meter_no = meterNumber;
        requestPayload.disco = selectedProvider?.code || "IKEDC";
      } else if (billType === "cable") {
        endpoint = "https://api.nellobyte.com/api/v1/cable";
        requestPayload.smartcard_no = meterNumber; // smartcard identifier
        requestPayload.package = billCode || selectedProvider?.code;
      }

      console.log(`[Nellobyte API URL]: ${endpoint}`, requestPayload);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });

      const responseData = await response.json();
      console.log(`[Nellobyte API] Response Received:`, responseData);

      // Typical response code check
      if (responseData.status === "success" || responseData.code === "200") {
        db.user.balance -= totalDeduction;
        
        const billsDetail: any = {};
        if (mobile) billsDetail.mobile = mobile;
        if (meterNumber) billsDetail.meterNumber = meterNumber;
        billsDetail.provider = providerName;
        billsDetail.utilityToken = responseData.token || responseData.payload?.token || null; // for electricity disks

        const newTx = {
          id: `tx_${Date.now()}`,
          userId: db.user.id,
          type: "bill_payment" as const,
          amount: billAmount,
          fee: fee,
          description: `${billType.toUpperCase()} - ${providerName} Purchase`,
          status: "success" as const,
          reference: responseData.reference || responseData.tx_ref || `NEL-TX-${Date.now()}`,
          timestamp: new Date().toISOString(),
          billType: billType as any,
          billDetails: billsDetail
        };

        db.transactions.unshift(newTx);
        saveDb(db);

        // Dispatch notifications (bill payment alert)
        await sendNotificationDispatch({
          email: db.user.email,
          phone: db.user.phone,
          title: "Bill Payment Receipt",
          message: `FW Alert: Paid NGN ${billAmount.toLocaleString()} for ${billType.toUpperCase()} (${providerName}). Ref: ${newTx.reference}. Balance: NGN ${db.user.balance.toLocaleString()}`
        }).catch(e => console.error("Notification trigger failed", e));

        return res.json({
          success: true,
          message: `${billType.toUpperCase()} purchased successfully via Nellobyte!`,
          transaction: newTx,
          rawResponse: responseData
        });
      } else {
        return res.status(400).json({
          success: false,
          message: responseData.message || "Nellobyte API declined bill processing.",
          rawResponse: responseData
        });
      }

    } catch (error: any) {
      console.error("[Nellobyte API Request Failure]:", error);
      return res.status(500).json({ success: false, message: `Could not contact Nellobyte gateway: ${error.message}` });
    }
  } else {
    // Sandbox simulation
    db.user.balance -= totalDeduction;
    const sandboxRef = `NEL-MOCK-BILL-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockToken = billType === "electricity" ? `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}` : undefined;

    const billsDetail: any = {};
    if (mobile) billsDetail.mobile = mobile;
    if (meterNumber) billsDetail.meterNumber = meterNumber;
    billsDetail.provider = providerName;
    if (mockToken) billsDetail.utilityToken = mockToken;

    const newTx = {
      id: `tx_bill_sandbox_${Date.now()}`,
      userId: db.user.id,
      type: "bill_payment" as const,
      amount: billAmount,
      fee: fee,
      description: `Sandbox ${billType.toUpperCase()} - ${providerName} Purchase`,
      status: "success" as const,
      reference: sandboxRef,
      timestamp: new Date().toISOString(),
      billType: billType as any,
      billDetails: billsDetail
    };

    db.transactions.unshift(newTx);
    saveDb(db);

    // Dispatch notifications (bill payment alert)
    await sendNotificationDispatch({
      email: db.user.email,
      phone: db.user.phone,
      title: "Bill Payment Receipt",
      message: `FW Alert: Sandbox Paid NGN ${billAmount.toLocaleString()} for ${billType.toUpperCase()} (${providerName}). Ref: ${newTx.reference}. Balance: NGN ${db.user.balance.toLocaleString()}`
    }).catch(e => console.error("Notification trigger failed", e));

    return res.json({
      success: true,
      message: "Sandbox Utility Bill purchase successfully simulated. Ledger updated!",
      isSandbox: true,
      transaction: newTx
    });
  }
});

// Sandbox Only Route: Deposit Funds into Virtual Account (receive funds simulation)
app.post("/api/sandbox/deposit", (req, res) => {
  const { amount, senderName, senderBank, senderAccount } = req.body;
  const db = getDb();

  if (!db.user.virtualAccount) {
    return res.status(400).json({ success: false, message: "Virtual account must be initialized to receive simulated funds." });
  }

  const depositVal = parseFloat(amount);
  if (isNaN(depositVal) || depositVal <= 0) {
    return res.status(400).json({ success: false, message: "Please specify a positive numeric amount." });
  }

  const sender = senderName || "Aliko Adenuga";
  const bank = senderBank || "GTBank";
  const acct = senderAccount || "0112345678";

  // Modify user DB
  db.user.balance += depositVal;

  const flwRef = `FLW-ACCD-IN-${Math.floor(100000 + Math.random() * 900000)}`;
  const newTx = {
    id: `tx_deposit_${Date.now()}`,
    userId: db.user.id,
    type: "incoming_transfer" as const,
    amount: depositVal,
    fee: 0,
    description: `Funds Inflow to Wema Virtual Account`,
    status: "success" as const,
    reference: flwRef,
    timestamp: new Date().toISOString(),
    senderName: sender,
    senderAccount: acct,
    senderBank: bank
  };

  db.transactions.unshift(newTx);
  saveDb(db);

  // Dispatch notifications (credit alert)
  // Because sandbox is using a sync context we run this asynchronous chain
  sendNotificationDispatch({
    email: db.user.email,
    phone: db.user.phone,
    title: "Credit Notification",
    message: `FW Credit Alert: NGN ${depositVal.toLocaleString()} credited to your virtual account. Sender: ${sender} (${bank}). Ref: ${flwRef}. Balance: NGN ${db.user.balance.toLocaleString()}`
  }).catch(e => console.error("Notification trigger failed", e));

  return res.json({
    success: true,
    message: `Received ${depositVal.toLocaleString()} NGN via virtual account webhook simulation!`,
    transaction: newTx
  });
});

// System diagnostics
app.get("/api/health", (req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

// Serve frontend / handle Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app._router.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fintech Server Engine] online at: http://localhost:${PORT}`);
    console.log(`[Storage File]: ${DB_FILE}`);
  });
}

startServer();
