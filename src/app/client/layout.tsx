"use client";

import { ReactNode } from "react";
import { ClientShell } from "@/components/client/Shell";

export default function Layout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
