interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const SearchIcon = ({ size = 17, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const BagIcon = ({ size = 19, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M6 7h12l1 13H5L6 7Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

export const UserIcon = ({ size = 19, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

export const MenuIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const CheckIcon = ({ size = 14, className }: IconProps) => (
  <svg {...base(size)} className={className} strokeWidth={2.4}>
    <path d="m4 12 5.5 5.5L20 7" />
  </svg>
);

export const TrashIcon = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13" />
  </svg>
);

export const ArrowIcon = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const TruckIcon = ({ size = 22, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M2 7h11v9H2zM13 10h4.5l3.5 3.5V16h-8z" />
    <circle cx="6" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export const LeafIcon = ({ size = 22, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M20 4C9 4 4 9 4 16v4" />
    <path d="M20 4c0 9-5 13-11 13H4" />
  </svg>
);

export const TagIcon = ({ size = 22, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 11V4h7l10 10-7 7z" />
    <circle cx="7.5" cy="7.5" r="1.4" />
  </svg>
);

export const ChatIcon = ({ size = 22, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.1A8 8 0 1 1 21 12Z" />
  </svg>
);

export const BoxIcon = ({ size = 40, className }: IconProps) => (
  <svg {...base(size)} className={className} strokeWidth={1.2}>
    <path d="M3 8l9-4 9 4v8l-9 4-9-4z" />
    <path d="M3 8l9 4 9-4M12 12v8" />
  </svg>
);
