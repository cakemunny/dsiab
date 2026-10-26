/**
 * `npm run storybook`: start the Storybook dev server and write the port it serves to `.devport`.
 *
 * Storybook takes the next free port when 6006 is in use, so the port comes from the "Local:" line
 * that Storybook prints, not from the -p argument. A tool that needs the address of a running
 * Storybook, such as an agent harness, reads it from `.devport`. The file is git-ignored, and this
 * script removes it when the server stops.
 *
 * Arguments after `--` pass through to `storybook dev`, for example `npm run storybook -- --no-open`.
 */
import { spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";

const DEVPORT = ".devport";
const LOCAL_URL = /Local:\s+http:\/\/localhost:(\d{2,5})/;
const ANSI = /\u001b\[[0-9;]*m/g;

const args = process.argv.slice(2);
const child = spawn("storybook", ["dev", "-p", "6006", ...args], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(`storybook: could not start "storybook dev" (${error.message}). Run it through npm run storybook.`);
  process.exit(1);
});

let written = false;
child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (written) return;
  const match = chunk.toString().replace(ANSI, "").match(LOCAL_URL);
  if (!match) return;
  writeFileSync(DEVPORT, `${match[1]}\n`);
  written = true;
});

function removeDevport() {
  if (written) rmSync(DEVPORT, { force: true });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  removeDevport();
  process.exit(signal ? 1 : (code ?? 0));
});
