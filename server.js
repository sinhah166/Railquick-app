import http from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");

function loadEnv() {
  try {
    const envFile = readFileSync(join(__dirname, ".env"), "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Local .env is optional. Production hosts should provide real env vars.
  }
}

loadEnv();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const supabaseUrl = process.env.SUPABASE_URL || "https://dfwwgppsjnovbzvldftc.supabase.co";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmd3dncHBzam5vdWJ6dmxkZnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDExMTksImV4cCI6MjA5NzM3NzExOX0._B_bI6yUtQpWo5ZMuon6TmiJqf2ps_gAcnW7dcdoBuE";
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || "RailQuick <onboarding@resend.dev>";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return { response, data };
}

async function emailAlreadyExists(email) {
  const path = `waitlist?email=eq.${encodeURIComponent(email)}&select=email&limit=1`;
  const { response, data } = await supabaseRequest(path, {
    method: "GET",
    headers: {
      Prefer: ""
    }
  });

  if (!response.ok) {
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function addToWaitlist(email, city) {
  if (await emailAlreadyExists(email)) {
    return { inserted: false };
  }

  const { response, data } = await supabaseRequest("waitlist", {
    method: "POST",
    body: JSON.stringify({ email, city })
  });

  if (response.ok) {
    return { inserted: true, data };
  }

  if (data?.code === "23505") {
    return { inserted: false };
  }

  throw new Error(data?.message || "Could not add this email to the waitlist.");
}

async function sendWelcomeEmail(email) {
  if (!resendApiKey) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: resendFrom,
      to: email,
      subject: "Welcome to RailQuick",
      text: `Hello,

Thank you for joining the RailQuick waitlist.

We have successfully received your request and added your email to our early access list.

RailQuick is building a simpler way for train passengers to get essential items delivered directly during their journey.

As we move closer to launch, we'll share important updates, early access invitations, and availability information for your city.

Thank you for your interest in RailQuick.

Regards,
Kartik Guleria
Founder & CEO
RailQuick`
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Could not send welcome email.");
  }
}

async function handleWaitlist(request, response) {
  try {
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const city = String(body.city || "").trim();

    if (!isEmail(email) || !city) {
      sendJson(response, 400, { message: "Please enter a valid email and city." });
      return;
    }

    const waitlist = await addToWaitlist(email, city);

    if (!waitlist.inserted) {
      sendJson(response, 200, {
        message: "You are already on the RailQuick waitlist. We will keep you updated."
      });
      return;
    }

    await sendWelcomeEmail(email);

    sendJson(response, 201, {
      message: "You are on the RailQuick waitlist. Please check your email for the welcome note."
    });
  } catch (error) {
    sendJson(response, 500, {
      message: error.message || "Something went wrong. Please try again."
    });
  }
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function queryRailkitAPI(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.RAILKIT_API_KEY || 'irctc_a0477021c3cdc7d547c18c196b9f39b871c9f02621e2bd86',
        'accept': 'application/json'
      }
    });
    console.log(`[Railkit API] GET ${url} -> Status ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`[Railkit API] Response success:`, data.success);
      if (data && data.success) return data;
      console.warn(`[Railkit API] Response success is false:`, data);
    } else {
      const errText = await response.text();
      console.warn(`[Railkit API] Error response details:`, errText);
    }
  } catch (e) {
    console.warn("[Railkit API] Request failed:", e.message);
  }
  return null;
}

const server = http.createServer(async (request, response) => {
  const parsedUrl = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = parsedUrl.pathname;

  if (request.method === "POST" && pathname === "/api/waitlist") {
    await handleWaitlist(request, response);
    return;
  }

  // PNR Check Mock/Real API
  if (request.method === "GET" && pathname.startsWith("/api/pnr/")) {
    const pnr = pathname.split("/").pop();
    const realData = await queryRailkitAPI(`https://railkit-api.rajivdubey.dev/api/checkPNRStatus/${pnr}`);
    if (realData) {
      sendJson(response, 200, realData);
      return;
    }

    const data = {
      pnr: pnr,
      train: { number: "12301", name: "Rajdhani Express" },
      journey: { 
        dateOfJourney: new Date().toLocaleDateString('en-IN'), 
        source: { name: "New Delhi", code: "NDLS" }, 
        destination: { name: "Howrah Junction", code: "HWH" }, 
        class: "AC 3 Tier (3A)" 
      },
      chart: { status: "Chart Prepared" },
      booking: { fare: 1640 },
      passengers: [
        {
          serialNumber: "Passenger 1",
          booking: { details: "CNF / B2 / 45 / UB", coach: "B2", berthNo: "45", berthCode: "UB" },
          current: { details: "CNF / B2 / 45 / UB", coach: "B2", berthNo: "45", berthCode: "UB" }
        }
      ]
    };
    sendJson(response, 200, { success: true, data });
    return;
  }

  // Train Live Tracking Mock/Real API
  if (request.method === "GET" && pathname.startsWith("/api/track-train/")) {
    const parts = pathname.split("/");
    const trainNo = parts[3] || "12301";
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    const dateStr = parts[4] || todayStr;
    const realData = await queryRailkitAPI(`https://railkit-api.rajivdubey.dev/api/trackTrain/${trainNo}/${dateStr}`);
    if (realData) {
      if (realData.data) {
        realData.data.trainNo = trainNo;
        let trainName = "Express Train";
        try {
          const info = await queryRailkitAPI(`https://railkit-api.rajivdubey.dev/api/getTrainInfo/${trainNo}`);
          if (info && info.data && info.data.trainInfo) {
            trainName = info.data.trainInfo.train_name || "Express Train";
          }
        } catch (e) {
          console.warn("Failed to fetch train name for trackTrain injection:", e.message);
        }
        realData.data.trainName = trainName;
      }
      sendJson(response, 200, realData);
      return;
    }

    const data = {
      trainNo,
      trainName: "Rajdhani Express",
      lastUpdate: "Just now",
      statusNote: "Departed from Kanpur Central (CNB)",
      currentStationCode: "CNB",
      timeline: [
        { stationName: "New Delhi", stationCode: "NDLS", type: "stoppage", status: "passed", arrival: { actual: "16:55", scheduled: "16:55" }, departure: { actual: "16:55", scheduled: "16:55" }, platform: "12" },
        { stationName: "Kanpur Central", stationCode: "CNB", type: "stoppage", status: "current", arrival: { actual: "21:30", scheduled: "21:30" }, departure: { actual: "21:35", scheduled: "21:35" }, platform: "4" },
        { stationName: "Prayagraj Junction", stationCode: "PRYJ", type: "stoppage", status: "upcoming", arrival: { actual: "23:55", scheduled: "23:55" }, departure: { actual: "23:57", scheduled: "23:57" }, platform: "6" },
        { stationName: "Patna Junction", stationCode: "PNBE", type: "stoppage", status: "upcoming", arrival: { actual: "03:40", scheduled: "03:40" }, departure: { actual: "03:50", scheduled: "03:50" }, platform: "1" },
        { stationName: "Howrah Junction", stationCode: "HWH", type: "stoppage", status: "upcoming", arrival: { actual: "09:55", scheduled: "09:55" }, departure: { actual: "09:55", scheduled: "09:55" }, platform: "9" }
      ]
    };
    sendJson(response, 200, { success: true, data });
    return;
  }

  // Train Schedule Info Mock/Real API
  if (request.method === "GET" && pathname.startsWith("/api/train-info/")) {
    const trainNo = pathname.split("/").pop() || "12301";
    const realData = await queryRailkitAPI(`https://railkit-api.rajivdubey.dev/api/getTrainInfo/${trainNo}`);
    if (realData) {
      sendJson(response, 200, realData);
      return;
    }

    const data = {
      trainInfo: {
        train_no: trainNo,
        train_name: "Rajdhani Express",
        from_stn_name: "New Delhi",
        to_stn_name: "Howrah Junction"
      },
      route: [
        { stnName: "New Delhi", stnCode: "NDLS", stationName: "New Delhi", stationCode: "NDLS", arrivalTime: "16:55", departureTime: "16:55" },
        { stnName: "Kanpur Central", stnCode: "CNB", stationName: "Kanpur Central", stationCode: "CNB", arrivalTime: "21:30", departureTime: "21:35" },
        { stnName: "Prayagraj Junction", stnCode: "PRYJ", stationName: "Prayagraj Junction", stationCode: "PRYJ", arrivalTime: "23:55", departureTime: "23:57" },
        { stnName: "Patna Junction", stnCode: "PNBE", stationName: "Patna Junction", stationCode: "PNBE", arrivalTime: "03:40", departureTime: "03:50" },
        { stnName: "Howrah Junction", stnCode: "HWH", stationName: "Howrah Junction", stationCode: "HWH", arrivalTime: "09:55", departureTime: "09:55" }
      ]
    };
    sendJson(response, 200, { success: true, data });
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, host, () => {
  console.log(`RailQuick waitlist running at http://${host}:${port}`);
});
