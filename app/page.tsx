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

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
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
        </div>
      </div>
    </main>
  );
}
