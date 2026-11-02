import fs from "fs/promises"
import os from "os"
import path from "path"
import { afterEach, beforeEach, expect, test } from "bun:test"
import { SourceCollector } from "../src/core/envelope"
import { facts } from "../src/sources/sec/facts"

const realFetch = globalThis.fetch
const saved = { cache: process.env.FINANCE_CACHE_DIR, identity: process.env.SEC_EDGAR_IDENTITY }
let cacheDir = ""

beforeEach(async () => {
  cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "fin-facts-"))
  process.env.FINANCE_CACHE_DIR = cacheDir
  process.env.SEC_EDGAR_IDENTITY = "Test User test@example.com"
})

afterEach(async () => {
  globalThis.fetch = realFetch
  for (const [key, value] of [["FINANCE_CACHE_DIR", saved.cache], ["SEC_EDGAR_IDENTITY", saved.identity]] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  await fs.rm(cacheDir, { recursive: true, force: true })
})

test("facts still returns data when the filing-history lookup fails", async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes("company_tickers")) return Response.json({ 0: { cik_str: 123, ticker: "EXM", title: "Example Corp" } })
    if (url.includes("/companyfacts/"))
      return Response.json({
        cik: 123,
        entityName: "Example Corp",
        facts: { "us-gaap": { Revenues: { units: { USD: [{ start: "2025-01-01", end: "2025-12-31", val: 5, accn: "a", form: "10-K", filed: "2026-02-01" }] } } } },
      })
    return new Response("not found", { status: 404 })
  }) as typeof fetch

  const collector = new SourceCollector()
  const result = await facts({ collector }, "EXM", { period: "annual", limit: 5, metrics: ["revenue"] })
  expect(result.metrics.revenue?.values[0]?.value).toBe(5)
  expect(collector.warnings.some((warning) => warning.startsWith("Could not check for annual reports newer"))).toBe(true)
})
