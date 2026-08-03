import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToFile,
} from "@react-pdf/renderer";

const VIOLET = "#7C3AED";
const VIOLET_DK = "#5B21B6";
const ROSE = "#E11D6B";
const INK = "#211C30";
const MUTE = "#6B6480";
const BG_SOFT = "#FBF8FF";
const LINE = "#E7DEF7";

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 26,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    color: INK,
    fontSize: 9.5,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 26, color: VIOLET },
  brandDot: { color: ROSE },
  tagline: { fontSize: 10.5, color: MUTE, marginTop: 3, maxWidth: 330 },
  badge: {
    backgroundColor: BG_SOFT,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    color: VIOLET_DK,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  rule: { height: 3, backgroundColor: VIOLET, marginTop: 12, borderRadius: 2 },
  ruleAccent: { width: 64, height: 3, backgroundColor: ROSE, marginTop: -3, borderRadius: 2 },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: VIOLET,
    letterSpacing: 1.4,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  body: { color: INK, fontSize: 9.5 },
  twoCol: { flexDirection: "row", marginTop: 12 },
  col: { flex: 1 },
  gap: { width: 18 },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  feature: { width: "50%", paddingRight: 14, marginBottom: 9 },
  featureName: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: VIOLET_DK },
  featureDesc: { color: MUTE, fontSize: 8.8, marginTop: 1.5 },
  band: {
    marginTop: 12,
    backgroundColor: BG_SOFT,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
  },
  askBand: {
    marginTop: 12,
    backgroundColor: VIOLET,
    borderRadius: 8,
    padding: 13,
  },
  askLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#E9D9FF", letterSpacing: 1.4, textTransform: "uppercase" },
  askText: { color: "#FFFFFF", fontSize: 12.5, fontFamily: "Helvetica-Bold", marginTop: 4 },
  askSub: { color: "#E9D9FF", fontSize: 8.8, marginTop: 3 },
  editable: { color: ROSE, fontFamily: "Helvetica-Oblique" },
  footer: {
    marginTop: 14,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footName: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: INK },
  footMeta: { color: MUTE, fontSize: 8.5, marginTop: 1 },
  footTag: { color: VIOLET, fontFamily: "Helvetica-Bold", fontSize: 8 },
  sectionGap: { marginTop: 13 },
});

type Feat = { name: string; desc: string };
const FEATURES: Feat[] = [
  { name: "AI Red-Flag Analysis", desc: "Paste a chat or profile, get structured green / yellow / red-flag insight in seconds." },
  { name: "Smart Date Plans", desc: "A guided wizard to plan each date with a built-in safety score." },
  { name: "Trusted Circle", desc: "Loop in chosen contacts who are notified before a date." },
  { name: "AI Wingwoman", desc: "A conversational coach for boundaries, message help, and in-the-moment guidance." },
  { name: "Post-Date Reflection", desc: "Emotional check-ins that surface patterns over time." },
  { name: "Evidence Locker", desc: "A private, device-only vault for notes, numbers, and concerns." },
];

function Editable({ children }: { children: React.ReactNode }) {
  return <Text style={s.editable}>{children}</Text>;
}

const Doc = (
  <Document title="SafeDate AI — Investor One-Pager" author="SafeDate AI">
    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            SafeDate<Text style={s.brandDot}> AI</Text>
          </Text>
          <Text style={s.tagline}>
            Your private AI companion for dating smarter, safer, and with self-trust.
          </Text>
        </View>
        <Text style={s.badge}>INVESTOR ONE-PAGER</Text>
      </View>
      <View style={s.rule} />
      <View style={s.ruleAccent} />

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.sectionLabel}>The Problem</Text>
          <Text style={s.body}>
            Millions date online every week, but personal safety is still a patchwork
            of screenshots, group-chat advice, and gut instinct. People are left alone
            to vet a match, decide if a date is safe, and make sense of what happened
            afterward — with no private, intelligent layer looking out for them.
          </Text>
        </View>
        <View style={s.gap} />
        <View style={s.col}>
          <Text style={s.sectionLabel}>The Solution</Text>
          <Text style={s.body}>
            SafeDate AI sits beside whatever dating app you already use — a private,
            AI-powered safety, coaching, and accountability companion. Everything is
            stored on the device by default. Privacy isn't a feature; it's the
            architecture.
          </Text>
        </View>
      </View>

      <View style={s.sectionGap}>
        <Text style={s.sectionLabel}>What It Does</Text>
        <View style={s.featuresGrid}>
          {FEATURES.map((f) => (
            <View style={s.feature} key={f.name}>
              <Text style={s.featureName}>{f.name}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.sectionLabel}>Why Now</Text>
          <Text style={s.body}>
            Online dating is now the dominant way people meet, and personal safety and
            emotional wellbeing are top unmet needs — especially for women. AI finally
            makes real-time, personalized coaching affordable at consumer scale.
          </Text>
        </View>
        <View style={s.gap} />
        <View style={s.col}>
          <Text style={s.sectionLabel}>Business Model</Text>
          <Text style={s.body}>
            Freemium subscription. Core safety tools are free; SafeDate+ (
            <Editable>$/mo — your price</Editable>) unlocks unlimited AI analysis,
            coaching, and reflection insights. On-device design means no data to
            breach and low server cost per user.
          </Text>
        </View>
      </View>

      <View style={s.band}>
        <Text style={s.sectionLabel}>Traction</Text>
        <Text style={s.body}>
          <Editable>
            Add your traction here — e.g., beta users, waitlist size, retention, early
            testimonials, or partnerships.
          </Editable>
        </Text>
      </View>

      <View style={s.askBand}>
        <Text style={s.askLabel}>The Ask</Text>
        <Text style={s.askText}>
          Raising <Text style={{ color: "#FDE68A" }}>[amount + stage]</Text> to grow the
          team, scale user acquisition, and expand AI capabilities.
        </Text>
        <Text style={s.askSub}>
          Tell me the amount and stage and I'll lock it in (replace the highlighted text).
        </Text>
      </View>

      <View style={s.footer}>
        <View>
          <Text style={s.footName}>
            <Editable>[Founder Name], Founder &amp; CEO]</Editable>
          </Text>
          <Text style={s.footMeta}>
            <Editable>you@email.com · (000) 000-0000</Editable>
          </Text>
        </View>
        <Text style={s.footTag}>Built with privacy by design.</Text>
      </View>
    </Page>
  </Document>
);

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../exports");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "SafeDate-AI-One-Pager.pdf");

await renderToFile(Doc, out);
console.log("WROTE", out);
