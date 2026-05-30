'use strict';

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'eu-west-3';
const BUCKET = process.env.BUCKET;
const APP_SECRET = process.env.APP_SECRET || '';
const REPORTS_KEY = 'reports.json';

const s3 = new S3Client({ region: REGION });

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
};

// Read the whole reports array from S3 (empty array if the file does not exist yet)
async function readReports() {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: REPORTS_KEY })
    );
    const text = await streamToString(res.Body);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw err;
  }
}

async function writeReports(reports) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: REPORTS_KEY,
      Body: JSON.stringify(reports),
      ContentType: 'application/json',
      CacheControl: 'no-cache',
    })
  );
}

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function savePhoto({ contentType, dataBase64 }) {
  const ext = EXT_BY_TYPE[contentType] || 'jpg';
  const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(dataBase64, 'base64'),
      ContentType: contentType || 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

exports.handler = async (event) => {
  const method = event?.requestContext?.http?.method || 'GET';

  // Lightweight shared-secret check (skips CORS pre-flight)
  if (method === 'OPTIONS') return { statusCode: 204 };
  if (APP_SECRET) {
    const provided =
      event?.headers?.['x-app-secret'] || event?.headers?.['X-App-Secret'];
    if (provided !== APP_SECRET) return json(403, { error: 'forbidden' });
  }

  try {
    if (method === 'GET') {
      const reports = await readReports();
      return json(200, { reports });
    }

    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf-8')
      : event.body || '{}';
    const payload = JSON.parse(raw);

    // Photo upload: POST { action: "photo", contentType, dataBase64 }
    if (method === 'POST' && payload.action === 'photo') {
      if (!payload.dataBase64) return json(400, { error: 'dataBase64 required' });
      const url = await savePhoto(payload);
      return json(200, { url });
    }

    // Save reports: PUT { reports: [...] }
    if (method === 'PUT') {
      if (!Array.isArray(payload.reports)) {
        return json(400, { error: 'reports array required' });
      }
      await writeReports(payload.reports);
      return json(200, { ok: true, count: payload.reports.length });
    }

    return json(405, { error: `method ${method} not allowed` });
  } catch (err) {
    console.error('handler error', err);
    return json(500, { error: 'internal error', detail: String(err.message || err) });
  }
};
