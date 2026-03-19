import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function CsvImportDialog({ onImported }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await api.upload('/api/import', file);
      setResult(res);
      toast.success(`Imported ${res.imported} accounts, ${res.orgsCreated} orgs created`);
      onImported?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> + Thêm Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Accounts from CSV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="file" name="file" accept=".csv" required />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Importing...' : 'Upload & Import'}
          </Button>
        </form>
        {result && (
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-green-600">Imported: {result.imported}</p>
            <p className="text-yellow-600">Skipped: {result.skipped}</p>
            <p className="text-blue-600">Orgs created: {result.orgsCreated}</p>
            {result.errors?.length > 0 && (
              <p className="text-red-600">Errors: {result.errors.join(', ')}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
