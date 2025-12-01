import ComputerIcon from '@lucide/svelte/icons/computer';
import GlobeIcon from '@lucide/svelte/icons/globe';
import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
import TabletIcon from '@lucide/svelte/icons/tablet';
import type { Component } from 'svelte';

export interface DeviceInfo {
	type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
	name: string;
	icon: Component;
}

export function getDeviceInfo(userAgent: string | null): DeviceInfo {
	if (!userAgent) {
		return { type: 'unknown', name: 'Unknown Device', icon: GlobeIcon };
	}

	const ua = userAgent.toLowerCase();

	if (ua.includes('android')) {
		return { type: 'mobile', name: 'Android', icon: SmartphoneIcon };
	}

	if (ua.includes('iphone')) {
		return { type: 'mobile', name: 'iPhone', icon: SmartphoneIcon };
	}

	if (ua.includes('ipad')) {
		return { type: 'tablet', name: 'iPad', icon: TabletIcon };
	}

	if (ua.includes('mobile')) {
		return { type: 'mobile', name: 'Mobile', icon: SmartphoneIcon };
	}

	if (ua.includes('tablet')) {
		return { type: 'tablet', name: 'Tablet', icon: TabletIcon };
	}

	if (ua.includes('chrome')) {
		return { type: 'desktop', name: 'Chrome', icon: ComputerIcon };
	}

	if (ua.includes('firefox')) {
		return { type: 'desktop', name: 'Firefox', icon: ComputerIcon };
	}

	if (ua.includes('safari') && !ua.includes('chrome')) {
		return { type: 'desktop', name: 'Safari', icon: ComputerIcon };
	}

	if (ua.includes('edge')) {
		return { type: 'desktop', name: 'Edge', icon: ComputerIcon };
	}

	return { type: 'desktop', name: 'Desktop', icon: ComputerIcon };
}
