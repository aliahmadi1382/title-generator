import { MAX_LENGTH } from '../cpis/titles/titleGenerator';
import { parseCsv } from '../cpis/titles/csv';

/** The CPIS final-export contract, also applied to edited/restored titles. */
export const TITLE_LIMIT_MESSAGE = 'Final titles must contain 1–80 characters. Shorten the marked draft before copying or exporting; its product facts are kept in History.';
export function isTitleReady(title: string): boolean {
  return title.trim().length > 0 && title.length <= MAX_LENGTH;
}

/** Original source/audit text is not a proposed listing title. */
const FINAL_COLUMNS = new Set(['title', 'newtitle', 'selectednewtitle', 'generatedtitle', 'attemptednewtitle']);
export function titleCsvProblem(content: string): string | null {
  const [header = [], ...rows] = parseCsv(content.replace(/^\uFEFF/, ''));
  const columns = header.flatMap((name, index) => FINAL_COLUMNS.has(name.toLowerCase().replace(/[^a-z]/g, '')) ? [index] : []);
  for (let row = 0; row < rows.length; row++) {
    if (rows[row].every(cell => !cell.trim())) continue;
    for (const column of columns) {
      // The original generated draft may be withheld after a valid manual edit.
      if (header[column].toLowerCase().replace(/[^a-z]/g, '') === 'generatedtitle' && !rows[row][column]) continue;
      if (!isTitleReady(rows[row][column] ?? '')) return `CSV row ${row + 2}: ${TITLE_LIMIT_MESSAGE}`;
    }
  }
  return null;
}
