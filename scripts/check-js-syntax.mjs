import { readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const jsDirectory = resolve(projectRoot, "public", "js");

function findJavaScriptFiles(directory) {
    const files = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...findJavaScriptFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(fullPath);
        }
    }

    return files;
}

const files = findJavaScriptFiles(jsDirectory);
let failed = 0;

console.log(`Checking ${files.length} JavaScript files...\n`);

for (const file of files) {
    console.log(`Checking: ${file}`);

    const result = spawnSync(
        process.execPath,
        ["--check", file],
        { stdio: "inherit" }
    );

    if (result.status !== 0) {
        failed++;
    }
}

console.log("\n=== SYNTAX CHECK SUMMARY ===");
console.log(`Files checked: ${files.length}`);
console.log(`Failed files: ${failed}`);

if (failed > 0) {
    process.exitCode = 1;
} else {
    console.log("All JavaScript files passed syntax validation.");
}
