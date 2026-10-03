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
      thickness={2}
      color={color}
      dataPointsColor={color}
      spacing={spacing}
      initialSpacing={10}
      yAxisColor="#E5E7EB"
      xAxisColor="#E5E7EB"
      yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
      xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10 }}
      rulesColor="#F3F4F6"
      rulesType="solid"
      hideRules={false}
      curved={false}
      isAnimated={false}
    />
  );
}
