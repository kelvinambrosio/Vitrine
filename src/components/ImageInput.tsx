"use client";

import { useRef, useState } from "react";

/** Reduz a foto no navegador (máx. 1400 px, JPEG). Evita estourar o limite de envio de 4,5 MB da hospedagem. */
async function shrink(file: File, max = 1400): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function ImageInput({
  name,
  multiple = false,
  max = 5,
}: {
  name: string;
  multiple?: boolean;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onChange() {
    const input = ref.current;
    if (!input || !input.files || input.files.length === 0) {
      setInfo(null);
      return;
    }
    setInfo("Preparando fotos…");
    const picked = Array.from(input.files).slice(0, multiple ? max : 1);
    const small = await Promise.all(picked.map((f) => shrink(f)));
    const dt = new DataTransfer();
    small.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    const kb = Math.round(small.reduce((s, f) => s + f.size, 0) / 1024);
    setInfo(`${small.length} foto(s) pronta(s) (${kb} KB no total)`);
  }

  return (
    <div>
      <input
        ref={ref}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {info && <p className="mt-1 text-xs text-slate-500">{info}</p>}
    </div>
  );
}
