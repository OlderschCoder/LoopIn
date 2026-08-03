import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
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

const here = path.dirname(fileURLToPath(import.meta.url));
const screensDir = path.resolve(here, "../../exports/screens");
const shot = (name: string) => path.join(screensDir, name);

const s = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 4,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    color: INK,
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 28, color: VIOLET, lineHeight: 1 },
  brandDot: { color: ROSE },
  pageTagline: { fontSize: 8, color: MUTE, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  tagline: { fontSize: 11, color: MUTE, marginTop: 9, maxWidth: 380, lineHeight: 1.35 },
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
  rule: { height: 3, backgroundColor: VIOLET, marginTop: 10, borderRadius: 2 },
  ruleAccent: { width: 64, height: 3, backgroundColor: ROSE, marginTop: -3, borderRadius: 2 },

  heroRow: { flexDirection: "row", marginTop: 8, alignItems: "center" },
  heroCopy: { flex: 1, paddingRight: 18 },
  heroHeadline: {
    fontFamily: "Helvetica-Bold",
    fontSize: 19,
    color: INK,
    lineHeight: 1.24,
  },
  heroHeadlineAccent: { color: VIOLET },
  heroSub: { fontSize: 10, color: MUTE, marginTop: 7, maxWidth: 330, lineHeight: 1.4 },
  heroStatsRow: { flexDirection: "row", marginTop: 8 },
  heroStat: { marginRight: 22 },
  heroStatNum: { fontFamily: "Helvetica-Bold", fontSize: 15, color: VIOLET_DK },
  heroStatLabel: { fontSize: 7.5, color: MUTE, marginTop: 1, maxWidth: 90 },

  phoneRow: { flexDirection: "row" },
  phoneFrame: {
    width: 100,
    height: 186,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: VIOLET_DK,
    overflow: "hidden",
    marginLeft: 9,
    backgroundColor: "#0B0714",
  },
  phoneImg: { width: 100, height: 186 },

  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: VIOLET,
    letterSpacing: 1.4,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  sectionSub: { fontSize: 9.5, color: MUTE, marginBottom: 14, maxWidth: 460 },
  sectionGap: { marginTop: 22 },

  featuresGrid: { flexDirection: "row", flexWrap: "wrap" },
  featureCard: {
    width: "33.33%",
    paddingRight: 16,
    marginBottom: 20,
  },
  featureShotWrap: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: LINE,
    marginBottom: 8,
  },
  featureShot: { width: "100%", height: 110 },
  featureName: { fontFamily: "Helvetica-Bold", fontSize: 11.5, color: VIOLET_DK },
  featureDesc: { color: MUTE, fontSize: 9, marginTop: 4, lineHeight: 1.42 },

  stepsRow: { flexDirection: "row", marginTop: 4 },
  step: { flex: 1, paddingRight: 16 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: VIOLET,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    textAlign: "center",
    paddingTop: 4.5,
    marginBottom: 6,
  },
  stepTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: INK },
  stepDesc: { color: MUTE, fontSize: 8.8, marginTop: 3, lineHeight: 1.42 },

  divider: { height: 1, backgroundColor: LINE, marginTop: 18, marginBottom: 4 },

  footer: {
    marginTop: 3,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footName: { fontFamily: "Helvetica-Bold", fontSize: 9, color: INK },
  footMeta: { color: MUTE, fontSize: 8, marginTop: 0.5 },
  footTag: { color: VIOLET, fontFamily: "Helvetica-Bold", fontSize: 8 },
  pageNum: { color: MUTE, fontSize: 8 },

  // deep-dive feature styles
  bigFeatureRow: { flexDirection: "row", marginTop: 15, alignItems: "flex-start" },
  bigFeatureShotWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: VIOLET_DK,
    width: 92,
    height: 162,
    marginRight: 18,
    backgroundColor: "#0B0714",
  },
  bigFeatureImg: { width: 92, height: 162 },
  bigFeatureCopy: { flex: 1, paddingTop: 3 },
  bigFeatureName: { fontFamily: "Helvetica-Bold", fontSize: 13, color: VIOLET_DK },
  bigFeatureDesc: { color: INK, fontSize: 9.4, marginTop: 6, lineHeight: 1.45, maxWidth: 400 },
  bigFeatureTagRow: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  bigFeatureTag: {
    backgroundColor: BG_SOFT,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    color: VIOLET_DK,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    marginRight: 7,
    marginBottom: 6,
  },

  compactGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  compactFeature: { width: "50%", paddingRight: 20, marginBottom: 16 },
  compactFeatureName: { fontFamily: "Helvetica-Bold", fontSize: 11, color: VIOLET_DK },
  compactFeatureDesc: { color: MUTE, fontSize: 9, marginTop: 3, lineHeight: 1.42 },

  twoCol: { flexDirection: "row", marginTop: 4 },
  col: { flex: 1 },
  gap: { width: 20 },
  band: {
    marginTop: 16,
    backgroundColor: BG_SOFT,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },
  bandTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: VIOLET_DK, marginBottom: 3 },
  bandBody: { color: INK, fontSize: 9, lineHeight: 1.4 },

  ctaBand: {
    marginTop: 16,
    backgroundColor: VIOLET,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#E9D9FF", letterSpacing: 1.4, textTransform: "uppercase" },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 4 },
  ctaSub: { color: "#E9D9FF", fontSize: 9, marginTop: 5, maxWidth: 340, lineHeight: 1.4 },
  ctaBadge: {
    backgroundColor: ROSE,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    borderRadius: 7,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
});

