// D Byk single login — shared by Hisab, CRM, Academy, Service and the Hub.
// Keep this file identical in every repo.
//
// Supabase normally saves the login in localStorage, which is separate for each
// subdomain, so you had to log in to every app on its own. This saves it in a
// cookie on .dbykstore.com instead, so one login works on every *.dbykstore.com app.
// Log out in one app and you are logged out of all of them.
//
// Use: createClient(URL, KEY, { auth: { storage: window.dbykAuthStorage } })
(function () {
  'use strict';
  var host = location.hostname;
  var DOMAIN = /(^|\.)dbykstore\.com$/.test(host) ? '; Domain=.dbykstore.com' : ''; // on localhost: no domain, shared across ports
  var SECURE = location.protocol === 'https:' ? '; Secure' : '';
  var MAX_AGE = 60 * 60 * 24 * 400; // Supabase decides when the login actually expires
  var CHUNK = 3000;                  // browsers cap one cookie at ~4 KB, so long values are split
  var MIGRATED = 'dbyk_sso_migrated';

  function readCookie(name) {
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (parts[i].slice(0, eq) === name) return decodeURIComponent(parts[i].slice(eq + 1));
    }
    return null;
  }
  function writeCookie(name, value, maxAge) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + DOMAIN + SECURE;
  }
  function count(key) { var n = parseInt(readCookie(key + '.n'), 10); return n > 0 ? n : 0; }

  function getItem(key) {
    var n = count(key);
    var old = migrate(key);
    if (!n) { if (old) setItem(key, old); return old; }
    var out = '';
    for (var i = 0; i < n; i++) {
      var c = readCookie(key + '.' + i);
      if (c === null) return null; // half-written: treat as logged out
      out += c;
    }
    return out;
  }
  function setItem(key, value) {
    var old = count(key);
    var s = String(value), n = Math.max(1, Math.ceil(s.length / CHUNK));
    for (var i = 0; i < n; i++) writeCookie(key + '.' + i, s.slice(i * CHUNK, (i + 1) * CHUNK), MAX_AGE);
    for (var j = n; j < old; j++) writeCookie(key + '.' + j, '', 0);
    writeCookie(key + '.n', String(n), MAX_AGE);
  }
  function removeItem(key) {
    var n = count(key);
    for (var i = 0; i < n; i++) writeCookie(key + '.' + i, '', 0);
    writeCookie(key + '.n', '', 0);
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // One time per app: take this app's old localStorage login (if any) and delete it,
  // so it can never bring back a login after you log out. getItem moves it into the
  // shared cookie only when no other app has saved a login there yet.
  function migrate(key) {
    try {
      if (localStorage.getItem(MIGRATED)) return null;
      var old = localStorage.getItem(key);
      localStorage.removeItem(key);
      localStorage.setItem(MIGRATED, '1');
      return old;
    } catch (e) { return null; }
  }

  window.dbykAuthStorage = { getItem: getItem, setItem: setItem, removeItem: removeItem };

  // When this app is open inside the D Byk Hub, Alt+1..4 switches apps there too.
  if (window.parent !== window) {
    document.addEventListener('keydown', function (e) {
      var m = /^Digit([1-9])$/.exec(e.code);
      if (!m || !e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      window.parent.postMessage({ dbykHub: 'switch', n: +m[1] }, '*');
    });
  }
})();
