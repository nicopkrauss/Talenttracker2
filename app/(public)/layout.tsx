import * as React from "react"
import { PublicLayout } from "@/components/auth/public-layout"

export default function PublicRoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PublicLayout>
      {children}
    </PublicLayout>
  )
}