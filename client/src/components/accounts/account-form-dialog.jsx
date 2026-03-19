import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function AccountFormDialog({ accountId, open, onOpenChange, onSaved }) {
  const isEdit = !!accountId;
  const [form, setForm] = useState({ email: '', password: '', totp_secret: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      api.get(`/api/accounts/${accountId}`).then(acc => {
        setForm({ email: acc.email || '', password: acc.password || '', totp_secret: acc.totp_secret || '', status: acc.status || '' });
      });
    } else {
      setForm({ email: '', password: '', totp_secret: '', status: '' });
    }
  }, [accountId, open, isEdit]);

  const handleSave = async () => {
    if (!form.email) { toast.warning('Email bắt buộc'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/accounts/${accountId}`, form);
        toast.success('Đã cập nhật');
      } else {
        await api.post('/api/accounts', form);
        toast.success('Đã thêm tài khoản');
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa tài khoản' : 'Thêm tài khoản'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input value={form.email} onChange={set('email')} placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input value={form.password} onChange={set('password')} type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>2FA Secret (TOTP Base32)</Label>
            <Input value={form.totp_secret} onChange={set('totp_secret')} placeholder="ABCDEF123456" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Input value={form.status} onChange={set('status')} placeholder="active, stripe_link..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
