import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact, ContactCategory
from deals.models import Deal, Pipeline, PipelineStage
from tasks.models import Task
from notes.models import TimelineEntry


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
    help = "Seed test data for the test@frely.fr account"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default="test@frely.fr",
            help="Email of the user to seed data for",
        )
        parser.add_argument(
            "--contacts",
            type=int,
            default=200,
            help="Number of contacts to create",
        )
        parser.add_argument(
            "--deals",
            type=int,
            default=80,
            help="Number of deals to create",
        )
        parser.add_argument(
            "--tasks",
            type=int,
            default=120,
            help="Number of tasks to create",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing test data before seeding",
        )

    def handle(self, *args, **options):
        email = options["email"]
        num_contacts = options["contacts"]
        num_deals = options["deals"]
        num_tasks = options["tasks"]

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

        categories = list(ContactCategory.objects.filter(organization=org))
        stages = list(PipelineStage.objects.filter(organization=org))

        if not stages:
            Pipeline.create_defaults(org)
            stages = list(PipelineStage.objects.filter(organization=org))

        now = timezone.now()

        # Create contacts
        contacts = self._create_contacts(org, user, categories, num_contacts, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(contacts)} contacts created"))

        # Create deals
        deals = self._create_deals(org, user, stages, contacts, num_deals, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(deals)} deals created"))

        # Create tasks
        tasks = self._create_tasks(org, user, contacts, deals, num_tasks, now)
        self.stdout.write(self.style.SUCCESS(f"  {len(tasks)} tasks created"))

        # Create timeline entries
        entries = self._create_timeline_entries(org, user, contacts, deals, now)
        self.stdout.write(self.style.SUCCESS(f"  {entries} timeline entries created"))

        self.stdout.write(self.style.SUCCESS("Done!"))

    def _clear_data(self, org):
        TimelineEntry.objects.filter(organization=org).delete()
        Task.objects.filter(organization=org).delete()
        Deal.objects.filter(organization=org).delete()
        Contact.objects.filter(organization=org).delete()
        self.stdout.write("  Existing data cleared.")

    def _create_contacts(self, org, user, categories, count, now):
        contacts = []
        used_emails = set()

        for i in range(count):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            company = random.choice(COMPANIES)
            city, postal, state = random.choice(CITIES)

            # Generate unique email
            email_base = f"{first.lower()}.{last.lower()}"
            email = f"{email_base}@{company.lower().split()[0].replace(',', '')}.fr"
            while email in used_emails:
                email = f"{email_base}{random.randint(1, 999)}@{company.lower().split()[0]}.fr"
            used_emails.add(email)

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
                    ["VIP", "tech", "startup", "PME", "grand_compte", "partenaire", "prospect", "fidele"],
                    k=random.randint(0, 3),
                ),
                estimated_budget=Decimal(str(random.choice([None, 5000, 10000, 25000, 50000, 100000, 250000, 500000]) or 0)) if random.random() > 0.3 else None,
                notes=random.choice([
                    "", "",
                    f"Contact rencontre au salon Tech Paris. Interesse par notre offre.",
                    f"Recommande par un partenaire. A rappeler.",
                    f"Client potentiel pour un projet de grande envergure.",
                    f"A participe a notre webinar du mois dernier.",
                ]),
            )
            contacts.append(contact)

        Contact.objects.bulk_create(contacts)
        # Refresh to get IDs
        contacts = list(Contact.objects.filter(organization=org).order_by("-created_at")[:count])

        # Assign categories
        if categories:
            for contact in contacts:
                cats = random.sample(categories, k=random.randint(0, min(2, len(categories))))
                if cats:
                    contact.categories.set(cats)

        return contacts

    def _create_deals(self, org, user, stages, contacts, count, now):
        deals = []
        # Exclude "Gagne" and "Perdu" from active stages for distribution
        active_stages = [s for s in stages if s.name not in ("Gagne", "Perdu", "Gagné", "Perdu")]
        won_stage = next((s for s in stages if s.name in ("Gagne", "Gagné")), None)
        lost_stage = next((s for s in stages if s.name == "Perdu"), None)

        for i in range(count):
            contact = random.choice(contacts) if random.random() > 0.1 else None
            company = contact.company if contact else random.choice(COMPANIES)
            template = random.choice(DEAL_NAMES)
            name = template.format(company=company)

            # 60% active, 25% won, 15% lost
            r = random.random()
            if r < 0.6 and active_stages:
                stage = random.choice(active_stages)
                closed_at = None
            elif r < 0.85 and won_stage:
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
                notes=random.choice([
                    "",
                    "Deal prioritaire. Suivi hebdomadaire.",
                    "En attente de validation budget cote client.",
                    "Bonne opportunite, decision prevue fin de mois.",
                    "Concurrent identifie. Travailler sur la differenciation.",
                ]),
            )
            deals.append(deal)

        Deal.objects.bulk_create(deals)
        deals = list(Deal.objects.filter(organization=org).order_by("-created_at")[:count])
        return deals

    def _create_tasks(self, org, user, contacts, deals, count, now):
        tasks = []

        for i in range(count):
            contact = random.choice(contacts) if random.random() > 0.2 else None
            deal = random.choice(deals) if random.random() > 0.5 else None
            name = f"{contact.first_name} {contact.last_name}" if contact else random.choice(COMPANIES)
            template = random.choice(TASK_DESCRIPTIONS)
            description = template.format(name=name)

            # Mix of past, today, and future tasks
            r = random.random()
            if r < 0.2:
                # Overdue
                due_date = now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 12))
                is_done = random.random() < 0.3
            elif r < 0.35:
                # Today
                due_date = now + timedelta(hours=random.randint(1, 8))
                is_done = random.random() < 0.2
            elif r < 0.7:
                # Next 30 days
                due_date = now + timedelta(days=random.randint(1, 30), hours=random.randint(0, 12))
                is_done = False
            else:
                # Completed
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
        return tasks

    def _create_timeline_entries(self, org, user, contacts, deals, now):
        entries = []

        # Create entries for contacts
        for contact in contacts:
            num_entries = random.randint(0, 5)
            name = f"{contact.first_name} {contact.last_name}"

            for j in range(num_entries):
                days_ago = random.randint(0, 180)
                entry_type = random.choice([
                    "note_added", "note_added", "call", "email_sent",
                    "email_received", "meeting", "contact_updated",
                ])
                template = random.choice(TIMELINE_NOTES)
                content = template.format(name=name)

                entry = TimelineEntry(
                    organization=org,
                    created_by=user,
                    contact=contact,
                    entry_type=entry_type,
                    content=content,
                    metadata={},
                )
                entries.append(entry)

        # Create entries for deals
        for deal in deals:
            num_entries = random.randint(1, 3)
            for j in range(num_entries):
                entry_type = random.choice([
                    "deal_created", "deal_moved", "note_added",
                ])
                content = random.choice([
                    f"Deal '{deal.name}' cree.",
                    f"Deal deplace vers une nouvelle etape.",
                    f"Note ajoutee sur le deal.",
                    f"Discussion commerciale en cours.",
                    f"Proposition envoyee au client.",
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
        return len(entries)
