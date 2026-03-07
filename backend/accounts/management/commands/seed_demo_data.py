import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact, ContactCategory
from deals.models import Deal, Pipeline, PipelineStage, DealStageTransition, Quote, QuoteLine
from tasks.models import Task, TaskAssignment
from notes.models import TimelineEntry
from segments.models import Segment
from reports.models import Report
from workflows.models import Workflow, WorkflowNode, WorkflowEdge
from products.models import Product, ProductCategory
from emails.models import EmailTemplate
from notifications.models import Notification


FIRST_NAMES = [
    "Jean", "Pierre", "Marie", "Sophie", "Thomas", "Nicolas", "Camille",
    "Julie", "Antoine", "Lucas", "Emma", "Lea", "Hugo", "Chloe", "Louis",
    "Alice", "Paul", "Manon", "Alexandre", "Charlotte", "Julien", "Clara",
    "Maxime", "Sarah", "Romain", "Laura", "Vincent", "Pauline", "Quentin",
    "Mathilde", "Florian", "Elise", "Adrien", "Oceane", "Benjamin", "Ines",
    "Clement", "Margaux", "Theo", "Anais", "Raphael", "Justine", "Valentin",
    "Lucie", "Nathan", "Meline", "Bastien", "Noemie", "Axel", "Amelie",
    "Guillaume", "Elodie", "Damien", "Emilie", "Thibault", "Aurelie",
    "Sebastien", "Marion", "Matthieu", "Audrey", "Arnaud", "Celine",
    "Fabien", "Delphine", "Stephane", "Helene", "Olivier", "Isabelle",
    "Patrick", "Nathalie", "Michel", "Catherine", "Philippe", "Sandrine",
    "Franck", "Virginie", "Laurent", "Stephanie", "Christophe", "Veronique",
]

LAST_NAMES = [
    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit",
    "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel",
    "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel",
    "Girard", "Andre", "Lefevre", "Mercier", "Dupont", "Lambert", "Bonnet",
    "Francois", "Martinez", "Legrand", "Garnier", "Faure", "Rousseau",
    "Blanc", "Guerin", "Muller", "Henry", "Roussel", "Nicolas", "Perrin",
    "Morin", "Mathieu", "Clement", "Gauthier", "Dumont", "Lopez", "Fontaine",
    "Chevalier", "Robin", "Masson", "Sanchez", "Gerard", "Nguyen", "Boyer",
    "Denis", "Lemaire", "Duval", "Joly", "Gautier", "Roger", "Roche",
    "Roy", "Noel", "Meyer", "Lucas", "Maillard", "Marchand", "Dufour",
    "Blanchard", "Renard", "Brun", "Picard", "Gaillard", "Barbier",
    "Arnaud", "Colin", "Vidal", "Berger", "Leclerc",
]

COMPANIES = [
    "TechVision SAS", "DataFlow Systems", "CloudNine Solutions", "InnoLab",
    "PixelForge", "NetSphere", "CyberPulse", "CodeCraft", "DigiWave",
    "AppNova", "StreamLine Tech", "ByteForce", "WebFusion", "SmartGrid",
    "LogiTech Plus", "EcoTech Solutions", "BioMed Innovations", "FinTech Pro",
    "AgriSmart", "EduTech France", "RetailMax", "AutoDrive Systems",
    "GreenEnergy Corp", "AeroSpace Tech", "FoodTech Lab", "HealthFirst",
    "SecureNet", "MediaPulse", "TravelSoft", "BuildSmart", "LegalTech",
    "PropTech Solutions", "InsurTech France", "SportTech", "FashionTech",
    "MusicStream", "GameForge", "RoboTech", "DroneVision", "BlockChain Pro",
    "AI Solutions Paris", "DataMind", "Nexus Group", "Quantum Labs",
    "Stellar Systems", "Optima Conseil", "Synergie Digital", "Atlas Corp",
    "Zenith Technologies", "Horizon Ventures",
]

JOB_TITLES = [
    "CEO", "CTO", "CFO", "COO", "Directeur Commercial", "Directeur Marketing",
    "Responsable IT", "Chef de Projet", "Developpeur Senior", "Designer UX",
    "Product Manager", "Account Manager", "Business Developer", "Data Analyst",
    "Responsable RH", "Consultant Senior", "Architecte Solutions",
    "Responsable Communication", "Charge de Clientele", "Directeur General",
    "VP Engineering", "VP Sales", "Lead Developer", "Scrum Master",
    "DevOps Engineer", "QA Manager", "Support Manager", "Sales Manager",
    "Marketing Manager", "Operations Manager",
]

INDUSTRIES = [
    "Technologie", "Sante", "Finance", "Education", "E-commerce",
    "Immobilier", "Automobile", "Energie", "Agroalimentaire", "Tourisme",
    "Media", "Telecom", "Conseil", "Industrie", "Luxe", "Logistique",
    "Assurance", "BTP", "Environnement", "Sport",
]

SOURCES = [
    "Site web", "LinkedIn", "Salon professionnel", "Recommandation",
    "Appel entrant", "Email", "Publicite", "Partenaire", "Reseau",
    "Prospection", "Webinar", "Conference", "Blog", "Presse",
]

CITIES = [
    ("Paris", "75001", "Ile-de-France"),
    ("Lyon", "69001", "Auvergne-Rhone-Alpes"),
    ("Marseille", "13001", "Provence-Alpes-Cote d'Azur"),
    ("Toulouse", "31000", "Occitanie"),
    ("Nice", "06000", "Provence-Alpes-Cote d'Azur"),
    ("Nantes", "44000", "Pays de la Loire"),
    ("Strasbourg", "67000", "Grand Est"),
    ("Montpellier", "34000", "Occitanie"),
    ("Bordeaux", "33000", "Nouvelle-Aquitaine"),
    ("Lille", "59000", "Hauts-de-France"),
    ("Rennes", "35000", "Bretagne"),
    ("Grenoble", "38000", "Auvergne-Rhone-Alpes"),
    ("Rouen", "76000", "Normandie"),
    ("Toulon", "83000", "Provence-Alpes-Cote d'Azur"),
    ("Clermont-Ferrand", "63000", "Auvergne-Rhone-Alpes"),
]

