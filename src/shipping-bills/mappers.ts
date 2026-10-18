import { CURRENCY_MAP } from './constants'
import { SavedBill, ShippingBillFormValues, emptyBill, emptyInvoice } from './model'

/**
 * Transforms form values into the payload structure required by POST /api/shipping-bills
 * as defined in shipping_bill.http
 */
export function toHttpShippingBillPayload(values: ShippingBillFormValues) {
  const parseNum = (val: any) => (val != null && val !== '' ? Number(val) : undefined)

  const parseDate = (dateStr?: string) => {
    if (!dateStr) return undefined
    // Returns days since Unix Epoch (1970-01-01)
    return Math.floor(new Date(dateStr).getTime() / 86400000)
  }

  const parseCurrency = (c?: string) => (c ? CURRENCY_MAP[c] || parseNum(c) || 840 : 840)

  return {
    chaId: 1000,
    jobDate: parseDate(values.jobDate),
    exporterId: parseNum(values.exporterId),
    exporterBranchId: parseNum(values.exporterBranchId),
    consigneeId: parseNum(values.consigneeId),
    consigneeAddressId: parseNum(values.consigneeBranchId),
    originStateCode: parseNum(values.originStateCode),
    loadingPort: values.loadingPort,
    finalDestinationPort: values.finalDestinationPort,
    dischargePort: values.dischargePort || values.finalDestinationPort,
    sealType: parseNum(values.sealType),
    natureOfCargo: parseNum(values.natureOfCargo),
    grossWeight: parseNum(values.grossWeight),
    netWeight: parseNum(values.netWeight),
    measurementUnit: values.measurementUnit === 'KG' ? 'KGS' : values.measurementUnit,
    totalPackages: parseNum(values.totalPackages),
    marksAndNumbers: values.marksAndNumbers,
    loosePackets: parseNum(values.loosePackets),
    numberOfContainers: values.containers.length || parseNum(values.numberOfContainers) || 0,
    invoices: (values.invoices || []).map((inv, index) => ({
      serialNumber: index + 1,
      invoiceNumber: inv.invoiceNumber,
      date: parseDate(inv.invoiceDate),
      currency: parseCurrency(inv.currency),
      contractType: parseNum(inv.contractType),
      buyerId: parseNum(inv.buyerSameAsConsignee ? values.consigneeId : inv.buyerId),
      buyerAddressId: parseNum(inv.buyerSameAsConsignee ? values.consigneeBranchId : inv.buyerBranchId),
      freightCurrency: parseCurrency(inv.freightCurrency || inv.currency),
      freightAmount: parseNum(inv.freightAmount) || 0,
      insuranceCurrency: parseCurrency(inv.insuranceCurrency || inv.currency),
      insuranceAmount: parseNum(inv.insuranceAmount) || 0,
      commissionCurrency: parseCurrency(inv.commissionCurrency || inv.currency),
      commissionAmount: parseNum(inv.commissionAmount) || 0,
      discountCurrency: parseCurrency(inv.discountCurrency || inv.currency),
      discountAmount: parseNum(inv.discountAmount) || 0,
      otherDeductionsCurrency: parseCurrency(inv.otherDeductionsCurrency || inv.currency),
      otherDeductionsAmount: parseNum(inv.otherDeductionsAmount) || 0,
      freightInsauranceIncluded: parseNum(inv.freightInsuranceIncluded),
      packingCharges: parseNum(inv.packingCharges) || 0,
      natureOfPayment: parseNum(inv.natureOfPayment),
      periodOfPayment: parseNum(inv.periodOfPayment),
      items: (inv.items || []).map((item, itemIdx) => ({
        itemSerialNumber: itemIdx + 1,
        schemeCode: item.schemeCode,
        ritcCode: item.ritcCode,
        goodsDescription: item.goodsDescription1,
        unitOfMeasurement: item.unitOfMeasurement,
        quantity: parseNum(item.quantity),
        unitPrice: parseNum(item.unitPrice),
        unitOfRate: item.unitOfRate || item.unitOfMeasurement,
        noOfUnits: parseNum(item.numberOfUnits) || 1,
        presentMarketValue: parseNum(item.presentMarketValue),
        thirdParty: Boolean(item.thirdPartyItem),
        rewardItem: Boolean(item.rewardItem),
        totalPackage: parseNum(item.totalPackage),
        endUseOfItem: item.endUseOfItem,
        igstPaymentStatus: parseNum(item.igstPaymentStatus),
        originDistrictCode: parseNum(item.originDistrictCode),
        tradeAgreementsCode: item.tradeAgreementsCode,
        drawbackSerialNumber: item.drawbackSerialNumber,
        drawbackQuantity: parseNum(item.drawbackQuantity)
      }))
    })),
    packgingList: (values.packingRanges || []).map((range) => ({
      packingNumberFrom: parseNum(range.packingNumberFrom),
      packingNumberTo: parseNum(range.packingNumberTo),
      packingCode: range.packingCode
    })),
    documents: (values.documents || []).map((doc, docIdx) => ({
      invoiceSerialNumber: parseNum(doc.invoiceSerialNumber) || 1,
      itemSerialNumber: parseNum(doc.itemSerialNumber) || 1,
      serialNumber: docIdx + 1,
      imageReferenceNumber: doc.imageReferenceNumber,
      documentTypeCode: doc.documentTypeCode,
      documentIssueDate: parseDate(doc.documentIssueDate),
      useDefault: true,
      fileType: parseNum(doc.fileType) || 1
    }))
  }
}

