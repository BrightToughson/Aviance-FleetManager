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
      barWidth={22}
      spacing={spacing}
      initialSpacing={14}
      yAxisColor="#E5E7EB"
      xAxisColor="#E5E7EB"
      yAxisTextStyle={{ color: '#94A3B8', fontSize: 10, fontWeight: '500' }}
      xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}
      rulesColor="#F1F5F9"
      hideRules={false}
      roundedTop={true}
      showGradient={true}
      gradientColor="#34D399"
      isAnimated={true}
      animationDuration={850}
    />
  );
}
