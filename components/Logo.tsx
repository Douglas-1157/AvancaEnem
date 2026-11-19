export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 24l7-7 4 4 9-10" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 11h6v6" fill="none" stroke="#5ef0e6" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export const Logo = ({ size = 34, className = '' }: { size?: number; className?: string }) => (
  <span className={`logo ${className}`} style={{ width: size, height: size }}><LogoMark size={Math.round(size * 0.65)} /></span>
);
export const Wordmark = () => <span className="wm">Avança <b>ENEM</b></span>;
