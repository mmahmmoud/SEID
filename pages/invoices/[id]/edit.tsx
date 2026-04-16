// pages/invoices/[id]/edit.tsx
// Redirect to the canonical edit page to avoid duplicate route confusion
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function EditRedirect() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      router.replace(`/invoices/edit/${id}`);
    }
  }, [id]);

  return null;
}
