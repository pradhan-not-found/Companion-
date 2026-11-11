import type { JSX, ReactNode } from "react";

/* Lucide-style outline icons (24×24 grid, 2px stroke, round caps), sized by `size`. */

function Svg({ size = 16, children, className }: { size?: number; children: ReactNode; className?: string }): JSX.Element {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number; className?: string };

export const ArrowLeftIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </Svg>
);

export const PlusIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Svg>
);

export const XIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);

export const ChevronRightIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const SparklesIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <path d="M9.94 14.06 8.5 20l-1.44-5.94L1 12.5l6.06-1.44L8.5 5l1.44 6.06L16 12.5Z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
  </Svg>
);

export const PlayIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z" />
  </Svg>
);

export const StopIcon = (props: IconProps): JSX.Element => (
  <Svg {...props}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </Svg>
);
