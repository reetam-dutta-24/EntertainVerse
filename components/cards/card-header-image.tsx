import { cn } from "@/lib/utils";

export interface CardHeaderImageProps {
  imageUrl?: string;
  accentClass: string;
}

/** Shared catalog card header — cover image or flat accent band. */
export function CardHeaderImage({ imageUrl, accentClass }: CardHeaderImageProps) {
  if (imageUrl) {
    return (
      <div className="relative h-[72px] w-full shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      </div>
    );
  }

  return <div className={cn("h-[72px] w-full shrink-0", accentClass)} />;
}
