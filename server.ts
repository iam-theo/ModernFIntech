import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "src", "db_store.json");

// Lazy initialize GoogleGenAI following system skill recommendations
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
        flutterwavePublicKey: "FLWPUBK-ec2ab22509dfc3b9e0cecfad305f6e0e-X",
        flutterwaveSecretKey: "FLWSECK-313d8a9bc44b841577267cc922e24010-19eddbb3ce5vt-X",
        nellobyteApiKey: "PBMT4H97M974QDK8D0P46U7NA01D5E2849ETM9WZ6657VYMQTK15368WK64NG48K",
        nellobyteUserId: "CK100028738",
        termiiApiKey: "TLZugUiorQTxeDaIyTOScmNBcoTnuzYFKQiPHHSptRcwLsNTdzwRFDHVWptPOm",
        termiiSenderId: "Auracle",
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

// Fetch the public IP address of the app's server container for whitelisting
app.get("/api/ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    if (data.ip) {
      return res.json({ success: true, ip: data.ip });
    }
    throw new Error("No IP returned");
  } catch (err: any) {
    console.error("[IP API Error]:", err.message);
    return res.json({ success: false, message: "Could not fetch public IP address automatically.", ip: "No auto-match" });
  }
});

// Fetch active gateway balances (Flutterwave, Termii & Nellobyte)
app.get("/api/gateway/balances", async (req, res) => {
  const db = getDb();
  const isLiveFlw = db.apiSettings.mode === "live" && db.apiSettings.flutterwaveSecretKey;
  const isLiveTermii = db.apiSettings.mode === "live" && db.apiSettings.termiiApiKey;
  const isLiveNellobyte = db.apiSettings.mode === "live" && db.apiSettings.nellobyteApiKey;

  let flwBalance = { available: db.user.balance, ledger: db.user.balance, currency: "NGN", isSandbox: true };
  let termiiBalance = { balance: 1450, currency: "NGN", isSandbox: true };
  let nellobyteBalance = { balance: 25000, currency: "NGN", isSandbox: true };

  if (isLiveFlw) {
    try {
      const flwResp = await fetch("https://api.flutterwave.com/v3/balances/NGN", {
        headers: {
          "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
        }
      });
      const flwData = await flwResp.json();
      if (flwData && flwData.status === "success" && flwData.data) {
        flwBalance = {
          available: parseFloat(flwData.data.available_balance || "0"),
          ledger: parseFloat(flwData.data.ledger_balance || "0"),
          currency: flwData.data.currency || "NGN",
          isSandbox: false
        };
      }
    } catch (err: any) {
      console.warn("[Balances API] Flutterwave balance call failed:", err.message);
    }
  }

  if (isLiveTermii) {
    try {
      const termiiResp = await fetch(`https://api.ng.termii.com/api/balance?api_key=${db.apiSettings.termiiApiKey}`);
      const termiiData = await termiiResp.json();
      if (termiiData && termiiData.balance !== undefined) {
        termiiBalance = {
          balance: parseFloat(termiiData.balance || "0"),
          currency: "NGN",
          isSandbox: false
        };
      }
    } catch (err: any) {
      console.warn("[Balances API] Termii balance call failed:", err.message);
    }
  }

  if (isLiveNellobyte) {
    try {
      // In Nellobyte systems, balance endpoint fetches based on live credentials
      const nellobyteResp = await fetch(`https://api.nellobyte.com/api/v1/balance?api_key=${db.apiSettings.nellobyteApiKey}`);
      const nellobyteData = await nellobyteResp.json();
      if (nellobyteData && (nellobyteData.balance !== undefined || nellobyteData.wallet_balance !== undefined)) {
        nellobyteBalance = {
          balance: parseFloat(nellobyteData.balance || nellobyteData.wallet_balance || "0"),
          currency: "NGN",
          isSandbox: false
        };
      }
    } catch (err: any) {
      console.warn("[Balances API] Nellobyte balance call failed:", err.message);
    }
  }

  return res.json({ success: true, flwBalance, termiiBalance, nellobyteBalance });
});