DEAL_NAMES = [
    "Migration cloud {company}", "Refonte site web {company}",
    "Contrat maintenance {company}", "Licence annuelle {company}",
    "Formation equipe {company}", "Audit securite {company}",
    "Integration CRM {company}", "Developpement app mobile {company}",
    "Mise en place ERP {company}", "Consulting IT {company}",
    "Deploiement infrastructure {company}", "Support premium {company}",
    "Projet data analytics {company}", "Campagne marketing {company}",
    "Automatisation processus {company}", "Mise a jour systeme {company}",
    "Partenariat strategique {company}", "Fourniture equipements {company}",
    "Abonnement SaaS {company}", "Projet IoT {company}",
]

TASK_DESCRIPTIONS = [
    "Appeler {name} pour suivi",
    "Envoyer devis a {name}",
    "Relancer {name} par email",
    "Preparer presentation pour {name}",
    "Planifier reunion avec {name}",
    "Mettre a jour fiche contact {name}",
    "Envoyer documentation a {name}",
    "Faire demo produit a {name}",
    "Negocier conditions avec {name}",
    "Verifier paiement de {name}",
    "Preparer contrat pour {name}",
    "Organiser visite chez {name}",
    "Envoyer newsletter a {name}",
    "Faire point trimestriel avec {name}",
    "Qualifier le lead {name}",
    "Envoyer invitation evenement a {name}",
    "Repondre a la demande de {name}",
    "Preparer proposition commerciale pour {name}",
    "Faire suivi post-vente {name}",
    "Collecter feedback de {name}",
]

TIMELINE_NOTES = [
    "Premier contact etabli par telephone. {name} interesse par nos solutions.",
    "Reunion de presentation effectuee. Bonne impression generale.",
    "Devis envoye par email. Retour attendu sous 2 semaines.",
    "Discussion sur les besoins specifiques. Budget a definir.",
    "Appel de suivi - {name} en phase de reflexion.",
    "Email de relance envoye. Pas de retour pour le moment.",
    "Rendez-vous confirme pour la semaine prochaine.",
    "Negociation en cours sur les tarifs. Demande de remise de 10%.",
    "Contrat signe ! Client satisfait.",
    "Point trimestriel effectue. Projet en bonne voie.",
    "Feedback positif recu. Possibilite d'upsell.",
    "Mise en relation avec le service technique.",
    "Formation planifiee pour l'equipe de {name}.",
    "Probleme technique signale et resolu rapidement.",
    "Renouvellement de contrat en discussion.",
]


