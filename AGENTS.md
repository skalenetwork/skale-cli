# SKALE CLI — Agent Guidelines

> **Update after learnings or mistakes** — when a correction, new convention, or hard-won lesson emerges during development, append it to the relevant section of this file immediately.

## Project Overview

This is the official CLI for SKALE Network — a TypeScript/Bun-based tool for interacting with SKALE chains and Ethereum.

## Architecture

- **Framework**: Built on `incur` CLI framework
- **Runtime**: Bun (not Node.js)
- **Type Safety**: Full TypeScript with strict config
- **Chains**: Support for Europa, Calypso, Nebula, Titan, and custom SKALE chains

## Code Conventions

### TypeScript

- Use `type` over `interface`
- No `readonly` on type properties
- Use `as const` for fixed value sets (no enums)
- All imports include `.js` for ESM compatibility
- Use `z.output<>` over `z.infer<>` for Zod schemas
- Options default to `= {}` not `?:`

### CLI Patterns

- Commands are pure functions that return objects
- Each command file exports one command factory
- Commands grouped by domain (ima.ts, token.ts, etc.)
- Shared utilities go in `src/contracts/` or `src/abis/`

### Naming

- Command files: lowercase (ima.ts, token.ts)
- Contract ABIs: camelCase.abi.json
- Types: PascalCase in `src/contracts/types.ts`

## Testing

- No tests currently — add when command logic becomes complex
- Test complex contract interactions first

## Build & Release

```bash
# Development
bun run dev

# Build binary
bun run build

# Start built binary
bun run start
```

- Auto-publishes to npm on push to `main` (latest) or `staging` (beta)
- GitHub Actions handles versioning and releases

## SKALE-Specific Knowledge

### Chain Configuration

- Chain metadata in `src/chains.ts`
- Includes: chainId, rpcUrl, explorerUrl, token types
- Europa = payment chain, Calypso = data, Nebula = gaming

### IMA (Interchain Messaging)

- Main entry: MessageProxy contract
- Token bridging via TokenManager contracts
- Ethereum mainnet <-> SKALE chain flow

### Contract Addresses

- Hardcoded in `src/contracts/addresses.ts`
- Versioned by network (mainnet vs testnet)

## Common Commands

```bash
# Run locally
bun run dev -- chains list

# Build release binary
bun run build

# Check version
./dist/skale --version
```

## When Adding New Commands

1. Create file in `src/commands/<name>.ts`
2. Export command factory function
3. Register in `src/index.ts` with `.command(<name>)`
4. Follow existing patterns for argument parsing
5. Add to README.md commands table

## Troubleshooting

- **Binary not found**: Run `bun run build` first
- **Module not found**: Check `.js` extension on imports
- **Type errors**: Ensure `exactOptionalPropertyTypes` compliance

## Dependencies

- `@skalenetwork/bite` — SKALE-specific utilities
- `incur` — CLI framework
- `viem` — Ethereum/SKALE interactions
- `zod` — Schema validation

## Resources

- SKALE Docs: https://docs.skale.network/
- incur Docs: See `.agents/skills/incur/`
