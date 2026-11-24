/** 短剧 zip 目录识别与集号解析，供上传前预览；不依赖额外压缩库。 */

export const VIDEO_EXT = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"]);
export const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export interface ZipEntryMeta {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
}

export interface DramaFile {
  path: string;
  name: string;
  size: number;
  seq: number;
  hasSeq: boolean;
}

export interface DramaZipGroup {
  title: string;
  targetId: string;
  videos: DramaFile[];
  covers: DramaFile[];
  coverPath: string;
  warnings: string[];
  needsConfirm: boolean;
  skipped: string[];
}

export interface DramaImportLimits {
  max_zip_bytes: number;
  max_body_bytes?: number;
  max_chunk_bytes?: number;
  max_parts?: number;
  max_extract_bytes: number;
  max_files: number;
  max_file_bytes: number;
  max_ratio: number;
  min_free_bytes: number;
  import_timeout_sec?: number;
  job_timeout_sec?: number;
  max_running_jobs?: number;
}

/** 与后端默认一致：整包/单集恢复大文件能力；单次 HTTP 仍约 100MB，分片默认 32MiB。 */
export const defaultDramaImportLimits: DramaImportLimits = {
  max_zip_bytes: 8 * 1024 * 1024 * 1024,
  max_body_bytes: 100_000_000,
  max_chunk_bytes: 32 * 1024 * 1024,
  max_extract_bytes: 16 * 1024 * 1024 * 1024,
  max_files: 2000,
  max_file_bytes: 2 * 1024 * 1024 * 1024,
  max_ratio: 100,
  min_free_bytes: 1024 * 1024 * 1024,
  import_timeout_sec: 600,
  job_timeout_sec: 7200,
  max_running_jobs: 1,
};

const reHua = /第\s*0*(\d+)\s*[集话章回話]/;
const reEp = /(?:^|[_\-.\s])(?:ep|e|episode|sp)?\s*0*(\d+)(?:\s*[集话章回]|\s*$|\.)/i;

export function shouldIgnoreZipName(name: string) {
  const n = name.replaceAll("\\", "/");
  // 只统一分隔符，不 trim：前导/尾部空白是路径身份的一部分。
  if (!n || n.endsWith("/")) return true;
  const base = n.split("/").pop() || "";
  if (base === ".DS_Store" || base === "Thumbs.db" || base === "desktop.ini") return true;
  if (base.startsWith("._") || base.startsWith("~$")) return true;
  const low = base.toLowerCase();
  if (low.endsWith(".tmp") || low.endsWith(".temp")) return true;
  return n.split("/").some((part) => part === "__MACOSX" || (!!part && part.startsWith(".")));
}

export function sanitizeZipEntryName(name: string) {
  if (name.includes("\0")) throw new Error("非法路径");
  const n = name.replaceAll("\\", "/");
  if (!n) throw new Error("空路径");
  if (n.startsWith("/") || /^[a-zA-Z]:/.test(n)) throw new Error(`拒绝绝对路径: ${name}`);
  const cleaned = posixCleanPath(n);
  if (cleaned === ".." || cleaned.startsWith("../")) throw new Error(`拒绝越出目录的路径: ${name}`);
  if (cleaned === "" || cleaned === "/") throw new Error("空路径");
  // 点路径或多余分隔符折叠会改变身份，合桶前明确拒绝。
  if (cleaned !== n) {
    throw new Error(`路径含有会混淆的点路径或多余分隔符，拒绝规范化合并`);
  }
  return n;
}

/** 与 Go path.Clean 对齐的词法清理，仅用于安全校验与歧义检测，不作为最终身份（折叠则拒绝）。 */
function posixCleanPath(n: string): string {
  const abs = n.startsWith("/");
  const out: string[] = [];
  for (const p of n.split("/")) {
    if (p === "" || p === ".") continue;
    if (p === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else if (!abs) out.push("..");
      continue;
    }
    out.push(p);
  }
  let s = out.join("/");
  if (abs) s = `/${s}`;
  if (s === "") s = abs ? "/" : ".";
  return s;
}

