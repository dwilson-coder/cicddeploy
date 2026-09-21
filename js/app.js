// app.js enhanced
const quill = new Quill('#editor', {
  modules: { toolbar: '#toolbar' },
  theme: 'snow'
});

/* UI elements */
const newBtn = document.getElementById('newBtn');
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');
const saveEncBtn = document.getElementById('saveEncBtn');
const openEncBtn = document.getElementById('openEncBtn');
const fileInput = document.getElementById('fileInput');
const autosaveToggle = document.getElementById('autosaveToggle');
const versionsBtn = document.getElementById('versionsBtn');
const versionsList = document.getElementById('versionsList');
const versionsModal = new bootstrap.Modal(document.getElementById('versionsModal'));
const recentList = document.getElementById('recentList');
const clearRecent = document.getElementById('clearRecent');
const storeKeyToggle = document.getElementById('storeKeyToggle');

/* Storage keys */
const RECENT_KEY = 'wys_recent_files_v1';
const AUTOSAVE_KEY = 'wys_autosave_draft_v1';
const VERSIONS_DB = 'wys_versions_db';
const STORED_KEY_DB = 'wys_stored_key_v1';

/* Simple IndexedDB wrapper */
function openDB(name, storeName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function addVersion(html) {
  const db = await openDB(VERSIONS_DB, 'versions');
  const tx = db.transaction('versions', 'readwrite');
  const store = tx.objectStore('versions');
  await store.add({ html, ts: Date.now() });
  await tx.complete;
  db.close();
}
async function listVersions() {
  const db = await openDB(VERSIONS_DB, 'versions');
  const tx = db.transaction('versions', 'readonly');
  const store = tx.objectStore('versions');
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => { res(req.result); db.close(); };
    req.onerror = () => rej(req.error);
  });
}
async function clearVersions() {
  const db = await openDB(VERSIONS_DB, 'versions');
  const tx = db.transaction('versions', 'readwrite');
  tx.objectStore('versions').clear();
  await tx.complete;
  db.close();
}

/* Recent files UI */
function loadRecent() {
  const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  recentList.innerHTML = '';
  arr.forEach(item => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    li.innerHTML = `<div><strong>${item.name}</strong><div class="small text-muted">${new Date(item.ts).toLocaleString()}</div></div>
                    <div><button class="btn btn-sm btn-link openRecent">Open</button></div>`;
    li.querySelector('.openRecent').addEventListener('click', () => {
      if (item.type === 'html') quill.root.innerHTML = item.content;
      else quill.setText(item.content || '');
      // bring to top
      addToRecent(item.name, item.type, item.content);
    });
    recentList.appendChild(li);
  });
}
function addToRecent(name, type, content) {
  const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  arr.unshift({ name, type, ts: Date.now(), content });
  while (arr.length > 20) arr.pop();
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
  loadRecent();
}
clearRecent.addEventListener('click', () => { localStorage.removeItem(RECENT_KEY); loadRecent(); });

/* Autosave and change detection */
let autosaveTimer = null;
let lastSavedHtml = '';
const AUTOSAVE_INTERVAL_MS = 5000; // every 5s
quill.on('text-change', () => {
  if (!autosaveToggle.checked) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    const html = quill.root.innerHTML;
    if (html === lastSavedHtml) return;
    lastSavedHtml = html;
    localStorage.setItem(AUTOSAVE_KEY, html);
    await addVersion(html);
    addToRecent('Autosave draft', 'html', html);
    console.debug('Autosaved');
  }, 800);
});

/* Load autosave on start */
window.addEventListener('load', () => {
  const draft = localStorage.getItem(AUTOSAVE_KEY);
  if (draft) quill.root.innerHTML = draft;
  loadRecent();
});

/* New document */
newBtn.addEventListener('click', () => {
  quill.setContents([{ insert: '\n' }]);
});

/* File open/save with Electron detection */
const isElectron = !!(window.electron && window.electron.invoke);

