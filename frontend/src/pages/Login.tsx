import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen bg-kds-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">KDS</h1>
          <p className="text-slate-600 mt-1 text-sm">Kitchen Display System</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-kds-surface rounded-2xl border border-kds-border p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-slate-400 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-kds-bg border border-kds-border rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700"
              placeholder="kitchen@venue.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-slate-400 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="bg-kds-bg border border-kds-border rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-900 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm tracking-wide"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
