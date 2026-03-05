"use client"

export function ChatIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circles */}
      <circle cx="240" cy="195" r="160" fill="#F97316" fillOpacity="0.06" />
      <circle cx="240" cy="195" r="115" fill="#F97316" fillOpacity="0.04" />

      {/* User message bubble — right-aligned with avatar */}
      <g className="animate-float">
        <circle cx="412" cy="96" r="20" fill="#F97316" />
        <text
          x="412"
          y="101"
          fill="white"
          fontSize="11"
          fontFamily="system-ui"
          fontWeight="600"
          textAnchor="middle"
        >
          HF
        </text>
        <rect x="170" y="72" width="224" height="48" rx="24" fill="#1a1a1a" />
        <text
          x="282"
          y="101"
          fill="white"
          fontSize="14"
          fontFamily="system-ui"
          textAnchor="middle"
        >
          Ajoute Marie chez Acme
        </text>
      </g>

      {/* AI response bubble — left-aligned with avatar */}
      <g className="animate-float-delayed">
        <circle cx="68" cy="174" r="20" fill="#F97316" fillOpacity="0.15" />
        <path
          d="M62 170l4 4 8-8"
          stroke="#F97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="96" y="148" width="270" height="52" rx="24" fill="white" stroke="#e5e5e5" strokeWidth="1.5" />
        <text x="116" y="170" fill="#1a1a1a" fontSize="13" fontFamily="system-ui" fontWeight="500">
          Contact créé : Marie Dupont
        </text>
        <text x="116" y="188" fill="#888" fontSize="11" fontFamily="system-ui">
          Entreprise : Acme Corp · Deal ajouté
        </text>
      </g>

      {/* Action cards — card centers: 90+70=160 and 250+70=320 */}
      <g className="animate-float">
        <rect x="90" y="232" width="140" height="88" rx="16" fill="white" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.3" />
        <g>
          <circle cx="145" cy="256" r="12" fill="#F97316" fillOpacity="0.12" />
          <path d="M141 256h8M145 252v8" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
          <text x="163" y="260" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="600">Contact</text>
        </g>
        <text x="160" y="284" fill="#555" fontSize="11" fontFamily="system-ui" textAnchor="middle">Marie Dupont</text>
        <text x="160" y="300" fill="#999" fontSize="10" fontFamily="system-ui" textAnchor="middle">Acme Corp</text>
      </g>

      <g className="animate-float-delayed">
        <rect x="250" y="232" width="140" height="88" rx="16" fill="white" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.3" />
        <g>
          <circle cx="305" cy="256" r="12" fill="#3B82F6" fillOpacity="0.12" />
          <path d="M301 256l3 3 5-6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="323" y="260" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="600">Deal</text>
        </g>
        <text x="320" y="284" fill="#555" fontSize="11" fontFamily="system-ui" textAnchor="middle">Projet refonte</text>
        <text x="320" y="300" fill="#3B82F6" fontSize="11" fontFamily="system-ui" fontWeight="600" textAnchor="middle">15 000 €</text>
      </g>

      {/* Connector lines from AI bubble to cards */}
      <path d="M180 200 L165 232" stroke="#F97316" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="3 3" />
      <path d="M300 200 L315 232" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="3 3" />

      {/* Decorative dots */}
      <circle cx="420" cy="260" r="4" fill="#F97316" fillOpacity="0.2" />
      <circle cx="438" cy="284" r="3" fill="#3B82F6" fillOpacity="0.2" />
      <circle cx="55" cy="110" r="5" fill="#F97316" fillOpacity="0.15" />
      <circle cx="42" cy="260" r="3" fill="#3B82F6" fillOpacity="0.15" />
      <circle cx="240" cy="348" r="3" fill="#F97316" fillOpacity="0.1" />
    </svg>
  )
}

