/**
 * Saudi mobile numbers: 9 digits starting with 5 after the +966 country code.
 * Accepts common local inputs (05xxxxxxxx, 5xxxxxxxx, 009665xxxxxxxx, +966 5x xxx xxxx)
 * and Arabic-Indic digits.
 */
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = arabicDigits.indexOf(ch);
    return String(a >= 0 ? a : persianDigits.indexOf(ch));
  });
}

export function normalizeSaudiMobile(input: string): string | null {
  let digits = normalizeDigits(input).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('966')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^5\d{8}$/.test(digits)) return null;
  return `+966${digits}`;
}

export function formatSaudiMobile(e164: string): string {
  const m = /^\+966(5\d)(\d{3})(\d{4})$/.exec(e164);
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
