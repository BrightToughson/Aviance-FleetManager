import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

export interface ResponsiveBarChartProps {
  data: { value: number; label?: string }[];
  width: number;
  height: number;
  color?: string;
}

export default function ResponsiveBarChart({ data, width, height, color = '#10B981' }: ResponsiveBarChartProps) {
  const chartWidth = Math.max(200, width);
  const spacing = Math.max(15, chartWidth / ((data.length || 1) * 2));

  return (
    <BarChart
      data={data}
      width={chartWidth}
      height={height}
      frontColor={color}
      barWidth={20}
      spacing={spacing}
      initialSpacing={10}
      yAxisColor="#E5E7EB"
      xAxisColor="#E5E7EB"
      yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
      xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10 }}
      rulesColor="#F3F4F6"
      hideRules={false}
      isAnimated={false}
    />
  );
}
