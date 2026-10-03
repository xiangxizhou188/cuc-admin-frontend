"use client";
import { useState } from "react";
import { importSourceImage } from "./api";
export function SourceImagePicker({
  token,
  importId,
  images,
  adoptedNames,
  disabled,
  onBusy,
  onAdopt,
}: {
  token: string;
  importId: string;
  images: { sourceUrl: string; originalUrl?: string; selected: boolean }[];
  adoptedNames: string[];
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onAdopt: (file: File) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null),
    [error, setError] = useState("");
  async function adopt(index: number) {
    if (busy !== null || disabled) return;
    setBusy(index);
    onBusy(true);
    setError("");
    try {
      const file = await importSourceImage(token, importId, index);
      onAdopt(file);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      onBusy(false);
    }
  }
  return (
    <section className="source-image-picker">
      <h4>导入参考图片</h4>
      <p>点击采用后加入上方媒体，保存商品时才上传到 CUC。商品仍为草稿。</p>
      {error && <p role="alert">{error}</p>}
      <div className="import-reference-grid">
        {images.map(
          (image, index) =>
            image.selected && (
              <div key={index}>
                <a href={image.originalUrl ?? image.sourceUrl} target="_blank" rel="noreferrer">
                  <img
                    src={image.originalUrl ?? image.sourceUrl}
                    alt={`来源参考图 ${index + 1}`}
                    referrerPolicy="no-referrer"
                  />
                  <span>REFERENCE</span>
                </a>
                <button
                  type="button"
                  disabled={
                    disabled ||
                    busy !== null ||
                    adoptedNames.some((name) =>
                      name.startsWith(`import-${importId}-${index}.`),
                    )
                  }
                  onClick={() => void adopt(index)}
                >
                  {busy === index
                    ? "读取图片中…"
                    : adoptedNames.some((name) =>
                          name.startsWith(`import-${importId}-${index}.`),
                        )
                      ? "已加入媒体"
                      : "采用为草稿图片"}
                </button>
              </div>
            ),
        )}
      </div>
    </section>
  );
}
