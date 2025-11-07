import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../stores/useToast';
import { useAppStore } from '../stores/useAppStore';

export default function JoinGroupPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { fetchMyGroups, setActiveGroup } = useAppStore();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  const validateCode = async () => {
    if (!inviteCode.trim()) {
      showError('Veuillez entrer un code d\'invitation');
      return;
    }

    setLoading(true);
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .select('id, name, description, reference_day')
        .eq('invite_code', inviteCode.trim())
        .gt('invite_code_expires_at', new Date().toISOString())
        .eq('archived', false)
        .maybeSingle();

      if (error) throw error;

      if (!group) {
        showError('Code d\'invitation invalide ou expiré');
        return;
      }

      setGroupInfo(group);
    } catch (error: any) {
      console.error('Error validating code:', error);
      showError('Erreur lors de la validation du code');
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!groupInfo) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('join_group_with_invite_code', {
        p_invite_code: inviteCode.trim(),
        p_user_id: user.id
      });

      if (error) throw error;

      if (!data.success) {
        showError(data.error);
        return;
      }

      await fetchMyGroups();
      setActiveGroup(data.group_id);
      success(`Vous avez rejoint le groupe "${data.group_name}" !`);
      navigate('/groups');
    } catch (error: any) {
      console.error('Error joining group:', error);
      showError('Erreur lors de l\'adhésion au groupe');
    } finally {
      setLoading(false);
    }
  };

  const copyCurrentUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Lien copié !');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
          <UserPlus className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Rejoindre un groupe
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Entrez le code d'invitation pour rejoindre un groupe existant
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
        {!groupInfo ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Code d'invitation
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.trim())}
                placeholder="Entrez le code à 15 caractères"
                maxLength={15}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white font-mono text-center text-lg tracking-wider"
                onKeyPress={(e) => e.key === 'Enter' && validateCode()}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Le code contient 15 caractères alphanumériques
              </p>
            </div>

            <button
              onClick={validateCode}
              disabled={loading || inviteCode.length !== 15}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Comment obtenir un code d'invitation ?
              </h3>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    1
                  </span>
                  <span>Demandez au propriétaire ou gestionnaire du groupe de vous inviter</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    2
                  </span>
                  <span>Ils peuvent générer un code d'invitation depuis la page du groupe</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    3
                  </span>
                  <span>Le code est valable 48 heures après sa génération</span>
                </li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Check className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Code validé !
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Vous êtes sur le point de rejoindre :
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {groupInfo.name}
              </h4>
              {groupInfo.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {groupInfo.description}
                </p>
              )}
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">Jour de référence :</span>
                <span className="ml-2 capitalize">{groupInfo.reference_day}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGroupInfo(null);
                  setInviteCode('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={joinGroup}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Adhésion...' : 'Rejoindre le groupe'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Copy className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Partager cette page
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Vous pouvez partager le lien de cette page avec d'autres personnes
            </p>
            <button
              onClick={copyCurrentUrl}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Copier le lien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
