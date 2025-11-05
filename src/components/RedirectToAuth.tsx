"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const RedirectToAuth = () => {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth");
  }, [router]);

  return null;
};

