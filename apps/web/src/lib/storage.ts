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

function normalizeDriver(raw: string | undefined): string {
  return (raw || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .replace(/-/g, "_");
}

/** Resolve storage backend. On Vercel, prefer Blob whenever a token is present. */
export function resolveStorageDriver(): "local" | "vercel_blob" | "s3" | "database" {
  const configured = normalizeDriver(process.env.STORAGE_DRIVER);
  const onServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

  if (configured === "vercel_blob" || configured === "s3" || configured === "database") {
    return configured;
  }

  // Production safety: never use local disk on Vercel if Blob token exists.
  if (onServerless && hasBlobToken) {
    return "vercel_blob";
  }

  if (configured === "local" || !configured) {
    return "local";
  }

  return "local";
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
  const driver = resolveStorageDriver();

  if (driver === "vercel_blob") {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      throw new Error(
        "Manjka BLOB_READ_WRITE_TOKEN. Na Vercelu dodajte token in naredite Redeploy (env se uveljavi šele po novem deployu).",
      );
    }
    const { put } = await import("@vercel/blob");
    const blob = await put(key, input.body, {
      access: "public",
      contentType: input.contentType,
      token,
    });
    return {
      key: blob.pathname || key,
      url: blob.url,
      contentType: input.contentType,
      size: input.body.byteLength,
    };
  }

  if (driver === "s3") {
    throw new Error("S3 storage še ni omogočen v tej različici. Uporabite local ali vercel_blob.");
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const seen = normalizeDriver(process.env.STORAGE_DRIVER) || "(prazno→local)";
    throw new Error(
      `Lokalno shranjevanje (.uploads) ni na voljo na Vercelu (trenutni STORAGE_DRIVER=${seen}). ` +
        `Nastavite STORAGE_DRIVER=vercel_blob in BLOB_READ_WRITE_TOKEN, nato Redeploy.`,
    );
  }

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
  const driver = resolveStorageDriver();
  if (driver === "vercel_blob") {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) return null;
    try {
      const { head } = await import("@vercel/blob");
      const meta = await head(key, { token });
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return { body: buf, contentType: meta.contentType };
    } catch {
      return null;
    }
  }
  try {
    const body = await readFile(join(localRoot(), key));
    return { body };
  } catch {
    return null;
  }
}

export function publicObjectUrl(key: string, storedUrl?: string | null): string {
  if (storedUrl && /^https?:\/\//i.test(storedUrl)) return storedUrl;
  return `/api/storage?key=${encodeURIComponent(key)}`;
}

export function isAllowedFloorplanImage(mime: string): boolean {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime.toLowerCase());
}

export function isPdf(mime: string): boolean {
  return mime.toLowerCase() === "application/pdf";
}
