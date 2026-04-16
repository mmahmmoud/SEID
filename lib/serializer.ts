export function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    subTotal: Number(invoice.subTotal),
    tax: Number(invoice.tax),
    total: Number(invoice.total),

    items: invoice.items.map((item: any) => ({
      ...item,
      price: Number(item.price),
      tax: Number(item.tax ?? 0),
    })),
  };
}

export function serializeInvoices(invoices: any[]) {
  return invoices.map(serializeInvoice);
}
