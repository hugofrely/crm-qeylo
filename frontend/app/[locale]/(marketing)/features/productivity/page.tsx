"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { FeatureCategoryPage } from "@/components/landing/feature-category-page"

export default function FeaturesProductivityPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <FeatureCategoryPage category="productivity" />
      </main>
      <Footer />
    </>
  )
}
