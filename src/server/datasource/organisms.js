const SUPPORTED_ORGANISMS = new Set(['9606', '10090', '4932', '7227',
  '83333', '6239', '3702', '10116', '7955']);

const isSupportedOrganism = orgId => {
  return SUPPORTED_ORGANISMS.has( orgId );
};

module.exports = { SUPPORTED_ORGANISMS, isSupportedOrganism };
