import * as React from "react"
import { NavigationLayout } from "@/components/navigation-layout"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavigationLayout>
      {children}
    </NavigationLayout>
  )
}