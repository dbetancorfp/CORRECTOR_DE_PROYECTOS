import PDFDocument from 'pdfkit';
import type { ProjectGradeTable } from '../../../shared/grade-types';

// Element #120 — renders exactly the columns table #119 shows for the given
// role: a single "Nota" column for profesor, one column per cycle module
// plus "Nota final" for tutor. Numbers are stringified the same way lit-html
// interpolates them on screen (no forced decimal padding), so PDF content
// matches the on-screen table byte for byte.
export function generateGradesPdf(table: ProjectGradeTable, academicYear: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(`Notas — ${table.projectName}`);
    doc.fontSize(10).text(`Curso académico: ${academicYear}`);
    if (table.role === 'profesor') {
      doc.text(`Módulo: ${table.moduleName}`);
    }
    doc.moveDown();

    if (table.role === 'profesor') {
      drawTable(
        doc,
        ['Alumno', 'Nota'],
        table.rows.map((r) => [r.studentName, String(r.moduleScore)]),
      );
    } else {
      const headers = ['Alumno', ...table.modules.map((m) => m.name), 'Nota final'];
      const rows = table.rows.map((r) => [
        r.studentName,
        ...table.modules.map((m) => String(r.moduleScores[String(m.id)] ?? '')),
        String(r.finalScore),
      ]);
      drawTable(doc, headers, rows);
    }

    doc.end();
  });
}

// First column (Alumno) gets extra width relative to the score columns,
// which only ever hold short numbers/abbreviations.
const NAME_COLUMN_WEIGHT = 2.5;

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]): void {
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const units = NAME_COLUMN_WEIGHT + (headers.length - 1);
  const colWidth = usableWidth / units;
  const left = doc.page.margins.left;
  const cellPadding = 4;
  const xFor = (i: number): number => left + (i === 0 ? 0 : NAME_COLUMN_WEIGHT + (i - 1)) * colWidth;
  const widthFor = (i: number): number => (i === 0 ? NAME_COLUMN_WEIGHT : 1) * colWidth;

  doc.fontSize(9);
  let y = doc.y;
  headers.forEach((h, i) => doc.text(fitText(doc, h, widthFor(i) - cellPadding), xFor(i), y));
  y += 18;

  for (const row of rows) {
    row.forEach((cell, i) => doc.text(fitText(doc, cell, widthFor(i) - cellPadding), xFor(i), y));
    y += 16;
  }
}

// pdfkit wraps to a second line whenever a `width` option is passed to
// `.text()`, regardless of `lineBreak: false` — so cells are truncated with
// an ellipsis up front instead, guaranteeing exactly one line per row.
function fitText(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string {
  if (doc.widthOfString(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.widthOfString(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}
