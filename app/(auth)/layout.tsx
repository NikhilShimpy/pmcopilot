export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

export const metadata = {
  title: 'Authentication - PMCopilot',
  description: 'Sign in or create an account to access PMCopilot',
}
