import { useCallback, useEffect, useRef, useState } from "react"
import { fetchAudit, USE_MOCK_DATA } from "../lib/api.js"
import { normalizeAuditRecord } from "../lib/validation.js"

/**
 * Fetches paginated audit history from GET /audit?page&limit.
 *
 * Exposes loading/error/empty states so the table can render each cleanly.
 * Records are normalized (source_values JSON string parsed) before display.
 */
export function useAudit({ initialPage = 1, limit = 25 } = {}) {
  const [page, setPage] = useState(initialPage)
  const [state, setState] = useState({
    status: "loading", // loading | success | error
    records: [],
    total: 0,
    error: null,
  })
  const reqIdRef = useRef(0)

  const load = useCallback(
    async (targetPage) => {
      const p = targetPage ?? page
      const reqId = ++reqIdRef.current
      setState((s) => ({ ...s, status: "loading", error: null }))
      try {
        let data
        if (USE_MOCK_DATA) {
          const mod = await import("../data/mockData.js")
          data = mod.generateMockAuditPage(p, limit)
          // simulate latency
          await new Promise((r) => setTimeout(r, 250))
        } else {
          data = await fetchAudit(p, limit)
        }
        if (reqId !== reqIdRef.current) return // stale response
        const rawRecords = Array.isArray(data?.records) ? data.records : []
        const records = rawRecords
          .map(normalizeAuditRecord)
          .filter(Boolean)
        setState({
          status: "success",
          records,
          total: typeof data?.total === "number" ? data.total : records.length,
          error: null,
        })
      } catch (err) {
        if (reqId !== reqIdRef.current) return
        setState({
          status: "error",
          records: [],
          total: 0,
          error: err?.message || "Failed to load audit log",
        })
      }
    },
    [page, limit],
  )

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.max(1, Math.ceil(state.total / limit))

  return {
    ...state,
    page,
    limit,
    totalPages,
    setPage,
    reload: () => load(page),
  }
}
