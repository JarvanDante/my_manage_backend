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
  const n = name.replaceAll("\\", "/").trim();
  if (!n || n.endsWith("/")) return true;
  const base = n.split("/").pop() || "";
  if (base === ".DS_Store" || base === "Thumbs.db" || base === "desktop.ini") return true;
  if (base.startsWith("._") || base.startsWith("~$")) return true;
  const low = base.toLowerCase();
  if (low.endsWith(".tmp") || low.endsWith(".temp")) return true;
  return n.split("/").some((part) => part === "__MACOSX" || (part && part.startsWith(".")));
}

export function sanitizeZipEntryName(name: string) {
  const raw = name.trim();
  if (!raw || raw.includes("\0")) throw new Error("非法路径");
  const n = raw.replaceAll("\\", "/");
  if (n.startsWith("/") || /^[a-zA-Z]:/.test(n)) throw new Error(`拒绝绝对路径: ${raw}`);
  const parts = n.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) throw new Error(`拒绝越出目录的路径: ${raw}`);
  return parts.join("/");
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
  const bodyCap = lim.max_body_bytes || 0;
  if (bodyCap > 0 && zipSize > bodyCap) {
    return `压缩包大小 ${humanBytes(zipSize)} 超过请求体上限 ${humanBytes(bodyCap)}`;
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
  return i >= 0 ? p.slice(i).toLowerCase() : "";
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
    return t || "未命名短剧";
  }
  const i = key.indexOf("/");
  return i >= 0 ? key.slice(i + 1) : key;
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

export async function listZipEntries(file: Blob): Promise<ZipEntryMeta[]> {
  const buf = await file.slice(Math.max(0, file.size - 65557)).arrayBuffer();
  const view = new DataView(buf);
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("无法识别 zip 目录，请确认文件完整");
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const cdBuf = await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer();
  const cd = new DataView(cdBuf);
  const out: ZipEntryMeta[] = [];
  let p = 0;
  while (p + 46 <= cd.byteLength) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const compressed = cd.getUint32(p + 20, true);
    const uncompressed = cd.getUint32(p + 24, true);
    const nameBytes = new Uint8Array(cdBuf, p + 46, nameLen);
    const name = new TextDecoder("utf-8", { fatal: false }).decode(nameBytes);
    out.push({ name, compressedSize: compressed, uncompressedSize: uncompressed });
    p += 46 + nameLen + extraLen + commentLen;
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
