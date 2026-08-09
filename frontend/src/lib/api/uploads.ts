import { ApiError, parseOrThrow } from "@/lib/api/client";

export { ApiError };

/** Client Components only — sends a real multipart body through the proxy (see route.ts). */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/proxy/uploads/image", { method: "POST", body: formData });
  return parseOrThrow<{ url: string }>(res);
}
