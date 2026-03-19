import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function AddTeamDialog({ onCreated }) {
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
    if (!text.trim()) { toast.warning('Nhập dữ liệu'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/orgs', { text });
      setResult(res);
      toast.success(`Tạo ${res.created} team, bỏ qua ${res.skipped}`);
      onCreated?.();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); setText(''); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Thêm Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Mỗi dòng: <code className="rounded bg-muted px-1">email | password | 2fa_secret</code>
            <br />Tự động nhận diện email, password, 2FA, JWT token.
          </p>
          <div>
            <input type="file" accept=".txt,.csv" onChange={handleFile}
              className="text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs" />
          </div>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"padiongmagni43@outlook.com | Matkhau123@ | 3YGTMTX3MEN7BBZN3HAC35SWFXENIQJ3\nuser2@mail.com | pass456 | TOTPSECRET2"}
            rows={6}
            className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {result && (
            <div className="rounded-lg border bg-muted/50 p-3 text-xs space-y-1">
              <p className="text-green-500">Đã tạo: {result.created} team</p>
              <p className="text-yellow-500">Bỏ qua: {result.skipped}</p>
              {result.errors?.length > 0 && (
                <p className="text-red-500">Lỗi: {result.errors.join(', ')}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