/* Open file */
openBtn.addEventListener('click', async () => {
  if (isElectron) {
    try {
      const res = await window.electron.invoke('showOpen', { filters: [{ name: 'Text/HTML', extensions: ['txt','html'] }] });
      if (!res) return;
      const { name, content } = res;
      if (name.endsWith('.html')) quill.root.innerHTML = content;
      else quill.setText(content);
      addToRecent(name, name.endsWith('.html') ? 'html' : 'text', content);
    } catch (e) { console.error(e); alert('Failed to open file'); }
    return;
  }
  // Browser fallback
  fileInput.accept = '.txt,.html';
  fileInput.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const txt = await f.text();
    if (f.name.endsWith('.html')) quill.root.innerHTML = txt;
    else quill.setText(txt);
    addToRecent(f.name, f.name.endsWith('.html') ? 'html' : 'text', txt);
    fileInput.value = '';
  };
  fileInput.click();
});

/* Save file */
saveBtn.addEventListener('click', async () => {
  const html = quill.root.innerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const filename = 'note.html';
  if (isElectron) {
    try {
      await window.electron.invoke('showSave', { name: filename, data: html, mime: 'text/html' });
      addToRecent(filename, 'html', html);
      return;
    } catch (e) { console.error(e); alert('Save failed'); }
  }
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      addToRecent(filename, 'html', html);
      return;
    } catch (e) { console.warn(e); }
  }
  // fallback download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
  addToRecent(filename, 'html', html);
});

/* Encryption helpers (same as earlier) */
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBuf(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
async function deriveKey(password, salt, iterations = 200000) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
async function encryptText(plainText, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt.buffer);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  return {
    version: 1,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(cipher)
  };
}
async function decryptText(obj, password) {
  if (!obj || !obj.salt || !obj.iv || !obj.ciphertext) throw new Error('Invalid encrypted file');
  const salt = base64ToBuf(obj.salt);
  const iv = base64ToBuf(obj.iv);
  const cipherBuf = base64ToBuf(obj.ciphertext);
  const key = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  const dec = new TextDecoder();
  return dec.decode(plainBuf);
}

/* Optional local key storage helpers
   - Exports AES key raw and stores base64 wrapped by a passphrase-derived key.
   - Stored in IndexedDB under STORED_KEY_DB.
*/
async function storeKeyLocally(aesKey, protectorPassphrase) {
  // export raw key
  const raw = await crypto.subtle.exportKey('raw', aesKey);
  // derive protector key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const protector = await deriveKey(protectorPassphrase, salt.buffer, 200000);
  // wrap raw key with protector using AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, protector, raw);
  const payload = {
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    wrapped: bufToBase64(wrapped)
  };
  // store in IndexedDB simple store
  const db = await openDB(STORED_KEY_DB, 'keys');
  const tx = db.transaction('keys', 'readwrite');
  const store = tx.objectStore('keys');
  await store.put({ id: 'localKey', payload });
  await tx.complete;
  db.close();
}
async function retrieveStoredKey(protectorPassphrase) {
  const db = await openDB(STORED_KEY_DB, 'keys');
  const tx = db.transaction('keys', 'readonly');
  const store = tx.objectStore('keys');
  return new Promise((res, rej) => {
    const req = store.get('localKey');
    req.onsuccess = async () => {
      const rec = req.result;
      db.close();
      if (!rec) return res(null);
      try {
        const { salt, iv, wrapped } = rec.payload;
        const protector = await deriveKey(protectorPassphrase, base64ToBuf(salt));
        const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBuf(iv) }, protector, base64ToBuf(wrapped));
        const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
        res(key);
      } catch (e) { res(null); }
    };
    req.onerror = () => { db.close(); rej(req.error); };
  });
}

