/** @module server/util/strings */

export const sanitizeNameForCmp = name => {
  return ( name
    .toLowerCase()
    .replace(/(\s|-|[0-9]|^)([aA]lpha|[αΑ])(\s|-|[0-9]|$)/g, '$1a$3')
    .replace(/(\w)([aA]lpha|[αΑ])/g, '$1a')
    .replace(/(\s|-|[0-9]|^)([bB]eta|[βΒ])(\s|-|[0-9]|$)/g, '$1b$3')
    .replace(/(\w)([bB]eta|[βΒ])/g, '$1b')
    .replace(/(\s|-|[0-9]|^)([gG]amma|[γΓ])(\s|-|[0-9]|$)/g, '$1g$3')
    .replace(/(\w)([gG]amma|[γΓ])/g, '$1g')
    .replace(/(\s|-|[0-9]|^)([dD]elta|[δΔ])(\s|-|[0-9]|$)/g, '$1d$3')
    .replace(/(\w)([dD]elta|[δΔ])/g, '$1d')
    .replace(/(\s|-|[0-9]|^)([eE]psilon|[εΕ])(\s|-|[0-9]|$)/g, '$1e$3')
    .replace(/(\w)([eE]psilon|[εΕ])/g, '$1e')
    .replace(/(\s|-|[0-9]|^)([zZ]eta|[ζΖ])(\s|-|[0-9]|$)/g, '$1z$3')
    .replace(/(\w)([zZ]eta|[ζΖ])/g, '$1z')
    .replace(/[\s-]/g, '')
  );
};
