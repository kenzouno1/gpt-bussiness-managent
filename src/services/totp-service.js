const { TOTP } = require('otpauth');

/**
 * Generate current TOTP code from a base32 secret
 * Returns code + seconds remaining until next code
 */
function generateTOTP(secret) {
  const totp = new TOTP({
    secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  const code = totp.generate();
  const secondsRemaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period);

  return { code, secondsRemaining, period: totp.period };
}

module.exports = { generateTOTP };