export function parseEpisodeSeq(filename: string): { seq: number; ok: boolean } {
  const base = filename.replaceAll("\\", "/").split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  const stem = dot >= 0 ? base.slice(0, dot) : base;
  const hua = stem.match(reHua);
  if (hua) return { seq: Number(hua[1]), ok: Number(hua[1]) > 0 };
  if (/^\d+$/.test(stem)) {
    const n = Number(stem);
    return n > 0 ? { seq: n, ok: true } : { seq: 0, ok: false };
  }
  let last: RegExpExecArray | null = null;
  const re = new RegExp(reEp.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(stem))) last = m;
  if (last) {
    const n = Number(last[1]);
    return n > 0 ? { seq: n, ok: true } : { seq: 0, ok: false };
  }
  return { seq: 0, ok: false };
}

export function checkZipLimits(zipSize: number, files: ZipEntryMeta[], lim: DramaImportLimits) {
  const zipCap = lim.max_zip_bytes;
  // 整包上限是 max_zip_bytes（8GiB）；max_body_bytes 只约束单次 HTTP，不能拿来卡住分片上传的整包预览。
  if (zipSize > Number.MAX_SAFE_INTEGER) {
    return "压缩包大小超出可安全处理的整数范围";
  }
  if (zipSize > zipCap) {
    return `压缩包大小 ${humanBytes(zipSize)} 超过上限 ${humanBytes(zipCap)}`;
  }
  let extract = 0;
  let count = 0;
  for (const f of files) {
    if (shouldIgnoreZipName(f.name)) continue;
    if (f.uncompressedSize > lim.max_file_bytes) {
      return `文件 ${f.name} 未压缩大小 ${humanBytes(f.uncompressedSize)} 超过单文件上限 ${humanBytes(lim.max_file_bytes)}`;
    }
    if (f.uncompressedSize > Number.MAX_SAFE_INTEGER - extract) {
      return "解压总大小超出可安全处理的整数范围";
    }
    extract += f.uncompressedSize;
    count += 1;
    if (count > lim.max_files) return `压缩包文件数超过上限 ${lim.max_files}`;
  }
  if (extract > lim.max_extract_bytes) {
    return `解压总大小 ${humanBytes(extract)} 超过上限 ${humanBytes(lim.max_extract_bytes)}`;
  }
  if (zipSize > 0 && extract > 0 && extract / zipSize > lim.max_ratio) {
    return `压缩比 ${(extract / zipSize).toFixed(1)} 超过上限 ${lim.max_ratio}，已拒绝`;
  }
  return "";
}

export function humanBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

export function groupDramaZip(files: ZipEntryMeta[], zipBase: string): DramaZipGroup[] {
  const media: { path: string; size: number; ext: string }[] = [];
  const skippedOther: Record<string, string[]> = {};
  for (const f of files) {
    if (shouldIgnoreZipName(f.name)) continue;
    const clean = sanitizeZipEntryName(f.name);
    const ext = extOf(clean);
    if (!VIDEO_EXT.has(ext) && !IMAGE_EXT.has(ext)) {
      const dir = dirOf(clean);
      (skippedOther[dir] ||= []).push(baseOf(clean));
      continue;
    }
    media.push({ path: clean, size: f.uncompressedSize, ext });
  }
  if (!media.length) throw new Error("压缩包里没有可识别的视频或封面");

  const parent = commonPackParent(media.map((m) => m.path));
  const buckets = new Map<string, typeof media>();
  const order: string[] = [];
  for (const it of media) {
    const key = dramaGroupKey(it.path, parent);
    if (!buckets.has(key)) {
      order.push(key);
      buckets.set(key, []);
    }
    buckets.get(key)!.push(it);
  }

  return order.map((key) => {
    const g: DramaZipGroup = {
      title: groupTitle(key, zipBase),
      targetId: "",
      videos: [],
      covers: [],
      coverPath: "",
      warnings: [],
      needsConfirm: false,
      skipped: (skippedOther[key] || []).map((n) => `${n}（不支持的文件）`),
    };
    for (const it of buckets.get(key) || []) {
      const df: DramaFile = { path: it.path, name: baseOf(it.path), size: it.size, seq: 0, hasSeq: false };
      if (VIDEO_EXT.has(it.ext)) {
        const parsed = parseEpisodeSeq(it.path);
        df.seq = parsed.seq;
        df.hasSeq = parsed.ok;
        g.videos.push(df);
      } else {
        g.covers.push(df);
      }
    }
    finalizeGroup(g);
    return g;
  });
}

