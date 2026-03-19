import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// Polls TOTP code for an account every second
export function useTotp(accountId, enabled = true) {
  const [data, setData] = useState({ code: null, secondsRemaining: 0 });

  useEffect(() => {
    if (!accountId || !enabled) return;

    let active = true;
    const fetchTotp = async () => {
      try {
        const result = await api.get(`/api/accounts/${accountId}/totp`);
        if (active) setData(result);
      } catch { /* ignore */ }
    };

    fetchTotp();
    const interval = setInterval(fetchTotp, 1000);
    return () => { active = false; clearInterval(interval); };
  }, [accountId, enabled]);

  return data;
}
