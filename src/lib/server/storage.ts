import { env } from '$env/dynamic/private';
import { S3Client } from 'bun';

if (!env.S3_ENDPOINT) {
	throw new Error('S3_ENDPOINT is not set');
}

if (!env.S3_ACCESS_KEY_ID) {
	throw new Error('S3_ACCESS_KEY_ID is not set');
}

if (!env.S3_SECRET_ACCESS_KEY) {
	throw new Error('S3_SECRET_ACCESS_KEY is not set');
}

export const s3Client = new S3Client({
	endpoint: env.S3_ENDPOINT,
	region: env.S3_REGION || 'auto',
	accessKeyId: env.S3_ACCESS_KEY_ID,
	secretAccessKey: env.S3_SECRET_ACCESS_KEY,
	bucket: env.S3_BUCKET || 'calories'
});

export function getPresignedUrl(key: string, expiresIn = 86400): string {
	return s3Client.presign(key, { expiresIn });
}
