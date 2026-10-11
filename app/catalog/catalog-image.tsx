"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

function ImageContent({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-[var(--line)] bg-white">
      {src && !failed ? (
        <Image
          unoptimized
          src={src}
          alt={`รูปประกอบ ${name}`}
          width={112}
          height={112}
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex flex-col items-center gap-2 px-2 text-center text-xs text-stone-600">
          <ImageOff size={24} aria-hidden="true" />
          {failed ? "โหลดรูปไม่ได้" : "ยังไม่มีรูปที่อัปโหลด"}
        </span>
      )}
    </div>
  );
}

export function CatalogImage({
  itemId,
  version,
  hasImage,
  name,
  preview,
}: {
  itemId: string;
  version: number;
  hasImage: boolean;
  name: string;
  preview?: string;
}) {
  const src = preview ?? (hasImage ? `/api/catalog-images/${itemId}?v=${version}` : null);
  return <ImageContent key={src ?? "empty"} src={src} name={name} />;
}
