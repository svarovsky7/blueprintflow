export type ScaleValue = 0.7 | 0.8 | 0.9 | 1 | 1.1 | 1.2;

export const SCALE_VALUES: ScaleValue[] = [0.7, 0.8, 0.9, 1, 1.1, 1.2];

export const scaleOptions = SCALE_VALUES.map((value) => ({
  value,
  label: `${Math.round(value * 100)}%`,
}));

export const parseScale = (value: string | null): ScaleValue => {
  const num = Number(value);
  return SCALE_VALUES.includes(num as ScaleValue) ? (num as ScaleValue) : 1;
};
