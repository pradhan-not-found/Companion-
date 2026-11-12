import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Companion collects, why, where it is kept and the choices you have.',
  alternates: { canonical: '/privacy' }
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="12 November 2026"
      summary="Companion collects only what it needs to sell you a license, deliver it and keep it working. We don't sell your data, show ads or use tracking cookies."
      sections={[
        {
          title: 'What we collect',
          body: (
            <>
              <p>
                When you buy a license we collect your email address, full name and billing address (street, city, state, PIN code and country),
                together with an order ID and the time of your order.
              </p>
              <p>When you sponsor Companion we collect your name and email, and, if you choose, your company name, website, logo and message.</p>
              <p>When you join a waitlist we collect your email address and, for the Mac waitlist, which Mac you use.</p>
              <p>
                When you activate the app we receive your license key, the email you sign in with and a device identifier. The identifier is a
                one-way hash of your computer&apos;s ID; it can&apos;t be turned back into your computer name or user name.
              </p>
            </>
          )
        },
        {
          title: 'Payments',
          body: (
            <p>
              You pay through your own UPI app, such as Google Pay, PhonePe or Paytm, and the payment happens inside that app. We never see or
              store your UPI PIN, bank account or card details. We only match your payment to your order using the order ID in the payment note.
            </p>
          )
        },
        {
          title: 'How we use it',
          body: (
            <ul>
              <li>To verify your payment and email you your license key and download link.</li>
              <li>To activate your license on your computers and check that it is still valid.</li>
              <li>To answer you when you contact us, and to send important messages about your order or license.</li>
              <li>To feature a sponsor&apos;s logo and link on our sponsors page, only when the sponsor asked for it.</li>
            </ul>
          )
        },
        {
          title: 'Where it is kept',
          body: (
            <>
              <p>
                Order, sponsor and waitlist records are stored in a private Google Sheet and a private Supabase database that only Companion can
                access. Sponsor logos are kept in Google Drive and Supabase Storage. The website runs on Vercel, and emails are sent through Gmail.
              </p>
              <p>These providers process data for us under their own security and privacy terms. Some of them may store data outside India.</p>
            </>
          )
        },
        {
          title: 'Cookies',
          body: (
            <>
              <p>We use a small number of first-party cookies, and no advertising or analytics cookies:</p>
              <ul>
                <li>
                  <b>cmp_consent</b> remembers whether you accepted cookies, for one year.
                </li>
                <li>
                  <b>cmp_order</b> remembers an order you placed on this device so checkout can show its status when you return. It lasts 30 days
                  and is only set if you accept cookies.
                </li>
              </ul>
              <p>You can delete these cookies at any time in your browser settings.</p>
            </>
          )
        },
        {
          title: 'The desktop app',
          body: (
            <p>
              Your companions, settings, reminders and clipboard history stay on your computer. Clipboard history is kept only while Companion is
              open and is never sent to us. The app contacts our servers to activate and periodically re-check your license, and to check for
              updates.
            </p>
          )
        },
        {
          title: 'How long we keep it',
          body: (
            <p>
              We keep order and license records for as long as your license exists, so we can re-send your key and keep it working, and for as long
              as needed for accounting. Waitlist emails are kept until the waitlist ends or you ask us to remove them.
            </p>
          )
        },
        {
          title: 'Your choices',
          body: (
            <p>
              You can ask to see, correct or delete the personal data we hold about you. Deleting order data may mean we can no longer restore your
              license. To make a request, reply to any email you have received from Companion.
            </p>
          )
        },
        {
          title: 'Changes',
          body: <p>If we change this policy, we will update the date at the top of this page. Significant changes will also be emailed to license holders.</p>
        }
      ]}
    />
  );
}
