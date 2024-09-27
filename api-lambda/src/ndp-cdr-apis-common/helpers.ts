import {APIGatewayProxyEventHeaders} from "aws-lambda";

export function trimTrailingSlash(part: string): string {
  let v = part;
  while (v.endsWith('/'))
    v = v.substring(0, v.length - 1);
  return v;
}

export function trimLeadingSlash(part: string): string {
  let v = part;
  while (v.startsWith('/'))
    v = v.substring(1);
  return v;
}


export function getHeadersKeysAsLower(headers: APIGatewayProxyEventHeaders): { [p: string]: any } {
  // Convert all headers to lowercase. This is a limitation with API GW and the way they handle headers.
  // HTTP expects headers to be case-insensitive (RFC 2616: 4.2).
  const requestHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v ?? ''])
  );

  return requestHeaders;
}

export function envVarIsTruthy(value?: string): boolean {
  if (!value) return false;
  value = value.toLowerCase();

  return ['true', '1', 'yes', 'on'].includes(value);
}
