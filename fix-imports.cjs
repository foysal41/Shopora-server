const fs = require("fs");
const path = require("path");

const validExtensions = [
  ".js",
  ".json",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
];

function addJsExtension(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // from "./something"
  content = content.replace(
    /(\bfrom\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
    (match, start, importPath, end) => {
      if (validExtensions.some((ext) => importPath.endsWith(ext))) {
        return match;
      }

      return `${start}${importPath}.js${end}`;
    },
  );

  // import("./something")
  content = content.replace(
    /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+)(["']\s*\))/g,
    (match, start, importPath, end) => {
      if (validExtensions.some((ext) => importPath.endsWith(ext))) {
        return match;
      }

      return `${start}${importPath}.js${end}`;
    },
  );

  // import "./something"
  content = content.replace(
    /(\bimport\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
    (match, start, importPath, end) => {
      if (validExtensions.some((ext) => importPath.endsWith(ext))) {
        return match;
      }

      return `${start}${importPath}.js${end}`;
    },
  );

  fs.writeFileSync(filePath, content);
}

function walkDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath);
      continue;
    }

    if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      addJsExtension(fullPath);
      console.log("Updated:", fullPath);
    }
  }
}

const srcDirectory = path.join(process.cwd(), "src");

walkDirectory(srcDirectory);

console.log("");
console.log("======================================");
console.log("Relative imports updated successfully");
console.log("======================================");