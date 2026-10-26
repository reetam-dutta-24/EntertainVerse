import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("fs/promises", () => ({ mkdir: vi.fn(), writeFile: vi.fn(), readFile: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ requireUserApi: vi.fn() }));

const { mkdir, readFile, writeFile } = await import("fs/promises");
const { requireUserApi } = await import("@/lib/api-auth");
const { readUpload, saveUploadedChatFile, saveUploadedImage, UploadValidationError } = await import("@/lib/services/upload.service");
const { POST } = await import("@/app/api/upload/route");
const { GET } = await import("@/app/uploads/[...path]/route");

const MB = 1024 * 1024;
const file = (name: string, type: string, size = 1024) => new File([new Uint8Array(size).fill(1)], name, { type });
/** File whose reported size differs from its content (e.g. a stream that couldn't be read). */
const sized = (name: string, type: string, size: number, content = new Uint8Array(1)) => {
  const f = new File([content], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

const UUID_FILE = /^[0-9a-f-]{36}/;

beforeEach(() => {
  vi.mocked(requireUserApi).mockResolvedValue({ userId: "user-1" });
});

describe("saveUploadedImage", () => {
  it.each([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
  ])("saves a %s under the user's images folder with a random %s name", async (type, ext) => {
    const url = await saveUploadedImage(file("holiday photo.HEIC", type), "user-1");

    expect(url).toMatch(new RegExp(`^/uploads/user-1/images/[0-9a-f-]{36}\\${ext}$`));
    const [savedPath, bytes] = vi.mocked(writeFile).mock.calls[0]!;
    expect(savedPath).toBe(path.join(process.cwd(), "public", "uploads", "user-1", "images", url.split("/").pop()!));
    expect((bytes as Buffer).length).toBe(1024);
    expect(mkdir).toHaveBeenCalledWith(path.join(process.cwd(), "public", "uploads", "user-1", "images"), { recursive: true });
  });

  it.each([
    ["SVG (can carry scripts)", "image/svg+xml", "logo.svg"],
    ["HTML", "text/html", "page.html"],
    ["a PDF", "application/pdf", "doc.pdf"],
    ["no type", "", "mystery"],
  ])("rejects %s", async (_, type, name) => {
    await expect(saveUploadedImage(file(name, type), "user-1")).rejects.toThrow(new UploadValidationError("Only JPG, PNG, WebP, and GIF images are allowed."));
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects images over 10 MB", async () => {
    await expect(saveUploadedImage(sized("big.png", "image/png", 10 * MB + 1), "user-1")).rejects.toThrow("Image must be 10 MB or smaller.");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("never uses the uploaded file name in the path", async () => {
    const url = await saveUploadedImage(file("../../../etc/passwd.png", "image/png"), "user-1");
    expect(url).not.toContain("..");
    expect(url).not.toContain("passwd");
    expect(url.split("/").pop()).toMatch(UUID_FILE);
  });

  it("rejects a file that turns out to be empty", async () => {
    await expect(saveUploadedImage(sized("x.png", "image/png", 50, new Uint8Array(0)), "user-1")).rejects.toThrow("could not be read");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("reports a storage error without leaking the path", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(writeFile).mockRejectedValue(new Error("EACCES: permission denied, open 'C:\\srv\\public\\uploads\\...'"));
    const attempt = saveUploadedImage(file("x.png", "image/png"), "user-1");
    await expect(attempt).rejects.toThrow("Could not save the file. Try again in a moment.");
    await expect(attempt.catch((error: Error) => error.message)).resolves.not.toContain("EACCES");
  });
});

describe("saveUploadedChatFile", () => {
  it("saves images as image attachments", async () => {
    expect(await saveUploadedChatFile(file("cat.gif", "image/gif"), "user-1")).toMatchObject({
      url: expect.stringMatching(/^\/uploads\/user-1\/images\/.+\.gif$/),
      name: "cat.gif",
      kind: "image",
    });
  });

  it.each([
    ["application/pdf", ".pdf"],
    ["text/plain", ".txt"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
    ["audio/mpeg", ".mp3"],
    ["video/mp4", ".mp4"],
  ])("saves %s as a file attachment with a %s extension", async (type, ext) => {
    const result = await saveUploadedChatFile(file(`notes${ext}`, type), "user-1");
    expect(result.kind).toBe("file");
    expect(result.url).toMatch(new RegExp(`^/uploads/user-1/files/[0-9a-f-]{36}\\${ext}$`));
  });

  it("takes the extension from the allowed type, never from the name", async () => {
    const { url } = await saveUploadedChatFile(file("invoice.pdf.exe", "application/pdf"), "user-1");
    expect(url).toMatch(/\.pdf$/);
  });

  it.each([
    ["an executable", "application/x-msdownload", "setup.exe"],
    ["HTML", "text/html", "page.html"],
    ["JavaScript", "text/javascript", "app.js"],
    ["SVG", "image/svg+xml", "logo.svg"],
  ])("rejects %s", async (_, type, name) => {
    await expect(saveUploadedChatFile(file(name, type), "user-1")).rejects.toThrow("Unsupported file type.");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects empty and oversized files", async () => {
    await expect(saveUploadedChatFile(file("empty.txt", "text/plain", 0), "user-1")).rejects.toThrow("The uploaded file is empty.");
    await expect(saveUploadedChatFile(sized("big.pdf", "application/pdf", 10 * MB + 1), "user-1")).rejects.toThrow("File must be 10 MB or smaller.");
    await expect(saveUploadedChatFile(sized("big.png", "image/png", 10 * MB + 1), "user-1")).rejects.toThrow("Image must be 10 MB or smaller.");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("accepts exactly 10 MB", async () => {
    await expect(saveUploadedChatFile(sized("edge.pdf", "application/pdf", 10 * MB), "user-1")).resolves.toMatchObject({ kind: "file" });
  });
});

describe("POST /api/upload", () => {
  const upload = (fields: Record<string, string | File>) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return POST(new Request("http://localhost/api/upload", { method: "POST", body: form }));
  };

  it("requires sign-in", async () => {
    vi.mocked(requireUserApi).mockResolvedValue({ error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) });
    expect((await upload({ file: file("x.png", "image/png") })).status).toBe(401);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("saves into the signed-in user's own folder", async () => {
    const response = await upload({ file: file("x.png", "image/png") });
    expect(response.status).toBe(200);
    expect((await response.json()).url).toMatch(/^\/uploads\/user-1\/images\//);
  });

  it("uses chat rules for chat uploads", async () => {
    const response = await upload({ file: file("notes.pdf", "application/pdf"), purpose: "chat" });
    expect(await response.json()).toMatchObject({ kind: "file", name: "notes.pdf" });
    // The same PDF is refused as a profile/cover image.
    expect((await upload({ file: file("notes.pdf", "application/pdf") })).status).toBe(400);
  });

  it("is 400 with the reason for invalid files, and without a file", async () => {
    const response = await upload({ file: file("page.html", "text/html"), purpose: "chat" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported file type. Use images or common document/media formats." });
    expect((await upload({ purpose: "chat" })).status).toBe(400);
    expect((await upload({ file: "not-a-file" })).status).toBe(400);
  });
});

describe("serving uploads", () => {
  const enoent = () => Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });

  it("reads a stored file with the type from its extension", async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from("png-bytes") as never);
    const found = await readUpload(["user-1", "images", "a1.png"]);
    expect(readFile).toHaveBeenCalledWith(path.join(process.cwd(), "public", "uploads", "user-1", "images", "a1.png"));
    expect(found).toMatchObject({ contentType: "image/png", size: 9 });
  });

  it("uses the standard type where two share an extension", async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from("x") as never);
    expect((await readUpload(["u", "files", "song.mp3"]))?.contentType).toBe("audio/mpeg");
    expect((await readUpload(["u", "files", "all.zip"]))?.contentType).toBe("application/zip");
  });

  it.each([[[]], [["..", "..", ".env"]], [["user-1", "..", "secret.png"]], [[".hidden"]], [["user-1", "a b.png"]], [["user-1", "a\b.png"]]])(
    "never reads outside the uploads folder: %j",
    async (segments) => {
      expect(await readUpload(segments)).toBeNull();
      expect(readFile).not.toHaveBeenCalled();
    },
  );

  it("is null for a missing file, and passes other errors on", async () => {
    vi.mocked(readFile).mockRejectedValue(enoent());
    expect(await readUpload(["user-1", "images", "gone.png"])).toBeNull();
    vi.mocked(readFile).mockRejectedValue(new Error("EIO"));
    await expect(readUpload(["user-1", "images", "x.png"])).rejects.toThrow("EIO");
  });

  const get = (segments: string[]) => GET(new Request("http://localhost/uploads/x"), { params: Promise.resolve({ path: segments }) });

  it("GET serves the file with safe headers", async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from("%PDF-1.7") as never);
    const response = await get(["user-1", "files", "notes.pdf"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-length")).toBe("8");
    expect(await response.text()).toBe("%PDF-1.7");
  });

  it("GET is 404 for missing or unsafe paths", async () => {
    vi.mocked(readFile).mockRejectedValue(enoent());
    expect((await get(["user-1", "images", "gone.png"])).status).toBe(404);
    expect((await get(["..", "package.json"])).status).toBe(404);
  });
});
