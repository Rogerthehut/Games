# hello@yourquarter.co.uk: receiving, sending as it, and the signature

The aim: anything sent to `hello@yourquarter.co.uk` reaches `hello@roger-richman.com`, and replies written from `hello@roger-richman.com` go out looking like they came from `hello@yourquarter.co.uk`, with quarter's signature underneath. Today `hello@yourquarter.co.uk` is a Zoho Mail mailbox, and Resend (verified for `yourquarter.co.uk`) sends the app's own emails.

## 1. Receiving: forward hello@yourquarter.co.uk to hello@roger-richman.com

**Zoho forwarding (the simplest).** In Zoho Mail, open Settings, then Mail, then Forwarding and POP/IMAP (the wording moves around). Add `hello@roger-richman.com` as a forwarding address, confirm the verification email it sends, then turn forwarding on and tick **keep a copy** so nothing is lost if the forward fails. Zoho's free plan limits forwarding and SMTP/IMAP access, so you may need its cheapest paid plan for this. Check that before building on it.

After switching it on, send a test from a third address (not either of your own) and check it lands in the inbox, not spam. If forwarded mail goes to spam, mark it "not spam" once and add a filter on the roger-richman.com side.

*Don't* move the domain's mail to a forwarding-only service (such as Cloudflare Email Routing) while the Zoho mailbox is in use: both want the domain's MX records, and the last one set wins.

## 2. Sending as hello@yourquarter.co.uk from your roger-richman.com mailbox

Most mail programs (Gmail and Google Workspace, Outlook, Apple Mail) can "send as" another address through that address's own mail server. Two ways:

**A. Through Resend (works on any plan, recommended).** Resend already has `yourquarter.co.uk` verified, so mail goes out properly signed and lands well.
1. In Resend, create a new API key with **sending access only** and a name such as "Gmail send-as". Never reuse the app's key.
2. In Gmail: Settings, See all settings, **Accounts and Import**, **Send mail as**, **Add another email address**. Name `quarter`, address `hello@yourquarter.co.uk`, untick "Treat as an alias".
3. SMTP server `smtp.resend.com`, port `465`, secured with SSL, username `resend`, password the new API key.
4. Gmail emails a confirmation code to `hello@yourquarter.co.uk`. It arrives through step 1's forwarding.
5. Tick **Reply from the same address the message was sent to**, so replying to something sent to quarter goes out as quarter.

**B. Through Zoho's own mail server.** Same steps, with Zoho's SMTP server (`smtp.zoho.eu` or `smtp.zoho.com`, port 465) and a Zoho app password, if your Zoho plan allows SMTP access. Sent mail is then also kept by Zoho.

Either way, add `hello@yourquarter.co.uk` to the SPF, DKIM and DMARC records as the providers show you, and start DMARC at `p=none`, tightening later (the provider's setup page for the domain shows each record).

## 3. The signature

Files: `docs/email/signature.html` (the design), `docs/email/signature.txt` (plain-text fallback) and the logo `public/email/quarter-signature-logo.png`, which is served from `https://yourquarter.co.uk/email/quarter-signature-logo.png` once the site is published. Regenerate the logo with `node scripts/make-email-assets.mjs`.

1. Edit the two lines marked EDIT in `signature.html` (your name and role).
2. **Gmail:** open `signature.html` in a browser, select everything on the page, copy, and paste it into Settings, General, Signature (Gmail won't take raw HTML). Under "Signature defaults", choose it for **new emails** and for **replies**, using the quarter address.
3. **Zoho Mail:** Settings, Mail, Signature, add a signature and use the "insert HTML" (source) option to paste the contents.
4. **Phone mail apps** keep their own plain signature: paste `signature.txt` there.

The signature carries what UK law requires on a company's emails: the company name, that it's registered in England and Wales, the company number and the registered office.

## What stays the same

- The app's own emails (weekly email, ops sign-in codes) still come from `hello@yourquarter.co.uk` through Resend, with replies going to that address. They can share the same look: say if you'd like the signature block added to them.
- Replies to those app emails go to the Zoho mailbox, so section 1 is what carries them to your roger-richman.com inbox.
