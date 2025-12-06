const GOLDEN_ANGLE = 137.508;
const HUE_OFFSET = 220;

export function generateChartColor(index: number): string {
	const hue = (HUE_OFFSET + index * GOLDEN_ANGLE) % 360;
	return `oklch(0.7 0.15 ${hue})`;
}