class Command(BaseCommand):
    help = "Seed comprehensive demo data for a user account"

    def add_arguments(self, parser):
        parser.add_argument("--email", default="hugo@frely.fr")
        parser.add_argument("--contacts", type=int, default=250)
        parser.add_argument("--deals", type=int, default=100)
        parser.add_argument("--tasks", type=int, default=150)
        parser.add_argument("--clear", action="store_true")

    def handle(self, *args, **options):
        email = options["email"]
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"User {email} not found."))
            return

        membership = Membership.objects.filter(user=user).first()
        if not membership:
            self.stderr.write(self.style.ERROR(f"No organization found for {email}."))
            return

        org = membership.organization
        self.stdout.write(f"Seeding data for {email} in org '{org.name}'...")

        if options["clear"]:
            self._clear_data(org)

        now = timezone.now()

        # 1. Categories
        categories = self._create_categories(org, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(categories)} categories"))

        # 2. Contacts
        contacts = self._create_contacts(org, user, categories, options["contacts"], now)
        self.stdout.write(self.style.SUCCESS(f"  {len(contacts)} contacts"))

        # 3. Pipeline stages
        stages = list(PipelineStage.objects.filter(pipeline__organization=org))
        if not stages:
            Pipeline.create_defaults(org)
            stages = list(PipelineStage.objects.filter(pipeline__organization=org))

        # 4. Deals
        deals = self._create_deals(org, user, stages, contacts, options["deals"], now)
        self.stdout.write(self.style.SUCCESS(f"  {len(deals)} deals"))

        # 5. Deal stage transitions
        transitions = self._create_deal_transitions(org, user, deals, stages, now)
        self.stdout.write(self.style.SUCCESS(f"  {transitions} deal stage transitions"))

        # 6. Tasks
        tasks = self._create_tasks(org, user, contacts, deals, options["tasks"], now)
        self.stdout.write(self.style.SUCCESS(f"  {len(tasks)} tasks"))

        # 7. Timeline entries
        entries = self._create_timeline_entries(org, user, contacts, deals, now)
        self.stdout.write(self.style.SUCCESS(f"  {entries} timeline entries"))

        # 8. Products
        products = self._create_products(org, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(products)} products"))

        # 9. Quotes
        quotes = self._create_quotes(org, deals, products, now)
        self.stdout.write(self.style.SUCCESS(f"  {quotes} quotes"))

        # 10. Segments
        segments = self._create_segments(org, user, categories, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(segments)} segments"))

        # 11. Reports
        reports = self._create_reports(org, user, stages, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(reports)} reports"))

        # 12. Workflows
        workflows = self._create_workflows(org, user, stages, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(workflows)} workflows"))

        # 13. Email templates
        templates = self._create_email_templates(org, user, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(templates)} email templates"))

        # 14. Notifications
        notifs = self._create_notifications(org, user, contacts, deals, tasks, now)
        self.stdout.write(self.style.SUCCESS(f"  {notifs} notifications"))

        self.stdout.write(self.style.SUCCESS("\nDone! All demo data created."))

    def _clear_data(self, org):
        Notification.objects.filter(organization=org).delete()
        EmailTemplate.objects.filter(organization=org).delete()
        WorkflowEdge.objects.filter(workflow__organization=org).delete()
        WorkflowNode.objects.filter(workflow__organization=org).delete()
        Workflow.objects.filter(organization=org).delete()
        Report.objects.filter(organization=org).delete()
        Segment.objects.filter(organization=org).delete()
        QuoteLine.objects.filter(quote__organization=org).delete()
        Quote.objects.filter(organization=org).delete()
        TimelineEntry.objects.filter(organization=org).delete()
        TaskAssignment.objects.filter(task__organization=org).delete()
        Task.all_objects.filter(organization=org).delete()
        DealStageTransition.objects.filter(organization=org).delete()
        Deal.all_objects.filter(organization=org).delete()
        Contact.all_objects.filter(organization=org).delete()
        Product.objects.filter(organization=org).delete()
        ProductCategory.objects.filter(organization=org).delete()
        ContactCategory.objects.filter(organization=org).delete()
        self.stdout.write("  Existing data cleared.")

    def _create_categories(self, org, now):
        existing = ContactCategory.objects.filter(organization=org).count()
        if existing > 0:
            return list(ContactCategory.objects.filter(organization=org))

        cats_data = [
            ("Client", "#10B981", "users", 1, True),
            ("Prospect", "#3B82F6", "user-plus", 2, True),
            ("Partenaire", "#8B5CF6", "handshake", 3, False),
            ("Fournisseur", "#F59E0B", "truck", 4, False),
            ("VIP", "#EF4444", "star", 5, False),
            ("Ancien client", "#6B7280", "clock", 6, False),
            ("Lead chaud", "#DC2626", "flame", 7, False),
            ("Investisseur", "#059669", "briefcase", 8, False),
        ]
        cats = []
        for name, color, icon, order, is_default in cats_data:
            cats.append(ContactCategory(
                organization=org, name=name, color=color, icon=icon,
                order=order, is_default=is_default,
            ))
        ContactCategory.objects.bulk_create(cats)
        return list(ContactCategory.objects.filter(organization=org))

    def _create_contacts(self, org, user, categories, count, now):
        contacts = []
        used_emails = set()

        for i in range(count):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            company = random.choice(COMPANIES)
            city, postal, state = random.choice(CITIES)

            email_base = f"{first.lower()}.{last.lower()}"
            email = f"{email_base}@{company.lower().split()[0].replace(',', '')}.fr"
            while email in used_emails:
                email = f"{email_base}{random.randint(1, 999)}@{company.lower().split()[0]}.fr"
            used_emails.add(email)

            # Vary created_at across last 365 days
            days_ago = random.randint(0, 365)
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            # updated_at between created_at and now
            update_offset = random.randint(0, max(1, days_ago))
            updated_at = created_at + timedelta(days=update_offset, hours=random.randint(0, 12))
            if updated_at > now:
                updated_at = now

            contact = Contact(
                organization=org,
                created_by=user,
                first_name=first,
                last_name=last,
                email=email,
                phone=f"+33 {random.randint(6, 7)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
                company=company,
                source=random.choice(SOURCES),
                job_title=random.choice(JOB_TITLES),
                industry=random.choice(INDUSTRIES),
                city=city,
                postal_code=postal,
                country="France",
                state=state,
                lead_score=random.choice(["hot", "warm", "cold", ""]),
                decision_role=random.choice(["decision_maker", "influencer", "user", "other", ""]),
                preferred_channel=random.choice(["email", "phone", "linkedin", ""]),
                language=random.choice(["fr", "en", ""]),
                tags=random.sample(
                    ["VIP", "tech", "startup", "PME", "grand_compte", "partenaire", "prospect", "fidele", "premium", "international"],
                    k=random.randint(0, 3),
                ),
                estimated_budget=Decimal(str(random.choice([5000, 10000, 25000, 50000, 100000, 250000, 500000]))) if random.random() > 0.3 else None,
                notes=random.choice([
                    "", "",
                    f"Contact rencontre au salon Tech Paris. Interesse par notre offre.",
                    f"Recommande par un partenaire. A rappeler.",
                    f"Client potentiel pour un projet de grande envergure.",
                    f"A participe a notre webinar du mois dernier.",
                    f"Contact LinkedIn - Echange initial prometteur.",
                    f"Demande de renseignements via le site web.",
                ]),
                linkedin_url=f"https://linkedin.com/in/{first.lower()}-{last.lower()}" if random.random() > 0.5 else "",
                website=f"https://www.{company.lower().split()[0]}.fr" if random.random() > 0.6 else "",
            )
            contacts.append(contact)

        Contact.objects.bulk_create(contacts)
        contacts = list(Contact.objects.filter(organization=org).order_by("-created_at")[:count])

        # Now update created_at/updated_at via raw SQL since auto_now_add prevents setting them
        from django.db import connection
        with connection.cursor() as cursor:
            for contact in contacts:
                days_ago = random.randint(0, 365)
                created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
                update_offset = random.randint(0, max(1, days_ago))
                updated_at = created_at + timedelta(days=update_offset, hours=random.randint(0, 12))
                if updated_at > now:
                    updated_at = now
                cursor.execute(
                    "UPDATE contacts_contact SET created_at = %s, updated_at = %s WHERE id = %s",
                    [created_at, updated_at, contact.id]
                )

        # Assign categories
        if categories:
            for contact in contacts:
                cats = random.sample(categories, k=random.randint(0, min(3, len(categories))))
                if cats:
                    contact.categories.set(cats)

        return contacts

    def _create_deals(self, org, user, stages, contacts, count, now):
        active_stages = [s for s in stages if s.name not in ("Gagné", "Perdu")]
        won_stage = next((s for s in stages if s.name == "Gagné"), None)
        lost_stage = next((s for s in stages if s.name == "Perdu"), None)

        deals = []
        for i in range(count):
            contact = random.choice(contacts) if random.random() > 0.1 else None
            company = contact.company if contact else random.choice(COMPANIES)
            template = random.choice(DEAL_NAMES)
            name = template.format(company=company)

            r = random.random()
            if r < 0.55 and active_stages:
                stage = random.choice(active_stages)
                closed_at = None
            elif r < 0.80 and won_stage:
                stage = won_stage
                closed_at = now - timedelta(days=random.randint(1, 180))
            elif lost_stage:
                stage = lost_stage
                closed_at = now - timedelta(days=random.randint(1, 180))
            else:
                stage = random.choice(stages)
                closed_at = None

            amount = Decimal(str(random.choice([
                1500, 3000, 5000, 7500, 10000, 15000, 20000, 25000,
                30000, 50000, 75000, 100000, 150000, 200000, 350000, 500000,
            ])))

            deal = Deal(
                organization=org,
                created_by=user,
                name=name,
                amount=amount,
                stage=stage,
                contact=contact,
                probability=random.choice([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, None]),
                expected_close=(now + timedelta(days=random.randint(-30, 180))).date() if random.random() > 0.2 else None,
                closed_at=closed_at,
                notes=random.choice([
                    "",
                    "Deal prioritaire. Suivi hebdomadaire.",
                    "En attente de validation budget cote client.",
                    "Bonne opportunite, decision prevue fin de mois.",
                    "Concurrent identifie. Travailler sur la differenciation.",
                    "Client historique, renouvellement important.",
                    "Projet pilote, potentiel de scale-up significatif.",
                ]),
            )
            deals.append(deal)

        Deal.objects.bulk_create(deals)
        deals = list(Deal.objects.filter(organization=org).order_by("-created_at")[:count])

        # Update created_at/updated_at
        from django.db import connection
        with connection.cursor() as cursor:
            for deal in deals:
                days_ago = random.randint(0, 300)
                created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                update_offset = random.randint(0, max(1, days_ago))
                updated_at = created_at + timedelta(days=update_offset)
                if updated_at > now:
                    updated_at = now
                cursor.execute(
                    "UPDATE deals_deal SET created_at = %s, updated_at = %s WHERE id = %s",
                    [created_at, updated_at, deal.id]
                )

        return deals

    def _create_deal_transitions(self, org, user, deals, stages, now):
        transitions = []
        sorted_stages = sorted(stages, key=lambda s: s.order)

        for deal in deals:
            current_stage_idx = next((i for i, s in enumerate(sorted_stages) if s.id == deal.stage_id), 0)
            # Create transitions from first stage up to current
            for i in range(current_stage_idx):
                days_ago = random.randint(1, 300)
                t = DealStageTransition(
                    deal=deal,
                    organization=org,
                    from_stage=sorted_stages[i] if i > 0 else None,
                    to_stage=sorted_stages[i + 1] if i + 1 < len(sorted_stages) else sorted_stages[i],
                    changed_by=user,
                    transitioned_at=now - timedelta(days=days_ago - i * 5),
                    duration_in_previous=timedelta(days=random.randint(1, 30)),
                )
                transitions.append(t)

        if transitions:
            DealStageTransition.objects.bulk_create(transitions)
        return len(transitions)

    def _create_tasks(self, org, user, contacts, deals, count, now):
        tasks = []

        for i in range(count):
            contact = random.choice(contacts) if random.random() > 0.2 else None
            deal = random.choice(deals) if random.random() > 0.5 else None
            name = f"{contact.first_name} {contact.last_name}" if contact else random.choice(COMPANIES)
            template = random.choice(TASK_DESCRIPTIONS)
            description = template.format(name=name)

            r = random.random()
            if r < 0.2:
                due_date = now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 12))
                is_done = random.random() < 0.3
            elif r < 0.35:
                due_date = now + timedelta(hours=random.randint(1, 8))
                is_done = random.random() < 0.2
            elif r < 0.7:
                due_date = now + timedelta(days=random.randint(1, 30), hours=random.randint(0, 12))
                is_done = False
            else:
                due_date = now - timedelta(days=random.randint(1, 90))
                is_done = True

            task = Task(
                organization=org,
                created_by=user,
                description=description,
                due_date=due_date,
                contact=contact,
                deal=deal,
                priority=random.choice(["high", "normal", "normal", "normal", "low"]),
                is_done=is_done,
            )
            tasks.append(task)

        Task.objects.bulk_create(tasks)
        tasks = list(Task.objects.filter(organization=org).order_by("due_date")[:count])

        # Update created_at
        from django.db import connection
        with connection.cursor() as cursor:
            for task in tasks:
                days_ago = random.randint(1, 180)
                created_at = now - timedelta(days=days_ago)
                cursor.execute(
                    "UPDATE tasks_task SET created_at = %s WHERE id = %s",
                    [created_at, task.id]
                )

        return tasks

    def _create_timeline_entries(self, org, user, contacts, deals, now):
        entries = []

        for contact in contacts[:150]:
            num_entries = random.randint(0, 5)
            name = f"{contact.first_name} {contact.last_name}"
            for j in range(num_entries):
                entry_type = random.choice([
                    "note_added", "note_added", "call", "email_sent",
                    "email_received", "meeting", "contact_updated",
                ])
                template = random.choice(TIMELINE_NOTES)
                content = template.format(name=name)
                days_ago = random.randint(0, 180)
                entry = TimelineEntry(
                    organization=org,
                    created_by=user,
                    contact=contact,
                    entry_type=entry_type,
                    content=content,
                    metadata={},
                )
                entries.append(entry)

        for deal in deals:
            num_entries = random.randint(1, 4)
            for j in range(num_entries):
                entry_type = random.choice(["deal_created", "deal_moved", "note_added", "deal_updated"])
                content = random.choice([
                    f"Deal '{deal.name}' cree.",
                    f"Deal deplace vers une nouvelle etape.",
                    f"Note ajoutee sur le deal.",
                    f"Discussion commerciale en cours.",
                    f"Proposition envoyee au client.",
                    f"Mise a jour du montant du deal.",
                    f"Appel de suivi avec le client.",
                ])
                entry = TimelineEntry(
                    organization=org,
                    created_by=user,
                    contact=deal.contact,
                    deal=deal,
                    entry_type=entry_type,
                    content=content,
                    metadata={},
                )
                entries.append(entry)

        TimelineEntry.objects.bulk_create(entries)

        # Update created_at
        from django.db import connection
        all_entries = list(TimelineEntry.objects.filter(organization=org))
        with connection.cursor() as cursor:
            for entry in all_entries:
                days_ago = random.randint(0, 300)
                created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                cursor.execute(
                    "UPDATE notes_timelineentry SET created_at = %s WHERE id = %s",
                    [created_at, entry.id]
                )

        return len(entries)

    def _create_products(self, org, now):
        # Product categories
        prod_cats_data = [
            ("Licences logicielles", 1),
            ("Services professionnels", 2),
            ("Formation", 3),
            ("Support & Maintenance", 4),
            ("Infrastructure", 5),
        ]
        prod_cats = []
        for name, order in prod_cats_data:
            prod_cats.append(ProductCategory(organization=org, name=name, order=order))
        ProductCategory.objects.bulk_create(prod_cats)
        prod_cats = list(ProductCategory.objects.filter(organization=org))

        products_data = [
            ("Licence CRM Pro", "Licence annuelle CRM Pro - par utilisateur", "LIC-CRM-001", prod_cats[0], Decimal("49.00"), "unit", Decimal("20.00")),
            ("Licence CRM Enterprise", "Licence annuelle CRM Enterprise - par utilisateur", "LIC-CRM-002", prod_cats[0], Decimal("99.00"), "unit", Decimal("20.00")),
            ("Module Analytics", "Module d'analyse avancee", "LIC-ANA-001", prod_cats[0], Decimal("29.00"), "unit", Decimal("20.00")),
            ("Module Marketing", "Module marketing automation", "LIC-MKT-001", prod_cats[0], Decimal("39.00"), "unit", Decimal("20.00")),
            ("Consulting strategique", "Accompagnement strategie CRM", "SRV-CON-001", prod_cats[1], Decimal("1200.00"), "day", Decimal("20.00")),
            ("Integration API", "Service d'integration API personnalisee", "SRV-INT-001", prod_cats[1], Decimal("150.00"), "hour", Decimal("20.00")),
            ("Migration de donnees", "Migration et import de donnees existantes", "SRV-MIG-001", prod_cats[1], Decimal("3500.00"), "fixed", Decimal("20.00")),
            ("Developpement sur mesure", "Developpement de fonctionnalites personnalisees", "SRV-DEV-001", prod_cats[1], Decimal("120.00"), "hour", Decimal("20.00")),
            ("Formation utilisateurs", "Formation initiale utilisateurs (groupe)", "FRM-USR-001", prod_cats[2], Decimal("800.00"), "day", Decimal("20.00")),
            ("Formation admin", "Formation administration avancee", "FRM-ADM-001", prod_cats[2], Decimal("1000.00"), "day", Decimal("20.00")),
            ("Workshop CRM", "Workshop strategie CRM - demi-journee", "FRM-WRK-001", prod_cats[2], Decimal("500.00"), "fixed", Decimal("20.00")),
            ("Support Standard", "Support email J+1 - annuel", "SUP-STD-001", prod_cats[3], Decimal("200.00"), "unit", Decimal("20.00")),
            ("Support Premium", "Support prioritaire 4h - annuel", "SUP-PRM-001", prod_cats[3], Decimal("500.00"), "unit", Decimal("20.00")),
            ("Maintenance applicative", "Maintenance et mises a jour - mensuel", "SUP-MNT-001", prod_cats[3], Decimal("150.00"), "unit", Decimal("20.00")),
            ("Hebergement Cloud", "Hebergement cloud dedie - mensuel", "INF-CLD-001", prod_cats[4], Decimal("250.00"), "unit", Decimal("20.00")),
            ("Stockage supplementaire", "100 Go de stockage additionnel - mensuel", "INF-STK-001", prod_cats[4], Decimal("50.00"), "unit", Decimal("20.00")),
        ]

        products = []
        for name, desc, ref, cat, price, unit, tax in products_data:
            products.append(Product(
                organization=org, name=name, description=desc, reference=ref,
                category=cat, unit_price=price, unit=unit, tax_rate=tax, is_active=True,
            ))
        Product.objects.bulk_create(products)
        return list(Product.objects.filter(organization=org))

    def _create_quotes(self, org, deals, products, now):
        quote_count = 0
        deals_with_contact = [d for d in deals if d.contact]

        for deal in random.sample(deals_with_contact, min(40, len(deals_with_contact))):
            num_quotes = random.randint(1, 3)
            for q in range(num_quotes):
                status = random.choice(["draft", "sent", "accepted", "refused"])
                quote = Quote.objects.create(
                    organization=org,
                    deal=deal,
                    status=status,
                    global_discount_percent=Decimal(str(random.choice([0, 0, 0, 5, 10, 15]))),
                    notes=random.choice(["", "Valable 30 jours", "Conditions speciales", "Remise fidelite incluse"]),
                    valid_until=(now + timedelta(days=random.randint(15, 60))).date() if random.random() > 0.3 else None,
                )

                # Add quote lines
                num_lines = random.randint(1, 5)
                selected_products = random.sample(products, min(num_lines, len(products)))
                lines = []
                for idx, product in enumerate(selected_products):
                    lines.append(QuoteLine(
                        quote=quote,
                        product=product,
                        description=product.description,
                        quantity=Decimal(str(random.choice([1, 2, 3, 5, 10, 20]))),
                        unit_price=product.unit_price,
                        unit=product.unit,
                        tax_rate=product.tax_rate,
                        discount_percent=Decimal(str(random.choice([0, 0, 0, 5, 10]))),
                        order=idx,
                    ))
                QuoteLine.objects.bulk_create(lines)
                quote_count += 1

        return quote_count

    def _create_segments(self, org, user, categories, now):
        cat_ids = [str(c.id) for c in categories]

        segments_data = [
            {
                "name": "Leads chauds",
                "description": "Contacts avec un lead score chaud et un budget estime",
                "icon": "flame",
                "color": "#EF4444",
                "is_pinned": True,
                "order": 1,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "lead_score", "operator": "equals", "value": "hot"},
                            {"field": "estimated_budget", "operator": "greater_than", "value": 10000},
                        ]
                    }]
                }
            },
            {
                "name": "Nouveaux contacts (30j)",
                "description": "Contacts crees dans les 30 derniers jours",
                "icon": "user-plus",
                "color": "#3B82F6",
                "is_pinned": True,
                "order": 2,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "created_at", "operator": "within_last", "value": 30, "unit": "days"},
                        ]
                    }]
                }
            },
            {
                "name": "Decision makers tech",
                "description": "Decideurs dans le secteur technologique",
                "icon": "briefcase",
                "color": "#8B5CF6",
                "is_pinned": True,
                "order": 3,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "decision_role", "operator": "equals", "value": "decision_maker"},
                            {"field": "industry", "operator": "equals", "value": "Technologie"},
                        ]
                    }]
                }
            },
            {
                "name": "Contacts Paris",
                "description": "Tous les contacts bases a Paris",
                "icon": "map-pin",
                "color": "#F59E0B",
                "is_pinned": False,
                "order": 4,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "city", "operator": "equals", "value": "Paris"},
                        ]
                    }]
                }
            },
            {
                "name": "Grands comptes",
                "description": "Contacts avec un budget superieur a 100k",
                "icon": "building",
                "color": "#059669",
                "is_pinned": True,
                "order": 5,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "estimated_budget", "operator": "greater_than", "value": 100000},
                        ]
                    }]
                }
            },
            {
                "name": "Contacts LinkedIn",
                "description": "Contacts acquis via LinkedIn",
                "icon": "linkedin",
                "color": "#0A66C2",
                "is_pinned": False,
                "order": 6,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "source", "operator": "equals", "value": "LinkedIn"},
                        ]
                    }]
                }
            },
            {
                "name": "Contacts froids a relancer",
                "description": "Contacts froids crees il y a plus de 60 jours",
                "icon": "snowflake",
                "color": "#6B7280",
                "is_pinned": False,
                "order": 7,
                "rules": {
                    "logic": "AND",
                    "groups": [
                        {
                            "logic": "AND",
                            "conditions": [
                                {"field": "lead_score", "operator": "equals", "value": "cold"},
                            ]
                        },
                    ]
                }
            },
            {
                "name": "Clients VIP",
                "description": "Contacts tagges VIP avec des deals en cours",
                "icon": "star",
                "color": "#DC2626",
                "is_pinned": True,
                "order": 8,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "tags", "operator": "contains", "value": "VIP"},
                        ]
                    }]
                }
            },
            {
                "name": "Contacts sans email",
                "description": "Contacts dont l'email est manquant",
                "icon": "alert-circle",
                "color": "#F97316",
                "is_pinned": False,
                "order": 9,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "email", "operator": "is_empty", "value": ""},
                        ]
                    }]
                }
            },
            {
                "name": "Prospects chauds Ile-de-France",
                "description": "Prospects chauds en region parisienne",
                "icon": "target",
                "color": "#EC4899",
                "is_pinned": False,
                "order": 10,
                "rules": {
                    "logic": "AND",
                    "groups": [{
                        "logic": "AND",
                        "conditions": [
                            {"field": "lead_score", "operator": "equals", "value": "warm"},
                            {"field": "state", "operator": "equals", "value": "Ile-de-France"},
                        ]
                    }]
                }
            },
        ]

        segments = []
        for data in segments_data:
            segments.append(Segment(
                organization=org,
                created_by=user,
                name=data["name"],
                description=data["description"],
                icon=data["icon"],
                color=data["color"],
                rules=data["rules"],
                is_pinned=data["is_pinned"],
                order=data["order"],
            ))
        Segment.objects.bulk_create(segments)
        return list(Segment.objects.filter(organization=org))

    def _create_reports(self, org, user, stages, now):
        pipeline = Pipeline.objects.filter(organization=org).first()
        pipeline_id = str(pipeline.id) if pipeline else ""

        reports_data = [
            {
                "name": "Vue d'ensemble commerciale",
                "description": "Dashboard principal avec les KPIs cles",
                "is_dashboard": True,
                "user": user,
                "widgets": [
                    {"id": "w1", "type": "kpi_card", "title": "Total contacts", "source": "contacts", "metric": "count", "group_by": None, "filters": {}, "size": "small"},
                    {"id": "w2", "type": "kpi_card", "title": "Deals en cours", "source": "deals", "metric": "count", "group_by": None, "filters": {"date_range": "this_month"}, "size": "small"},
                    {"id": "w3", "type": "kpi_card", "title": "Revenu total", "source": "deals", "metric": "sum:amount", "group_by": None, "filters": {}, "size": "small"},
                    {"id": "w4", "type": "bar_chart", "title": "Deals par stage", "source": "deals", "metric": "count", "group_by": "stage", "filters": {}, "size": "medium"},
                    {"id": "w5", "type": "line_chart", "title": "Nouveaux contacts par mois", "source": "contacts", "metric": "count", "group_by": "month", "filters": {"date_range": "last_6_months"}, "size": "large"},
                    {"id": "w6", "type": "pie_chart", "title": "Contacts par source", "source": "contacts", "metric": "count", "group_by": "source", "filters": {}, "size": "medium"},
                ]
            },
            {
                "name": "Performance pipeline",
                "description": "Analyse detaillee du pipeline de vente",
                "is_dashboard": False,
                "user": None,
                "widgets": [
                    {"id": "w1", "type": "funnel_chart", "title": "Entonnoir de vente", "source": "deals", "metric": "count", "group_by": None, "filters": {"pipeline_id": pipeline_id}, "size": "large"},
                    {"id": "w2", "type": "bar_chart", "title": "Valeur par stage", "source": "deals", "metric": "sum:amount", "group_by": "stage", "filters": {}, "size": "medium"},
                    {"id": "w3", "type": "line_chart", "title": "Evolution du revenu", "source": "deals", "metric": "sum:amount", "group_by": "month", "filters": {"date_range": "last_12_months"}, "size": "large"},
                    {"id": "w4", "type": "kpi_card", "title": "Deal moyen", "source": "deals", "metric": "avg:amount", "group_by": None, "filters": {}, "size": "small"},
                ]
            },
            {
                "name": "Activite equipe",
                "description": "Suivi des activites et taches",
                "is_dashboard": False,
                "user": None,
                "widgets": [
                    {"id": "w1", "type": "bar_chart", "title": "Taches par priorite", "source": "tasks", "metric": "count", "group_by": "priority", "filters": {}, "size": "medium"},
                    {"id": "w2", "type": "pie_chart", "title": "Taches terminees vs en cours", "source": "tasks", "metric": "count", "group_by": "is_done", "filters": {}, "size": "medium"},
                    {"id": "w3", "type": "line_chart", "title": "Activites par semaine", "source": "activities", "metric": "count", "group_by": "week", "filters": {"date_range": "last_3_months"}, "size": "large"},
                    {"id": "w4", "type": "bar_chart", "title": "Activites par type", "source": "activities", "metric": "count", "group_by": "entry_type", "filters": {}, "size": "medium"},
                ]
            },
            {
                "name": "Analyse contacts",
                "description": "Repartition et qualification des contacts",
                "is_dashboard": False,
                "user": None,
                "widgets": [
                    {"id": "w1", "type": "pie_chart", "title": "Contacts par lead score", "source": "contacts", "metric": "count", "group_by": "lead_score", "filters": {}, "size": "medium"},
                    {"id": "w2", "type": "bar_chart", "title": "Contacts par source", "source": "contacts", "metric": "count", "group_by": "source", "filters": {}, "size": "medium"},
                    {"id": "w3", "type": "line_chart", "title": "Croissance contacts", "source": "contacts", "metric": "count", "group_by": "month", "filters": {"date_range": "last_12_months"}, "size": "large"},
                ]
            },
            {
                "name": "Suivi des devis",
                "description": "Analyse des devis envoyes et leur statut",
                "is_dashboard": False,
                "user": None,
                "widgets": [
                    {"id": "w1", "type": "pie_chart", "title": "Devis par statut", "source": "quotes", "metric": "count", "group_by": "status", "filters": {}, "size": "medium"},
                    {"id": "w2", "type": "line_chart", "title": "Devis par mois", "source": "quotes", "metric": "count", "group_by": "month", "filters": {"date_range": "last_6_months"}, "size": "large"},
                    {"id": "w3", "type": "kpi_card", "title": "Total devis", "source": "quotes", "metric": "count", "group_by": None, "filters": {}, "size": "small"},
                ]
            },
        ]

        reports = []
        for data in reports_data:
            reports.append(Report(
                organization=org,
                created_by=user,
                name=data["name"],
                description=data["description"],
                is_dashboard=data["is_dashboard"],
                user=data["user"],
                widgets=data["widgets"],
            ))
        Report.objects.bulk_create(reports)
        return list(Report.objects.filter(organization=org))

    def _create_workflows(self, org, user, stages, now):
        won_stage = next((s for s in stages if s.name == "Gagné"), None)
        nego_stage = next((s for s in stages if s.name == "Négociation"), None)

        workflows_data = [
            {
                "name": "Suivi nouveau contact",
                "description": "Cree automatiquement une tache de suivi quand un nouveau contact est ajoute",
                "is_active": True,
                "nodes": [
                    {"id": "n1", "node_type": "trigger", "node_subtype": "contact.created", "config": {}, "position_x": 100, "position_y": 200},
                    {"id": "n2", "node_type": "delay", "node_subtype": "delay", "config": {"duration": 1, "unit": "days"}, "position_x": 350, "position_y": 200},
                    {"id": "n3", "node_type": "action", "node_subtype": "create_task", "config": {"description": "Premier appel de decouverte", "due_date_offset": "+3d", "priority": "normal"}, "position_x": 600, "position_y": 200},
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "source_handle": "out", "label": ""},
                    {"source": "n2", "target": "n3", "source_handle": "out", "label": ""},
                ]
            },
            {
                "name": "Notification deal gagne",
                "description": "Envoie une notification quand un deal est gagne",
                "is_active": True,
                "nodes": [
                    {"id": "n1", "node_type": "trigger", "node_subtype": "deal.won", "config": {}, "position_x": 100, "position_y": 200},
                    {"id": "n2", "node_type": "action", "node_subtype": "send_notification", "config": {"title": "Deal gagne !", "message": "Felicitations, un deal vient d'etre gagne."}, "position_x": 400, "position_y": 200},
                    {"id": "n3", "node_type": "action", "node_subtype": "create_task", "config": {"description": "Preparer le kick-off projet", "due_date_offset": "+5d", "priority": "high"}, "position_x": 700, "position_y": 200},
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "source_handle": "out", "label": ""},
                    {"source": "n2", "target": "n3", "source_handle": "out", "label": ""},
                ]
            },
            {
                "name": "Relance deal en negociation",
                "description": "Cree une tache de relance quand un deal passe en negociation",
                "is_active": False,
                "nodes": [
                    {"id": "n1", "node_type": "trigger", "node_subtype": "deal.stage_changed", "config": {"filters": {"new_stage_name": "Négociation"}}, "position_x": 100, "position_y": 200},
                    {"id": "n2", "node_type": "delay", "node_subtype": "delay", "config": {"duration": 7, "unit": "days"}, "position_x": 400, "position_y": 200},
                    {"id": "n3", "node_type": "action", "node_subtype": "create_task", "config": {"description": "Relancer le prospect sur la negociation", "due_date_offset": "+1d", "priority": "high"}, "position_x": 700, "position_y": 200},
                    {"id": "n4", "node_type": "action", "node_subtype": "create_note", "config": {"content": "Relance automatique programmee suite a la negociation"}, "position_x": 700, "position_y": 400},
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "source_handle": "out", "label": ""},
                    {"source": "n2", "target": "n3", "source_handle": "out", "label": ""},
                    {"source": "n2", "target": "n4", "source_handle": "out", "label": ""},
                ]
            },
            {
                "name": "Alerte tache en retard",
                "description": "Notifie quand une tache est en retard",
                "is_active": True,
                "nodes": [
                    {"id": "n1", "node_type": "trigger", "node_subtype": "task.overdue", "config": {}, "position_x": 100, "position_y": 200},
                    {"id": "n2", "node_type": "action", "node_subtype": "send_notification", "config": {"title": "Tache en retard", "message": "Une tache est en retard, veuillez la traiter."}, "position_x": 400, "position_y": 200},
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "source_handle": "out", "label": ""},
                ]
            },
            {
                "name": "Deal perdu - feedback",
                "description": "Cree une tache de feedback quand un deal est perdu",
                "is_active": False,
                "nodes": [
                    {"id": "n1", "node_type": "trigger", "node_subtype": "deal.lost", "config": {}, "position_x": 100, "position_y": 200},
                    {"id": "n2", "node_type": "action", "node_subtype": "create_task", "config": {"description": "Collecter le feedback sur le deal perdu", "due_date_offset": "+2d", "priority": "normal"}, "position_x": 400, "position_y": 200},
                    {"id": "n3", "node_type": "action", "node_subtype": "create_note", "config": {"content": "Deal perdu - analyse des raisons a effectuer"}, "position_x": 400, "position_y": 400},
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "source_handle": "out", "label": ""},
                    {"source": "n1", "target": "n3", "source_handle": "out", "label": ""},
                ]
            },
        ]

        workflows = []
        for data in workflows_data:
            wf = Workflow.objects.create(
                organization=org,
                created_by=user,
                name=data["name"],
                description=data["description"],
                is_active=data["is_active"],
            )

            node_map = {}
            for node_data in data["nodes"]:
                node = WorkflowNode.objects.create(
                    workflow=wf,
                    node_type=node_data["node_type"],
                    node_subtype=node_data["node_subtype"],
                    config=node_data["config"],
                    position_x=node_data["position_x"],
                    position_y=node_data["position_y"],
                )
                node_map[node_data["id"]] = node

            for edge_data in data["edges"]:
                WorkflowEdge.objects.create(
                    workflow=wf,
                    source_node=node_map[edge_data["source"]],
                    target_node=node_map[edge_data["target"]],
                    source_handle=edge_data["source_handle"],
                    label=edge_data["label"],
                )

            workflows.append(wf)

        return workflows

    def _create_email_templates(self, org, user, now):
        templates_data = [
            {
                "name": "Premier contact",
                "subject": "Ravi de vous connaitre, {{contact.first_name}}",
                "body_html": """<div style="font-family: Arial, sans-serif; max-width: 600px;">
<p>Bonjour {{contact.first_name}},</p>
<p>Suite a notre echange, je me permets de vous contacter pour en savoir plus sur vos besoins.</p>
<p>Chez Qeylo, nous aidons les entreprises comme <strong>{{contact.company}}</strong> a optimiser leur gestion de la relation client.</p>
<p>Seriez-vous disponible pour un appel de 15 minutes cette semaine ?</p>
<p>Cordialement,<br>Hugo Frely</p>
</div>""",
                "tags": ["prospection", "premier-contact"],
                "is_shared": True,
            },
            {
                "name": "Envoi de devis",
                "subject": "Votre devis personnalise - {{deal.name}}",
                "body_html": """<div style="font-family: Arial, sans-serif; max-width: 600px;">
<p>Bonjour {{contact.first_name}},</p>
<p>Comme convenu, veuillez trouver ci-joint notre proposition commerciale pour le projet <strong>{{deal.name}}</strong>.</p>
<p>Points cles de notre offre :</p>
<ul>
<li>Solution adaptee a vos besoins specifiques</li>
<li>Accompagnement personnalise</li>
<li>Support premium inclus</li>
</ul>
<p>N'hesitez pas a me contacter pour toute question.</p>
<p>Cordialement,<br>Hugo Frely</p>
</div>""",
                "tags": ["devis", "commercial"],
                "is_shared": True,
            },
            {
                "name": "Relance commerciale",
                "subject": "Avez-vous eu le temps de regarder notre proposition ?",
                "body_html": """<div style="font-family: Arial, sans-serif; max-width: 600px;">
<p>Bonjour {{contact.first_name}},</p>
<p>Je me permets de revenir vers vous concernant notre derniere discussion.</p>
<p>Avez-vous eu l'occasion d'examiner notre proposition ? Je reste a votre disposition pour repondre a vos questions.</p>
<p>Bien cordialement,<br>Hugo Frely</p>
</div>""",
                "tags": ["relance", "suivi"],
                "is_shared": True,
            },
            {
                "name": "Remerciement apres signature",
                "subject": "Bienvenue chez Qeylo, {{contact.first_name}} !",
                "body_html": """<div style="font-family: Arial, sans-serif; max-width: 600px;">
<p>Bonjour {{contact.first_name}},</p>
<p>Merci pour votre confiance ! Nous sommes ravis de vous compter parmi nos clients.</p>
<p>Voici les prochaines etapes :</p>
<ol>
<li>Kick-off projet dans les 5 jours ouvrables</li>
<li>Formation de votre equipe</li>
<li>Mise en production</li>
</ol>
<p>Votre interlocuteur dedie reviendra vers vous tres rapidement.</p>
<p>A bientot,<br>Hugo Frely</p>
</div>""",
                "tags": ["onboarding", "client"],
                "is_shared": True,
            },
            {
                "name": "Invitation webinar",
                "subject": "Invitation : Webinar exclusif sur la gestion CRM",
                "body_html": """<div style="font-family: Arial, sans-serif; max-width: 600px;">
<p>Bonjour {{contact.first_name}},</p>
<p>Nous avons le plaisir de vous inviter a notre prochain webinar :</p>
<p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
<strong>Comment optimiser votre pipeline de vente en 2026</strong><br>
Date : Jeudi 20 mars a 14h00<br>
Duree : 45 minutes + Q&A
</p>
<p>Inscrivez-vous des maintenant !</p>
<p>Cordialement,<br>L'equipe Qeylo</p>
</div>""",
                "tags": ["webinar", "marketing", "evenement"],
                "is_shared": True,
            },
            {
                "name": "Suivi post-demo",
                "subject": "Suite a notre demonstration, {{contact.first_name}}",
                "body_html": """<div style="font-family: Arial, sans-serif; max-width: 600px;">
<p>Bonjour {{contact.first_name}},</p>
<p>Merci d'avoir pris le temps de decouvrir notre solution lors de la demonstration.</p>
<p>Comme discute, voici un recapitulatif des points abordes et les prochaines etapes envisagees.</p>
<p>Je reste a votre entiere disposition.</p>
<p>Cordialement,<br>Hugo Frely</p>
</div>""",
                "tags": ["demo", "suivi"],
                "is_shared": False,
            },
        ]

        templates = []
        for data in templates_data:
            templates.append(EmailTemplate(
                organization=org,
                created_by=user,
                name=data["name"],
                subject=data["subject"],
                body_html=data["body_html"],
                tags=data["tags"],
                is_shared=data["is_shared"],
            ))
        EmailTemplate.objects.bulk_create(templates)
        return list(EmailTemplate.objects.filter(organization=org))

    def _create_notifications(self, org, user, contacts, deals, tasks, now):
        notifs = []

        # Task reminders
        upcoming_tasks = [t for t in tasks if not t.is_done][:20]
        for task in upcoming_tasks:
            notifs.append(Notification(
                organization=org,
                recipient=user,
                type="task_reminder",
                title="Rappel de tache",
                message=f"La tache '{task.description[:50]}' est prevue prochainement.",
                link=f"/tasks",
                is_read=random.random() < 0.4,
            ))

        # Deal updates
        for deal in random.sample(deals, min(15, len(deals))):
            notifs.append(Notification(
                organization=org,
                recipient=user,
                type="deal_update",
                title="Mise a jour de deal",
                message=f"Le deal '{deal.name[:50]}' a ete mis a jour.",
                link=f"/deals/{deal.id}",
                is_read=random.random() < 0.6,
            ))

        # Task due notifications
        overdue = [t for t in tasks if not t.is_done and t.due_date < now][:10]
        for task in overdue:
            notifs.append(Notification(
                organization=org,
                recipient=user,
                type="task_due",
                title="Tache en retard",
                message=f"La tache '{task.description[:50]}' est en retard.",
                link=f"/tasks",
                is_read=random.random() < 0.3,
            ))

        Notification.objects.bulk_create(notifs)

        # Update created_at
        from django.db import connection
        all_notifs = list(Notification.objects.filter(organization=org))
        with connection.cursor() as cursor:
            for notif in all_notifs:
                days_ago = random.randint(0, 30)
                created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                cursor.execute(
                    "UPDATE notifications_notification SET created_at = %s WHERE id = %s",
                    [created_at, notif.id]
                )

        return len(notifs)
