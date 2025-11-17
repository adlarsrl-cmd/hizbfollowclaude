import React, { useState } from 'react';
import { Mail, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';

export default function EmailVerificationBanner() {
  const { user, isEmailVerified, isAuthenticated, resendVerificationEmail, checkEmailVerification } = useAppStore();
  const { success, error: showError } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if:
  // - No user
  // - Email is verified
  // - User dismissed it
  // - User is not authenticated (they shouldn't see this)
  if (!user || !isAuthenticated || isDismissed) {
    return null;
  }

  // Check email verification status
  // Supabase sets email_confirmed_at when email is verified
  const emailConfirmedAt = (user as any)?.email_confirmed_at;
  const actuallyVerified = emailConfirmedAt !== null && emailConfirmedAt !== undefined;
  
  // If email is verified, don't show banner
  if (actuallyVerified || isEmailVerified) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      success('Email de vérification envoyé ! Vérifiez votre boîte de réception.');
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'envoi de l\'email de vérification';
      showError(errorMessage);
      
      // If email verification is disabled, show helpful message in banner
      if (errorMessage.includes('désactivée') || errorMessage.includes('disabled')) {
        // Keep banner visible with updated message
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      await checkEmailVerification();
      // If verified, show success message
      if (useAppStore.getState().isEmailVerified) {
        success('Email vérifié avec succès !');
      }
    } catch (err: any) {
      showError('Erreur lors de la vérification');
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Votre email n'est pas vérifié
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Veuillez vérifier votre email ({user.email}) pour activer votre compte. Si vous n'avez pas reçu l'email, cliquez sur "Renvoyer".
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleCheckVerification}
              className="text-xs px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-md hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
            >
              Vérifier
            </button>
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isResending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 mr-1" />
                  Renvoyer
                </>
              )}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

