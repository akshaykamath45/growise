import Image from "next/image";

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <Image
      src="/logos/growise-orbit.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority
    />
  );
}
