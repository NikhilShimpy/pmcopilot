import Image from 'next/image'

interface AppLogoProps {
  size?: number
  className?: string
  imageClassName?: string
  alt?: string
  priority?: boolean
}

export default function AppLogo({
  size = 40,
  className = '',
  imageClassName = '',
  alt = 'PMCopilot Logo',
  priority = false,
}: AppLogoProps) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-slate-900/75 shadow-[0_14px_34px_-16px_rgba(56,189,248,0.8)] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/websiteicon.png"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className={`h-full w-full object-cover ${imageClassName}`}
      />
    </span>
  )
}

