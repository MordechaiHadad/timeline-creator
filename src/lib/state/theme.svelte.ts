export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'timeline-theme';

const media =
	typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function storedMode(): ThemeMode {
	if (typeof localStorage === 'undefined') return 'system';
	const value = localStorage.getItem(STORAGE_KEY);
	return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function createThemeState() {
	let mode = $state<ThemeMode>(storedMode());
	let systemDark = $state(media?.matches ?? false);
	const resolved = $derived<ResolvedTheme>(
		mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
	);

	function apply() {
		if (typeof document === 'undefined') return;
		const dark = resolved === 'dark';
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	}

	function set(next: ThemeMode) {
		mode = next;
		if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
		apply();
	}

	function toggle() {
		set(resolved === 'dark' ? 'light' : 'dark');
	}

	let initialized = false;

	function init() {
		if (initialized) return;
		initialized = true;
		apply();
		media?.addEventListener('change', (event) => {
			systemDark = event.matches;
			if (mode === 'system') apply();
		});
	}

	return {
		get mode() {
			return mode;
		},
		get resolved() {
			return resolved;
		},
		set,
		toggle,
		init
	};
}

export const theme = createThemeState();