function extOf(p: string) {
  const i = p.lastIndexOf(".");
  // 仅扩展名分类去空白；完整 path 身份保留文件名首尾空白。
  return i >= 0 ? p.slice(i).toLowerCase().trim() : "";
}
function baseOf(p: string) {
  return p.split("/").pop() || p;
}
function dirOf(p: string) {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : ".";
}

function commonPackParent(paths: string[]) {
  if (!paths.length) return "";
  const first = paths[0]?.split("/") ?? [];
  if (first.length < 3) return "";
  const root = first[0];
  if (!root) return "";
  for (const p of paths) {
    const parts = p.split("/");
    if (parts.length < 3 || parts[0] !== root) return "";
    if (dirOf(p) === root) return "";
  }
  return root;
}

function dramaGroupKey(rel: string, parent: string): string {
  const parts = rel.split("/");
  const head = parts[0] ?? "";
  const second = parts[1];
  if (parent && second && head === parent) return `${parent}/${second}`;
  if (parts.length <= 1) return ".";
  return head;
}

function groupTitle(key: string, zipBase: string) {
  if (key === ".") {
    const t = zipBase.replace(/\.zip$/i, "");
    return displayDramaTitle(t || "未命名短剧");
  }
  const i = key.indexOf("/");
  return displayDramaTitle(i >= 0 ? key.slice(i + 1) : key);
}

/** 仅展示标题可去掉首尾空白；计划中的 path/cover 不得使用。 */
function displayDramaTitle(s: string) {
  const t = s.trim();
  return t || s;
}

function finalizeGroup(g: DramaZipGroup) {
  g.videos.sort((a, b) => {
    if (a.hasSeq && b.hasSeq && a.seq !== b.seq) return a.seq - b.seq;
    if (a.hasSeq !== b.hasSeq) return a.hasSeq ? -1 : 1;
    return naturalLess(a.name, b.name) ? -1 : 1;
  });
  const seen = new Map<number, number>();
  let missing = 0;
  for (const v of g.videos) {
    if (!v.hasSeq) missing += 1;
    else seen.set(v.seq, (seen.get(v.seq) || 0) + 1);
  }
  if (!g.videos.length) {
    g.warnings.push("没有视频文件");
    g.needsConfirm = true;
  }
  if (missing) {
    g.warnings.push(`${missing} 个文件无法识别集号，请确认序号`);
    g.needsConfirm = true;
  }
  for (const [seq, n] of seen) {
    if (n > 1) {
      g.warnings.push(`集号 ${seq} 重复 ${n} 次，请确认`);
      g.needsConfirm = true;
    }
  }
  if (g.covers.length === 1) g.coverPath = g.covers[0]?.path ?? "";
  else if (g.covers.length === 0) g.warnings.push("没有封面图");
  else {
    const named = g.covers.filter((c) => ["cover", "folder", "thumb", "poster"].includes(stem(c.name)));
    if (named.length === 1) {
      g.coverPath = named[0]?.path ?? "";
      g.warnings.push("存在多张图片，已按文件名选择封面，请确认");
    } else {
      g.warnings.push("存在多张图片，请指定一张封面");
    }
    g.needsConfirm = true;
  }
  g.warnings.push(...g.skipped);
}

function stem(name: string) {
  const i = name.lastIndexOf(".");
  return (i >= 0 ? name.slice(0, i) : name).toLowerCase();
}

export function naturalLess(a: string, b: string) {
  let ia = 0;
  let ib = 0;
  while (ia < a.length && ib < b.length) {
    const ca = a[ia];
    const cb = b[ib];
    if (ca === undefined || cb === undefined) break;
    const da = isDigit(ca);
    const db = isDigit(cb);
    if (da && db) {
      let na = 0;
      let nb = 0;
      while (ia < a.length) {
        const ch = a[ia];
        if (ch === undefined || !isDigit(ch)) break;
        na = na * 10 + Number(ch);
        ia += 1;
      }
      while (ib < b.length) {
        const ch = b[ib];
        if (ch === undefined || !isDigit(ch)) break;
        nb = nb * 10 + Number(ch);
        ib += 1;
      }
      if (na !== nb) return na < nb;
      continue;
    }
    if (ca !== cb) return ca < cb;
    ia += 1;
    ib += 1;
  }
  return a.length < b.length;
}

