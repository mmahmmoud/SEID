import { prisma } from "@/lib/prisma"

export async function createInvoice(data: any) {
  const subTotal = data.items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  )

  const tax = subTotal * 0.15
  const total = subTotal + tax

  return await prisma.invoice.create({
    data: {
      clientId: data.clientId,
      status: data.status || "UNPAID",
      subTotal,
      tax,
      total,
      items: {
        create: data.items.map((item: any) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: true,
      client: true,
    },
  })
}

export async function getInvoices() {
  return await prisma.invoice.findMany({
    include: {
      client: true,
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}