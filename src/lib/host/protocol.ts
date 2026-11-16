export const PROTOCOL_VERSION = 1;

export type HostOpenMessage = {
	v: number;
	type: 'open';
	token: string;
	content: string;
	revision: string;
	fileName: string;
	readOnly?: boolean;
};

export type HostSavedMessage = {
	v: number;
	type: 'saved';
	token: string;
	requestId: string;
	revision: string;
};

export type HostSaveErrorMessage = {
	v: number;
	type: 'save-error';
	token: string;
	requestId: string;
	message: string;
};

export type HostExternalChangeMessage = {
	v: number;
	type: 'external-change';
	token: string;
	content: string;
	revision: string;
};

export type HostConflictMessage = {
	v: number;
	type: 'conflict';
	token: string;
	requestId: string;
	content: string;
	revision: string;
};

export type HostMessage =
	| HostOpenMessage
	| HostSavedMessage
	| HostSaveErrorMessage
	| HostExternalChangeMessage
	| HostConflictMessage;

export type SiteReadyMessage = {
	v: number;
	type: 'ready';
	token: string;
};

export type SiteSaveMessage = {
	v: number;
	type: 'save';
	token: string;
	requestId: string;
	content: string;
	baseRevision: string;
};

export type SiteMessage = SiteReadyMessage | SiteSaveMessage;

export function isHostMessage(value: unknown, token: string): value is HostMessage {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return record.v === PROTOCOL_VERSION && record.token === token && typeof record.type === 'string';
}