function isDigit(ch: string) {
  return ch >= "0" && ch <= "9";
}

const EOCD_SIG = 0x06054b50;
const ZIP64_EOCD_SIG = 0x06064b50;
const ZIP64_LOCATOR_SIG = 0x07064b50;
const CD_SIG = 0x02014b50;
const ZIP64_EXTRA_ID = 0x0001;
const U16_MAX = 0xffff;
const U32_MAX = 0xffffffff;
const EOCD_SIZE = 22;
const ZIP64_LOCATOR_SIZE = 20;
const ZIP64_EOCD_MIN = 56;
const MAX_EOCD_COMMENT = 65535;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_STRONG_ENCRYPTION = 0x0040;
const FLAG_ENCRYPTED_CD = 0x2000;
const METHOD_AES = 99;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function safeNumber(n: bigint, label: string): number {
  if (n < 0n) throw new Error(`${label} 无效`);
  if (n > MAX_SAFE) throw new Error(`${label} 超出可安全处理的整数范围`);
  return Number(n);
}

async function readSlice(file: Blob, offset: bigint, length: number, label: string): Promise<ArrayBuffer> {
  if (length < 0) throw new Error(`${label} 无效`);
  const start = safeNumber(offset, label);
  const endBit = offset + BigInt(length);
  if (endBit > BigInt(file.size)) throw new Error(`${label} 超出文件范围`);
  const end = safeNumber(endBit, label);
  const buf = await file.slice(start, end).arrayBuffer();
  if (buf.byteLength !== length) throw new Error(`${label} 被截断`);
  return buf;
}

function findEocd(view: DataView, tailStart: bigint, fileSize: bigint): number {
  for (let i = view.byteLength - EOCD_SIZE; i >= 0; i -= 1) {
    if (view.getUint32(i, true) !== EOCD_SIG) continue;
    const commentLen = view.getUint16(i + 20, true);
    if (tailStart + BigInt(i) + BigInt(EOCD_SIZE) + BigInt(commentLen) === fileSize) {
      return i;
    }
  }
  return -1;
}

interface Zip64Eocd {
  thisDisk: number;
  cdDisk: number;
  entriesThisDisk: bigint;
  entriesTotal: bigint;
  cdSize: bigint;
  cdOffset: bigint;
}

async function readZip64Eocd(
  file: Blob,
  tail: DataView,
  tailStart: bigint,
  eocdAbs: bigint,
  fileSize: bigint,
): Promise<Zip64Eocd> {
  if (eocdAbs < BigInt(ZIP64_LOCATOR_SIZE)) {
    throw new Error("ZIP64 目录定位信息被截断");
  }
  const locAbs = eocdAbs - BigInt(ZIP64_LOCATOR_SIZE);
  let locView: DataView;
  const locRel = Number(locAbs - tailStart);
  if (locAbs >= tailStart && locRel >= 0 && locRel + ZIP64_LOCATOR_SIZE <= tail.byteLength) {
    locView = new DataView(tail.buffer, tail.byteOffset + locRel, ZIP64_LOCATOR_SIZE);
  } else {
    locView = new DataView(await readSlice(file, locAbs, ZIP64_LOCATOR_SIZE, "ZIP64 目录定位信息"));
  }
  if (locView.getUint32(0, true) !== ZIP64_LOCATOR_SIG) {
    throw new Error("这是 ZIP64 压缩包，但缺少 ZIP64 目录定位信息");
  }
  const locDisk = locView.getUint32(4, true);
  const z64Offset = locView.getBigUint64(8, true);
  const totalDisks = locView.getUint32(16, true);
  if (locDisk !== 0 || totalDisks !== 1) {
    throw new Error("不支持分卷或多磁盘 zip");
  }
  if (z64Offset > MAX_SAFE) {
    throw new Error("ZIP64 目录偏移超出可安全处理的整数范围");
  }
  if (z64Offset + BigInt(ZIP64_EOCD_MIN) > locAbs) {
    throw new Error("ZIP64 目录记录位置无效");
  }
  const head = new DataView(await readSlice(file, z64Offset, 12, "ZIP64 目录记录"));
  if (head.getUint32(0, true) !== ZIP64_EOCD_SIG) {
    throw new Error("ZIP64 目录记录无效");
  }
  const recSize = head.getBigUint64(4, true);
  if (recSize < 44n) {
    throw new Error("ZIP64 目录记录被截断");
  }
  // 只读标准 44 字节字段，不把可扩展区整段载入内存。
  const body = new DataView(await readSlice(file, z64Offset + 12n, 44, "ZIP64 目录记录"));
  const thisDisk = body.getUint32(4, true);
  const cdDisk = body.getUint32(8, true);
  const entriesThisDisk = body.getBigUint64(12, true);
  const entriesTotal = body.getBigUint64(20, true);
  const cdSize = body.getBigUint64(28, true);
  const cdOffset = body.getBigUint64(36, true);
  if (thisDisk !== 0 || cdDisk !== 0) {
    throw new Error("不支持分卷或多磁盘 zip");
  }
  if (z64Offset + 12n + recSize > fileSize) {
    throw new Error("ZIP64 目录记录超出文件范围");
  }
  return { thisDisk, cdDisk, entriesThisDisk, entriesTotal, cdSize, cdOffset };
}

