export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors mb-8 inline-block">← Back to LoopIn</a>
        <h1 className="text-4xl font-serif font-medium mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: June 29, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              LoopIn ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service"). Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="font-medium mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Name and email address (provided at account creation)</li>
              <li>Phone number (your real number, stored securely and never shared with contacts)</li>
              <li>Profile information you choose to provide</li>
            </ul>
            <h3 className="font-medium mb-2">Communications Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Text messages sent and received through your LoopIn private number</li>
              <li>Call logs (date, time, duration) for calls made through your private number</li>
              <li>Call recordings, if you choose to enable recording for a call</li>
              <li>AI-generated safety assessments and conversation summaries</li>
            </ul>
            <h3 className="font-medium mb-2">Technical Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Device type and operating system</li>
              <li>IP address and general location</li>
              <li>App usage data and crash reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provision and operate your private phone number via Twilio</li>
              <li>To route calls and text messages through your private number while keeping your real number hidden</li>
              <li>To generate AI-powered safety insights about your conversations</li>
              <li>To store your message and call history in your secure Safety Vault</li>
              <li>To send you service notifications and account alerts</li>
              <li>To improve and personalize the Service</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Communications & Call Recording</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              LoopIn provides a private VoIP phone number powered by Twilio. When you initiate or receive calls through this number, you may optionally enable call recording. <strong>Before any recorded call connects, both parties are notified via an automated message that the call may be recorded.</strong> You are responsible for complying with all applicable two-party consent laws in your jurisdiction.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Text messages sent through your private number are stored in your Safety Vault and processed by our AI to provide safety assessments. We do not sell or share the content of your messages with third parties except as described in Section 6.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account information for as long as your account is active. Call recordings and message history are retained for a maximum of 12 months unless you delete them earlier through the app. You may delete your account and all associated data at any time from the app settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Twilio Inc.</strong> — to provide VoIP calling and SMS services. Twilio's privacy policy is available at <a href="https://www.twilio.com/en-us/legal/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">twilio.com/en-us/legal/privacy</a>.</li>
              <li><strong>OpenAI</strong> — to generate AI safety assessments. Message content is processed in accordance with OpenAI's data usage policies.</li>
              <li><strong>Clerk</strong> — for authentication and identity management.</li>
              <li><strong>Law enforcement</strong> — when required by law or to protect the safety of users or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of AI processing of your communications</li>
              <li>Export your message and call history</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">To exercise any of these rights, contact us at <a href="mailto:privacy@loopin.app" className="text-primary hover:underline">privacy@loopin.app</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS) and at rest, access controls, and regular security reviews. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              LoopIn is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors. If we learn that we have collected information from a minor, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notification. Your continued use of the Service after changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:<br />
              <strong>LoopIn</strong><br />
              Email: <a href="mailto:privacy@loopin.app" className="text-primary hover:underline">privacy@loopin.app</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
