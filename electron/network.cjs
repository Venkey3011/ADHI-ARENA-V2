const { execFile } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

function runNetsh(args, timeout = 15_000) {
  return new Promise((resolve, reject) => {
    execFile(
      "netsh.exe",
      args,
      { windowsHide: true, timeout, maxBuffer: 2 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || stdout || error.message).trim()));
          return;
        }
        resolve(String(stdout || ""));
      },
    );
  });
}

function fieldValue(text, field) {
  const match = text.match(new RegExp(`^\\s*${field}\\s*:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
}

function parseProfiles(text) {
  const profiles = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:All User Profile|Current User Profile)\s*:\s*(.+)\s*$/i);
    if (match) profiles.add(match[1].trim());
  }
  return profiles;
}

function parseNetworks(text, profiles, connectedSsid) {
  const networks = [];
  let current = null;

  for (const line of text.split(/\r?\n/)) {
    const ssidMatch = line.match(/^\s*SSID\s+\d+\s*:\s*(.*)\s*$/i);
    if (ssidMatch) {
      if (current?.ssid) networks.push(current);
      const ssid = ssidMatch[1].trim();
      current = {
        ssid,
        signal: 0,
        authentication: "",
        encryption: "",
      };
      continue;
    }
    if (!current) continue;

    const authentication = line.match(/^\s*Authentication\s*:\s*(.+)\s*$/i);
    if (authentication) current.authentication = authentication[1].trim();
    const encryption = line.match(/^\s*Encryption\s*:\s*(.+)\s*$/i);
    if (encryption) current.encryption = encryption[1].trim();
    const signal = line.match(/^\s*Signal\s*:\s*(\d+)%/i);
    if (signal) current.signal = Math.max(current.signal, Number(signal[1]));
  }
  if (current?.ssid) networks.push(current);

  return networks
    .filter((network) => network.ssid)
    .map((network) => ({
      ...network,
      saved: profiles.has(network.ssid),
      connected: network.ssid === connectedSsid,
      secured: !/^(open|none)$/i.test(network.authentication),
    }))
    .sort((a, b) => Number(b.connected) - Number(a.connected) || b.signal - a.signal);
}

function profileNetwork(ssid, connectedSsid) {
  return {
    ssid,
    signal: ssid === connectedSsid ? 100 : 0,
    authentication: "Saved Windows profile",
    encryption: "",
    saved: true,
    connected: ssid === connectedSsid,
    secured: true,
  };
}

function mergeNetworkLists(visibleNetworks, profiles, connectedSsid) {
  const bySsid = new Map();

  for (const network of visibleNetworks) {
    bySsid.set(network.ssid, {
      ...network,
      saved: network.saved || profiles.has(network.ssid),
      connected: network.ssid === connectedSsid,
    });
  }

  if (connectedSsid && !bySsid.has(connectedSsid)) {
    bySsid.set(connectedSsid, profileNetwork(connectedSsid, connectedSsid));
  }

  return Array.from(bySsid.values())
    .sort((a, b) => Number(b.connected) - Number(a.connected) || b.signal - a.signal || a.ssid.localeCompare(b.ssid));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function validateSsid(ssid) {
  if (typeof ssid !== "string" || !ssid.trim()) throw new Error("Select a Wi-Fi network.");
  if (Buffer.byteLength(ssid, "utf8") > 32) throw new Error("Invalid Wi-Fi network name.");
  return ssid.trim();
}

async function scanNetworks() {
  if (process.platform !== "win32") {
    return {
      supported: false,
      connectedSsid: "",
      networks: [],
      message: "In-app network management is currently available on Windows only.",
    };
  }

  try {
    const profileText = await runNetsh(["wlan", "show", "profiles"]);
    const profiles = parseProfiles(profileText);
    let interfaceText = "";
    let networkText = "";
    let locationPermissionRequired = false;

    try {
      interfaceText = await runNetsh(["wlan", "show", "interfaces"]);
    } catch (error) {
      locationPermissionRequired = /location|error 5|elevation/i.test(error?.message || "");
    }
    try {
      networkText = await runNetsh(["wlan", "show", "networks", "mode=bssid"]);
    } catch (error) {
      locationPermissionRequired ||= /location|error 5|elevation/i.test(error?.message || "");
      if (!locationPermissionRequired) throw error;
    }

    const connected = /State\s*:\s*connected/i.test(interfaceText);
    const connectedSsid = connected ? fieldValue(interfaceText, "SSID") : "";
    const visibleNetworks = networkText ? parseNetworks(networkText, profiles, connectedSsid) : [];
    const networks = mergeNetworkLists(visibleNetworks, profiles, connectedSsid);
    return {
      supported: true,
      connectedSsid,
      networks,
      locationPermissionRequired,
      message: locationPermissionRequired
        ? "Windows Location Services must be enabled to scan nearby Wi-Fi networks."
        : "",
    };
  } catch (error) {
    return {
      supported: true,
      connectedSsid: "",
      networks: [],
      error: error?.message || "Unable to scan Wi-Fi networks.",
    };
  }
}

async function addNetworkProfile(ssid, password, secured) {
  if (secured && (typeof password !== "string" || password.length < 8 || password.length > 63)) {
    throw new Error("Enter the Wi-Fi password (8–63 characters).");
  }

  const safeSsid = escapeXml(ssid);
  const securityXml = secured
    ? `<authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption>
       <sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>${escapeXml(password)}</keyMaterial></sharedKey>`
    : "<authEncryption><authentication>open</authentication><encryption>none</encryption><useOneX>false</useOneX></authEncryption>";
  const profileXml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${safeSsid}</name>
  <SSIDConfig><SSID><name>${safeSsid}</name></SSID></SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM><security>${securityXml}</security></MSM>
</WLANProfile>`;

  const profilePath = path.join(os.tmpdir(), `adhi-arena-wifi-${process.pid}-${Date.now()}.xml`);
  try {
    await fs.writeFile(profilePath, profileXml, { encoding: "utf8", mode: 0o600 });
    await runNetsh(["wlan", "add", "profile", `filename=${profilePath}`, "user=current"]);
  } finally {
    await fs.rm(profilePath, { force: true }).catch(() => undefined);
  }
}

async function connectNetwork({ ssid: rawSsid, password = "", secured = true, saved = false } = {}) {
  if (process.platform !== "win32") throw new Error("Wi-Fi connection is supported on Windows only.");
  const ssid = validateSsid(rawSsid);

  if (!saved) await addNetworkProfile(ssid, password, Boolean(secured));
  await runNetsh(["wlan", "connect", `name=${ssid}`, `ssid=${ssid}`]);
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  const status = await scanNetworks();
  if (!status.locationPermissionRequired && status.connectedSsid !== ssid) {
    throw new Error(`Windows could not connect to “${ssid}”. Check the password or network signal.`);
  }
  if (status.locationPermissionRequired) {
    status.connectedSsid = ssid;
    status.networks = status.networks.map((network) => ({
      ...network,
      connected: network.ssid === ssid,
    }));
  }
  return status;
}

module.exports = { scanNetworks, connectNetwork };
