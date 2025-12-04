type LogLevel = 'info' | 'warn' | 'error';

interface RequestLog {
	level: LogLevel;
	timestamp: string;
	requestId: string;
	method: string;
	path: string;
	status?: number;
	duration?: number;
	userId?: string;
	error?: string;
	stack?: string;
}

export function generateRequestId(): string {
	return crypto.randomUUID().slice(0, 8);
}

function log(data: RequestLog): void {
	const output = JSON.stringify(data);
	if (data.level === 'error') {
		console.error(output);
	} else if (data.level === 'warn') {
		console.warn(output);
	} else {
		console.log(output);
	}
}

export function logRequest(params: {
	requestId: string;
	method: string;
	path: string;
	status: number;
	duration: number;
	userId?: string;
}): void {
	const level: LogLevel = params.status >= 500 ? 'error' : params.status >= 400 ? 'warn' : 'info';

	log({
		level,
		timestamp: new Date().toISOString(),
		requestId: params.requestId,
		method: params.method,
		path: params.path,
		status: params.status,
		duration: params.duration,
		userId: params.userId
	});
}

export function logError(params: {
	requestId: string;
	method: string;
	path: string;
	userId?: string;
	error: unknown;
}): void {
	const err = params.error instanceof Error ? params.error : new Error(String(params.error));

	log({
		level: 'error',
		timestamp: new Date().toISOString(),
		requestId: params.requestId,
		method: params.method,
		path: params.path,
		userId: params.userId,
		error: err.message,
		stack: err.stack
	});
}
