import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArmazenarArquivo } from "../../shared/kernel";

/**
 * S3-compatible object storage (Cloudflare R2, AWS S3, MinIO). When storage is
 * not configured it falls back to writing files to a local `uploads` folder
 * that the API serves statically, so the app works in local dev.
 */
@Injectable()
export class StorageService implements ArmazenarArquivo {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: string;
  private readonly bucket?: string;
  private readonly publicUrl?: string;
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>("STORAGE_PROVIDER") ?? "").toLowerCase();
    this.bucket = this.config.get<string>("STORAGE_BUCKET");
    this.publicUrl = this.config.get<string>("STORAGE_PUBLIC_URL");

    const endpoint = this.config.get<string>("STORAGE_ENDPOINT");
    const accessKeyId = this.config.get<string>("STORAGE_ACCESS_KEY");
    const secretAccessKey = this.config.get<string>("STORAGE_SECRET_KEY");

    if (this.isRemote() && endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: this.config.get<string>("STORAGE_REGION") ?? "auto",
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey }
      });
    }
  }

  async armazenar(key: string, body: Uint8Array, contentType: string): Promise<string> {
    if (this.client && this.bucket) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType
        })
      );

      const base = (
        this.publicUrl ??
        `${this.config.get<string>("STORAGE_ENDPOINT")}/${this.bucket}`
      ).replace(/\/$/, "");
      return `${base}/${key}`;
    }

    const uploadsDir = join(process.cwd(), "uploads");
    const fileDir = join(uploadsDir, ...key.split("/").slice(0, -1));
    await mkdir(fileDir, { recursive: true });
    await writeFile(join(uploadsDir, key), body);

    const apiUrl = (this.config.get<string>("API_URL") ?? "http://localhost:4000").replace(
      /\/$/,
      ""
    );
    this.logger.log(`[storage:local] stored ${key}`);
    return `${apiUrl}/uploads/${key}`;
  }

  private isRemote(): boolean {
    return this.provider === "r2" || this.provider === "s3";
  }
}
