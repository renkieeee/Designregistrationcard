import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '../../utils/supabase/client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginRole, setLoginRole] = useState<'customer' | 'admin'>('customer');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Handle email not confirmed error
        if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before logging in. Check your spam folder if you don\'t see it.');
        } else {
          throw signInError;
        }
        setIsSubmitting(false);
        return;
      }

      if (data?.session?.access_token) {
        console.log('Login successful:', data.user);
        
        // Dynamic redirection based on role
        if (loginRole === 'customer') {
          navigate('/home');
        } else {
          navigate('/admin');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="size-full flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center w-full max-w-5xl">
        <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <div className="flex flex-col md:flex-row">
            {/* Left Side - Branded Area */}
            <div className="w-full md:w-2/5 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-12 flex flex-col justify-center text-white">
              <div className="mb-8">
                <div className="w-16 h-16 bg-[#06b6d4] rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold mb-4">Welcome Back</h2>
                <p className="text-gray-300 text-lg">Sign in to access your loyalty program account and manage your rewards.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#06b6d4] rounded-full"></div>
                  <span className="text-sm text-gray-300">Track your points</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#06b6d4] rounded-full"></div>
                  <span className="text-sm text-gray-300">Exclusive member benefits</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#06b6d4] rounded-full"></div>
                  <span className="text-sm text-gray-300">Redeem rewards</span>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full md:w-3/5 p-12">
              <h1 className="mb-2 text-3xl font-semibold text-gray-800">
                Log In
              </h1>
              <p className="mb-8 text-gray-500">Enter your credentials to continue</p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Role Toggle */}
                <div>
                  <label className="block mb-3 text-gray-700 font-medium">
                    Login As
                  </label>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLoginRole('customer')}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                        loginRole === 'customer'
                          ? 'bg-white text-gray-800 shadow-md'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Customer
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginRole('admin')}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                        loginRole === 'admin'
                          ? 'bg-white text-gray-800 shadow-md'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block mb-2 text-gray-700 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block mb-2 text-gray-700 font-medium">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#06b6d4] text-white py-3.5 rounded-xl hover:bg-[#0891b2] transition-colors duration-200 mt-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#06b6d4]/20"
                >
                  {isSubmitting ? 'Logging In...' : loginRole === 'admin' ? 'Log In as Admin' : 'Log In'}
                </button>
              </form>

              {/* Conditional Registration Link - Only show for customers */}
              {loginRole === 'customer' && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-[#06b6d4] hover:text-[#0891b2] font-semibold transition-colors">
                      Register here
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}