export function normalizeApiBill(raw: any): SavedBill {
  if (!raw) return { id: 0, created: '', updated: '', values: emptyBill() }
  const formatIsoString = (val: any) => {
    if (!val) return new Date().toISOString()
    if (typeof val === 'number') {
      const ms = val < 10000000000 ? val * 1000 : val
      const d = new Date(ms)
      return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()
    }
    const d = new Date(val)
    return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()
  }

  if (raw.values && raw.id) {
    return {
      ...raw,
      updated: formatIsoString(raw.updated),
      created: formatIsoString(raw.created)
    } as SavedBill
  }

  const formatEpochDays = (days?: any) => {
    if (typeof days === 'number') {
      const d = new Date(days * 86400000)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    return String(days || '')
  }

  const id = Number(raw.id ?? raw.shippingBillId ?? raw.chaId ?? Math.floor(Math.random() * 100000))
  const jobDateStr = formatEpochDays(raw.jobDate)
  const updated = formatIsoString(raw.updatedAt || raw.updated || raw.createdAt)
  const created = formatIsoString(raw.createdAt || raw.created || updated)

  const values: ShippingBillFormValues = {
    ...emptyBill(),
    jobNumber: raw.jobNumber ? String(raw.jobNumber) : `JOB-${id}`,
    jobDate: jobDateStr || new Date().toISOString().split('T')[0],
    exporterId: String(raw.exporterId ?? ''),
    exporterBranchId: String(raw.exporterBranchId ?? ''),
    exporterName: raw.exporterName || '',
    consigneeId: String(raw.consigneeId ?? ''),
    consigneeBranchId: String(raw.consigneeAddressId ?? raw.consigneeBranchId ?? ''),
    consigneeName: raw.consigneeName || '',
    originStateCode: raw.originStateCode ? String(raw.originStateCode) : '',
    loadingPort: raw.loadingPort || '',
    finalDestinationPort: raw.destinationPort || raw.finalDestinationPort || '',
    dischargePort: raw.dischargePort || raw.destinationPort || raw.finalDestinationPort || '',
    sealType: raw.sealType ? String(raw.sealType) : '3',
    natureOfCargo: raw.natureOfCargo ? String(raw.natureOfCargo) : '1',
    grossWeight: raw.grossWeight ? String(raw.grossWeight) : '',
    netWeight: raw.netWeight ? String(raw.netWeight) : '',
    measurementUnit: raw.measurementUnit || 'KGS',
    totalPackages: raw.totalPackages ? String(raw.totalPackages) : '',
    marksAndNumbers: raw.marksAndNumbers || '',
    loosePackets: raw.loosePackets ? String(raw.loosePackets) : '0',
    numberOfContainers: raw.numberOfContainers ? String(raw.numberOfContainers) : '0',
    containers: raw.containers || [],
    invoices:
      Array.isArray(raw.invoices) && raw.invoices.length > 0
        ? raw.invoices.map((inv: any, idx: number) => ({
            invoiceNumber: inv.invoiceNumber || `INV-${idx + 1}`,
            invoiceDate: formatEpochDays(inv.date || inv.invoiceDate) || new Date().toISOString().split('T')[0],
            currency:
              typeof inv.currency === 'number'
                ? inv.currency === 840
                  ? 'USD'
                  : inv.currency === 356
                    ? 'INR'
                    : String(inv.currency)
                : inv.currency || 'USD',
            contractType: String(inv.contractType ?? '1'),
            buyerId: String(inv.buyerId ?? ''),
            buyerBranchId: String(inv.buyerAddressId ?? inv.buyerBranchId ?? ''),
            buyerSameAsConsignee: inv.buyerId == null || String(inv.buyerId) === String(raw.consigneeId),
            freightAmount: inv.freightAmount ? String(inv.freightAmount) : '',
            insuranceAmount: inv.insuranceAmount ? String(inv.insuranceAmount) : '',
            items:
              Array.isArray(inv.items) && inv.items.length > 0
                ? inv.items.map((item: any) => ({
                    schemeCode: item.schemeCode || '',
                    ritcCode: item.ritcCode || '',
                    goodsDescription1: item.goodsDescription || item.goodsDescription1 || '',
                    quantity: item.quantity ? String(item.quantity) : '',
                    unitOfMeasurement: item.unitOfMeasurement || 'PCS',
                    unitPrice: item.unitPrice ? String(item.unitPrice) : '',
                    unitOfRate: item.unitOfRate || item.unitOfMeasurement || 'PCS',
                    numberOfUnits: item.noOfUnits ? String(item.noOfUnits) : '1',
                    presentMarketValue: item.presentMarketValue ? String(item.presentMarketValue) : '',
                    thirdPartyItem: Boolean(item.thirdParty),
                    rewardItem: Boolean(item.rewardItem),
                    totalPackage: item.totalPackage ? String(item.totalPackage) : '',
                    endUseOfItem: item.endUseOfItem || '',
                    igstPaymentStatus: item.igstPaymentStatus ? String(item.igstPaymentStatus) : '2',
                    originDistrictCode: item.originDistrictCode ? String(item.originDistrictCode) : '',
                    tradeAgreementsCode: item.tradeAgreementsCode || '',
                    drawbackSerialNumber: item.drawbackSerialNumber || '',
                    drawbackQuantity: item.drawbackQuantity ? String(item.drawbackQuantity) : ''
                  }))
                : []
          }))
        : [emptyInvoice()],
    packingRanges: Array.isArray(raw.packgingList || raw.packingRanges)
      ? (raw.packgingList || raw.packingRanges).map((p: any) => ({
          packingNumberFrom: String(p.packingNumberFrom ?? ''),
          packingNumberTo: String(p.packingNumberTo ?? ''),
          packingCode: p.packingCode || 'CTN'
        }))
      : [],
    documents: Array.isArray(raw.documents)
      ? raw.documents.map((doc: any) => ({
          invoiceSerialNumber: String(doc.invoiceSerialNumber ?? '1'),
          itemSerialNumber: String(doc.itemSerialNumber ?? '1'),
          imageReferenceNumber: doc.imageReferenceNumber || '',
          documentTypeCode: doc.documentTypeCode || '',
          documentIssueDate: formatEpochDays(doc.documentIssueDate) || new Date().toISOString().split('T')[0],
          fileType: String(doc.fileType ?? '1')
        }))
      : []
  }

  return {
    id,
    created,
    updated,
    values,
    payload: raw
  }
}

export function normalizeApiBills(raw: any): SavedBill[] {
  if (!raw) return []
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.bills)
        ? raw.bills
        : Array.isArray(raw.shippingBills)
          ? raw.shippingBills
          : Array.isArray(raw.items)
            ? raw.items
            : []
  return list.map(normalizeApiBill)
}
