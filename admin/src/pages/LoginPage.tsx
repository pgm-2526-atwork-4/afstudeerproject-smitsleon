import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { session, profile, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in as admin → redirect to dashboard
  if (!loading && session && profile?.role === 'admin') {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await signIn(email, password);
    if (error) setError(error);

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cb-bg px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-cb-primary mb-1">🎶 Concert Buddy</h1>
          <p className="text-cb-text-secondary text-sm">Admin Panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-cb-surface rounded-xl p-6 space-y-4 border border-cb-border">
          <h2 className="text-lg font-semibold text-cb-text">Inloggen</h2>

          {error && (
            <div className="bg-cb-error/10 border border-cb-error/30 rounded-lg px-4 py-3 text-sm text-cb-error">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cb-text-secondary mb-1">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2.5 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50 focus:border-cb-primary"
              placeholder="admin@concertbuddy.be"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-cb-text-secondary mb-1">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2.5 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50 focus:border-cb-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-cb-primary hover:bg-cb-primary-dark disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            {submitting ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
