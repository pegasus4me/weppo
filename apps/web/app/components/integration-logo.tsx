import Image from "next/image";

type IntegrationLogoProps = {
  src: string;
  darkSrc?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

export function IntegrationLogo({
  src,
  darkSrc,
  alt,
  width,
  height,
  className = "",
}: IntegrationLogoProps) {
  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${darkSrc ? "dark:hidden" : ""}`}
      />
      {darkSrc ? (
        <Image
          src={darkSrc}
          alt={alt}
          width={width}
          height={height}
          className={`hidden ${className} dark:block`}
        />
      ) : null}
    </>
  );
}
