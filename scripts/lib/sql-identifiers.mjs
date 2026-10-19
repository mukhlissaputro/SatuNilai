import { createHash } from "node:crypto";

export const shortenIdentifier = (identifier) => identifier.length <= 64 ? identifier : `${identifier.slice(0, 50)}_${createHash("sha256").update(identifier).digest("hex").slice(0, 12)}`;
export const normalizeIdentifiers = (source) => source.replace(/`([A-Za-z_][A-Za-z0-9_]{64,})`/g, (_, identifier) => `\`${shortenIdentifier(identifier)}\``);
