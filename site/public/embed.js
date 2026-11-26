/* internradar embed: the tech internships near one university, for a study association's own site.
 *
 *   <div data-internradar="tu-delft" data-ref="ch"><a href="https://internradar.eu/for/tu-delft/?ref=ch">Tech internships near TU Delft</a></div>
 *   <script src="https://internradar.eu/embed.js" async></script>
 *
 * Options on the div: data-ref (where visitors come from), data-limit (rows, 3 to 12, default 6),
 * data-theme ("light", "dark" or "auto", default auto). Without JavaScript the link inside the div stays.
 * The box sits in a shadow root, so the site's own styles don't change it and it doesn't change the site.
 * It sets no cookies and sends nothing but the request for /embed.json. */
(function () {
  // the site the script came from, so a copy on a test server shows that server's list
  var me = document.currentScript;
  var SITE = me && /^https?:/.test(me.src) ? new URL(me.src).origin : "https://internradar.eu";
  var boxes = document.querySelectorAll("[data-internradar]:not([data-internradar-done])");
  if (!boxes.length) return;
  var data = null;
  var waiting = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function css(dark) {
    var c = dark
      ? { bg: "#1d221e", ink: "#ebe5d8", muted: "#bdb7a8", line: "#353c35", accent: "#7fcfae", soon: "#ee8b5c" }
      : { bg: "#fbf8f2", ink: "#1f2421", muted: "#4b5048", line: "#d9d1c1", accent: "#0f5a46", soon: "#a3421a" };
    return (
      ":host{all:initial;display:block}" +
      ".box{box-sizing:border-box;max-width:560px;background:" + c.bg + ";color:" + c.ink + ";border:1px solid " + c.line +
      ";border-top:3px solid " + c.ink + ";padding:14px 16px 12px;font:15px/1.45 Georgia,'Times New Roman',serif}" +
      ".kicker{font:600 12px/1.3 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:" + c.accent + "}" +
      "h3{margin:4px 0 8px;font:700 19px/1.25 Georgia,serif;color:" + c.ink + "}" +
      "ul{list-style:none;margin:0;padding:0;border-top:1px solid " + c.ink + "}" +
      "li{border-bottom:1px solid " + c.line + "}" +
      "li a{display:flex;gap:10px;align-items:baseline;padding:8px 0;min-height:28px;color:inherit;text-decoration:none}" +
      "li a:hover .t,li a:focus-visible .t{text-decoration:underline}" +
      ".who{flex:1;min-width:0}.c{font-weight:700}.t{display:block;color:" + c.ink + "}" +
      ".p{display:block;font:13px/1.4 system-ui,sans-serif;color:" + c.muted + "}" +
      ".w{flex:none;font:600 13px/1.4 system-ui,sans-serif;color:" + c.soon + ";white-space:nowrap}.w.q{color:" + c.muted + ";font-weight:400}" +
      ".all{display:inline-block;margin-top:10px;padding:6px 0;font:600 14px/1.4 system-ui,sans-serif;color:" + c.accent + "}" +
      ".by{float:right;margin-top:16px;font:12px/1.4 system-ui,sans-serif;color:" + c.muted + "}" +
      ".by a{color:inherit}"
    );
  }

  function render(el) {
    var slug = el.getAttribute("data-internradar");
    var u = data && data.unis[slug];
    if (!u) return;
    var ref = (el.getAttribute("data-ref") || "embed").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "embed";
    var limit = Math.max(3, Math.min(12, parseInt(el.getAttribute("data-limit"), 10) || 6));
    var theme = el.getAttribute("data-theme") || "auto";
    var dark = theme === "dark" || (theme === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    var q = "?ref=" + encodeURIComponent(ref);
    var rows = u.roles.slice(0, limit).map(function (r) {
      return (
        '<li><a href="' + SITE + "/roles/" + esc(r.k) + "/" + q + '" target="_blank" rel="noopener">' +
        '<span class="who"><span class="c">' + esc(r.c) + '</span><span class="t">' + esc(r.t) + '</span><span class="p">' + esc(r.p) + "</span></span>" +
        '<span class="w' + (r.d ? "" : " q") + '">' + esc(r.w) + "</span></a></li>"
      );
    });
    var all = SITE + "/for/" + encodeURIComponent(slug) + "/" + q;
    var root = el.shadowRoot || el.attachShadow({ mode: "open" });
    root.innerHTML =
      "<style>" + css(dark) + "</style>" +
      '<div class="box"><div class="kicker">Tech internships ' + esc(u.where || "near " + u.name) + "</div>" +
      "<h3>" + u.open + " open now" + (u.soon ? ", " + u.soon + " opening soon" : "") + "</h3>" +
      (rows.length ? "<ul>" + rows.join("") + "</ul>" : "") +
      '<a class="all" href="' + all + '" target="_blank" rel="noopener">All of them, with the hiring steps</a>' +
      '<span class="by">by <a href="' + SITE + "/" + q + '" target="_blank" rel="noopener">internradar.eu</a></span></div>';
    el.setAttribute("data-internradar-done", "");
  }

  for (var i = 0; i < boxes.length; i++) waiting.push(boxes[i]);
  fetch(SITE + "/embed.json", { credentials: "omit" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (d) {
      data = d;
      if (data) waiting.forEach(render);
    })
    .catch(function () {});
})();
