import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ResponsiveLineChartProps {
  data: { value: number; label?: string }[];
  width: number;
  height: number;
  color?: string;
}

export default function ResponsiveLineChart({ data, width, height, color = '#0EA5E9' }: ResponsiveLineChartProps) {
  // We use the provided width/height for the container
  return (
    <div style={{ width: Math.max(250, width), height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={{ r: 4, fill: color, strokeWidth: 0 }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
