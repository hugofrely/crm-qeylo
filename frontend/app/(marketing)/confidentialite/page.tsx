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
            className="mb-12"
          >
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Politique de confidentialité
            </h1>
            <p className="mt-2 text-muted-foreground">
              Protection et traitement de vos données personnelles.
            </p>
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            {/* 1. Responsable du traitement */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                1. Responsable du traitement
              </h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Qeylo SASU</p>
                <p>Siège social : Avignon, France</p>
                <p>
                  Email :{" "}
                  <a
                    href="mailto:hello@qeylo.com"
                    className="underline hover:text-foreground transition-colors"
                  >
                    hello@qeylo.com
                  </a>
                </p>
              </div>
            </section>

            {/* 2. Données collectées */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                2. Données collectées
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>
                  <strong>Données de compte :</strong> nom, prénom, adresse
                  email, mot de passe (chiffré)
                </li>
                <li>
                  <strong>Données d&apos;utilisation :</strong> logs de
                  connexion, adresse IP, type de navigateur, pages consultées
                </li>
                <li>
                  <strong>Données CRM :</strong> contacts, deals, tâches,
                  notes, workflows créés par l&apos;utilisateur
                </li>
                <li>
                  <strong>Données de communication :</strong> emails envoyés et
                  reçus via les intégrations
                </li>
              </ul>
            </section>

            {/* 3. Finalités du traitement */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                3. Finalités du traitement
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Fourniture et fonctionnement du service Qeylo</li>
                <li>
                  Amélioration et personnalisation de l&apos;expérience
                  utilisateur
                </li>
                <li>
                  Communication relative au service (notifications, alertes,
                  rappels)
                </li>
                <li>Sécurité et prévention des fraudes</li>
              </ul>
            </section>

            {/* 4. Base légale (RGPD) */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                4. Base légale (RGPD)
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>
                  <strong>Exécution du contrat (Article 6.1.b) :</strong> pour
                  la fourniture du service
                </li>
                <li>
                  <strong>Intérêt légitime (Article 6.1.f) :</strong> pour
                  l&apos;amélioration du service et la sécurité
                </li>
                <li>
                  <strong>Consentement (Article 6.1.a) :</strong> pour les
                  communications marketing optionnelles
                </li>
              </ul>
            </section>

            {/* 5. Durée de conservation */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                5. Durée de conservation
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>
                  <strong>Données de compte :</strong> conservées pendant toute
                  la durée de l&apos;utilisation du service
                </li>
                <li>
                  <strong>Après suppression du compte :</strong> les données
                  sont conservées 3 ans à des fins légales, puis supprimées
                  définitivement
                </li>
                <li>
                  <strong>Logs de connexion :</strong> 12 mois
                </li>
              </ul>
            </section>

            {/* 6. Destinataires des données */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                6. Destinataires des données
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>DigitalOcean (hébergement des données)</li>
                <li>Aucune vente ou location de données à des tiers</li>
                <li>
                  Aucun partage de données à des fins publicitaires
                </li>
              </ul>
            </section>

            {/* 7. Transferts hors Union européenne */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                7. Transferts hors Union européenne
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Les données peuvent être hébergées sur des serveurs
                  DigitalOcean situés hors UE.
                </p>
                <p>
                  Ces transferts sont encadrés par les Clauses Contractuelles
                  Types de la Commission européenne.
                </p>
              </div>
            </section>

            {/* 8. Droits des utilisateurs */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                8. Droits des utilisateurs
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>
                  <strong>Droit d&apos;accès :</strong> obtenir une copie de vos
                  données personnelles
                </li>
                <li>
                  <strong>Droit de rectification :</strong> corriger des données
                  inexactes
                </li>
                <li>
                  <strong>Droit à l&apos;effacement :</strong> demander la
                  suppression de vos données
                </li>
                <li>
                  <strong>Droit à la portabilité :</strong> recevoir vos données
                  dans un format structuré
                </li>
                <li>
                  <strong>Droit d&apos;opposition :</strong> vous opposer au
                  traitement de vos données
                </li>
                <li>
                  <strong>Droit à la limitation :</strong> restreindre le
                  traitement de vos données
                </li>
              </ul>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Pour exercer ces droits :{" "}
                  <a
                    href="mailto:hello@qeylo.com"
                    className="underline hover:text-foreground transition-colors"
                  >
                    hello@qeylo.com
                  </a>
                </p>
                <p>
                  Vous disposez également du droit d&apos;introduire une
                  réclamation auprès de la{" "}
                  <a
                    href="https://www.cnil.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    CNIL
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* 9. Cookies */}
            <section>
              <h2 className="text-lg font-semibold mb-3">9. Cookies</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Qeylo utilise uniquement des cookies fonctionnels nécessaires
                  au bon fonctionnement du service (authentification,
                  préférences).
                </p>
                <p>
                  Aucun cookie tiers publicitaire ou de tracking n&apos;est
                  utilisé.
                </p>
              </div>
            </section>

            {/* 10. Sécurité */}
            <section>
              <h2 className="text-lg font-semibold mb-3">10. Sécurité</h2>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Chiffrement des données en transit (HTTPS/TLS)</li>
                <li>
                  Authentification sécurisée par JWT avec refresh token
                </li>
                <li>Isolation des données par organisation</li>
                <li>Mots de passe chiffrés (hachage bcrypt)</li>
              </ul>
            </section>

            {/* 11. Modifications de la politique */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                11. Modifications de la politique
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Qeylo se réserve le droit de modifier la présente politique de
                  confidentialité.
                </p>
                <p>
                  Les utilisateurs seront informés par email de tout changement
                  substantiel.
                </p>
                <p>
                  La continuation de l&apos;utilisation du service vaut
                  acceptation des modifications.
                </p>
              </div>
            </section>

            {/* 12. Contact DPO */}
            <section>
              <h2 className="text-lg font-semibold mb-3">12. Contact DPO</h2>
              <p className="text-sm text-muted-foreground">
                Pour toute question relative à vos données personnelles :{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="underline hover:text-foreground transition-colors"
                >
                  hello@qeylo.com
                </a>
              </p>
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
