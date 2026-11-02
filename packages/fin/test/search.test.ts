import { expect, test } from "bun:test"
import { searchFailure } from "../src/sources/sec/search"

test("searchFailure flags EFTS error payloads and passes real results", () => {
  expect(searchFailure(JSON.stringify({ hits: { total: { value: 0 }, hits: [] } }))).toBeUndefined()
  const message = searchFailure(JSON.stringify({ errorType: "ConnectionError", errorMessage: "getaddrinfo EBUSY" }))
  expect(message).toContain("ConnectionError: getaddrinfo EBUSY")
  expect(message).toContain("quote the phrase")
  expect(searchFailure("{}")).toContain("unexpected response")
  expect(searchFailure("<html>")).toBeUndefined()
})
