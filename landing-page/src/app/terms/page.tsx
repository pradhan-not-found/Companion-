import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for buying and using a Companion license.',
  alternates: { canonical: '/terms' }
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="12 November 2026"
      summary="These terms cover buying a Companion license and using the Companion app and website. By buying a license or using the app, you agree to them."
      sections={[
        {
          title: 'Your license',
          body: (
            <>
              <p>
                A Companion license is a one-time purchase. It gives you a personal, non-transferable right to use Companion and every future update,
                for as long as Companion is offered.
              </p>
              <p>
                Each license belongs to the email address used at checkout, and each email can hold one license. You can use it on all of your own
                computers by signing in with that email.
              </p>
            </>
          )
        },
        {
          title: 'Payment and delivery',
          body: (
            <p>
              The price is shown at checkout in Indian rupees and includes taxes. You pay with UPI. After we confirm your payment, usually within
              about 10 minutes, we email your license key and download link to the address you gave at checkout.
            </p>
          )
        },
        {
          title: 'What you may not do',
          body: (
            <ul>
              <li>Share, sell, publish or transfer your license key, or let other people use it.</li>
              <li>Get around, disable or tamper with the license check.</li>
              <li>Reverse engineer, decompile or modify the app, except where the law allows it.</li>
              <li>Redistribute the app or its artwork, including the companions.</li>
            </ul>
          )
        },
        {
          title: 'Ending a license',
          body: (
            <p>
              We may revoke a license that was bought with a payment we could not verify, that was shared or resold, or that was used against these
              terms. A revoked license stops working in the app. If we revoke a license by mistake, we will restore it.
            </p>
          )
        },
        {
          title: 'Refunds',
          body: (
            <p>
              If you paid but did not receive a working license, or you were charged twice, contact us and we will fix it or refund you. Other refund
              requests are handled case by case.
            </p>
          )
        },
        {
          title: 'Sponsorships',
          body: (
            <p>
              Sponsorships are voluntary contributions. When a sponsor chooses to be featured, we show their logo and link on the sponsors page. We
              may decline or remove any logo or link that is inappropriate.
            </p>
          )
        },
        {
          title: 'The software',
          body: (
            <p>
              Companion is provided as it is. We work to keep it reliable, but we can&apos;t promise it will be free of bugs or available at all
              times. To the extent the law allows, our total liability to you is limited to the amount you paid for your license.
            </p>
          )
        },
        {
          title: 'Privacy',
          body: (
            <p>
              How we handle your data is described in our <Link href="/privacy">Privacy Policy</Link>.
            </p>
          )
        },
        {
          title: 'Changes and contact',
          body: (
            <p>
              We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of India. For any
              question, reply to any email you have received from Companion.
            </p>
          )
        }
      ]}
    />
  );
}
