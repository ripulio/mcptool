/**
 * Plays with numbers
 * @param num - The number to play with
 * @mcpTool
 */
export function playWithNumbers(
  num: number,
  _str: string,
  _flag: boolean,
  _union: number | string,
  _arr: number[],
  _obj: {a: number; b: string},
  _nullVal: null,
  _undefinedVal: undefined,
  _anyVal: any,
  _unknownVal: unknown,
  _stringLiteral: 'fixedString',
  _trueValue: true,
  _falseValue: false,
  _tupleVal: [number, string, boolean],
  _tupleWithRest: [number, ...string[]],
  _mapVal: Map<string, number>,
  _setVal: Set<number>,
  _optionalParam?: number
): number {
  return num * 2 + 10;
}
