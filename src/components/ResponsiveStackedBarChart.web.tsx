import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ResponsiveStackedBarChartProps {
  stackData: { stacks: { value: number; color: string }[]; label?: string }[];
  width: number;
  height: number;
}

export default function ResponsiveStackedBarChart({ stackData, width, height }: ResponsiveStackedBarChartProps) {
  // Transform gifted-charts stackData to recharts flat object format
  const mappedData = stackData.map(item => {
    const obj: any = { label: item.label };
    item.stacks.forEach((stack, index) => {
      obj[`val_${index}`] = stack.value;
      obj[`color_${index}`] = stack.color;
    });
    return obj;
  });

  // Find max stacks to render the correct number of <Bar /> components
  const maxStacks = Math.max(...stackData.map(d => d.stacks.length), 0);
  const colors = maxStacks > 0 ? stackData[0].stacks.map(s => s.color) : [];

  return (
    <div style={{ width: Math.max(200, width), height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mappedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          {Array.from({ length: maxStacks }).map((_, i) => (
            <Bar 
              key={`bar_${i}`}
              dataKey={`val_${i}`}
              stackId="a"
              fill={colors[i] || '#000'} 
              barSize={16}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
