import * as prompts from '@clack/prompts';

export const silentLogger: typeof prompts.log = {
  info: () => {},
  warn: () => {},
  error: (...args) => prompts.log.error(...args),
  success: () => {},
  message: () => {},
  step: () => {},
  warning: () => {}
};

export const getLogger = (silent?: boolean): typeof prompts.log => {
  return silent ? silentLogger : prompts.log;
};
