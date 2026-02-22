export default function HouseIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <polygon points="96,38 148,82 44,82" fill="currentColor" />
      <rect x="54" y="82" width="84" height="62" fill="currentColor" rx="2" />
      <rect x="82" y="104" width="28" height="40" rx="3" fill="var(--color-surface)" />
      <circle cx="104" cy="126" r="2.5" fill="currentColor" />
      <rect x="60" y="92" width="18" height="16" rx="2" fill="var(--color-surface)" opacity="0.7" />
      <rect x="114" y="92" width="18" height="16" rx="2" fill="var(--color-surface)" opacity="0.7" />
    </svg>
  );
}
