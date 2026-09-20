import { randomUUID } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  MAXIMUM_PHOTO_EDGE_PIXELS,
  MAXIMUM_PHOTO_UPLOAD_BYTES,
  PHOTO_JPEG_QUALITY,
} from "@/domain/constants";
import { createLogger } from "../logging/logger";

export type InvalidPhotoReason = "tooLarge" | "notAnImage" | "invalidFileName";

export class InvalidPhotoError extends Error {
  constructor(readonly reason: InvalidPhotoReason) {
    super(`Invalid photo: ${reason}`);
    this.name = "InvalidPhotoError";
  }
}

const ACCEPTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
// File names are generated here. Anything else never reaches the file system.
const GENERATED_FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

/** The single source of truth for a valid generated photo file name. Routes validate with this. */
export function isGeneratedPhotoFileName(fileName: string): boolean {
  return GENERATED_FILE_NAME_PATTERN.test(fileName);
}

const logger = createLogger("photo");

export class PhotoStorage {
  constructor(private readonly photoDirectory: string) {}

  async storeLabelPhoto(uploadedBytes: Buffer): Promise<string> {
    if (uploadedBytes.byteLength > MAXIMUM_PHOTO_UPLOAD_BYTES) {
      logger.warn("Photo refused: too large", { uploadedBytes: uploadedBytes.byteLength });
      throw new InvalidPhotoError("tooLarge");
    }
    const reencodedBytes = await this.reencodeAsJpeg(uploadedBytes);
    const fileName = `${randomUUID()}.jpg`;
    await writeFile(path.join(this.photoDirectory, fileName), reencodedBytes);
    logger.info("Photo stored", {
      fileName,
      uploadedBytes: uploadedBytes.byteLength,
      storedBytes: reencodedBytes.byteLength,
    });
    return fileName;
  }

  async readLabelPhoto(fileName: string): Promise<Buffer> {
    return readFile(this.resolveSafePath(fileName));
  }

  async deleteLabelPhoto(fileName: string): Promise<void> {
    await rm(this.resolveSafePath(fileName), { force: true });
    logger.info("Photo deleted", { fileName });
  }

  async listStoredPhotoFileNames(): Promise<string[]> {
    return readdir(this.photoDirectory);
  }

  /** Re-encoding checks the real content type and strips EXIF data such as GPS positions. */
  private async reencodeAsJpeg(uploadedBytes: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(uploadedBytes).metadata();
      if (!metadata.format || !ACCEPTED_IMAGE_FORMATS.has(metadata.format)) {
        throw new InvalidPhotoError("notAnImage");
      }
      return await sharp(uploadedBytes)
        .rotate()
        .resize({
          width: MAXIMUM_PHOTO_EDGE_PIXELS,
          height: MAXIMUM_PHOTO_EDGE_PIXELS,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: PHOTO_JPEG_QUALITY })
        .toBuffer();
    } catch (error) {
      if (error instanceof InvalidPhotoError) throw error;
      logger.error("Photo re-encoding failed", { error });
      throw new InvalidPhotoError("notAnImage");
    }
  }

  private resolveSafePath(fileName: string): string {
    if (!isGeneratedPhotoFileName(fileName)) {
      throw new InvalidPhotoError("invalidFileName");
    }
    return path.join(this.photoDirectory, fileName);
  }
}