type Feat = { name: string; desc: string; shot?: string; tags?: string[] };

const CORE_FEATURES: Feat[] = [
  {
    name: "Emergency Loop",
    shot: shot("sos.jpg"),
    desc: "One tap starts a 911 call, alerts your trusted crew, fires a believable fake call, or opens an AI coach — all from a single emergency screen built for the moment you can't think straight.",
  },
  {
    name: "AI BFF",
    shot: shot("ai.jpg"),
    desc: "Paste a chat, a bio, or describe what happened — LoopIn's AI gives you a structured, non-judgmental read: what's a green flag, what's a yellow flag, and what's worth walking away from.",
  },
  {
    name: "Scheduled Check-Ins",
    shot: shot("checkin.jpg"),
    desc: "Set a check-in interval for any plan — every 15 to 90 minutes. Miss one, and an escalation alert fires automatically to your crew.",
  },
];

const SECOND_ROW_FEATURES: Feat[] = [
  {
    name: "Safety Vault",
    shot: shot("locker.jpg"),
    desc: "A private, on-device locker for notes, phone numbers, screenshots, and concerns about anyone in your life — nothing leaves your phone unless you choose to share it.",
  },
  {
    name: "Fake Call",
    shot: shot("fake-call.jpg"),
    desc: "A fully believable incoming call from a saved contact, ready in one tap — the easiest, most natural excuse to leave a situation that isn't going well.",
  },
  {
    name: "Date Plans",
    shot: shot("plan.jpg"),
    desc: "A guided planner for any plan: who, where, and when — with a built-in safety score and check-in schedule set up in advance.",
  },
];

const DEEP_FEATURES: Feat[] = [
  {
    name: "Walk With Me — For The Moments Between Safe Places",
    shot: shot("walk-home.jpg"),
    desc: "Start Walk With Me when you're heading to your car, leaving work late, waiting for transit, crossing campus, coming home from the library, or getting from a rideshare to your door. Your crew isn't tracking you all night — they're only looped in if you miss a check-in, tap for help, or something changes.",
    tags: ["To your car", "Late shift", "Transit", "Campus walk", "Rideshare drop-off"],
  },
  {
    name: "AI BFF — Your Structured, Judgment-Free Read",
    shot: shot("ai.jpg"),
    desc: "LoopIn's AI isn't a chatbot bolted on as an afterthought — it's the core of the app. Paste in a profile, a screenshot of a chat, or just describe what's going on, and get a structured, non-judgmental read in seconds: green flags, yellow flags, and red flags called out plainly. Switch to Chat mode for real-time, back-and-forth coaching on boundaries, what to say next, or how to gracefully exit — like texting a smart friend who's always awake.",
    tags: ["Analyze mode", "Live chat coaching", "Available 24/7"],
  },
  {
    name: "Emergency Loop — One Tap, Every Option",
    shot: shot("sos.jpg"),
    desc: "The Emergency screen is built for the seconds that matter most. Start a 911 call, alert your entire trusted crew with your location, trigger a Fake Call to excuse yourself, open the Breathe exercise to calm down, or pull up ready-made exit phrases you can read straight off the screen — all without digging through menus while your hands are shaking.",
    tags: ["Start 911 call", "Alert my crew", "Breathing exercise", "Exit phrases"],
  },
];

