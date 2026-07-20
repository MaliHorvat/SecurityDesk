import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type StoredObject = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_SIZE_MB || 10);
  return Math.max(1, mb) * 1024 * 1024;
}

function localRoot(): string {
  return process.env.LOCAL_STORAGE_PATH?.trim() || join(process.cwd(), ".uploads");
}

export async function putObject(input: {
  organizationId: string;
  folder: string;
  fileName: string;
  contentType: string;
  body: Buffer;
}): Promise<StoredObject> {
  if (input.body.byteLength > maxUploadBytes()) {
    throw new Error(`Datoteka presega omejitev ${process.env.MAX_UPLOAD_SIZE_MB || 10} MB.`);
  }

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const key = `${input.organizationId}/${input.folder}/${randomUUID()}-${safeName}`;
  const driver = process.env.STORAGE_DRIVER || "local";

  if (driver === "vercel_blob") {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Manjka BLOB_READ_WRITE_TOKEN za vercel_blob storage.");
    const { put } = await import("@vercel/blob");
    const blob = await put(key, input.body, {
      access: "public",
      contentType: input.contentType,
      token,
    });
    return { key: blob.pathname || key, url: blob.url, contentType: input.contentType, size: input.body.byteLength };
  }

  if (driver === "s3") {
    throw new Error("S3 storage še ni omogočen v tej različici. Uporabite local ali vercel_blob.");
  }

  // Vercel/serverless has no persistent writable app filesystem (except ephemeral /tmp).
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "Lokalno shranjevanje (.uploads) ni na voljo v produkciji. Nastavite STORAGE_DRIVER=vercel_blob in BLOB_READ_WRITE_TOKEN.",
    );
  }

  // local + database (database stores key only; bytes on local disk for now)
  const fullPath = join(localRoot(), key);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, input.body);
  return {
    key,
    url: `/api/storage?key=${encodeURIComponent(key)}`,
    contentType: input.contentType,
    size: input.body.byteLength,
  };
}

export async function readObjectBuffer(key: string): Promise<{ body: Buffer; contentType?: string } | null> {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "vercel_blob") {
    // Public URL fetch is handled by the blob URL stored on the record.
    return null;
  }
  try {
    const body = await readFile(join(localRoot(), key));
    return { body };
  } catch {
    return null;
  }
}

export function isAllowedFloorplanImage(mime: string): boolean {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime.toLowerCase());
}

export function isPdf(mime: string): boolean {
  return mime.toLowerCase() === "application/pdf";
}
