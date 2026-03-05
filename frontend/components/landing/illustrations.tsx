"use client"

// Color palette from app interior
const TEAL = "#0D4F4F"
const TEAL_LIGHT = "#E8F4F4"
const TEAL_MID = "#3D7A7A"
const TEAL_BRIGHT = "#3DD9D9"
const WARM = "#C9946E"
const WARM_LIGHT = "#F7EFEA"
const CREAM = "#FAFAF7"
const STONE = "#E5E2DC"
const DARK = "#0D1F1F"
const FG = "#1A1A17"

export function ChatIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Organic background shapes */}
      <ellipse cx="260" cy="220" rx="200" ry="180" fill={TEAL} fillOpacity="0.04" />
      <ellipse cx="280" cy="200" rx="140" ry="130" fill={WARM} fillOpacity="0.04" />

      {/* App window frame */}
      <rect x="40" y="24" width="440" height="392" rx="20" fill="white" stroke={STONE} strokeWidth="1.5" />
      {/* Window header */}
      <rect x="40" y="24" width="440" height="52" rx="20" fill={CREAM} />
      <rect x="40" y="56" width="440" height="20" fill={CREAM} />
      {/* Traffic lights */}
      <circle cx="68" cy="50" r="5" fill="#EF4444" fillOpacity="0.6" />
      <circle cx="86" cy="50" r="5" fill="#F59E0B" fillOpacity="0.6" />
      <circle cx="104" cy="50" r="5" fill="#10B981" fillOpacity="0.6" />
      {/* Title */}
      <text x="260" y="55" fill={FG} fontSize="13" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Qeylo Chat</text>

      {/* Sidebar mock */}
      <rect x="40" y="76" width="80" height="340" fill={DARK} />
      <rect x="40" y="396" width="80" height="20" fill={DARK} />
      {/* Round bottom-left corner */}
      <path d="M40 416 L40 396 Q40 416 60 416" fill={DARK} />
      {/* Sidebar nav items */}
      <rect x="52" y="96" width="56" height="8" rx="4" fill={TEAL_BRIGHT} fillOpacity="0.3" />
      <rect x="52" y="116" width="48" height="6" rx="3" fill="white" fillOpacity="0.12" />
      <rect x="52" y="132" width="52" height="6" rx="3" fill="white" fillOpacity="0.12" />
      <rect x="52" y="148" width="40" height="6" rx="3" fill="white" fillOpacity="0.12" />
      <rect x="52" y="164" width="44" height="6" rx="3" fill="white" fillOpacity="0.12" />
      {/* Active indicator */}
      <rect x="44" y="92" width="3" height="16" rx="1.5" fill={TEAL_BRIGHT} />

      {/* Chat area */}
      {/* User message */}
      <g className="animate-float">
        <rect x="260" y="100" width="200" height="42" rx="21" fill={TEAL} />
        <text x="360" y="126" fill="white" fontSize="12" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Ajoute Marie chez Acme, 15k</text>
        {/* User avatar */}
        <circle cx="438" cy="80" r="16" fill={WARM} />
        <text x="438" y="85" fill="white" fontSize="10" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>HF</text>
      </g>

      {/* AI response */}
      <g className="animate-float-delayed">
        <circle cx="140" cy="172" r="16" fill={TEAL} fillOpacity="0.12" />
        <text x="140" y="177" fill={TEAL} fontSize="10" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Q</text>
        <rect x="164" y="156" width="260" height="46" rx="20" fill="white" stroke={STONE} strokeWidth="1" />
        <text x="180" y="176" fill={FG} fontSize="11.5" fontWeight="500" style={{ fontFamily: 'system-ui' }}>Contact cree : Marie Dupont</text>
        <text x="180" y="192" fill={TEAL_MID} fontSize="10" style={{ fontFamily: 'system-ui' }}>Acme Corp - Deal 15 000 EUR ajoute</text>
      </g>

      {/* Action cards */}
      <g className="animate-float">
        <rect x="164" y="222" width="130" height="80" rx="14" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.2" />
        <circle cx="190" cy="246" r="10" fill={TEAL} fillOpacity="0.1" />
        <path d="M186 246h8M190 242v8" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
        <text x="206" y="250" fill={FG} fontSize="10.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Contact</text>
        <text x="229" y="272" fill="#666" fontSize="10" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Marie Dupont</text>
        <text x="229" y="288" fill={TEAL_MID} fontSize="9" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Acme Corp</text>
      </g>

      <g className="animate-float-delayed">
        <rect x="308" y="222" width="130" height="80" rx="14" fill="white" stroke={WARM} strokeWidth="1" strokeOpacity="0.25" />
        <circle cx="334" cy="246" r="10" fill={WARM} fillOpacity="0.12" />
        <path d="M330 246l3 3 5-6" stroke={WARM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="350" y="250" fill={FG} fontSize="10.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Deal</text>
        <text x="373" y="272" fill="#666" fontSize="10" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Projet refonte</text>
        <text x="373" y="288" fill={WARM} fontSize="10" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>15 000 EUR</text>
      </g>

      {/* Connector lines */}
      <path d="M250 202 L230 222" stroke={TEAL} strokeWidth="1" strokeOpacity="0.12" strokeDasharray="3 3" />
      <path d="M360 202 L370 222" stroke={WARM} strokeWidth="1" strokeOpacity="0.12" strokeDasharray="3 3" />

      {/* Chat input bar */}
      <rect x="130" y="324" width="340" height="36" rx="18" fill={CREAM} stroke={STONE} strokeWidth="1" />
      <text x="154" y="346" fill="#BBBBBB" fontSize="11" style={{ fontFamily: 'system-ui' }}>Decris ce que tu veux faire...</text>
      <circle cx="450" cy="342" r="12" fill={TEAL} />
      <path d="M447 342l4-3v6z" fill="white" />

      {/* Floating accents */}
      <circle cx="470" cy="140" r="4" fill={TEAL} fillOpacity="0.12" />
      <circle cx="490" cy="280" r="3" fill={WARM} fillOpacity="0.15" />
      <circle cx="135" cy="330" r="2" fill={TEAL_BRIGHT} fillOpacity="0.2" />
    </svg>
  )
}

