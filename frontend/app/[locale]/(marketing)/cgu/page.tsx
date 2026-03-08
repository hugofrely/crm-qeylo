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
            className="mb-14"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Legal
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Conditions Generales d&apos;Utilisation
            </h1>
            <p className="mt-3 text-muted-foreground">
              Conditions regissant l&apos;acces et l&apos;utilisation du service
              Qeylo.
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 1 – Objet
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Les presentes Conditions Generales d&apos;Utilisation (CGU)
                  regissent l&apos;acces et l&apos;utilisation du service Qeylo,
                  un CRM conversationnel propulse par l&apos;intelligence
                  artificielle, edite par Qeylo SASU.
                </p>
                <p>
                  En creant un compte sur Qeylo, l&apos;utilisateur accepte sans
                  reserve les presentes CGU.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 2 – Definitions
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                <li>
                  &laquo; Service &raquo; : la plateforme Qeylo accessible a l&apos;adresse
                  qeylo.com et ses applications
                </li>
                <li>
                  &laquo; Utilisateur &raquo; : toute personne physique ou morale inscrite au
                  Service
                </li>
                <li>
                  &laquo; Contenu Utilisateur &raquo; : l&apos;ensemble des donnees saisies
                  par l&apos;Utilisateur (contacts, deals, taches, notes, etc.)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 3 – Inscription et compte
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                <li>
                  L&apos;inscription necessite une adresse email valide et un mot
                  de passe securise (minimum 8 caracteres)
                </li>
                <li>
                  L&apos;Utilisateur est responsable de la confidentialite de ses
                  identifiants
                </li>
                <li>
                  Chaque compte est personnel et ne peut etre partage
                </li>
                <li>
                  L&apos;Utilisateur s&apos;engage a fournir des informations
                  exactes et a les maintenir a jour
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 4 – Description du service
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>Qeylo propose trois formules :</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>
                    Plan Solo (gratuit) : 1 utilisateur, 100 contacts,
                    1 pipeline, 50 messages IA/mois
                  </li>
                  <li>
                    Plan Pro (19&euro;/mois) : 1 utilisateur, contacts illimites,
                    multi-pipeline, IA illimitee, workflows, segments, rapports
                    avances
                  </li>
                  <li>
                    Plan Equipe (49&euro;/mois) : utilisateurs illimites, tout du plan
                    Pro, organisation partagee, roles & permissions, API access
                  </li>
                </ul>
                <p>
                  Les fonctionnalites detaillees de chaque plan sont decrites sur
                  la page Tarifs du site.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 5 – Obligations de l&apos;utilisateur
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                <li>
                  Utiliser le Service conformement a sa destination et aux lois
                  en vigueur
                </li>
                <li>
                  Ne pas utiliser le Service a des fins illicites, frauduleuses
                  ou portant atteinte aux droits de tiers
                </li>
                <li>
                  Ne pas tenter d&apos;acceder de maniere non autorisee aux
                  systemes de Qeylo
                </li>
                <li>
                  Ne pas effectuer de scraping, extraction automatisee ou reverse
                  engineering du Service
                </li>
                <li>
                  Ne pas stocker de contenu illicite via le Service
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 6 – Propriete intellectuelle
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Le Service, son code source, son design, ses marques et logos
                  sont la propriete exclusive de Qeylo SASU.
                </p>
                <p>
                  L&apos;Utilisateur conserve l&apos;integralite des droits sur
                  son Contenu Utilisateur.
                </p>
                <p>
                  L&apos;Utilisateur accorde a Qeylo une licence limitee
                  d&apos;utilisation de son Contenu Utilisateur aux seules fins
                  de fourniture du Service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 7 – Donnees personnelles
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Le traitement des donnees personnelles est decrit dans notre
                  Politique de Confidentialite accessible a l&apos;adresse{" "}
                  <a
                    href="/confidentialite"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    /confidentialite
                  </a>
                  .
                </p>
                <p>
                  En utilisant le Service, l&apos;Utilisateur reconnait avoir
                  pris connaissance de cette politique.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 8 – Disponibilite et maintenance
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Qeylo s&apos;engage a fournir ses meilleurs efforts pour
                  assurer la disponibilite du Service 24h/24.
                </p>
                <p>
                  Des interruptions temporaires peuvent survenir pour
                  maintenance, mises a jour ou en cas de force majeure.
                </p>
                <p>
                  Qeylo s&apos;efforcera de notifier les utilisateurs en amont
                  des maintenances planifiees.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 9 – Responsabilite
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                <li>
                  Qeylo est tenue a une obligation de moyens dans la fourniture
                  du Service
                </li>
                <li>
                  Qeylo ne saurait etre tenue responsable des dommages indirects
                  (perte de donnees, perte de chiffre d&apos;affaires, manque a
                  gagner)
                </li>
                <li>
                  La responsabilite totale de Qeylo est limitee au montant des
                  sommes versees par l&apos;Utilisateur au cours des 12 derniers
                  mois
                </li>
                <li>
                  Qeylo ne saurait etre tenue responsable en cas de force
                  majeure
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 10 – Resiliation
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                <li>
                  L&apos;Utilisateur peut resilier son compte a tout moment
                  depuis les parametres de son compte
                </li>
                <li>
                  Qeylo se reserve le droit de suspendre ou resilier un compte en
                  cas de violation des presentes CGU, apres notification
                </li>
                <li>
                  En cas de resiliation, les donnees de l&apos;Utilisateur sont
                  conservees pendant 30 jours, puis supprimees conformement a
                  notre politique de confidentialite
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 11 – Modification des CGU
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Qeylo se reserve le droit de modifier les presentes CGU a tout
                  moment.
                </p>
                <p>
                  Les Utilisateurs seront informes par email de tout changement
                  substantiel au moins 30 jours avant l&apos;entree en vigueur.
                </p>
                <p>
                  La poursuite de l&apos;utilisation du Service apres la date
                  d&apos;effet vaut acceptation des nouvelles CGU.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 12 – Droit applicable et litiges
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  Les presentes CGU sont regies par le droit francais.
                </p>
                <p>
                  En cas de litige, les parties s&apos;engagent a rechercher une
                  solution amiable.
                </p>
                <p>
                  A defaut d&apos;accord amiable, competence est attribuee au
                  Tribunal de commerce d&apos;Avignon.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Article 13 – Contact
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Pour toute question relative aux presentes CGU :{" "}
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
