import { beforeEach, describe, expect, it, vi } from "vitest";

/** A pretend S3: one bucket held in a map, behind the SDK's `send(command)`. */
const objects = new Map<string, { bytes: Uint8Array<ArrayBuffer>; type: string }>();
const clientConfigs: unknown[] = [];

vi.mock("@aws-sdk/client-s3", () => {
  class PutObjectCommand {
    constructor(readonly input: { Bucket: string; Key: string; Body: Uint8Array<ArrayBuffer>; ContentType: string }) {}
  }
  class GetObjectCommand {
    constructor(readonly input: { Bucket: string; Key: string }) {}
  }
  class S3Client {
    constructor(config: unknown) {
      clientConfigs.push(config);
    }
    async send(command: PutObjectCommand | GetObjectCommand) {
      const id = `${command.input.Bucket}/${command.input.Key}`;
      if (command instanceof PutObjectCommand) {
        objects.set(id, { bytes: command.input.Body, type: command.input.ContentType });
        return {};
      }
      const stored = objects.get(id);
      if (!stored) throw Object.assign(new Error("The specified key does not exist."), { name: "NoSuchKey" });
      return {
        ContentLength: stored.bytes.length,
        Body: { transformToWebStream: () => new Response(stored.bytes).body },
      };
    }
  }
  return { S3Client, PutObjectCommand, GetObjectCommand };
});

const loadStorage = async () => {
  vi.resetModules();
  return (await import("@/lib/file-storage")).getFileStorage();
};

beforeEach(() => {
  objects.clear();
  clientConfigs.length = 0;
});

describe("file storage on S3", () => {
  it("saves to the bucket under the key, and reads it back", async () => {
    vi.stubEnv("S3_BUCKET", "media");
    const storage = await loadStorage();
    await storage.put("uploads/u1/images/a.png", new TextEncoder().encode("png-bytes"), "image/png");

    expect(objects.get("media/uploads/u1/images/a.png")?.type).toBe("image/png");
    const file = await storage.get("uploads/u1/images/a.png");
    expect(file?.size).toBe(9);
    expect(await new Response(file!.body).text()).toBe("png-bytes");
  });

  it("is null for a missing key", async () => {
    vi.stubEnv("S3_BUCKET", "media");
    expect(await (await loadStorage()).get("uploads/nope.png")).toBeNull();
  });

  it("uses the region, and a custom endpoint only when one is given (local S3 stand-in)", async () => {
    vi.stubEnv("S3_BUCKET", "media");
    vi.stubEnv("S3_REGION", "ap-southeast-2");
    await loadStorage();
    expect(clientConfigs.at(-1)).toEqual({ region: "ap-southeast-2" });

    vi.stubEnv("S3_ENDPOINT", "http://localhost:54090");
    await loadStorage();
    expect(clientConfigs.at(-1)).toEqual({ region: "ap-southeast-2", endpoint: "http://localhost:54090", forcePathStyle: true });
  });

  it("doesn't touch S3 without S3_BUCKET (single server keeps files on disk)", async () => {
    vi.stubEnv("S3_BUCKET", "");
    await loadStorage();
    expect(clientConfigs).toEqual([]);
  });
});
