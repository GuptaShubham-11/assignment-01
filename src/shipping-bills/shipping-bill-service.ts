import { BASE_URL, get, post } from '../shared/fetcher'
import { generateFlatFileContent, triggerBlobDownload } from './flat-file'
import { normalizeApiBills, toHttpShippingBillPayload } from './mappers'
import { API_SEED_SHIPPING_BILLS } from './mock-data'
import { SavedBill, ShippingBillFormValues } from './model'

let internalBills: SavedBill[] = normalizeApiBills(API_SEED_SHIPPING_BILLS)

export const shippingBillService = {
  /**
   * Return initial in-memory bills
   */
  getInitialBills(): SavedBill[] {
    return internalBills
  },

  /**
   * Find bill by id
   */
  getById(id: string | number): SavedBill | undefined {
    return internalBills.find((b) => String(b.id) === String(id))
  },

  /**
   * GET /api/shipping-bills
   * List all shipping bills (per shipping_bill.http)
   */
  async list(): Promise<SavedBill[]> {
    try {
      const data = await get<SavedBill[]>('/api/shipping-bills')
      const normalized = normalizeApiBills(data)
      if (normalized && normalized.length > 0) {
        internalBills = normalized
        return normalized
      }
    } catch {
      // Fallback to internal API seed records
    }
    return internalBills
  },

  /**
   * GET /api/shipping-bills/:id/flat-file
   * Fetch flat file text or payload (per shipping_bill.http)
   */
  async getFlatFile(id: string | number) {
    // Auth + Accept headers are added by the fetcher
    return get(`/api/shipping-bills/${id}/flat-file`)
  },

  /**
   * Download shipping bill flat file (.sb) directly in the browser.
   * Tries backend API first; falls back to generating .sb flat file locally from bill data.
   */
  async downloadFlatFile(
    id: string | number,
    billData?: SavedBill,
    fallbackFilename?: string
  ): Promise<{ source: 'api' | 'local' }> {
    const filename = fallbackFilename || `shipping_bill_${id}.sb`

    try {
      // The fetcher throws ApiError on non-2xx, which lands in the catch below
      const apiBlob = await get<Blob>(`/api/shipping-bills/${id}/flat-file`, {
        responseType: 'blob'
      })

      let blob = apiBlob

      if (apiBlob.type.includes('application/json')) {
        const json = JSON.parse(await apiBlob.text())
        const content =
          typeof json === 'string' ? json : json.file || json.content || json.data || JSON.stringify(json, null, 2)
        blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      }

      triggerBlobDownload(blob, filename)
      return { source: 'api' }
    } catch {
      // Backend API offline or unreachable - fall back to local generation
    }

    if (billData) {
      const flatFileContent = generateFlatFileContent(billData)
      const blob = new Blob([flatFileContent], { type: 'text/plain;charset=utf-8' })
      const safeJob = billData.values.jobNumber || billData.id
      triggerBlobDownload(blob, `shipping_bill_${safeJob}.sb`)
      return { source: 'local' }
    }

    throw new Error(`Backend server (${BASE_URL}) is offline and no local bill data was found.`)
  },

  /**
   * POST /api/shipping-bills
   * Upsert shipping bill (per shipping_bill.http)
   */
  async upsert(values: ShippingBillFormValues) {
    const payload = toHttpShippingBillPayload(values)
    return post('/api/shipping-bills', payload)
  }
}
