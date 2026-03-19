import { Copy } from 'lucide-react';
import { toast } from 'sonner';

// Click-to-copy text with visual feedback
export function CopyField({ value, label, truncate = true, mono = false, className = '' }) {
  if (!value) return <span className="text-muted-foreground text-xs">-</span>;

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    toast.success(`Đã copy ${label || 'text'}`);
  };

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:bg-primary/10 group/copy ${className}`}
      title={`Click to copy ${label || ''}`}
    >
      <span className={`text-left ${truncate ? 'truncate' : ''} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
      <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover/copy:opacity-100 transition-opacity" />
    </button>
  );
}
