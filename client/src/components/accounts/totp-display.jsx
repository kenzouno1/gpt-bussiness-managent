import { useTotp } from '@/hooks/use-totp';
import { toast } from 'sonner';

// Displays real-time TOTP code computed client-side — zero server requests
export function TotpDisplay({ secret, enabled = true, large = false }) {
  const { code, secondsRemaining } = useTotp(secret, enabled);

  if (!code) return <span className="text-muted-foreground text-xs">N/A</span>;

  const progress = secondsRemaining / 30;
  const size = large ? 'text-2xl' : 'text-sm';

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy: ${code}`);
  };

  return (
    <div className="flex items-center gap-2 cursor-pointer group" onClick={copy} title="Click to copy">
      <svg className={large ? 'h-8 w-8' : 'h-5 w-5'} viewBox="0 0 36 36">
        <path
          className="stroke-muted"
          d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" strokeWidth="3"
        />
        <path
          className="stroke-primary"
          d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" strokeWidth="3"
          strokeDasharray={`${progress * 100}, 100`}
          strokeLinecap="round"
        />
      </svg>
      <code className={`${size} font-mono font-bold tracking-widest group-hover:text-primary transition-colors`}>{code}</code>
      <span className="text-muted-foreground text-xs">{secondsRemaining}s</span>
    </div>
  );
}
