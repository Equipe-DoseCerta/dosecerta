// set-ios-version.js
const fs = require("fs");
const path = require("path");

const packageJson = require("./package.json");

const versionName = packageJson.version; // Ex: "1.0.4"
const [major, minor, patch] = versionName.split(".").map((n) => parseInt(n || 0));
const versionCode = major * 10000 + minor * 100 + patch; // Ex: 10004

// Caminho do Info.plist
const plistPath = path.join(__dirname, "ios", "DoseCerta", "Info.plist");

// Lê o Info.plist original
let plist = fs.readFileSync(plistPath, "utf8");

// Substitui os valores das chaves
plist = plist
  .replace(/<key>CFBundleShortVersionString<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleShortVersionString</key><string>${versionName}</string>`)
  .replace(/<key>CFBundleVersion<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleVersion</key><string>${versionCode}</string>`);

// Escreve de volta
fs.writeFileSync(plistPath, plist, "utf8");

console.log(`✅ iOS version updated → ${versionName} (${versionCode})`);
