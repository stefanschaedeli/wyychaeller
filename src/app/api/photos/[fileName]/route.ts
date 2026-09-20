import { ApiError } from "@/server/http/api-error";
import { handleRoute } from "@/server/http/handle-route";
import { isGeneratedPhotoFileName } from "@/server/photo-storage/photo-storage";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ fileName: string }> };

// A Node `ENOENT` code check, not a class check, so it survives chunk duplication too.
function isFileMissingError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const { fileName } = await context.params;
    if (!isGeneratedPhotoFileName(fileName)) {
      throw new ApiError(400, "invalidInput", "Invalid photo name");
    }
    try {
      const photoBytes = await getServiceContainer().photoStorage.readLabelPhoto(fileName);
      return new Response(new Uint8Array(photoBytes), {
        headers: {
          "content-type": "image/jpeg",
          // File names are unique per upload, so a photo never changes.
          "cache-control": "private, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      if (isFileMissingError(error)) throw new ApiError(404, "notFound", "Photo not found");
      throw error;
    }
  });
}
