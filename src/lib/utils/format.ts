export function formatTimeAgo(date: Date): string {
	const diff = Date.now() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return 'Just now';
}

export function formatDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

export function getDisplayDate(date: Date): string {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const dString = formatDate(date);
	const tString = formatDate(today);
	const yString = formatDate(yesterday);

	if (dString === tString) return 'Today';
	if (dString === yString) return 'Yesterday';

	return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