function readZip64Extra(
  extra: Uint8Array,
  needUncomp: boolean,
  needComp: boolean,
  needOffset: boolean,
  needDisk: boolean,
): { uncomp?: bigint; comp?: bigint; offset?: bigint; disk?: number } {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let p = 0;
  while (p + 4 <= extra.byteLength) {
    const id = view.getUint16(p, true);
    const sz = view.getUint16(p + 2, true);
    p += 4;
    if (p + sz > extra.byteLength) throw new Error("ZIP64 扩展字段被截断");
    if (id !== ZIP64_EXTRA_ID) {
      p += sz;
      continue;
    }
    const ev = new DataView(extra.buffer, extra.byteOffset + p, sz);
    let o = 0;
    const take8 = (label: string) => {
      if (o + 8 > sz) throw new Error(`ZIP64 扩展字段缺少${label}`);
      const v = ev.getBigUint64(o, true);
      o += 8;
      return v;
    };
    const out: { uncomp?: bigint; comp?: bigint; offset?: bigint; disk?: number } = {};
    // APPNOTE：按 sentinel 顺序出现 uncompressed / compressed / local offset / disk start。
    if (needUncomp) out.uncomp = take8("未压缩大小");
    if (needComp) out.comp = take8("压缩大小");
    if (needOffset) out.offset = take8("本地头偏移");
    if (needDisk) {
      if (o + 4 > sz) throw new Error("ZIP64 扩展字段缺少起始磁盘号");
      out.disk = ev.getUint32(o, true);
      o += 4;
    }
    return out;
  }
  if (needUncomp || needComp || needOffset || needDisk) {
    throw new Error("中央目录项缺少必需的 ZIP64 扩展字段");
  }
  return {};
}

/** 本地文件头固定部分长度，用于校验偏移至少能放下合法本地头。 */
const LOCAL_HEADER_MIN = 30;

/**
 * 单条中央目录记录的预览字节预算，按 2000 条短剧路径的合理大小而不是 APPNOTE 理论最大值
 *（46 + 3*65535 ≈ 196KiB/条，16000 条可到约 3.15GiB）。
 */
export const ZIP_CD_RECORD_BUDGET = 46 + 4096 + 1024 + 256; // 5422
/** 相对 max_files 的条目余量系数，容纳 __MACOSX 等可忽略项。 */
export const ZIP_CD_ENTRY_SLACK_FACTOR = 2;
export const ZIP_CD_ENTRY_SLACK_EXTRA = 256;

export function zipCdEntryCap(maxFiles = defaultDramaImportLimits.max_files): number {
  const n = maxFiles > 0 ? maxFiles : defaultDramaImportLimits.max_files;
  return n * ZIP_CD_ENTRY_SLACK_FACTOR + ZIP_CD_ENTRY_SLACK_EXTRA;
}

export function zipCdByteBudget(maxFiles = defaultDramaImportLimits.max_files): number {
  return zipCdEntryCap(maxFiles) * ZIP_CD_RECORD_BUDGET;
}

