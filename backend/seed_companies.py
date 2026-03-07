"""
Seed script: Creates companies, links existing contacts, creates deals & relationships.
Run via: docker compose exec backend python manage.py shell < seed_companies.py
"""
import random
import django
django.setup()

from django.utils import timezone
from organizations.models import Organization
from contacts.models import Contact, ContactRelationship
from companies.models import Company
from deals.models import Deal, Pipeline, PipelineStage

org = Organization.objects.first()
if not org:
    print("ERROR: No organization found.")
    exit()

user = org.memberships.first().user
print(f"Organization: {org.name}, User: {user}")

# Get existing pipeline/stages
pipeline = Pipeline.objects.filter(organization=org, is_default=True).first()
if not pipeline:
    pipeline = Pipeline.objects.filter(organization=org).first()
stages = list(PipelineStage.objects.filter(pipeline=pipeline).order_by("order")) if pipeline else []

# ── COMPANIES DATA ──────────────────────────────────────────────────────────

companies_data = [
    # Tech companies (group with parent)
    {
        "name": "TechVision Group",
        "domain": "techvision-group.fr",
        "industry": "Technologie",
        "annual_revenue": 45000000,
        "employee_count": 320,
        "siret": "12345678901234",
        "vat_number": "FR12345678901",
        "legal_status": "SA",
        "health_score": "excellent",
        "phone": "+33 1 42 68 53 00",
        "email": "contact@techvision-group.fr",
        "website": "https://techvision-group.fr",
        "address": "45 Avenue des Champs-Élysées",
        "city": "Paris",
        "zip_code": "75008",
        "country": "France",
        "state": "Île-de-France",
        "source": "Salon professionnel",
        "description": "Groupe technologique leader en solutions cloud et IA pour les entreprises françaises. Fondé en 2010, le groupe a connu une croissance rapide grâce à ses solutions innovantes.",
    },
    {
        "name": "TechVision Cloud",
        "domain": "cloud.techvision-group.fr",
        "industry": "Cloud Computing",
        "annual_revenue": 18000000,
        "employee_count": 95,
        "health_score": "excellent",
        "phone": "+33 1 42 68 53 10",
        "email": "cloud@techvision-group.fr",
        "city": "Paris",
        "zip_code": "75008",
        "country": "France",
        "source": "Interne",
        "description": "Filiale cloud du groupe TechVision, spécialisée dans l'hébergement et les solutions SaaS.",
        "_parent": "TechVision Group",
    },
    {
        "name": "TechVision AI Lab",
        "domain": "ai.techvision-group.fr",
        "industry": "Intelligence Artificielle",
        "annual_revenue": 8500000,
        "employee_count": 45,
        "health_score": "good",
        "phone": "+33 1 42 68 53 20",
        "email": "ai@techvision-group.fr",
        "city": "Lyon",
        "zip_code": "69002",
        "country": "France",
        "source": "Interne",
        "description": "Centre R&D IA du groupe TechVision. Développe les algorithmes de machine learning et NLP.",
        "_parent": "TechVision Group",
    },
    # Consulting
    {
        "name": "Nexus Consulting",
        "domain": "nexus-consulting.fr",
        "industry": "Conseil",
        "annual_revenue": 12000000,
        "employee_count": 85,
        "siret": "23456789012345",
        "legal_status": "SAS",
        "health_score": "good",
        "phone": "+33 4 72 33 12 00",
        "email": "info@nexus-consulting.fr",
        "website": "https://nexus-consulting.fr",
        "address": "12 Rue de la République",
        "city": "Lyon",
        "zip_code": "69001",
        "country": "France",
        "state": "Auvergne-Rhône-Alpes",
        "source": "Recommandation",
        "description": "Cabinet de conseil en transformation digitale et stratégie SI. Accompagne les ETI dans leur modernisation.",
    },
    # Manufacturing
    {
        "name": "Durand Industries",
        "domain": "durand-industries.fr",
        "industry": "Industrie manufacturière",
        "annual_revenue": 78000000,
        "employee_count": 540,
        "siret": "34567890123456",
        "vat_number": "FR34567890123",
        "legal_status": "SA",
        "health_score": "good",
        "phone": "+33 3 88 45 67 00",
        "email": "contact@durand-industries.fr",
        "website": "https://durand-industries.fr",
        "address": "Zone Industrielle Nord, Rue des Ateliers",
        "city": "Strasbourg",
        "zip_code": "67000",
        "country": "France",
        "state": "Grand Est",
        "source": "Prospection directe",
        "description": "Leader régional en fabrication de composants mécaniques de précision pour l'aéronautique et l'automobile.",
    },
    {
        "name": "Durand Aéro",
        "domain": "aero.durand-industries.fr",
        "industry": "Aéronautique",
        "annual_revenue": 32000000,
        "employee_count": 180,
        "health_score": "excellent",
        "city": "Toulouse",
        "zip_code": "31000",
        "country": "France",
        "source": "Interne",
        "description": "Division aéronautique de Durand Industries. Fournisseur certifié Airbus et Safran.",
        "_parent": "Durand Industries",
    },
    # Retail / E-commerce
    {
        "name": "ModaStyle",
        "domain": "modastyle.com",
        "industry": "E-commerce / Mode",
        "annual_revenue": 25000000,
        "employee_count": 120,
        "siret": "45678901234567",
        "legal_status": "SAS",
        "health_score": "at_risk",
        "phone": "+33 1 55 34 78 00",
        "email": "partnerships@modastyle.com",
        "website": "https://modastyle.com",
        "address": "8 Rue du Faubourg Saint-Honoré",
        "city": "Paris",
        "zip_code": "75008",
        "country": "France",
        "source": "Site web",
        "description": "Plateforme e-commerce de mode premium. En pleine restructuration après une baisse de CA de 15%.",
    },
    # Finance
    {
        "name": "FinSecure Partners",
        "domain": "finsecure.fr",
        "industry": "Services financiers",
        "annual_revenue": 95000000,
        "employee_count": 280,
        "siret": "56789012345678",
        "vat_number": "FR56789012345",
        "legal_status": "SA",
        "health_score": "excellent",
        "phone": "+33 1 40 12 34 56",
        "email": "contact@finsecure.fr",
        "website": "https://finsecure.fr",
        "address": "1 Place de la Bourse",
        "city": "Paris",
        "zip_code": "75002",
        "country": "France",
        "state": "Île-de-France",
        "source": "Événement",
        "description": "Société de gestion d'actifs et de conseil en investissement. Gère 2.5 milliards d'euros d'actifs.",
    },
    # Healthcare
    {
        "name": "BioSanté Lab",
        "domain": "biosante-lab.fr",
        "industry": "Santé / Biotech",
        "annual_revenue": 15000000,
        "employee_count": 65,
        "siret": "67890123456789",
        "legal_status": "SAS",
        "health_score": "good",
        "phone": "+33 4 67 89 01 23",
        "email": "info@biosante-lab.fr",
        "website": "https://biosante-lab.fr",
        "address": "Parc Euromédecine, Bât. C",
        "city": "Montpellier",
        "zip_code": "34090",
        "country": "France",
        "state": "Occitanie",
        "source": "Conférence",
        "description": "Startup biotech spécialisée dans les diagnostics rapides. Série B en cours de levée.",
    },
    # Real Estate
    {
        "name": "Immobilière Atlantique",
        "domain": "immo-atlantique.fr",
        "industry": "Immobilier",
        "annual_revenue": 35000000,
        "employee_count": 150,
        "siret": "78901234567890",
        "legal_status": "SA",
        "health_score": "good",
        "phone": "+33 2 40 56 78 90",
        "email": "contact@immo-atlantique.fr",
        "website": "https://immo-atlantique.fr",
        "address": "25 Quai de la Fosse",
        "city": "Nantes",
        "zip_code": "44000",
        "country": "France",
        "state": "Pays de la Loire",
        "source": "Réseau",
        "description": "Promoteur immobilier et gestionnaire de patrimoine. 12 programmes en cours sur la façade atlantique.",
    },
    # Education
    {
        "name": "EduTech Solutions",
        "domain": "edutech-solutions.fr",
        "industry": "EdTech",
        "annual_revenue": 5500000,
        "employee_count": 35,
        "legal_status": "SAS",
        "health_score": "good",
        "phone": "+33 5 61 23 45 67",
        "email": "hello@edutech-solutions.fr",
        "website": "https://edutech-solutions.fr",
        "city": "Toulouse",
        "zip_code": "31000",
        "country": "France",
        "source": "LinkedIn",
        "description": "Plateforme LMS nouvelle génération avec IA adaptative. 200+ établissements clients.",
    },
    # Energy
    {
        "name": "GreenPower SAS",
        "domain": "greenpower-energy.fr",
        "industry": "Énergie renouvelable",
        "annual_revenue": 42000000,
        "employee_count": 200,
        "siret": "89012345678901",
        "vat_number": "FR89012345678",
        "legal_status": "SAS",
        "health_score": "excellent",
        "phone": "+33 4 91 23 45 67",
        "email": "info@greenpower-energy.fr",
        "website": "https://greenpower-energy.fr",
        "address": "Technopôle de Château-Gombert",
        "city": "Marseille",
        "zip_code": "13013",
        "country": "France",
        "state": "Provence-Alpes-Côte d'Azur",
        "source": "Appel d'offres",
        "description": "Développeur et exploitant de parcs solaires et éoliens. 500MW installés en France et en Espagne.",
    },
    # Logistics
    {
        "name": "TransEurope Logistics",
        "domain": "transeurope-log.eu",
        "industry": "Transport & Logistique",
        "annual_revenue": 62000000,
        "employee_count": 450,
        "siret": "90123456789012",
        "legal_status": "SA",
        "health_score": "at_risk",
        "phone": "+33 3 20 45 67 89",
        "email": "commercial@transeurope-log.eu",
        "website": "https://transeurope-log.eu",
        "address": "Zone Logistique, Rue du Transport",
        "city": "Lille",
        "zip_code": "59000",
        "country": "France",
        "state": "Hauts-de-France",
        "source": "Prospection directe",
        "description": "Opérateur logistique européen. Réseau de 15 entrepôts. En difficulté suite à la hausse des coûts carburant.",
    },
    # Media
    {
        "name": "Médias Digitaux",
        "domain": "medias-digitaux.fr",
        "industry": "Médias & Communication",
        "annual_revenue": 8000000,
        "employee_count": 55,
        "legal_status": "SARL",
        "health_score": "good",
        "phone": "+33 1 43 56 78 90",
        "email": "contact@medias-digitaux.fr",
        "website": "https://medias-digitaux.fr",
        "city": "Paris",
        "zip_code": "75011",
        "country": "France",
        "source": "Recommandation",
        "description": "Agence de communication digitale et production de contenus. Clients : CAC40 et startups.",
    },
    # Food
    {
        "name": "Saveurs & Terroirs",
        "domain": "saveurs-terroirs.fr",
        "industry": "Agroalimentaire",
        "annual_revenue": 22000000,
        "employee_count": 175,
        "siret": "01234567890123",
        "legal_status": "SA",
        "health_score": "good",
        "phone": "+33 5 56 78 90 12",
        "email": "pro@saveurs-terroirs.fr",
        "website": "https://saveurs-terroirs.fr",
        "address": "Domaine de la Colline",
        "city": "Bordeaux",
        "zip_code": "33000",
        "country": "France",
        "state": "Nouvelle-Aquitaine",
        "source": "Salon professionnel",
        "description": "Producteur et distributeur de produits gastronomiques régionaux. Réseau de 80 producteurs partenaires.",
    },
    # Churned
    {
        "name": "OldTech SARL",
        "domain": "oldtech.fr",
        "industry": "Informatique",
        "annual_revenue": 2000000,
        "employee_count": 15,
        "legal_status": "SARL",
        "health_score": "churned",
        "phone": "+33 1 45 67 89 01",
        "email": "info@oldtech.fr",
        "city": "Paris",
        "zip_code": "75015",
        "country": "France",
        "source": "Ancien client",
        "description": "Ancien client perdu en 2024. Maintenait des systèmes legacy. A migré vers un concurrent.",
    },
]