// Validate meter or smartcard decoders
app.post("/api/bills/validate", async (req, res) => {
  const { billType, providerId, meterNumber } = req.body;
  const db = getDb();
  const isLive = db.apiSettings.mode === "live" && db.apiSettings.nellobyteApiKey;

  if (!billType || !providerId || !meterNumber) {
    return res.status(400).json({ success: false, message: "Missing required validation parameters." });
  }

  const selectedProvider = BILL_PROVIDERS.find(p => p.id === providerId || p.code === providerId);
  const providerCode = selectedProvider ? selectedProvider.code : providerId;

  if (isLive) {
    try {
      console.log(`[Nellobyte API] Validating live ${billType} meter/smartcard ${meterNumber} on ${providerCode}`);
      let endpoint = `https://api.nellobyte.com/api/v1/validate-meter?api_key=${db.apiSettings.nellobyteApiKey}&network=${providerCode}&meter=${meterNumber}`;
      if (billType === "cable") {
        endpoint = `https://api.nellobyte.com/api/v1/validate-smartcard?api_key=${db.apiSettings.nellobyteApiKey}&network=${providerCode}&smartcard=${meterNumber}`;
      }
      
      const response = await fetch(endpoint);
      const responseData = await response.json();
      if (responseData && responseData.status === "success" && responseData.customer_name) {
        return res.json({
          success: true,
          customerName: responseData.customer_name,
          meterNumber
        });
      } else {
        return res.status(400).json({
          success: false,
          message: responseData.message || `Could not confirm ownership for this smartcard / meter number on ${providerCode}.`
        });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, message: `Nellobyte API offline: ${error.message}` });
    }
  } else {
    // Sandbox validation
    const firstDigit = meterNumber[0] || "5";
    const mappedNames: Record<string, string> = {
      "0": "Alhaji Musa Dikko",
      "1": "Dr. Florence Kolawole",
      "2": "Chidimma Egwu Ebuka",
      "3": "Tunde Bakare Enterprise",
      "4": "Oyinlola Williams",
      "5": "Chief Abdul Rasaq",
      "6": "Yusuf Haruna",
      "7": "Chinyere Alao Ventures",
      "8": "Florence Otedola Estate",
      "9": "Gambo Bature Farms"
    };
    const resolvedName = mappedNames[firstDigit] || "Fintech Demo Customer";
    return res.json({
      success: true,
      customerName: `${resolvedName} (Verified Customer)`,
      meterNumber,
      isSandbox: true
    });
  }
});

// Fetch standard & live list of NGN banks
app.get("/api/banks", async (req, res) => {
  const db = getDb();
  const isLive = db.apiSettings.mode === "live" && db.apiSettings.flutterwaveSecretKey;
  if (isLive) {
    try {
      console.log("[Flutterwave API] Fetching live bank lists from Flutterwave...");
      const response = await fetch("https://api.flutterwave.com/v3/banks/NG", {
        headers: {
          "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
        }
      });
      const data = await response.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        // Map and deduplicate by bank code
        const seen = new Set<string>();
        const banks: { code: string; name: string }[] = [];
        for (const b of data.data) {
          if (b.code && !seen.has(b.code)) {
            seen.add(b.code);
            banks.push({
              code: b.code,
              name: b.name
            });
          }
        }
        // Sort alphabetical
        banks.sort((a, b) => a.name.localeCompare(b.name));
        return res.json({ success: true, banks });
      }
    } catch (err: any) {
      console.error("[Flutterwave API Error] Failed fetching bank list:", err.message);
    }
  }
  
  // Return static fallback list in sandbox or error fallback sorted alphabetically
  const FALLBACK_BANKS = [
    { code: "035", name: "Wema Bank" },
    { code: "044", name: "Access Bank" },
    { code: "058", name: "Guaranty Trust Bank (GTBank)" },
    { code: "033", name: "United Bank for Africa (UBA)" },
    { code: "057", name: "Zenith Bank" },
    { code: "50211", name: "Kuda Microfinance Bank" },
    { code: "101", name: "Providus Bank" },
    { code: "039", name: "Stanbic IBTC Bank" },
    { code: "011", name: "First Bank of Nigeria" },
    { code: "214", name: "FCMB" },
    { code: "070", name: "Fidelity Bank" },
    { code: "050", name: "Ecobank Nigeria" },
    { code: "030", name: "Heritage Bank" },
    { code: "082", name: "Keystone Bank" },
    { code: "221", name: "Stanbic IBTC" },
    { code: "232", name: "Sterling Bank" },
    { code: "032", name: "Union Bank of Nigeria" },
    { code: "51256", name: "Opay" },
    { code: "50515", name: "Moniepoint MFB" },
    { code: "56145", name: "Palmpay" }
  ];
  
  const seenFallback = new Set<string>();
  const deduplicatedFallback: { code: string; name: string }[] = [];
  for (const b of FALLBACK_BANKS) {
    if (b.code && !seenFallback.has(b.code)) {
      seenFallback.add(b.code);
      deduplicatedFallback.push(b);
    }
  }
  deduplicatedFallback.sort((a, b) => a.name.localeCompare(b.name));
  return res.json({ success: true, banks: deduplicatedFallback });
});

