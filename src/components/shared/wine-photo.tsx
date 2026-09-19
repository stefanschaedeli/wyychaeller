const SIZE_CLASSES = {
  thumbnail: "h-20 w-14",
  hero: "h-56 w-full md:h-72",
} as const;

export function WinePhoto(props: {
  photoUrl: string;
  alt: string;
  size: keyof typeof SIZE_CLASSES;
}) {
  return (
    // The API already serves downsized, immutable JPEGs, so next/image would add nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.photoUrl}
      alt={props.alt}
      loading="lazy"
      className={`${SIZE_CLASSES[props.size]} shrink-0 rounded-xs border border-line bg-line object-cover`}
    />
  );
}
