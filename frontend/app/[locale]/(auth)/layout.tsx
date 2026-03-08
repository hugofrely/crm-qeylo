export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side – decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0D4F4F 0%, #0D1F1F 100%)' }}>
        {/* Geometric pattern */}
        <div className="absolute inset-0 opacity-[0.05]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full border border-white/8" />
        <div className="absolute bottom-1/4 right-10 w-60 h-60 rounded-full border border-white/[0.04]" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-[#3DD9D9]/[0.04]" />

        {/* Warm accent glow */}
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 rounded-full bg-[#C9946E]/[0.06] blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <h1 className="text-4xl tracking-tight" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
              Qeylo
            </h1>
          </div>
          <div className="max-w-md">
            <blockquote className="text-xl leading-relaxed text-white/80" style={{ fontFamily: 'var(--font-display), Georgia, serif', fontStyle: 'italic' }}>
              &ldquo;La relation client est un art qui se cultive avec attention.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm text-[#3DD9D9]/50 tracking-wide uppercase">
              Votre CRM intelligent
            </p>
          </div>
        </div>
      </div>

      {/* Right side – form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  )
}
