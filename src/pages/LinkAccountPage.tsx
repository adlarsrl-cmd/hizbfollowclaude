import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Link2, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';

export default function LinkAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated } = useAppStore();

  const [participantName, setParticipantName] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [linking, setLinking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Lien invalide');
      setLoadingInfo(false);
      return;
    }
    supabase
      .from('user_links')
      .select('participant_id, participants(name)')
      .eq('invitation_token', token)
      .is('linked_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Lien invalide ou déjà utilisé');
        } else {
          setParticipantName((data as any).participants?.name || 'Ce participant');
        }
        setLoadingInfo(false);
      });
  }, [token]);

  const handleClaim = async () => {
    if (!token) return;
    setLinking(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('claim_participant_link', { p_token: token });
      if (error || !(data as any)?.success) {
        setError((data as any)?.error || error?.message || 'Erreur lors du lien');
      } else {
        setDone(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLinking(false);
    }
  };

  const bg = 'min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4';
  const card = 'w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800';

  if (loadingInfo) {
    return (
      <div className={bg}>
        <div className={`${card} flex justify-center`}>
          <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error && !participantName) {
    return (
      <div className={bg}>
        <div className={`${card} text-center space-y-4`}>
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lien invalide</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <Link to="/" className="block w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-sm text-center">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={bg}>
        <div className={`${card} text-center space-y-4`}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Compte lié !</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Votre historique de lecture est maintenant rattaché à votre compte.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-sm"
          >
            Voir mon profil
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={bg}>
        <div className={`${card} text-center space-y-4`}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <Link2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lier votre compte</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connectez-vous pour rattacher l'historique de{' '}
            <strong className="text-slate-700 dark:text-slate-200">{participantName}</strong>{' '}
            à votre compte.
          </p>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-sm"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </Link>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Gardez cette page ouverte et revenez après connexion
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={bg}>
      <div className={`${card} space-y-6`}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <Link2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lier votre compte</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Rattacher l'historique de{' '}
            <strong className="text-slate-700 dark:text-slate-200">{participantName}</strong>{' '}
            à votre compte ?
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Ce que ça fait
          </p>
          {['Tout l\'historique de lecture est conservé', 'Vous pouvez désormais saisir vous-même', 'Le groupe voit vos stats complètes'].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400 text-center">{error}</p>
        )}

        <div className="space-y-2">
          <button
            onClick={handleClaim}
            disabled={linking}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 transition-all font-semibold disabled:opacity-40"
          >
            {linking ? 'En cours…' : 'Confirmer le lien'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 text-slate-500 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