function assertLocalHeaderOffset(localOffset: bigint, cdOffset: bigint, fileSize: bigint, name: string) {
  if (localOffset > MAX_SAFE) {
    throw new Error(`文件 ${name} 的本地头偏移超出可安全处理的整数范围`);
  }
  if (localOffset + BigInt(LOCAL_HEADER_MIN) > fileSize) {
    throw new Error(`文件 ${name} 的本地头偏移超出文件范围`);
  }
  // 标准与常见变体（自解压前缀、数据描述符）仍是本地头在中央目录之前；
  // 只要求 30 字节固定头完整落在 CD 之前，不读取本地头内容。
  if (localOffset + BigInt(LOCAL_HEADER_MIN) > cdOffset) {
    throw new Error(`文件 ${name} 的本地头位于中央目录内或之后，偏移无效`);
  }
}

/**
 * 列出 zip 中央目录项。只切片 EOCD/ZIP64 记录与中央目录，不把整包读进内存。
 * 传统 32 位 zip 与单磁盘 ZIP64（含强制 ZIP64 小包）均可；加密与分卷明确拒绝。
 */
export async function listZipEntries(
  file: Blob,
  lim: DramaImportLimits = defaultDramaImportLimits,
): Promise<ZipEntryMeta[]> {
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new Error("压缩包大小超出可安全处理的整数范围");
  }
  const fileSize = BigInt(file.size);
  if (fileSize < BigInt(EOCD_SIZE)) throw new Error("无法识别 zip 目录，请确认文件完整");

  const tailWant = BigInt(EOCD_SIZE + MAX_EOCD_COMMENT + ZIP64_LOCATOR_SIZE);
  const tailLen = fileSize < tailWant ? fileSize : tailWant;
  const tailStart = fileSize - tailLen;
  const tailBuf = await file.slice(safeNumber(tailStart, "目录尾"), safeNumber(fileSize, "目录尾")).arrayBuffer();
  const tail = new DataView(tailBuf);
  const eocdRel = findEocd(tail, tailStart, fileSize);
  if (eocdRel < 0) throw new Error("无法识别 zip 目录，请确认文件完整");
  const eocdAbs = tailStart + BigInt(eocdRel);

  const thisDisk16 = tail.getUint16(eocdRel + 4, true);
  const cdDisk16 = tail.getUint16(eocdRel + 6, true);
  const entriesThis16 = tail.getUint16(eocdRel + 8, true);
  const entriesTotal16 = tail.getUint16(eocdRel + 10, true);
  const cdSize32 = tail.getUint32(eocdRel + 12, true);
  const cdOffset32 = tail.getUint32(eocdRel + 16, true);

  let thisDisk = thisDisk16;
  let cdDisk = cdDisk16;
  let entriesThisDisk = BigInt(entriesThis16);
  let entriesTotal = BigInt(entriesTotal16);
  let cdSize = BigInt(cdSize32);
  let cdOffset = BigInt(cdOffset32);

  const need64 =
    thisDisk16 === U16_MAX ||
    cdDisk16 === U16_MAX ||
    entriesThis16 === U16_MAX ||
    entriesTotal16 === U16_MAX ||
    cdSize32 === U32_MAX ||
    cdOffset32 === U32_MAX;

  if (need64) {
    const z64 = await readZip64Eocd(file, tail, tailStart, eocdAbs, fileSize);
    if (thisDisk16 === U16_MAX) thisDisk = z64.thisDisk;
    if (cdDisk16 === U16_MAX) cdDisk = z64.cdDisk;
    if (entriesThis16 === U16_MAX) entriesThisDisk = z64.entriesThisDisk;
    if (entriesTotal16 === U16_MAX) entriesTotal = z64.entriesTotal;
    if (cdSize32 === U32_MAX) cdSize = z64.cdSize;
    if (cdOffset32 === U32_MAX) cdOffset = z64.cdOffset;
  }

  if (thisDisk !== 0 || cdDisk !== 0) {
    throw new Error("不支持分卷或多磁盘 zip");
  }
  if (entriesThisDisk !== entriesTotal) {
    throw new Error("不支持分卷或多磁盘 zip");
  }
  if (cdOffset > MAX_SAFE || cdSize > MAX_SAFE || entriesTotal > MAX_SAFE) {
    throw new Error("zip 目录字段超出可安全处理的整数范围");
  }
  if (cdOffset + cdSize > fileSize) {
    throw new Error("中央目录超出文件范围");
  }

  const maxFiles = lim.max_files > 0 ? lim.max_files : defaultDramaImportLimits.max_files;
  const entryCap = zipCdEntryCap(maxFiles);
  const cdBudget = zipCdByteBudget(maxFiles);
  // 条目数与目录字节预算在读取中央目录之前独立检查，不能等 arrayBuffer 后再计数。
  if (entriesTotal > BigInt(entryCap)) {
    throw new Error(`压缩包文件数超过上限 ${maxFiles}`);
  }
  if (cdSize > BigInt(cdBudget)) {
    throw new Error(`中央目录过大，超出预览资源限制（上限 ${cdBudget} 字节）`);
  }
  if (entriesTotal > 0n) {
    const minCd = entriesTotal * 46n;
    const maxCd = entriesTotal * BigInt(46 + 65535 * 3);
    if (cdSize < minCd || cdSize > maxCd) {
      throw new Error("中央目录大小与条目数不一致");
    }
  } else if (cdSize !== 0n) {
    throw new Error("中央目录大小与条目数不一致");
  }

  const cdBuf = await readSlice(file, cdOffset, safeNumber(cdSize, "中央目录大小"), "中央目录");
  const cd = new DataView(cdBuf);
  const out: ZipEntryMeta[] = [];
  let p = 0;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  while (p < cd.byteLength) {
    if (p + 46 > cd.byteLength) throw new Error("中央目录被截断");
    if (cd.getUint32(p, true) !== CD_SIG) {
      throw new Error("中央目录记录无效或被截断");
    }
    const flags = cd.getUint16(p + 8, true);
    const method = cd.getUint16(p + 10, true);
    if ((flags & FLAG_ENCRYPTED) !== 0 || (flags & FLAG_STRONG_ENCRYPTION) !== 0 || (flags & FLAG_ENCRYPTED_CD) !== 0 || method === METHOD_AES) {
      throw new Error("不支持加密的 zip");
    }
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const recLen = 46 + nameLen + extraLen + commentLen;
    if (p + recLen > cd.byteLength) throw new Error("中央目录被截断");
    let compressed = BigInt(cd.getUint32(p + 20, true));
    let uncompressed = BigInt(cd.getUint32(p + 24, true));
    let localOffset = BigInt(cd.getUint32(p + 42, true));
    let diskStart = cd.getUint16(p + 34, true);
    const extra = new Uint8Array(cdBuf, p + 46 + nameLen, extraLen);
    const zextra = readZip64Extra(
      extra,
      uncompressed === BigInt(U32_MAX),
      compressed === BigInt(U32_MAX),
      localOffset === BigInt(U32_MAX),
      diskStart === U16_MAX,
    );
    if (zextra.uncomp !== undefined) uncompressed = zextra.uncomp;
    if (zextra.comp !== undefined) compressed = zextra.comp;
    if (zextra.offset !== undefined) localOffset = zextra.offset;
    if (zextra.disk !== undefined) diskStart = zextra.disk;
    if (diskStart !== 0) throw new Error("不支持分卷或多磁盘 zip");
    const nameBytes = new Uint8Array(cdBuf, p + 46, nameLen);
    const name = decoder.decode(nameBytes);
    assertLocalHeaderOffset(localOffset, cdOffset, fileSize, name);
    out.push({
      name,
      compressedSize: safeNumber(compressed, `文件 ${name} 的压缩大小`),
      uncompressedSize: safeNumber(uncompressed, `文件 ${name} 的未压缩大小`),
    });
    p += recLen;
    if (out.length > entryCap) {
      throw new Error(`压缩包文件数超过上限 ${maxFiles}`);
    }
  }
  if (entriesTotal > 0n && BigInt(out.length) !== entriesTotal) {
    throw new Error("中央目录条目数与目录记录不一致");
  }
  if (!out.length) throw new Error("压缩包目录为空");
  return out;
}

export function buildImportPlan(groups: DramaZipGroup[]) {
  return {
    items: groups.map((g) => ({
      title: g.title,
      cover: g.coverPath,
      target_id: g.targetId || undefined,
      episodes: g.videos.map((v) => ({
        path: v.path,
        seq: v.seq,
        title: v.hasSeq ? `第${v.seq}集` : v.name,
      })),
    })),
  };
}