export function FeaturesIllustration({ variant }: { variant: "chat" | "pipeline" | "tasks" | "ai" | "contacts" | "dashboard" }) {
  const configs: Record<string, { bg: string; icon: React.ReactNode }> = {
    chat: {
      bg: TEAL,
      icon: (
        <g>
          <rect x="20" y="16" width="56" height="20" rx="10" fill="white" fillOpacity="0.9" />
          <rect x="24" y="44" width="40" height="16" rx="8" fill="white" fillOpacity="0.5" />
          <circle cx="64" cy="24" r="3" fill={TEAL} />
          <circle cx="56" cy="24" r="3" fill={TEAL} fillOpacity="0.5" />
        </g>
      ),
    },
    contacts: {
      bg: TEAL_MID,
      icon: (
        <g>
          <circle cx="30" cy="30" r="14" fill="white" fillOpacity="0.3" />
          <circle cx="30" cy="30" r="7" fill="white" fillOpacity="0.8" />
          <rect x="48" y="22" width="24" height="5" rx="2.5" fill="white" fillOpacity="0.9" />
          <rect x="48" y="32" width="18" height="4" rx="2" fill="white" fillOpacity="0.5" />
          <rect x="14" y="50" width="56" height="6" rx="3" fill="white" fillOpacity="0.2" />
          <rect x="14" y="60" width="40" height="4" rx="2" fill="white" fillOpacity="0.12" />
        </g>
      ),
    },
    pipeline: {
      bg: WARM,
      icon: (
        <g>
          <rect x="12" y="20" width="14" height="40" rx="4" fill="white" fillOpacity="0.9" />
          <rect x="32" y="14" width="14" height="46" rx="4" fill="white" fillOpacity="0.7" />
          <rect x="52" y="26" width="14" height="34" rx="4" fill="white" fillOpacity="0.5" />
          <rect x="12" y="64" width="54" height="3" rx="1.5" fill="white" fillOpacity="0.2" />
        </g>
      ),
    },
    tasks: {
      bg: TEAL,
      icon: (
        <g>
          <rect x="18" y="18" width="48" height="12" rx="3" fill="white" fillOpacity="0.9" />
          <rect x="18" y="36" width="48" height="12" rx="3" fill="white" fillOpacity="0.6" />
          <rect x="18" y="54" width="32" height="12" rx="3" fill="white" fillOpacity="0.35" />
          <path d="M14 24l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ),
    },
    dashboard: {
      bg: TEAL_MID,
      icon: (
        <g>
          <rect x="12" y="16" width="28" height="22" rx="4" fill="white" fillOpacity="0.9" />
          <rect x="44" y="16" width="28" height="22" rx="4" fill="white" fillOpacity="0.6" />
          <rect x="12" y="44" width="60" height="24" rx="4" fill="white" fillOpacity="0.4" />
          <rect x="18" y="52" width="8" height="12" rx="2" fill="white" fillOpacity="0.7" />
          <rect x="30" y="48" width="8" height="16" rx="2" fill="white" fillOpacity="0.7" />
          <rect x="42" y="54" width="8" height="10" rx="2" fill="white" fillOpacity="0.7" />
        </g>
      ),
    },
    ai: {
      bg: WARM,
      icon: (
        <g>
          <circle cx="42" cy="38" r="20" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="42" cy="38" r="10" fill="white" fillOpacity="0.9" />
          <path d="M42 20V14M42 62V56M24 38H18M66 38H60M28 24l-4-4M56 52l-4-4M56 24l4-4M28 52l4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
        </g>
      ),
    },
  }

  const config = configs[variant] || configs.chat

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
        <rect width="200" height="160" rx="20" fill={TEAL_LIGHT} />
        {/* Chat input mockup */}
        <rect x="24" y="100" width="152" height="36" rx="18" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.25" />
        <text x="40" y="123" fill="#9CA3AF" fontSize="11" style={{ fontFamily: 'system-ui' }}>Dis quelque chose...</text>
        <circle cx="160" cy="118" r="12" fill={TEAL} />
        <path d="M156 118l4-4v8z" fill="white" />
        {/* Floating speech bubble */}
        <rect x="50" y="28" width="100" height="44" rx="14" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
        <rect x="66" y="42" width="40" height="5" rx="2.5" fill={TEAL} fillOpacity="0.6" />
        <rect x="66" y="52" width="60" height="4" rx="2" fill={TEAL} fillOpacity="0.2" />
        {/* Speech bubble tail */}
        <path d="M80 72l8 10 8-10" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
        <rect x="80" y="70" width="16" height="4" fill="white" />
      </svg>
    )
  }

  if (step === 2) {
    return (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="200" height="160" rx="20" fill={WARM_LIGHT} />
        {/* Central processing circle */}
        <circle cx="100" cy="68" r="32" fill="white" stroke={WARM} strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="100" cy="68" r="16" fill={WARM} fillOpacity="0.1" />
        <text x="100" y="73" fill={WARM} fontSize="14" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Q</text>
        {/* Orbiting dots */}
        <circle cx="68" cy="48" r="4" fill={TEAL} fillOpacity="0.3" />
        <circle cx="132" cy="52" r="3" fill={WARM} fillOpacity="0.4" />
        <circle cx="78" cy="94" r="3.5" fill={TEAL_MID} fillOpacity="0.3" />
        <circle cx="126" cy="90" r="2.5" fill={WARM} fillOpacity="0.3" />
        {/* Connection arcs */}
        <path d="M72 50 Q86 30 100 36" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" strokeDasharray="2 3" />
        <path d="M128 54 Q136 42 100 36" stroke={WARM} strokeWidth="1" strokeOpacity="0.15" strokeDasharray="2 3" />
        {/* Label */}
        <text x="100" y="126" fill={FG} fontSize="14" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>{"L'IA comprend"}</text>
        <text x="100" y="142" fill="#888" fontSize="10.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>et structure tout</text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="200" height="160" rx="20" fill={TEAL_LIGHT} />
      {/* Result cards */}
      <rect x="24" y="24" width="68" height="52" rx="10" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.2" />
      <rect x="34" y="36" width="30" height="5" rx="2.5" fill={TEAL} fillOpacity="0.5" />
      <rect x="34" y="46" width="48" height="4" rx="2" fill={FG} fillOpacity="0.15" />
      <rect x="34" y="55" width="22" height="4" rx="2" fill={WARM} fillOpacity="0.4" />

      <rect x="108" y="24" width="68" height="52" rx="10" fill="white" stroke={WARM} strokeWidth="1" strokeOpacity="0.25" />
      <rect x="118" y="36" width="30" height="5" rx="2.5" fill={WARM} fillOpacity="0.5" />
      <rect x="118" y="46" width="48" height="4" rx="2" fill={FG} fillOpacity="0.15" />
      <rect x="118" y="55" width="22" height="4" rx="2" fill={TEAL} fillOpacity="0.3" />

      {/* Checkmark */}
      <circle cx="100" cy="86" r="8" fill={TEAL} fillOpacity="0.1" />
      <path d="M96 86l3 3 5-6" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      <text x="100" y="118" fill={FG} fontSize="14" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>{"C'est fait"}</text>
      <text x="100" y="134" fill="#888" fontSize="10.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>contacts, deals, taches</text>
    </svg>
  )
}

