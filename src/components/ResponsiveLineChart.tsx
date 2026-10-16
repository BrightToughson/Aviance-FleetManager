import React from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

export interface ResponsiveLineChartProps {
  data: { value: number; label?: string }[];
  width: number;
  height: number;
  color?: string;
}

export default function ResponsiveLineChart({ data, width, height, color = '#0EA5E9' }: ResponsiveLineChartProps) {
  // Gifted Charts requires spacing to be calculated
  const chartWidth = Math.max(250, width);
  const spacing = Math.max(20, chartWidth / (data.length || 1));

  return (
    <LineChart
      data={data}
      width={chartWidth}
      height={height}
      thickness={2.5}
      color={color}
      dataPointsColor={color}
      dataPointsRadius={4}
      spacing={spacing}
      initialSpacing={14}
      yAxisColor="#E5E7EB"
      xAxisColor="#E5E7EB"
      yAxisTextStyle={{ color: '#94A3B8', fontSize: 10, fontWeight: '500' }}
      xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}
      rulesColor="#F1F5F9"
      rulesType="solid"
      hideRules={false}
      curved={true}
      areaChart={true}
      startFillColor={color}
      endFillColor={color}
      startOpacity={0.24}
      endOpacity={0.02}
      isAnimated={true}
      animationDuration={850}
      animateOnDataChange={true}
    />
  );
}
