/**
 * Plays with numbers
 * @param num - The number to play with
 * @mcpTool
 */
export function playWithNumbers(
  num: number,
  str: string,
  flag: boolean,
  union: number | string,
  arr: number[],
  obj: {a: number; b: string},
  nullVal: null,
  undefinedVal: undefined,
  anyVal: any,
  unknownVal: unknown,
  stringLiteral: 'fixedString',
  trueValue: true,
  falseValue: false,
  tupleVal: [number, string, boolean],
  tupleWithRest: [number, ...string[]],
  mapVal: Map<string, number>,
  setVal: Set<number>,
  optionalParam?: number
): number {
  return num * 2 + 10;
}
