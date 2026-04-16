import type { NextApiRequest, NextApiResponse } from "next";
import { createWebhook, listWebhooks, deleteWebhook } from "@/lib/woocommerce";

const WEBHOOK_TOPICS = [
  { topic: "order.created",  name: "ERP — Order Created"  },
  { topic: "order.updated",  name: "ERP — Order Updated"  },
  { topic: "order.deleted",  name: "ERP — Order Deleted"  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET ?? "";

  if (!baseUrl) {
    return res.status(500).json({ message: "NEXTAUTH_URL or NEXT_PUBLIC_BASE_URL not set in .env" });
  }

  const deliveryUrl = `${baseUrl}/api/woocommerce/webhook`;

  // ── GET: list current webhooks ──────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const hooks = await listWebhooks();
      return res.status(200).json({ webhooks: hooks });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ── POST: register all required webhooks ────────────────────────────────────
  if (req.method === "POST") {
    try {
      const existing = await listWebhooks();
      const results = [];

      for (const wh of WEBHOOK_TOPICS) {
        // Skip if already registered pointing to same URL
        const alreadyExists = existing.find(
          (e) => e.topic === wh.topic && e.delivery_url === deliveryUrl && e.status === "active"
        );

        if (alreadyExists) {
          results.push({ topic: wh.topic, status: "already_exists", id: alreadyExists.id });
          continue;
        }

        const created = await createWebhook({
          name: wh.name,
          topic: wh.topic,
          delivery_url: deliveryUrl,
          secret: webhookSecret,
        });

        results.push({ topic: wh.topic, status: "created", id: created.id });
      }

      return res.status(200).json({ results, deliveryUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ── DELETE: remove all ERP webhooks ─────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const existing = await listWebhooks();
      const erpHooks = existing.filter((h) => h.delivery_url === deliveryUrl);

      for (const hook of erpHooks) {
        await deleteWebhook(hook.id);
      }

      return res.status(200).json({ deleted: erpHooks.length });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).end();
}