const MORE_FEATURES: Feat[] = [
  { name: "Private Line", desc: "A masked phone number for texts and calls — your real number never gets shared until you decide it should." },
  { name: "Trusted Crew", desc: "Choose the people who can be looped in if you need backup. They don't see your night by default, but if a safety trigger fires, they get the details that matter." },
  { name: "Evidence Timeline", desc: "A private, time-stamped record of concerning messages, numbers, or incidents — organized and ready if something ever needs to be reported." },
  { name: "Post-Plan Reflection", desc: "A quiet space to record how a night actually felt. Over time, LoopIn surfaces patterns you might not notice on your own." },
  { name: "Breathe & Ground", desc: "A guided breathing exercise built directly into the emergency flow, for the moments panic makes it hard to think." },
  { name: "Scheduled Check-Ins", desc: "Set a check-in interval for any plan — miss one and an escalation alert reaches your crew automatically." },
];

function FeatureShotCard({ f }: { f: Feat }) {
  return (
    <View style={s.featureCard}>
      {f.shot ? (
        <View style={s.featureShotWrap}>
          <Image src={f.shot} style={s.featureShot} />
        </View>
      ) : null}
      <Text style={s.featureName}>{f.name}</Text>
      <Text style={s.featureDesc}>{f.desc}</Text>
    </View>
  );
}

