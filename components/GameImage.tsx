"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function GameImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-secondary text-[10px] font-medium text-muted-foreground",
          className
        )}
        aria-hidden
      >
        {alt.slice(0, 1)}
      </div>
    );
  }
  return (
    // Game icons come from Enka and HoYoLAB CDNs. next/image would need every host allowlisted.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
