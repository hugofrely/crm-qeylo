"use client"

import { motion } from "motion/react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function PolitiqueConfidentialite() {
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
              Politique de confidentialite
            </h1>
            <p className="mt-3 text-muted-foreground">
              Protection et traitement de vos donnees personnelles.
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold mb-3">
                1. Responsable du traitement
              </h2>
              <div className="space-y-1 text-sm text-foreground/80 leading-relaxed">
                <p>Qeylo SASU</p>
                <p>Siege social : Avignon, France</p>
                <p>
                  Email :{" "}
                  <a
                    href="mailto:hello@qeylo.com"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    hello@qeylo.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                2. Donnees collectees
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>
                  <strong>Donnees de compte :</strong> nom, prenom, adresse
                  email, mot de passe (chiffre)
                </li>
                <li>
                  <strong>Donnees d&apos;utilisation :</strong> logs de
                  connexion, adresse IP, type de navigateur, pages consultees
                </li>
                <li>
                  <strong>Donnees CRM :</strong> contacts, deals, taches,
                  notes, workflows crees par l&apos;utilisateur
                </li>
                <li>
                  <strong>Donnees de communication :</strong> emails envoyes et
                  recus via les integrations
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                3. Finalites du traitement
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>Fourniture et fonctionnement du service Qeylo</li>
                <li>
                  Amelioration et personnalisation de l&apos;experience
                  utilisateur
                </li>
                <li>
                  Communication relative au service (notifications, alertes,
                  rappels)
                </li>
                <li>Securite et prevention des fraudes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                4. Base legale (RGPD)
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>
                  <strong>Execution du contrat (Article 6.1.b) :</strong> pour
                  la fourniture du service
                </li>
                <li>
                  <strong>Interet legitime (Article 6.1.f) :</strong> pour
                  l&apos;amelioration du service et la securite
                </li>
                <li>
                  <strong>Consentement (Article 6.1.a) :</strong> pour les
                  communications marketing optionnelles
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                5. Duree de conservation
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>
                  <strong>Donnees de compte :</strong> conservees pendant toute
                  la duree de l&apos;utilisation du service
                </li>
                <li>
                  <strong>Apres suppression du compte :</strong> les donnees
                  sont conservees 3 ans a des fins legales, puis supprimees
                  definitivement
                </li>
                <li>
                  <strong>Logs de connexion :</strong> 12 mois
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                6. Destinataires des donnees
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>DigitalOcean (hebergement des donnees)</li>
                <li>Aucune vente ou location de donnees a des tiers</li>
                <li>
                  Aucun partage de donnees a des fins publicitaires
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                7. Transferts hors Union europeenne
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Les donnees peuvent etre hebergees sur des serveurs
                  DigitalOcean situes hors UE.
                </p>
                <p>
                  Ces transferts sont encadres par les Clauses Contractuelles
                  Types de la Commission europeenne.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                8. Droits des utilisateurs
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>
                  <strong>Droit d&apos;acces :</strong> obtenir une copie de vos
                  donnees personnelles
                </li>
                <li>
                  <strong>Droit de rectification :</strong> corriger des donnees
                  inexactes
                </li>
                <li>
                  <strong>Droit a l&apos;effacement :</strong> demander la
                  suppression de vos donnees
                </li>
                <li>
                  <strong>Droit a la portabilite :</strong> recevoir vos donnees
                  dans un format structure
                </li>
                <li>
                  <strong>Droit d&apos;opposition :</strong> vous opposer au
                  traitement de vos donnees
                </li>
                <li>
                  <strong>Droit a la limitation :</strong> restreindre le
                  traitement de vos donnees
                </li>
              </ul>
              <div className="mt-4 space-y-2 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Pour exercer ces droits :{" "}
                  <a
                    href="mailto:hello@qeylo.com"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    hello@qeylo.com
                  </a>
                </p>
                <p>
                  Vous disposez egalement du droit d&apos;introduire une
                  reclamation aupres de la{" "}
                  <a
                    href="https://www.cnil.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    CNIL
                  </a>
                  .
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">9. Cookies</h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Qeylo utilise uniquement des cookies fonctionnels necessaires
                  au bon fonctionnement du service (authentification,
                  preferences).
                </p>
                <p>
                  Aucun cookie tiers publicitaire ou de tracking n&apos;est
                  utilise.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">10. Securite</h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                <li>Chiffrement des donnees en transit (HTTPS/TLS)</li>
                <li>
                  Authentification securisee par JWT avec refresh token
                </li>
                <li>Isolation des donnees par organisation</li>
                <li>Mots de passe chiffres (hachage bcrypt)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                11. Modifications de la politique
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Qeylo se reserve le droit de modifier la presente politique de
                  confidentialite.
                </p>
                <p>
                  Les utilisateurs seront informes par email de tout changement
                  substantiel.
                </p>
                <p>
                  La continuation de l&apos;utilisation du service vaut
                  acceptation des modifications.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">12. Contact DPO</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Pour toute question relative a vos donnees personnelles :{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                >
                  hello@qeylo.com
                </a>
              </p>
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