function BigFeature({ f }: { f: Feat }) {
  return (
    <View style={s.bigFeatureRow}>
      <View style={s.bigFeatureShotWrap}>
        <Image src={f.shot!} style={s.bigFeatureImg} />
      </View>
      <View style={s.bigFeatureCopy}>
        <Text style={s.bigFeatureName}>{f.name}</Text>
        <Text style={s.bigFeatureDesc}>{f.desc}</Text>
        {f.tags ? (
          <View style={s.bigFeatureTagRow}>
            {f.tags.map((t) => (
              <Text style={s.bigFeatureTag} key={t}>{t}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Footer({ n, total }: { n: number; total: number }) {
  return (
    <View style={s.footer}>
      <View>
        <Text style={s.footName}>LoopIn</Text>
        <Text style={s.footMeta}>hello@loopin.app · loopin.app</Text>
      </View>
      <Text style={s.pageNum}>{n} / {total}</Text>
    </View>
  );
}

const TOTAL_PAGES = 4;

const Doc = (
  <Document title="LoopIn — Marketing One-Pager" author="LoopIn">
    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Loop<Text style={s.brandDot}>In</Text>
          </Text>
          <Text style={s.tagline}>
            Backup when you need it. The app no one should have to use — but
            if you do, you have backup.
          </Text>
        </View>
        <Text style={s.badge}>MEET LOOPIN</Text>
      </View>
      <View style={s.rule} />
      <View style={s.ruleAccent} />

      <View style={s.heroRow}>
        <View style={s.heroCopy}>
          <Text style={s.heroHeadline}>
            The app no one should have to use.{"\n"}
            <Text style={s.heroHeadlineAccent}>But if you do, you have backup.</Text>
          </Text>
          <Text style={s.heroSub}>
            LoopIn is a private safety layer for dating, nights out, rides,
            meetups, late shifts, campus walks, and the moments between safe
            places. Your plan, check-ins, location status, private-line
            activity, and notes stay locked in your vault as the night
            unfolds — nothing is shared by default. But if you tap for
            help, miss a check-in, or use your code phrase, LoopIn gives
            your crew exactly what they need to act: where you are, who
            you're with, what changed, and how to reach you.
          </Text>
          <View style={s.heroStatsRow}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>8+</Text>
              <Text style={s.heroStatLabel}>Safety tools built into one app</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>1 Tap</Text>
              <Text style={s.heroStatLabel}>From "something's wrong" to help on the way</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>0</Text>
              <Text style={s.heroStatLabel}>Data shared unless you choose to share it</Text>
            </View>
          </View>
        </View>
        <View style={s.phoneRow}>
          <View style={s.phoneFrame}>
            <Image src={shot("sos.jpg")} style={s.phoneImg} />
          </View>
          <View style={s.phoneFrame}>
            <Image src={shot("checkin.jpg")} style={s.phoneImg} />
          </View>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.band}>
        <Text style={s.sectionLabel}>Why LoopIn</Text>
        <Text style={{ color: INK, fontSize: 9.5, lineHeight: 1.5 }}>
          Millions of nights out involve some risk, but safety is still a
          patchwork of screenshots, gut instinct, and hoping someone answers
          their phone. LoopIn brings a private, intelligent safety layer to
          real life — dating is the first wedge, not the whole product.
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        <Text style={s.sectionLabel}>How LoopIn Fits Into Your Night</Text>
        <View style={s.stepsRow}>
          <View style={s.step}>
            <Text style={s.stepNum}>1</Text>
            <Text style={s.stepTitle}>Before</Text>
            <Text style={s.stepDesc}>
              Run a profile or chat through AI BFF, build a Date Plan, and
              choose your Trusted Crew so the right people are ready if you
              need them.
            </Text>
          </View>
          <View style={s.step}>
            <Text style={s.stepNum}>2</Text>
            <Text style={s.stepTitle}>During</Text>
            <Text style={s.stepDesc}>
              Scheduled Check-Ins and Walk With Me run quietly in the
              background. If something feels off, Emergency Loop and Fake
              Call are always one tap away.
            </Text>
          </View>
          <View style={s.step}>
            <Text style={s.stepNum}>3</Text>
            <Text style={s.stepTitle}>After</Text>
            <Text style={s.stepDesc}>
              Log a Post-Plan Reflection, save anything important to your
              Safety Vault or Evidence Timeline, and let patterns surface
              over time.
            </Text>
          </View>
        </View>
      </View>

      <Footer n={1} total={TOTAL_PAGES} />
    </Page>

    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Loop<Text style={s.brandDot}>In</Text>
          </Text>
          <Text style={s.pageTagline}>The Core Toolkit</Text>
        </View>
        <Text style={s.badge}>MEET LOOPIN</Text>
      </View>
      <View style={s.rule} />
      <View style={s.ruleAccent} />

      <View style={s.sectionGap}>
        <Text style={s.sectionLabel}>Built For The Moments That Matter</Text>
        <Text style={s.sectionSub}>
          Six tools, one app — designed around the real timeline of a night, from planning it to getting home safe.
        </Text>
        <View style={s.featuresGrid}>
          {CORE_FEATURES.map((f) => (
            <FeatureShotCard f={f} key={f.name} />
          ))}
          {SECOND_ROW_FEATURES.map((f) => (
            <FeatureShotCard f={f} key={f.name} />
          ))}
        </View>
      </View>

      <Footer n={2} total={TOTAL_PAGES} />
    </Page>

    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Loop<Text style={s.brandDot}>In</Text>
          </Text>
          <Text style={s.pageTagline}>Feature Deep-Dive</Text>
        </View>
        <Text style={s.badge}>MEET LOOPIN</Text>
      </View>
      <View style={s.rule} />
      <View style={s.ruleAccent} />

      <View style={s.sectionGap}>
        <Text style={s.sectionLabel}>The Features That Make LoopIn Bigger Than Dating</Text>
        {DEEP_FEATURES.map((f) => (
          <BigFeature f={f} key={f.name} />
        ))}
      </View>

      <Footer n={3} total={TOTAL_PAGES} />
    </Page>

    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Loop<Text style={s.brandDot}>In</Text>
          </Text>
          <Text style={s.pageTagline}>Everything Else, Privacy &amp; Getting Started</Text>
        </View>
        <Text style={s.badge}>MEET LOOPIN</Text>
      </View>
      <View style={s.rule} />
      <View style={s.ruleAccent} />

      <View style={s.sectionGap}>
        <Text style={s.sectionLabel}>And Everything Else In Your Corner</Text>
        <View style={s.compactGrid}>
          {MORE_FEATURES.map((f) => (
            <View style={s.compactFeature} key={f.name}>
              <Text style={s.compactFeatureName}>{f.name}</Text>
              <Text style={s.compactFeatureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.band}>
        <Text style={s.sectionLabel}>Privacy By Design</Text>
        <Text style={{ color: INK, fontSize: 10, lineHeight: 1.5 }}>
          LoopIn is not live-tracking for your friends. Your plans, location
          status, notes, private-line activity, and evidence stay locked in
          your vault by default. Your crew only gets details if you ask for
          help, miss a check-in, or trigger a safety phrase. Not everyone
          needs to know where you are all the time. But when something is
          wrong, the right people should know exactly where to go.
        </Text>
      </View>

      <View style={s.ctaBand}>
        <View>
          <Text style={s.ctaLabel}>Get LoopIn</Text>
          <Text style={s.ctaText}>Backup when you need it, wherever the night takes you.</Text>
          <Text style={s.ctaSub}>
            Free to start — every core safety tool is included. LoopIn+
            unlocks unlimited AI reads, live coaching, and reflection
            insights. hello@loopin.app
          </Text>
        </View>
        <Text style={s.ctaBadge}>loopin.app</Text>
      </View>

      <Footer n={4} total={TOTAL_PAGES} />
    </Page>
  </Document>
);

const outDir = path.resolve(here, "../../exports");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "LoopIn-One-Pager.pdf");

await renderToFile(Doc, out);
console.log("WROTE", out);
