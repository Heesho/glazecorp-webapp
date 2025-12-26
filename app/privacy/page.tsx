export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
      <p className="text-zinc-400 text-sm mb-8">Last updated: December 2024</p>

      <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
          <p>
            GlazeCorp (&quot;we,&quot; &quot;our,&quot; or &quot;the Protocol&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we handle information when you use our decentralized
            protocol and website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
          <p className="mb-3">
            As a decentralized protocol, we collect minimal information:
          </p>
          <ul className="list-disc list-inside space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-300">Blockchain Data:</strong> All transactions on the Protocol
              are recorded on the Base blockchain and are publicly visible. This includes your wallet
              address and transaction history.
            </li>
            <li>
              <strong className="text-zinc-300">Usage Data:</strong> We may collect anonymous analytics
              data such as page views, feature usage, and general interaction patterns to improve
              the Protocol.
            </li>
            <li>
              <strong className="text-zinc-300">Wallet Connection:</strong> When you connect your wallet,
              we access your public wallet address to enable Protocol functionality.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">3. Information We Do Not Collect</h2>
          <p className="mb-3">We do not collect:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Personal identification information (name, email, phone number)</li>
            <li>Private keys or seed phrases</li>
            <li>Financial information beyond public blockchain data</li>
            <li>Location data or IP addresses for tracking purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">4. How We Use Information</h2>
          <p className="mb-3">Information may be used to:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Enable Protocol functionality and process transactions</li>
            <li>Improve user experience and Protocol features</li>
            <li>Monitor and prevent fraudulent or malicious activity</li>
            <li>Comply with legal requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">5. Blockchain Transparency</h2>
          <p>
            Please be aware that blockchain transactions are inherently public and transparent.
            Your wallet address and all transactions made through the Protocol are permanently
            recorded on the Base blockchain and can be viewed by anyone. We cannot delete or
            modify this on-chain data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">6. Third-Party Services</h2>
          <p className="mb-3">The Protocol may integrate with third-party services:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Wallet providers (MetaMask, WalletConnect, etc.)</li>
            <li>RPC providers for blockchain data</li>
            <li>Analytics services</li>
          </ul>
          <p className="mt-3">
            These services have their own privacy policies, and we encourage you to review them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">7. Cookies</h2>
          <p>
            We may use essential cookies to enable basic website functionality such as remembering
            your wallet connection preference. We do not use tracking cookies for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">8. Data Security</h2>
          <p>
            We implement reasonable security measures to protect any data we collect. However,
            no method of electronic transmission or storage is 100% secure. You are responsible
            for maintaining the security of your wallet and private keys.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">9. Your Rights</h2>
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Disconnect your wallet at any time</li>
            <li>Use the Protocol without providing personal information</li>
            <li>Request information about data we may have collected</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">10. Children&apos;s Privacy</h2>
          <p>
            The Protocol is not intended for use by individuals under 18 years of age.
            We do not knowingly collect information from minors.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated revision date. Your continued use of the Protocol constitutes acceptance
            of any changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">12. Contact</h2>
          <p>
            For privacy-related questions or concerns, please reach out through our official
            community channels or governance forum.
          </p>
        </section>
      </div>
    </div>
  );
}
