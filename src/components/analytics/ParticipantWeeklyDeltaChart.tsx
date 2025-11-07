import React from "react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  Legend 
} from "recharts";

export function ParticipantWeeklyDeltaChart({ data, target }: {
  data: { week: string; delta: number }[];
  target: 7 | 14;
}) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            formatter={(value, name) => [
              `${value} hizb`,
              name === 'delta' ? 'Lu cette semaine' : name
            ]}
            labelFormatter={(label) => `Semaine ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="delta" 
            name="Lu cette semaine (hizb)" 
            fill="#059669"
            radius={[2, 2, 0, 0]}
          />
          {/* Lignes d'objectif */}
          <ReferenceLine 
            y={7} 
            stroke="#dc2626" 
            strokeDasharray="4 4" 
            label={{ value: "Objectif 7", position: "topRight" }}
          />
          <ReferenceLine 
            y={14} 
            stroke="#dc2626" 
            strokeDasharray="4 4" 
            label={{ value: "Objectif 14", position: "topRight" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}