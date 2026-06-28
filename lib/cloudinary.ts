import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export { cloudinary };

export function signUploadParams(folder: string): {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadPreset: string;
} {
  const timestamp = Math.round(Date.now() / 1000);
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET!;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, upload_preset: uploadPreset },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    uploadPreset,
  };
}
