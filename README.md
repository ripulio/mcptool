# 🤖 mcptool

> A tool to generate TypeScript MCP servers from source code.

- Supports multiple flavors (e.g. tmcp, official mcp)
- Generates type-safe MCP tool implementations
- Configurable transport methods (e.g. stdio, http)
- Automatically installs missing dependencies

## Install

```bash
npm install -g mcptool
```

## Usage

```bash
npx mcptool src/input.ts -o src/server.ts
```

### How it works

This tool will process a typescript entrypoint and generate a fully functional MCP server implementation based on the provided code.

For example, take the following code as input:

```ts
/**
 * Adds two numbers
 * @mcpTool
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

If we run `npx mcptool src/input.ts`, this will generate an MCP server that exposes the `add` function as an MCP tool.

**The generated file will be TypeScript**, and should be committed to your repository. This is not "build output", in that you can choose to modify it manually from now on or can use it as a pre-commit step to always regenerate it.

Key points to note:

- All exported functions of the entrypoint file with `@mcpTool` JSDoc comments will be exposed as MCP tools.
- The generated server will use the types defined in your source code, ensuring type safety.
- You can choose which SDK to use (e.g. tmcp or the official MCP TypeScript SDK).
- If your function returns a `CallToolResult` (e.g. from tmcp), the generated server will use it as-is rather than wrapping it again.

## Options

- `--outFile, -o <path>` - Output file path
- `--cwd, -c <path>` - Current working directory (default: `.`)
- `--transport, -t <type>` - Transport method: `stdio` or `http` (default: `stdio`)
- `--name, -n <name>` - Project name (defaults to `package.json` name)
- `--version, -v <version>` - Project version (defaults to `package.json` version)
- `--flavor, -f <flavor>` - MCP flavor: `tmcp` or `mcp` (default: `tmcp`)
- `--interactive, -i` - Run in interactive mode (default: `false`)
- `--silent, -s` - Suppress output messages (default: `false`)
- `--install` - Automatically install missing dependencies (default: `false`)

### Example with options

```bash
mcptool src/input.ts -o src/server.ts -t http -f mcp --install
```

## Formatting

The generated code is automatically formatted using the formatter installed locally in your project if it is supported. Supported formatters are:

- [Prettier](https://prettier.io/)
- [Biome](https://biomejs.dev/)

If none of these are installed, the code will be unformatted and may not adhere to your project's coding style.

## License

MIT License
