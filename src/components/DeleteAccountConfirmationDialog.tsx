import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteAccountConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  userEmail?: string;
}

export default function DeleteAccountConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  userEmail
}: DeleteAccountConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Supprimer le compte
          </h2>

          {/* Warning message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
              ⚠️ Cette action est irréversible
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Toutes vos données seront définitivement supprimées :
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 mt-2 ml-4 list-disc space-y-1">
              <li>Participants et leurs données</li>
              <li>Toutes les saisies (entries)</li>
              <li>Snapshots hebdomadaires</li>
              <li>Paramètres et préférences</li>
              <li>Groupes et membres</li>
              <li>Profil utilisateur</li>
            </ul>
            <p className="text-xs text-red-600 dark:text-red-400 mt-3 pt-3 border-t border-red-200 dark:border-red-800">
              <strong>Note importante :</strong> Vous pourrez toujours vous reconnecter avec cet email, mais toutes vos données seront supprimées. Vous devrez créer ou rejoindre un nouveau groupe pour utiliser l'application.
            </p>
          </div>

          {/* Email confirmation */}
          {userEmail && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Compte à supprimer : <span className="font-medium">{userEmail}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Suppression...
                </>
              ) : (
                'Supprimer définitivement'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

