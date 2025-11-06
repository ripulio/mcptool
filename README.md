# mcptool

> A tool to generate TypeScript MCP servers from source code.

## Install

```bash
npm install -g mcptool
```

## Usage

```bash
npx mcptool src/input.ts -o src/server.ts
```

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
