# fin

A finance skill for AI agents: reliable access to primary-source financial data, and rules for citing it. Works with any agent that can read a `SKILL.md` and run a shell command.

- **Primary sources.** Fundamentals, filings, filing text and insider trades come straight from SEC EDGAR. No paid data vendors.
- **Every number is traceable.** XBRL values carry period, tag, form, filing date and filing URL. Every response lists its sources, tiered `official` or `unofficial`.
- **The agent does the analysis.** The skill supplies data and rules; the agent writes its own code for calculations and shapes the report.

## Install

```bash
npx skills add bilalbayram/fin
```

Requires Node 20+. On first use the agent asks for your name and email, which SEC requires from every client and which is sent only to sec.gov. It is stored in `~/.config/fin/credentials.json` (mode `0600`); `SEC_EDGAR_IDENTITY` overrides it.

## Commands

| Command | Returns |
| --- | --- |
| `fin sec company <ticker\|cik>` | Company profile |
| `fin sec facts <ticker>` | As-reported fundamentals, annual or quarterly, with the filing behind every value |
| `fin sec concept <ticker> <tag>` | Every value of one XBRL tag |
| `fin sec frames <tag> <period>` | One XBRL tag across all filers |
| `fin sec filings <ticker>` | Filing history with document links |
| `fin sec document <url>` | Filing text from sec.gov, paged or searched |
| `fin sec search "<text>"` | Full-text search across EDGAR filings |
| `fin sec insiders <ticker>` | Form 4 insider transactions |
| `fin price <symbol>` | Last price, previous close and OHLCV bars (unofficial) |

`fin --help` or `fin <command> --help` lists options. Output is JSON: `{ data, sources, warnings }`. Full source catalogue and coverage: [`skill/references/sources.md`](packages/fin/skill/references/sources.md).

## Repository

- `packages/fin/skill`: the skill (`SKILL.md`, `references/`, bundled `scripts/fin.mjs`).
- `packages/fin/src`: source for `fin`.
- `packages/web`: marketing site at opencode.finance.

```bash
bun install
bun run typecheck
bun run build   # rebuilds skill/scripts/fin.mjs; commit the result
bun run test
```

`skill/scripts/fin.mjs` is committed because skill installers copy the folder straight from git; a test fails when it is stale.