/* Save encrypted file with optional local key storage */
saveEncBtn.addEventListener('click', async () => {
  const useStored = storeKeyToggle.checked;
  let password = null;
  let keyToUse = null;

  if (useStored) {
    // try to retrieve stored key
    const protector = prompt('Enter passphrase to unlock stored key');
    if (!protector) return alert('Cancelled');
    const storedKey = await retrieveStoredKey(protector);
    if (storedKey) {
      keyToUse = storedKey; // AES CryptoKey
    } else {
      // no stored key, create new AES key and store it
      password = prompt('No stored key found. Enter a passphrase to protect a new local key');
      if (!password) return alert('Cancelled');
      // create random AES key
      const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      await storeKeyLocally(aesKey, password);
      keyToUse = aesKey;
    }
  }

  const html = quill.root.innerHTML;

  if (keyToUse) {
    // encrypt using AES-GCM directly with exported raw key
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyToUse, enc.encode(html));
    const payload = {
      version: 2,
      method: 'local-key',
      iv: bufToBase64(iv.buffer),
      ciphertext: bufToBase64(cipher)
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const filename = 'note.encrypted.json';
    if (isElectron) {
      await window.electron.invoke('showSave', { name: filename, data: JSON.stringify(payload), mime: 'application/json' });
      addToRecent(filename, 'encrypted', JSON.stringify(payload));
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
    addToRecent(filename, 'encrypted', JSON.stringify(payload));
    return;
  }

  // fallback: password-based encryption
  password = prompt('Enter password to encrypt file');
  if (!password) return alert('Encryption cancelled');
  const encrypted = await encryptText(html, password);
  const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' });
  const filename = 'note.encrypted.json';
  if (isElectron) {
    await window.electron.invoke('showSave', { name: filename, data: JSON.stringify(encrypted), mime: 'application/json' });
    addToRecent(filename, 'encrypted', JSON.stringify(encrypted));
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
  addToRecent(filename, 'encrypted', JSON.stringify(encrypted));
});

/* Open encrypted file */
openEncBtn.addEventListener('click', async () => {
  if (isElectron) {
    try {
      const res = await window.electron.invoke('showOpen', { filters: [{ name: 'Encrypted JSON', extensions: ['json'] }] });
      if (!res) return;
      const obj = JSON.parse(res.content);
      if (obj.method === 'local-key') {
        const protector = prompt('Enter passphrase to unlock stored key');
        if (!protector) return alert('Cancelled');
        const storedKey = await retrieveStoredKey(protector);
        if (!storedKey) return alert('Failed to retrieve stored key');
        const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBuf(obj.iv) }, storedKey, base64ToBuf(obj.ciphertext));
        quill.root.innerHTML = new TextDecoder().decode(plainBuf);
        addToRecent(res.name, 'encrypted', res.content);
        return;
      }
      const password = prompt('Enter password to decrypt file');
      if (!password) return alert('Cancelled');
      const decrypted = await decryptText(obj, password);
      quill.root.innerHTML = decrypted;
      addToRecent(res.name, 'encrypted', res.content);
    } catch (e) { alert('Failed to open or decrypt file'); console.error(e); }
    return;
  }

  fileInput.accept = '.json';
  fileInput.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const txt = await f.text();
    try {
      const obj = JSON.parse(txt);
      if (obj.method === 'local-key') {
        const protector = prompt('Enter passphrase to unlock stored key');
        if (!protector) return alert('Cancelled');
        const storedKey = await retrieveStoredKey(protector);
        if (!storedKey) return alert('Failed to retrieve stored key');
        const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBuf(obj.iv) }, storedKey, base64ToBuf(obj.ciphertext));
        quill.root.innerHTML = new TextDecoder().decode(plainBuf);
        addToRecent(f.name, 'encrypted', txt);
        fileInput.value = '';
        return;
      }
      const password = prompt('Enter password to decrypt file');
      if (!password) return alert('Decryption cancelled');
      const decrypted = await decryptText(obj, password);
      quill.root.innerHTML = decrypted;
      addToRecent(f.name, 'encrypted', txt);
    } catch (err) { alert('Failed to open or decrypt file'); console.error(err); }
    fileInput.value = '';
  };
  fileInput.click();
});

/* Version history UI */
versionsBtn.addEventListener('click', async () => {
  versionsList.innerHTML = '';
  const versions = await listVersions();
  versions.sort((a,b)=>b.ts-a.ts);
  versions.forEach(v => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    li.innerHTML = `<div><div class="small text-muted">${new Date(v.ts).toLocaleString()}</div><div class="mt-1">${v.html.substring(0,200).replace(/</g,'&lt;')}</div></div>
                    <div class="btn-group-vertical">
                      <button class="btn btn-sm btn-primary restore">Restore</button>
                      <button class="btn btn-sm btn-secondary copy">Copy</button>
                    </div>`;
    li.querySelector('.restore').addEventListener('click', () => {
      quill.root.innerHTML = v.html;
      versionsModal.hide();
    });
    li.querySelector('.copy').addEventListener('click', async () => {
      await navigator.clipboard.writeText(v.html);
      alert('Version copied to clipboard');
    });
    versionsList.appendChild(li);
  });
  versionsModal.show();
});

/* Keyboard shortcuts for browser (and Electron will map native ones) */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveBtn.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    openBtn.click();
  }
});

/* Initialize recent list */
loadRecent();
