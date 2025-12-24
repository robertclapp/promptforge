import { getDb } from "../db";
import { ipAllowlist, ipAllowlistSettings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * IP Allowlist Settings
 */
export interface IpAllowlistConfig {
  enabled: boolean;
  enforceForApi: boolean;
  enforceForWeb: boolean;
  ownersBypass: boolean;
  violationAction: "block" | "log";
}

const DEFAULT_CONFIG: IpAllowlistConfig = {
  enabled: false,
  enforceForApi: true,
  enforceForWeb: false,
  ownersBypass: true,
  violationAction: "block",
};

/**
 * Get IP allowlist settings for a workspace
 */
export async function getIpAllowlistSettings(
  organizationId: string
): Promise<IpAllowlistConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_CONFIG;

  try {
    const [settings] = await db
      .select()
      .from(ipAllowlistSettings)
      .where(eq(ipAllowlistSettings.organizationId, organizationId))
      .limit(1);

    if (!settings) return DEFAULT_CONFIG;

    return {
      enabled: settings.enabled,
      enforceForApi: settings.enforceForApi,
      enforceForWeb: settings.enforceForWeb,
      ownersBypass: settings.ownersBypass,
      violationAction: settings.violationAction as "block" | "log",
    };
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

/**
 * Update IP allowlist settings
 */
export async function updateIpAllowlistSettings(
  organizationId: string,
  config: Partial<IpAllowlistConfig>
): Promise<IpAllowlistConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentConfig = await getIpAllowlistSettings(organizationId);
  const newConfig = { ...currentConfig, ...config };

  // Upsert settings
  await db
    .insert(ipAllowlistSettings)
    .values({
      id: `${organizationId}-ip-settings`,
      organizationId,
      ...newConfig,
    })
    .onDuplicateKeyUpdate({
      set: newConfig,
    });

  return newConfig;
}

/**
 * Get all IP allowlist entries for a workspace
 */
export async function getIpAllowlistEntries(organizationId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(ipAllowlist)
    .where(eq(ipAllowlist.organizationId, organizationId));
}

/**
 * Add an IP address or CIDR range to the allowlist
 */
export async function addIpAllowlistEntry(
  organizationId: string,
  entry: {
    ipAddress: string;
    description?: string;
    createdBy: string;
  }
): Promise<{ id: string; success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate IP address or CIDR
  const { isValid, isCidr } = validateIpOrCidr(entry.ipAddress);
  if (!isValid) {
    return { id: "", success: false, error: "Invalid IP address or CIDR notation" };
  }

  // Check for duplicates
  const existing = await db
    .select()
    .from(ipAllowlist)
    .where(
      and(
        eq(ipAllowlist.organizationId, organizationId),
        eq(ipAllowlist.ipAddress, entry.ipAddress)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, success: false, error: "IP address already in allowlist" };
  }

  const id = uuidv4();
  await db.insert(ipAllowlist).values({
    id,
    organizationId,
    ipAddress: entry.ipAddress,
    isCidr,
    description: entry.description,
    createdBy: entry.createdBy,
    enabled: true,
  });

  return { id, success: true };
}

/**
 * Update an IP allowlist entry
 */
export async function updateIpAllowlistEntry(
  organizationId: string,
  entryId: string,
  updates: {
    description?: string;
    enabled?: boolean;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(ipAllowlist)
    .set(updates)
    .where(
      and(
        eq(ipAllowlist.organizationId, organizationId),
        eq(ipAllowlist.id, entryId)
      )
    );

  return true;
}

/**
 * Remove an IP allowlist entry
 */
export async function removeIpAllowlistEntry(
  organizationId: string,
  entryId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(ipAllowlist)
    .where(
      and(
        eq(ipAllowlist.organizationId, organizationId),
        eq(ipAllowlist.id, entryId)
      )
    );

  return true;
}

/**
 * Check if an IP address is allowed
 */
export async function isIpAllowed(
  organizationId: string,
  ipAddress: string,
  isOwner: boolean = false,
  isApiRequest: boolean = false
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const db = await getDb();
  if (!db) return { allowed: true };

  const settings = await getIpAllowlistSettings(organizationId);

  // If allowlisting is disabled, allow all
  if (!settings.enabled) {
    return { allowed: true };
  }

  // Check if enforcement applies to this request type
  if (isApiRequest && !settings.enforceForApi) {
    return { allowed: true };
  }
  if (!isApiRequest && !settings.enforceForWeb) {
    return { allowed: true };
  }

  // Check owner bypass
  if (isOwner && settings.ownersBypass) {
    return { allowed: true };
  }

  // Get allowlist entries
  const entries = await db
    .select()
    .from(ipAllowlist)
    .where(
      and(
        eq(ipAllowlist.organizationId, organizationId),
        eq(ipAllowlist.enabled, true)
      )
    );

  // If no entries, deny (allowlist is enabled but empty)
  if (entries.length === 0) {
    return { 
      allowed: false, 
      reason: "IP allowlist is enabled but empty. Add IP addresses to allow access." 
    };
  }

  // Check if IP matches any entry
  for (const entry of entries) {
    if (entry.isCidr) {
      if (isIpInCidr(ipAddress, entry.ipAddress)) {
        return { allowed: true };
      }
    } else {
      if (ipAddress === entry.ipAddress) {
        return { allowed: true };
      }
    }
  }

  return { 
    allowed: false, 
    reason: `IP address ${ipAddress} is not in the allowlist` 
  };
}

/**
 * Validate IP address or CIDR notation
 */
export function validateIpOrCidr(input: string): { isValid: boolean; isCidr: boolean } {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv4 CIDR regex
  const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:)*:([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
  // IPv6 CIDR regex
  const ipv6CidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/\d{1,3}$/;

  // Check CIDR first
  if (ipv4CidrRegex.test(input)) {
    const [ip, prefix] = input.split("/");
    const prefixNum = parseInt(prefix);
    if (prefixNum < 0 || prefixNum > 32) return { isValid: false, isCidr: false };
    if (!validateIpv4Octets(ip)) return { isValid: false, isCidr: false };
    return { isValid: true, isCidr: true };
  }

  if (ipv6CidrRegex.test(input)) {
    const [, prefix] = input.split("/");
    const prefixNum = parseInt(prefix);
    if (prefixNum < 0 || prefixNum > 128) return { isValid: false, isCidr: false };
    return { isValid: true, isCidr: true };
  }

  // Check plain IP
  if (ipv4Regex.test(input)) {
    if (!validateIpv4Octets(input)) return { isValid: false, isCidr: false };
    return { isValid: true, isCidr: false };
  }

  if (ipv6Regex.test(input)) {
    return { isValid: true, isCidr: false };
  }

  return { isValid: false, isCidr: false };
}

/**
 * Validate IPv4 octets are in valid range
 */
function validateIpv4Octets(ip: string): boolean {
  const octets = ip.split(".");
  return octets.every((octet) => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
}

/**
 * Check if an IP is within a CIDR range
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, prefixStr] = cidr.split("/");
    const prefix = parseInt(prefixStr);

    // Convert IPs to numbers for comparison
    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(range);

    if (ipNum === null || rangeNum === null) return false;

    // Calculate mask
    const mask = ~((1 << (32 - prefix)) - 1) >>> 0;

    // Check if IP is in range
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * Convert IPv4 address to number
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i]);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) + octet;
  }
  return num >>> 0; // Convert to unsigned
}

/**
 * Get current client IP from request headers
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  // Check common proxy headers
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(",")[0].trim();
  }

  const realIp = headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  const cfConnectingIp = headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  return "unknown";
}
