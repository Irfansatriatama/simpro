'use client';

import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  isCloudinaryUploadConfigured,
  uploadToCloudinary,
  type CloudinaryUploadResource,
} from '@/lib/cloudinary-client';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  label: string;
  defaultUrl?: string | null;
  resource?: CloudinaryUploadResource;
  className?: string;
  description?: string;
};

export function CloudinaryImageField({
  name,
  label,
  defaultUrl,
  resource = 'image',
  className,
  description,
}: Props) {
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isCloudinaryUploadConfigured();

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      setUploading(true);
      try {
        const { secureUrl } = await uploadToCloudinary(file, resource);
        setUrl(secureUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload gagal.');
      } finally {
        setUploading(false);
      }
    },
    [resource],
  );

  return (
    <div className={cn('grid gap-2', className)}>
      <Label>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <input type="hidden" name={name} value={url} readOnly />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URL
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {!configured ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Tambahkan NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan
              NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di environment untuk upload.
            </p>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-2"
                disabled={uploading}
                onClick={() =>
                  document.getElementById(`cf-upload-${name}`)?.click()
                }
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Mengunggah…' : 'Pilih file'}
              </Button>
              <input
                id={`cf-upload-${name}`}
                type="file"
                accept={resource === 'image' ? 'image/*' : undefined}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  void onFile(f ?? null);
                  e.target.value = '';
                }}
              />
            </>
          )}
          {url && configured ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto w-fit px-0 text-xs text-muted-foreground"
              onClick={() => setUrl('')}
            >
              Hapus gambar
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
