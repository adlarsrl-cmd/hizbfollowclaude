import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Politique de confidentialité
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dernière mise à jour : 24 février 2026
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">1. Responsable du traitement</h2>
            <p>
              HizbFollow est une application de suivi de lecture du Coran développée et gérée par un éditeur indépendant.
              Pour toute question relative à vos données personnelles, vous pouvez nous contacter à l'adresse suivante :
              <a href="mailto:contact@hizbfollow.app" className="text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
                contact@hizbfollow.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">2. Données collectées</h2>
            <p className="mb-3">Nous collectons les données strictement nécessaires au fonctionnement de l'application :</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Données d'identification :</strong> adresse email, nom d'affichage (choisi par l'utilisateur)</li>
              <li><strong>Données de lecture :</strong> numéro de hizb saisi, date et heure d'enregistrement, nombre de khatmas</li>
              <li><strong>Données de groupe :</strong> appartenance aux groupes, rôle (membre, manager, owner), participants associés</li>
              <li><strong>Données techniques :</strong> préférences de l'application (thème, langue), horodatages de connexion</li>
            </ul>
            <p className="mt-3">
              Nous ne collectons <strong>aucune donnée de localisation</strong>, aucune information de paiement, et aucune donnée sensible au sens du RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">3. Finalité et base légale</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : création et gestion de votre compte, affichage de vos statistiques de lecture, participation aux groupes.</li>
              <li><strong>Intérêt légitime</strong> (art. 6.1.f RGPD) : amélioration de l'application, détection et correction des erreurs techniques.</li>
              <li><strong>Consentement</strong> (art. 6.1.a RGPD) : envoi de notifications optionnelles (rappels hebdomadaires).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">4. Durée de conservation</h2>
            <p>
              Vos données sont conservées pendant toute la durée de votre utilisation de l'application.
              En cas de suppression de votre compte, toutes vos données personnelles sont effacées dans un délai de <strong>30 jours</strong>.
              Certaines données anonymisées (agrégats statistiques) peuvent être conservées à des fins d'amélioration du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">5. Partage des données</h2>
            <p className="mb-3">
              Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées uniquement dans les cas suivants :
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Au sein de votre groupe :</strong> votre progression de lecture est visible par les autres membres et managers de vos groupes.</li>
              <li><strong>Supabase (sous-traitant) :</strong> notre infrastructure de base de données et d'authentification, hébergée dans l'Union Européenne. Supabase agit en tant que sous-traitant au sens du RGPD et est soumis aux mêmes obligations de protection des données.</li>
              <li><strong>Obligations légales :</strong> en cas d'injonction d'une autorité compétente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">6. Vos droits</h2>
            <p className="mb-3">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes.</li>
              <li><strong>Droit à l'effacement :</strong> supprimer votre compte et toutes vos données (via Paramètres → Supprimer mon compte).</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et lisible.</li>
              <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements basés sur l'intérêt légitime.</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:contact@hizbfollow.app" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                contact@hizbfollow.app
              </a>.
              En cas de réponse insatisfaisante, vous pouvez saisir la{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                CNIL
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">7. Sécurité</h2>
            <p>
              Vos données sont protégées par des mesures de sécurité techniques et organisationnelles adaptées :
              chiffrement des données en transit (HTTPS/TLS), authentification sécurisée via Supabase Auth,
              politiques de sécurité au niveau des lignes (Row Level Security) sur toutes les tables de la base de données.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">8. Cookies et stockage local</h2>
            <p>
              L'application utilise le stockage local (localStorage) de votre appareil uniquement pour mémoriser
              vos préférences (thème, groupe actif) et votre session de connexion. Aucun cookie de traçage
              ou de publicité n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">9. Modifications</h2>
            <p>
              Cette politique peut être mise à jour occasionnellement. En cas de modification substantielle,
              vous serez notifié dans l'application. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link to="/terms" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
            Voir les Conditions Générales d'Utilisation →
          </Link>
        </div>
      </div>
    </div>
  );
}
