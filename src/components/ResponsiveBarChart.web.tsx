import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ResponsiveBarChartProps {
  data: { value: number; label?: string }[];
  width: number;
  height: number;
  color?: string;
}

export default function ResponsiveBarChart({ data, width, height, color = '#10B981' }: ResponsiveBarChartProps) {
  // We use the provided width/height for the container
  return (
    <div style={{ width: Math.max(200, width), height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis 
            dataKey="label" 
            axisLine={{ stroke: '#E5E7EB' }} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 10 }}
            dy={10}
          />
          <YAxis 
            axisLine={{ stroke: '#E5E7EB' }} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
            cursor={{ fill: 'transparent' }}
          />
          <Bar 
            dataKey="value" 
            fill={color} 
            radius={[4, 4, 0, 0]} 
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
