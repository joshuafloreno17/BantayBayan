import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const requiredFiles = [
    "public/index.html",
    "public/dashboard.html",
    "public/official-dashboard.html",
    "public/report.html",
    "public/flood.html",
    "public/js/firebase-config.js",
    "public/css/style.css",
    "Dockerfile",
    ".dockerignore"
];

console.log("=== BANTAYBAYAN BUILD VALIDATION ===\n");

let failed = 0;

for (const file of requiredFiles) {
    const filePath = resolve(root, file);

    if (existsSync(filePath)) {
        console.log(`PASS: ${file}`);
    } else {
        console.error(`FAIL: ${file} is missing`);
        failed++;
    }
}

console.log("\n=== BUILD SUMMARY ===");
console.log(`Files checked: ${requiredFiles.length}`);
console.log(`Failed checks: ${failed}`);

assert.equal(failed, 0, "Build validation failed.");

console.log("BantayBayan build validation successful.");
