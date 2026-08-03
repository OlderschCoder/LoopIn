import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Private VoIP numbers provisioned per user (Twilio).
// One active private number per user (userId is the primary key).
export const phoneNumbersTable = pgTable(
  "phone_numbers",
  {
    userId: text("user_id").primaryKey(),
    phoneNumber: text("phone_number").notNull(), // E.164 Twilio number
    twilioSid: text("twilio_sid").notNull(), // IncomingPhoneNumber SID (PN...)
    areaCode: text("area_code"),
    ownerRealPhone: text("owner_real_phone"), // user's real phone for call forwarding
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // A Twilio number / SID may belong to exactly one user — enforce at the DB
    // level so concurrent setups can never assign the same number twice.
    uniqByNumber: uniqueIndex("phone_numbers_by_number").on(t.phoneNumber),
    uniqByTwilioSid: uniqueIndex("phone_numbers_by_twilio_sid").on(t.twilioSid),
  }),
);

// A conversation thread between the user's private number and a contact (match).
export const conversationsTable = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    contactNumber: text("contact_number").notNull(), // match's number (E.164)
    contactName: text("contact_name"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byUser: index("conversations_by_user").on(t.userId, t.lastMessageAt),
    uniqUserContact: uniqueIndex("conversations_user_contact").on(
      t.userId,
      t.contactNumber,
    ),
  }),
);

// Individual SMS/MMS messages, captured to the user's account (vault).
export const messagesTable = pgTable(
  "phone_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    direction: text("direction").notNull(), // "inbound" | "outbound"
    body: text("body").notNull().default(""),
    mediaUrls: jsonb("media_urls"), // string[] for MMS
    twilioSid: text("twilio_sid"),
    status: text("status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byConversation: index("phone_messages_by_conversation").on(
      t.conversationId,
      t.createdAt,
    ),
  }),
);

// Voice calls (in/out), with optional recording captured to the vault.
export const callsTable = pgTable(
  "phone_calls",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    contactNumber: text("contact_number").notNull(),
    contactName: text("contact_name"),
    direction: text("direction").notNull(), // "inbound" | "outbound"
    status: text("status"),
    durationSec: integer("duration_sec"),
    recordingSid: text("recording_sid"),
    recordingDurationSec: integer("recording_duration_sec"),
    twilioCallSid: text("twilio_call_sid"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byUser: index("phone_calls_by_user").on(t.userId, t.createdAt),
    byCallSid: index("phone_calls_by_call_sid").on(t.twilioCallSid),
  }),
);

export type PhoneNumber = typeof phoneNumbersTable.$inferSelect;
export type Conversation = typeof conversationsTable.$inferSelect;
export type PhoneMessage = typeof messagesTable.$inferSelect;
export type PhoneCall = typeof callsTable.$inferSelect;
