/**
 * unbuild --stub 会把当前机器的绝对路径写进 dist/index.mjs。
 * 同一份代码在 Docker(/var/www/html/...) 与宿主机(/Users/...) 切换时会炸。
 * 本脚本把 stub 改成基于 import.meta.url 的相对解析，两边都能跑。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === "index.mjs" && dir.endsWith(`${path.sep}dist`)) out.push(p);
  }
  return out;
}

function packageNameFromStub(content) {
  const m = content.match(/"alias":\s*\{\s*"([^"]+)":/);
  return m?.[1] ?? null;
}

function listExports(content) {
  const names = [];
  const re = /export const (\w+) = _module\.(\w+);/g;
  let m;
  while ((m = re.exec(content))) {
    names.push(m[1]);
  }
  return names;
}

function hasDefaultExport(content) {
  return /export default _module/.test(content);
}

function jitiImportPath(content) {
  const m = content.match(
    /from\s+"((?:\.\.\/)+node_modules\/\.pnpm\/jiti@[^"]+\/jiti\.mjs)"/,
  );
  return m?.[1] ?? null;
}

function toPortable(file) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes("createJiti") || !content.includes("jiti.import(")) {
    return false;
  }
  // 已是 portable
  if (content.includes("fileURLToPath") && content.includes("pkgRoot")) {
    return false;
  }

  const pkgName = packageNameFromStub(content);
  const exports = listExports(content);
  const jitiPath = jitiImportPath(content);
  const def = hasDefaultExport(content);
  if (!pkgName || !jitiPath || (!exports.length && !def)) {
    console.warn(`skip (parse failed): ${path.relative(root, file)}`);
    return false;
  }

  const exportLines = [
    ...exports.map((n) => `export const ${n} = _module.${n};`),
    ...(def ? ["export default _module?.default ?? _module;"] : []),
  ].join("\n");

  const next = `import { createJiti } from "${jitiPath}";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const srcEntry = join(pkgRoot, "src/index.ts");

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    "${pkgName}": pkgRoot,
  },
  transformOptions: {
    babel: {
      plugins: [],
    },
  },
});

const _module = await jiti.import(srcEntry);

${exportLines}
`;

  try {
    fs.writeFileSync(file, next);
  } catch (err) {
    console.warn(`skip (write failed): ${path.relative(root, file)}: ${err.message}`);
    return false;
  }
  console.log(`portable: ${path.relative(root, file)}`);
  return true;
}

const files = walk(root);
let n = 0;
for (const f of files) {
  if (toPortable(f)) n++;
}
console.log(`done, updated ${n} stub(s)`);
