export interface RemissionPage { rows: number[]; closing: number[] }
/** Actual measured heights include wrapped descriptions and observations. */
export function paginateRemission(rows: number[], closing: number[], capacity: number, tableHeader: number): RemissionPage[] {
  const pages: RemissionPage[] = [];
  const balanceLastPages = () => {
    if (pages.length < 2) return pages;
    const previous = pages[pages.length - 2], last = pages[pages.length - 1];
    const height = (page: RemissionPage) => page.rows.reduce((sum, i) => sum + rows[i], page.rows.length ? tableHeader : 0)
      + page.closing.reduce((sum, i) => sum + closing[i], 0);
    while (previous.rows.length + previous.closing.length > 1) {
      const nextPrevious = { rows: [...previous.rows], closing: [...previous.closing] };
      const nextLast = { rows: [...last.rows], closing: [...last.closing] };
      if (nextPrevious.closing.length) nextLast.closing.unshift(nextPrevious.closing.pop()!);
      else nextLast.rows.unshift(nextPrevious.rows.pop()!);
      if (height(nextLast) > capacity || Math.abs(height(nextPrevious) - height(nextLast)) >= Math.abs(height(previous) - height(last))) break;
      Object.assign(previous, nextPrevious); Object.assign(last, nextLast);
    }
    return pages;
  };
  const closingTotal = closing.reduce((sum, height) => sum + height, 0);
  let cursor = 0;
  while (cursor < rows.length) {
    const remaining = rows.slice(cursor).reduce((sum, height) => sum + height, 0);
    if (remaining + tableHeader + closingTotal <= capacity) {
      pages.push({ rows: rows.slice(cursor).map((_, index) => cursor + index), closing: closing.map((_, index) => index) });
      return balanceLastPages();
    }
    const page: RemissionPage = { rows: [], closing: [] };
    let used = tableHeader;
    while (cursor < rows.length) {
      if (page.rows.length && used + rows[cursor] > capacity) break;
      if (page.rows.length && cursor === rows.length - 1 && rows[cursor] + tableHeader + closingTotal <= capacity) break;
      page.rows.push(cursor); used += rows[cursor++];
    }
    pages.push(page);
  }
  let page = pages.at(-1) || { rows: [], closing: [] };
  if (!pages.length) pages.push(page);
  let used = page.rows.reduce((sum, index) => sum + rows[index], page.rows.length ? tableHeader : 0);
  for (const [index, height] of closing.entries()) {
    if (used + height > capacity && (page.rows.length || page.closing.length)) {
      page = { rows: [], closing: [] }; pages.push(page); used = 0;
    }
    page.closing.push(index); used += height;
  }
  return balanceLastPages();
}
export function observationChunks(text: string): string[] {
  return (text.trim() || 'Sin observaciones.').split(/\n/).flatMap(line => {
    const chunks: string[] = [];
    let remaining = line;
    while (remaining.length > 240) {
      const space = remaining.lastIndexOf(' ', 240);
      const cut = space > 120 ? space : 240;
      chunks.push(remaining.slice(0, cut)); remaining = remaining.slice(cut).trimStart();
    }
    return [...chunks, remaining || '\u00a0'];
  });
}
