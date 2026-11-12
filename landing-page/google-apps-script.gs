/**
 * Companion: Google Sheets collector.
 *
 * Setup (once):
 *   1. Open the Google Sheet > Extensions > Apps Script.
 *   2. Replace the editor contents with this file and save.
 *   3. Deploy > Manage deployments > edit the existing web app > Version: New version > Deploy.
 *      (Editing the existing deployment keeps the same /exec URL the website already uses.)
 *
 * Each submission type gets its own tab with a frozen, bold header row.
 * Sponsor logos are saved to a Drive folder named "Companion sponsor logos"
 * (Google asks you to allow Drive access the first time you deploy this version).
 */

var TABS = {
  'mac-waitlist': {
    name: 'Mac waitlist',
    columns: ['Submitted at', 'Email', 'Name', 'Mac', 'Page']
  },
  order: {
    name: 'Orders',
    columns: ['Submitted at', 'Order ID', 'Product', 'Amount (INR)', 'Email', 'Name', 'UTR', 'Address', 'City', 'State', 'PIN', 'Country', 'Status']
  },
  sponsor: {
    name: 'Sponsors',
    columns: ['Submitted at', 'Reference', 'Amount (INR)', 'Name', 'Email', 'Company', 'Website', 'Feature logo', 'Logo', 'Message', 'UTR', 'Status']
  },
  waitlist: {
    name: 'Waitlist',
    columns: ['Submitted at', 'Email', 'Page']
  }
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var type = TABS[data.type] ? data.type : 'waitlist';
    var sheet = tabFor(type);
    var at = data.submittedAt ? new Date(data.submittedAt) : new Date();
    var address = data.address || {};

    if (type === 'mac-waitlist') {
      var email = clean(data.email).toLowerCase();
      if (!email || alreadyListed(sheet, email)) return ok('duplicate');
      sheet.appendRow([at, email, clean(data.name), clean(data.mac), clean(data.page)]);
    } else if (type === 'order') {
      sheet.appendRow([
        at, clean(data.orderId), clean(data.product), Number(data.amount) || '', clean(data.email).toLowerCase(),
        clean(data.name), "'" + clean(data.utr), clean(address.line1), clean(address.city), clean(address.state),
        "'" + clean(address.pin), clean(address.country), 'Pending verification'
      ]);
    } else if (type === 'sponsor') {
      sheet.appendRow([
        at, clean(data.orderId), Number(data.amount) || '', clean(data.name), clean(data.email).toLowerCase(),
        clean(data.company), clean(data.website), data.feature ? 'Yes' : 'No', saveLogo(data), clean(data.message),
        "'" + clean(data.utr), 'Pending verification'
      ]);
    } else {
      var listEmail = clean(data.email).toLowerCase();
      if (!listEmail || alreadyListed(sheet, listEmail)) return ok('duplicate');
      sheet.appendRow([at, listEmail, clean(data.page)]);
    }
    return ok('saved');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function tabFor(type) {
  var spec = TABS[type];
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(spec.name);
  if (!sheet) {
    sheet = book.insertSheet(spec.name);
    sheet.getRange(1, 1, 1, spec.columns.length).setValues([spec.columns]).setFontWeight('bold').setBackground('#F3F3F3');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return sheet;
}

// Saves an uploaded sponsor logo (a data: URL under 500 KB) to a Drive folder and returns its link.
function saveLogo(data) {
  var match = /^data:(image\/(png|jpeg|svg\+xml|webp));base64,(.+)$/.exec(String(data.logo || ''));
  if (!match) return '';
  var bytes = Utilities.base64Decode(match[3]);
  if (bytes.length > 600 * 1024) return 'Logo too large';
  var folders = DriveApp.getFoldersByName('Companion sponsor logos');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Companion sponsor logos');
  var extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' }[match[1]];
  var name = clean(data.orderId || 'sponsor') + ' ' + clean(data.company || '').slice(0, 60) + '.' + extension;
  return folder.createFile(Utilities.newBlob(bytes, match[1], name)).getUrl();
}

function alreadyListed(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var emails = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) if (String(emails[i][0]).toLowerCase() === email) return true;
  return false;
}

// Strip leading =,+,-,@ so submitted text is never evaluated as a spreadsheet formula.
function clean(value) {
  return String(value == null ? '' : value).trim().slice(0, 300).replace(/^[=+\-@]+/, '');
}

function ok(status) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, status: status })).setMimeType(ContentService.MimeType.JSON);
}
