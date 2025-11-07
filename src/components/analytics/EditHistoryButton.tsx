import React from "react";
import { useAuth } from "../../stores/useAuth";
import { supabase } from "../../lib/supabase";
import { Edit, X } from "lucide-react";
import { getWeekKeyTuesday } from "../../lib/utils";
import type { Participant, WeeklySnapshot } from "../../types";

export function EditHistoryButton({ participantId }: { participantId: string }) {
  const role = useAuth(s => s.role);
  const [open, setOpen] = React.useState(false);
  
  return role === "admin" ? (
    <>
      <button 
        className="flex items-center px-3 py-1 text-sm bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Edit className="h-3 w-3 mr-1" />
        Modifier historique
      </button>
      {open && <HistoryModal participantId={participantId} onClose={() => setOpen(false)} />}
    </>
  ) : null;
}

function HistoryModal({ participantId, onClose }: {
  participantId: string; 
  onClose: () => void;
}) {
  const [existingSnaps, setExistingSnaps] = React.useState<WeeklySnapshot[]>([]);
  const [participant, setParticipant] = React.useState<Participant | null>(null);
  const [selectedWeek, setSelectedWeek] = React.useState<string>("");
  const [value, setValue] = React.useState<number>(1);
  const [cycle, setCycle] = React.useState<number>(0);
  const [saving, setSaving] = React.useState(false);

  // Generate list of weeks for the past 2 years
  const generateWeekOptions = () => {
    const weeks = [];
    const now = new Date();
    
    // Go back 104 weeks (2 years)
    for (let i = 0; i < 104; i++) {
      // Calculate the Tuesday for each week going backwards
      const tuesday = new Date(now);
      // First, find this week's Tuesday
      const daysSinceMonday = (tuesday.getDay() + 6) % 7; // Monday = 0, Tuesday = 1, etc.
      const daysSinceTuesday = daysSinceMonday === 0 ? 6 : daysSinceMonday - 1;
      tuesday.setDate(tuesday.getDate() - daysSinceTuesday - (i * 7));
      
      const weekKey = getWeekKeyTuesday(tuesday);
      
      // Calculate ISO week number
      const startOfYear = new Date(tuesday.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((tuesday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
      
      weeks.push({
        weekKey,
        displayDate: tuesday.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        weekNumber: `S${weekNumber.toString().padStart(2, '0')}`
      });
    }
    
    return weeks;
  };

  const weekOptions = generateWeekOptions();

  React.useEffect(() => {
    (async () => {
      try {
        // Fetch participant info
        const { data: participantData } = await supabase
          .from("participants")
          .select("*")
          .eq("id", participantId)
          .single();
        
        setParticipant(participantData);

        // Fetch existing snapshots
        const { data: snapsData } = await supabase
          .from("weekly_snapshots")
          .select("*")
          .eq("participant_id", participantId)
          .order("snapshot_at", { ascending: false });
        
        console.log('Fetched snapshots:', snapsData);
        setExistingSnaps(snapsData || []);
        
        // Set default to current week
        const currentWeek = getWeekKeyTuesday(new Date());
        setSelectedWeek(currentWeek);
        
        // Try to find existing data for current week
        const existingSnap = snapsData?.find(s => s.week_key_tuesday === currentWeek);
        if (existingSnap) {
          setValue(existingSnap.value_int);
          setCycle(existingSnap.cycle_number || 0);
        } else {
          setValue(1);
          setCycle(participantData?.cycle_number || 0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    })();
  }, [participantId]);

  const handleWeekChange = (weekKey: string) => {
    setSelectedWeek(weekKey);
    
    // Check if we have existing data for this week
    const existingSnap = existingSnaps.find(s => s.week_key_tuesday === weekKey);
    if (existingSnap) {
      setValue(existingSnap.value_int);
      setCycle(existingSnap.cycle_number || 0);
    } else {
      // Default values for new week
      setValue(1);
      setCycle(participant?.cycle_number || 0);
    }
  };

  const save = async () => {
    if (!participant) return;
    
    setSaving(true);
    try {
      const existingSnap = existingSnaps.find(s => s.week_key_tuesday === selectedWeek);
      
      // Calculate cumulative values
      const cumulative_hizb = cycle * 60 + value;
      const cumulative_pages = Math.round(cumulative_hizb * 604 / 60);
      
      if (existingSnap) {
        // Update existing snapshot
        
        // Create audit record
        try {
          await supabase.from("audit_weekly_snapshots").insert({
            owner_id: participant.owner_id,
            participant_id: participantId,
            week_key_tuesday: selectedWeek,
            old_value_int: existingSnap.value_int,
            new_value_int: value,
            old_cycle: existingSnap.cycle_number || 0,
            new_cycle: cycle,
            edited_by: (await supabase.auth.getUser()).data.user?.id
          });
        } catch (auditErr) {
          console.log("Audit table error (non-critical):", auditErr);
        }

        // Update snapshot
        const { error } = await supabase
          .from("weekly_snapshots")
          .update({ 
            value_int: value, 
            cycle_number: cycle,
            cumulative_hizb,
            cumulative_pages,
            updated_at: new Date().toISOString() 
          })
          .eq("id", existingSnap.id);
          
        if (error) throw error;
      } else {
        // Create new snapshot
        const { error } = await supabase
          .from("weekly_snapshots")
          .insert({
            owner_id: participant.owner_id,
            participant_id: participantId,
            snapshot_at: new Date().toISOString(),
            week_key_tuesday: selectedWeek,
            unit_type: 'hizb',
            value_int: value,
            cycle_number: cycle,
            cumulative_hizb,
            cumulative_pages
          });
          
        if (error) throw error;
      }
      
      onClose();
      // Reload to see changes
      window.location.reload();
    } catch (error) {
      console.error('Save error:', error);
      alert("Erreur lors de l'enregistrement: " + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  const isExistingWeek = existingSnaps.some(s => s.week_key_tuesday === selectedWeek);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isExistingWeek ? 'Modifier une semaine' : 'Créer une entrée'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Semaine
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              value={selectedWeek} 
              onChange={e => handleWeekChange(e.target.value)}
            >
              {weekOptions.map(week => {
                const hasData = existingSnaps.some(s => s.week_key_tuesday === week.weekKey);
                return (
                  <option key={week.weekKey} value={week.weekKey}>
                    {week.displayDate} {week.weekNumber} {hasData ? '✓' : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ✓ = données existantes, vide = nouvelle entrée
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valeur (hizb)
              </label>
              <input 
                type="number" 
                min={1} 
                max={60} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                value={value} 
                onChange={e => setValue(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cycle (khatma)
              </label>
              <input 
                type="number" 
                min={0} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                value={cycle} 
                onChange={e => setCycle(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          
          {!isExistingWeek && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Cette semaine n'a pas encore de données. Une nouvelle entrée sera créée.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button 
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            Annuler
          </button>
          <button 
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            disabled={saving} 
            onClick={save}
          >
            {saving ? 'Enregistrement...' : (isExistingWeek ? 'Modifier' : 'Créer')}
          </button>
        </div>
      </div>
    </div>
  );
}