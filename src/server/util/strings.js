/** @module server/util/strings */

export const sanitizeNameForCmp = name => {
  return ( name
    .toLowerCase()
    .replace(/(\s|-|[0-9]|^)alpha(\s|-|[0-9]|$)/g, '$1a$2')
    .replace(/(\s|-|[0-9]|^)beta(\s|-|[0-9]|$)/g, '$1b$2')
    .replace(/[\s-]/g, '')
  );
};
