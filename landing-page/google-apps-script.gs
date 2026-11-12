/**
 * Companion: Google Sheets backend.
 *
 * Setup (once):
 *   1. Open the Google Sheet > Extensions > Apps Script. Replace the editor contents with this file and save.
 *   2. Project Settings (gear icon) > Script properties > Add property:
 *        ADMIN_KEY = the same value as SHEETS_ADMIN_KEY in your Vercel environment variables.
 *        SENDER    = (optional) a Companion address such as trycompanion@gmail.com, added first in Gmail >
 *                    Settings > Accounts > "Send mail as". Emails then come from Companion <that address>.
 *   3. Deploy > Manage deployments > edit the existing web app > Version: New version > Deploy.
 *      Keep "Execute as: Me" and "Who has access: Anyone". Editing the existing deployment keeps the
 *      same /exec URL the website already uses. Google asks you to allow Sheets, Drive and Gmail access.
 *
 * What it does:
 *   - Saves every submission (orders, sponsors, Mac waitlist) to its own tab and emails you about new payments.
 *   - Admin actions (list, verify, reject, resend) only run with the ADMIN_KEY, which lives on Vercel's server.
 *   - Verifying an order creates a license key and emails the buyer their download link and key.
 *   - Verifying a sponsor publishes their logo; the website reads approved sponsors with ?action=sponsors.
 */

var DOWNLOAD_URL = 'https://github.com/pradhan-not-found/Companion-/releases/latest';
var LOGO_FOLDER = 'Companion sponsor logos';

// Each tab lists [field key, column header]. Columns are found by header, so you can reorder them in the sheet.
var TABS = {
  order: {
    name: 'Orders',
    fields: [
      ['submittedAt', 'Submitted at'], ['reference', 'Order ID'], ['product', 'Product'], ['amount', 'Amount (INR)'],
      ['email', 'Email'], ['name', 'Name'], ['utr', 'UTR'], ['line1', 'Address'], ['city', 'City'], ['state', 'State'],
      ['pin', 'PIN'], ['country', 'Country'], ['status', 'Status'], ['licenseKey', 'License key'], ['verifiedAt', 'Verified at'],
      ['licensedTo', 'Licensed to'], ['devices', 'Devices']
    ]
  },
  sponsor: {
    name: 'Sponsors',
    fields: [
      ['submittedAt', 'Submitted at'], ['reference', 'Reference'], ['amount', 'Amount (INR)'], ['name', 'Name'],
      ['email', 'Email'], ['company', 'Company'], ['website', 'Website'], ['feature', 'Feature logo'], ['logo', 'Logo'],
      ['message', 'Message'], ['utr', 'UTR'], ['status', 'Status'], ['verifiedAt', 'Verified at']
    ]
  },
  'mac-waitlist': {
    name: 'Mac waitlist',
    fields: [['submittedAt', 'Submitted at'], ['email', 'Email'], ['name', 'Name'], ['mac', 'Mac'], ['page', 'Page']]
  },
  waitlist: {
    name: 'Waitlist',
    fields: [['submittedAt', 'Submitted at'], ['email', 'Email'], ['page', 'Page']]
  }
};

// How many computers one license can run on. 0 means no limit: the owner can use their
// license on all their own computers, as long as they sign in with the purchase email.
var MAX_DEVICES = 0;

var PENDING = 'Pending verification';
var VERIFIED = 'Verified';
var REJECTED = 'Rejected';
var REVOKED = 'Revoked';

