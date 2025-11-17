import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../stores/useToast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);

  useEffect(() => {
    // Supabase sends the token in the URL hash (#access_token=...&type=recovery)
    // We need to listen for auth state changes to detect when session is established
    
    let mounted = true;
    let subscription: any = null;
    
    const initializeSession = async () => {
      // First, check if we have a recovery token in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        // Set up auth state listener to detect when Supabase processes the token
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            if (mounted) {
              setValidatingToken(false);
            }
            if (subscription) {
              subscription.unsubscribe();
              subscription = null;
            }
          }
        });
        
        subscription = authSubscription;
        
        // Also check session after a short delay (fallback)
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (mounted && session) {
            setValidatingToken(false);
            if (subscription) {
              subscription.unsubscribe();
              subscription = null;
            }
          } else if (mounted) {
            // If no session after 3 seconds, show error
            setTimeout(() => {
              if (mounted) {
                const { data: { session: finalSession } } = supabase.auth.getSession();
                if (!finalSession) {
                  setError('Lien de réinitialisation invalide ou expiré');
                  setValidatingToken(false);
                }
                if (subscription) {
                  subscription.unsubscribe();
                  subscription = null;
                }
              }
            }, 2000);
          }
        }, 1000);
      } else {
        // Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session) {
            setValidatingToken(false);
          } else {
            setError('Lien de réinitialisation invalide ou expiré');
            setValidatingToken(false);
          }
        }
      }
    };
    
    initializeSession();
    
    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }
    
    setLoading(true);

    try {
      // Ensure we have a valid session before updating password
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Session invalide. Veuillez demander un nouveau lien de réinitialisation.');
      }
      
      // Log session info for debugging (remove in production)
      console.log('Session user ID:', session.user?.id);
      console.log('Session expires at:', session.expires_at);
      
      // Update password - Supabase requires the session to be from a recovery token
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Supabase updateUser error details:', {
          message: updateError.message,
          status: updateError.status,
          name: updateError.name
        });
        throw updateError;
      }
      
      console.log('Password updated successfully');

      setSuccess(true);
      showSuccess('Mot de passe réinitialisé avec succès !');

      // Sign out the user so they need to log in with the new password
      await supabase.auth.signOut();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      
      // Simplify Supabase password error messages
      let errorMessage = err.message || 'Erreur lors de la réinitialisation';
      
      // Handle specific Supabase errors
      if (errorMessage.includes('Error during password storage') || errorMessage.includes('password storage')) {
        errorMessage = 'Erreur lors de l\'enregistrement du mot de passe. Le lien de réinitialisation a peut-être expiré. Veuillez demander un nouveau lien.';
      } else if (errorMessage.includes('Password should contain')) {
        // Extract the requirements from the error message
        if (errorMessage.includes('abcdefghijklmnopqrstuvwxyz')) {
          errorMessage = 'Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule, un chiffre et un caractère spécial.';
        } else {
          errorMessage = 'Le mot de passe ne respecte pas les exigences de sécurité.';
        }
      } else if (errorMessage.includes('password') || errorMessage.includes('Password')) {
        // Generic password error - simplify
        if (errorMessage.includes('weak') || errorMessage.includes('faible')) {
          errorMessage = 'Le mot de passe est trop faible. Utilisez une combinaison de lettres, chiffres et caractères spéciaux.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('invalide')) {
          errorMessage = 'Le mot de passe est invalide.';
        } else if (errorMessage.includes('expired') || errorMessage.includes('expiré')) {
          errorMessage = 'Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien.';
        } else if (errorMessage.includes('token') || errorMessage.includes('session')) {
          errorMessage = 'Session invalide. Veuillez demander un nouveau lien de réinitialisation.';
        }
      } else if (err.status === 500 || err.status === 422) {
        // Server errors - likely session or token issue
        errorMessage = 'Erreur serveur. Le lien de réinitialisation a peut-être expiré ou est invalide. Veuillez demander un nouveau lien.';
      }
      
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Vérification du lien...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Mot de passe réinitialisé !
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion pour vous connecter avec votre nouveau mot de passe.
            </p>

            <Link
              to="/"
              className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              Se connecter maintenant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full">
              <Lock className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Entrez votre nouveau mot de passe
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Erreur</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="Minimum 6 caractères"
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Le mot de passe doit contenir au moins 6 caractères, avec des lettres majuscules, minuscules, chiffres et caractères spéciaux pour plus de sécurité.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="Répétez le mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

