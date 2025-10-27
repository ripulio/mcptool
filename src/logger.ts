import * as prompts from '@clack/prompts';

export type Logger = typeof prompts.log;

export const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: (...args) => prompts.log.error(...args),
  success: () => {},
  message: () => {},
  step: () => {},
  warning: () => {}
};

export const getLogger = (silent?: boolean): Logger => {
  return silent ? silentLogger : prompts.log;
};
