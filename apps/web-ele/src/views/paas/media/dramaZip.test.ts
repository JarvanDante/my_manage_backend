import { describe, expect, it } from "vitest";

import {
  buildImportPlan,
  checkZipLimits,
  groupDramaZip,
  parseEpisodeSeq,
  sanitizeZipEntryName,
  shouldIgnoreZipName,
  type DramaImportLimits,
} from "./dramaZip";

describe("parseEpisodeSeq", () => {
  it("parses common scrape names", () => {
    expect(parseEpisodeSeq("少女露出爱好者_第01集.mp4")).toEqual({ seq: 1, ok: true });
    expect(parseEpisodeSeq("母女日常_第10集.mp4")).toEqual({ seq: 10, ok: true });
    expect(parseEpisodeSeq("第1集.mp4")).toEqual({ seq: 1, ok: true });
    expect(parseEpisodeSeq("01.mp4")).toEqual({ seq: 1, ok: true });
    expect(parseEpisodeSeq("EP02.mp4")).toEqual({ seq: 2, ok: true });
  });

  it("does not use 全N集 in a title-like name as the episode", () => {
    const r = parseEpisodeSeq("患性瘾的巨乳女教师（全5集）.mp4");
    expect(r.ok && r.seq === 5).toBe(false);
  });
});

describe("groupDramaZip", () => {
  it("sorts episodes numerically and keeps one cover", () => {
    const groups = groupDramaZip(
      [
        { name: "母女日常/母女日常_第10集.mp4", compressedSize: 1, uncompressedSize: 10 },
        { name: "母女日常/母女日常_第02集.mp4", compressedSize: 1, uncompressedSize: 10 },
        { name: "母女日常/母女日常_第01集.mp4", compressedSize: 1, uncompressedSize: 10 },
        { name: "母女日常/abc.jpeg", compressedSize: 1, uncompressedSize: 20 },
      ],
      "pack.zip",
    );
    expect(groups).toHaveLength(1);
    const g0 = groups[0];
    expect(g0?.title).toBe("母女日常");
    expect(g0?.videos.map((v) => v.seq)).toEqual([1, 2, 10]);
    expect(g0?.coverPath).toBe("母女日常/abc.jpeg");
  });

  it("keeps parentheses in titles and treats tv as pack folder", () => {
    const groups = groupDramaZip(
      [
        { name: "tv/丈夫的复仇（全1集）/丈夫的复仇（全1集）_第01集.mp4", compressedSize: 1, uncompressedSize: 100 },
        { name: "tv/丈夫的复仇（全1集）/e65e.jpeg", compressedSize: 1, uncompressedSize: 20 },
        { name: "tv/【陆雪琪堕落】/【陆雪琪堕落】_第01集.mp4", compressedSize: 1, uncompressedSize: 100 },
        { name: "tv/.DS_Store", compressedSize: 1, uncompressedSize: 8 },
        { name: "tv/__MACOSX/foo.txt", compressedSize: 1, uncompressedSize: 8 },
      ],
      "tv.zip",
    );
    expect(groups.map((g) => g.title).sort()).toEqual(["【陆雪琪堕落】", "丈夫的复仇（全1集）"]);
  });

  it("requires confirm for duplicate seq and multiple covers", () => {
    const [g] = groupDramaZip(
      [
        { name: "剧A/第01集.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "剧A/another_第01集.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "剧A/a.jpg", compressedSize: 1, uncompressedSize: 1 },
        { name: "剧A/b.jpg", compressedSize: 1, uncompressedSize: 1 },
      ],
      "x.zip",
    );
    expect(g?.needsConfirm).toBe(true);
    expect(g?.coverPath).toBe("");
  });
});

describe("safety", () => {
  it("ignores mac hidden files", () => {
    expect(shouldIgnoreZipName("__MACOSX/foo")).toBe(true);
    expect(shouldIgnoreZipName("剧/.DS_Store")).toBe(true);
  });

  it("rejects zip slip", () => {
    expect(() => sanitizeZipEntryName("foo/../../etc/passwd")).toThrow();
    expect(() => sanitizeZipEntryName("/tmp/x.mp4")).toThrow();
  });

  it("checks configured size limits", () => {
    const lim: DramaImportLimits = {
      max_zip_bytes: 100,
      max_extract_bytes: 100,
      max_files: 10,
      max_file_bytes: 50,
      max_ratio: 100,
      min_free_bytes: 1,
    };
    expect(checkZipLimits(101, [], lim)).toContain("超过上限");
    expect(checkZipLimits(10, [{ name: "a.mp4", compressedSize: 1, uncompressedSize: 51 }], lim)).toContain("单文件");
  });
});

