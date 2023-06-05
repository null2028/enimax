const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const version = process.argv[2];
const configFile = path.join(__dirname, "../config.xml");
const versionJSON = path.join(__dirname, "../version.json");
const configJSON = path.join(__dirname, "../src/assets/js/config.ts");
const makefile = path.join(__dirname, "../Makefile");
const manifestV2JSON = path.join(__dirname, "../enimax-chrome-extension/manifest-v2.json");
const manifestV3JSON = path.join(__dirname, "../enimax-chrome-extension/manifest-v3.json");

const manifestV2JSON2 = path.join(__dirname, "../enimax-chrome-extension-v2/manifest-v2.json");
const manifestV3JSON2 = path.join(__dirname, "../enimax-chrome-extension-v2/manifest-v3.json");
const chromeVersion2 = path.join(__dirname, "../enimax-chrome-extension-v2/version.json");

const extensionVersion = path.join(__dirname, "../enimax-chrome-extension/version.json");
const extensionFirefoxVersion = path.join(__dirname, "../enimax-firefox-extension/version.json");
const extensionFirefoxManifest = path.join(__dirname, "../enimax-firefox-extension/manifest.json");


const newConfigFile = fs.readFileSync(configFile, "utf-8").replace(/version=".+?"/g, `version="${version}"`);
const newVersionJSON = JSON.parse(fs.readFileSync(versionJSON, "utf-8"));
const newConfigJSON = fs.readFileSync(configJSON, "utf-8").replace(/localStorage.setItem\(\"version\".+?\n/g, `localStorage.setItem("version", "${version}");\n`);

const newManifestV2JSON = JSON.parse(fs.readFileSync(manifestV2JSON, "utf-8"));
const newManifestV3JSON = JSON.parse(fs.readFileSync(manifestV3JSON, "utf-8"));


const newManifestV2JSONV2 = JSON.parse(fs.readFileSync(manifestV2JSON2, "utf-8"));
const newManifestV3JSONV2 = JSON.parse(fs.readFileSync(manifestV3JSON2, "utf-8"));


const newextensionFirefoxManifest = JSON.parse(fs.readFileSync(extensionFirefoxManifest, "utf-8"));
const newExtensionVersion = JSON.parse(fs.readFileSync(extensionVersion, "utf-8"));
const newextensionFirefoxVersion = JSON.parse(fs.readFileSync(extensionFirefoxVersion, "utf-8"));
const newMakeFile = fs.readFileSync(makefile, "utf-8").replace(/localStorage.setItem\(\"version\".+?;/g, `localStorage.setItem("version", "${version}");`);
const newChromeVersion2 = JSON.parse(fs.readFileSync(chromeVersion2, "utf-8"));

newVersionJSON.version = version;
newExtensionVersion.version = version;
newextensionFirefoxVersion.version = version;
newManifestV2JSON.version = version;
newManifestV3JSON.version = version;
newChromeVersion2.version = version;
newManifestV2JSONV2.version = version;
newManifestV3JSONV2.version = version;

newextensionFirefoxManifest.version = version;

fs.writeFileSync(configFile, newConfigFile);
fs.writeFileSync(versionJSON, JSON.stringify(newVersionJSON, null, 2));
fs.writeFileSync(extensionVersion, JSON.stringify(newExtensionVersion, null, 2));
fs.writeFileSync(configJSON, newConfigJSON);
fs.writeFileSync(manifestV2JSON, JSON.stringify(newManifestV2JSON, null, 2));
fs.writeFileSync(manifestV3JSON, JSON.stringify(newManifestV3JSON, null, 2));

fs.writeFileSync(manifestV2JSON2, JSON.stringify(newManifestV2JSONV2, null, 2));
fs.writeFileSync(manifestV3JSON2, JSON.stringify(newManifestV2JSONV2, null, 2));
fs.writeFileSync(chromeVersion2, JSON.stringify(newChromeVersion2, null, 2));

fs.writeFileSync(extensionFirefoxVersion, JSON.stringify(newextensionFirefoxVersion, null, 2));
fs.writeFileSync(extensionFirefoxManifest, JSON.stringify(newextensionFirefoxManifest, null, 2));
fs.writeFileSync(makefile, newMakeFile);