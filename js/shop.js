/* =========================================================
   WEB BÁN HÀNG ELECTRONICY – phía khách hàng
   Bản tĩnh: dữ liệu và nghiệp vụ chạy ngay trên trình duyệt (js/engine.js),
   lưu ở localStorage. Đưa lên GitHub Pages là chạy, không cần máy chủ.
   ========================================================= */
const $ = id => document.getElementById(id);
const money = n => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = s => s ? s.slice(0, 10).split("-").reverse().join("/") + (s.length > 10 && s[10] === " " ? s.slice(10) : "") : "—";
const fmtTime = iso => iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";

const S = { catalog: null, me: null, cart: JSON.parse(localStorage.getItem("ey_cart") || "[]"), compare: JSON.parse(sessionStorage.getItem("ey_cmp") || "[]"), chat: null, chatOpen: false };
const token = () => localStorage.getItem("ey_shop_token") || "";
const guestToken = () => localStorage.getItem("ey_guest_token") || "";
const loggedIn = () => !!token();

async function api(path, body, method) {
  const t = token() || (path.startsWith("/api/chat") ? guestToken() : "");
  const res = ENGINE.call(method || (body ? "POST" : "GET"), path, body, t);
  const data = res.data || {}; res.ok = res.status < 400;
  if (res.status === 401 && token()) { localStorage.removeItem("ey_shop_token"); S.me = null; updateHeader(); }
  if (!res.ok) throw Object.assign(new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại"), { status: res.status });
  return data;
}
function toast(msg, err) {
  const t = $("toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
  clearTimeout(t._h); t._h = setTimeout(() => t.className = "toast", 3000);
}
function saveCart() { localStorage.setItem("ey_cart", JSON.stringify(S.cart)); updateHeader(); }
const product = sku => (S.catalog.products || []).find(p => p.sku === sku);

// ---------- Hình minh họa theo ngành hàng (vẽ bằng SVG, không cần ảnh) ----------
const ART = {
  "Tivi": `<rect x="14" y="22" width="92" height="58" rx="5"/><rect x="20" y="28" width="80" height="46" rx="2" class="fill"/><path d="M50 80 44 94M70 80l6 14M38 94h44"/>`,
  "Tủ lạnh": `<rect x="34" y="10" width="52" height="100" rx="6"/><path d="M34 46h52M42 24v12M42 58v18"/><path d="M38 106v6M82 106v6"/>`,
  "Máy lạnh": `<rect x="12" y="34" width="96" height="36" rx="8"/><path d="M20 60h80"/><path d="M36 82c4 6-4 10 0 16M60 82c4 6-4 10 0 16M84 82c4 6-4 10 0 16" class="soft"/><circle cx="96" cy="44" r="2.5" class="dot"/>`,
  "Máy giặt": `<rect x="24" y="14" width="72" height="94" rx="7"/><path d="M24 34h72"/><circle cx="60" cy="70" r="24"/><circle cx="60" cy="70" r="15" class="fill"/><circle cx="36" cy="24" r="3"/><path d="M76 24h12"/>`,
  "Laptop": `<rect x="24" y="24" width="72" height="50" rx="4"/><rect x="30" y="30" width="60" height="38" rx="1" class="fill"/><path d="M12 82h96l-6 10H18z"/>`,
  "Điện thoại": `<rect x="38" y="10" width="44" height="100" rx="9"/><rect x="43" y="22" width="34" height="76" rx="2" class="fill"/><path d="M54 16h12"/>`,
  "Gia dụng": `<path d="M30 46h60l-6 52a8 8 0 0 1-8 7H44a8 8 0 0 1-8-7z"/><path d="M26 46h68M48 46c0-12 24-12 24 0"/><path d="M90 60h8a6 6 0 0 1 0 14h-9" /><circle cx="60" cy="34" r="3" class="dot"/>`
};
const art = (cat, cls = "") => `<div class="art ${cls}"><svg viewBox="0 0 120 120" aria-hidden="true">${ART[cat] || ART["Gia dụng"]}</svg></div>`;
// Ảnh thật của sản phẩm nếu có; lỗi tải ảnh thì quay về hình minh họa
const pimg = (p, cls = "") => !p ? art("", cls) : `<div class="art ${cls} ${p.image ? "photo" : ""}">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.parentNode.classList.remove('photo');this.remove()"/>` : ""}<svg viewBox="0 0 120 120" aria-hidden="true">${ART[p.category] || ART["Gia dụng"]}</svg></div>`;

// ---------- Khung trang ----------
function updateHeader() {
  const n = S.cart.reduce((s, x) => s + x.qty, 0);
  $("cartCount").textContent = n; $("cartCount").hidden = !n;
  $("acctName").textContent = S.me ? S.me.profile.name.split(" ").pop() : "Đăng nhập";
  $("acctLink").href = S.me ? "#/tai-khoan" : "#/dang-nhap";
}
// Dòng chạy khuyến mãi: lấy từ chương trình đang hoạt động + thông điệp cố định
function renderLive() {
  const promos = (S.catalog.promotions || []).map(k => `${k.name}: ${k.offer}${k.minOrder ? " cho đơn từ " + money(k.minOrder) : ""} – đến hết ${fmtDate(k.end)}`);
  const msgs = ["SIÊU SALE 11.11 – Tết độc thân giảm thêm 11% trên giá sau khuyến mãi", ...promos,
    "Miễn phí giao hàng cho đơn từ 5 triệu", "Giao và lắp đặt tận nhà tại TP.HCM", "Đổi trả 30 ngày nếu lỗi nhà sản xuất", "Trả góp 0% qua thẻ tín dụng"];
  const one = msgs.map(m => `<span>${esc(m)}</span>`).join("");
  const run = $("liveRun"); if (!run || run.dataset.k === one) return;   // không chạy lại từ đầu khi nội dung không đổi
  run.dataset.k = one;
  run.innerHTML = `<div>${one}</div><div aria-hidden="true">${one}</div>`;
  run.style.setProperty("--dur", Math.max(30, msgs.join("").length / 7) + "s");
}
function renderCats() {
  const cur = decodeURIComponent((location.hash.match(/^#\/nganh\/(.+)/) || [])[1] || "");
  $("cats").innerHTML = `<div class="cats-in">${S.catalog.categories.map(c => `<a href="#/nganh/${encodeURIComponent(c)}" class="${cur === c ? "on" : ""}">${art(c, "mini")}${c}</a>`).join("")}<a href="#/khuyen-mai" class="hot ${/khuyen-mai/.test(location.hash) ? "on" : ""}"><i class="fa-solid fa-fire"></i>Khuyến mãi</a></div>`;
}
$("findForm").addEventListener("submit", e => { e.preventDefault(); const q = $("findInput").value.trim(); location.hash = q ? "#/tim/" + encodeURIComponent(q) : "#/"; });

const ROUTES = [
  [/^#\/?$/, () => viewHome()],
  [/^#\/nganh\/(.+)$/, m => viewList(decodeURIComponent(m[1]))],
  [/^#\/tim\/(.+)$/, m => viewList(null, decodeURIComponent(m[1]))],
  [/^#\/khuyen-mai$/, () => viewList(null, null, true)],
  [/^#\/so-sanh$/, () => viewCompare()],
  [/^#\/sp\/(.+)$/, m => viewProduct(decodeURIComponent(m[1]))],
  [/^#\/gio-hang$/, () => viewCart()],
  [/^#\/thanh-toan$/, () => viewCheckout()],
  [/^#\/cong-thanh-toan\/(.+)$/, m => viewGateway(m[1])],
  [/^#\/don-hang$/, () => viewOrders()],
  [/^#\/don\/(.+)$/, m => viewOrder(m[1])],
  [/^#\/ho-tro$/, () => viewSupport()],
  [/^#\/dang-nhap$/, () => viewLogin()],
  [/^#\/dang-ky$/, () => viewLogin(true)],
  [/^#\/tai-khoan$/, () => viewAccount()]
];
async function router() {
  const h = location.hash || "#/";
  const r = ROUTES.find(([re]) => re.test(h)) || ROUTES[0];
  renderCats();
  try { $("view").innerHTML = await r[1](h.match(r[0])); }
  catch (e) { $("view").innerHTML = `<div class="wrap empty-state"><h1>Không tải được trang</h1><p>${esc(e.message)}</p><a class="btn" href="#/">Về trang chủ</a></div>`; }
  if (!router.keepScroll) window.scrollTo(0, 0);
  router.keepScroll = false;
  afterRender();
}
window.addEventListener("hashchange", router);
const needLogin = back => { sessionStorage.setItem("ey_back", back || location.hash); location.hash = "#/dang-nhap"; return ""; };

// ---------- Thẻ sản phẩm ----------
const finalPrice = p => p.deal ? p.deal.price : p.price;
function card(p, opts = {}) {
  const out = p.stock === "Tạm hết hàng";
  const cmp = S.compare.includes(p.sku);
  return `<div class="card ${out ? "out" : ""}">
    <a class="card-link" href="#/sp/${encodeURIComponent(p.sku)}" aria-label="${esc(p.name)}"></a>
    <div class="labels">${p.zeroRate ? `<span class="lb zero">Trả góp 0%</span>` : ""}${p.deal && p.deal.flash ? `<span class="lb flash">Giờ vàng</span>` : ""}</div>
    ${pimg(p)}
    <h3>${esc(p.name)}</h3>
    ${p.chips.length ? `<div class="chips-spec">${p.chips.slice(0, 2).map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
    <div class="price">${p.deal ? `<s>${money(p.price)}</s><span class="pct">-${p.deal.pct}%</span>` : ""}</div>
    <b class="now ${p.deal ? "sale" : ""}">${money(finalPrice(p))}</b>
    ${p.gift ? `<p class="gift">${esc(p.gift)}</p>` : ""}
    ${opts.flash && p.left ? `<div class="bar"><i style="width:${Math.max(12, 100 - p.left * 15)}%"></i><span>Chỉ còn ${p.left}</span></div>` : ""}
    <div class="card-foot">${out ? `<span class="st out">Tạm hết hàng</span>` : p.left && !opts.flash ? `<span class="st low">Chỉ còn ${p.left}</span>` : p.install ? `<span class="st">Lắp đặt tận nhà</span>` : `<span class="st">Giao nhanh 2 giờ</span>`}
      <button type="button" class="cmp ${cmp ? "on" : ""}" onclick="toggleCompare('${p.sku}')">${cmp ? "Đã chọn so sánh" : "+ So sánh"}</button></div>
  </div>`;
}

// ---------- Trang chủ ----------
function viewHome() {
  const P = S.catalog.products, promos = S.catalog.promotions;
  const deals = P.filter(p => p.deal && p.stock !== "Tạm hết hàng").sort((a, b) => (b.deal.flash - a.deal.flash) || (b.deal.pct - a.deal.pct));
  const flashEnd = deals.filter(p => p.deal.flash).map(p => p.deal.end).sort()[0] || (deals[0] && deals[0].deal.end);
  const banner = promos.length ? `<section class="banners"><div class="slider" id="slider">${promos.map((k, i) => `
      <article class="slide ${i === 0 ? "on" : ""}" data-i="${i}"><span>${esc(k.offer)}</span><h2>${esc(k.name)}</h2><p>${esc(k.desc)}</p>
        <a class="btn gold" href="${(() => { const c = (k.scopes || [k.scope]).find(x => S.catalog.categories.includes(x)); return c ? "#/nganh/" + encodeURIComponent(c) : "#/khuyen-mai"; })()}">Mua ngay</a><small>Đến hết ${fmtDate(k.end)}${k.code ? ` · Mã ${esc(k.code)}` : ""}</small></article>`).join("")}
      <div class="dots">${promos.map((_, i) => `<button type="button" aria-label="Chương trình ${i + 1}" class="${i === 0 ? "on" : ""}" onclick="slideTo(${i})"></button>`).join("")}</div></div>
    <div class="side-bn"><a href="#/ho-tro"><b>Tra cứu bảo hành</b><span>Nhập số serial, xem hạn bảo hành ngay</span></a>
      <a href="#" onclick="openChat();return false" class="ai"><b>Trợ lý ảo 24/7</b><span>Hỏi chính sách, hướng dẫn sửa lỗi, gửi yêu cầu đổi trả</span></a></div></section>` : "";
  const catGrid = `<section class="cat-grid">${S.catalog.categories.map(c => `<a href="#/nganh/${encodeURIComponent(c)}">${art(c, "ico")}<span>${c}</span></a>`).join("")}</section>`;
  const flash = deals.length ? `<section class="flash"><header><h2><i class="fa-solid fa-bolt"></i> Giờ vàng giá sốc</h2>${flashEnd ? `<div class="cd" data-end="${flashEnd}T23:59:59">Kết thúc sau <b>--</b></div>` : ""}<a href="#/khuyen-mai">Xem tất cả</a></header>
      <div class="row-scroll">${deals.slice(0, 10).map(p => card(p, { flash: true })).join("")}</div></section>` : "";
  const rows = S.catalog.categories.map(c => { const l = P.filter(p => p.category === c).sort((a, b) => (a.stock === "Tạm hết hàng") - (b.stock === "Tạm hết hàng") || b.sold - a.sold);
    return l.length ? `<section class="block"><header><h2>${c}</h2><a href="#/nganh/${encodeURIComponent(c)}">Xem tất cả ${l.length} sản phẩm</a></header><div class="grid five">${l.slice(0, 5).map(p => card(p)).join("")}</div></section>` : ""; }).join("");
  const hero = `<a class="hero-bn" href="#/khuyen-mai" aria-label="Siêu sale 11.11 – Sale tất, giảm nhiều"><img src="assets/banners/sale-1111.webp" alt="ElectronicY Tết độc thân 11.11 – Sale tất, giảm nhiều. 6 ngày 6–11/11 giảm thêm 11%" /></a>`;
  return `<div class="wrap">${hero}${banner}${catGrid}${flash}${rows}</div>`;
}
function slideTo(i) {
  document.querySelectorAll("#slider .slide").forEach((s, k) => s.classList.toggle("on", k === i));
  document.querySelectorAll("#slider .dots button").forEach((s, k) => s.classList.toggle("on", k === i));
}
setInterval(() => { const sl = document.querySelectorAll("#slider .slide"); if (sl.length < 2 || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cur = [...sl].findIndex(s => s.classList.contains("on")); slideTo((cur + 1) % sl.length); }, 5000);
function tickCountdown() { document.querySelectorAll(".cd[data-end]").forEach(el => {
  const ms = new Date(el.dataset.end) - Date.now(); if (ms <= 0) return el.querySelector("b").textContent = "đã kết thúc";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60, p = n => String(n).padStart(2, "0");
  el.querySelector("b").innerHTML = (d ? `<em>${d}</em> ngày ` : "") + `<em>${p(h)}</em>:<em>${p(m)}</em>:<em>${p(s)}</em>`;
}); }
setInterval(tickCountdown, 1000);

// ---------- Danh mục, tìm kiếm, khuyến mãi: có bộ lọc ----------
const PRICE_RANGES = [["", "Tất cả mức giá"], ["0-5", "Dưới 5 triệu"], ["5-10", "5 – 10 triệu"], ["10-20", "10 – 20 triệu"], ["20-999", "Trên 20 triệu"]];
const F = () => JSON.parse(sessionStorage.getItem("ey_f") || "{}");
function setF(o) { sessionStorage.setItem("ey_f", JSON.stringify({ ...F(), ...o })); router.keepScroll = true; router(); }
function viewList(cat, q, promoOnly) {
  const f = F(); if (f.ctx !== location.hash) { sessionStorage.setItem("ey_f", JSON.stringify({ ctx: location.hash })); return viewList(cat, q, promoOnly); }
  let base = S.catalog.products;
  if (cat) base = base.filter(p => p.category === cat);
  if (q) { const k = q.toLowerCase(); base = base.filter(p => (p.name + p.brand + p.category + p.sku + p.spec).toLowerCase().includes(k)); }
  if (promoOnly) base = base.filter(p => p.deal || p.gift || p.zeroRate);
  const brands = [...new Set(base.map(p => p.brand))].sort();
  let list = base.filter(p => (!f.brand || f.brand === p.brand) && (!f.price || (() => { const [a, b] = f.price.split("-").map(Number); const v = finalPrice(p) / 1e6; return v >= a && v < b; })())
    && (!f.install || p.install) && (!f.instock || p.stock !== "Tạm hết hàng") && (!f.zero || p.zeroRate));
  const sorts = { "": (a, b) => b.sold - a.sold, sale: (a, b) => ((b.deal || {}).pct || 0) - ((a.deal || {}).pct || 0), asc: (a, b) => finalPrice(a) - finalPrice(b), desc: (a, b) => finalPrice(b) - finalPrice(a) };
  list = [...list].sort(sorts[f.sort || ""]).sort((a, b) => (a.stock === "Tạm hết hàng") - (b.stock === "Tạm hết hàng"));
  const title = q ? `Kết quả cho "${esc(q)}"` : promoOnly ? "Khuyến mãi đang diễn ra" : esc(cat);
  return `<div class="wrap"><nav class="crumb"><a href="#/">Trang chủ</a> / ${title}</nav>
    <div class="list-head"><h1>${title} <small>${list.length} sản phẩm</small></h1></div>
    <div class="filters">
      ${brands.length > 1 ? `<div class="fgroup">${brands.map(b => `<button type="button" class="${f.brand === b ? "on" : ""}" onclick="setF({brand:'${f.brand === b ? "" : b}'})">${esc(b)}</button>`).join("")}</div>` : ""}
      <div class="fgroup">${PRICE_RANGES.map(([v, l]) => `<button type="button" class="${(f.price || "") === v ? "on" : ""}" onclick="setF({price:'${v}'})">${l}</button>`).join("")}</div>
      <div class="fgroup">
        <button type="button" class="${f.instock ? "on" : ""}" onclick="setF({instock:${!f.instock}})">Còn hàng</button>
        <button type="button" class="${f.zero ? "on" : ""}" onclick="setF({zero:${!f.zero}})">Trả góp 0%</button>
        ${base.some(p => p.install) ? `<button type="button" class="${f.install ? "on" : ""}" onclick="setF({install:${!f.install}})">Có lắp đặt</button>` : ""}
        ${f.brand || f.price || f.instock || f.zero || f.install ? `<button type="button" class="clear" onclick="sessionStorage.removeItem('ey_f');router.keepScroll=true;router()">Bỏ lọc</button>` : ""}
      </div></div>
    <div class="sortbar">Xếp theo: ${[["", "Bán chạy"], ["sale", "Giảm nhiều"], ["asc", "Giá thấp → cao"], ["desc", "Giá cao → thấp"]].map(([v, l]) => `<button type="button" class="${(f.sort || "") === v ? "on" : ""}" onclick="setF({sort:'${v}'})">${l}</button>`).join("")}</div>
    ${list.length ? `<div class="grid">${list.map(p => card(p)).join("")}</div>` : `<div class="empty-state"><p>Không có sản phẩm khớp bộ lọc. <button class="link" onclick="sessionStorage.removeItem('ey_f');router()">Bỏ lọc</button> hoặc xem <a href="#/">trang chủ</a>.</p></div>`}</div>`;
}

// ---------- So sánh sản phẩm ----------
function toggleCompare(sku) {
  const p = product(sku);
  if (S.compare.includes(sku)) S.compare = S.compare.filter(x => x !== sku);
  else {
    const other = S.compare.map(product).filter(Boolean);
    if (other.length && other[0].category !== p.category) return toast("Chỉ so sánh sản phẩm cùng ngành hàng (" + other[0].category + ")", true);
    if (S.compare.length >= 3) return toast("So sánh tối đa 3 sản phẩm", true);
    S.compare.push(sku);
  }
  sessionStorage.setItem("ey_cmp", JSON.stringify(S.compare)); router.keepScroll = true; router();
}
function compareTray() {
  const l = S.compare.map(product).filter(Boolean);
  if (!l.length || /so-sanh/.test(location.hash)) return "";
  return `<div class="tray"><div class="tray-in">${l.map(p => `<div class="ti">${pimg(p, "sm")}<span>${esc(p.name)}</span><button type="button" aria-label="Bỏ" onclick="toggleCompare('${p.sku}')">×</button></div>`).join("")}
    ${l.length < 3 ? `<div class="ti empty">Thêm ${3 - l.length} sản phẩm</div>` : ""}
    <a class="btn primary ${l.length < 2 ? "disabled" : ""}" href="#/so-sanh">So sánh ngay</a><button class="link" onclick="S.compare=[];sessionStorage.removeItem('ey_cmp');router()">Xóa tất cả</button></div></div>`;
}
function viewCompare() {
  const l = S.compare.map(product).filter(Boolean);
  if (l.length < 2) return `<div class="wrap empty-state"><h1>Chọn ít nhất 2 sản phẩm</h1><p>Bấm "+ So sánh" trên thẻ sản phẩm cùng ngành hàng.</p><a class="btn primary" href="#/">Chọn sản phẩm</a></div>`;
  const row = (label, fn) => `<tr><th>${label}</th>${l.map(p => `<td>${fn(p)}</td>`).join("")}</tr>`;
  const specs = Math.max(...l.map(p => p.chips.length));
  return `<div class="wrap"><h1 class="pg">So sánh ${esc(l[0].category.toLowerCase())}</h1><div class="cmp-wrap"><table class="cmp-t">
    <tr><th></th>${l.map(p => `<td>${pimg(p)}<a href="#/sp/${encodeURIComponent(p.sku)}"><b>${esc(p.name)}</b></a></td>`).join("")}</tr>
    ${row("Giá", p => `<b class="${p.deal ? "sale-t" : ""}">${money(finalPrice(p))}</b>${p.deal ? `<br><s>${money(p.price)}</s>` : ""}`)}
    ${row("Thương hiệu", p => esc(p.brand))}
    ${Array.from({ length: specs }, (_, i) => row(i ? "" : "Thông số", p => esc(p.chips[i] || "—"))).join("")}
    ${row("Bảo hành", p => p.warranty + " tháng")}${row("Lắp đặt", p => p.install ? "Có" : "Không cần")}
    ${row("Ưu đãi", p => esc([p.deal && p.deal.name, p.gift, p.zeroRate].filter(Boolean).join(" · ") || "—"))}
    ${row("Tình trạng", p => p.stock)}
    ${row("", p => p.stock === "Tạm hết hàng" ? "" : `<button class="btn primary sm" onclick="addCart('${p.sku}')">Thêm vào giỏ</button> <button class="link" onclick="toggleCompare('${p.sku}')">Bỏ</button>`)}
  </table></div></div>`;
}

// ---------- Chi tiết sản phẩm ----------
function viewProduct(sku) {
  const p = product(sku);
  if (!p) return `<div class="wrap empty-state"><h1>Sản phẩm không còn kinh doanh</h1><p>Sản phẩm này đã ngừng bán hoặc không tồn tại.</p><a class="btn" href="#/">Xem sản phẩm khác</a></div>`;
  const out = p.stock === "Tạm hết hàng";
  const similar = S.catalog.products.filter(x => x.category === p.category && x.sku !== p.sku && x.stock !== "Tạm hết hàng").slice(0, 5);
  return `<div class="wrap"><nav class="crumb"><a href="#/">Trang chủ</a> / <a href="#/nganh/${encodeURIComponent(p.category)}">${esc(p.category)}</a> / ${esc(p.brand)}</nav>
    <h1 class="pdp-title">${esc(p.name)}</h1><p class="pdp-sub">${esc(p.sku)} · Đã bán ${p.sold} · <button class="link" onclick="toggleCompare('${p.sku}')">${S.compare.includes(p.sku) ? "Đã thêm so sánh" : "+ So sánh"}</button></p>
    <div class="pdp">
      <div class="pdp-left">${pimg(p, "big")}
        <div class="policy"><div><i class="fa-solid fa-rotate"></i>Đổi trả 30 ngày nếu lỗi nhà sản xuất</div><div><i class="fa-solid fa-shield-halved"></i>Bảo hành chính hãng ${p.warranty} tháng</div>
          <div><i class="fa-solid fa-truck"></i>${p.install ? "Giao và lắp đặt tận nhà" : "Giao nhanh trong ngày"}</div><div><i class="fa-solid fa-box-open"></i>Kiểm tra hàng trước khi nhận</div></div>
        <h2>Thông số kỹ thuật</h2><table class="spec">${String(p.spec).split(",").map(c => c.trim()).filter(Boolean).map((c, i) => `<tr><th>${i ? "" : "Đặc điểm nổi bật"}</th><td>${esc(c)}</td></tr>`).join("")}
          <tr><th>Thương hiệu</th><td>${esc(p.brand)}</td></tr><tr><th>Bảo hành</th><td>${p.warranty} tháng</td></tr></table>
      </div>
      <div class="pdp-info">
        <div class="price-box">${p.deal ? `<b class="sale">${money(p.deal.price)}</b><s>${money(p.price)}</s><span class="pct">-${p.deal.pct}%</span>` : `<b>${money(p.price)}</b>`}
          ${p.deal ? `<p>${esc(p.deal.name)} · đến ${fmtDate(p.deal.end)}${p.deal.flash ? ` · <span class="cd" data-end="${p.deal.end}T23:59:59">còn <b>--</b></span>` : ""}</p>` : ""}</div>
        ${p.perks.length ? `<div class="offer"><h3>Khuyến mãi</h3><ol>${p.perks.map(x => `<li>${esc(x)}</li>`).join("")}${p.deal ? `<li>${esc(p.deal.name)}: giảm ${money(p.deal.discount)}</li>` : ""}</ol></div>` : ""}
        <p class="stock ${out ? "out" : p.stock === "Sắp hết hàng" ? "low" : ""}">${out ? "Tạm hết hàng – chưa nhận đặt mua" : p.left ? `Sắp hết – chỉ còn ${p.left} sản phẩm` : "Còn hàng"}${p.stores.length ? ` · Có sẵn tại ${esc(p.stores.join(", "))}` : ""}</p>
        ${out ? `<button class="btn block" onclick="openChat()">Hỏi trợ lý ảo khi nào có hàng</button>` : `<div class="buy"><div class="qty"><button type="button" onclick="stepQty(-1)" aria-label="Bớt">−</button><input id="qty" value="1" inputmode="numeric" aria-label="Số lượng" /><button type="button" onclick="stepQty(1)" aria-label="Thêm">+</button></div>
          <button class="btn ghost" onclick="addCart('${p.sku}')"><i class="fa-solid fa-cart-plus"></i>Thêm vào giỏ</button></div>
          <button class="btn buy-now" onclick="addCart('${p.sku}',true)"><b>MUA NGAY</b><small>${p.install ? "Giao và lắp đặt tận nhà" : "Giao tận nơi hoặc nhận tại siêu thị"}</small></button>
          ${p.installment ? `<div class="inst">${instBox(p)}</div>` : ""}`}
        <dl class="facts"><div><dt>Phí giao hàng</dt><dd>${finalPrice(p) > 5000000 ? "Miễn phí" : "30.000đ (miễn phí đơn trên 5 triệu)"}</dd></div><div><dt>Lắp đặt</dt><dd>${p.install ? "300.000đ, kỹ thuật viên ElectronicY" : "Không cần lắp đặt"}</dd></div></dl>
        <div class="ask"><b>Còn thắc mắc về sản phẩm?</b><span>Trợ lý ảo trả lời ngay về bảo hành, đổi trả, giao hàng.</span><button class="btn ghost sm" onclick="openChat()">Hỏi trợ lý ảo</button></div>
      </div></div>
    ${similar.length ? `<section class="block"><header><h2>Sản phẩm tương tự</h2><a href="#/nganh/${encodeURIComponent(p.category)}">Xem tất cả</a></header><div class="grid five">${similar.map(x => card(x)).join("")}</div></section>` : ""}</div>`;
}
// Tính trả góp: 0% khi có chương trình, ngược lại ước tính lãi 1,5%/tháng (công ty tài chính quyết định khi duyệt)
function instBox(p, months = 6, pre = 30) {
  const price = finalPrice(p), zero = !!p.zeroRate;
  const prepay = Math.round(price * pre / 100 / 1000) * 1000, loan = price - prepay;
  const monthly = Math.round((zero ? loan / months : loan / months + loan * 0.015) / 1000) * 1000;
  return `<h3>${zero ? "Trả góp 0% lãi suất" : "Trả góp qua công ty tài chính"}</h3>
    <div class="inst-row"><span>Kỳ hạn</span>${[6, 9, 12].map(m => `<button type="button" class="${m === months ? "on" : ""}" onclick="this.closest('.inst').innerHTML=instBox(product('${p.sku}'),${m},${pre})">${m} tháng</button>`).join("")}</div>
    <div class="inst-row"><span>Trả trước</span>${[0, 30, 50].map(v => `<button type="button" class="${v === pre ? "on" : ""}" onclick="this.closest('.inst').innerHTML=instBox(product('${p.sku}'),${months},${v})">${v}%</button>`).join("")}</div>
    <p>Trả trước <b>${money(prepay)}</b> · Góp mỗi tháng <b class="sale-t">${money(monthly)}</b> × ${months} tháng</p>
    <small>${zero ? esc(p.zeroRate) + "." : "Số tiền ước tính, lãi suất thực tế do công ty tài chính quyết định khi duyệt hồ sơ."} Chọn "Trả góp" ở bước thanh toán.</small>`;
}

function stepQty(d) { const i = $("qty"); i.value = Math.max(1, Math.min(10, (+i.value || 1) + d)); }
function addCart(sku, now) {
  const qty = Math.max(1, Math.min(10, +($("qty") ? $("qty").value : 1) || 1));
  const it = S.cart.find(x => x.sku === sku);
  if (it) it.qty = Math.min(10, it.qty + qty); else S.cart.push({ sku, qty });
  saveCart();
  if (now) location.hash = "#/gio-hang"; else toast("Đã thêm vào giỏ hàng");
}

// ---------- Giỏ hàng & thanh toán ----------
const CK = () => JSON.parse(sessionStorage.getItem("ey_ck") || "{}");
const setCK = o => sessionStorage.setItem("ey_ck", JSON.stringify({ ...CK(), ...o }));
const promoParam = () => CK().promo || "auto";
async function getQuote() { const c = CK(); return api("/api/shop/quote", { items: S.cart, pickup: c.pickup || "", promo: promoParam() }); }
function summary(q, cta) {
  return `<aside class="sum"><h2>Tóm tắt đơn</h2>
    <div class="row"><span>Tạm tính</span><b>${money(q.sub)}</b></div>
    ${q.discount ? `<div class="row ok"><span>Khuyến mãi ${esc(q.promo.name)}</span><b>−${money(q.discount)}</b></div>` : ""}
    <div class="row"><span>Phí giao hàng</span><b>${q.ship ? money(q.ship) : "Miễn phí"}</b></div>
    ${q.installFee ? `<div class="row"><span>Phí lắp đặt</span><b>${money(q.installFee)}</b></div>` : ""}
    <div class="row total"><span>Tổng thanh toán</span><b>${money(q.total)}</b></div>
    ${q.promo && q.promo.ok && q.promo.perk ? `<p class="ok-note">Ưu đãi: ${esc(q.promo.perk)}</p>` : ""}
    ${q.stockNote ? `<p class="muted">${esc(q.stockNote)}</p>` : ""}${cta}</aside>`;
}
async function viewCart() {
  if (!S.cart.length) return `<div class="wrap empty-state"><h1>Giỏ hàng đang trống</h1><p>Chọn sản phẩm bạn cần rồi quay lại đây để đặt hàng.</p><a class="btn primary" href="#/">Mua sắm ngay</a></div>`;
  const q = await getQuote(); const c = CK();
  const opts = q.options;
  return `<div class="wrap"><h1 class="pg">Giỏ hàng</h1><div class="two">
    <section>${q.errors.map(e => `<p class="alert">${esc(e)}</p>`).join("")}
      <ul class="lines">${S.cart.map(it => { const p = product(it.sku); if (!p) return `<li><span>Sản phẩm ${esc(it.sku)} đã ngừng bán</span><button class="link" onclick="rmCart('${it.sku}')">Xóa</button></li>`;
        return `<li>${pimg(p, "sm")}<div><a href="#/sp/${encodeURIComponent(p.sku)}"><b>${esc(p.name)}</b></a><small>${money(p.price)}${p.install ? " · có lắp đặt" : ""}</small></div>
          <div class="qty"><button type="button" onclick="setQty('${p.sku}',${it.qty - 1})" aria-label="Bớt">−</button><input value="${it.qty}" aria-label="Số lượng" onchange="setQty('${p.sku}',+this.value)"/><button type="button" onclick="setQty('${p.sku}',${it.qty + 1})" aria-label="Thêm">+</button></div>
          <b class="r">${money(p.price * it.qty)}</b><button class="link" onclick="rmCart('${p.sku}')">Xóa</button></li>`; }).join("")}</ul>
      <h2>Khuyến mãi</h2>
      ${opts.length ? `<div class="promos">${opts.map(o => { const on = q.promo && q.promo.ok && q.promo.id === o.id; return `<label class="promo ${o.ok ? "" : "no"} ${on ? "on" : ""}"><input type="radio" name="promo" ${on ? "checked" : ""} ${o.ok ? "" : "disabled"} onchange="setCK({promo:'${o.id}'});router.keepScroll=true;router()"/>
        <span><b>${esc(o.name)}</b>${on && q.promo.auto ? ` <em class="auto">Đã tự áp dụng</em>` : ""}<small>${esc(o.offer)}${o.ok ? (o.discount ? ` · giảm ${money(o.discount)} cho giỏ này` : "") : ` · ${esc(o.reason)}${o.hint ? ". " + esc(o.hint) : ""}`}</small></span></label>`; }).join("")}
        ${q.promo && q.promo.ok ? `<button class="link" onclick="setCK({promo:'none'});router.keepScroll=true;router()">Không dùng khuyến mãi</button>` : ""}</div>` : `<p class="muted">Hiện chưa có chương trình nào.</p>`}
      <form class="code" onsubmit="setCK({promo:this.code.value.trim()});router.keepScroll=true;router();return false"><input name="code" placeholder="Nhập mã giảm giá" aria-label="Mã giảm giá"/><button class="btn ghost">Áp dụng</button></form>
      ${q.promo && !q.promo.ok && !["auto", "none"].includes(c.promo) ? `<p class="alert soft">Không áp dụng được ${esc(q.promo.id)}: ${esc(q.promo.reason)}${q.promo.hint ? ". " + esc(q.promo.hint) : ""}. Giá giữ nguyên.</p>` : ""}
    </section>
    ${summary(q, `<a class="btn primary block ${q.errors.length ? "disabled" : ""}" href="${q.errors.length ? "javascript:void 0" : "#/thanh-toan"}">Tiến hành đặt hàng</a>`)}</div></div>`;
}
function setQty(sku, n) { const it = S.cart.find(x => x.sku === sku); if (!it) return; if (n < 1) return rmCart(sku); it.qty = Math.min(10, n); saveCart(); router.keepScroll = true; router(); }
function rmCart(sku) { S.cart = S.cart.filter(x => x.sku !== sku); saveCart(); router.keepScroll = true; router(); }

async function viewCheckout() {
  if (!loggedIn()) return needLogin("#/thanh-toan");
  if (!S.cart.length) { location.hash = "#/gio-hang"; return ""; }
  const c = CK(); const q = await getQuote(); const pf = S.me.profile;
  const r = c.receiver || { name: pf.name, phone: pf.phone, address: pf.address };
  return `<div class="wrap"><h1 class="pg">Đặt hàng</h1><div class="two"><form class="ck" id="ck" onsubmit="placeOrder();return false">
    ${q.errors.map(e => `<p class="alert">${esc(e)}</p>`).join("")}
    <h2>Nhận hàng</h2>
    <div class="seg"><label><input type="radio" name="how" value="" ${!c.pickup ? "checked" : ""} onchange="ckChange()"/> Giao tận nơi</label>
      ${S.catalog.pickupStores.map(s => `<label><input type="radio" name="how" value="${esc(s)}" ${c.pickup === s ? "checked" : ""} onchange="ckChange()"/> Nhận tại ${esc(s)}</label>`).join("")}</div>
    <div class="fields"><label>Họ tên người nhận<input id="rName" value="${esc(r.name)}" required/></label><label>Số điện thoại<input id="rPhone" value="${esc(r.phone)}" inputmode="tel" required/></label>
      ${c.pickup ? "" : `<label class="full">Địa chỉ giao hàng (số nhà, đường, phường, quận)<input id="rAddr" value="${esc(r.address)}" required/></label>`}
      <label class="full">Ghi chú cho đơn hàng<input id="rNote" value="${esc(c.note || "")}" placeholder="vd: gọi trước 30 phút, giao giờ hành chính"/></label>
      <label class="full chk"><input type="checkbox" id="rInv" ${c.invoice ? "checked" : ""} onchange="$('invBox').hidden=!this.checked"/> Xuất hóa đơn công ty</label>
      <label class="full" id="invBox" ${c.invoice ? "" : "hidden"}>Tên công ty, mã số thuế<input id="rInvText" value="${esc(c.invoice || "")}"/></label></div>
    <h2>Thanh toán</h2>
    <div class="pay">${[["COD", "Tiền mặt khi nhận hàng", "fa-money-bill"], ["Thẻ", "Thẻ ATM / Visa / Mastercard", "fa-credit-card"], ["Ví điện tử", "Ví điện tử", "fa-wallet"], ["Chuyển khoản", "Chuyển khoản ngân hàng", "fa-building-columns"], ["Trả góp", "Trả góp qua công ty tài chính", "fa-calendar-check"]]
      .map(([v, l, i]) => `<label class="${(c.method || "COD") === v ? "on" : ""}"><input type="radio" name="method" value="${v}" ${(c.method || "COD") === v ? "checked" : ""} onchange="ckChange()"/><i class="fa-solid ${i}"></i>${l}</label>`).join("")}</div>
    <p class="muted">Đơn thanh toán trực tuyến được giữ hàng 30 phút. Đơn trả góp cần đơn vị tài chính duyệt hồ sơ trước khi xác nhận.</p>
  </form>${summary(q, `<button class="btn primary block" form="ck" ${q.errors.length ? "disabled" : ""}>Xác nhận đặt hàng</button><a class="link" href="#/gio-hang">Quay lại giỏ hàng</a>`)}</div></div>`;
}
function readCK() {
  return { pickup: (document.querySelector("input[name=how]:checked") || {}).value || "", method: (document.querySelector("input[name=method]:checked") || {}).value || "COD",
    receiver: { name: $("rName").value.trim(), phone: $("rPhone").value.trim(), address: $("rAddr") ? $("rAddr").value.trim() : (CK().receiver || {}).address || "" },
    note: $("rNote").value.trim(), invoice: $("rInv").checked ? $("rInvText").value.trim() : "" };
}
function ckChange() { setCK(readCK()); router.keepScroll = true; router(); }
async function placeOrder() {
  const c = { ...CK(), ...readCK() }; setCK(c);
  const btn = document.querySelector(".sum .btn.primary"); if (btn) btn.disabled = true;
  try {
    const r = await api("/api/orders", { items: S.cart, pickup: c.pickup, promo: promoParam(), method: c.method, receiver: c.receiver, note: c.note, invoice: c.invoice });
    S.cart = []; saveCart(); sessionStorage.removeItem("ey_ck"); await loadMe();
    location.hash = ["Thẻ", "Ví điện tử", "Chuyển khoản"].includes(r.order.method) ? "#/cong-thanh-toan/" + r.order.id : "#/don/" + r.order.id;
    toast("Đã đặt hàng " + r.order.id);
  } catch (e) { toast(e.message, true); if (btn) btn.disabled = false; }
}
// Cổng thanh toán (mô phỏng)
function viewGateway(id) {
  if (!S.me) return needLogin();
  const o = S.me.orders.find(x => x.id === id);
  if (!o) return `<div class="wrap empty-state"><h1>Không tìm thấy đơn</h1></div>`;
  if (o.status !== "Chờ thanh toán") { location.hash = "#/don/" + id; return ""; }
  return `<div class="wrap narrow"><div class="gate"><span class="gate-brand"><i class="fa-solid fa-lock"></i> Cổng thanh toán (mô phỏng)</span>
    <h1>${money(o.total)}</h1><p>Thanh toán đơn <b>${o.id}</b> cho ElectronicY qua <b>${esc(o.method)}</b></p>
    ${o.method === "Chuyển khoản" ? `<dl class="facts"><div><dt>Ngân hàng</dt><dd>Vietcombank – CN Thủ Đức</dd></div><div><dt>Số tài khoản</dt><dd>0071 0000 12345</dd></div><div><dt>Nội dung</dt><dd>${o.id}</dd></div></dl>` : ""}
    <div class="gate-act"><button class="btn ghost" onclick="pay('${id}',false)">Hủy giao dịch</button><button class="btn primary" onclick="pay('${id}',true)">Xác nhận thanh toán</button></div>
    <p class="muted">Đây là trang giả lập cổng thanh toán cho mục đích demo, không trừ tiền thật.</p></div></div>`;
}
async function pay(id, ok) {
  try { await api(`/api/orders/${id}/pay`, { success: ok }); await loadMe(); toast(ok ? "Thanh toán thành công" : "Giao dịch chưa hoàn tất – bạn có thể thanh toán lại", !ok); location.hash = "#/don/" + id; }
  catch (e) { toast(e.message, true); }
}

// ---------- Đơn hàng của tôi ----------
const STEPS = ["Đặt hàng", "Thanh toán", "Xác nhận", "Chuẩn bị hàng", "Đang giao", "Hoàn tất"];
const stepOf = s => ({ "Chờ thanh toán": 1, "Chờ xác nhận": 2, "Đã xác nhận": 3, "Đã chuẩn bị xong": 4, "Đang giao": 4, "Giao thất bại": 4, "Hoàn tất": 6 }[s] ?? 1);
const friendly = s => ({ "Chờ thanh toán": "Chờ thanh toán", "Chờ xác nhận": "Đang xác nhận", "Đã xác nhận": "Đã xác nhận, đang chuẩn bị", "Đã chuẩn bị xong": "Đã đóng gói, chờ giao", "Đang giao": "Đang giao", "Giao thất bại": "Giao chưa thành công", "Hoàn tất": "Đã giao", "Đã hủy": "Đã hủy", "Hoàn hàng": "Đã hoàn về kho" }[s] || s);
const tone = s => ["Hoàn tất"].includes(s) ? "ok" : ["Đã hủy", "Hoàn hàng", "Giao thất bại"].includes(s) ? "bad" : ["Chờ thanh toán"].includes(s) ? "wait" : "info";
const EDITABLE = ["Chờ thanh toán", "Chờ xác nhận", "Đã xác nhận", "Đã chuẩn bị xong"];
function viewOrders() {
  if (!S.me) return needLogin("#/don-hang");
  const os = S.me.orders;
  return `<div class="wrap"><h1 class="pg">Đơn hàng của tôi</h1>${os.length ? `<ul class="orders">${os.map(o => `<li><a href="#/don/${o.id}">
    <div><b>${o.id}</b><small>Đặt ${fmtDate(o.date)} · ${esc(o.method)}</small></div>
    <div class="ol-items">${o.items.map(i => esc(i.name) + (i.qty > 1 ? " × " + i.qty : "")).join(", ")}</div>
    <b class="r">${money(o.total)}</b><span class="pill ${tone(o.status)}">${friendly(o.status)}</span></a></li>`).join("")}</ul>`
    : `<div class="empty-state"><p>Bạn chưa có đơn hàng nào.</p><a class="btn primary" href="#/">Mua sắm ngay</a></div>`}</div>`;
}
function viewOrder(id) {
  if (!S.me) return needLogin();
  const o = S.me.orders.find(x => x.id === id);
  if (!o) return `<div class="wrap empty-state"><h1>Không tìm thấy đơn ${esc(id)}</h1><a class="btn" href="#/don-hang">Xem đơn của tôi</a></div>`;
  const cur = stepOf(o.status), failed = ["Đã hủy", "Hoàn hàng", "Giao thất bại"].includes(o.status);
  const tickets = S.me.tickets.filter(t => t.order === id);
  return `<div class="wrap"><nav class="crumb"><a href="#/don-hang">Đơn hàng của tôi</a> / ${o.id}</nav>
    <div class="ord-head"><h1 class="pg">Đơn ${o.id}</h1><span class="pill ${tone(o.status)}">${friendly(o.status)}</span></div>
    ${["Đã hủy", "Hoàn hàng"].includes(o.status) ? "" : `<ol class="track">${STEPS.map((s, i) => `<li class="${i < cur ? "done" : i === cur ? (failed ? "fail" : "now") : ""}"><span></span>${s}</li>`).join("")}</ol>`}
    ${o.status === "Chờ thanh toán" && o.method !== "Trả góp" ? `<p class="alert soft">Đơn đang chờ thanh toán. Hàng được giữ 30 phút kể từ lúc đặt. <a class="btn primary sm" href="#/cong-thanh-toan/${o.id}">Thanh toán ngay</a> <button class="btn ghost sm" onclick="toCOD('${o.id}')">Đổi sang trả khi nhận hàng</button></p>` : ""}
    ${o.payStatus === "Chờ duyệt trả góp" ? `<p class="alert soft">Hồ sơ trả góp đang được đơn vị tài chính thẩm định. Chúng tôi sẽ báo kết quả qua điện thoại.</p>` : ""}
    ${o.status === "Giao thất bại" ? `<p class="alert soft">Lần giao vừa rồi chưa thành công. Nhân viên CSKH sẽ gọi để hẹn lại lịch giao.</p>` : ""}
    <div class="two"><section>
      <ul class="lines">${o.items.map((i, k) => `<li>${pimg(product(i.sku) || { name: i.name, category: "" }, "sm")}<div><b>${esc(i.name)}</b><small>${money(i.price)} × ${i.qty}${o.serials[k] ? " · Serial " + esc(o.serials[k]) : ""}</small></div><b class="r">${money(i.price * i.qty)}</b></li>`).join("")}</ul>
      <dl class="facts"><div><dt>Người nhận</dt><dd>${esc(o.customer)} · ${o.phone}</dd></div><div><dt>${o.pickup ? "Nhận hàng" : "Địa chỉ"}</dt><dd>${esc(o.address)}</dd></div>
        <div><dt>Thanh toán</dt><dd>${esc(o.method)} · ${esc(o.payStatus)}</dd></div>${o.delivery || o.installSchedule ? `<div><dt>Lịch giao${o.needInstall ? " & lắp đặt" : ""}</dt><dd>${fmtDate(o.delivery || o.installSchedule)}</dd></div>` : ""}</dl>
      <h2>Hành trình đơn hàng</h2><ul class="hist">${o.history.slice().reverse().map(h => `<li><time>${fmtTime(h.t)}</time>${esc(h.text)}</li>`).join("")}</ul>
      ${tickets.length ? `<h2>Yêu cầu hậu mãi</h2>${tickets.map(ticketRow).join("")}` : ""}
    </section>
    <aside class="sum"><h2>Thanh toán</h2><div class="row"><span>Tạm tính</span><b>${money(o.items.reduce((s, i) => s + i.qty * i.price, 0))}</b></div>
      ${o.discount ? `<div class="row ok"><span>Khuyến mãi</span><b>−${money(o.discount)}</b></div>` : ""}<div class="row"><span>Phí giao hàng</span><b>${o.ship ? money(o.ship) : "Miễn phí"}</b></div>
      ${o.installFee ? `<div class="row"><span>Phí lắp đặt</span><b>${money(o.installFee)}</b></div>` : ""}<div class="row total"><span>Tổng</span><b>${money(o.total)}</b></div>
      ${EDITABLE.includes(o.status) ? `${o.pickup ? "" : `<button class="btn ghost block" onclick="editAddress('${o.id}')">Đổi thông tin nhận hàng</button>`}<button class="btn danger block" onclick="cancelOrder('${o.id}')">Hủy đơn</button>` : ""}
      ${o.status === "Đang giao" ? `<p class="muted">Đơn đã bàn giao vận chuyển nên không thể hủy hoặc đổi địa chỉ. Sau khi nhận, bạn có thể gửi yêu cầu đổi trả trong 30 ngày.</p>` : ""}
      ${o.status === "Hoàn tất" ? `<button class="btn primary block" onclick="requestForm('${o.id}')">Gửi yêu cầu bảo hành / đổi trả</button>` : ""}
    </aside></div></div>`;
}
function ticketRow(t) {
  return `<div class="ticket"><div><b>${t.id} · ${esc(t.type)}</b><small>${esc(t.product)} · gửi ${fmtTime(t.created)}</small></div><span class="pill ${["Đã hoàn tất", "Đã đóng"].includes(t.status) ? "ok" : t.status === "Đã từ chối" ? "bad" : "info"}">${esc(t.status)}</span>
    ${t.slot && t.status === "Chờ thẩm định" ? `<p>Lịch kỹ thuật viên: ${fmtDate(t.slot)}</p>` : ""}
    ${t.decision ? `<p>Kết quả: ${esc(t.decision.kind)}${t.decision.reason ? " – " + esc(t.decision.reason) : ""}</p>` : ""}
    ${t.status === "Đã từ chối" && !t.complaintDone ? `<button class="link" onclick="complain('${t.id}')">Chưa đồng ý? Gửi khiếu nại</button>` : ""}</div>`;
}
async function toCOD(id) { try { await api(`/api/orders/${id}/method`, { method: "COD" }); await loadMe(); router(); toast("Đã đổi sang trả tiền khi nhận hàng"); } catch (e) { toast(e.message, true); } }
function cancelOrder(id) {
  sheet(`<h2>Hủy đơn ${id}?</h2><p>Hàng đang giữ sẽ được trả lại kho. Nếu bạn đã thanh toán, tiền được hoàn về đúng phương thức đã trả.</p>
    <label>Lý do (không bắt buộc)<select id="cxR"><option>Đổi ý, không mua nữa</option><option>Muốn đổi sản phẩm khác</option><option>Đặt nhầm</option><option>Thời gian giao không phù hợp</option></select></label>
    <div class="sheet-act"><button class="btn ghost" onclick="closeSheet()">Giữ đơn</button><button class="btn danger" onclick="doCancel('${id}')">Hủy đơn</button></div>`);
}
async function doCancel(id) { try { await api(`/api/orders/${id}/cancel`, { reason: $("cxR").value }); closeSheet(); await loadMe(); router(); toast("Đã hủy đơn " + id); } catch (e) { toast(e.message, true); } }
function editAddress(id) {
  const o = S.me.orders.find(x => x.id === id);
  sheet(`<h2>Đổi thông tin nhận hàng</h2><label>Họ tên<input id="eaN" value="${esc(o.customer)}"/></label><label>Số điện thoại<input id="eaP" value="${esc(o.phone)}"/></label><label>Địa chỉ<input id="eaA" value="${esc(o.address)}"/></label>
    <div class="sheet-act"><button class="btn ghost" onclick="closeSheet()">Đóng</button><button class="btn primary" onclick="doAddress('${id}')">Lưu thay đổi</button></div>`);
}
async function doAddress(id) { try { await api(`/api/orders/${id}/address`, { name: $("eaN").value, phone: $("eaP").value, address: $("eaA").value }); closeSheet(); await loadMe(); router(); toast("Đã cập nhật thông tin nhận hàng"); } catch (e) { toast(e.message, true); } }
function requestForm(id) {
  const o = S.me.orders.find(x => x.id === id);
  sheet(`<h2>Yêu cầu hậu mãi – đơn ${id}</h2>
    ${o.items.length > 1 ? `<label>Sản phẩm<select id="rqS">${o.items.map(i => `<option value="${i.sku}">${esc(i.name)}</option>`).join("")}</select></label>` : `<p><b>${esc(o.items[0].name)}</b>${o.serials[0] ? " · serial " + esc(o.serials[0]) : ""}</p>`}
    <label>Loại yêu cầu<select id="rqT"><option>Bảo hành</option><option>Đổi trả</option><option>Hoàn tiền</option><option>Hỗ trợ</option></select></label>
    <label>Mô tả vấn đề<textarea id="rqN" rows="3" placeholder="Tình trạng sản phẩm, lỗi xuất hiện từ khi nào"></textarea></label>
    <label>Ảnh / video (không bắt buộc)<input type="file" id="rqF" accept="image/*,video/*"/></label>
    <p class="muted">Đổi trả, hoàn tiền áp dụng trong 30 ngày với lỗi nhà sản xuất. Nhân viên CSKH sẽ kiểm tra điều kiện và liên hệ bạn – yêu cầu chưa phải kết quả cuối cùng.</p>
    <div class="sheet-act"><button class="btn ghost" onclick="closeSheet()">Đóng</button><button class="btn primary" onclick="doRequest('${id}')">Gửi yêu cầu</button></div>`);
}
async function doRequest(id) {
  try {
    const f = $("rqF").files[0];
    const r = await api("/api/tickets", { order: id, sku: $("rqS") ? $("rqS").value : "", type: $("rqT").value, note: $("rqN").value, file: f ? f.name : "" });
    closeSheet(); await loadMe(); router(); toast(`Đã gửi phiếu ${r.ticket.id}`);
  } catch (e) { toast(e.message, true); }
}
function complain(id) {
  sheet(`<h2>Khiếu nại phiếu ${id}</h2><label>Lý do bạn chưa đồng ý<textarea id="cpT" rows="3"></textarea></label><p class="muted">Quản lý CSKH sẽ xem xét lại và phản hồi.</p>
    <div class="sheet-act"><button class="btn ghost" onclick="closeSheet()">Đóng</button><button class="btn primary" onclick="doComplain('${id}')">Gửi khiếu nại</button></div>`);
}
async function doComplain(id) { try { await api(`/api/tickets/${id}/complain`, { text: $("cpT").value }); closeSheet(); await loadMe(); router(); toast("Đã gửi khiếu nại"); } catch (e) { toast(e.message, true); } }

// ---------- Bảo hành & hỗ trợ ----------
function viewSupport() {
  const mine = S.me ? S.me.warranties : [];
  return `<div class="wrap narrow"><h1 class="pg">Bảo hành & hỗ trợ</h1>
    <form class="lookup" onsubmit="lookup();return false"><label>Tra cứu bảo hành bằng số serial<div><input id="serial" placeholder="vd: DKF35-70415" required/><button class="btn primary">Tra cứu</button></div></label></form>
    <div id="lookupRes"></div>
    ${S.me ? `<h2>Sản phẩm của bạn</h2>${mine.length ? `<ul class="wl">${mine.map(w => `<li><div><b>${esc(w.product)}</b><small>Serial ${esc(w.serial)} · đơn <a href="#/don/${w.order}">${w.order}</a></small></div><span class="pill ${w.end >= new Date().toISOString().slice(0, 10) ? "ok" : "bad"}">${w.end >= new Date().toISOString().slice(0, 10) ? "Bảo hành đến " + fmtDate(w.end) : "Hết bảo hành"}</span></li>`).join("")}</ul>` : `<p class="muted">Bảo hành được kích hoạt tự động khi đơn giao thành công.</p>`}
      <h2>Yêu cầu đã gửi</h2>${S.me.tickets.length ? S.me.tickets.map(ticketRow).join("") : `<p class="muted">Bạn chưa gửi yêu cầu nào. Mở đơn đã giao để gửi yêu cầu bảo hành, đổi trả.</p>`}`
      : `<p class="muted"><a href="#/dang-nhap" onclick="sessionStorage.setItem('ey_back','#/ho-tro')">Đăng nhập</a> để xem sản phẩm đã mua và gửi yêu cầu bảo hành, đổi trả.</p>`}
    <p class="muted">Cần trợ giúp ngay? <a href="#" onclick="openChat();return false">Chat với trợ lý ảo</a> – nếu chưa giải quyết được, nhân viên CSKH sẽ tiếp nhận.</p></div>`;
}
async function lookup() {
  try { const w = await api("/api/shop/warranty?serial=" + encodeURIComponent($("serial").value.trim()));
    $("lookupRes").innerHTML = `<div class="ticket"><div><b>${esc(w.product)}</b><small>Serial ${esc(w.serial)} · kích hoạt ${fmtDate(w.start)} · ${w.months} tháng</small></div><span class="pill ${w.active ? "ok" : "bad"}">${w.active ? "Còn bảo hành đến " + fmtDate(w.end) : "Hết bảo hành từ " + fmtDate(w.end)}</span></div>`;
  } catch (e) { $("lookupRes").innerHTML = `<p class="alert">${esc(e.message)}</p>`; }
}

// ---------- Tài khoản ----------
function viewLogin(reg) {
  if (S.me) { location.hash = "#/tai-khoan"; return ""; }
  return `<div class="wrap narrow"><div class="auth"><h1>${reg ? "Tạo tài khoản" : "Đăng nhập"}</h1>
    <p class="muted">${reg ? "Dùng số điện thoại để theo dõi đơn hàng, bảo hành và nhận hỗ trợ." : "Đăng nhập bằng số điện thoại đã đặt hàng."}</p>
    <form onsubmit="${reg ? "doRegister" : "doLogin"}();return false">
      ${reg ? `<label>Họ tên<input id="auN" autocomplete="name" required/></label>` : ""}
      <label>Số điện thoại<input id="auP" inputmode="tel" autocomplete="tel" required/></label>
      <label>Mật khẩu${reg ? " (ít nhất 6 ký tự)" : ""}<input id="auW" type="password" autocomplete="${reg ? "new-password" : "current-password"}" required/></label>
      <button class="btn primary block">${reg ? "Tạo tài khoản" : "Đăng nhập"}</button></form>
    <p>${reg ? `Đã có tài khoản? <a href="#/dang-nhap">Đăng nhập</a>` : `Chưa có tài khoản? <a href="#/dang-ky">Tạo tài khoản</a>`}</p>
    ${reg ? "" : `<p class="demo-hint">Tài khoản mẫu: <button class="link" onclick="$('auP').value='0901234567';$('auW').value='123456'">0901234567 / 123456</button> (Nguyễn Văn An)</p>`}</div></div>`;
}
async function doLogin() {
  try { const r = await api("/api/customer/login", { phone: $("auP").value.trim(), password: $("auW").value }); await afterAuth(r); toast("Xin chào " + r.profile.name); }
  catch (e) { toast(e.message, true); }
}
async function doRegister() {
  try { const r = await api("/api/customer/register", { name: $("auN").value.trim(), phone: $("auP").value.trim(), password: $("auW").value }); await afterAuth(r); toast("Đã tạo tài khoản"); }
  catch (e) { toast(e.message, true); }
}
async function afterAuth(r) {
  localStorage.setItem("ey_shop_token", r.token); await loadMe(); connectEvents(); S.chat = null;
  if (S.chatOpen) startChat();
  const back = sessionStorage.getItem("ey_back"); sessionStorage.removeItem("ey_back");
  location.hash = back && !/dang-nhap|dang-ky/.test(back) ? back : "#/";
}
function viewAccount() {
  if (!S.me) return needLogin();
  const p = S.me.profile, t = S.me.tier, tiers = S.me.tiers || [];
  const slug = n => ({ "Đồng": "dong", "Bạc": "bac", "Vàng": "vang", "Kim cương": "kimcuong" })[n] || "dong";
  const card = t ? `<section class="tier-card t-${slug(t.name)}">
      <div class="tier-top"><span class="tier-medal"><i class="fa-solid ${t.name === "Kim cương" ? "fa-gem" : "fa-medal"}"></i></span>
        <div><small>Hạng thành viên</small><b>${esc(t.name)}</b></div><div class="tier-spent"><small>Tổng chi tiêu</small><b>${money(t.spent)}</b></div></div>
      <p class="tier-perk">${esc(t.perk)}</p>
      ${t.next ? `<div class="tier-bar" role="progressbar" aria-valuenow="${t.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(3, t.pct)}%"></i></div>
        <p class="tier-next">Mua thêm <b>${money(t.need)}</b> để lên hạng <b>${esc(t.next)}</b></p>` : `<p class="tier-next">Bạn đang ở hạng cao nhất. Cảm ơn bạn đã đồng hành cùng ElectronicY.</p>`}
      <ol class="tier-steps">${tiers.map((x, i) => `<li class="${i <= t.idx ? "on" : ""}"><b>${esc(x.name)}</b><span>${x.min ? "từ " + (x.min / 1e6) + " triệu" : "khi đăng ký"}</span></li>`).join("")}</ol>
    </section>` : "";
  return `<div class="wrap narrow"><h1 class="pg">Tài khoản</h1>${card}<form class="auth flat" onsubmit="saveProfile();return false">
    <label>Họ tên<input id="pfN" value="${esc(p.name)}"/></label><label>Số điện thoại<input value="${esc(p.phone)}" readonly/></label>
    <label>Địa chỉ giao hàng mặc định<input id="pfA" value="${esc(p.address)}" placeholder="Số nhà, đường, phường, quận"/></label>
    <button class="btn primary">Lưu thông tin</button></form>
    <div class="acct-links"><a href="#/don-hang">Đơn hàng của tôi (${S.me.orders.length})</a><a href="#/ho-tro">Bảo hành & yêu cầu (${S.me.tickets.length})</a><button class="link" onclick="logout()">Đăng xuất</button></div></div>`;
}
async function saveProfile() { try { S.me = await api("/api/me/profile", { name: $("pfN").value, address: $("pfA").value }); updateHeader(); toast("Đã lưu thông tin"); } catch (e) { toast(e.message, true); } }
async function logout() {
  api("/api/customer/logout", {}).catch(() => {}); localStorage.removeItem("ey_shop_token"); S.me = null; S.chat = null; updateHeader(); connectEvents();
  if (S.chatOpen) closeChat(); location.hash = "#/"; toast("Đã đăng xuất");
}

// ---------- Hộp nổi ----------
function sheet(html) { $("sheetIn").innerHTML = html; $("sheet").classList.add("show"); const f = $("sheetIn").querySelector("input,select,textarea"); if (f) f.focus(); }
function closeSheet() { $("sheet").classList.remove("show"); }
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeSheet(); } });

// =========================================================
//  KHUNG CHAT VỚI TRỢ LÝ ẢO / NHÂN VIÊN CSKH
// =========================================================
async function ensureChatToken() {
  if (token() || guestToken()) return;
  const r = await api("/api/guest", {}); localStorage.setItem("ey_guest_token", r.token); connectEvents();
}
async function startChat(fresh) {
  await ensureChatToken();
  try { S.chat = await api("/api/chat/start", { fresh: !!fresh }); drawChat(); }
  catch (e) { if (e.status === 401) { localStorage.removeItem("ey_guest_token"); await ensureChatToken(); S.chat = await api("/api/chat/start", {}); drawChat(); } else toast(e.message, true); }
}
function openChat() { S.chatOpen = true; $("chatBox").hidden = false; $("chatFab").hidden = true; $("chatDot").hidden = true; if (!S.chat) startChat(); else drawChat(); setTimeout(() => $("chatText").focus(), 50); }
function closeChat() { S.chatOpen = false; $("chatBox").hidden = true; $("chatFab").hidden = false; }
function drawChat(typing) {
  const c = S.chat; if (!c) return;
  $("chatWho").textContent = c.status === "Nhân viên đang hỗ trợ" ? c.agent : "Trợ lý ảo ElectronicY";
  $("chatSub").textContent = { "Trợ lý ảo": "Trả lời ngay", "Chờ nhân viên": "Đang chờ nhân viên CSKH tiếp nhận…", "Nhân viên đang hỗ trợ": "Nhân viên CSKH · trực tuyến", "Đã kết thúc": "Hội thoại đã kết thúc" }[c.status];
  $("chatLog").innerHTML = c.messages.map((m, i) => {
    if (m.from === "system") return `<div class="m sys">${esc(m.text)}</div>`;
    const btns = m.buttons ? `<div class="chips">${m.buttons.map((b, k) => `<button type="button" onclick="chatPick(${i},${k})">${esc(b.label)}</button>`).join("")}</div>` : "";
    return `<div class="m ${m.from === "customer" ? "me" : m.from}">${m.from === "agent" ? `<small>${esc(m.name || "Nhân viên CSKH")}</small>` : ""}<div class="b">${esc(m.text).replace(/\n/g, "<br>")}</div>${btns}</div>`;
  }).join("") + (typing ? `<div class="m bot"><div class="b typing"><i></i><i></i><i></i></div></div>` : "") +
    (c.status === "Đã kết thúc" ? `<div class="m sys"><button class="link" onclick="startChat(true)">Bắt đầu hội thoại mới</button></div>` : "");
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
  $("chatText").disabled = c.status === "Đã kết thúc";
}
async function chatSend(payload, echo) {
  if (!S.chat) return;
  if (echo) S.chat.messages.push({ from: "customer", text: echo });
  const botTurn = S.chat.status === "Trợ lý ảo" || S.chat.status === "Chờ nhân viên";
  drawChat(botTurn);
  try {
    const [r] = await Promise.all([api(`/api/chat/${S.chat.id}/send`, payload), new Promise(ok => setTimeout(ok, botTurn ? 550 : 0))]);
    S.chat = r; drawChat();
  } catch (e) { toast(e.message, true); S.chat = await api(`/api/chat/${S.chat.id}`); drawChat(); }
}
function chatPick(i, k) { const m = S.chat.messages[i]; const label = m.buttons[k].label; m.buttons = null; chatSend({ i, k }, label); }
$("chatForm").addEventListener("submit", e => { e.preventDefault(); const t = $("chatText").value.trim(); if (!t) return; $("chatText").value = ""; chatSend({ text: t }, t); });
$("chatFile").addEventListener("change", e => { const f = e.target.files[0]; if (!f) return; e.target.value = ""; chatSend({ file: f.name }, "📎 Đã gửi tệp: " + f.name); });

// =========================================================
//  CẬP NHẬT THỜI GIAN THỰC
// =========================================================
let ES = null;
// Dữ liệu đổi (trợ lý ảo trả lời trễ, tab khác đặt hàng…) → tải lại phần đang xem
let eventsOn = false;
function connectEvents() { if (eventsOn) return; eventsOn = true; ENGINE.onChange(() => onServerChange()); }
let changeTimer = null;
function onServerChange() {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(async () => {
    if (S.chat) {
      const before = S.chat.messages.length;
      try { S.chat = await api(`/api/chat/${S.chat.id}`); } catch (e) { return; }
      if (S.chatOpen) drawChat(); else if (S.chat.messages.length > before) $("chatDot").hidden = false;
    }
    const h = location.hash;
    if (S.me && /don|ho-tro|tai-khoan/.test(h)) { await loadMe(); if (!document.querySelector(".sheet.show") && document.activeElement.tagName !== "INPUT") { router.keepScroll = true; router(); } }
    if (/^#\/?$|nganh|tim|sp\/|gio-hang/.test(h)) { S.catalog = await api("/api/shop/catalog"); renderLive(); if (document.activeElement.tagName !== "INPUT") { router.keepScroll = true; router(); } }
  }, 250);
}

async function loadMe() { S.me = token() ? await api("/api/me").catch(() => null) : null; updateHeader(); }
function afterRender() {
  let t = $("trayHost"); if (!t) { t = document.createElement("div"); t.id = "trayHost"; document.body.appendChild(t); }
  t.innerHTML = compareTray();
  document.body.classList.toggle("has-tray", !!t.innerHTML);
  tickCountdown();
}
(async function init() {
  try { S.catalog = await api("/api/shop/catalog"); }
  catch (e) { $("view").innerHTML = `<div class="wrap empty-state"><h1>Không kết nối được máy chủ</h1><p>Hãy tải lại trang. Nếu vẫn lỗi, xóa dữ liệu trang web (localStorage) rồi thử lại.</p></div>`; return; }
  renderLive(); await loadMe(); connectEvents(); router();
})();