describe("lossless path identity", () => {
  it("does not trim leading or trailing spaces in sanitize or plan paths", () => {
    const keep = [
      "剧名/01.mp4",
      " 剧名/01.mp4",
      "剧名 /01.mp4",
      "剧名/01.mp4 ",
      "\u00a0剧名/01.mp4",
      "\u3000剧名/01.mp4",
      "pack/ 剧名/01.mp4",
      "剧名/ 01.mp4",
    ];
    for (const name of keep) {
      expect(sanitizeZipEntryName(name)).toBe(name.replaceAll("\\", "/"));
    }
    expect(sanitizeZipEntryName("剧A\\01.mp4")).toBe("剧A/01.mp4");
    expect(() => sanitizeZipEntryName("a/./b/01.mp4")).toThrow();
    expect(() => sanitizeZipEntryName("a//b/01.mp4")).toThrow();
    expect(() => sanitizeZipEntryName("foo/../bar/01.mp4")).toThrow();
    expect(() => sanitizeZipEntryName("./x.mp4")).toThrow();

    const groups = groupDramaZip(
      [
        { name: "剧名/01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: " 剧名/01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "剧名 /01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "\u00a0剧名/01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "\u3000剧名/01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: " 剧名/cover.jpg", compressedSize: 1, uncompressedSize: 1 },
        { name: "剧名/01.mp4 ", compressedSize: 1, uncompressedSize: 1 },
        { name: "剧名/ 02.mp4", compressedSize: 1, uncompressedSize: 1 },
      ],
      "pack.zip",
    );
    expect(groups).toHaveLength(5);
    const titles = groups.map((g) => g.title);
    expect(titles.every((t) => t === "剧名")).toBe(true);
    const paths = groups.flatMap((g) => g.videos.map((v) => v.path));
    expect(paths).toEqual(expect.arrayContaining([
      "剧名/01.mp4",
      " 剧名/01.mp4",
      "剧名 /01.mp4",
      "\u00a0剧名/01.mp4",
      "\u3000剧名/01.mp4",
      "剧名/01.mp4 ",
      "剧名/ 02.mp4",
    ]));
    const base = groups.find((g) => g.videos.some((v) => v.path === "剧名/01.mp4"));
    expect(base?.videos.map((v) => v.path)).toEqual(expect.arrayContaining(["剧名/01.mp4", "剧名/01.mp4 ", "剧名/ 02.mp4"]));

    const plan = buildImportPlan(groups);
    const planPaths = plan.items.flatMap((it) => [it.cover, ...it.episodes.map((e) => e.path)]).filter(Boolean);
    expect(planPaths).toEqual(expect.arrayContaining([
      " 剧名/01.mp4",
      " 剧名/cover.jpg",
      "剧名 /01.mp4",
      "剧名/01.mp4 ",
    ]));
    expect(planPaths.some((p) => p === "剧名/01.mp4" ? false : p.trim() === "剧名/01.mp4" && p !== "剧名/01.mp4")).toBe(true);
  });

  it("keeps root files and same-name dirs distinct where grouping requires", () => {
    const mixed = groupDramaZip(
      [
        { name: "01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: " 01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "pack/剧名/01.mp4", compressedSize: 1, uncompressedSize: 1 },
        { name: "other/剧名/01.mp4", compressedSize: 1, uncompressedSize: 1 },
      ],
      "pack.zip",
    );
    const root = mixed.filter((g) => g.videos.some((v) => v.path === "01.mp4"));
    expect(root).toHaveLength(1);
    expect(root[0]?.videos.map((v) => v.path)).toEqual(expect.arrayContaining(["01.mp4", " 01.mp4"]));
    expect(mixed.some((g) => g.videos.some((v) => v.path === "pack/剧名/01.mp4"))).toBe(true);
    expect(mixed.some((g) => g.videos.some((v) => v.path === "other/剧名/01.mp4"))).toBe(true);
  });
});