// ── Entry points ─────────────────────────────────────────────

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.admin) return handleAdmin(data);
    return handleSubmission(data);
  } catch (error) {
    return json({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'sponsors') return json({ ok: true, sponsors: approvedSponsors() });
  return json({ ok: true });
}

// ── Public submissions ───────────────────────────────────────

function handleSubmission(data) {
  var type = TABS[data.type] ? data.type : 'waitlist';
  var table = open(type);
  var at = data.submittedAt ? new Date(data.submittedAt) : new Date();

  if (type === 'order') {
    var address = data.address || {};
    var order = {
      submittedAt: at, reference: clean(data.orderId), product: clean(data.product), amount: Number(data.amount) || '',
      email: clean(data.email).toLowerCase(), name: clean(data.name), utr: data.utr ? "'" + clean(data.utr) : '',
      line1: clean(address.line1), city: clean(address.city), state: clean(address.state), pin: "'" + clean(address.pin),
      country: clean(address.country), status: PENDING
    };
    append(table, order);
    notifyOwner('New order ' + order.reference + ' · ₹' + order.amount, order);
    return json({ ok: true, status: 'saved' });
  }

  if (type === 'sponsor') {
    var sponsor = {
      submittedAt: at, reference: clean(data.orderId), amount: Number(data.amount) || '', name: clean(data.name),
      email: clean(data.email).toLowerCase(), company: clean(data.company), website: clean(data.website),
      feature: data.feature ? 'Yes' : 'No', logo: saveLogo(data), message: clean(data.message),
      utr: data.utr ? "'" + clean(data.utr) : '', status: PENDING
    };
    append(table, sponsor);
    notifyOwner('New sponsor ' + (sponsor.company || sponsor.name) + ' · ₹' + sponsor.amount, sponsor);
    return json({ ok: true, status: 'saved' });
  }

  var email = clean(data.email).toLowerCase();
  if (!email || findBy(table, 'email', email)) return json({ ok: true, status: 'duplicate' });
  append(table, { submittedAt: at, email: email, name: clean(data.name), mac: clean(data.mac), page: clean(data.page) });
  return json({ ok: true, status: 'saved' });
}

// ── Admin (needs ADMIN_KEY) ──────────────────────────────────

function handleAdmin(data) {
  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || typeof data.key !== 'string' || data.key !== key) return json({ ok: false, error: 'unauthorized' });

  if (data.action === 'list') {
    return json({
      ok: true,
      orders: rows(open('order')),
      sponsors: rows(open('sponsor')),
      waitlist: rows(open('mac-waitlist')).concat(rows(open('waitlist')))
    });
  }

  if (data.action === 'activate') return activate(data);
  if (data.action === 'mail') return sendMail(data);

  var type = data.type === 'sponsor' ? 'sponsor' : 'order';
  var table = open(type);
  var found = findBy(table, 'reference', clean(data.reference));
  if (!found) return json({ ok: false, error: 'not found' });
  var record = found.record;

  if (data.action === 'verify') {
    if (record.status === VERIFIED) return json({ ok: true, record: record });
    var update = { status: VERIFIED, verifiedAt: new Date() };
    if (type === 'order') {
      update.licenseKey = record.licenseKey || licenseKey();
      write(table, found.row, update);
      sendLicense(merge(record, update));
    } else {
      if (record.logo) shareLogo(record.logo);
      write(table, found.row, update);
      sendSponsorThanks(merge(record, update));
    }
    return json({ ok: true, record: merge(record, update) });
  }

  if (data.action === 'reject') {
    write(table, found.row, { status: REJECTED });
    sendRejection(record, type);
    return json({ ok: true, record: merge(record, { status: REJECTED }) });
  }

  // Revoke stops the license everywhere; the app re-checks within about an hour.
  if (data.action === 'revoke' && type === 'order' && record.status === VERIFIED) {
    write(table, found.row, { status: REVOKED });
    return json({ ok: true, record: merge(record, { status: REVOKED }) });
  }

  if (data.action === 'restore' && type === 'order' && record.status === REVOKED) {
    write(table, found.row, { status: VERIFIED });
    return json({ ok: true, record: merge(record, { status: VERIFIED }) });
  }

  if (data.action === 'reset' && type === 'order') {
    write(table, found.row, { licensedTo: '', devices: '' });
    return json({ ok: true, record: merge(record, { licensedTo: '', devices: '' }) });
  }

  if (data.action === 'resend' && type === 'order' && record.status === VERIFIED) {
    sendLicense(record);
    return json({ ok: true, record: record });
  }

  return json({ ok: false, error: 'unknown action' });
}

// ── License activation (called by the website server with ADMIN_KEY) ──

// One license belongs to one email: the one used at checkout. It works on any computer signed in with that email.
function activate(data) {
  var table = open('order');
  var found = findBy(table, 'licenseKey', clean(data.licenseKey));
  if (!found) return json({ ok: false, error: 'not found' });
  var record = found.record;
  if (record.status === REVOKED) return json({ ok: false, error: 'revoked' });
  if (record.status !== VERIFIED) return json({ ok: false, error: 'not verified' });

  var email = clean(data.email).toLowerCase();
  var device = clean(data.device).toLowerCase();
  if (!email || !device) return json({ ok: false, error: 'bad request' });

  var owner = String(record.email || '').toLowerCase();
  if (!owner || owner !== email) return json({ ok: false, error: 'other account' });

  var devices = String(record.devices || '').split(',').map(function (d) { return d.trim(); }).filter(String);
  if (devices.indexOf(device) === -1) {
    if (MAX_DEVICES && devices.length >= MAX_DEVICES) return json({ ok: false, error: 'device limit' });
    devices.push(device);
  }
  write(table, found.row, { licensedTo: email, devices: devices.join(',') });
  return json({ ok: true, status: 'activated', email: email, devices: devices });
}

// ── Mail written in the admin panel ─────────────────────────

