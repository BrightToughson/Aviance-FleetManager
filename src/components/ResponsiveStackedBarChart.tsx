import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

export interface ResponsiveStackedBarChartProps {
  stackData: { stacks: { value: number; color: string }[]; label?: string }[];
  width: number;
  height: number;
}

export default function ResponsiveStackedBarChart({ stackData, width, height }: ResponsiveStackedBarChartProps) {
  const chartWidth = Math.max(200, width);
  const spacing = Math.max(10, chartWidth / ((stackData.length || 1) * 2));

  return (
    <BarChart
      stackData={stackData}
      width={chartWidth}
      height={height}
      barWidth={16}
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
