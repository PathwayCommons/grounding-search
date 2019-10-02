/** @module server/util/strings */

export const sanitizeNameForCmp = name => {
  return ( name
    .toLowerCase()
    .replace(/(\s|-|[0-9]|^)alpha(\s|-|[0-9]|$)/g, '$1a$2')
    .replace(/(\w)alpha/g, '$1a')
    .replace(/(\s|-|[0-9]|^)beta(\s|-|[0-9]|$)/g, '$1b$2')
    .replace(/(\w)beta/g, '$1b')
    .replace(/[\s-]/g, '')
  );
};

export const normalizeName = name => name.toLowerCase();
