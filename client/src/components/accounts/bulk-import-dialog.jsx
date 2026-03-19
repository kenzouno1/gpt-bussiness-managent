import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function BulkImportDialog({ onImported }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!text.trim()) { toast.warning('Nhập hoặc upload dữ liệu'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/accounts/bulk', { text });
      setResult(res);
      toast.success(`Imported ${res.imported}, skipped ${res.skipped}`);
      onImported?.();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); setText(''); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Mỗi dòng: <code className="rounded bg-muted px-1">email|password|2fa_secret</code>
          </p>
          <div>
            <input type="file" accept=".txt,.csv" onChange={handleFile}
              className="text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs" />
          </div>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"user1@mail.com|pass123|TOTPSECRET\nuser2@mail.com|pass456|TOTPSECRET2"}
            rows={8}
            className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {result && (
            <div className="rounded-lg border bg-muted/50 p-3 text-xs space-y-1">
              <p className="text-green-500">Imported: {result.imported}</p>
              <p className="text-yellow-500">Skipped: {result.skipped}</p>
              {result.errors?.length > 0 && (
                <p className="text-red-500">Errors: {result.errors.length}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang import...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
