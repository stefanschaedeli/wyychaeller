import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAXIMUM_PHOTO_UPLOAD_BYTES } from "@/domain/constants";
import { InvalidPhotoError, PhotoStorage } from "./photo-storage";

let photoDirectory: string;
let photoStorage: PhotoStorage;

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#7b2d3a" } })
    .png()
    .withExif({ IFD0: { Copyright: "secret-location-data" } })
    .toBuffer();
}

beforeEach(async () => {
  photoDirectory = await mkdtemp(path.join(tmpdir(), "weinkeller-photos-"));
  photoStorage = new PhotoStorage(photoDirectory);
});

afterEach(async () => {
  await rm(photoDirectory, { recursive: true, force: true });
});

describe("PhotoStorage", () => {
  it("re-encodes uploads as downsized JPEG without metadata", async () => {
    const fileName = await photoStorage.storeLabelPhoto(await createTestImage(3000, 2000));

    expect(fileName).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    const storedBytes = await photoStorage.readLabelPhoto(fileName);
    const metadata = await sharp(storedBytes).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1500);
    expect(metadata.height).toBe(1000);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects files that are not images", async () => {
    const notAnImage = Buffer.from("<script>alert(1)</script>");
    await expect(photoStorage.storeLabelPhoto(notAnImage)).rejects.toMatchObject({
      reason: "notAnImage",
    });
    expect(await readdir(photoDirectory)).toEqual([]);
  });

  it("rejects oversized uploads before decoding them", async () => {
    const oversizedUpload = Buffer.alloc(MAXIMUM_PHOTO_UPLOAD_BYTES + 1);
    await expect(photoStorage.storeLabelPhoto(oversizedUpload)).rejects.toMatchObject({
      reason: "tooLarge",
    });
  });

  it.each(["../weinkeller.db", "..%2Fsecret.jpg", "photo.png", "/etc/passwd"])(
    "refuses to read %s",
    async (maliciousFileName) => {
      await expect(photoStorage.readLabelPhoto(maliciousFileName)).rejects.toBeInstanceOf(
        InvalidPhotoError,
      );
    },
  );

  it("deletes photos and tolerates missing files", async () => {
    const fileName = await photoStorage.storeLabelPhoto(await createTestImage(100, 100));
    await photoStorage.deleteLabelPhoto(fileName);
    await photoStorage.deleteLabelPhoto(fileName);
    expect(await readdir(photoDirectory)).toEqual([]);
  });

  it("lists the file names currently stored on disk", async () => {
    const firstFileName = await photoStorage.storeLabelPhoto(await createTestImage(100, 100));
    const secondFileName = await photoStorage.storeLabelPhoto(await createTestImage(100, 100));

    const storedFileNames = await photoStorage.listStoredPhotoFileNames();

    expect(storedFileNames.sort()).toEqual([firstFileName, secondFileName].sort());
  });
});
