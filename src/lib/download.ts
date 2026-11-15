import { titleCsvProblem } from './titleLimit';

// Every CSV download, including legacy history, passes the final title gate.
export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8;"): void {
  if (filename.endsWith('.csv') && filename !== 'template.csv') {
    const problem = titleCsvProblem(content);
    if (problem) { window.alert(problem); return; }
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
