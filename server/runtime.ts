import { database } from "./database";
import { evidenceStorage } from "./storage";

export const env = {
  DB: database, EVIDENCE: evidenceStorage,
  get RESEND_API_KEY() { return process.env.RESEND_API_KEY; },
  get MAIL_FROM() { return process.env.MAIL_FROM; },
};
declare global {
  type LocalDatabase = typeof database;
  type PreparedStatement = import("./database").LocalStatement;
  type EvidenceStorage = typeof evidenceStorage;
}
