export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/svg+xml';

export default function Icon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="vitverseGradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0F172A" />
          <stop offset="1" stop-color="#1E40AF" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#vitverseGradient)" />
      <text x="32" y="39" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF">V</text>
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
