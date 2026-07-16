"use client";

export function downloadSimplePdf(title: string, lines: string[], fileName: string) {
  const text = lines.join("\n").replace(/[()\\]/g, "\\$&");
  const titleEscaped = title.replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 18 Tf 50 780 Td (${titleEscaped}) Tj 0 -28 Td /F1 11 Tf (${text.replace(/\n/g, ") Tj 0 -16 Td (")}) Tj ET`;
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${stream.length} >> stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000246 00000 n 
0000000316 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${316 + stream.length + 38}
%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printHtmlDocument(title: string, html: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!printWindow) {
    return;
  }

  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1,h2,h3 { margin: 0 0 12px; }
          p { color: #4b5563; }
        </style>
      </head>
      <body>${html}</body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function sendMail(subject: string, body: string) {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
