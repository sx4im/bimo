import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='toast-container'></div></body></html>", { url: "http://localhost", pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

global.window = window;
global.document = document;
global.Event = window.Event;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s()<>]+(?:\([\w\d]+\)|(?:[^\s`!()\[\]{};:\x27".,<>?«»“”‘’]))/gi;

function extractUrls(text) {
  if (!text) return [];
  const regex = new RegExp(URL_REGEX.source, "gi");
  const matches = text.match(regex) || [];
  return [...new Set(matches.map((u) => u.trim()))];
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightUrlsInText(text) {
  if (!text) return "";
  const regex = new RegExp(URL_REGEX.source, "gi");
  let result = "";
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const url = match[0];
    if (start > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, start));
    }
    result += `<span class="composer-url-highlight">${escapeHtml(url)}</span>`;
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex));
  }
  if (text.endsWith("\n")) {
    result += "<br>";
  }
  return result;
}

// Test 1: extractUrls
const sample = "Check out https://firecrawl.dev/docs and www.example.com! Also https://example.com/test.";
const urls = extractUrls(sample);
assert.deepEqual(urls, [
  "https://firecrawl.dev/docs",
  "www.example.com",
  "https://example.com/test",
]);
console.log("ok: extractUrls extracts valid urls and strips trailing punctuation");

// Test 2: no URLs
assert.deepEqual(extractUrls("Hello world, this is a plain message."), []);
console.log("ok: extractUrls returns empty array on plain text");

// Test 3: deduplication
assert.deepEqual(extractUrls("https://site.com and again https://site.com"), ["https://site.com"]);
console.log("ok: extractUrls deduplicates URLs");

// Test 4: DOM textarea + backdrop highlight simulation
const wrap = document.createElement("div");
wrap.className = "composer-input-wrap";
const backdrop = document.createElement("div");
backdrop.className = "composer-backdrop";
const textarea = document.createElement("textarea");
wrap.append(backdrop, textarea);
document.body.append(wrap);

function syncUrlHighlight() {
  const val = textarea.value;
  const regex = new RegExp(URL_REGEX.source, "i");
  if (regex.test(val)) {
    textarea.classList.add("has-url-highlight");
    backdrop.innerHTML = highlightUrlsInText(val);
  } else {
    textarea.classList.remove("has-url-highlight");
    backdrop.innerHTML = "";
  }
}

// Plain text -> no highlight
textarea.value = "Hello world!";
syncUrlHighlight();
assert.equal(textarea.classList.contains("has-url-highlight"), false);
assert.equal(backdrop.innerHTML, "");
console.log("ok: plain text does not activate url highlight");

// Text with URL -> activates highlight
textarea.value = "Visit https://firecrawl.dev for web scraping";
syncUrlHighlight();
assert.equal(textarea.classList.contains("has-url-highlight"), true);
assert.match(backdrop.innerHTML, /<span class="composer-url-highlight">https:\/\/firecrawl\.dev<\/span>/);
console.log("ok: URL activates blue highlight in backdrop");

// Clear text -> deactivates highlight
textarea.value = "";
syncUrlHighlight();
assert.equal(textarea.classList.contains("has-url-highlight"), false);
assert.equal(backdrop.innerHTML, "");
console.log("ok: clearing textarea clears highlight");

console.log("\nComposer URL highlight tests: ALL PASSED");
