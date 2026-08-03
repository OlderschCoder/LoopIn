export interface SafetyArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  publishedDate: string;
  content: React.ReactNode;
}

import React from "react";

export const safetyArticles: SafetyArticle[] = [
  {
    slug: "first-date-safety-tips",
    title: "5 Safety Habits Every First Date Should Include",
    description:
      "Meeting someone new is exciting — but a few simple habits can make sure it stays that way. Here's what to do before, during, and after a first meetup.",
    category: "Dating",
    readTime: "4 min read",
    publishedDate: "July 28, 2026",
    content: (
      <>
        <p>
          First dates are one of life's genuine bright spots. But whether you met on an app or through a mutual friend, taking a few minutes to set up basic safety measures is just smart — the same way you'd buckle a seatbelt before a drive across town.
        </p>

        <h2>1. Share your plans with someone you trust</h2>
        <p>
          Before you leave, text a friend or family member: where you're going, who you're meeting, and when you expect to be back. This is the single highest-value step you can take — and it costs you about 30 seconds.
        </p>
        <p>
          Apps like LoopIn let you loop in a trusted contact automatically. They get a quiet heads-up that you're on a date, and a check-in at the end. You don't have to remember to text anyone, and your contact can see your status without you lifting a finger mid-date.
        </p>

        <h2>2. Use a private number for early conversations</h2>
        <p>
          Your personal phone number connects to your name, location data, and social profiles in ways most people don't realize. Using a private proxy number for texting and calling keeps your real number out of a stranger's hands until you're ready to share it.
        </p>
        <p>
          If things go sideways, you can stop the number immediately — no SIM swap, no carrier call, no hassle.
        </p>

        <h2>3. Meet in a public place first</h2>
        <p>
          This sounds obvious, but it's worth naming: for a first meeting, choose somewhere genuinely public with other people around — a café, a restaurant, a park on a sunny afternoon. Avoid private homes, cars, or isolated spots until you've had multiple meetings and built real trust.
        </p>

        <h2>4. Have your own transportation</h2>
        <p>
          Arrive and leave independently. This keeps you in control of when the date ends and eliminates the awkward (or unsafe) pressure of needing a ride home from someone you just met.
        </p>

        <h2>5. Trust your gut — and have an exit plan</h2>
        <p>
          If something feels off, it's okay to leave. You don't owe anyone an explanation. A quick text to your trusted contact ("I'm heading out, can you call me in 2 minutes?") gives you a natural exit.
        </p>
        <p>
          Having a real-time safety layer running in the background — where a contact gets alerted if you don't check in — means you can enjoy the date without that low-level background anxiety. That peace of mind is actually the point.
        </p>

        <h2>The bottom line</h2>
        <p>
          None of these steps take long, and most of them become automatic after a few times. Building these habits means you can show up present, relaxed, and actually enjoy meeting someone new — which is the whole point.
        </p>
      </>
    ),
  },
  {
    slug: "night-out-group-safety",
    title: "Staying Safe on a Night Out: A Guide for Groups",
    description:
      "Going out with friends is supposed to be fun. These practical habits help make sure everyone gets home safe without killing the vibe.",
    category: "Nights Out",
    readTime: "5 min read",
    publishedDate: "July 21, 2026",
    content: (
      <>
        <p>
          A night out with friends is one of the best ways to unwind — but big crowds, unfamiliar venues, and unpredictable situations mean it's worth having a plan. The good news: a little coordination goes a long way.
        </p>

        <h2>Designate a check-in person</h2>
        <p>
          Before you head out, pick one person in your group (or outside it) who'll be the point of contact. This person knows your rough plan for the night and gets a message when everyone is safely home.
        </p>
        <p>
          With LoopIn, you can assign a trusted contact who gets automatic status updates — so your check-in person doesn't have to stay awake waiting for texts.
        </p>

        <h2>Establish a "buddy system" rule</h2>
        <p>
          No one leaves the venue alone. If someone wants to leave early, they either find another group member to walk with or they call a rideshare while the group watches from the door. It takes 90 seconds and it matters.
        </p>

        <h2>Keep your phone charged</h2>
        <p>
          A dead phone is one of the biggest safety liabilities on a night out. Carry a small power bank, or at minimum make a plan with your group for what to do if someone's phone dies — a specific meeting spot, a time to regroup.
        </p>

        <h2>Watch out for each other's drinks</h2>
        <p>
          Drink spiking is real. Never leave a drink unattended, and if a friend's drink was left alone, treat it as compromised. This rule applies to everyone in the group, every time.
        </p>

        <h2>Use rideshare safely</h2>
        <p>
          Always verify the car make, model, and license plate before getting in — and do it out loud so the driver hears you. Share your ride status with a trusted contact. Sit in the back seat. If something feels wrong, end the ride.
        </p>

        <h2>Have a shared emergency plan</h2>
        <p>
          Talk through the "if X happens" scenarios before you go out, not during. If someone gets separated: what's the meeting spot? If someone feels unsafe: what's the signal? Five minutes of planning before you leave covers most scenarios.
        </p>

        <h2>The group has each other's backs</h2>
        <p>
          The most important safety tool you have on a night out is your group. Stay loose, stay aware, and look out for each other. The goal is that everyone has a great time and everyone gets home.
        </p>
      </>
    ),
  },
  {
    slug: "campus-safety-guide",
    title: "Campus Safety: Practical Tips for Students",
    description:
      "College campuses are generally safe — but they're also full of new people and new situations. Here's how to stay sharp and connected.",
    category: "Campus",
    readTime: "5 min read",
    publishedDate: "July 14, 2026",
    content: (
      <>
        <p>
          Starting college means a lot of firsts: new freedom, new people, new environments. It's one of the most exciting transitions you'll make — and it's also a time when building good safety habits will serve you for decades.
        </p>

        <h2>Know your campus resources</h2>
        <p>
          Find out where your campus safety office is, save the campus emergency number in your phone, and learn whether your school has a safety escort program (most do). These resources exist specifically for students — use them.
        </p>

        <h2>Be intentional about walking alone at night</h2>
        <p>
          Walking alone on campus at night is often fine — but it's worth being intentional about it. Stay on well-lit paths, stay off your phone when you're in a low-traffic area, and let someone know if you're walking somewhere alone late at night.
        </p>
        <p>
          LoopIn's check-in feature is built exactly for this: you start a check-in when you leave the library at midnight, and your trusted contact gets a quiet alert if you don't arrive safely.
        </p>

        <h2>Be thoughtful at parties and social events</h2>
        <p>
          Go with people you know, look out for your friends, and trust your instincts. If a situation feels off, leave. You don't owe anyone your presence, and your comfort matters.
        </p>
        <p>
          Having a specific "let's go" signal with your friend group — a word, a look, a text — makes it easy to leave together without a big scene.
        </p>

        <h2>Protect your number when meeting new people</h2>
        <p>
          You'll meet a lot of new people in college — classmates, people at events, strangers at parties. It's fine to be friendly and social. But you don't have to give your real number to everyone who asks. A private number gives you full flexibility: they can reach you, but you can control the connection.
        </p>

        <h2>Build a trusted circle early</h2>
        <p>
          Identify two or three people — a roommate, a friend from home, a family member — who you'd call if something went wrong. Tell them they're on your list. This isn't morbid; it's the kind of thing that makes you feel more confident, not less.
        </p>

        <h2>Take care of your mental safety too</h2>
        <p>
          Physical safety is part of the picture, but campus life can also bring social pressure, loneliness, and situations that feel hard to navigate. Most campuses have counseling services — use them early, not just in crisis.
        </p>
      </>
    ),
  },
  {
    slug: "rideshare-safety-tips",
    title: "Rideshare Safety: What to Do Every Time You Get In a Car",
    description:
      "Most rideshare trips are completely uneventful. These habits take 30 seconds and cover the rare times they're not.",
    category: "Transportation",
    readTime: "4 min read",
    publishedDate: "July 7, 2026",
    content: (
      <>
        <p>
          Rideshare apps have made getting around dramatically easier — and for most people, the vast majority of rides are completely fine. But a handful of quick habits can make every trip safer, and they take almost no effort to build.
        </p>

        <h2>Always verify before you get in</h2>
        <p>
          When your driver arrives, check three things before opening the door: the car make and model, the license plate, and the driver's photo. The app shows you all three. If anything doesn't match, don't get in and report it through the app.
        </p>
        <p>
          Say the driver's name out loud when you approach. A legitimate driver will confirm. This also signals that you're paying attention, which matters.
        </p>

        <h2>Share your ride in real time</h2>
        <p>
          Both Uber and Lyft have built-in ride sharing features — use them. Or open LoopIn and send your trusted contact a check-in that tracks your location until you arrive. Either way, someone who cares about you knows where you are.
        </p>

        <h2>Sit in the back seat</h2>
        <p>
          The back seat gives you more physical space and more options. You can exit from either side. It's a small thing that makes a meaningful difference in how in-control you feel during the ride.
        </p>

        <h2>Keep your phone accessible</h2>
        <p>
          Don't put your phone in a bag where you can't reach it quickly. Keep it in your hand or a pocket. You should be able to call someone or end the ride immediately if you need to.
        </p>

        <h2>Trust your instincts</h2>
        <p>
          If a driver takes a route you didn't expect, or the conversation feels uncomfortable, you're allowed to speak up. "Can you take [street name] instead?" is a completely reasonable request. If something feels genuinely wrong, you can ask to be dropped off immediately at a public place.
        </p>

        <h2>Rate and report honestly</h2>
        <p>
          Ratings aren't just about driver income — they're the safety signal for future riders. If something made you uncomfortable, report it through the app. Even a one-star rating with no comment flags the account for review.
        </p>
      </>
    ),
  },
  {
    slug: "solo-travel-safety",
    title: "Solo Travel Safety: How to Stay Connected When You're Far From Home",
    description:
      "Solo travel is one of the most freeing experiences you can have. A few smart habits keep it that way, wherever you go.",
    category: "Travel",
    readTime: "5 min read",
    publishedDate: "June 30, 2026",
    content: (
      <>
        <p>
          Traveling alone is an incredible experience — the freedom, the self-reliance, the moments you only have because you were by yourself. Most solo travelers go their whole trip without a single safety issue. But being far from home in an unfamiliar place means your usual safety network isn't nearby, so building a lightweight one before you go is worth it.
        </p>

        <h2>Set up a check-in system before you leave</h2>
        <p>
          Designate someone at home — a parent, partner, close friend — as your safety contact. Agree on a check-in rhythm: once a day, once you arrive somewhere new, whatever makes sense for the trip. The key is that they know to take action if they don't hear from you on schedule.
        </p>
        <p>
          LoopIn makes this low-friction: your contact gets passive updates rather than waiting for you to remember to text. You can check in with one tap and keep going with your day.
        </p>

        <h2>Share your itinerary</h2>
        <p>
          Send your travel contact your flight info, accommodation names and addresses, and a rough daily plan. You don't need to track every move — just enough that someone knows where to start looking if they can't reach you.
        </p>

        <h2>Use a private number when meeting locals or fellow travelers</h2>
        <p>
          You'll meet interesting people on the road — tour guides, hostel roommates, people at a bar. That's most of the fun. But sharing your real number with people you just met in a foreign country gives them more access than you might realize. A private number keeps the connection alive while keeping your real information yours.
        </p>

        <h2>Know the local emergency number</h2>
        <p>
          112 works across most of Europe. But emergency numbers vary by country. Look it up before you arrive — it takes 30 seconds and it's the kind of thing you can't Google if you actually need it.
        </p>

        <h2>Keep a backup of your documents</h2>
        <p>
          Email yourself photos of your passport, visa, travel insurance, and any key bookings. If your phone is lost or stolen, you can access these from any device. A print copy kept separate from your original documents is also worth having.
        </p>

        <h2>Register with your embassy</h2>
        <p>
          Many countries offer free traveler registration programs (the US has STEP, the UK has LOCATE). These let your government know you're in the country so they can contact you in an emergency — natural disaster, civil unrest, or otherwise.
        </p>

        <h2>Go. The risk calculus favors the trip.</h2>
        <p>
          Solo travel carries risk, just like everything worth doing. But statistically, well-prepared solo travelers have safe, transformative experiences the overwhelming majority of the time. These habits add maybe an hour of preparation to a trip that could last weeks. That's a good trade.
        </p>
      </>
    ),
  },
];

export function getArticleBySlug(slug: string): SafetyArticle | undefined {
  return safetyArticles.find((a) => a.slug === slug);
}
