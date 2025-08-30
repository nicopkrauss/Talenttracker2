import { redirect } from "next/navigation"

export default function HomePage() {
  // The middleware will handle authentication and redirect to the appropriate page
  // This page should never be reached for authenticated users
  redirect("/talent")
}