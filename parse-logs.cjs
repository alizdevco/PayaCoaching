const fs = require("fs");

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const outer = JSON.parse(raw);

function findEntries(node) {
  if (Array.isArray(node)) {
    if (node.length && node[0] && typeof node[0] === "object" &&
      "event_message" in node[0]
    ) {
      return node;
    }
    for (const item of node) {
      const found = findEntries(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) {
      const found = findEntries(value);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "string") {
    const start = node.indexOf('{"result":[');
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < node.length; i++) {
      if (node[i] === "{") depth++;
      else if (node[i] === "}") {
        depth--;
        if (depth === 0) {
          try {
            return findEntries(JSON.parse(node.slice(start, i + 1)));
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

const entries = findEntries(outer);
if (!entries) {
  console.log("NO ENTRIES FOUND. Top-level shape:", Object.keys(outer));
  process.exit(1);
}

for (const r of entries) {
  console.log(
    `${r.timestamp} | ${r.status_code} | ${r.execution_time_ms}ms | ${
      String(r.event_message).slice(0, 250)
    }`,
  );
}
