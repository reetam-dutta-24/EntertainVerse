import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Where uploaded files live. Keys look like `uploads/<userId>/images/<uuid>.png` and the
 * app serves each one at `/<key>`, so stored URLs are the same whichever backend is used.
 *
 * With several app servers, a file saved to one server's disk is missing on the others —
 * so with S3_BUCKET set, files go to S3 (one bucket every server reads and writes).
 * Without it they go to `public/` on this server's disk (single server).
 */
export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** The file's bytes, or null if there's no such file. */
  get(key: string): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; size?: number } | null>;
}

function createDiskStorage(root: string): FileStorage {
  return {
    async put(key, bytes) {
      const filePath = path.join(root, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, bytes);
    },
    async get(key) {
      try {
        const bytes = await readFile(path.join(root, key));
        return { body: new Uint8Array(bytes), size: bytes.length };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
  };
}

function createS3Storage(bucket: string): FileStorage {
  // Credentials come from the SDK's usual chain: the EC2 instance role in production,
  // AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY locally. No keys live in the app's config.
  const client = new S3Client({
    region: process.env.S3_REGION ?? process.env.AWS_REGION ?? "us-east-1",
    // Only for an S3-compatible server in development (S3Mock, MinIO); real S3 needs neither.
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
  });
  return {
    async put(key, bytes, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
    },
    async get(key) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return object.Body ? { body: object.Body.transformToWebStream(), size: object.ContentLength } : null;
      } catch (error) {
        if ((error as Error).name === "NoSuchKey") return null;
        throw error;
      }
    },
  };
}

let storage: FileStorage | undefined;

export function getFileStorage(): FileStorage {
  storage ??= process.env.S3_BUCKET
    ? createS3Storage(process.env.S3_BUCKET)
    : createDiskStorage(path.join(process.cwd(), "public"));
  return storage;
}
