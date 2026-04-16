import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  try {
    if (req.method === "PATCH") {
      const { status } = req.body;
      const installment = await prisma.invoiceInstallment.update({
        where: { id },
        data: {
          status,
          paidAt: status === "PAID" ? new Date() : null,
        },
      });

      // Check if all installments are paid → auto-mark invoice as PAID
      if (status === "PAID") {
        const allInstallments = await prisma.invoiceInstallment.findMany({
          where: { invoiceId: installment.invoiceId },
        });
        if (allInstallments.every((i) => i.status === "PAID")) {
          await prisma.invoice.update({
            where: { id: installment.invoiceId },
            data: { status: "PAID" },
          });
        }
      }

      return res.status(200).json(installment);
    }

    if (req.method === "DELETE") {
      await prisma.invoiceInstallment.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