// Sends one message to up to 50 people, as Companion, using the same template as license emails.
function sendMail(data) {
  var recipients = String(data.to || '').split(',')
    .map(function (address) { return address.trim().toLowerCase(); })
    .filter(function (address) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address); })
    .filter(function (address, index, list) { return list.indexOf(address) === index; })
    .slice(0, 50);
  var subject = clean(data.subject).slice(0, 150);
  var body = String(data.body || '').trim().slice(0, 5000);
  if (!recipients.length || !subject || !body) return json({ ok: false, error: 'bad request' });
  if (recipients.length > MailApp.getRemainingDailyQuota()) return json({ ok: false, error: 'quota' });

  var html = layout(subject, '<p>' + esc(body).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>');
  recipients.forEach(function (address) {
    send({ to: address, name: 'Companion', subject: subject, htmlBody: html });
  });
  return json({ ok: true, status: 'sent', sent: recipients.length, remaining: MailApp.getRemainingDailyQuota() });
}

// ── Emails ───────────────────────────────────────────────────

function sendLicense(order) {
  send({
    to: order.email,
    name: 'Companion',
    subject: 'Your Companion license',
    htmlBody: layout(
      'Thank you, ' + firstName(order.name) + '.',
      '<p>Your payment for order <b>' + esc(order.reference) + '</b> is confirmed. Here is your license key:</p>' +
        '<p style="font:600 20px/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:0.06em;background:#F4F4F5;border-radius:10px;padding:14px 16px;margin:18px 0">' +
        esc(order.licenseKey) + '</p>' +
        '<p><a href="' + DOWNLOAD_URL + '" style="display:inline-block;background:#18181B;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Download Companion for Windows</a></p>' +
        '<p style="color:#6B6B6B">Install it, open Companion and enter your key when asked. Keep this email so you have your key for later.</p>'
    )
  });
}

function sendSponsorThanks(sponsor) {
  send({
    to: sponsor.email,
    name: 'Companion',
    subject: 'Thank you for sponsoring Companion',
    htmlBody: layout(
      'Thank you, ' + firstName(sponsor.name) + '.',
      '<p>Your sponsorship <b>' + esc(sponsor.reference) + '</b> is confirmed.' +
        (sponsor.feature === 'Yes' ? ' ' + esc(sponsor.company || 'Your company') + ' is now featured on the Companion sponsors page.' : '') +
        '</p><p style="color:#6B6B6B">It genuinely keeps Companion going. Thank you.</p>'
    )
  });
}

function sendRejection(record, type) {
  send({
    to: record.email,
    name: 'Companion',
    subject: 'About your Companion ' + (type === 'order' ? 'order' : 'sponsorship') + ' ' + record.reference,
    htmlBody: layout(
      'Hi ' + firstName(record.name) + ',',
      '<p>We couldn\'t find a payment for <b>' + esc(record.reference) + '</b>.</p>' +
        '<p style="color:#6B6B6B">If you did pay, reply to this email with a screenshot of the payment and we\'ll sort it out.</p>'
    )
  });
}