# ── CREATE COMPANIES ────────────────────────────────────────────────────────

created_companies = {}
# First pass: create all without parents
for data in companies_data:
    parent_name = data.pop("_parent", None)
    c = Company.objects.create(
        organization=org,
        created_by=user,
        owner=user,
        **data,
    )
    created_companies[c.name] = (c, parent_name)
    print(f"  Created company: {c.name}")

# Second pass: set parents
for name, (company, parent_name) in created_companies.items():
    if parent_name and parent_name in created_companies:
        company.parent = created_companies[parent_name][0]
        company.save(update_fields=["parent"])
        print(f"  Set parent: {name} -> {parent_name}")

print(f"\n✓ {len(created_companies)} companies created")

# ── CONTACTS DATA ──────────────────────────────────────────────────────────

contacts_data = [
    # TechVision Group
    {"first_name": "Philippe", "last_name": "Martin", "email": "p.martin@techvision-group.fr", "job_title": "PDG", "phone": "+33 6 12 34 56 78", "company": "TechVision Group", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "email", "city": "Paris", "country": "France"},
    {"first_name": "Sophie", "last_name": "Dubois", "email": "s.dubois@techvision-group.fr", "job_title": "Directrice Commerciale", "phone": "+33 6 23 45 67 89", "company": "TechVision Group", "lead_score": "hot", "decision_role": "influencer", "preferred_channel": "phone", "city": "Paris", "country": "France"},
    {"first_name": "Marc", "last_name": "Bernard", "email": "m.bernard@techvision-group.fr", "job_title": "DAF", "phone": "+33 6 34 56 78 90", "company": "TechVision Group", "lead_score": "warm", "decision_role": "decision_maker", "preferred_channel": "email", "city": "Paris", "country": "France"},
    {"first_name": "Julie", "last_name": "Moreau", "email": "j.moreau@cloud.techvision-group.fr", "job_title": "CTO", "phone": "+33 6 45 67 89 01", "company": "TechVision Cloud", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "email", "city": "Paris", "country": "France"},
    {"first_name": "Thomas", "last_name": "Petit", "email": "t.petit@ai.techvision-group.fr", "job_title": "Lead Data Scientist", "phone": "+33 6 56 78 90 12", "company": "TechVision AI Lab", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "linkedin", "city": "Lyon", "country": "France"},

    # Nexus Consulting
    {"first_name": "Caroline", "last_name": "Laurent", "email": "c.laurent@nexus-consulting.fr", "job_title": "Managing Partner", "phone": "+33 6 67 89 01 23", "company": "Nexus Consulting", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Lyon", "country": "France"},
    {"first_name": "Arnaud", "last_name": "Fontaine", "email": "a.fontaine@nexus-consulting.fr", "job_title": "Consultant Senior", "phone": "+33 6 78 90 12 34", "company": "Nexus Consulting", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "email", "city": "Lyon", "country": "France"},

    # Durand Industries
    {"first_name": "Jean-Pierre", "last_name": "Durand", "email": "jp.durand@durand-industries.fr", "job_title": "PDG Fondateur", "phone": "+33 6 89 01 23 45", "company": "Durand Industries", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Strasbourg", "country": "France"},
    {"first_name": "Isabelle", "last_name": "Roche", "email": "i.roche@durand-industries.fr", "job_title": "Directrice Achats", "phone": "+33 6 90 12 34 56", "company": "Durand Industries", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "email", "city": "Strasbourg", "country": "France"},
    {"first_name": "Luc", "last_name": "Garnier", "email": "l.garnier@aero.durand-industries.fr", "job_title": "Directeur Technique", "phone": "+33 6 01 23 45 67", "company": "Durand Aéro", "lead_score": "warm", "decision_role": "decision_maker", "preferred_channel": "email", "city": "Toulouse", "country": "France"},

    # ModaStyle
    {"first_name": "Camille", "last_name": "Blanc", "email": "c.blanc@modastyle.com", "job_title": "CEO", "phone": "+33 6 11 22 33 44", "company": "ModaStyle", "lead_score": "cold", "decision_role": "decision_maker", "preferred_channel": "email", "city": "Paris", "country": "France"},
    {"first_name": "Romain", "last_name": "Mercier", "email": "r.mercier@modastyle.com", "job_title": "Head of Digital", "phone": "+33 6 22 33 44 55", "company": "ModaStyle", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "linkedin", "city": "Paris", "country": "France"},

    # FinSecure
    {"first_name": "Alain", "last_name": "Girard", "email": "a.girard@finsecure.fr", "job_title": "Directeur Général", "phone": "+33 6 33 44 55 66", "company": "FinSecure Partners", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Paris", "country": "France"},
    {"first_name": "Marie", "last_name": "Lefebvre", "email": "m.lefebvre@finsecure.fr", "job_title": "Responsable IT", "phone": "+33 6 44 55 66 77", "company": "FinSecure Partners", "lead_score": "hot", "decision_role": "influencer", "preferred_channel": "email", "city": "Paris", "country": "France"},
    {"first_name": "Nicolas", "last_name": "Dupont", "email": "n.dupont@finsecure.fr", "job_title": "Analyste Senior", "phone": "+33 6 55 66 77 88", "company": "FinSecure Partners", "lead_score": "warm", "decision_role": "user", "preferred_channel": "email", "city": "Paris", "country": "France"},

    # BioSanté
    {"first_name": "Dr. Élise", "last_name": "Rousseau", "email": "e.rousseau@biosante-lab.fr", "job_title": "Directrice Scientifique", "phone": "+33 6 66 77 88 99", "company": "BioSanté Lab", "lead_score": "warm", "decision_role": "decision_maker", "preferred_channel": "email", "city": "Montpellier", "country": "France"},

    # Immobilière Atlantique
    {"first_name": "Stéphane", "last_name": "Morel", "email": "s.morel@immo-atlantique.fr", "job_title": "DG", "phone": "+33 6 77 88 99 00", "company": "Immobilière Atlantique", "lead_score": "warm", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Nantes", "country": "France"},
    {"first_name": "Aurélie", "last_name": "Simon", "email": "a.simon@immo-atlantique.fr", "job_title": "Responsable Marketing", "phone": "+33 6 88 99 00 11", "company": "Immobilière Atlantique", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "email", "city": "Nantes", "country": "France"},

    # EduTech
    {"first_name": "Maxime", "last_name": "Leroy", "email": "m.leroy@edutech-solutions.fr", "job_title": "Co-fondateur & CEO", "phone": "+33 6 99 00 11 22", "company": "EduTech Solutions", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "linkedin", "city": "Toulouse", "country": "France"},

    # GreenPower
    {"first_name": "Valérie", "last_name": "Perrin", "email": "v.perrin@greenpower-energy.fr", "job_title": "Présidente", "phone": "+33 6 10 20 30 40", "company": "GreenPower SAS", "lead_score": "hot", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Marseille", "country": "France"},
    {"first_name": "David", "last_name": "Bonnet", "email": "d.bonnet@greenpower-energy.fr", "job_title": "Directeur Projets", "phone": "+33 6 20 30 40 50", "company": "GreenPower SAS", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "email", "city": "Marseille", "country": "France"},

    # TransEurope
    {"first_name": "Patrick", "last_name": "Fournier", "email": "p.fournier@transeurope-log.eu", "job_title": "DG", "phone": "+33 6 30 40 50 60", "company": "TransEurope Logistics", "lead_score": "cold", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Lille", "country": "France"},

    # Médias Digitaux
    {"first_name": "Léa", "last_name": "Muller", "email": "l.muller@medias-digitaux.fr", "job_title": "Directrice Artistique", "phone": "+33 6 40 50 60 70", "company": "Médias Digitaux", "lead_score": "warm", "decision_role": "influencer", "preferred_channel": "email", "city": "Paris", "country": "France"},

    # Saveurs & Terroirs
    {"first_name": "François", "last_name": "Gauthier", "email": "f.gauthier@saveurs-terroirs.fr", "job_title": "Directeur Commercial", "phone": "+33 6 50 60 70 80", "company": "Saveurs & Terroirs", "lead_score": "warm", "decision_role": "decision_maker", "preferred_channel": "phone", "city": "Bordeaux", "country": "France"},
    {"first_name": "Claire", "last_name": "Vasseur", "email": "c.vasseur@saveurs-terroirs.fr", "job_title": "Responsable Logistique", "phone": "+33 6 60 70 80 90", "company": "Saveurs & Terroirs", "lead_score": "cold", "decision_role": "user", "preferred_channel": "email", "city": "Bordeaux", "country": "France"},
]

# ── CREATE CONTACTS & LINK TO COMPANIES ─────────────────────────────────────

created_contacts = {}
for data in contacts_data:
    company_name = data.pop("company")
    company_obj = created_companies[company_name][0] if company_name in created_companies else None

    contact = Contact.objects.create(
        organization=org,
        created_by=user,
        company=company_name,
        company_entity=company_obj,
        **data,
    )
    created_contacts[f"{data['first_name']} {data['last_name']}"] = contact
    print(f"  Created contact: {contact} -> {company_name}")

print(f"\n✓ {len(created_contacts)} contacts created and linked")

# ── ALSO LINK EXISTING CONTACTS ─────────────────────────────────────────────

existing_contacts = Contact.objects.filter(
    organization=org,
    company_entity__isnull=True,
    deleted_at__isnull=True,
).exclude(company="")

linked = 0
for c in existing_contacts:
    # Try to match by company text field
    for name, (comp, _) in created_companies.items():
        if c.company.lower() in name.lower() or name.lower() in c.company.lower():
            c.company_entity = comp
            c.save(update_fields=["company_entity"])
            linked += 1
            print(f"  Linked existing contact: {c} -> {name}")
            break

print(f"✓ {linked} existing contacts linked to companies")

# ── CREATE DEALS ─────────────────────────────────────────────────────────────

if stages:
    deals_data = [
        {"name": "TechVision - Licence Enterprise", "amount": 85000, "contact": "Philippe Martin", "company": "TechVision Group", "stage_idx": 3, "notes": "Négociation en cours pour 50 postes. Budget validé par le DAF."},
        {"name": "TechVision Cloud - Migration AWS", "amount": 120000, "contact": "Julie Moreau", "company": "TechVision Cloud", "stage_idx": 2, "notes": "Migration de l'infra on-premise vers le cloud. POC validé."},
        {"name": "TechVision AI - Module NLP", "amount": 45000, "contact": "Thomas Petit", "company": "TechVision AI Lab", "stage_idx": 1, "notes": "Premier contact pour intégrer notre module NLP dans leur pipeline."},
        {"name": "Nexus - Formation équipe", "amount": 18000, "contact": "Caroline Laurent", "company": "Nexus Consulting", "stage_idx": 4, "notes": "Deal gagné ! Formation de 10 consultants sur notre plateforme."},
        {"name": "Durand Industries - ERP", "amount": 250000, "contact": "Jean-Pierre Durand", "company": "Durand Industries", "stage_idx": 2, "notes": "Projet de remplacement de l'ERP. Décision dans 3 mois."},
        {"name": "Durand Aéro - Module qualité", "amount": 65000, "contact": "Luc Garnier", "company": "Durand Aéro", "stage_idx": 3, "notes": "Module de suivi qualité pour certification AS9100."},
        {"name": "ModaStyle - Refonte e-commerce", "amount": 95000, "contact": "Romain Mercier", "company": "ModaStyle", "stage_idx": 1, "notes": "Prospection. Budget serré, entreprise en difficulté."},
        {"name": "FinSecure - Plateforme trading", "amount": 350000, "contact": "Alain Girard", "company": "FinSecure Partners", "stage_idx": 3, "notes": "Négociation avancée. Conformité réglementaire à valider."},
        {"name": "FinSecure - Dashboard analytics", "amount": 75000, "contact": "Marie Lefebvre", "company": "FinSecure Partners", "stage_idx": 4, "notes": "Gagné ! Livraison prévue T2 2026."},
        {"name": "BioSanté - App diagnostic", "amount": 55000, "contact": "Dr. Élise Rousseau", "company": "BioSanté Lab", "stage_idx": 2, "notes": "Application mobile pour diagnostic rapide. Phase de POC."},
        {"name": "Immo Atlantique - CRM sur-mesure", "amount": 42000, "contact": "Stéphane Morel", "company": "Immobilière Atlantique", "stage_idx": 2, "notes": "Adaptation de notre CRM pour la gestion de biens immobiliers."},
        {"name": "EduTech - Intégration LMS", "amount": 28000, "contact": "Maxime Leroy", "company": "EduTech Solutions", "stage_idx": 4, "notes": "Gagné. Intégration API avec leur plateforme LMS."},
        {"name": "GreenPower - Monitoring IoT", "amount": 180000, "contact": "Valérie Perrin", "company": "GreenPower SAS", "stage_idx": 3, "notes": "Système de monitoring temps réel pour les parcs solaires. Appel d'offres remporté."},
        {"name": "GreenPower - Phase 2 Éolien", "amount": 220000, "contact": "David Bonnet", "company": "GreenPower SAS", "stage_idx": 1, "notes": "Extension du monitoring aux parcs éoliens. Prospection."},
        {"name": "TransEurope - Tracking temps réel", "amount": 135000, "contact": "Patrick Fournier", "company": "TransEurope Logistics", "stage_idx": 5, "notes": "Deal perdu. Ont choisi un concurrent moins cher."},
        {"name": "Saveurs - Marketplace B2B", "amount": 38000, "contact": "François Gauthier", "company": "Saveurs & Terroirs", "stage_idx": 2, "notes": "Plateforme de commande B2B pour les restaurateurs."},
    ]

    deals_created = 0
    for d in deals_data:
        stage_idx = min(d.pop("stage_idx"), len(stages)) - 1
        contact_name = d.pop("contact")
        company_name = d.pop("company")

        contact_obj = created_contacts.get(contact_name)
        company_obj = created_companies[company_name][0] if company_name in created_companies else None

        Deal.objects.create(
            organization=org,
            created_by=user,
            contact=contact_obj,
            company=company_obj,
            stage=stages[stage_idx],
            pipeline=pipeline,
            **d,
        )
        deals_created += 1
        print(f"  Created deal: {d['name']} ({d['amount']}€)")

    print(f"\n✓ {deals_created} deals created")
else:
    print("⚠ No pipeline/stages found, skipping deals creation")

# ── CREATE RELATIONSHIPS (ORG CHART) ────────────────────────────────────────

relationships = [
    # TechVision Group hierarchy
    ("Sophie Dubois", "Philippe Martin", "reports_to"),
    ("Marc Bernard", "Philippe Martin", "reports_to"),
    ("Philippe Martin", "Sophie Dubois", "manages"),
    ("Philippe Martin", "Marc Bernard", "manages"),
    ("Julie Moreau", "Philippe Martin", "reports_to"),
    ("Thomas Petit", "Julie Moreau", "reports_to"),
    ("Sophie Dubois", "Marc Bernard", "colleague"),

    # Durand Industries
    ("Isabelle Roche", "Jean-Pierre Durand", "reports_to"),
    ("Luc Garnier", "Jean-Pierre Durand", "reports_to"),
    ("Jean-Pierre Durand", "Isabelle Roche", "manages"),

    # FinSecure
    ("Marie Lefebvre", "Alain Girard", "reports_to"),
    ("Nicolas Dupont", "Marie Lefebvre", "reports_to"),
    ("Alain Girard", "Marie Lefebvre", "manages"),
    ("Marie Lefebvre", "Nicolas Dupont", "manages"),

    # GreenPower
    ("David Bonnet", "Valérie Perrin", "reports_to"),

    # Saveurs & Terroirs
    ("Claire Vasseur", "François Gauthier", "reports_to"),

    # Cross-company: champions & blockers
    ("Marie Lefebvre", "Alain Girard", "champion"),
    ("Patrick Fournier", "Patrick Fournier", None),  # skip self
    ("Romain Mercier", "Camille Blanc", "champion"),
    ("Isabelle Roche", "Jean-Pierre Durand", "influencer"),
]

rels_created = 0
for from_name, to_name, rel_type in relationships:
    if rel_type is None or from_name == to_name:
        continue
    from_c = created_contacts.get(from_name)
    to_c = created_contacts.get(to_name)
    if from_c and to_c:
        try:
            ContactRelationship.objects.create(
                organization=org,
                from_contact=from_c,
                to_contact=to_c,
                relationship_type=rel_type,
            )
            rels_created += 1
            print(f"  Relationship: {from_name} --[{rel_type}]--> {to_name}")
        except Exception as e:
            print(f"  Skip (duplicate?): {from_name} -> {to_name}: {e}")

print(f"\n✓ {rels_created} relationships created")

# ── SUMMARY ──────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("SEED COMPLETE")
print(f"  Companies:     {Company.objects.filter(organization=org).count()}")
print(f"  Contacts:      {Contact.objects.filter(organization=org).count()}")
print(f"  Deals:         {Deal.objects.filter(organization=org).count()}")
print(f"  Relationships: {ContactRelationship.objects.filter(organization=org).count()}")
print("=" * 60)
