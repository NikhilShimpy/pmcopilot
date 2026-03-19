import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            PMCopilot
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Cursor for Product Managers
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-12">
            AI-powered feedback analysis and product insights. Build better products
            with intelligent analysis of user feedback.
          </p>

          {/* Quick Links */}
          <div className="flex gap-4 justify-center mb-12">
            <Link
              href="/setup"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              🚀 Setup Authentication
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-lg border-2 border-blue-600"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
            >
              Login
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-semibold mb-4">Architecture Ready ✓</h2>
            <p className="text-gray-600 mb-6">
              The complete backend foundation is built and ready. UI components will be
              added next.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✓ Backend</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Supabase Integration</li>
                  <li>• AI Client (OpenRouter + Puter)</li>
                  <li>• API Routes</li>
                  <li>• Services Layer</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">✓ Core Systems</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Error Handling</li>
                  <li>• Logging System</li>
                  <li>• Type Safety</li>
                  <li>• Environment Config</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">API Endpoints Available:</h3>
              <ul className="text-sm text-gray-600 space-y-1 font-mono">
                <li>POST /api/setup-db - Initialize database</li>
                <li>POST /api/analyze - Analyze feedback</li>
                <li>GET/POST /api/projects - Manage projects</li>
                <li>GET/POST /api/feedback - Manage feedback</li>
              </ul>
            </div>
          </div>

          {/* New Auth System */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-lg p-8 max-w-2xl mx-auto border-2 border-indigo-200">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-900">
              🎉 New: Production-Grade Authentication
            </h2>
            <p className="text-gray-700 mb-6">
              Complete authentication system with automated setup wizard!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold text-indigo-800 mb-2">✓ Features</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Signup & Login</li>
                  <li>• Protected Routes</li>
                  <li>• Session Management</li>
                  <li>• Premium UI</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold text-indigo-800 mb-2">✓ Security</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Row Level Security</li>
                  <li>• HTTP-only Cookies</li>
                  <li>• CSRF Protection</li>
                  <li>• Password Hashing</li>
                </ul>
              </div>
            </div>

            <div className="bg-indigo-100 border-2 border-indigo-300 rounded-lg p-4">
              <p className="text-sm text-indigo-900 font-medium">
                🚀 Get started in 2 minutes with the Setup Wizard →
              </p>
              <Link
                href="/setup"
                className="inline-block mt-3 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all"
              >
                Open Setup Wizard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