function notifyOwner(subject, record) {
  var owner = Session.getEffectiveUser().getEmail();
  if (!owner) return;
  var lines = Object.keys(record).map(function (field) {
    return '<tr><td style="color:#6B6B6B;padding:3px 14px 3px 0">' + esc(field) + '</td><td>' + esc(String(record[field]).replace(/^'/, '')) + '</td></tr>';
  });
  send({
    to: owner,
    name: 'Companion',
    subject: subject,
    htmlBody: layout(subject, '<p>In your UPI app, look for a payment of <b>₹' + esc(record.amount) + '</b> with <b>' + esc(record.reference) + '</b> in the note, then verify it in your admin panel.</p><table style="font-size:14px">' + lines.join('') + '</table>')
  });
}

// Sends as "Companion". If the SENDER script property is set (for example trycompanion@gmail.com)
// and that address is a verified "Send mail as" alias in this Gmail account, mail goes from it.
function send(message) {
  var sender = PropertiesService.getScriptProperties().getProperty('SENDER');
  var options = { htmlBody: message.htmlBody, name: message.name || 'Companion' };
  if (sender && GmailApp.getAliases().indexOf(sender) !== -1) {
    options.from = sender;
    options.replyTo = sender;
  }
  GmailApp.sendEmail(message.to, message.subject, '', options);
}

function layout(title, body) {
  return '<div style="font:15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181B;max-width:520px">' +
    '<p style="font-size:20px;font-weight:600;margin:0 0 12px">' + esc(title) + '</p>' + body +
    '<p style="color:#9A9A9A;font-size:13px;margin-top:28px">Companion</p></div>';
}

// ── Sponsors on the website ──────────────────────────────────

function approvedSponsors() {
  return rows(open('sponsor'))
    .filter(function (s) { return s.status === VERIFIED && s.feature === 'Yes' && s.logo; })
    .map(function (s) {
      var id = driveId(s.logo);
      return { name: s.company || s.name, url: s.website || '', logo: id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w256' : '' };
    })
    .filter(function (s) { return s.logo; });
}

// Saves an uploaded sponsor logo (a data: URL under 500 KB) to Drive and returns its link.
function saveLogo(data) {
  var match = /^data:(image\/(png|jpeg|svg\+xml|webp));base64,(.+)$/.exec(String(data.logo || ''));
  if (!match) return '';
  var bytes = Utilities.base64Decode(match[3]);
  if (bytes.length > 600 * 1024) return '';
  var extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' }[match[1]];
  var name = clean(data.orderId || 'sponsor') + ' ' + clean(data.company || '').slice(0, 60) + '.' + extension;
  return logoFolder().createFile(Utilities.newBlob(bytes, match[1], name)).getUrl();
}

function shareLogo(url) {
  var id = driveId(url);
  if (id) DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}

function logoFolder() {
  var folders = DriveApp.getFoldersByName(LOGO_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(LOGO_FOLDER);
}

function driveId(url) {
  var match = /\/d\/([\w-]{20,})/.exec(String(url || '')) || /[?&]id=([\w-]{20,})/.exec(String(url || ''));
  return match ? match[1] : '';
}

// ── Sheet helpers ────────────────────────────────────────────

function open(type) {
  var spec = TABS[type];
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(spec.name);
  if (!sheet) {
    sheet = book.insertSheet(spec.name);
    sheet.setFrozenRows(1);
  }
  // Add any missing headers at the end, so older tabs gain new columns.
  var width = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  if (headers.length === 1 && headers[0] === '') headers = [];
  spec.fields.forEach(function (field) {
    if (headers.indexOf(field[1]) === -1) {
      headers.push(field[1]);
      sheet.getRange(1, headers.length).setValue(field[1]).setFontWeight('bold').setBackground('#F3F3F3');
    }
  });
  var index = {};
  spec.fields.forEach(function (field) { index[field[0]] = headers.indexOf(field[1]) + 1; });
  return { sheet: sheet, spec: spec, index: index, width: headers.length };
}

function append(table, record) {
  var row = [];
  for (var i = 0; i < table.width; i += 1) row.push('');
  Object.keys(record).forEach(function (key) {
    if (table.index[key]) row[table.index[key] - 1] = record[key];
  });
  table.sheet.appendRow(row);
}

function write(table, rowNumber, update) {
  Object.keys(update).forEach(function (key) {
    if (table.index[key]) table.sheet.getRange(rowNumber, table.index[key]).setValue(update[key]);
  });
}

function toRecord(table, cells) {
  var record = {};
  table.spec.fields.forEach(function (field) {
    var value = cells[table.index[field[0]] - 1];
    record[field[0]] = value instanceof Date ? value.toISOString() : String(value === undefined ? '' : value).replace(/^'/, '');
  });
  return record;
}

function rows(table) {
  var last = table.sheet.getLastRow();
  if (last < 2) return [];
  var values = table.sheet.getRange(2, 1, last - 1, table.width).getValues();
  return values.map(function (cells) { return toRecord(table, cells); }).reverse();
}

function findBy(table, key, value) {
  if (!value || !table.index[key]) return null;
  var last = table.sheet.getLastRow();
  if (last < 2) return null;
  var column = table.sheet.getRange(2, table.index[key], last - 1, 1).getValues();
  for (var i = column.length - 1; i >= 0; i -= 1) {
    if (String(column[i][0]).replace(/^'/, '').toLowerCase() === String(value).toLowerCase()) {
      var row = i + 2;
      return { row: row, record: toRecord(table, table.sheet.getRange(row, 1, 1, table.width).getValues()[0]) };
    }
  }
  return null;
}

// ── Small utilities ──────────────────────────────────────────

// CMPN-XXXX-XXXX-XXXX from an alphabet without look-alike characters.
function licenseKey() {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
  var out = '';
  for (var i = 0; i < 12; i += 1) out += alphabet[(bytes[i] + 256) % alphabet.length];
  return 'CMPN-' + out.slice(0, 4) + '-' + out.slice(4, 8) + '-' + out.slice(8, 12);
}

function merge(a, b) {
  var out = {};
  Object.keys(a).forEach(function (k) { out[k] = a[k]; });
  Object.keys(b).forEach(function (k) { out[k] = b[k] instanceof Date ? b[k].toISOString() : b[k]; });
  return out;
}

function firstName(name) {
  return esc(String(name || 'there').trim().split(/\s+/)[0] || 'there');
}

function esc(value) {
  return String(value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Strip leading =,+,-,@ so submitted text is never evaluated as a spreadsheet formula.
function clean(value) {
  return String(value == null ? '' : value).trim().slice(0, 300).replace(/^[=+\-@]+/, '');
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