export function FeaturePageIllustration({ variant }: { variant: "chat" | "contacts" | "pipeline" | "tasks" | "dashboard" | "ai" }) {
  if (variant === "chat") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill={TEAL_LIGHT} />
        {/* Chat window */}
        <rect x="40" y="28" width="400" height="304" rx="16" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
        {/* Header */}
        <rect x="40" y="28" width="400" height="44" rx="16" fill={CREAM} />
        <rect x="40" y="56" width="400" height="16" fill={CREAM} />
        <circle cx="68" cy="50" r="12" fill={TEAL} fillOpacity="0.1" />
        <text x="68" y="54" fill={TEAL} fontSize="9" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Q</text>
        <text x="88" y="54" fill={FG} fontSize="12" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Qeylo Chat</text>
        <circle cx="412" cy="50" r="5" fill="#10B981" fillOpacity="0.6" />

        {/* User msg */}
        <g className="animate-float">
          <rect x="200" y="88" width="210" height="38" rx="19" fill={TEAL} />
          <text x="305" y="112" fill="white" fontSize="11.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Cree un deal pour Acme, 15k</text>
          <circle cx="424" cy="107" r="13" fill={WARM} />
          <text x="424" y="111" fill="white" fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>HF</text>
        </g>

        {/* AI response */}
        <g className="animate-float-delayed">
          <circle cx="68" cy="158" r="13" fill={TEAL} fillOpacity="0.1" />
          <text x="68" y="162" fill={TEAL} fontSize="9" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Q</text>
          <rect x="90" y="142" width="240" height="34" rx="17" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="100" y="163" fill={FG} fontSize="11" fontWeight="500" style={{ fontFamily: 'system-ui' }}>Deal cree : Acme Corp — 15 000 EUR</text>
        </g>

        {/* Tool result */}
        <g className="animate-float">
          <rect x="90" y="192" width="200" height="60" rx="12" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.2" />
          <rect x="102" y="204" width="8" height="8" rx="2" fill={TEAL} fillOpacity="0.15" />
          <text x="118" y="212" fill={FG} fontSize="10" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Creation de deal</text>
          <text x="102" y="228" fill="#888" fontSize="9" style={{ fontFamily: 'system-ui' }}>Acme Corp - Pipeline: Prospection</text>
          <text x="102" y="242" fill={TEAL} fontSize="10" fontWeight="600" style={{ fontFamily: 'system-ui' }}>15 000 EUR</text>
        </g>

        {/* Input */}
        <rect x="56" y="278" width="368" height="32" rx="16" fill={CREAM} stroke={STONE} strokeWidth="1" />
        <text x="76" y="298" fill="#BBBBBB" fontSize="10.5" style={{ fontFamily: 'system-ui' }}>Decris ce que tu veux faire...</text>
        <circle cx="406" cy="294" r="10" fill={TEAL} />
        <path d="M403 294l4-3v6z" fill="white" />
      </svg>
    )
  }

  if (variant === "contacts") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill={TEAL_LIGHT} />

        {/* Contact cards */}
        <g className="animate-float">
          <rect x="40" y="40" width="190" height="130" rx="16" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
          <circle cx="80" cy="82" r="22" fill={TEAL} fillOpacity="0.1" />
          <text x="80" y="87" fill={TEAL} fontSize="13" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>MD</text>
          <text x="112" y="76" fill={FG} fontSize="12.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Marie Dupont</text>
          <text x="112" y="92" fill="#888" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Acme Corp - Directrice</text>
          <rect x="56" y="118" width="80" height="5" rx="2.5" fill={TEAL} fillOpacity="0.08" />
          <rect x="56" y="130" width="120" height="4" rx="2" fill={TEAL} fillOpacity="0.05" />
          <rect x="160" y="114" width="52" height="20" rx="10" fill={TEAL} fillOpacity="0.08" />
          <text x="186" y="128" fill={TEAL} fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Chaud</text>
        </g>

        <g className="animate-float-delayed">
          <rect x="250" y="40" width="190" height="130" rx="16" fill="white" stroke={WARM} strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="290" cy="82" r="22" fill={WARM} fillOpacity="0.1" />
          <text x="290" y="87" fill={WARM} fontSize="13" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>PL</text>
          <text x="322" y="76" fill={FG} fontSize="12.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Pierre Laurent</text>
          <text x="322" y="92" fill="#888" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>TechVision - CTO</text>
          <rect x="266" y="118" width="100" height="5" rx="2.5" fill={WARM} fillOpacity="0.08" />
          <rect x="266" y="130" width="140" height="4" rx="2" fill={WARM} fillOpacity="0.05" />
          <rect x="370" y="114" width="52" height="20" rx="10" fill={WARM} fillOpacity="0.1" />
          <text x="396" y="128" fill={WARM} fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Tiede</text>
        </g>

        {/* Search */}
        <rect x="40" y="192" width="400" height="36" rx="18" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
        <circle cx="64" cy="210" r="10" fill={TEAL} fillOpacity="0.06" />
        <path d="M61 207l6 6M64.5 209a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
        <text x="82" y="214" fill="#BBBBBB" fontSize="10.5" style={{ fontFamily: 'system-ui' }}>Rechercher un contact...</text>

        {/* Timeline */}
        <g className="animate-float">
          <rect x="40" y="248" width="400" height="80" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="60" y="270" fill={FG} fontSize="10.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Timeline</text>
          <circle cx="68" cy="290" r="4" fill={TEAL} />
          <line x1="68" y1="294" x2="68" y2="310" stroke={TEAL} strokeWidth="1" strokeOpacity="0.2" />
          <text x="82" y="294" fill="#555" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Deal cree — 15 000 EUR</text>
          <text x="340" y="294" fill="#999" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>il y a 2h</text>
          <circle cx="68" cy="314" r="4" fill={WARM} />
          <text x="82" y="318" fill="#555" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Email envoye</text>
          <text x="340" y="318" fill="#999" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>hier</text>
        </g>
      </svg>
    )
  }

  if (variant === "pipeline") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill={WARM_LIGHT} />

        {/* Column headers */}
        <rect x="24" y="28" width="100" height="28" rx="8" fill={TEAL} fillOpacity="0.08" />
        <text x="74" y="46" fill={TEAL} fontSize="9.5" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Prospection</text>
        <rect x="134" y="28" width="100" height="28" rx="8" fill={TEAL_MID} fillOpacity="0.08" />
        <text x="184" y="46" fill={TEAL_MID} fontSize="9.5" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Qualification</text>
        <rect x="244" y="28" width="100" height="28" rx="8" fill={WARM} fillOpacity="0.1" />
        <text x="294" y="46" fill={WARM} fontSize="9.5" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Proposition</text>
        <rect x="354" y="28" width="100" height="28" rx="8" fill={TEAL} fillOpacity="0.06" />
        <text x="404" y="46" fill={TEAL} fontSize="9.5" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Negociation</text>

        {/* Column lines */}
        <line x1="130" y1="28" x2="130" y2="340" stroke={STONE} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="240" y1="28" x2="240" y2="340" stroke={STONE} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="350" y1="28" x2="350" y2="340" stroke={STONE} strokeWidth="1" strokeDasharray="4 4" />

        {/* Deal cards */}
        <g className="animate-float">
          <rect x="28" y="68" width="96" height="72" rx="10" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.2" />
          <text x="38" y="86" fill={FG} fontSize="9.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Acme Corp</text>
          <text x="38" y="100" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>Marie Dupont</text>
          <text x="38" y="128" fill={TEAL} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>15 000 EUR</text>
        </g>
        <g className="animate-float-delayed">
          <rect x="28" y="150" width="96" height="72" rx="10" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
          <text x="38" y="168" fill={FG} fontSize="9.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>BetaFlow</text>
          <text x="38" y="182" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>Jean Martin</text>
          <text x="38" y="210" fill={TEAL} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>8 500 EUR</text>
        </g>

        <g className="animate-float-delayed">
          <rect x="138" y="68" width="96" height="72" rx="10" fill="white" stroke={TEAL_MID} strokeWidth="1" strokeOpacity="0.2" />
          <text x="148" y="86" fill={FG} fontSize="9.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>TechVision</text>
          <text x="148" y="100" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>Pierre Laurent</text>
          <text x="148" y="128" fill={TEAL_MID} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>22 000 EUR</text>
        </g>

        <g className="animate-float">
          <rect x="248" y="68" width="96" height="72" rx="10" fill="white" stroke={WARM} strokeWidth="1" strokeOpacity="0.25" />
          <text x="258" y="86" fill={FG} fontSize="9.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>DataSoft</text>
          <text x="258" y="100" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>Sophie Morel</text>
          <text x="258" y="128" fill={WARM} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>35 000 EUR</text>
        </g>

        <g className="animate-float-delayed">
          <rect x="358" y="68" width="96" height="72" rx="10" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.15" />
          <text x="368" y="86" fill={FG} fontSize="9.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>CloudNet</text>
          <text x="368" y="100" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>Luc Bernard</text>
          <text x="368" y="128" fill={TEAL} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>48 000 EUR</text>
        </g>

        {/* Drag arrow */}
        <path d="M126 104 L138 104" stroke={TEAL} strokeWidth="2" strokeLinecap="round" markerEnd="url(#arrowTeal)" />
        <defs>
          <marker id="arrowTeal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0L6 3L0 6z" fill={TEAL} />
          </marker>
        </defs>

        {/* Total bar */}
        <rect x="24" y="310" width="432" height="32" rx="10" fill="white" stroke={STONE} strokeWidth="1" />
        <text x="44" y="330" fill="#888" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Pipeline total :</text>
        <text x="420" y="330" fill={FG} fontSize="11.5" fontWeight="700" textAnchor="end" style={{ fontFamily: 'system-ui' }}>128 500 EUR</text>
      </svg>
    )
  }

  if (variant === "tasks") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill={TEAL_LIGHT} />

        {/* Header */}
        <text x="48" y="52" fill={FG} fontSize="15" fontWeight="700" style={{ fontFamily: 'system-ui' }}>Taches a venir</text>
        <rect x="350" y="34" width="90" height="28" rx="14" fill={TEAL} fillOpacity="0.08" />
        <text x="395" y="52" fill={TEAL} fontSize="9.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>5 en attente</text>

        {/* Task rows */}
        <g className="animate-float">
          <rect x="32" y="72" width="416" height="52" rx="12" fill="white" stroke={STONE} strokeWidth="1" />
          <rect x="44" y="88" width="20" height="20" rx="6" fill="#EF4444" fillOpacity="0.08" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.4" />
          <text x="76" y="96" fill={FG} fontSize="11.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Relancer Marie — devis Acme</text>
          <text x="76" y="112" fill="#888" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Marie Dupont - Acme Corp</text>
          <rect x="340" y="88" width="72" height="22" rx="11" fill="#EF4444" fillOpacity="0.06" />
          <text x="376" y="103" fill="#EF4444" fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>{"Aujourd'hui"}</text>
        </g>

        <g className="animate-float-delayed">
          <rect x="32" y="134" width="416" height="52" rx="12" fill="white" stroke={STONE} strokeWidth="1" />
          <rect x="44" y="150" width="20" height="20" rx="6" fill={WARM} fillOpacity="0.1" stroke={WARM} strokeWidth="1.5" strokeOpacity="0.4" />
          <text x="76" y="158" fill={FG} fontSize="11.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Envoyer proposition TechVision</text>
          <text x="76" y="174" fill="#888" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Pierre Laurent - TechVision</text>
          <rect x="354" y="150" width="58" height="22" rx="11" fill={WARM} fillOpacity="0.06" />
          <text x="383" y="165" fill={WARM} fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Demain</text>
        </g>

        <g className="animate-float">
          <rect x="32" y="196" width="416" height="52" rx="12" fill="white" stroke={STONE} strokeWidth="1" fillOpacity="0.6" />
          <rect x="44" y="212" width="20" height="20" rx="6" fill={TEAL} fillOpacity="0.1" />
          <path d="M50 220l3 3 5-5" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="76" y="220" fill="#BBBBBB" fontSize="11.5" fontWeight="500" textDecoration="line-through" style={{ fontFamily: 'system-ui' }}>Appeler DataSoft pour feedback</text>
          <text x="76" y="236" fill="#CCCCCC" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Sophie Morel - DataSoft</text>
          <rect x="360" y="212" width="48" height="22" rx="11" fill={TEAL} fillOpacity="0.06" />
          <text x="384" y="227" fill={TEAL} fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Fait</text>
        </g>

        <g className="animate-float-delayed">
          <rect x="32" y="258" width="416" height="52" rx="12" fill="white" stroke={STONE} strokeWidth="1" />
          <rect x="44" y="274" width="20" height="20" rx="6" fill={TEAL_MID} fillOpacity="0.1" stroke={TEAL_MID} strokeWidth="1.5" strokeOpacity="0.4" />
          <text x="76" y="282" fill={FG} fontSize="11.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>Preparer demo CloudNet</text>
          <text x="76" y="298" fill="#888" fontSize="9.5" style={{ fontFamily: 'system-ui' }}>Luc Bernard - CloudNet</text>
          <rect x="350" y="274" width="62" height="22" rx="11" fill={TEAL_MID} fillOpacity="0.06" />
          <text x="381" y="289" fill={TEAL_MID} fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Vendredi</text>
        </g>
      </svg>
    )
  }

  if (variant === "dashboard") {
    return (
      <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <rect width="480" height="360" rx="24" fill={WARM_LIGHT} />

        {/* Stat cards */}
        <g className="animate-float">
          <rect x="28" y="28" width="132" height="70" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="44" y="50" fill="#888" fontSize="8.5" fontWeight="500" style={{ fontFamily: 'system-ui' }}>{"CHIFFRE D'AFFAIRES"}</text>
          <text x="44" y="76" fill={FG} fontSize="19" fontWeight="800" style={{ fontFamily: 'system-ui' }}>42 500 EUR</text>
          <text x="128" y="50" fill="#10B981" fontSize="8.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>+18%</text>
        </g>
        <g className="animate-float-delayed">
          <rect x="174" y="28" width="132" height="70" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="190" y="50" fill="#888" fontSize="8.5" fontWeight="500" style={{ fontFamily: 'system-ui' }}>PIPELINE</text>
          <text x="190" y="76" fill={FG} fontSize="19" fontWeight="800" style={{ fontFamily: 'system-ui' }}>128 500 EUR</text>
        </g>
        <g className="animate-float">
          <rect x="320" y="28" width="132" height="70" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="336" y="50" fill="#888" fontSize="8.5" fontWeight="500" style={{ fontFamily: 'system-ui' }}>DEALS ACTIFS</text>
          <text x="336" y="76" fill={FG} fontSize="19" fontWeight="800" style={{ fontFamily: 'system-ui' }}>12</text>
          <text x="420" y="50" fill={TEAL} fontSize="8.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>+3 ce mois</text>
        </g>

        {/* Bar chart */}
        <g className="animate-float-delayed">
          <rect x="28" y="114" width="260" height="160" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="44" y="138" fill={FG} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>Deals par etape</text>
          <rect x="52" y="172" width="32" height="84" rx="4" fill={TEAL} fillOpacity="0.6" />
          <text x="68" y="264" fill="#888" fontSize="7.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Prosp.</text>
          <rect x="96" y="186" width="32" height="70" rx="4" fill={TEAL_MID} fillOpacity="0.6" />
          <text x="112" y="264" fill="#888" fontSize="7.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Qualif.</text>
          <rect x="140" y="200" width="32" height="56" rx="4" fill={WARM} fillOpacity="0.6" />
          <text x="156" y="264" fill="#888" fontSize="7.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Prop.</text>
          <rect x="184" y="218" width="32" height="38" rx="4" fill={TEAL} fillOpacity="0.4" />
          <text x="200" y="264" fill="#888" fontSize="7.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Nego.</text>
          <rect x="228" y="228" width="32" height="28" rx="4" fill={WARM} fillOpacity="0.4" />
          <text x="244" y="264" fill="#888" fontSize="7.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Gagne</text>
        </g>

        {/* Donut */}
        <g className="animate-float">
          <rect x="302" y="114" width="150" height="160" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
          <text x="318" y="138" fill={FG} fontSize="10.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>Conversion</text>
          <circle cx="377" cy="210" r="40" fill="none" stroke={STONE} strokeWidth="12" />
          <circle cx="377" cy="210" r="40" fill="none" stroke={TEAL} strokeWidth="12" strokeDasharray="75 176" strokeDashoffset="0" transform="rotate(-90 377 210)" />
          <circle cx="377" cy="210" r="40" fill="none" stroke={WARM} strokeWidth="12" strokeDasharray="50 201" strokeDashoffset="-75" transform="rotate(-90 377 210)" />
          <text x="377" y="206" fill={FG} fontSize="15" fontWeight="800" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>30%</text>
          <text x="377" y="220" fill="#888" fontSize="7.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>taux de gain</text>
        </g>

        {/* Tasks strip */}
        <rect x="28" y="290" width="424" height="48" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
        <text x="48" y="318" fill={FG} fontSize="10.5" fontWeight="600" style={{ fontFamily: 'system-ui' }}>{"3 taches aujourd'hui"}</text>
        <rect x="340" y="302" width="80" height="22" rx="11" fill={TEAL} fillOpacity="0.06" />
        <text x="380" y="317" fill={TEAL} fontSize="8.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Voir tout</text>
      </svg>
    )
  }

  // AI variant
  return (
    <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="480" height="360" rx="24" fill={WARM_LIGHT} />

      {/* Central AI icon */}
      <circle cx="240" cy="130" r="50" fill="white" stroke={WARM} strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="240" cy="130" r="30" fill={WARM} fillOpacity="0.06" />
      <g className="animate-float">
        <line x1="240" y1="72" x2="240" y2="58" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="240" y1="188" x2="240" y2="202" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="182" y1="130" x2="168" y2="130" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="298" y1="130" x2="312" y2="130" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
        <line x1="200" y1="90" x2="190" y2="80" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.2" />
        <line x1="280" y1="170" x2="290" y2="180" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.2" />
        <line x1="280" y1="90" x2="290" y2="80" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.2" />
        <line x1="200" y1="170" x2="190" y2="180" stroke={WARM} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.2" />
      </g>
      <text x="240" y="136" fill={WARM} fontSize="20" fontWeight="800" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>IA</text>

      {/* Model cards */}
      <g className="animate-float">
        <rect x="40" y="230" width="120" height="90" rx="14" fill="white" stroke={TEAL} strokeWidth="1" strokeOpacity="0.2" />
        <circle cx="72" cy="258" r="14" fill={TEAL} fillOpacity="0.08" />
        <text x="72" y="262" fill={TEAL} fontSize="10" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>C</text>
        <text x="94" y="262" fill={FG} fontSize="11.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>Claude</text>
        <text x="56" y="282" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>Anthropic</text>
        <rect x="52" y="294" width="60" height="16" rx="8" fill={TEAL} fillOpacity="0.06" />
        <text x="82" y="305" fill={TEAL} fontSize="7.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Par defaut</text>
        <path d="M160 260 Q200 210, 210 150" stroke={WARM} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.2" />
      </g>

      <g className="animate-float-delayed">
        <rect x="180" y="230" width="120" height="90" rx="14" fill="white" stroke={STONE} strokeWidth="1" />
        <circle cx="212" cy="258" r="14" fill={TEAL_MID} fillOpacity="0.08" />
        <text x="212" y="262" fill={TEAL_MID} fontSize="10" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>G</text>
        <text x="234" y="262" fill={FG} fontSize="11.5" fontWeight="700" style={{ fontFamily: 'system-ui' }}>GPT</text>
        <text x="196" y="282" fill="#888" fontSize="8.5" style={{ fontFamily: 'system-ui' }}>OpenAI</text>
        <rect x="192" y="294" width="60" height="16" rx="8" fill="#888" fillOpacity="0.06" />
        <text x="222" y="305" fill="#888" fontSize="7.5" fontWeight="600" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Fallback</text>
        <path d="M240 230 Q240 200, 240 180" stroke={STONE} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.3" />
      </g>

      <g className="animate-float">
        <rect x="320" y="230" width="120" height="90" rx="14" fill="white" stroke={STONE} strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="380" cy="264" r="14" fill={STONE} fillOpacity="0.3" />
        <text x="380" y="268" fill="#CCCCCC" fontSize="14" fontWeight="700" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>+</text>
        <text x="380" y="298" fill="#BBBBBB" fontSize="9.5" textAnchor="middle" style={{ fontFamily: 'system-ui' }}>Bientot...</text>
        <path d="M330 250 Q300 200, 275 160" stroke={STONE} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.2" />
      </g>
    </svg>
  )
}

export function PricingIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto h-auto opacity-60">
      <circle cx="100" cy="100" r="60" fill={TEAL} fillOpacity="0.04" />
      <circle cx="200" cy="80" r="80" fill={WARM} fillOpacity="0.03" />
      <circle cx="300" cy="100" r="50" fill={TEAL_MID} fillOpacity="0.04" />
      <path d="M100 100 Q 150 60, 200 80 Q 250 100, 300 100" stroke={STONE} strokeWidth="1" fill="none" strokeDasharray="4 4" />
    </svg>
  )
}
