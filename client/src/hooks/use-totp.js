import { useState, useEffect } from 'react';
import { TOTP } from 'otpauth';

// Compute TOTP entirely client-side — no server requests
export function useTotp(secret, enabled = true) {
  const [data, setData] = useState({ code: null, secondsRemaining: 0 });

  useEffect(() => {
    if (!secret || !enabled) {
      setData({ code: null, secondsRemaining: 0 });
      return;
    }

    let totp;
    try {
      totp = new TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
    } catch {
      setData({ code: null, secondsRemaining: 0 });
      return;
    }

    const update = () => {
      const code = totp.generate();
      const secondsRemaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period);
      setData({ code, secondsRemaining });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [secret, enabled]);

  return data;
}
