import { formatCurrency, formatDateTime, getCampusLabel } from './utils';

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]) {
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 780 Td',
    '16 TL',
    ...lines.flatMap((line, index) => {
      const escaped = escapePdfText(line);
      return index === 0 ? [`(${escaped}) Tj`] : ['T*', `(${escaped}) Tj`];
    }),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadBookingReceiptPdf(booking: any) {
  const lines = [
    'VITVerse Payment Receipt',
    '',
    `Receipt Ref: ${booking.bookingRef || booking.id}`,
    `Event: ${booking.event?.title || 'VITVerse Event'}`,
    `Campus: ${getCampusLabel(booking.event?.campus || 'VELLORE')}`,
    `Venue: ${booking.event?.venue || booking.session?.venue?.name || 'TBA'}`,
    `Date: ${formatDateTime(booking.event?.startDateTime || booking.session?.sessionDate)}`,
    `Payment ID: ${booking.razorpayPaymentId || booking.paymentRef || 'Demo payment'}`,
    `Payment Status: ${booking.paymentStatus || 'PAID'}`,
    `Base Fee: ${formatCurrency(Math.max((booking.amountPaid || 0) - (booking.gstAmount || 0) - (booking.processingFee || 0), 0))}`,
    `GST: ${formatCurrency(booking.gstAmount || 0)}`,
    `Processing Fee: ${formatCurrency(booking.processingFee || 0)}`,
    `Total Paid: ${formatCurrency(booking.amountPaid || 0)}`,
  ];

  const blob = buildSimplePdf(lines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${booking.bookingRef || booking.id}-receipt.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