export function FeaturesIllustration({ variant }: { variant: "chat" | "pipeline" | "tasks" | "ai" }) {
  const configs = {
    chat: {
      bg: "#F97316",
      icon: (
        <g>
          <rect x="20" y="16" width="56" height="20" rx="10" fill="white" fillOpacity="0.9" />
          <rect x="24" y="44" width="40" height="16" rx="8" fill="white" fillOpacity="0.5" />
          <circle cx="64" cy="24" r="3" fill="#F97316" />
          <circle cx="56" cy="24" r="3" fill="#F97316" fillOpacity="0.5" />
        </g>
      ),
    },
    pipeline: {
      bg: "#3B82F6",
      icon: (
        <g>
          <rect x="12" y="20" width="16" height="40" rx="4" fill="white" fillOpacity="0.9" />
          <rect x="34" y="14" width="16" height="46" rx="4" fill="white" fillOpacity="0.7" />
          <rect x="56" y="26" width="16" height="34" rx="4" fill="white" fillOpacity="0.5" />
        </g>
      ),
    },
    tasks: {
      bg: "#10B981",
      icon: (
        <g>
          <rect x="18" y="18" width="48" height="12" rx="3" fill="white" fillOpacity="0.9" />
          <rect x="18" y="36" width="48" height="12" rx="3" fill="white" fillOpacity="0.6" />
          <rect x="18" y="54" width="32" height="12" rx="3" fill="white" fillOpacity="0.35" />
          <path d="M14 24l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ),
    },
    ai: {
      bg: "#8B5CF6",
      icon: (
        <g>
          <circle cx="42" cy="38" r="20" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="42" cy="38" r="10" fill="white" fillOpacity="0.9" />
          <path d="M42 20V14M42 62V56M24 38H18M66 38H60M28 24l-4-4M56 52l-4-4M56 24l4-4M28 52l4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
        </g>
      ),
    },
  }

  const config = configs[variant]

  return (
    <svg viewBox="0 0 84 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[84px] h-[76px]">
      <rect width="84" height="76" rx="20" fill={config.bg} fillOpacity="0.1" />
      {config.icon}
    </svg>
  )
}

export function HowItWorksIllustration({ step }: { step: 1 | 2 | 3 }) {
  if (step === 1) {
    return (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="200" height="160" rx="20" fill="#FFF7ED" />
        {/* Chat input */}
        <rect x="24" y="100" width="152" height="36" rx="18" fill="white" stroke="#FDBA74" strokeWidth="1.5" />
        <text x="40" y="123" fill="#9CA3AF" fontSize="11" fontFamily="system-ui">Dis quelque chose...</text>
        <circle cx="160" cy="118" r="12" fill="#F97316" />
        <path d="M156 118l4-4v8z" fill="white" />
        {/* Floating text */}
        <text x="100" y="52" fill="#1a1a1a" fontSize="15" fontFamily="system-ui" fontWeight="600" textAnchor="middle">
          Parlez
        </text>
        <text x="100" y="72" fill="#888" fontSize="11" fontFamily="system-ui" textAnchor="middle">
          naturellement
        </text>
      </svg>
    )
  }

  if (step === 2) {
    return (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="200" height="160" rx="20" fill="#EFF6FF" />
        {/* Gear / processing */}
        <circle cx="100" cy="70" r="28" fill="white" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="100" cy="70" r="12" fill="#3B82F6" fillOpacity="0.15" />
        <path d="M96 66l4 4 8-8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Sparkles */}
        <circle cx="60" cy="50" r="3" fill="#3B82F6" fillOpacity="0.3" />
        <circle cx="140" cy="55" r="2" fill="#3B82F6" fillOpacity="0.2" />
        <circle cx="70" cy="95" r="2.5" fill="#3B82F6" fillOpacity="0.25" />
        <text x="100" y="125" fill="#1a1a1a" fontSize="15" fontFamily="system-ui" fontWeight="600" textAnchor="middle">
          L&apos;IA comprend
        </text>
        <text x="100" y="142" fill="#888" fontSize="11" fontFamily="system-ui" textAnchor="middle">
          et structure tout
        </text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="200" height="160" rx="20" fill="#F0FDF4" />
      {/* Cards appear */}
      <rect x="30" y="30" width="64" height="48" rx="10" fill="white" stroke="#86EFAC" strokeWidth="1.5" />
      <rect x="40" y="42" width="30" height="4" rx="2" fill="#1a1a1a" fillOpacity="0.6" />
      <rect x="40" y="52" width="44" height="3" rx="1.5" fill="#1a1a1a" fillOpacity="0.2" />
      <rect x="40" y="60" width="20" height="3" rx="1.5" fill="#10B981" fillOpacity="0.4" />

      <rect x="106" y="30" width="64" height="48" rx="10" fill="white" stroke="#86EFAC" strokeWidth="1.5" />
      <rect x="116" y="42" width="30" height="4" rx="2" fill="#1a1a1a" fillOpacity="0.6" />
      <rect x="116" y="52" width="44" height="3" rx="1.5" fill="#1a1a1a" fillOpacity="0.2" />
      <rect x="116" y="60" width="20" height="3" rx="1.5" fill="#3B82F6" fillOpacity="0.4" />

      <text x="100" y="115" fill="#1a1a1a" fontSize="15" fontFamily="system-ui" fontWeight="600" textAnchor="middle">
        C&apos;est fait
      </text>
      <text x="100" y="132" fill="#888" fontSize="11" fontFamily="system-ui" textAnchor="middle">
        contacts, deals, tâches
      </text>
    </svg>
  )
}

export function FeaturePageIllustration({ variant }: { variant: "chat" | "contacts" | "pipeline" | "tasks" | "dashboard" | "ai" }) {
  if (variant === "chat") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill="#FFF7ED" />
        {/* Chat window frame */}
        <rect x="40" y="30" width="400" height="300" rx="16" fill="white" stroke="#FDBA74" strokeWidth="1" />
        {/* Header bar */}
        <rect x="40" y="30" width="400" height="44" rx="16" fill="#FAFAFA" />
        <rect x="40" y="58" width="400" height="16" fill="#FAFAFA" />
        <circle cx="68" cy="52" r="12" fill="#F97316" fillOpacity="0.15" />
        <path d="M63 49l3 3 6-6" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="88" y="56" fill="#1a1a1a" fontSize="13" fontFamily="system-ui" fontWeight="600">Qeylo Chat</text>
        <circle cx="412" cy="52" r="6" fill="#10B981" />

        {/* User message */}
        <g className="animate-float">
          <rect x="200" y="94" width="210" height="38" rx="19" fill="#1a1a1a" />
          <text x="305" y="118" fill="white" fontSize="12" fontFamily="system-ui" textAnchor="middle">Crée un deal pour Acme, 15k€</text>
          <circle cx="424" cy="113" r="14" fill="#F97316" />
          <text x="424" y="117" fill="white" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">HF</text>
        </g>

        {/* AI response */}
        <g className="animate-float-delayed">
          <circle cx="68" cy="166" r="14" fill="#F97316" fillOpacity="0.12" />
          <path d="M63 163l3 3 6-6" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="90" y="148" width="240" height="36" rx="18" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="100" y="170" fill="#1a1a1a" fontSize="11" fontFamily="system-ui" fontWeight="500">Deal créé : Acme Corp — 15 000 €</text>
        </g>

        {/* Tool result card */}
        <g className="animate-float">
          <rect x="90" y="200" width="200" height="64" rx="12" fill="white" stroke="#F97316" strokeWidth="1" strokeOpacity="0.25" />
          <rect x="102" y="212" width="8" height="8" rx="2" fill="#F97316" fillOpacity="0.2" />
          <text x="118" y="220" fill="#1a1a1a" fontSize="10" fontFamily="system-ui" fontWeight="600">Création de deal</text>
          <text x="102" y="238" fill="#888" fontSize="9" fontFamily="system-ui">Acme Corp · Pipeline: Prospection</text>
          <text x="102" y="252" fill="#F97316" fontSize="10" fontFamily="system-ui" fontWeight="600">15 000 €</text>
        </g>

        {/* Input bar */}
        <rect x="56" y="286" width="368" height="32" rx="16" fill="#F5F5F5" stroke="#e5e5e5" strokeWidth="1" />
        <text x="76" y="306" fill="#BBBBBB" fontSize="11" fontFamily="system-ui">Décris ce que tu veux faire...</text>
        <circle cx="406" cy="302" r="10" fill="#F97316" />
        <path d="M403 302l4-3v6z" fill="white" />

        {/* Decorative */}
        <circle cx="440" cy="200" r="3" fill="#F97316" fillOpacity="0.15" />
        <circle cx="52" cy="240" r="2" fill="#F97316" fillOpacity="0.1" />
      </svg>
    )
  }

  if (variant === "contacts") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill="#EFF6FF" />

        {/* Contact cards */}
        <g className="animate-float">
          <rect x="40" y="40" width="190" height="130" rx="16" fill="white" stroke="#93C5FD" strokeWidth="1" />
          <circle cx="80" cy="82" r="22" fill="#3B82F6" fillOpacity="0.12" />
          <text x="80" y="87" fill="#3B82F6" fontSize="14" fontFamily="system-ui" fontWeight="700" textAnchor="middle">MD</text>
          <text x="112" y="76" fill="#1a1a1a" fontSize="13" fontFamily="system-ui" fontWeight="600">Marie Dupont</text>
          <text x="112" y="92" fill="#888" fontSize="10" fontFamily="system-ui">Acme Corp · Directrice</text>
          <rect x="56" y="118" width="80" height="6" rx="3" fill="#3B82F6" fillOpacity="0.1" />
          <rect x="56" y="130" width="120" height="5" rx="2.5" fill="#3B82F6" fillOpacity="0.06" />
          <rect x="56" y="142" width="60" height="5" rx="2.5" fill="#3B82F6" fillOpacity="0.06" />
          {/* Score badge */}
          <rect x="160" y="114" width="52" height="20" rx="10" fill="#10B981" fillOpacity="0.12" />
          <text x="186" y="128" fill="#10B981" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Chaud</text>
        </g>

        <g className="animate-float-delayed">
          <rect x="250" y="40" width="190" height="130" rx="16" fill="white" stroke="#93C5FD" strokeWidth="1" />
          <circle cx="290" cy="82" r="22" fill="#F97316" fillOpacity="0.12" />
          <text x="290" y="87" fill="#F97316" fontSize="14" fontFamily="system-ui" fontWeight="700" textAnchor="middle">PL</text>
          <text x="322" y="76" fill="#1a1a1a" fontSize="13" fontFamily="system-ui" fontWeight="600">Pierre Laurent</text>
          <text x="322" y="92" fill="#888" fontSize="10" fontFamily="system-ui">TechVision · CTO</text>
          <rect x="266" y="118" width="100" height="6" rx="3" fill="#F97316" fillOpacity="0.1" />
          <rect x="266" y="130" width="140" height="5" rx="2.5" fill="#F97316" fillOpacity="0.06" />
          <rect x="266" y="142" width="70" height="5" rx="2.5" fill="#F97316" fillOpacity="0.06" />
          <rect x="370" y="114" width="52" height="20" rx="10" fill="#F59E0B" fillOpacity="0.12" />
          <text x="396" y="128" fill="#F59E0B" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Tiède</text>
        </g>

        {/* Search bar */}
        <rect x="40" y="192" width="400" height="36" rx="18" fill="white" stroke="#93C5FD" strokeWidth="1" />
        <circle cx="64" cy="210" r="10" fill="#3B82F6" fillOpacity="0.08" />
        <path d="M61 207l6 6M64.5 209a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <text x="82" y="214" fill="#BBBBBB" fontSize="11" fontFamily="system-ui">Rechercher un contact...</text>

        {/* Timeline */}
        <g className="animate-float">
          <rect x="40" y="248" width="400" height="80" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="60" y="270" fill="#1a1a1a" fontSize="11" fontFamily="system-ui" fontWeight="600">Timeline</text>
          {/* Timeline items */}
          <circle cx="68" cy="290" r="4" fill="#3B82F6" />
          <line x1="68" y1="294" x2="68" y2="310" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.2" />
          <text x="82" y="294" fill="#555" fontSize="10" fontFamily="system-ui">Deal créé — 15 000 €</text>
          <text x="340" y="294" fill="#999" fontSize="9" fontFamily="system-ui">il y a 2h</text>
          <circle cx="68" cy="314" r="4" fill="#10B981" />
          <text x="82" y="318" fill="#555" fontSize="10" fontFamily="system-ui">Email envoyé</text>
          <text x="340" y="318" fill="#999" fontSize="9" fontFamily="system-ui">hier</text>
        </g>

        {/* Decorative */}
        <circle cx="460" cy="300" r="4" fill="#3B82F6" fillOpacity="0.15" />
        <circle cx="20" cy="180" r="3" fill="#3B82F6" fillOpacity="0.1" />
      </svg>
    )
  }

  if (variant === "pipeline") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill="#F0FDF4" />

        {/* Column headers */}
        <rect x="24" y="28" width="100" height="28" rx="8" fill="#10B981" fillOpacity="0.1" />
        <text x="74" y="46" fill="#10B981" fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="middle">Prospection</text>
        <rect x="134" y="28" width="100" height="28" rx="8" fill="#3B82F6" fillOpacity="0.1" />
        <text x="184" y="46" fill="#3B82F6" fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="middle">Qualification</text>
        <rect x="244" y="28" width="100" height="28" rx="8" fill="#F97316" fillOpacity="0.1" />
        <text x="294" y="46" fill="#F97316" fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="middle">Proposition</text>
        <rect x="354" y="28" width="100" height="28" rx="8" fill="#8B5CF6" fillOpacity="0.1" />
        <text x="404" y="46" fill="#8B5CF6" fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="middle">Négociation</text>

        {/* Column lines */}
        <line x1="130" y1="28" x2="130" y2="340" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="240" y1="28" x2="240" y2="340" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="350" y1="28" x2="350" y2="340" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="4 4" />

        {/* Deal cards — Column 1 */}
        <g className="animate-float">
          <rect x="28" y="68" width="96" height="72" rx="10" fill="white" stroke="#86EFAC" strokeWidth="1" />
          <text x="38" y="86" fill="#1a1a1a" fontSize="10" fontFamily="system-ui" fontWeight="600">Acme Corp</text>
          <text x="38" y="100" fill="#888" fontSize="9" fontFamily="system-ui">Marie Dupont</text>
          <text x="38" y="128" fill="#10B981" fontSize="11" fontFamily="system-ui" fontWeight="700">15 000 €</text>
        </g>
        <g className="animate-float-delayed">
          <rect x="28" y="150" width="96" height="72" rx="10" fill="white" stroke="#86EFAC" strokeWidth="1" />
          <text x="38" y="168" fill="#1a1a1a" fontSize="10" fontFamily="system-ui" fontWeight="600">BetaFlow</text>
          <text x="38" y="182" fill="#888" fontSize="9" fontFamily="system-ui">Jean Martin</text>
          <text x="38" y="210" fill="#10B981" fontSize="11" fontFamily="system-ui" fontWeight="700">8 500 €</text>
        </g>

        {/* Deal cards — Column 2 */}
        <g className="animate-float-delayed">
          <rect x="138" y="68" width="96" height="72" rx="10" fill="white" stroke="#93C5FD" strokeWidth="1" />
          <text x="148" y="86" fill="#1a1a1a" fontSize="10" fontFamily="system-ui" fontWeight="600">TechVision</text>
          <text x="148" y="100" fill="#888" fontSize="9" fontFamily="system-ui">Pierre Laurent</text>
          <text x="148" y="128" fill="#3B82F6" fontSize="11" fontFamily="system-ui" fontWeight="700">22 000 €</text>
        </g>

        {/* Deal cards — Column 3 */}
        <g className="animate-float">
          <rect x="248" y="68" width="96" height="72" rx="10" fill="white" stroke="#FDBA74" strokeWidth="1" />
          <text x="258" y="86" fill="#1a1a1a" fontSize="10" fontFamily="system-ui" fontWeight="600">DataSoft</text>
          <text x="258" y="100" fill="#888" fontSize="9" fontFamily="system-ui">Sophie Morel</text>
          <text x="258" y="128" fill="#F97316" fontSize="11" fontFamily="system-ui" fontWeight="700">35 000 €</text>
        </g>

        {/* Deal cards — Column 4 */}
        <g className="animate-float-delayed">
          <rect x="358" y="68" width="96" height="72" rx="10" fill="white" stroke="#C4B5FD" strokeWidth="1" />
          <text x="368" y="86" fill="#1a1a1a" fontSize="10" fontFamily="system-ui" fontWeight="600">CloudNet</text>
          <text x="368" y="100" fill="#888" fontSize="9" fontFamily="system-ui">Luc Bernard</text>
          <text x="368" y="128" fill="#8B5CF6" fontSize="11" fontFamily="system-ui" fontWeight="700">48 000 €</text>
        </g>

        {/* Drag indicator arrow */}
        <path d="M126 104 L138 104" stroke="#10B981" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arrowGreen)" />
        <defs>
          <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0L6 3L0 6z" fill="#10B981" />
          </marker>
        </defs>

        {/* Total bar */}
        <rect x="24" y="310" width="432" height="32" rx="10" fill="white" stroke="#e5e5e5" strokeWidth="1" />
        <text x="44" y="330" fill="#888" fontSize="10" fontFamily="system-ui">Pipeline total :</text>
        <text x="420" y="330" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="700" textAnchor="end">128 500 €</text>
      </svg>
    )
  }

  if (variant === "tasks") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill="#FAF5FF" />

        {/* Task header */}
        <text x="48" y="52" fill="#1a1a1a" fontSize="16" fontFamily="system-ui" fontWeight="700">Tâches à venir</text>
        <rect x="350" y="34" width="90" height="28" rx="14" fill="#8B5CF6" fillOpacity="0.1" />
        <text x="395" y="52" fill="#8B5CF6" fontSize="10" fontFamily="system-ui" fontWeight="600" textAnchor="middle">5 en attente</text>

        {/* Task rows */}
        <g className="animate-float">
          {/* Task 1 — high priority */}
          <rect x="32" y="72" width="416" height="52" rx="12" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <rect x="44" y="88" width="20" height="20" rx="6" fill="#EF4444" fillOpacity="0.1" stroke="#EF4444" strokeWidth="1.5" />
          <text x="76" y="96" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="600">Relancer Marie — devis Acme</text>
          <text x="76" y="112" fill="#888" fontSize="10" fontFamily="system-ui">Marie Dupont · Acme Corp</text>
          <rect x="340" y="88" width="72" height="22" rx="11" fill="#EF4444" fillOpacity="0.08" />
          <text x="376" y="103" fill="#EF4444" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Aujourd'hui</text>
          <circle cx="428" cy="98" r="6" fill="#EF4444" fillOpacity="0.15" />
          <path d="M426 98h4" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        <g className="animate-float-delayed">
          {/* Task 2 — medium */}
          <rect x="32" y="134" width="416" height="52" rx="12" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <rect x="44" y="150" width="20" height="20" rx="6" fill="#F59E0B" fillOpacity="0.1" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="76" y="158" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="600">Envoyer proposition TechVision</text>
          <text x="76" y="174" fill="#888" fontSize="10" fontFamily="system-ui">Pierre Laurent · TechVision</text>
          <rect x="354" y="150" width="58" height="22" rx="11" fill="#F59E0B" fillOpacity="0.08" />
          <text x="383" y="165" fill="#F59E0B" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Demain</text>
        </g>

        <g className="animate-float">
          {/* Task 3 — done */}
          <rect x="32" y="196" width="416" height="52" rx="12" fill="white" stroke="#e5e5e5" strokeWidth="1" fillOpacity="0.6" />
          <rect x="44" y="212" width="20" height="20" rx="6" fill="#10B981" fillOpacity="0.15" />
          <path d="M50 220l3 3 5-5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="76" y="220" fill="#BBBBBB" fontSize="12" fontFamily="system-ui" fontWeight="500" textDecoration="line-through">Appeler DataSoft pour feedback</text>
          <text x="76" y="236" fill="#CCCCCC" fontSize="10" fontFamily="system-ui">Sophie Morel · DataSoft</text>
          <rect x="360" y="212" width="48" height="22" rx="11" fill="#10B981" fillOpacity="0.08" />
          <text x="384" y="227" fill="#10B981" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Fait</text>
        </g>

        <g className="animate-float-delayed">
          {/* Task 4 — low */}
          <rect x="32" y="258" width="416" height="52" rx="12" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <rect x="44" y="274" width="20" height="20" rx="6" fill="#3B82F6" fillOpacity="0.1" stroke="#3B82F6" strokeWidth="1.5" />
          <text x="76" y="282" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="600">Préparer démo CloudNet</text>
          <text x="76" y="298" fill="#888" fontSize="10" fontFamily="system-ui">Luc Bernard · CloudNet</text>
          <rect x="350" y="274" width="62" height="22" rx="11" fill="#3B82F6" fillOpacity="0.08" />
          <text x="381" y="289" fill="#3B82F6" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Vendredi</text>
        </g>

        {/* Decorative */}
        <circle cx="460" cy="340" r="4" fill="#8B5CF6" fillOpacity="0.15" />
        <circle cx="20" cy="50" r="3" fill="#8B5CF6" fillOpacity="0.1" />
      </svg>
    )
  }

  if (variant === "dashboard") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill="#FFF1F2" />

        {/* Stat cards row */}
        <g className="animate-float">
          <rect x="28" y="28" width="132" height="70" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="44" y="50" fill="#888" fontSize="9" fontFamily="system-ui" fontWeight="500">CHIFFRE D'AFFAIRES</text>
          <text x="44" y="76" fill="#1a1a1a" fontSize="20" fontFamily="system-ui" fontWeight="800">42 500 €</text>
          <text x="128" y="50" fill="#10B981" fontSize="9" fontFamily="system-ui" fontWeight="600">+18%</text>
        </g>
        <g className="animate-float-delayed">
          <rect x="174" y="28" width="132" height="70" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="190" y="50" fill="#888" fontSize="9" fontFamily="system-ui" fontWeight="500">PIPELINE</text>
          <text x="190" y="76" fill="#1a1a1a" fontSize="20" fontFamily="system-ui" fontWeight="800">128 500 €</text>
        </g>
        <g className="animate-float">
          <rect x="320" y="28" width="132" height="70" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="336" y="50" fill="#888" fontSize="9" fontFamily="system-ui" fontWeight="500">DEALS ACTIFS</text>
          <text x="336" y="76" fill="#1a1a1a" fontSize="20" fontFamily="system-ui" fontWeight="800">12</text>
          <text x="420" y="50" fill="#3B82F6" fontSize="9" fontFamily="system-ui" fontWeight="600">+3 ce mois</text>
        </g>

        {/* Bar chart */}
        <g className="animate-float-delayed">
          <rect x="28" y="114" width="260" height="160" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="44" y="138" fill="#1a1a1a" fontSize="11" fontFamily="system-ui" fontWeight="700">Deals par étape</text>
          {/* Bars */}
          <rect x="52" y="172" width="32" height="84" rx="4" fill="#10B981" fillOpacity="0.7" />
          <text x="68" y="264" fill="#888" fontSize="8" fontFamily="system-ui" textAnchor="middle">Prosp.</text>
          <rect x="96" y="186" width="32" height="70" rx="4" fill="#3B82F6" fillOpacity="0.7" />
          <text x="112" y="264" fill="#888" fontSize="8" fontFamily="system-ui" textAnchor="middle">Qualif.</text>
          <rect x="140" y="200" width="32" height="56" rx="4" fill="#F97316" fillOpacity="0.7" />
          <text x="156" y="264" fill="#888" fontSize="8" fontFamily="system-ui" textAnchor="middle">Prop.</text>
          <rect x="184" y="218" width="32" height="38" rx="4" fill="#8B5CF6" fillOpacity="0.7" />
          <text x="200" y="264" fill="#888" fontSize="8" fontFamily="system-ui" textAnchor="middle">Négo.</text>
          <rect x="228" y="228" width="32" height="28" rx="4" fill="#EC4899" fillOpacity="0.7" />
          <text x="244" y="264" fill="#888" fontSize="8" fontFamily="system-ui" textAnchor="middle">Gagné</text>
        </g>

        {/* Donut chart */}
        <g className="animate-float">
          <rect x="302" y="114" width="150" height="160" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
          <text x="318" y="138" fill="#1a1a1a" fontSize="11" fontFamily="system-ui" fontWeight="700">Conversion</text>
          {/* Donut */}
          <circle cx="377" cy="210" r="40" fill="none" stroke="#E5E7EB" strokeWidth="12" />
          <circle cx="377" cy="210" r="40" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="75 176" strokeDashoffset="0" transform="rotate(-90 377 210)" />
          <circle cx="377" cy="210" r="40" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="50 201" strokeDashoffset="-75" transform="rotate(-90 377 210)" />
          <text x="377" y="206" fill="#1a1a1a" fontSize="16" fontFamily="system-ui" fontWeight="800" textAnchor="middle">30%</text>
          <text x="377" y="220" fill="#888" fontSize="8" fontFamily="system-ui" textAnchor="middle">taux de gain</text>
        </g>

        {/* Bottom tasks strip */}
        <rect x="28" y="290" width="424" height="48" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
        <text x="48" y="318" fill="#1a1a1a" fontSize="11" fontFamily="system-ui" fontWeight="600">3 tâches aujourd'hui</text>
        <rect x="340" y="302" width="80" height="22" rx="11" fill="#EC4899" fillOpacity="0.08" />
        <text x="380" y="317" fill="#EC4899" fontSize="9" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Voir tout →</text>
      </svg>
    )
  }

  // AI variant
  return (
    <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="480" height="360" rx="24" fill="#FFFBEB" />

      {/* Central brain / AI icon */}
      <circle cx="240" cy="130" r="50" fill="white" stroke="#FBBF24" strokeWidth="1.5" />
      <circle cx="240" cy="130" r="30" fill="#F59E0B" fillOpacity="0.08" />
      {/* Sparkle rays */}
      <g className="animate-float">
        <line x1="240" y1="72" x2="240" y2="58" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
        <line x1="240" y1="188" x2="240" y2="202" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
        <line x1="182" y1="130" x2="168" y2="130" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
        <line x1="298" y1="130" x2="312" y2="130" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
        <line x1="200" y1="90" x2="190" y2="80" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="280" y1="170" x2="290" y2="180" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="280" y1="90" x2="290" y2="80" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="200" y1="170" x2="190" y2="180" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
      </g>
      {/* AI text inside */}
      <text x="240" y="136" fill="#F59E0B" fontSize="22" fontFamily="system-ui" fontWeight="800" textAnchor="middle">IA</text>

      {/* Model cards */}
      <g className="animate-float">
        <rect x="40" y="230" width="120" height="90" rx="14" fill="white" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="72" cy="258" r="14" fill="#F59E0B" fillOpacity="0.1" />
        <text x="72" y="262" fill="#F59E0B" fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="middle">C</text>
        <text x="94" y="262" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="700">Claude</text>
        <text x="56" y="282" fill="#888" fontSize="9" fontFamily="system-ui">Anthropic</text>
        <rect x="52" y="294" width="60" height="16" rx="8" fill="#10B981" fillOpacity="0.1" />
        <text x="82" y="305" fill="#10B981" fontSize="8" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Par défaut</text>
        {/* Connection line */}
        <path d="M160 260 Q200 210, 210 150" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.3" />
      </g>

      <g className="animate-float-delayed">
        <rect x="180" y="230" width="120" height="90" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" />
        <circle cx="212" cy="258" r="14" fill="#10B981" fillOpacity="0.1" />
        <text x="212" y="262" fill="#10B981" fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="middle">G</text>
        <text x="234" y="262" fill="#1a1a1a" fontSize="12" fontFamily="system-ui" fontWeight="700">GPT</text>
        <text x="196" y="282" fill="#888" fontSize="9" fontFamily="system-ui">OpenAI</text>
        <rect x="192" y="294" width="60" height="16" rx="8" fill="#888" fillOpacity="0.08" />
        <text x="222" y="305" fill="#888" fontSize="8" fontFamily="system-ui" fontWeight="600" textAnchor="middle">Fallback</text>
        <path d="M240 230 Q240 200, 240 180" stroke="#e5e5e5" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.3" />
      </g>

      <g className="animate-float">
        <rect x="320" y="230" width="120" height="90" rx="14" fill="white" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="380" cy="264" r="14" fill="#e5e5e5" fillOpacity="0.3" />
        <text x="380" y="268" fill="#CCCCCC" fontSize="14" fontFamily="system-ui" fontWeight="700" textAnchor="middle">+</text>
        <text x="380" y="298" fill="#BBBBBB" fontSize="10" fontFamily="system-ui" textAnchor="middle">Bientôt...</text>
        <path d="M330 250 Q300 200, 275 160" stroke="#e5e5e5" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.2" />
      </g>

      {/* Decorative */}
      <circle cx="440" cy="50" r="4" fill="#F59E0B" fillOpacity="0.2" />
      <circle cx="40" cy="170" r="3" fill="#F59E0B" fillOpacity="0.15" />
      <circle cx="460" cy="340" r="3" fill="#F59E0B" fillOpacity="0.1" />
    </svg>
  )
}

export function PricingIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto h-auto opacity-60">
      {/* Abstract price tags */}
      <circle cx="100" cy="100" r="60" fill="#F97316" fillOpacity="0.05" />
      <circle cx="200" cy="80" r="80" fill="#3B82F6" fillOpacity="0.04" />
      <circle cx="300" cy="100" r="50" fill="#10B981" fillOpacity="0.05" />
      {/* Lines connecting */}
      <path d="M100 100 Q 150 60, 200 80 Q 250 100, 300 100" stroke="#e5e5e5" strokeWidth="1" fill="none" strokeDasharray="4 4" />
    </svg>
  )
}
