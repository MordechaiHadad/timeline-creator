let colorIndex = 0;

export function nextColor(): string {
	const hue = (colorIndex++ * 137.508) % 360;
	return `hsl(${hue}, 70%, 55%)`;
}
