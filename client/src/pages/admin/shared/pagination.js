export const getPageNumbers = (page, totalPages, windowSize = 5) => {
  const total = Math.max(1, totalPages || 1);
  const current = Math.min(Math.max(1, page || 1), total);
  const size = Math.max(1, Number(windowSize) || 5);
  const half = Math.floor(size / 2);

  let start = Math.max(1, current - half);
  let end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);

  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
};
