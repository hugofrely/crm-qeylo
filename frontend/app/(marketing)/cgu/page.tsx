"use client"

import { motion } from "motion/react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function CGU() {
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
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="mt-2 text-muted-foreground">
              Conditions régissant l&apos;accès et l&apos;utilisation du service
              Qeylo.
            </p>
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            {/* Article 1 – Objet */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 1 – Objet
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Les présentes Conditions Générales d&apos;Utilisation (CGU)
                  régissent l&apos;accès et l&apos;utilisation du service Qeylo,
                  un CRM conversationnel propulsé par l&apos;intelligence
                  artificielle, édité par Qeylo SASU.
                </p>
                <p>
                  En créant un compte sur Qeylo, l&apos;utilisateur accepte sans
                  réserve les présentes CGU.
                </p>
              </div>
            </section>

            {/* Article 2 – Définitions */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 2 – Définitions
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  « Service » : la plateforme Qeylo accessible à l&apos;adresse
                  qeylo.com et ses applications
                </li>
                <li>
                  « Utilisateur » : toute personne physique ou morale inscrite au
                  Service
                </li>
                <li>
                  « Contenu Utilisateur » : l&apos;ensemble des données saisies
                  par l&apos;Utilisateur (contacts, deals, tâches, notes, etc.)
                </li>
              </ul>
            </section>

            {/* Article 3 – Inscription et compte */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 3 – Inscription et compte
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  L&apos;inscription nécessite une adresse email valide et un mot
                  de passe sécurisé (minimum 8 caractères)
                </li>
                <li>
                  L&apos;Utilisateur est responsable de la confidentialité de ses
                  identifiants
                </li>
                <li>
                  Chaque compte est personnel et ne peut être partagé
                </li>
                <li>
                  L&apos;Utilisateur s&apos;engage à fournir des informations
                  exactes et à les maintenir à jour
                </li>
              </ul>
            </section>

            {/* Article 4 – Description du service */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 4 – Description du service
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Qeylo propose trois formules :</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>
                    Plan Solo (gratuit) : 1 utilisateur, 100 contacts,
                    1 pipeline, 50 messages IA/mois
                  </li>
                  <li>
                    Plan Pro (19€/mois) : 1 utilisateur, contacts illimités,
                    multi-pipeline, IA illimitée, workflows, segments, rapports
                    avancés
                  </li>
                  <li>
                    Plan Équipe (49€/mois) : utilisateurs illimités, tout du plan
                    Pro, organisation partagée, rôles & permissions, API access
                  </li>
                </ul>
                <p>
                  Les fonctionnalités détaillées de chaque plan sont décrites sur
                  la page Tarifs du site.
                </p>
              </div>
            </section>

            {/* Article 5 – Obligations de l'utilisateur */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 5 – Obligations de l&apos;utilisateur
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Utiliser le Service conformément à sa destination et aux lois
                  en vigueur
                </li>
                <li>
                  Ne pas utiliser le Service à des fins illicites, frauduleuses
                  ou portant atteinte aux droits de tiers
                </li>
                <li>
                  Ne pas tenter d&apos;accéder de manière non autorisée aux
                  systèmes de Qeylo
                </li>
                <li>
                  Ne pas effectuer de scraping, extraction automatisée ou reverse
                  engineering du Service
                </li>
                <li>
                  Ne pas stocker de contenu illicite via le Service
                </li>
              </ul>
            </section>

            {/* Article 6 – Propriété intellectuelle */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 6 – Propriété intellectuelle
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Le Service, son code source, son design, ses marques et logos
                  sont la propriété exclusive de Qeylo SASU.
                </p>
                <p>
                  L&apos;Utilisateur conserve l&apos;intégralité des droits sur
                  son Contenu Utilisateur.
                </p>
                <p>
                  L&apos;Utilisateur accorde à Qeylo une licence limitée
                  d&apos;utilisation de son Contenu Utilisateur aux seules fins
                  de fourniture du Service.
                </p>
              </div>
            </section>

            {/* Article 7 – Données personnelles */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 7 – Données personnelles
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Le traitement des données personnelles est décrit dans notre
                  Politique de Confidentialité accessible à l&apos;adresse{" "}
                  <a
                    href="/confidentialite"
                    className="underline hover:text-foreground transition-colors"
                  >
                    /confidentialite
                  </a>
                  .
                </p>
                <p>
                  En utilisant le Service, l&apos;Utilisateur reconnaît avoir
                  pris connaissance de cette politique.
                </p>
              </div>
            </section>

            {/* Article 8 – Disponibilité et maintenance */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 8 – Disponibilité et maintenance
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Qeylo s&apos;engage à fournir ses meilleurs efforts pour
                  assurer la disponibilité du Service 24h/24.
                </p>
                <p>
                  Des interruptions temporaires peuvent survenir pour
                  maintenance, mises à jour ou en cas de force majeure.
                </p>
                <p>
                  Qeylo s&apos;efforcera de notifier les utilisateurs en amont
                  des maintenances planifiées.
                </p>
              </div>
            </section>

            {/* Article 9 – Responsabilité */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 9 – Responsabilité
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Qeylo est tenue à une obligation de moyens dans la fourniture
                  du Service
                </li>
                <li>
                  Qeylo ne saurait être tenue responsable des dommages indirects
                  (perte de données, perte de chiffre d&apos;affaires, manque à
                  gagner)
                </li>
                <li>
                  La responsabilité totale de Qeylo est limitée au montant des
                  sommes versées par l&apos;Utilisateur au cours des 12 derniers
                  mois
                </li>
                <li>
                  Qeylo ne saurait être tenue responsable en cas de force
                  majeure
                </li>
              </ul>
            </section>

            {/* Article 10 – Résiliation */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 10 – Résiliation
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  L&apos;Utilisateur peut résilier son compte à tout moment
                  depuis les paramètres de son compte
                </li>
                <li>
                  Qeylo se réserve le droit de suspendre ou résilier un compte en
                  cas de violation des présentes CGU, après notification
                </li>
                <li>
                  En cas de résiliation, les données de l&apos;Utilisateur sont
                  conservées pendant 30 jours, puis supprimées conformément à
                  notre politique de confidentialité
                </li>
              </ul>
            </section>

            {/* Article 11 – Modification des CGU */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 11 – Modification des CGU
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Qeylo se réserve le droit de modifier les présentes CGU à tout
                  moment.
                </p>
                <p>
                  Les Utilisateurs seront informés par email de tout changement
                  substantiel au moins 30 jours avant l&apos;entrée en vigueur.
                </p>
                <p>
                  La poursuite de l&apos;utilisation du Service après la date
                  d&apos;effet vaut acceptation des nouvelles CGU.
                </p>
              </div>
            </section>

            {/* Article 12 – Droit applicable et litiges */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 12 – Droit applicable et litiges
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Les présentes CGU sont régies par le droit français.
                </p>
                <p>
                  En cas de litige, les parties s&apos;engagent à rechercher une
                  solution amiable.
                </p>
                <p>
                  À défaut d&apos;accord amiable, compétence est attribuée au
                  Tribunal de commerce d&apos;Avignon.
                </p>
              </div>
            </section>

            {/* Article 13 – Contact */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 13 – Contact
              </h2>
              <p className="text-sm text-muted-foreground">
                Pour toute question relative aux présentes CGU :{" "}
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
