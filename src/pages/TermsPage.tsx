import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
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
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Conditions Générales d'Utilisation
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dernière mise à jour : 24 février 2026
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de
              l'application <strong>HizbFollow</strong>, un outil de suivi personnel et collectif de la lecture
              du Saint Coran. En créant un compte ou en utilisant l'application, vous acceptez sans réserve
              les présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">2. Description du service</h2>
            <p className="mb-3">HizbFollow permet à ses utilisateurs de :</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Enregistrer et suivre leur progression de lecture du Coran (hizb, pages)</li>
              <li>Créer ou rejoindre des groupes pour suivre la progression collective</li>
              <li>Consulter des statistiques personnelles et de groupe</li>
              <li>Lire le Coran avec coloration tajweed intégrée</li>
              <li>Suivre la progression durant le mois de Ramadan</li>
            </ul>
            <p className="mt-3">
              Le service est fourni à titre <strong>gratuit</strong> pour un usage personnel et non-commercial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">3. Conditions d'accès</h2>
            <p className="mb-2">Pour utiliser HizbFollow, vous devez :</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Avoir au minimum 13 ans (ou l'âge légal requis dans votre pays)</li>
              <li>Disposer d'une adresse email valide</li>
              <li>Créer un compte personnel et garder vos identifiants confidentiels</li>
            </ul>
            <p className="mt-3">
              Vous êtes responsable de toute activité effectuée depuis votre compte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">4. Obligations de l'utilisateur</h2>
            <p className="mb-2">Vous vous engagez à :</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Utiliser l'application uniquement à des fins personnelles et licites</li>
              <li>Ne pas tenter de contourner les mesures de sécurité de l'application</li>
              <li>Ne pas utiliser l'application à des fins commerciales sans autorisation préalable</li>
              <li>Ne pas partager de contenu offensant ou contraire à l'ordre public via l'application</li>
              <li>Renseigner des informations exactes lors de la création de votre compte</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">5. Propriété intellectuelle</h2>
            <p>
              L'application HizbFollow, son interface, son code source et ses éléments graphiques sont protégés
              par le droit de la propriété intellectuelle. Tout usage non autorisé est strictement interdit.
            </p>
            <p className="mt-3">
              Le texte coranique affiché dans l'application est fourni par l'API Quran.com et est la propriété
              de ses auteurs respectifs. La coloration tajweed est générée à partir des données de cette API.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">6. Disponibilité du service</h2>
            <p>
              Nous nous efforçons de maintenir l'application disponible en permanence, mais ne pouvons garantir
              une disponibilité sans interruption. Des maintenances peuvent être effectuées ponctuellement.
              Nous déclinons toute responsabilité en cas d'indisponibilité temporaire du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">7. Limitation de responsabilité</h2>
            <p>
              HizbFollow est fourni "tel quel", sans garantie d'exactitude ou d'exhaustivité des données.
              Nous ne sommes pas responsables des dommages directs ou indirects résultant de l'utilisation
              ou de l'impossibilité d'utiliser l'application, ni de la perte de données liée à une suppression
              de compte ou à un incident technique.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">8. Suspension et résiliation</h2>
            <p>
              Vous pouvez supprimer votre compte à tout moment via <strong>Paramètres → Supprimer mon compte</strong>.
              Toutes vos données seront effacées conformément à notre{' '}
              <Link to="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                Politique de confidentialité
              </Link>.
            </p>
            <p className="mt-3">
              Nous nous réservons le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU,
              sans préavis ni indemnité.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">9. Modifications des CGU</h2>
            <p>
              Nous pouvons modifier les présentes CGU à tout moment. En cas de modification substantielle,
              vous serez informé dans l'application. La poursuite de l'utilisation du service après notification
              vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">10. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit belge. Tout litige relatif à leur interprétation
              ou à leur exécution sera soumis à la compétence des tribunaux belges.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link to="/privacy" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
            Voir la Politique de confidentialité →
          </Link>
        </div>
      </div>
    </div>
  );
}
