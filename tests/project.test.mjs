import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const publicDir = resolve(projectRoot, "public");

const requiredFiles = [
    "index.html",
    "dashboard.html",
    "login.html",
    "resident-login.html",
    "official-dashboard.html",
    "report.html",
    "flood.html",
    "js/firebase-config.js",
    "js/dashboard.js",
    "js/official-dashboard.js",
    "js/report.js",
    "js/flood.js",
    "css/style.css"
];

test("BantayBayan public directory exists", () => {
    assert.ok(existsSync(publicDir), "public directory is missing");
});

for (const file of requiredFiles) {
    test(`Required project file exists: ${file}`, () => {
        assert.ok(
            existsSync(resolve(publicDir, file)),
            `Missing required file: public/${file}`
        );
    });
}
