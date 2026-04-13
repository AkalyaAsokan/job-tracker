const US_STATE_RE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

export function isUsLocation(location: string | null | undefined): boolean {
  if (!location) return true; // no location = include (many remote postings omit it)
  const loc = location.toLowerCase();
  if (loc.includes('remote')) return true;
  if (loc.includes('united states') || loc.includes(' us,') || loc.includes(', us') || loc.includes('usa')) return true;
  if (US_STATE_RE.test(location)) return true;
  // Explicit non-US signals
  if (loc.includes('canada') || loc.includes('united kingdom') || loc.includes('london') ||
      loc.includes('germany') || loc.includes('india') || loc.includes('australia') ||
      loc.includes('singapore') || loc.includes('ireland') || loc.includes('amsterdam') ||
      loc.includes('berlin') || loc.includes('paris') || loc.includes('toronto') ||
      loc.includes('vancouver') || loc.includes('tokyo') || loc.includes('dubai')) return false;
  return true; // default include if we can't determine
}
