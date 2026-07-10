export function decodeDbCaCert(encodedCert?: string): string | undefined {
  if (!encodedCert) {
    return undefined;
  }

  return Buffer.from(encodedCert, 'base64').toString('utf8');
}
