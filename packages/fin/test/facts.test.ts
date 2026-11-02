import { describe, expect, test } from "bun:test"
import { type CompanyFacts, type XbrlFact, extractMetric, newerAnnualFiling } from "../src/sources/sec/facts"
import type { Filing } from "../src/sources/sec/filings"

function fact(input: Partial<XbrlFact> & Pick<XbrlFact, "end" | "val">): XbrlFact {
  return { accn: "0000000000-25-000001", form: "10-K", filed: "2025-11-01", ...input }
}

function company(facts: CompanyFacts["facts"]): CompanyFacts {
  return { cik: 123, entityName: "Example Corp", facts }
}

describe("extractMetric", () => {
  test("merges candidate tags per period, preferring the higher-priority tag", () => {
    const data = company({
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              fact({ start: "2017-01-01", end: "2017-12-31", val: 100, filed: "2018-02-01" }),
              fact({ start: "2018-01-01", end: "2018-12-31", val: 999, filed: "2019-02-01" }),
            ],
          },
        },
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          units: { USD: [fact({ start: "2018-01-01", end: "2018-12-31", val: 120, filed: "2019-02-01" })] },
        },
      },
    })
    const values = extractMetric(data, "revenue", "annual", 10)
    expect(values.map((item) => [item.period_end, item.value, item.tag])).toEqual([
      ["2018-12-31", 120, "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax"],
      ["2017-12-31", 100, "us-gaap:Revenues"],
    ])
  })

  test("the latest filing wins for the same period (restatements)", () => {
    const data = company({
      "us-gaap": {
        NetIncomeLoss: {
          units: {
            USD: [
              fact({ start: "2023-01-01", end: "2023-12-31", val: 50, accn: "a-original", filed: "2024-02-01" }),
              fact({ start: "2023-01-01", end: "2023-12-31", val: 45, accn: "a-restated", filed: "2025-02-01" }),
            ],
          },
        },
      },
    })
    const [value] = extractMetric(data, "net_income", "annual", 10)
    expect(value).toMatchObject({ value: 45, accession: "a-restated", filed: "2025-02-01" })
    expect(value!.filing_url).toBe("https://www.sec.gov/Archives/edgar/data/123/arestated/a-restated-index.htm")
  })

  test("classifies durations into annual and 3-month quarterly periods, skipping year-to-date values", () => {
    const data = company({
      "us-gaap": {
        NetIncomeLoss: {
          units: {
            USD: [
              fact({ start: "2025-01-01", end: "2025-03-31", val: 10, form: "10-Q" }),
              fact({ start: "2025-01-01", end: "2025-06-30", val: 25, form: "10-Q" }),
              fact({ start: "2025-04-01", end: "2025-06-30", val: 15, form: "10-Q" }),
              fact({ start: "2025-01-01", end: "2025-12-31", val: 60 }),
            ],
          },
        },
      },
    })
    expect(extractMetric(data, "net_income", "quarterly", 10).map((item) => item.value)).toEqual([15, 10])
    expect(extractMetric(data, "net_income", "annual", 10).map((item) => item.value)).toEqual([60])
  })

  test("annual balance sheet values come from annual reports only", () => {
    const data = company({
      "us-gaap": {
        Assets: {
          units: {
            USD: [
              fact({ end: "2025-06-30", val: 900, form: "10-Q" }),
              fact({ end: "2024-12-31", val: 800, form: "10-K" }),
              fact({ end: "2023-12-31", val: 700, form: "10-K/A" }),
            ],
          },
        },
      },
    })
    expect(extractMetric(data, "total_assets", "annual", 10).map((item) => item.value)).toEqual([800, 700])
    expect(extractMetric(data, "total_assets", "quarterly", 10).map((item) => item.value)).toEqual([900, 800, 700])
  })

  test("uses the right unit per metric kind and falls back to non-USD currencies", () => {
    const data = company({
      "us-gaap": {
        EarningsPerShareDiluted: { units: { "USD/shares": [fact({ start: "2024-01-01", end: "2024-12-31", val: 2.5 })] } },
      },
      "ifrs-full": {
        Revenue: { units: { EUR: [fact({ start: "2024-01-01", end: "2024-12-31", val: 7, form: "20-F" })] } },
      },
    })
    expect(extractMetric(data, "eps_diluted", "annual", 10)[0]).toMatchObject({ value: 2.5, unit: "USD/shares" })
    expect(extractMetric(data, "revenue", "annual", 10)[0]).toMatchObject({ value: 7, unit: "EUR", tag: "ifrs-full:Revenue" })
  })

  test("respects the limit, newest first", () => {
    const rows = [2020, 2021, 2022, 2023].map((year) => fact({ start: `${year}-01-01`, end: `${year}-12-31`, val: year }))
    const data = company({ "us-gaap": { GrossProfit: { units: { USD: rows } } } })
    expect(extractMetric(data, "gross_profit", "annual", 2).map((item) => item.value)).toEqual([2023, 2022])
  })
})

describe("newerAnnualFiling", () => {
  const filing = (form: string, report_date: string, filed: string): Filing => ({
    form, report_date, filed, accession: "a", accepted_at: null, items: [], description: null, primary_document: null, document_url: null, index_url: "i",
  })
  test("finds the newest annual report past the latest XBRL period", () => {
    const rows = [filing("20-F", "2024-12-31", "2025-04-29"), filing("20-F", "2025-12-31", "2026-04-17"), filing("6-K", "2026-06-30", "2026-08-01")]
    expect(newerAnnualFiling(rows, "2023-12-31")?.report_date).toBe("2025-12-31")
    expect(newerAnnualFiling(rows, "2025-12-31")).toBeUndefined()
  })
})

describe("unit selection", () => {
  test("uses the currency with the newest data, not a stray USD year", () => {
    const data = company({
      "ifrs-full": {
        Revenue: {
          units: {
            USD: [fact({ start: "2017-01-01", end: "2017-12-31", val: 28, form: "20-F" })],
            EUR: [
              fact({ start: "2017-01-01", end: "2017-12-31", val: 23, form: "20-F" }),
              fact({ start: "2025-01-01", end: "2025-12-31", val: 36, form: "20-F" }),
            ],
          },
        },
      },
    })
    expect(extractMetric(data, "revenue", "annual", 5).map((item) => [item.period_end, item.unit])).toEqual([
      ["2025-12-31", "EUR"],
      ["2017-12-31", "EUR"],
    ])
  })
})

test("prefers the reporting currency over a same-period USD convenience translation", () => {
  const data = company({
    "ifrs-full": {
      Revenue: {
        units: {
          TWD: [
            fact({ start: "2023-01-01", end: "2023-12-31", val: 2100, form: "20-F" }),
            fact({ start: "2024-01-01", end: "2024-12-31", val: 2900, form: "20-F" }),
          ],
          USD: [fact({ start: "2024-01-01", end: "2024-12-31", val: 88, form: "20-F" })],
        },
      },
    },
  })
  expect(extractMetric(data, "revenue", "annual", 5)[0]).toMatchObject({ unit: "TWD", value: 2900 })
})
