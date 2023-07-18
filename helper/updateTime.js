const fs = require("fs");
const path = require("path");
const configJSON = path.join(__dirname, "../src/assets/js/config.ts");

const currentTime = Date.now();
const newConfigJSON = fs.readFileSync(configJSON, "utf-8").replace(/localStorage.setItem\(\"updatedTime\".+?\n/g, `localStorage.setItem("updatedTime", "${currentTime}");\n`);
fs.writeFileSync(configJSON, newConfigJSON);

fs.writeFileSync(
    path.join(__dirname, "./time.txt"), 
    currentTime.toString()
);

