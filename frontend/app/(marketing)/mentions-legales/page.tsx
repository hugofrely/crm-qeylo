"use client"

import { motion } from "motion/react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function MentionsLegales() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Mentions légales
            </h1>
            <p className="mt-2 text-muted-foreground">
              Informations légales relatives au site Qeylo.
            </p>
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            {/* 1. Éditeur du site */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                1. Éditeur du site
              </h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Raison sociale : Qeylo</p>
                <p>
                  Forme juridique : SASU (Société par Actions Simplifiée
                  Unipersonnelle)
                </p>
                <p>Siège social : Avignon, France</p>
                <p>SIRET : 922 082 698</p>
                <p>Capital social : 100 €</p>
                <p>Représentant légal : Hugo Frely, Président</p>
              </div>
            </section>

            {/* 2. Directeur de la publication */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                2. Directeur de la publication
              </h2>
              <p className="text-sm text-muted-foreground">Hugo Frely</p>
            </section>

            {/* 3. Hébergement */}
            <section>
              <h2 className="text-lg font-semibold mb-3">3. Hébergement</h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>DigitalOcean, LLC</p>
                <p>101 6th Avenue, New York, NY 10013, États-Unis</p>
                <p>
                  Site :{" "}
                  <a
                    href="https://www.digitalocean.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    www.digitalocean.com
                  </a>
                </p>
              </div>
            </section>

            {/* 4. Contact */}
            <section>
              <h2 className="text-lg font-semibold mb-3">4. Contact</h2>
              <p className="text-sm text-muted-foreground">
                Email :{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="underline hover:text-foreground transition-colors"
                >
                  hello@qeylo.com
                </a>
              </p>
            </section>

            {/* 5. Propriété intellectuelle */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                5. Propriété intellectuelle
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  L&apos;ensemble du contenu du site Qeylo (textes, graphismes,
                  logos, icônes, images, logiciels) est la propriété exclusive de
                  Qeylo SASU ou de ses partenaires et est protégé par les lois
                  françaises et internationales relatives à la propriété
                  intellectuelle.
                </p>
                <p>
                  Toute reproduction, représentation, modification, publication,
                  transmission ou dénaturation, totale ou partielle, du site ou
                  de son contenu, par quelque procédé que ce soit, et sur quelque
                  support que ce soit, est interdite sans l&apos;autorisation
                  écrite préalable de Qeylo SASU.
                </p>
              </div>
            </section>

            {/* 6. Limitation de responsabilité */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                6. Limitation de responsabilité
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Qeylo SASU s&apos;efforce d&apos;assurer au mieux
                  l&apos;exactitude et la mise à jour des informations diffusées
                  sur ce site. Toutefois, Qeylo SASU ne peut garantir
                  l&apos;exactitude, la précision ou l&apos;exhaustivité des
                  informations mises à disposition.
                </p>
                <p>
                  Qeylo SASU décline toute responsabilité pour toute
                  imprécision, inexactitude ou omission portant sur des
                  informations disponibles sur le site.
                </p>
                <p>
                  Qeylo SASU ne saurait être tenue responsable des dommages
                  directs ou indirects résultant de l&apos;accès ou de
                  l&apos;utilisation du site.
                </p>
              </div>
            </section>

            {/* 7. Droit applicable */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                7. Droit applicable
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Les présentes mentions légales sont régies par le droit
                  français.
                </p>
                <p>
                  En cas de litige, et après tentative de résolution amiable,
                  compétence est attribuée au Tribunal de commerce
                  d&apos;Avignon.
                </p>
              </div>
            </section>
          </div>

          {/* Date */}
          <p className="mt-16 text-xs text-muted-foreground">
            Dernière mise à jour : 6 mars 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