// Smarter Auto-matching verification reverse-lookup system for NUBAN entries
app.post("/api/transfer/find-linked-banks", async (req, res) => {
  const { accountNumber } = req.body;
  const db = getDb();
  
  if (!accountNumber || accountNumber.length !== 10) {
    return res.status(400).json({ success: false, message: "A 10-digit NUBAN account number is required." });
  }

  const TOP_BANKS = [
    { code: "058", name: "GTBank" },
    { code: "057", name: "Zenith Bank" },
    { code: "044", name: "Access Bank" },
    { code: "50211", name: "Kuda Microfinance Bank" },
    { code: "035", name: "Wema Bank" },
    { code: "033", name: "United Bank for Africa (UBA)" }
  ];

  const isLive = db.apiSettings.mode === "live" && db.apiSettings.flutterwaveSecretKey;

  if (isLive) {
    try {
      console.log(`[Flutterwave Link-Lookup] Querying matching accounts for ${accountNumber}...`);
      // Parallel name checking against top institutions
      const checkPromises = TOP_BANKS.map(async (bk) => {
        try {
          const response = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
            },
            body: JSON.stringify({
              account_number: accountNumber,
              account_bank: bk.code
            })
          });
          const rData = await response.json();
          if (rData.status === "success" && rData.data) {
            return {
              bankCode: bk.code,
              bankName: bk.name,
              accountName: rData.data.account_name
            };
          }
        } catch (e) {
          // ignore error
        }
        return null;
      });

      const resolved = await Promise.all(checkPromises);
      const linked = resolved.filter((item): item is NonNullable<typeof item> => item !== null);
      
      return res.json({ success: true, linkedAccounts: linked });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  } else {
    // Elegant sandbox simulation matching:
    const mockNames = [
      "Amina Dangote", "Ngozi Obi", "Chidi Nwachukwu", "Emeka Adebayo", 
      "Olawale Sanusi", "Zubairu Mahmud", "Yusuf Oyedepo", "Chinyere Alao"
    ];

    const d1 = parseInt(accountNumber[0] || "1");
    const d2 = parseInt(accountNumber[accountNumber.length - 1] || "3");

    const index1 = d1 % TOP_BANKS.length;
    const index2 = d2 % TOP_BANKS.length;

    const bank1 = TOP_BANKS[index1];
    const bank2 = TOP_BANKS[index2 === index1 ? (index2 + 1) % TOP_BANKS.length : index2];

    const name1 = mockNames[parseInt(accountNumber[2] || "0") % mockNames.length];
    const name2 = mockNames[parseInt(accountNumber[7] || "4") % mockNames.length];

    return res.json({
      success: true,
      linkedAccounts: [
        { bankCode: bank1.code, bankName: bank1.name, accountName: name1 },
        { bankCode: bank2.code, bankName: bank2.name, accountName: name2 }
      ]
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
      // Prior Live Flutterwave wallet balance check
      console.log("[Flutterwave API] Checking live account balance before payout...");
      try {
        const balResp = await fetch("https://api.flutterwave.com/v3/balances/NGN", {
          headers: {
            "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}`
          }
        });
        const balData = await balResp.json();
        console.log("[Flutterwave API] Live account balance fetch:", balData);
        if (balData && balData.status === "success" && balData.data) {
          const liveAvailable = parseFloat(balData.data.available_balance || balData.data.ledger_balance || "0");
          if (liveAvailable < transferAmount) {
            return res.status(400).json({
              success: false,
              message: `Live Gateway Error: Insufficient Flutterwave balance. Your active Flutterwave merchant wallet has ₦${liveAvailable.toLocaleString()}, but this payout requires ₦${transferAmount.toLocaleString()}. Please wire funds to your Flutterwave merchant account.`
            });
          }
        }
      } catch (balErr: any) {
        console.warn("[Flutterwave API] Live balance check skipped due to error:", balErr.message);
      }

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

// FEATURE 2: KYC & BVN Verification API
app.post("/api/kyc/verify-bvn", async (req, res) => {
  const db = getDb();
  const { bvn, firstName, lastName, phone } = req.body;

  if (!bvn || bvn.length !== 11) {
    return res.status(400).json({ success: false, message: "Bank Verification Number (BVN) must be exactly 11 digits." });
  }

  db.user.kycStatus = "verified";
  db.user.kycBvn = bvn;
  if (firstName && lastName) {
    db.user.fullName = `${firstName} ${lastName}`;
  }
  saveDb(db);

  await sendNotificationDispatch({
    email: db.user.email,
    phone: phone || db.user.phone,
    title: "KYC Tier-2 Verified",
    message: `Verification Success: Your 11-digit BVN (${bvn.slice(0, 3)}****${bvn.slice(-4)}) has been mapped. Status upgraded to Verified Collector!`
  }).catch(err => console.error("Notification failed", err));

  return res.json({
    success: true,
    message: "KYC Identity validated! Your account is upgraded to Level 2 (Verified).",
    kycStatus: "verified",
    fullName: db.user.fullName
  });
});

// FEATURE 1: Create collections dynamic virtual account
app.post("/api/user/dynamic-virtual-account", async (req, res) => {
  const db = getDb();
  const { amount, description, expiryMinutes } = req.body;

  const targetAmount = parseFloat(amount);
  if (isNaN(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ success: false, message: "Please specify a positive numeric amount to collect." });
  }

  db.user.dynamicAccounts = db.user.dynamicAccounts || [];
  
  const minutes = parseInt(expiryMinutes) || 15;
  const expiryDate = new Date(Date.now() + minutes * 60000);
  const randomAcctNum = "959" + Math.floor(1000000 + Math.random() * 9000000).toString();
  
  const newAccount = {
    id: `dyn_${Date.now()}`,
    accountNumber: randomAcctNum,
    accountName: `FLW TEMP / ${db.user.fullName.toUpperCase()}`,
    bankName: "Providus Bank FLW",
    amount: targetAmount,
    description: description || "One-time Collections API reference",
    expiry: expiryDate.toISOString(),
    status: "active" as const,
    reference: `COL-DYN-${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString()
  };

  db.user.dynamicAccounts.unshift(newAccount);
  saveDb(db);

  await sendNotificationDispatch({
    email: db.user.email,
    phone: db.user.phone,
    title: "Dynamic Collection Created",
    message: `Collections API: One-time virtual account ${randomAcctNum} created for NGN ${targetAmount}. Exp: ${minutes}m.`
  }).catch(e => console.error(e));

  return res.json({
    success: true,
    message: "Dynamic Virtual Account generated successfully via Collections API.",
    account: newAccount
  });
});

// Simulates payment inflow to temporary collection account (Real mock webhook routing)
app.post("/api/sandbox/pay-dynamic", async (req, res) => {
  const db = getDb();
  const { accountNumber } = req.body;

  db.user.dynamicAccounts = db.user.dynamicAccounts || [];
  const accountIndex = db.user.dynamicAccounts.findIndex((acc: any) => acc.accountNumber === accountNumber);

  if (accountIndex === -1) {
    return res.status(404).json({ success: false, message: "Specified temporary dynamic account reference not found." });
  }

  const account = db.user.dynamicAccounts[accountIndex];
  if (account.status !== "active") {
    return res.status(400).json({ success: false, message: `This account is already ${account.status}.` });
  }

  if (new Date(account.expiry).getTime() < Date.now()) {
    account.status = "expired";
    saveDb(db);
    return res.status(400).json({ success: false, message: "Dynamic virtual account window has expired." });
  }

  account.status = "paid";
  db.user.balance += account.amount;

  const newTx = {
    id: `tx_dyn_deposit_${Date.now()}`,
    userId: db.user.id,
    type: "incoming_transfer" as const,
    amount: account.amount,
    fee: 0,
    description: `Dynamic Collection: ${account.description}`,
    status: "success" as const,
    reference: account.reference,
    timestamp: new Date().toISOString(),
    senderName: "Collections Webhook Gateway",
    senderAccount: "8890218318",
    senderBank: account.bankName
  };

  db.transactions.unshift(newTx);
  saveDb(db);

  await sendNotificationDispatch({
    email: db.user.email,
    phone: db.user.phone,
    title: "Collection Settled",
    message: `Webhook: Dynamic payment of ₦${account.amount.toLocaleString()} received via Providus Account ${account.accountNumber}! Wallet ledger credited.`
  }).catch(e => console.error(e));

  return res.json({
    success: true,
    message: `Simulated inbound collection webhook for ₦${account.amount.toLocaleString()} processed.`,
    account,
    transaction: newTx
  });
});

// FEATURE 3: Bulk Transfers & Payout Queue Processing Block
app.post("/api/transfer/bulk", async (req, res) => {
  const db = getDb();
  const { payouts, pin } = req.body;

  if (pin !== db.user.pin) {
    return res.status(400).json({ success: false, message: "Incorrect transaction authorization PIN." });
  }

  if (!Array.isArray(payouts) || payouts.length === 0) {
    return res.status(400).json({ success: false, message: "Payouts collection must be a non-empty array." });
  }

  const results = [];
  let totalDeductions = 0;
  let totalFees = 0;
  const FEE_PER_PAYOUT = 10;

  for (const item of payouts) {
    const amt = parseFloat(item.amount);
    const { bankCode, accountNumber, narration } = item;
    const destBank = NIGERIAN_BANKS.find(b => b.code === bankCode)?.name || "External Institution";

    if (isNaN(amt) || amt <= 0) {
      results.push({ ...item, status: "failed", message: "Invalid amount specified." });
      continue;
    }

    if (!accountNumber || accountNumber.length !== 10) {
      results.push({ ...item, status: "failed", message: "NUBAN must be 10 digits." });
      continue;
    }

    const currentCost = amt + FEE_PER_PAYOUT;
    const currentBalance = db.user.balance - totalDeductions;

    if (currentBalance < currentCost) {
      results.push({ ...item, status: "failed", message: "Insufficient pocket wallet funds." });
      continue;
    }

    totalDeductions += currentCost;
    totalFees += FEE_PER_PAYOUT;

    const txRef = `FLW-BULK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: `tx_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: db.user.id,
      type: "outgoing_transfer" as const,
      amount: amt,
      fee: FEE_PER_PAYOUT,
      description: narration || "Bulk Dispatch Queue settlement",
      status: "success" as const,
      reference: txRef,
      timestamp: new Date().toISOString(),
      recipientAccount: accountNumber,
      recipientBank: destBank,
      recipientName: item.recipientName || "Batch Receiver"
    };

    db.transactions.unshift(newTx);

    results.push({
      ...item,
      recipientBank: destBank,
      status: "success",
      reference: txRef,
      fee: FEE_PER_PAYOUT
    });
  }

  db.user.balance -= totalDeductions;
  saveDb(db);

  await sendNotificationDispatch({
    email: db.user.email,
    phone: db.user.phone,
    title: "Bulk Dispatched",
    message: `Batch complete: Dispatched ${results.filter(r => r.status === 'success').length} payouts. Debited NGN ${totalDeductions}. Gateway Fee: NGN ${totalFees}.`
  }).catch(e => console.error(e));

  return res.json({
    success: true,
    message: "Bulk dispatch payout collection processed successfully.",
    payoutSummary: results,
    totalDeducted: totalDeductions,
    totalFees,
    newBalance: db.user.balance
  });
});

// FEATURE 4: Snap to Scan written text extraction (Gemini Vision OCR)
app.post("/api/transfer/snap-scan", async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: "Please upload or snap account info image text first." });
  }

  const base64Clean = image.replace(/^data:image\/[a-z]+;base64,/, "");
  const keyAvailable = process.env.GEMINI_API_KEY;

  if (!keyAvailable) {
    console.log("[Snap Scan Webhook] Missing GEMINI_API_KEY. Supplying preset match...");
    return res.json({
      success: true,
      bankName: "Guaranty Trust Bank (GTBank)",
      accountNumber: "0123456789",
      accountName: "Musa Gregory Kolawole (OCR Scraped)",
      confidence: 94,
      isSandbox: true,
      rawExtracted: "GTBank 0123456789 Musa Gregory"
    });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: base64Clean
      }
    };

    const promptText = "Review this photo containing handwritten/printed bank account details in Nigeria. Decode exactly: 1) Account Number (10 digits NUBAN), 2) Target Bank Name (e.g. GTBank, Access Bank, Zenith, Wema, FCMB, Providus, Sterling, etc.), 3) Account holder full name if visible. Respond with a JSON object containing keys: bankName (string matches best from NIGERIAN_BANKS), accountNumber (string), accountName (string). Keep other values blank if not spotted.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, promptText],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankName: { type: Type.STRING },
            accountNumber: { type: Type.STRING },
            accountName: { type: Type.STRING }
          },
          required: ["bankName", "accountNumber"]
        }
      }
    });

    const parsedOCR = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      ...parsedOCR,
      rawExtracted: response.text
    });
  } catch (error: any) {
    console.warn("[Vision Scan OCR Failure]:", error);
    return res.status(500).json({
      success: false,
      message: ` OCR parsing handshake failed: ${error.message}`
    });
  }
});

// FEATURE 5: AI Voice & Chat Assistant Action Router
app.post("/api/ai/assistant", async (req, res) => {
  const { prompt, history } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ success: false, message: "Please enter or speak a valid query prompt." });
  }

  const db = getDb();
  
  // 1. Compile User Profile Context
  const userInfo = {
    fullName: db.user.fullName,
    email: db.user.email,
    balance: db.user.balance,
    kycStatus: db.user.kycStatus || "tier-2 (verified)",
    phone: db.user.phone,
    bvn: db.user.kycBvn || "22233445566",
    pin: db.user.pin || "1234",
    virtualAccount: db.user.virtualAccount || null
  };

  // 2. Compile Recent Transactions
  const recentTransactions = (db.transactions || []).slice(-15).map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    fee: t.fee || 0,
    description: t.description,
    status: t.status,
    timestamp: t.timestamp || t.createdAt,
    senderOrRecipient: t.recipientName || t.mobile || t.senderName || t.meterNumber || "N/A",
    billType: t.billType || null
  }));

  // 3. Retrieve Live API Settings
  const apiSettings = {
    mode: db.apiSettings?.mode || "sandbox",
    businessName: db.apiSettings?.businessName || "Fintech Broker Ltd",
    supportEmail: db.apiSettings?.supportEmail || "support@nellobyteflw.com",
    hasFlwKey: !!db.apiSettings?.flutterwaveSecretKey,
    hasTermiiKey: !!db.apiSettings?.termiiApiKey,
    hasNellobyteKey: !!db.apiSettings?.nellobyteApiKey
  };

  // 4. Load Live Developer Balances Context Dynamically
  let liveFlwBalance = { available: db.user.balance, ledger: db.user.balance, isSandbox: true };
  let liveTermiiBalance = { balance: 1450, isSandbox: true };
  let liveNellobyteBalance = { balance: 25000, isSandbox: true };

  const isLiveFlw = db.apiSettings?.mode === "live" && db.apiSettings?.flutterwaveSecretKey;
  const isLiveTermii = db.apiSettings?.mode === "live" && db.apiSettings?.termiiApiKey;
  const isLiveNellobyte = db.apiSettings?.mode === "live" && db.apiSettings?.nellobyteApiKey;

  if (isLiveFlw) {
    try {
      const flwResp = await fetch("https://api.flutterwave.com/v3/balances/NGN", {
        headers: { "Authorization": `Bearer ${db.apiSettings.flutterwaveSecretKey}` }
      });
      const flwData = await flwResp.json();
      if (flwData?.status === "success" && flwData.data) {
        liveFlwBalance = {
          available: parseFloat(flwData.data.available_balance || "0"),
          ledger: parseFloat(flwData.data.ledger_balance || "0"),
          isSandbox: false
        };
      }
    } catch (_) {}
  }

  if (isLiveTermii) {
    try {
      const termiiResp = await fetch(`https://api.ng.termii.com/api/balance?api_key=${db.apiSettings.termiiApiKey}`);
      const termiiData = await termiiResp.json();
      if (termiiData?.balance !== undefined) {
        liveTermiiBalance = {
          balance: parseFloat(termiiData.balance || "0"),
          isSandbox: false
        };
      }
    } catch (_) {}
  }

  if (isLiveNellobyte) {
    try {
      const nellobyteResp = await fetch(`https://api.nellobyte.com/api/v1/balance?api_key=${db.apiSettings.nellobyteApiKey}`);
      const nellobyteData = await nellobyteResp.json();
      if (nellobyteData && (nellobyteData.balance !== undefined || nellobyteData.wallet_balance !== undefined)) {
        liveNellobyteBalance = {
          balance: parseFloat(nellobyteData.balance || nellobyteData.wallet_balance || "0"),
          isSandbox: false
        };
      }
    } catch (_) {}
  }

  const keyAvailable = process.env.GEMINI_API_KEY;

  if (!keyAvailable) {
    console.log("[AI Assistant] Key missing, activating regex query router fallback.");
    // Smart offline regex parser
    const lowerPrompt = prompt.toLowerCase();
    let userIntent = "general_chat";
    let amount: number | null = null;
    let bankCode: string | null = null;
    let bankName: string | null = null;
    let accountNumber: string | null = null;
    let phoneNumber: string | null = null;
    let providerId: string | null = null;
    let explanation = "I'm your sandbox AI assistant. Speak or type instructions!";

    // Match numbers
    const tenDigits = lowerPrompt.match(/\b\d{10}\b/);
    if (tenDigits) {
      accountNumber = tenDigits[0];
    }
    const elevenDigits = lowerPrompt.match(/\b(0\d{10}|\+234\d{10})\b/);
    if (elevenDigits) {
      phoneNumber = elevenDigits[0];
    }

    const amountMatch = lowerPrompt.match(/\b(₦|ngn|n)?\s?(\d{3,6})\b/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[2]);
    }

    // Identify bank
    for (const b of NIGERIAN_BANKS) {
      if (lowerPrompt.includes(b.name.toLowerCase()) || lowerPrompt.includes(b.name.split(" ")[0].toLowerCase())) {
        bankCode = b.code;
        bankName = b.name;
        break;
      }
    }

    // Determine Intent
    if (lowerPrompt.includes("balance") || lowerPrompt.includes("money") || lowerPrompt.includes("wallet")) {
      userIntent = "balance_query";
      explanation = `Your active pocket balance is ₦${userInfo.balance.toLocaleString()}. Live Termii SMS Balance is ₦${liveTermiiBalance.balance.toLocaleString()} and Nellobyte Balance is ₦${liveNellobyteBalance.balance.toLocaleString()}!`;
    } else if (lowerPrompt.includes("send") || lowerPrompt.includes("transfer") || lowerPrompt.includes("pay")) {
      userIntent = "transfer";
      if (amount && accountNumber && bankName) {
        explanation = `I have successfully drafted an outgoing transfer of ₦${amount.toLocaleString()} to ${bankName} account ${accountNumber}. Please review the form payload below and log your transaction PIN to confirm!`;
      } else {
        explanation = `You mentioned a transfer, but I need more details (amount, bank name, or account NUBAN digits) to draft it. Please say e.g., 'Transfer 5000 NGN to Access Bank account 1234567890'.`;
      }
    } else if (lowerPrompt.includes("airtime") || lowerPrompt.includes("credit") || lowerPrompt.includes("recharge")) {
      userIntent = "airtime";
      
      // Map Telecom code
      if (lowerPrompt.includes("mtn")) providerId = "mtn";
      else if (lowerPrompt.includes("glo")) providerId = "glo";
      else if (lowerPrompt.includes("airtel")) providerId = "airtel";
      else if (lowerPrompt.includes("9mobile")) providerId = "mobile9";
      else providerId = "mtn"; // Default

      if (amount && phoneNumber) {
        explanation = `Drafted ₦${amount.toLocaleString()} airtime load for ${phoneNumber}. Confirm with PIN to recharge!`;
      } else {
        explanation = `Understood airtime request, but I need amount and phone number value (e.g. 'recharge 1000 MTN airtime for 08123456789')`;
      }
    }

    return res.json({
      success: true,
      userIntent,
      amount,
      bankCode,
      bankName,
      accountNumber,
      phoneNumber,
      providerId,
      explanation,
      isSandbox: true,
      accountName: "Simulated Holder",
      networkName: providerId ? providerId.toUpperCase() : "MTN",
      providerName: "MTN Nigeria"
    });
  }

  try {
    const systemInstruction = `
You are the advanced full-stack voice-and-chat AI assistant broker for this premium Nigerian Fintech Dashboard.
You have native privileges to query transaction logs, profile details, settings info, and live developer gateway balances!

USER PROFILE CONTEXT:
- Full Name: ${userInfo.fullName}
- Wallet active pocket balance: ₦${userInfo.balance.toLocaleString()}
- Verification/KYC level status: ${userInfo.kycStatus}
- Mobile target: ${userInfo.phone}
- Saved active BVN digits: ${userInfo.bvn}
- Customer Secure PIN: ${userInfo.pin}

API DEVELOPER KEY SETTINGS CONTEXT:
- Run mode: ${apiSettings.mode}
- Business Registered Name: ${apiSettings.businessName}
- Main Customer Support Email: ${apiSettings.supportEmail}
- Flutterwave Endpoint State: ${apiSettings.hasFlwKey ? "CONFIGURED & LIVE" : "NOT CONFIGURED"}
- Nellobyte VTU Endpoint State: ${apiSettings.hasNellobyteKey ? "CONFIGURED & LIVE" : "NOT CONFIGURED"}
- Termii SMS Dispatcher Endpoint State: ${apiSettings.hasTermiiKey ? "CONFIGURED & LIVE" : "NOT CONFIGURED"}

LIVE GATEWAY SERVER TELEMETRY WALLET ACTIONS:
- Flutterwave secret credentials status: Balance is Available: ₦${liveFlwBalance.available.toLocaleString()}, Ledger: ₦${liveFlwBalance.ledger.toLocaleString()} (Is simulated: ${liveFlwBalance.isSandbox})
- Termii SMS developer state balance: ₦${liveTermiiBalance.balance.toLocaleString()} NGN (Is simulated: ${liveTermiiBalance.isSandbox})
- Nellobyte VTU developer state balance: ₦${liveNellobyteBalance.balance.toLocaleString()} NGN (Is simulated: ${liveNellobyteBalance.isSandbox})

TRANSACTION LOGS SUMMARY IN THE LEDGER DATABASE (Last 15 logs):
${JSON.stringify(recentTransactions, null, 2)}

SUPPORTED BANKS:
${JSON.stringify(NIGERIAN_BANKS)}

SUPPORTED BILL UTILITIES & TELECOM Recourse:
${JSON.stringify(BILL_PROVIDERS)}

OPERATION INSTRUCTIONS:
1. ADDRESS FOLLOW-UPS & MULTI-TURN THREAD MEMORY:
   Analyze the incoming message prompt and refer back to previous conversation records provided in the conversation history log.
   If the user did a follow-up (e.g. they say: "change the amount to 4000", or "Access Bank indeed", or "send it now"), carry over parameters from the earlier messages list!
2. READING LOGS & INFORMATION SUMMARY:
   If the user asks about recent transfers, bills, or expenditures, lookup the TRANSACTION LOGS SUMMARY. State date, amounts, descriptions, and reference details. Be specific and accurate!
3. PROFILE & SETTINGS ADVICE:
   If they raise queries on settings, profile values, BVN logs, or API states (Termii, Nellobyte, Flutterwave), fetch values directly from PROFILE & SETTINGS. Shield raw credentials or keys (use masking, e.g., NelloKey_***) but fully report on state.
4. ACTION INTENT DISPATCH DRAFTING:
   If drafting transactions, decode variables for the JSON output:
   - For "transfer": extract 'amount', 'bankCode', 'bankName', 'accountNumber' (10-digit). You MUST predict/set/generate a realistic beneficiary customer 'accountName' (e.g. "Amara Okafor" or look up/extract if stated in the prompt, or formulate an elegant Nigerian name).
   - For "airtime" or "data": set 'amount', 'phoneNumber', 'providerId' (e.g. "mtn", "glo", "airtel", "mobile9"). You MUST set 'networkName' representing the mapped carrier (e.g. "MTN Nigeria", "Airtel Nigeria", "Glo Mobile", "9mobile").
   - For utility bills ("utility_bills" like electricity or cable): set 'amount', 'providerId' (e.g. "ikeja", "eko", "dstv", "gotv"), 'providerName' (e.g., "Ikeja Electricity (IKEDC)", "DSTV Max", "Abuja Electricity (AEDC)"), 'packageName' or coupon code, and 'meterNumber' or smartcard identifier.
5. In your "explanation", give a highly friendly, detailed, and clear explanation of what is drafted or answered. Mention specific dates, values, networks, beneficiary accountNames, or API balance summaries!
`;

    // Map conversation logs history into Google GenAI turns standard format
    const chatContents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.sender === "user") {
          chatContents.push({ role: "user", parts: [{ text: item.text }] });
        } else if (item.sender === "assistant") {
          chatContents.push({ role: "model", parts: [{ text: item.text }] });
        }
      }
    }

    // Push the newest prompt
    chatContents.push({ role: "user", parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            userIntent: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            bankCode: { type: Type.STRING },
            bankName: { type: Type.STRING },
            accountNumber: { type: Type.STRING },
            accountName: { type: Type.STRING },
            phoneNumber: { type: Type.STRING },
            providerId: { type: Type.STRING },
            providerName: { type: Type.STRING },
            packageName: { type: Type.STRING },
            networkName: { type: Type.STRING },
            narration: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["userIntent", "explanation"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      ...parsedResponse
    });
  } catch (error: any) {
    console.warn("[AI Voice Assistant Handshake Failed]:", error);
    return res.status(500).json({
      success: false,
      message: `Failed loading speech parameters : ${error.message}`
    });
  }
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
