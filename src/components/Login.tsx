import React, { useState } from 'react';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const { signIn, signUp, signInWithApple } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isSignUp && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (isSignUp && !termsAccepted) {
      setError('Veuillez accepter les CGU et la Politique de confidentialité pour continuer');
      return;
    }
    
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        // Check if user was created but needs email verification
        const { isEmailVerified: verified, isAuthenticated } = useAppStore.getState();
        if (!verified && !isAuthenticated) {
          // User created but needs to verify email
          setSignupSuccess(true);
          setError('');
        }
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      setError(error.message || (isSignUp ? 'Erreur lors de la création du compte' : 'Erreur de connexion'));
      setSignupSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setSignupSuccess(false);
    setTermsAccepted(false);
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError('');
    try {
      await signInWithApple();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion avec Apple');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full">
              <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            HizbFollow
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isSignUp ? 'Créer un compte' : 'Suivi de lecture du Saint Coran'}
          </p>
        </div>

        {/* Apple Sign-In */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={appleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium text-white bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 376.6 0 270.3 0 166.1C0 42.8 73.3 3.7 138.5 3.7c60.9 0 106.4 42.8 166.9 42.8 51.5 0 104.9-42.8 168.6-42.8 24.4 0 98.8 2.3 158.1 68.2ZM643.4 87.1c27.5-32.4 48.1-77.1 48.1-121.8 0-6.1-.5-12.3-1.6-17.1-45.7 1.7-99.4 30.4-131.7 66.8-25 27.5-48.1 72.2-48.1 117.6 0 6.7 1.1 13.5 1.6 15.6 2.8.5 7.2 1.1 11.7 1.1 41.1 0 93.1-27.5 120-62.2Z"/>
            </svg>
            {appleLoading ? 'Connexion...' : 'Continuer avec Apple'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">ou</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {signupSuccess && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-md">
              <p className="font-medium mb-1">Compte créé avec succès !</p>
              <p className="text-sm">Un email de vérification a été envoyé à {email}. Veuillez vérifier votre boîte de réception et cliquer sur le lien pour activer votre compte.</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                J'accepte les{' '}
                <Link to="/terms" target="_blank" className="text-emerald-600 hover:underline dark:text-emerald-400">
                  Conditions Générales d'Utilisation
                </Link>{' '}
                et la{' '}
                <Link to="/privacy" target="_blank" className="text-emerald-600 hover:underline dark:text-emerald-400">
                  Politique de confidentialité
                </Link>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && !termsAccepted)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isSignUp ? 'Création...' : 'Connexion...') : (isSignUp ? 'Créer le compte' : 'Se connecter')}
          </button>
        </form>

        {/* Forgot password link (only on login, not signup) */}
        {!isSignUp && (
          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        )}

        {/* Toggle between sign in and sign up */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
          </button>
        </div>

        {/* Info */}
        {!isSignUp && import.meta.env.DEV && (
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Mode développement
            </p>
          </div>
        )}
      </div>
    </div>
  );
}