/**
 * Unsigned upload from the browser (upload preset), same pattern as Trackly reference.
 * Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
 *
 * Di Cloudinary: buat Upload preset dengan Signing mode = **Unsigned** (wajib untuk upload dari browser tanpa signature).
 * Cloud name = nilai persis di Dashboard → Programmable Media → Product environment credentials (bukan nama folder).
 */

function readCloudinaryUploadEnv(): { cloud: string; preset: string } {
  const cloud =
    (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '').trim();
  const preset =
    (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '').trim();
  return { cloud, preset };
}

export function isCloudinaryUploadConfigured(): boolean {
  const { cloud, preset } = readCloudinaryUploadEnv();
  return Boolean(cloud && preset);
}

export type CloudinaryUploadResource = 'image' | 'auto';

/**
 * @param resource - `image` for avatars/logos; `auto` for mixed meeting attachments
 */
export async function uploadToCloudinary(
  file: File,
  resource: CloudinaryUploadResource = 'image',
): Promise<{ secureUrl: string; bytes: number; format?: string }> {
  const { cloud, preset } = readCloudinaryUploadEnv();
  if (!cloud || !preset) {
    throw new Error(
      'Cloudinary belum dikonfigurasi. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.',
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/${resource}/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });

  if (!response.ok) {
    let msg = 'Upload gagal.';
    try {
      const err = (await response.json()) as { error?: { message?: string } };
      if (err.error?.message) msg = err.error.message;
    } catch {
      /* ignore */
    }
    if (/preset not found/i.test(msg)) {
      msg += [
        '',
        '— Pastikan: (1) Nama preset sama persis dengan di Cloudinary (huruf besar/kecil).',
        '(2) Preset ada di environment yang sama dengan cloud name ini.',
        '(3) Signing mode preset = Unsigned (Settings → Upload → Upload presets).',
        '(4) Setelah ubah .env, restart `next dev` / build ulang untuk production.',
        '(5) Variabel yang dipakai browser hanya NEXT_PUBLIC_* (bukan hanya CLOUDINARY_*).',
      ].join(' ');
    }
    throw new Error(msg);
  }

  const data = (await response.json()) as {
    secure_url: string;
    bytes?: number;
    format?: string;
  };
  return {
    secureUrl: data.secure_url,
    bytes: data.bytes ?? file.size,
    format: data.format,
  };
}
