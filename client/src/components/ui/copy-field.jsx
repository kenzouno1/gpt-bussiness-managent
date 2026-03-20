import { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// Click-to-copy text with visual feedback, optional secret masking
export function CopyField({ value, label, truncate = true, mono = false, secret = false, className = '' }) {
  const [visible, setVisible] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs">-</span>;

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    toast.success(`Đã copy ${label || 'text'}`);
  };

  const toggleVisible = (e) => {
    e.stopPropagation();
    setVisible(!visible);
  };

  const display = secret && !visible ? '••••••••' : value;

  return (
    <span className={`inline-flex items-center gap-1 group/copy ${className}`}>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:bg-primary/10"
        title={`Click to copy ${label || ''}`}
      >
        <span className={`text-left ${truncate ? 'truncate' : ''} ${mono ? 'font-mono' : ''}`}>
          {display}
        </span>
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover/copy:opacity-100 transition-opacity" />
      </button>
      {secret && (
        <button onClick={toggleVisible} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" title={visible ? 'Ẩn' : 'Hiện'}>
          {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      )}
    </span>
  );
}
