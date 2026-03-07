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
            className="mb-14"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Legal
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Mentions legales
            </h1>
            <p className="mt-3 text-muted-foreground">
              Informations legales relatives au site Qeylo.
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold mb-3">
                1. Editeur du site
              </h2>
              <div className="space-y-1 text-sm text-foreground/80 leading-relaxed">
                <p>Raison sociale : Qeylo</p>
                <p>
                  Forme juridique : SASU (Societe par Actions Simplifiee
                  Unipersonnelle)
                </p>
                <p>Siege social : Avignon, France</p>
                <p>SIRET : 922 082 698</p>
                <p>Capital social : 100 &euro;</p>
                <p>Representant legal : Hugo Frely, President</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                2. Directeur de la publication
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">Hugo Frely</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">3. Hebergement</h2>
              <div className="space-y-1 text-sm text-foreground/80 leading-relaxed">
                <p>DigitalOcean, LLC</p>
                <p>101 6th Avenue, New York, NY 10013, Etats-Unis</p>
                <p>
                  Site :{" "}
                  <a
                    href="https://www.digitalocean.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    www.digitalocean.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">4. Contact</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Email :{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                >
                  hello@qeylo.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                5. Propriete intellectuelle
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  L&apos;ensemble du contenu du site Qeylo (textes, graphismes,
                  logos, icones, images, logiciels) est la propriete exclusive de
                  Qeylo SASU ou de ses partenaires et est protege par les lois
                  francaises et internationales relatives a la propriete
                  intellectuelle.
                </p>
                <p>
                  Toute reproduction, representation, modification, publication,
                  transmission ou denaturation, totale ou partielle, du site ou
                  de son contenu, par quelque procede que ce soit, et sur quelque
                  support que ce soit, est interdite sans l&apos;autorisation
                  ecrite prealable de Qeylo SASU.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                6. Limitation de responsabilite
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Qeylo SASU s&apos;efforce d&apos;assurer au mieux
                  l&apos;exactitude et la mise a jour des informations diffusees
                  sur ce site. Toutefois, Qeylo SASU ne peut garantir
                  l&apos;exactitude, la precision ou l&apos;exhaustivite des
                  informations mises a disposition.
                </p>
                <p>
                  Qeylo SASU decline toute responsabilite pour toute
                  imprecision, inexactitude ou omission portant sur des
                  informations disponibles sur le site.
                </p>
                <p>
                  Qeylo SASU ne saurait etre tenue responsable des dommages
                  directs ou indirects resultant de l&apos;acces ou de
                  l&apos;utilisation du site.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                7. Droit applicable
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Les presentes mentions legales sont regies par le droit
                  francais.
                </p>
                <p>
                  En cas de litige, et apres tentative de resolution amiable,
                  competence est attribuee au Tribunal de commerce
                  d&apos;Avignon.
                </p>
              </div>
            </section>
          </div>

          <p className="mt-16 text-xs text-muted-foreground">
            Derniere mise a jour : 6 mars 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
