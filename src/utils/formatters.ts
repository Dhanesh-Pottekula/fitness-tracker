/**
 * Data Formatters
 */

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const formatCalories = (calories: number): string => {
  return `${Math.round(calories)} cal`;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
};

export const formatWeight = (kg: number): string => {
  return `${kg}kg`;
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toFixed(decimals);
};

export const formatPercentage = (num: number): string => {
  return `${Math.round(num)}%`;
};

export const abbreviateNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};
