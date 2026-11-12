/* =========================================================
   ELECTRONICY – NGHIỆP VỤ CỬA HÀNG CHẠY TRÊN TRÌNH DUYỆT
   Gồm: dữ liệu mẫu, quy tắc dùng chung, trợ lý ảo, giỏ hàng/khuyến mãi
   và lớp API giả lập máy chủ. Đóng gói trong một hàm để không đụng tên với shop.js.
   ========================================================= */
const ENGINE = (function () {
/* =========================================================
   CẤU HÌNH & DỮ LIỆU MẪU – Hệ thống quản lý bộ phận E-commerce ElectronicY
   Bám theo 6 quy trình trong báo cáo:
   QT1 Sản phẩm · QT2 Tồn kho · QT3 Khuyến mãi · QT4 Hậu mãi
   QT5 Đơn hàng · QT6 Giao hàng & lắp đặt
   Dữ liệu được lưu vào localStorage của trình duyệt (xem store.js).
   ========================================================= */

// ---------- Vai trò & menu được phép ----------
const ROLES = {
  admin:       { name: "Quản trị viên",        menus: ["tongquan", "nguoidung", "phanquyen", "nhatky"] },
  ql_ecom:     { name: "Quản lý E-commerce",   menus: ["tongquan", "sanpham", "khuyenmai", "tonkho", "donhang", "baocao"] },
  nv_ecom:     { name: "Nhân viên E-commerce", menus: ["tongquan", "sanpham", "khuyenmai", "tonkho", "donhang"] },
  ql_kho:      { name: "Quản lý kho",          menus: ["tongquan", "tonkho", "phieuxuat", "hanghoan", "baocao"] },
  nv_kho:      { name: "Nhân viên kho",        menus: ["tongquan", "tonkho", "phieuxuat", "hanghoan"] },
  nv_cskh:     { name: "Nhân viên CSKH",       menus: ["tongquan", "hoithoai", "haumai", "khachhang", "donhang", "giaolap"] },
  ql_cskh:     { name: "Quản lý CSKH",         menus: ["tongquan", "hoithoai", "haumai", "khachhang", "donhang", "giaolap", "baocao"] },
  nv_giaohang: { name: "Nhân viên giao hàng",  menus: ["tongquan", "giaolap", "doisoat"] },
  ktv:         { name: "Kỹ thuật viên",        menus: ["tongquan", "giaolap", "thamdinh"] }
};

const MENUS = [
  { id: "tongquan",  label: "Tổng quan",              icon: "fa-house" },
  { id: "hoithoai",  label: "Hội thoại khách hàng",   icon: "fa-comments",           group: "Chăm sóc khách hàng" },
  { id: "haumai",    label: "Phiếu hậu mãi",          icon: "fa-screwdriver-wrench", group: "Chăm sóc khách hàng" },
  { id: "khachhang", label: "Khách hàng",             icon: "fa-address-book",       group: "Chăm sóc khách hàng" },
  { id: "sanpham",   label: "Sản phẩm",               icon: "fa-box-open",           group: "Kinh doanh" },
  { id: "khuyenmai", label: "Khuyến mãi",             icon: "fa-tags",               group: "Kinh doanh" },
  { id: "donhang",   label: "Đơn hàng",               icon: "fa-receipt",            group: "Kinh doanh" },
  { id: "tonkho",    label: "Tồn kho",                icon: "fa-warehouse",          group: "Kho vận" },
  { id: "phieuxuat", label: "Soạn hàng & xuất kho",   icon: "fa-dolly",              group: "Kho vận" },
  { id: "hanghoan",  label: "Hàng hoàn, hàng lỗi",    icon: "fa-rotate-left",        group: "Kho vận" },
  { id: "giaolap",   label: "Giao hàng & lắp đặt",    icon: "fa-truck-fast",         group: "Kho vận" },
  { id: "doisoat",   label: "Đối soát COD",           icon: "fa-money-bill-transfer",group: "Kho vận" },
  { id: "thamdinh",  label: "Thẩm định & sửa chữa",   icon: "fa-stethoscope",        group: "Kho vận" },
  { id: "baocao",    label: "Báo cáo",                icon: "fa-chart-simple",       group: "Quản trị" },
  { id: "nguoidung", label: "Người dùng",             icon: "fa-users-gear",         group: "Quản trị" },
  { id: "phanquyen", label: "Phân quyền vai trò",     icon: "fa-user-shield",        group: "Quản trị" },
  { id: "nhatky",    label: "Nhật ký thao tác",       icon: "fa-clock-rotate-left",  group: "Quản trị" }
];


// ---------- Bộ phận (đăng nhập theo bộ phận, mỗi bộ phận có quản lý và nhân viên) ----------
const DEPARTMENTS = [
  { id: "ecom",    name: "Kinh doanh E-commerce", short: "E-commerce",  icon: "ecom",    roles: ["ql_ecom", "nv_ecom"],
    desc: "Sản phẩm, khuyến mãi, theo dõi đơn và doanh số" },
  { id: "kho",     name: "Kho vận",               short: "Kho vận",     icon: "kho",     roles: ["ql_kho", "nv_kho"],
    desc: "Tồn kho, soạn hàng, xuất kho, hàng hoàn" },
  { id: "cskh",    name: "Chăm sóc khách hàng",   short: "CSKH",        icon: "cskh",    roles: ["ql_cskh", "nv_cskh"],
    desc: "Hội thoại, phiếu hậu mãi, xác nhận đơn" },
  { id: "giaolap", name: "Giao hàng & lắp đặt",   short: "Giao lắp",    icon: "giaolap", roles: ["nv_giaohang", "ktv"],
    desc: "Lịch giao, lắp đặt, thẩm định, đối soát COD" },
  { id: "quantri", name: "Quản trị hệ thống",     short: "Quản trị",    icon: "quantri", roles: ["admin"],
    desc: "Tài khoản, phân quyền, nhật ký thao tác" }
];
const deptOf = role => DEPARTMENTS.find(d => d.roles.includes(role));

// ---------- Quy định, chính sách (mục 3.5 báo cáo) ----------
const POLICY = {
  returnDays: 30,               // đổi trả trong 30 ngày với lỗi nhà sản xuất
  promoBudgetLimit: 300000000,  // vượt ngân sách này phải cấp cao duyệt
  promoPercentLimit: 30,        // giảm trên 30% phải cấp cao duyệt
  promoWarnRate: 0.8,           // cảnh báo khi dùng 80% ngân sách / lượt
  maxRedelivery: 2,             // giao lại tối đa 2 lần
  bigOrder: 30000000,           // đơn từ 30 triệu cần xác minh
  otp: "123456"                 // OTP nghiệm thu (demo)
};

const STORES = ["Kho Thủ Đức", "Kho Tân Bình", "Siêu thị Quận 7", "Siêu thị Gò Vấp"];
const CATEGORIES = ["Tivi", "Tủ lạnh", "Máy lạnh", "Máy giặt", "Laptop", "Điện thoại", "Gia dụng"];

// ---------- Kho tri thức cho trợ lý ảo ----------
const KB = {
  "Máy lạnh": ["Vệ sinh lưới lọc bụi (tháo mặt nạ, rửa nước sạch, để khô).",
               "Kiểm tra remote đang ở chế độ Cool, nhiệt độ 24–26°C.",
               "Ống thoát nước ngưng không bị gập hoặc tắc ở đầu ra."],
  "Tivi":     ["Rút điện tivi 60 giây rồi cắm lại.",
               "Kiểm tra đúng nguồn vào (HDMI/TV) bằng nút Source.",
               "Vào Cài đặt > Hỗ trợ > Tự chẩn đoán để kiểm tra hình và tiếng."],
  "Tủ lạnh":  ["Đặt nhiệt độ ngăn mát ở mức 3–4°C, ngăn đá −18°C.",
               "Không để thực phẩm chắn cửa gió lạnh phía sau.",
               "Kiểm tra gioăng cửa đóng kín, không bị hở."],
  "Máy giặt": ["Vệ sinh lưới lọc xả ở góc dưới phía trước máy.",
               "Kiểm tra van nước cấp đã mở và áp lực nước đủ.",
               "Đặt máy cân bằng, không để quá tải lồng giặt."],
  "Laptop":   ["Giữ nút nguồn 15 giây để xả điện, sau đó khởi động lại.",
               "Cập nhật Windows và driver màn hình từ trang hỗ trợ của hãng.",
               "Kết nối màn hình ngoài để xác định lỗi ở màn hình hay card đồ họa."],
  "Điện thoại":["Khởi động lại máy (giữ nguồn + giảm âm lượng).",
               "Cập nhật phần mềm lên phiên bản mới nhất.",
               "Gỡ ốp lưng, kiểm tra cổng sạc không bám bụi."],
  "Gia dụng": ["Kiểm tra ổ cắm và dây nguồn.",
               "Vệ sinh bộ phận gia nhiệt theo sách hướng dẫn.",
               "Không dùng quá dung tích tối đa ghi trên sản phẩm."]
};

// ---------- Tài khoản mẫu ----------
const SEED_USERS = [
  { username: "admin",       password: "admin123", fullname: "Phạm Minh Quân",  role: "admin" },
  { username: "ql.ecom",     password: "123456",   fullname: "Võ Thị Lan Anh",  role: "ql_ecom" },
  { username: "nv.ecom",     password: "123456",   fullname: "Nguyễn Hoàng Nam",role: "nv_ecom" },
  { username: "ql.kho",      password: "123456",   fullname: "Lâm Đức Thịnh",   role: "ql_kho" },
  { username: "nv.kho",      password: "123456",   fullname: "Trần Văn Kiên",   role: "nv_kho" },
  { username: "nv.cskh",     password: "123456",   fullname: "Lê Thu Hà",       role: "nv_cskh" },
  { username: "nv.cskh2",    password: "123456",   fullname: "Phan Minh Tú",    role: "nv_cskh" },
  { username: "ql.cskh",     password: "123456",   fullname: "Đặng Ngọc Mai",   role: "ql_cskh" },
  { username: "nv.giaohang", password: "123456",   fullname: "Huỳnh Tấn Phát",  role: "nv_giaohang" },
  { username: "ktv",         password: "123456",   fullname: "Bùi Quốc Huy",    role: "ktv" }
];


// ---------- Lịch sử vận hành mẫu (tổng hợp theo ngày) – chỉ dùng cho dashboard báo cáo ----------
// Sinh tất định (cùng kết quả mỗi lần) cho khoảng 400 ngày trước hôm nay.
function genHistory(products, days = 400) {
  let seed = 20261106;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const sell = products.filter(p => p.status !== "Nháp" && p.status !== "Chờ phê duyệt");
  const weight = { "Điện thoại": 5, "Tivi": 3, "Máy lạnh": 3.2, "Máy giặt": 2, "Tủ lạnh": 2, "Laptop": 2.2, "Gia dụng": 3 };
  const pool = []; sell.forEach(p => { for (let k = 0; k < Math.round((weight[p.category] || 1) * 2); k++) pool.push(p); });
  const staff = ["nv.cskh", "nv.cskh2", "ql.cskh"];
  const out = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10), m = d.getMonth() + 1, dd = d.getDate(), dow = d.getDay();
    let f = (0.75 + 0.45 * (1 - i / days)) * (dow === 0 || dow === 6 ? 1.3 : 1) * (0.75 + rnd() * 0.5);
    if (m === dd) f *= 2.3;                                  // ngày đôi 9.9, 10.10, 11.11…
    if ((m === 4 && dd >= 20) || m === 5 || m === 6) f *= m === 4 ? 1.1 : 1.25;   // mùa nóng: máy lạnh
    const orders = Math.max(3, Math.round(13 * f));
    const day = { d: iso, o: orders, c: 0, r: 0, rev: 0, cat: {}, sku: {} };
    for (let k = 0; k < orders; k++) {
      let p = pool[Math.floor(rnd() * pool.length)];
      if ((m >= 4 && m <= 6) && rnd() < 0.25) p = sell.find(x => x.category === "Máy lạnh") || p;
      const qty = rnd() < 0.1 ? 2 : 1, amount = Math.round(p.price * qty * (rnd() < 0.35 ? 0.92 : 1) / 1000) * 1000;
      const x = rnd();
      if (x < 0.04) { day.c++; continue; }                   // đơn hủy
      if (x < 0.055) { day.r++; continue; }                  // giao thất bại / hoàn hàng
      day.rev += amount; day.cat[p.category] = (day.cat[p.category] || 0) + amount;
      day.sku[p.sku] = (day.sku[p.sku] || 0) + qty;
    }
    // CSKH
    const chats = Math.round(orders * (0.6 + rnd() * 0.5)), bot = Math.round(chats * (0.58 + rnd() * 0.14));
    day.ch = chats; day.bot = bot;
    day.tk = { "Hỗ trợ": chats - bot, "Bảo hành": Math.round(rnd() * 3), "Đổi trả": rnd() < 0.5 ? 1 : 0, "Hoàn tiền": rnd() < 0.25 ? 1 : 0 };
    const tkAll = Object.values(day.tk).reduce((a, b) => a + b, 0);
    day.st = {}; for (let k = 0; k < tkAll; k++) { const u = staff[rnd() < 0.45 ? 0 : rnd() < 0.8 ? 1 : 2]; day.st[u] = (day.st[u] || 0) + 1; }
    day.cs = Math.round(tkAll * 0.7); day.css = Math.round(day.cs * (4.1 + rnd() * 0.7));
    // Giao lắp & kho
    day.dl = orders - day.c; day.ok1 = Math.round(day.dl * (0.88 + rnd() * 0.09));
    day.ex = orders - day.c;
    day.rt = { "Giao thất bại": day.r, "Thu hồi đổi trả": day.tk["Đổi trả"] + day.tk["Hoàn tiền"], "Đơn hủy sau khi xuất kho": rnd() < 0.15 ? 1 : 0 };
    day.df = rnd() < 0.2 ? 1 : 0;
    out.push(day);
  }
  return out;
}

// ---------- Dữ liệu nghiệp vụ mẫu (ngày tính theo hôm nay) ----------
function SEED() {
  const D = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const T = (n, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d.toISOString(); };

  const products = [
    { sku: "TV-SS-55Q70", name: "Smart TV Samsung QLED 55\" Q70D", brand: "Samsung", category: "Tivi", price: 15990000, cost: 13200000, warranty: 24, install: true, bulky: true, hasImage: true,
      spec: "55 inch, 4K QLED, 120Hz, công suất 140W", status: "Đang kinh doanh", creator: "nv.ecom" },
    { sku: "TL-LG-GN-D392", name: "Tủ lạnh LG Inverter 393L", brand: "LG", category: "Tủ lạnh", price: 10490000, cost: 8700000, warranty: 24, install: false, bulky: true, hasImage: true,
      spec: "393L, Inverter, 2 cửa, 1 kWh/ngày", status: "Chờ phê duyệt", creator: "nv.ecom" },
    { sku: "ML-DK-FTKB35", name: "Máy lạnh Daikin Inverter 1.5HP", brand: "Daikin", category: "Máy lạnh", price: 12290000, cost: 10100000, warranty: 12, install: true, bulky: true, hasImage: true,
      spec: "1.5HP, Inverter, gas R32, 1.2 kW", status: "Đang kinh doanh", creator: "nv.ecom" },
    { sku: "MG-PN-NA-V10", name: "Máy giặt Panasonic 10kg", brand: "Panasonic", category: "Máy giặt", price: 9190000, cost: 7600000, warranty: 24, install: true, bulky: true, hasImage: false,
      spec: "10kg, cửa trên", status: "Nháp", creator: "nv.ecom", rejectReason: "Chưa có ảnh đại diện đạt chuẩn, thông số thiếu điện năng tiêu thụ." },
    { sku: "LT-ASUS-VB15", name: "Laptop ASUS Vivobook 15 i5", brand: "ASUS", category: "Laptop", price: 14490000, cost: 12500000, warranty: 24, install: false, bulky: false, hasImage: true,
      spec: "i5-1235U, 16GB, 512GB SSD, 15.6\" FHD", status: "Đang kinh doanh", creator: "nv.ecom" },
    { sku: "HB-XM-G10", name: "Máy hút bụi cầm tay Xiaomi G10", brand: "Xiaomi", category: "Gia dụng", price: 6490000, cost: 5100000, warranty: 12, install: false, bulky: false, hasImage: true,
      spec: "150AW, pin 65 phút, 450W", status: "Chờ phê duyệt", creator: "nv.ecom" },
    { sku: "DT-IP-16-128", name: "iPhone 16 128GB", brand: "Apple", category: "Điện thoại", price: 21990000, cost: 19800000, warranty: 12, install: false, bulky: false, hasImage: true,
      spec: "6.1\", A18, 128GB", status: "Đang kinh doanh", creator: "nv.ecom" },
    { sku: "MG-LG-FV1410", name: "Máy giặt LG AI DD 10kg", brand: "LG", category: "Máy giặt", price: 10990000, cost: 8900000, warranty: 24, install: true, bulky: true, hasImage: true,
      spec: "10kg, cửa trước, Inverter", status: "Đang kinh doanh", creator: "nv.ecom",
      draft: { status: "Chờ phê duyệt", by: "nv.ecom", changes: { price: 10490000, cost: 8600000 }, note: "Nhà cung cấp giảm giá vốn từ tháng này" } },
    { sku: "NC-SH-KD-30", name: "Nồi cơm điện Sharp 1.8L", brand: "Sharp", category: "Gia dụng", price: 1290000, cost: 950000, warranty: 12, install: false, bulky: false, hasImage: true,
      spec: "1.8L, nắp gài, 650W", status: "Tạm dừng kinh doanh", creator: "nv.ecom",
      disc: { reason: "Hãng ngừng sản xuất model", supplierNotified: true, supplierConfirmed: false } },
    { sku: "LV-TS-ER-A20", name: "Lò vi sóng Toshiba 20L", brand: "Toshiba", category: "Gia dụng", price: 2190000, cost: 1700000, warranty: 12, install: false, bulky: false, hasImage: true,
      spec: "20L, 800W", status: "Ngừng kinh doanh", creator: "nv.ecom" }
  ];

  const lots = (a, b) => [{ date: D(-75), qty: a }, { date: D(-14), qty: b }];
  const inventory = [
    { sku: "TV-SS-55Q70",  store: "Kho Thủ Đức",     actual: 42,  safety: 2, reserved: 6,  min: 10, defective: 1, lots: lots(12, 30) },
    { sku: "TV-SS-55Q70",  store: "Siêu thị Quận 7", actual: 5,   safety: 1, reserved: 2,  min: 6,  defective: 0, lots: lots(2, 3) },
    { sku: "ML-DK-FTKB35", store: "Kho Thủ Đức",     actual: 18,  safety: 2, reserved: 9,  min: 10, defective: 0, lots: lots(6, 12) },
    { sku: "DT-IP-16-128", store: "Kho Tân Bình",    actual: 120, safety: 5, reserved: 25, min: 30, defective: 0, lots: lots(40, 80) },
    { sku: "DT-IP-16-128", store: "Siêu thị Gò Vấp", actual: 0,   safety: 0, reserved: 0,  min: 8,  defective: 0, lots: [] },
    { sku: "MG-LG-FV1410", store: "Kho Thủ Đức",     actual: 14,  safety: 1, reserved: 3,  min: 5,  defective: 0, lots: lots(4, 10) },
    { sku: "LT-ASUS-VB15", store: "Kho Tân Bình",    actual: 4,   safety: 0, reserved: 0,  min: 5,  defective: 1, lots: lots(1, 3) },
    { sku: "NC-SH-KD-30",  store: "Kho Thủ Đức",     actual: 64,  safety: 0, reserved: 1,  min: 10, defective: 0, lots: lots(30, 34) },
    { sku: "TL-LG-GN-D392",store: "Kho Thủ Đức",     actual: 20,  safety: 1, reserved: 0,  min: 5,  defective: 0, lots: lots(0, 20) }
  ];


  // Thêm sản phẩm đang bán cho web bán hàng
  const more = [
    ["TV-LG-43UR", "Smart TV LG 4K 43 inch 43UR7550", "LG", "Tivi", 8490000, 7000000, 24, true, true, "43 inch, 4K UHD, webOS, 120W"],
    ["TV-SONY-65X80", "Google TV Sony 4K 65 inch X80L", "Sony", "Tivi", 22990000, 19500000, 24, true, true, "65 inch, 4K HDR, Google TV, 190W"],
    ["TV-TCL-55C645", "Google TV TCL QLED 55 inch C645", "TCL", "Tivi", 10990000, 9000000, 24, true, true, "55 inch, QLED 4K, Dolby Vision, 135W"],
    ["TL-SS-RT31", "Tủ lạnh Samsung Inverter 305 lít RT31", "Samsung", "Tủ lạnh", 7990000, 6500000, 24, false, true, "305L, Inverter, 2 cửa, 0.9 kWh/ngày"],
    ["TL-PN-NR-BV36", "Tủ lạnh Panasonic Inverter 322 lít", "Panasonic", "Tủ lạnh", 12490000, 10300000, 24, false, true, "322L, ngăn đá dưới, Prime Fresh, 0.95 kWh/ngày"],
    ["ML-PN-CU-N12", "Máy lạnh Panasonic Inverter 1.5HP N12", "Panasonic", "Máy lạnh", 11490000, 9500000, 12, true, true, "1.5HP, Inverter, Nanoe-G, 1.15 kW"],
    ["ML-CS-1HP", "Máy lạnh Casper Inverter 1HP", "Casper", "Máy lạnh", 6290000, 5000000, 12, true, true, "1HP, Inverter, gas R32, 0.85 kW"],
    ["MG-SS-WW90", "Máy giặt Samsung AI Inverter 9kg", "Samsung", "Máy giặt", 8990000, 7300000, 24, true, true, "9kg, cửa trước, Inverter, giặt hơi nước"],
    ["MG-TS-AW-K9", "Máy giặt Toshiba 9kg cửa trên", "Toshiba", "Máy giặt", 4990000, 3900000, 24, true, true, "9kg, cửa trên, lồng giặt ngôi sao"],
    ["LT-MAC-AIR13", "MacBook Air 13 inch M3 16GB/256GB", "Apple", "Laptop", 27990000, 25000000, 12, false, false, "Apple M3, 16GB, 256GB SSD, 13.6 inch"],
    ["LT-HP-15FD", "Laptop HP 15 i5 1334U 16GB/512GB", "HP", "Laptop", 15990000, 13600000, 12, false, false, "i5-1334U, 16GB, 512GB SSD, 15.6 inch FHD"],
    ["DT-SS-A55", "Samsung Galaxy A55 5G 8GB/128GB", "Samsung", "Điện thoại", 9490000, 8000000, 12, false, false, "6.6 inch, Exynos 1480, 128GB, pin 5000mAh"],
    ["DT-OP-RENO12", "OPPO Reno12 F 5G 8GB/256GB", "OPPO", "Điện thoại", 8490000, 7100000, 12, false, false, "6.67 inch, Dimensity 6300, 256GB, sạc 45W"],
    ["DT-IP-16PM", "iPhone 16 Pro Max 256GB", "Apple", "Điện thoại", 33990000, 31000000, 12, false, false, "6.9 inch, A18 Pro, 256GB, titan"],
    ["GD-PHL-NCD", "Nồi chiên không dầu Philips 6.2 lít", "Philips", "Gia dụng", 2490000, 1800000, 24, false, false, "6.2L, 1700W, công nghệ Rapid Air"],
    ["GD-SHP-LOC", "Máy lọc không khí Sharp FP-J40E", "Sharp", "Gia dụng", 3290000, 2500000, 12, false, false, "Diện tích 30m², Plasmacluster, 45W"]
  ];
  more.forEach(([sku, name, brand, category, price, cost, warranty, install, bulky, spec], i) => {
    products.push({ sku, name, brand, category, price, cost, warranty, install, bulky, hasImage: true, spec, status: "Đang kinh doanh", creator: "nv.ecom" });
    const big = bulky ? 12 : 30;
    inventory.push({ sku, store: i % 2 ? "Kho Tân Bình" : "Kho Thủ Đức", actual: big + (i * 7) % 20, safety: 1, reserved: 0, min: bulky ? 4 : 8, defective: 0, lots: lots(Math.floor(big / 2), Math.ceil(big / 2) + (i * 7) % 20) });
    if (i % 3 === 0) inventory.push({ sku, store: i % 2 ? "Siêu thị Gò Vấp" : "Siêu thị Quận 7", actual: 3 + i % 4, safety: 0, reserved: 0, min: 2, defective: 0, lots: lots(1, 2 + i % 4) });
  });

  // Giá sàn: giá thấp nhất được bán sau khuyến mãi (giá vốn + 20% biên lợi nhuận, làm tròn 10.000đ)
  products.forEach(p => { if (!p.floor) p.floor = Math.round((p.cost + (p.price - p.cost) * 0.2) / 10000) * 10000; });

  // Lịch sử chỉnh sửa mẫu: ai sửa, lúc nào, trường nào (cũ → mới)
  const NAM = { by: "Nguyễn Hoàng Nam", role: "Nhân viên E-commerce" }, ANH = { by: "Võ Thị Lan Anh", role: "Quản lý E-commerce" };
  const KIEN = { by: "Trần Văn Kiên", role: "Nhân viên kho" }, HA = { by: "Lê Thu Hà", role: "Nhân viên CSKH" };
  const ch = (f, label, from, to) => ({ f, label, from, to });
  products.forEach(p => {
    const born = p.sku.length % 5 + 40;
    p.history = [{ t: T(-born, 9), ...NAM, text: "Tạo hồ sơ sản phẩm và gửi quản lý duyệt" }];
    if (["Đang kinh doanh", "Tạm dừng kinh doanh", "Ngừng kinh doanh"].includes(p.status))
      p.history.push({ t: T(-born + 1, 14), ...ANH, text: "Duyệt và đưa sản phẩm lên website", changes: [ch("status", "Trạng thái", "Chờ phê duyệt", "Đang kinh doanh")] });
  });
  const H = sku => products.find(p => p.sku === sku).history;
  H("TV-SS-55Q70").push(
    { t: T(-12, 10), ...NAM, text: "Gửi duyệt bản cập nhật", changes: [ch("price", "Giá bán", 16490000, 15990000), ch("spec", "Thông số", "55\", 4K QLED", "55\", 4K QLED, Quantum HDR, 120Hz")] },
    { t: T(-11, 16), ...ANH, text: "Duyệt bản cập nhật, thông tin mới đã hiển thị trên website", changes: [ch("price", "Giá bán", 16490000, 15990000), ch("spec", "Thông số", "55\", 4K QLED", "55\", 4K QLED, Quantum HDR, 120Hz")] },
    { t: T(-11, 16), ...ANH, text: "Đã báo kho, CSKH và E-commerce cập nhật theo thông tin mới" },
    { t: T(-11, 17), ...KIEN, text: "Đã cập nhật tồn kho theo thông tin mới" },
    { t: T(-10, 9), ...HA, text: "Đã cập nhật thông tin sản phẩm để tư vấn, hỗ trợ khách" },
    { t: T(-10, 11), ...ANH, text: "Đã điều chỉnh các chương trình khuyến mãi có liên quan" },
    { t: T(-10, 11), ...ANH, text: "Kho, CSKH và E-commerce đều đã cập nhật xong – hoàn tất cập nhật sản phẩm" });
  H("MG-LG-FV1410").push({ t: T(-1, 9), ...NAM, text: "Gửi duyệt bản cập nhật", changes: [ch("price", "Giá bán", 10990000, 10490000), ch("cost", "Giá vốn", 8900000, 8600000)] });
  H("ML-DK-FTKB35").push({ t: T(-6, 15), ...NAM, text: "Cập nhật ảnh đại diện" });
  H("MG-PN-NA-V10").length = 0;
  H("MG-PN-NA-V10").push({ t: T(-4, 9), ...NAM, text: "Tạo hồ sơ sản phẩm và gửi quản lý duyệt" },
    { t: T(-3, 10), ...ANH, text: "Trả hồ sơ về để sửa: Chưa có ảnh đại diện đạt chuẩn, thông số thiếu điện năng tiêu thụ.", changes: [ch("status", "Trạng thái", "Chờ phê duyệt", "Nháp")] });
  products.find(p => p.sku === "MG-PN-NA-V10").rejections = [{ t: T(-3, 10), by: "Võ Thị Lan Anh", kind: "Hồ sơ mới", reason: "Chưa có ảnh đại diện đạt chuẩn, thông số thiếu điện năng tiêu thụ." }];
  const nc = products.find(p => p.sku === "NC-SH-KD-30");
  nc.history.push({ t: T(-3, 9), ...ANH, text: "Tạm dừng kinh doanh vì hãng ngừng sản xuất model – khách tạm thời không đặt mua được", changes: [ch("status", "Trạng thái", "Đang kinh doanh", "Tạm dừng kinh doanh")] },
    { t: T(-3, 9), ...ANH, text: "Đã báo kho, CSKH và E-commerce xử lý việc tạm dừng kinh doanh" },
    { t: T(-2, 10), ...NAM, text: "Đã thông báo nhà cung cấp dừng nhập hàng" },
    { t: T(-2, 14), ...HA, text: "Đã cập nhật thông tin để tư vấn, báo khách sản phẩm ngừng kinh doanh" });
  nc.step7 = { kind: "Ngừng kinh doanh", started: T(-3, 9), by: "Võ Thị Lan Anh", parties: {
    ql_ecom: { title: "Điều chỉnh các chương trình khuyến mãi có liên quan", done: false },
    nv_kho: { title: "Cập nhật tồn kho, xử lý hàng còn lại", done: false },
    nv_cskh: { title: "Cập nhật thông tin để tư vấn, báo khách sản phẩm ngừng kinh doanh", done: true, by: "Lê Thu Hà", t: T(-2, 14) } } };

  const P = sku => products.find(p => p.sku === sku);
  const item = (sku, qty = 1) => ({ sku, name: P(sku).name, qty, price: P(sku).price });
  const order = (o) => {
    const sub = o.items.reduce((s, i) => s + i.qty * i.price, 0);
    const ship = o.ship ?? (sub > 5000000 ? 0 : 30000);
    const inst = o.installFee ?? (o.needInstall ? 300000 : 0);
    return { discount: 0, promo: "", flags: [], history: [], serials: [], ...o, ship, installFee: inst, total: sub + ship + inst - (o.discount || 0) };
  };

  const orders = [
    order({ id: "DH10231", date: D(-1), customer: "Nguyễn Văn An", phone: "0901234567", address: "12 Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức", store: "Kho Thủ Đức",
            items: [item("TV-SS-55Q70")], needInstall: true, method: "Ví điện tử", payStatus: "Đã thanh toán", status: "Chờ xác nhận",
            discount: 2000000, promo: "KM-TV11" }),
    order({ id: "DH10230", date: D(0), customer: "Trần Thị Bích", phone: "0912345678", address: "Chung cư gần chợ Bà Chiểu", store: "Kho Thủ Đức",
            items: [item("MG-LG-FV1410")], needInstall: true, method: "COD", payStatus: "Chưa thanh toán (COD)", status: "Chờ xác nhận" }),
    order({ id: "DH10229", date: D(0), customer: "Trần Thị Bích", phone: "0912345678", address: "Chung cư gần chợ Bà Chiểu", store: "Kho Thủ Đức",
            items: [item("MG-LG-FV1410")], needInstall: true, method: "COD", payStatus: "Chưa thanh toán (COD)", status: "Chờ xác nhận" }),
    order({ id: "DH10228", date: D(0), customer: "Lê Văn Cường", phone: "0933456789", address: "77 Nguyễn Trãi, Quận 5", store: "Kho Tân Bình",
            items: [item("DT-IP-16-128", 2)], method: "Trả góp", payStatus: "Chờ duyệt trả góp", status: "Chờ thanh toán" }),
    order({ id: "DH10227", date: D(0), customer: "Phan Quốc Bảo", phone: "0938111222", address: "5 Trần Não, TP. Thủ Đức", store: "Kho Thủ Đức",
            items: [item("ML-DK-FTKB35")], needInstall: true, method: "Chuyển khoản", payStatus: "Chờ thanh toán", status: "Chờ thanh toán" }),
    order({ id: "DH10225", date: D(-2), customer: "Phạm Thu Dung", phone: "0987654321", address: "88 Nguyễn Thị Thập, Quận 7", store: "Siêu thị Quận 7",
            items: [item("TV-SS-55Q70")], needInstall: true, method: "Thẻ", payStatus: "Đã thanh toán", status: "Đã xác nhận", installSchedule: D(2) + " 15:00" }),
    order({ id: "DH10224", date: D(-2), customer: "Hoàng Gia Huy", phone: "0976543210", address: "45 Cộng Hòa, Tân Bình", store: "Kho Tân Bình",
            items: [item("DT-IP-16-128", 2)], method: "Chuyển khoản", payStatus: "Đã thanh toán", status: "Đã chuẩn bị xong",
            serials: ["IP16A-88120", "IP16A-88121"] }),
    order({ id: "DH10219", date: D(-3), customer: "Vũ Minh Khoa", phone: "0965432109", address: "12 Lê Văn Việt, TP. Thủ Đức", store: "Kho Thủ Đức",
            items: [item("ML-DK-FTKB35")], needInstall: true, method: "COD", payStatus: "Chưa thanh toán (COD)", status: "Đang giao",
            serials: ["DKF35-77120"], installSchedule: D(0) + " 14:00" }),
    order({ id: "DH10210", date: D(-6), customer: "Đỗ Ngọc Lan", phone: "0954321098", address: "9 Phan Xích Long, Phú Nhuận", store: "Kho Thủ Đức",
            items: [item("NC-SH-KD-30")], method: "COD", payStatus: "Chưa thanh toán (COD)", status: "Đang giao", serials: ["SHKD30-1102"] }),
    order({ id: "DH10190", date: D(-8), customer: "Ngô Bảo Long", phone: "0943210987", address: "21 Phan Văn Trị, Gò Vấp", store: "Kho Thủ Đức",
            items: [item("MG-LG-FV1410")], needInstall: true, method: "COD", payStatus: "Chưa thanh toán (COD)", status: "Giao thất bại", serials: ["LGFV-55012"] }),
    order({ id: "DH10160", date: D(-8), customer: "Đặng Thị Hồng", phone: "0908555444", address: "40 Kha Vạn Cân, TP. Thủ Đức", store: "Kho Thủ Đức",
            items: [item("TV-SS-55Q70")], needInstall: true, method: "Thẻ", payStatus: "Đã hoàn tiền", status: "Hoàn hàng", serials: ["SN55Q70A9012"] }),
    order({ id: "DH10101", date: D(-14), customer: "Bùi Thanh Sơn", phone: "0919333222", address: "17 Quang Trung, Gò Vấp", store: "Kho Thủ Đức",
            items: [item("MG-LG-FV1410")], needInstall: true, method: "COD", payStatus: "Chưa thanh toán (COD)", status: "Đã hủy", serials: ["LGFV-40210"] }),
    order({ id: "DH10185", date: D(-9), customer: "Mai Thanh Tâm", phone: "0932109876", address: "3 Hoàng Diệu, Quận 4", store: "Kho Thủ Đức",
            items: [item("LV-TS-ER-A20")], method: "Thẻ", payStatus: "Đã hoàn tiền", status: "Đã hủy" }),
    // Đơn đã giao xong – dùng cho hậu mãi & trợ lý ảo
    order({ id: "DH10172", date: D(-9), customer: "Lý Hồng Nhung", phone: "0921000111", address: "14 Võ Văn Tần, Quận 3", store: "Kho Tân Bình",
            items: [item("LT-ASUS-VB15")], method: "Thẻ", payStatus: "Đã thanh toán", status: "Hoàn tất", deliveredAt: D(-6), serials: ["ASVB15-55821"] }),
    order({ id: "DH10150", date: D(-210), customer: "Trịnh Văn Phúc", phone: "0909888777", address: "60 Lý Thường Kiệt, Quận 10", store: "Kho Thủ Đức",
            items: [item("ML-DK-FTKB35")], needInstall: true, method: "COD", payStatus: "Đã thanh toán", status: "Hoàn tất", deliveredAt: D(-205), serials: ["DKF35-60231"] }),
    order({ id: "DH10133", date: D(-14), customer: "Châu Mỹ Linh", phone: "0918777666", address: "102 Bà Huyện Thanh Quan, Quận 3", store: "Kho Thủ Đức",
            items: [item("NC-SH-KD-30")], method: "Ví điện tử", payStatus: "Đã thanh toán", status: "Hoàn tất", deliveredAt: D(-12), serials: ["SHKD30-0988"] }),
    order({ id: "DH10120", date: D(-45), customer: "Nguyễn Văn An", phone: "0901234567", address: "12 Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức", store: "Kho Thủ Đức",
            items: [item("ML-DK-FTKB35")], needInstall: true, method: "Thẻ", payStatus: "Đã thanh toán", status: "Hoàn tất", deliveredAt: D(-42), serials: ["DKF35-70415"] }),
    order({ id: "DH10098", date: D(-320), customer: "Tạ Quang Vinh", phone: "0977222333", address: "8 Nguyễn Văn Linh, Quận 7", store: "Siêu thị Quận 7",
            items: [item("TV-SS-55Q70")], needInstall: true, method: "Thẻ", payStatus: "Đã thanh toán", status: "Hoàn tất", deliveredAt: D(-318), serials: ["SN55Q70A1007"] })
  ];
  // Tồn "đang giữ" = đúng tổng số lượng của các đơn chưa xuất kho, tại đúng kho giữ hàng của đơn
  inventory.forEach(r => { r.reserved = 0; });
  orders.forEach(o => { if (["Chờ thanh toán", "Chờ xác nhận", "Đã xác nhận"].includes(o.status)) {
    o.reserved = true;
    o.items.forEach(it => { const r = inventory.find(x => x.sku === it.sku && x.store === o.store); if (r) r.reserved += it.qty; });
  } });
  orders.forEach(o => o.history.push({ t: T(o.date === D(0) ? 0 : -1, 8), by: "Hệ thống", text: "Tạo đơn hàng, trạng thái Chờ xác nhận" }));

  // Hồ sơ bảo hành kích hoạt khi đơn hoàn tất
  const warranties = [];
  orders.filter(o => o.status === "Hoàn tất").forEach(o => o.items.forEach((it, k) => {
    warranties.push({ serial: o.serials[k], order: o.id, sku: it.sku, product: it.name, phone: o.phone, customer: o.customer, start: o.deliveredAt, months: P(it.sku).warranty });
  }));

  const exportsList = [
    { id: "PX-2611-001", order: "DH10225", store: "Siêu thị Quận 7", items: [{ sku: "TV-SS-55Q70", name: P("TV-SS-55Q70").name, qty: 1 }], status: "Chờ soạn", serials: [], created: T(-1, 10) },
    { id: "PX-2611-002", order: "DH10224", store: "Kho Tân Bình", items: [{ sku: "DT-IP-16-128", name: P("DT-IP-16-128").name, qty: 2 }], status: "Đã xuất", serials: ["IP16A-88120", "IP16A-88121"], created: T(-1, 9), by: "nv.kho" },
    { id: "PX-2610-007", order: "DH10210", store: "Kho Thủ Đức", items: [{ sku: "NC-SH-KD-30", name: P("NC-SH-KD-30").name, qty: 1 }], status: "Đã xuất", serials: ["SHKD30-1102"], created: T(-5, 9), by: "nv.kho" },
    { id: "PX-2610-004", order: "DH10190", store: "Kho Thủ Đức", items: [{ sku: "MG-LG-FV1410", name: P("MG-LG-FV1410").name, qty: 1 }], status: "Đã xuất", serials: ["LGFV-55012"], created: T(-7, 9), by: "nv.kho" },
    { id: "PX-2610-003", order: "DH10160", store: "Kho Thủ Đức", items: [{ sku: "TV-SS-55Q70", name: P("TV-SS-55Q70").name, qty: 1 }], status: "Đã xuất", serials: ["SN55Q70A9012"], created: T(-7, 8), by: "nv.kho" },
    { id: "PX-2610-001", order: "DH10101", store: "Kho Thủ Đức", items: [{ sku: "MG-LG-FV1410", name: P("MG-LG-FV1410").name, qty: 1 }], status: "Đã xuất", serials: ["LGFV-40210"], created: T(-13, 8), by: "nv.kho" },
    { id: "PX-2611-000", order: "DH10219", store: "Kho Thủ Đức", items: [{ sku: "ML-DK-FTKB35", name: P("ML-DK-FTKB35").name, qty: 1 }], status: "Đã xuất", serials: ["DKF35-77120"], created: T(-2, 15), by: "nv.kho" }
  ];

  const returns = [
    { id: "HH-0092", source: "Giao thất bại", ref: "DH10190", sku: "MG-LG-FV1410", product: P("MG-LG-FV1410").name, store: "Kho Thủ Đức", serial: "LGFV-55012", status: "Chờ kiểm đếm", note: "Khách vắng nhà – shipper mang hàng về kho", created: T(-2, 17) },
    { id: "HH-0088", source: "Giao thất bại", ref: "DH10160", sku: "TV-SS-55Q70", product: P("TV-SS-55Q70").name, store: "Kho Thủ Đức", serial: "SN55Q70A9012", status: "Tồn hàng lỗi", condition: "Lỗi", note: "Vỡ góc màn hình khi vận chuyển", created: T(-6, 11) },
    { id: "HH-0080", source: "Đơn hủy sau khi xuất kho", ref: "DH10101", sku: "MG-LG-FV1410", product: P("MG-LG-FV1410").name, store: "Kho Thủ Đức", serial: "LGFV-40210", status: "Đã nhập tồn bán", condition: "Nguyên vẹn", created: T(-12, 14) }
  ];

  const promotions = [
    { id: "KM-1111", name: "Siêu sale 11.11", desc: "Giảm 10% điện thoại, tối đa 1.000.000đ cho đơn từ 3 triệu", scope: "Điện thoại", channel: "Website",
      type: "Giảm %", value: 10, maxDiscount: 1000000, minOrder: 3000000, tier: "Tất cả", limitTotal: 3000, limitPerCustomer: 1, combine: "Loại trừ",
      start: D(4), end: D(6), budget: 500000000, spent: 0, used: 0, status: "Chờ phê duyệt", creator: "nv.ecom", created: T(-1, 10) },
    { id: "KM-TV11", name: "Lễ hội Tivi tháng này", desc: "Giảm thẳng 2.000.000đ cho Smart TV Samsung 55\"", scope: "TV-SS-55Q70", channel: "Website",
      type: "Giảm tiền", value: 2000000, minOrder: 0, tier: "Tất cả", limitTotal: 150, limitPerCustomer: 1, combine: "Loại trừ",
      start: D(-6), end: D(24), budget: 300000000, spent: 248000000, used: 124, status: "Đang hoạt động", creator: "nv.ecom", approvedBy: "ql.ecom",
      rejectedCodes: [{ reason: "Chưa đạt giá trị tối thiểu", n: 0 }, { reason: "Đã dùng hết lượt/khách", n: 9 }] },
    { id: "KM-ML0", name: "Trả góp 0% máy lạnh", desc: "Trả góp 0% qua thẻ tín dụng, kỳ hạn 6 tháng", scope: "Máy lạnh", channel: "Website",
      type: "Trả góp 0%", value: 0, partner: "HD Saison", cards: "Visa, Mastercard", minOrder: 5000000, tier: "Tất cả", limitTotal: 500, limitPerCustomer: 1, combine: "Cộng dồn",
      start: D(3), end: D(32), budget: 80000000, spent: 0, used: 0, status: "Đã duyệt", creator: "nv.ecom", approvedBy: "ql.ecom" },
    { id: "KM-NOEL", name: "Giáng sinh ấm áp", desc: "Tặng nồi cơm điện cho đơn tủ lạnh", scope: "Tủ lạnh", channel: "Website",
      type: "Quà tặng", value: 0, gift: "NC-SH-KD-30", giftQty: 200, minOrder: 8000000, tier: "Tất cả", limitTotal: 200, limitPerCustomer: 1, combine: "Cộng dồn",
      start: D(40), end: D(50), budget: 258000000, spent: 0, used: 0, status: "Nháp", creator: "nv.ecom", rejectReason: "Quà tặng là sản phẩm tạm dừng kinh doanh, đề nghị đổi quà khác." },
    { id: "KM-FLASH", name: "Giờ vàng giá sốc", desc: "Giảm 15% cho máy lạnh, máy giặt, tối đa 1.500.000đ – số lượng có hạn", scope: ["Máy lạnh", "Máy giặt"], channel: "Website",
      type: "Giảm %", value: 15, maxDiscount: 1500000, minOrder: 0, tier: "Tất cả", limitTotal: 120, limitPerCustomer: 1, combine: "Loại trừ",
      start: D(0), end: D(2), budget: 150000000, spent: 61000000, used: 47, status: "Đang hoạt động", creator: "nv.ecom", approvedBy: "ql.ecom" },
    { id: "KM-PHONE0", name: "Trả góp 0% điện thoại", desc: "Trả góp 0% lãi suất 6 tháng qua thẻ tín dụng cho điện thoại", scope: "Điện thoại", channel: "Website",
      type: "Trả góp 0%", value: 0, partner: "Home Credit", cards: "Visa, Mastercard, JCB", minOrder: 3000000, tier: "Tất cả", limitTotal: 1000, limitPerCustomer: 1, combine: "Cộng dồn",
      start: D(-10), end: D(50), budget: 100000000, spent: 12000000, used: 40, status: "Đang hoạt động", creator: "nv.ecom", approvedBy: "ql.ecom" },
    { id: "KM-GIFT-LT", name: "Mua laptop tặng chuột", desc: "Tặng chuột không dây cho mọi laptop", scope: ["LT-ASUS-VB15", "LT-HP-15FD", "LT-MAC-AIR13"], channel: "Website",
      type: "Quà tặng", value: 0, gift: "Chuột không dây", giftQty: 300, minOrder: 0, tier: "Tất cả", limitTotal: 300, limitPerCustomer: 1, combine: "Cộng dồn",
      start: D(-5), end: D(25), budget: 45000000, spent: 3000000, used: 20, status: "Đang hoạt động", creator: "nv.ecom", approvedBy: "ql.ecom" },
    { id: "KM-BTS", name: "Back to school", desc: "Tặng balo khi mua laptop", scope: "Laptop", channel: "Website",
      type: "Quà tặng", value: 0, gift: "Balo laptop", giftQty: 400, minOrder: 10000000, tier: "Tất cả", limitTotal: 400, limitPerCustomer: 1, combine: "Cộng dồn",
      start: D(-90), end: D(-40), budget: 120000000, spent: 120000000, used: 400, status: "Đã kết thúc", creator: "nv.ecom", approvedBy: "ql.ecom",
      revenue: 4980000000, conversion: 3.4, returnRate: 1.2 }
  ];

  const deliveries = [
    { id: "GL-7781", order: "DH10219", address: "12 Lê Văn Việt, TP. Thủ Đức", area: "Thủ Đức", kind: "Cồng kềnh, cần lắp đặt", shipper: "nv.giaohang", tech: "ktv",
      schedule: D(0) + " 14:00", cod: 13290000, status: "Đang giao", attempts: 0, contacted: true },
    { id: "GL-7782", order: "DH10224", address: "45 Cộng Hòa, Tân Bình", area: "Tân Bình", kind: "Hàng nhỏ", shipper: "", tech: "",
      schedule: "", cod: 0, status: "Chờ phân công", attempts: 0 },
    { id: "GL-7779", order: "DH10210", address: "9 Phan Xích Long, Phú Nhuận", area: "Phú Nhuận", kind: "Hàng nhỏ", shipper: "nv.giaohang", tech: "",
      schedule: D(0) + " 10:00", cod: 1290000, status: "Chờ giao", attempts: 0 },
    { id: "GL-7770", order: "DH10190", address: "21 Phan Văn Trị, Gò Vấp", area: "Gò Vấp", kind: "Cồng kềnh, cần lắp đặt", shipper: "nv.giaohang", tech: "ktv",
      schedule: D(-2) + " 10:00", cod: 11290000, status: "Giao thất bại", attempts: 1, failReason: "Khách vắng nhà" },
    { id: "GL-7760", order: "DH10160", address: "40 Kha Vạn Cân, TP. Thủ Đức", area: "Thủ Đức", kind: "Cồng kềnh, cần lắp đặt", shipper: "nv.giaohang", tech: "ktv",
      schedule: D(-6) + " 09:00", cod: 0, status: "Hoàn hàng", attempts: 1, failReason: "Khách từ chối nhận – vỡ góc màn hình" },
    { id: "GL-7712", order: "DH10120", address: "12 Lê Văn Việt, TP. Thủ Đức", area: "Thủ Đức", kind: "Cồng kềnh, cần lắp đặt", shipper: "nv.giaohang", tech: "ktv",
      schedule: D(-42) + " 09:00", cod: 0, status: "Hoàn tất", attempts: 0, codSettled: true },
    { id: "GL-7740", order: "DH10172", address: "14 Võ Văn Tần, Quận 3", area: "Quận 3", kind: "Hàng nhỏ", shipper: "nv.giaohang", tech: "",
      schedule: D(-6) + " 16:00", cod: 0, status: "Hoàn tất", attempts: 0, codSettled: true }
  ];

  // Tiền COD của chuyến giao luôn khớp tổng tiền đơn chưa thanh toán
  deliveries.forEach(d => { const o = orders.find(x => x.id === d.order); if (o) d.cod = o.method === "COD" && /^Chưa/.test(o.payStatus) ? o.total : 0; });

  const chats = [
    { id: "C-1042", customer: "Nguyễn Văn An", phone: "0901234567", status: "Chờ nhân viên", agent: "", created: T(0, 8, 41), ticket: "YC-503",
      summary: "Máy lạnh Daikin 1.5HP (đơn DH10120) chảy nước trong nhà. Đã thử 3 cách khắc phục cơ bản nhưng chưa hết.",
      tried: KB["Máy lạnh"], bot: { step: "handoff" },
      messages: [
        { from: "bot", t: T(0, 8, 41), text: "Xin chào! Mình là trợ lý ảo ElectronicY. Anh/chị vui lòng nhập số điện thoại đặt hàng để mình xác thực nhé." },
        { from: "customer", t: T(0, 8, 42), text: "0901234567" },
        { from: "bot", t: T(0, 8, 42), text: "Chào anh Nguyễn Văn An. Mình có thể giúp gì cho anh?" },
        { from: "customer", t: T(0, 8, 43), text: "Máy lạnh nhà mình bị chảy nước" },
        { from: "bot", t: T(0, 8, 43), text: "Anh thử lần lượt các bước sau giúp mình:\n" + KB["Máy lạnh"].map((s, i) => `${i + 1}. ${s}`).join("\n") },
        { from: "customer", t: T(0, 8, 51), text: "Làm hết rồi mà vẫn chảy nước" },
        { from: "system", t: T(0, 8, 51), text: "Trợ lý ảo đã chuyển hội thoại cho nhân viên CSKH kèm tóm tắt. Phiếu YC-503 được tạo." },
        { from: "bot", t: T(0, 8, 51), text: "Mình đã chuyển yêu cầu cho nhân viên CSKH, anh vui lòng chờ trong giây lát nhé." }
      ] },
    { id: "C-1039", customer: "Lý Hồng Nhung", phone: "0921000111", status: "Trợ lý ảo", agent: "", created: T(-1, 19, 5), ticket: "YC-501", bot: { step: "menu" },
      messages: [
        { from: "bot", t: T(-1, 19, 5), text: "Xin chào! Mình là trợ lý ảo ElectronicY. Anh/chị vui lòng nhập số điện thoại đặt hàng để mình xác thực nhé." },
        { from: "customer", t: T(-1, 19, 6), text: "0921000111" },
        { from: "customer", t: T(-1, 19, 7), text: "Laptop mới mua 3 ngày màn hình bị sọc, mình muốn đổi" },
        { from: "bot", t: T(-1, 19, 9), text: "Mình đã tạo phiếu YC-501 (Đổi trả) cho đơn DH10172. Yêu cầu đang được xem xét, nhân viên CSKH sẽ liên hệ chị sớm." }
      ] },
    { id: "C-1035", customer: "Khách chưa xác thực", phone: "", status: "Đã kết thúc", agent: "", created: T(-2, 14, 2), rating: 5, bot: { step: "done" },
      messages: [
        { from: "customer", t: T(-2, 14, 2), text: "Đổi trả trong bao nhiêu ngày vậy shop?" },
        { from: "bot", t: T(-2, 14, 2), text: "ElectronicY hỗ trợ đổi trả trong 30 ngày kể từ ngày nhận hàng với lỗi do nhà sản xuất." },
        { from: "system", t: T(-2, 14, 3), text: "Khách đánh giá 5/5 sao." }
      ] }
  ];

  const tickets = [
    { id: "YC-503", chat: "C-1042", order: "DH10120", customer: "Nguyễn Văn An", phone: "0901234567", type: "Hỗ trợ", priority: "Trung bình",
      product: P("ML-DK-FTKB35").name, sku: "ML-DK-FTKB35", serial: "DKF35-70415", note: "Máy lạnh chảy nước trong nhà, đã thử vệ sinh lưới lọc và kiểm tra ống thoát.",
      status: "Chờ tiếp nhận", assignee: "", created: T(0, 8, 51), history: [{ t: T(0, 8, 51), by: "Trợ lý ảo", text: "Tạo phiếu và chuyển CSKH kèm tóm tắt" }] },
    { id: "YC-501", chat: "C-1039", order: "DH10172", customer: "Lý Hồng Nhung", phone: "0921000111", type: "Đổi trả", priority: "Cao",
      product: P("LT-ASUS-VB15").name, sku: "LT-ASUS-VB15", serial: "ASVB15-55821", note: "Màn hình sọc ngang sau 3 ngày sử dụng. Đính kèm 2 ảnh.",
      status: "Chờ tiếp nhận", assignee: "", created: T(-1, 19, 9), history: [{ t: T(-1, 19, 9), by: "Trợ lý ảo", text: "Tạo phiếu Đổi trả từ khung chat" }] },
    { id: "YC-498", chat: "", order: "DH10150", customer: "Trịnh Văn Phúc", phone: "0909888777", type: "Bảo hành", priority: "Trung bình",
      product: P("ML-DK-FTKB35").name, sku: "ML-DK-FTKB35", serial: "DKF35-60231", note: "Máy chạy nhưng không lạnh.",
      status: "Chờ thẩm định", assignee: "nv.cskh", eligible: "Còn bảo hành", inspection: { tech: "ktv", slot: D(1) + " 09:00–11:00", place: "Tại nhà khách" },
      created: T(-3, 10), history: [{ t: T(-3, 10), by: "Lê Thu Hà", text: "Tiếp nhận qua tổng đài" }, { t: T(-2, 9), by: "Lê Thu Hà", text: "Đủ điều kiện bảo hành, đặt lịch KTV kiểm tra" }] },
    { id: "YC-495", chat: "", order: "DH10133", customer: "Châu Mỹ Linh", phone: "0918777666", type: "Hoàn tiền", priority: "Trung bình",
      product: P("NC-SH-KD-30").name, sku: "NC-SH-KD-30", serial: "SHKD30-0988", note: "Nồi không giữ ấm, không đúng mô tả.",
      status: "Chờ quyết định", assignee: "nv.cskh", eligible: "Trong hạn đổi trả", inspection: { tech: "ktv", slot: D(-2) + " 14:00–16:00", place: "Tại siêu thị", result: "Lỗi nhà sản xuất", note: "Cảm biến nhiệt hỏng." },
      created: T(-5, 10), history: [{ t: T(-5, 10), by: "Lê Thu Hà", text: "Tiếp nhận từ biểu mẫu trang đơn hàng" }, { t: T(-2, 16), by: "Bùi Quốc Huy", text: "Kết luận: Lỗi nhà sản xuất" }] },
    { id: "YC-480", chat: "", order: "DH10098", customer: "Tạ Quang Vinh", phone: "0977222333", type: "Bảo hành", priority: "Thấp",
      product: P("TV-SS-55Q70").name, sku: "TV-SS-55Q70", serial: "SN55Q70A1007", note: "Mất tiếng.",
      status: "Đã đóng", assignee: "nv.cskh2", eligible: "Còn bảo hành", inspection: { tech: "ktv", result: "Lỗi nhà sản xuất", note: "Thay bo âm thanh" },
      decision: { kind: "Sửa chữa bảo hành" }, survey: 5, created: T(-20, 10), history: [{ t: T(-15, 10), by: "Phan Minh Tú", text: "Đóng phiếu, gửi khảo sát" }] }
  ];

  // Tài khoản khách hàng trên web bán hàng (mật khẩu mẫu 123456)
  const customers = [];
  orders.forEach(o => { if (!customers.some(c => c.phone === o.phone)) customers.push({ phone: o.phone, name: o.customer, address: o.address, password: "123456", created: T(-60) }); });
  // Chi tiêu tích lũy trước khi có web (từ siêu thị) để xếp hạng thành viên Đồng / Bạc / Vàng / Kim cương
  const PREV = [92000000, 41000000, 12500000, 0, 33000000, 6000000, 18000000, 0, 85000000, 2500000];
  customers.forEach((c, i) => { c.prevSpent = PREV[i % PREV.length]; });

  chats.forEach(c => { if (c.phone) c.owner = "c:" + c.phone; });

  return {
    v: 3,
    history: genHistory(products),
    customers,
    users: SEED_USERS.map(u => ({ ...u, locked: false })),
    products, inventory, movements: [
      { t: T(-1, 7), sku: "DT-IP-16-128", store: "Kho Tân Bình", type: "Nhập hàng", qty: 80, by: "Hệ thống kho" },
      { t: T(-1, 15), sku: "TV-SS-55Q70", store: "Siêu thị Quận 7", type: "Xuất bán kênh khác", qty: -2, by: "POS siêu thị" }
    ],
    restock: [], promotions, orders, exports: exportsList, returns, deliveries, warranties, tickets, chats,
    tasks: [
      { id: "TK-1", role: "nv_kho", title: "Cập nhật tồn kho, xử lý hàng còn lại: Nồi cơm điện Sharp 1.8L", ref: "NC-SH-KD-30", step7: true, done: false },
      { id: "TK-2", role: "nv_cskh", title: "Cập nhật thông tin để tư vấn, báo khách sản phẩm ngừng kinh doanh: Nồi cơm điện Sharp 1.8L", ref: "NC-SH-KD-30", step7: true, done: true },
      { id: "TK-3", role: "ql_ecom", title: "Điều chỉnh các chương trình khuyến mãi có liên quan: Nồi cơm điện Sharp 1.8L", ref: "NC-SH-KD-30", step7: true, done: false },
      { id: "TK-4", role: "nv_ecom", title: "Báo nhà cung cấp dừng nhập Nồi cơm điện Sharp 1.8L và ghi nhận xác nhận", ref: "NC-SH-KD-30", done: false }
    ],
    notifications: [
      { id: "N-1", roles: ["nv_cskh", "ql_cskh"], text: "Trợ lý ảo chuyển hội thoại C-1042 (Nguyễn Văn An) cho CSKH", page: "hoithoai", ref: "C-1042", t: T(0, 8, 51), readBy: [] },
      { id: "N-2", roles: ["ql_ecom"], text: "Khuyến mãi KM-1111 đang chờ bạn phê duyệt", page: "khuyenmai", t: T(-1, 10), readBy: [] },
      { id: "N-3", roles: ["nv_kho", "nv_ecom"], text: "iPhone 16 128GB tại Siêu thị Gò Vấp đã hết hàng khả dụng", page: "tonkho", t: T(-1, 15), readBy: [] },
      { id: "N-4", roles: ["ktv"], text: "Bạn có lịch thẩm định phiếu YC-498 ngày mai", page: "thamdinh", t: T(-2, 9), readBy: [] }
    ],
    audit: [
      { t: T(-1, 10), user: "Nguyễn Hoàng Nam", role: "Nhân viên E-commerce", text: "Gửi duyệt chương trình KM-1111" },
      { t: T(-2, 9), user: "Lê Thu Hà", role: "Nhân viên CSKH", text: "Phiếu YC-498: đặt lịch thẩm định với KTV" }
    ]
  };
}

/* =========================================================
   LƯU TRỮ & NGHIỆP VỤ DÙNG CHUNG
   - Dữ liệu lưu ở localStorage nên các tab (trang nội bộ và
     khung chat khách hàng) nhìn thấy thay đổi của nhau ngay.
   - Nút "Khôi phục dữ liệu mẫu" (Quản trị viên / trang đăng nhập)
     đưa mọi thứ về ban đầu.
   ========================================================= */
const DB_KEY = "ey_shop_db_v1";
let DB = null;
let ACTOR = { name: "Hệ thống", role: "" };   // người đang thao tác, dùng cho nhật ký

function loadDB() {
  try { DB = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { DB = null; }
  if (!DB || DB.v !== 3) { DB = SEED(); saveDB(); }
  return DB;
}
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { /* bộ nhớ đầy */ } }
function resetDB() { DB = SEED(); saveDB(); }

// Đồng bộ giữa các tab (chỉ dùng khi chạy không có server)
if (typeof window !== "undefined" && typeof localStorage !== "undefined") window.addEventListener("storage", e => {
  if (e.key !== DB_KEY || !e.newValue) return;
  DB = JSON.parse(e.newValue);
  if (typeof window.onDBChange === "function") window.onDBChange();
});

// ---------- Tiện ích ----------
const money = n => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = s => s ? s.slice(0, 10).split("-").reverse().join("/") + (s.length > 10 && s[10] === " " ? s.slice(10) : "") : "—";
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso), n = new Date();
  const hm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === n.toDateString()) return hm;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Hôm qua " + hm;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) + " " + hm;
}
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
function nextId(prefix, list, key = "id") {
  const nums = list.map(x => parseInt(String(x[key]).replace(/\D/g, "").slice(-4), 10)).filter(n => !isNaN(n));
  return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0");
}

const findProduct = sku => DB.products.find(p => p.sku === sku);
const findOrder = id => DB.orders.find(o => o.id === id);
const findTicket = id => DB.tickets.find(t => t.id === id);
const findChat = id => DB.chats.find(c => c.id === id);
const findUser = u => DB.users.find(x => x.username === u);
const userName = u => (findUser(u) || {}).fullname || "—";

// ---------- Nhật ký, thông báo, việc cần làm ----------
function log(text) {
  DB.audit.unshift({ t: nowISO(), user: ACTOR.name, role: ACTOR.role, text });
  if (DB.audit.length > 400) DB.audit.length = 400;
}
function notify(roles, text, page, ref, user) {
  DB.notifications.unshift({ id: "N-" + Date.now() + Math.floor(Math.random() * 99), roles: roles || [], user: user || "", text, page, ref: ref || "", t: nowISO(), readBy: [] });
  if (DB.notifications.length > 200) DB.notifications.length = 200;
}
function addTask(role, title, ref) {
  DB.tasks.push({ id: "TK-" + Date.now() + Math.floor(Math.random() * 99), role, title, ref, done: false });
}

// ---------- Hạng thành viên (theo tổng chi tiêu tích lũy) ----------
const TIERS = [
  { name: "Đồng",      min: 0,        perk: "Tích điểm 0,5% giá trị đơn" },
  { name: "Bạc",       min: 10000000, perk: "Tích điểm 1%, ưu tiên giao hàng" },
  { name: "Vàng",      min: 30000000, perk: "Tích điểm 1,5%, miễn phí lắp đặt, khuyến mãi dành riêng hạng Vàng" },
  { name: "Kim cương", min: 80000000, perk: "Tích điểm 2%, miễn phí lắp đặt, tổng đài ưu tiên, khuyến mãi dành riêng hạng Kim cương" }
];
function spentOf(phone) {
  const c = (DB.customers || []).find(x => x.phone === phone);
  return ((c && c.prevSpent) || 0) + DB.orders.filter(o => (o.account === phone || o.phone === phone) && o.status === "Hoàn tất").reduce((s, o) => s + o.total, 0);
}
function tierOf(phone) {
  const spent = phone ? spentOf(phone) : 0;
  let i = 0; TIERS.forEach((t, k) => { if (spent >= t.min) i = k; });
  const next = TIERS[i + 1];
  return { name: TIERS[i].name, idx: i, perk: TIERS[i].perk, spent, next: next ? next.name : "", need: next ? next.min - spent : 0, pct: next ? Math.round((spent - TIERS[i].min) / (next.min - TIERS[i].min) * 100) : 100 };
}
// Điều kiện hạng của khuyến mãi: "Tất cả", "Bạc trở lên", "Vàng trở lên", "Kim cương"
const tierNeed = k => { const t = !k.tier || k.tier === "Tất cả" ? -1 : TIERS.findIndex(x => k.tier.startsWith(x.name)); return t < 0 ? 0 : t; };

// ---------- QT2: Tồn kho ----------
const availOf = r => r.actual - r.safety - r.reserved;
const invRow = (sku, store) => DB.inventory.find(r => r.sku === sku && r.store === store);
const availTotal = sku => DB.inventory.filter(r => r.sku === sku).reduce((s, r) => s + Math.max(0, availOf(r)), 0);
function stockState(r) {
  const a = availOf(r);
  if (availTotal(r.sku) <= 0) return "Tạm hết hàng";
  if (a <= 0) return "Hết tại kho này";
  if (a <= r.min) return "Sắp hết";
  return "Còn hàng";
}
function ensureRow(sku, store) {
  let r = invRow(sku, store);
  if (!r) { r = { sku, store, actual: 0, safety: 0, reserved: 0, min: 5, defective: 0, lots: [] }; DB.inventory.push(r); }
  return r;
}
// Sau mỗi biến động: tính lại & cảnh báo (Bước 2)
function checkStockAlert(r) {
  const p = findProduct(r.sku); const a = availOf(r);
  if (availTotal(r.sku) <= 0) notify(["nv_kho", "ql_kho", "nv_ecom"], `${p ? p.name : r.sku} đã hết hàng ở tất cả kho – website hiển thị "Tạm hết hàng"`, "tonkho");
  else if (a <= r.min) notify(["nv_kho", "nv_ecom"], `${p ? p.name : r.sku} tại ${r.store} sắp hết (khả dụng ${Math.max(0, a)})`, "tonkho");
}
function reserveOrder(o) {
  o.items.forEach(it => { const r = ensureRow(it.sku, o.store); r.reserved += it.qty; checkStockAlert(r); });
  o.reserved = true;
}
function releaseOrder(o, why) {
  if (!o.reserved) return;
  o.items.forEach(it => { const r = invRow(it.sku, o.store); if (r) r.reserved = Math.max(0, r.reserved - it.qty); });
  o.reserved = false;
  o.history.push({ t: nowISO(), by: "Hệ thống", text: "Giải phóng hàng đang giữ" + (why ? " – " + why : "") });
}

// ---------- QT5: Đơn hàng ----------
const OPEN_ORDER = ["Chờ thanh toán", "Chờ xác nhận", "Đã xác nhận", "Đã chuẩn bị xong", "Đang giao", "Giao thất bại"];
function orderFlags(o) {
  const f = [];
  if (o.total >= POLICY.bigOrder) f.push("Giá trị đơn lớn");
  if (!/\d/.test(o.address)) f.push("Địa chỉ chưa rõ ràng");
  if (DB.orders.some(x => x.id !== o.id && x.phone === o.phone && x.date === o.date && x.status !== "Đã hủy")) f.push("Nhiều đơn trùng lặp");
  return f;
}
function addOrderHistory(o, text) { o.history.push({ t: nowISO(), by: ACTOR.name, text }); }
function refundOrder(o, why) {
  if (o.payStatus === "Đã thanh toán" && o.method !== "COD") {
    o.payStatus = "Đã hoàn tiền";
    o.history.push({ t: nowISO(), by: "Hệ thống", text: `Hoàn ${money(o.total)} về ${o.method}` + (why ? " – " + why : "") });
    return true;
  }
  return false;
}
// Hoàn lượt & ngân sách khuyến mãi khi hủy đơn (QT3 Bước 6)
function returnPromo(o) {
  if (!o.promo) return;
  const km = DB.promotions.find(p => p.id === o.promo);
  if (km && ["Đang hoạt động", "Tạm dừng"].includes(km.status)) { km.used = Math.max(0, km.used - 1); km.spent = Math.max(0, km.spent - (o.discount || 0)); }
}
function cancelOrder(o, reason) {
  const afterExport = ["Đã chuẩn bị xong"].includes(o.status);
  o.status = "Đã hủy";
  addOrderHistory(o, "Hủy đơn – " + reason);
  if (afterExport) {
    o.items.forEach((it, k) => DB.returns.unshift({ id: nextId("HH-", DB.returns), source: "Đơn hủy sau khi xuất kho", ref: o.id, sku: it.sku, product: it.name, store: o.store,
      serial: o.serials[k] || "", status: "Chờ kiểm đếm", created: nowISO() }));
    DB.deliveries.filter(d => d.order === o.id).forEach(d => d.status = "Đã hủy");
    notify(["nv_kho"], `Đơn ${o.id} bị hủy sau khi xuất kho – có hàng quay về cần kiểm đếm`, "hanghoan");
  } else releaseOrder(o, "đơn bị hủy");
  DB.exports.filter(e => e.order === o.id && e.status !== "Đã xuất").forEach(e => e.status = "Đã hủy");
  refundOrder(o, "đơn bị hủy");
  returnPromo(o);
}

// ---------- QT4: Hậu mãi & trợ lý ảo ----------
function warrantyOf(serial) { return DB.warranties.find(w => w.serial === serial); }
function warrantyEnd(w) { const d = new Date(w.start); d.setMonth(d.getMonth() + w.months); return d.toISOString().slice(0, 10); }

function chatPost(chatId, msg) {
  const c = findChat(chatId); if (!c) return;
  c.messages.push({ t: nowISO(), ...msg });
  c.updated = nowISO();
}
function ticketLog(t, text) { t.history = t.history || []; t.history.push({ t: nowISO(), by: ACTOR.name, text }); }
// Thông báo diễn biến phiếu cho khách qua khung chat (nếu phiếu tạo từ chat)
function tellCustomer(t, text, buttons) { if (t.chat) chatPost(t.chat, { from: "bot", text, buttons }); }

function createTicket(data) {
  const n = Math.max(500, ...DB.tickets.map(x => parseInt(x.id.slice(3), 10) || 0)) + 1;
  const t = { id: "YC-" + n, status: "Chờ tiếp nhận", assignee: "", priority: "Trung bình", created: nowISO(), history: [], ...data };
  ticketLog(t, data.chat ? "Trợ lý ảo tạo phiếu từ khung chat" : "Tạo phiếu");
  DB.tickets.unshift(t);
  notify(["nv_cskh", "ql_cskh"], `Phiếu ${t.id} (${t.type}) của ${t.customer} chờ tiếp nhận`, "haumai", t.id);
  return t;
}
function escalateChat(c, summary, tried) {
  c.status = "Chờ nhân viên";
  c.summary = summary; c.tried = tried || [];
  c.messages.push({ from: "system", t: nowISO(), text: "Trợ lý ảo đã chuyển hội thoại cho nhân viên CSKH kèm tóm tắt." });
  notify(["nv_cskh", "ql_cskh"], `Trợ lý ảo chuyển hội thoại ${c.id} (${c.customer}) cho CSKH`, "hoithoai", c.id);
}

// Menu nhanh của trợ lý ảo (dùng chung cho khung chat khách và trang CSKH)
const BOT_MENU = [
  { label: "Hỏi chính sách", act: "policy" }, { label: "Hướng dẫn, khắc phục sự cố", act: "support" },
  { label: "Bảo hành", act: "req", v: "Bảo hành" }, { label: "Đổi trả", act: "req", v: "Đổi trả" }, { label: "Hoàn tiền", act: "req", v: "Hoàn tiền" },
  { label: "Đơn hàng của tôi", act: "orders" }, { label: "Phiếu của tôi đang ở bước nào?", act: "status" }, { label: "Gặp nhân viên CSKH", act: "human" }
];

// ---------- QT3: Khuyến mãi (dùng chung cho nội bộ, web bán hàng và server) ----------
function promoOffer(p) {
  return { "Giảm %": `Giảm ${p.value}%${p.maxDiscount ? ", tối đa " + money(p.maxDiscount) : ""}`, "Giảm tiền": `Giảm ${money(p.value)}`,
    "Mã giảm giá": `Mã ${p.code || "—"}: giảm ${money(p.value)}`, "Quà tặng": `Tặng ${findProduct(p.gift) ? findProduct(p.gift).name : p.gift || "quà"}`,
    "Trả góp 0%": `Trả góp 0% qua ${p.partner || "đối tác"}` }[p.type] || p.type;
}
// Phạm vi áp dụng: một hoặc nhiều ngành hàng / SKU (mảng), hoặc "Tất cả ngành hàng"
const ALL_SCOPE = "Tất cả ngành hàng";
const scopeList = s => [].concat(s == null || s === "" ? ALL_SCOPE : s).filter(Boolean);
const scopeLabel = s => scopeList(s).map(x => findProduct(x) ? findProduct(x).name : x).join(", ");
const inScope = (p, prod) => { const l = scopeList(p.scope); return l.includes(ALL_SCOPE) || l.includes(prod.category) || l.includes(prod.sku); };
const scopesTouch = (a, b) => { const A = scopeList(a), B = scopeList(b); if (A.includes(ALL_SCOPE) || B.includes(ALL_SCOPE)) return true;
  const cat = x => findProduct(x) ? findProduct(x).category : x; return A.some(x => B.some(y => x === y || cat(x) === y || x === cat(y))); };
// Giá sàn: giá bán thấp nhất được phép sau mọi khuyến mãi (không thấp hơn giá vốn)
const floorOf = p => p.floor || p.cost || 0;
const discountFor = (p, prod) => p.type === "Giảm %" ? Math.min(prod.price * p.value / 100, p.maxDiscount || Infinity) : ["Giảm tiền", "Mã giảm giá"].includes(p.type) ? p.value : 0;
const overlap = (a, b) => !(a.end < b.start || b.end < a.start);

// QT3 Bước 4, 7: tự kích hoạt / tự đóng theo thời gian, ngân sách, lượt
function promoTick() {
  let changed = false; const t = todayISO();
  DB.promotions.forEach(p => {
    if (p.status === "Đã duyệt" && p.start <= t && p.end >= t) { p.status = "Đang hoạt động"; changed = true; notify(["nv_ecom", "ql_ecom"], `${p.name} đã kích hoạt và công bố trên kênh bán`, "khuyenmai", p.id); }
    if (["Đang hoạt động", "Tạm dừng", "Đã duyệt"].includes(p.status) && (p.end < t || p.spent >= p.budget || (p.limitTotal && p.used >= p.limitTotal))) {
      p.status = "Đã kết thúc"; p.closedReason = p.end < t ? "Hết thời hạn" : p.spent >= p.budget ? "Hết ngân sách" : "Hết lượt"; changed = true;
      notify(["nv_ecom", "ql_ecom"], `${p.name} đã tự động đóng (${p.closedReason})`, "khuyenmai", p.id);
    }
  });
  return changed;
}


function checkPromo(km, prod, sub, phone) {
  if (!km) return { ok: false };
  const t = todayISO();
  if (km.status !== "Đang hoạt động" || km.start > t || km.end < t) return { ok: false, reason: `${km.id} không còn hiệu lực (${km.status})` };
  if (km.spent >= km.budget) return { ok: false, reason: "Chương trình đã hết ngân sách" };
  if (km.limitTotal && km.used >= km.limitTotal) return { ok: false, reason: "Chương trình đã hết lượt" };
  if (!inScope(km, prod)) return { ok: false, reason: `Sản phẩm không thuộc phạm vi áp dụng (${scopeLabel(km.scope)})` };
  if (sub < km.minOrder) return { ok: false, reason: "Chưa đạt giá trị đơn tối thiểu", hint: `Thêm ${money(km.minOrder - sub)} để đủ điều kiện dùng mã` };
  const usedByPhone = DB.orders.filter(o => o.phone === phone && o.promo === km.id && o.status !== "Đã hủy").length;
  if (usedByPhone >= km.limitPerCustomer) return { ok: false, reason: "Khách đã dùng hết lượt cho phép trên mỗi khách" };
  const disc = Math.min(discountFor(km, prod), prod.price - floorOf(prod), sub);
  return { ok: true, discount: Math.max(0, Math.round(disc)) };
}

// Bản cửa hàng không cần số liệu lịch sử cho dashboard nội bộ
const _SEED0 = SEED; SEED = function () { const d = _SEED0(); d.history = []; return d; };
/* =========================================================
   TRỢ LÝ ẢO (QT4 Bước 1, 2, 6) – chạy trên server
   - Khách đã đăng nhập: trợ lý ảo biết khách là ai, tra cứu được đơn.
   - Khách vãng lai: trả lời chính sách, chuyển nhân viên; muốn tra cứu
     đơn thì phải đăng nhập.
   - Không giải quyết được (khách bấm "Chưa được", 2 lần không hiểu,
     hoặc khách đòi gặp người) → chuyển nhân viên CSKH kèm tóm tắt.
   ========================================================= */
const addrOf = c => c.phone ? "anh/chị " + (c.customer || "").split(" ").pop() : "anh/chị";
const capFirst = s => s[0].toUpperCase() + s.slice(1);

function botPost(c, text, buttons) { c.messages.push({ from: "bot", t: nowISO(), text, buttons }); c.updated = nowISO(); }
function custSay(c, text) {
  c.messages.forEach(m => { if (m.buttons && m.buttons.every(b => !["slot", "complain", "rate"].includes(b.act))) m.used = true; });
  c.messages.push({ from: "customer", t: nowISO(), text }); c.updated = nowISO();
}

function newChat(owner) {
  const n = Math.max(1000, ...DB.chats.map(c => +String(c.id).slice(2) || 0)) + 1;
  const c = { id: "C-" + n, owner: owner.key, customer: owner.name || "Khách vãng lai", phone: owner.phone || "", status: "Trợ lý ảo", agent: "",
    created: nowISO(), bot: { step: "menu", miss: 0, data: {} }, messages: [] };
  DB.chats.unshift(c);
  if (c.phone) botPost(c, `Xin chào ${addrOf(c)}! Mình là trợ lý ảo ElectronicY. Mình có thể giúp gì cho ${addrOf(c)} hôm nay?`, BOT_MENU);
  else botPost(c, "Xin chào! Mình là trợ lý ảo ElectronicY. Mình trả lời được chính sách bảo hành, đổi trả và chuyển anh/chị tới nhân viên CSKH. Để tra cứu đơn hàng hoặc gửi yêu cầu bảo hành, anh/chị đăng nhập giúp mình nhé.",
    [{ label: "Hỏi chính sách", act: "policy" }, { label: "Gặp nhân viên CSKH", act: "human" }]);
  return c;
}

// Đầu vào từ khách: { text } hoặc { i, k } (bấm nút gợi ý) hoặc { file }
function botReceive(c, input) {
  if (c.status === "Đã kết thúc" && !(input.i != null && c.messages[input.i] && (c.messages[input.i].buttons || []).some(b => b.act === "rate")))
    return { error: "Hội thoại đã kết thúc. Bắt đầu hội thoại mới để được hỗ trợ tiếp." };
  if (input.i != null) {
    const m = c.messages[input.i]; const b = m && m.buttons && m.buttons[input.k];
    if (!b || m.used) return { error: "Lựa chọn này không còn hiệu lực." };
    m.used = true; custSay(c, b.label);
    return botHandle(c, b.act, b.v);
  }
  if (input.file) {
    custSay(c, "📎 Đã gửi tệp: " + String(input.file).slice(0, 80));
    if (c.status === "Nhân viên đang hỗ trợ") { c.unread = true; return; }
    if (c.bot.step === "req_media") { c.bot.data.media = String(input.file).slice(0, 80); return finishRequest(c); }
    return botPost(c, "Mình đã nhận tệp. Anh/chị cho mình biết cần hỗ trợ gì nhé.", c.phone ? BOT_MENU : undefined);
  }
  const text = String(input.text || "").trim().slice(0, 1000);
  if (!text) return { error: "Tin nhắn trống." };
  custSay(c, text);
  if (c.status === "Nhân viên đang hỗ trợ") { c.unread = true; return; }
  if (c.status === "Chờ nhân viên") return botPost(c, "Nhân viên CSKH sẽ phản hồi ngay khi tiếp nhận. Tin nhắn của anh/chị đã được ghi lại.");
  return botUnderstand(c, text);
}

function botUnderstand(c, text) {
  const s = c.bot.step; const t = text.toLowerCase();
  if (s === "req_serial") { c.bot.data.serial = text; return askDesc(c); }
  if (s === "req_desc") { c.bot.data.desc = text; return botPost(c, "Lỗi xuất hiện từ khi nào ạ?", ["Ngay khi nhận hàng", "Vài ngày gần đây", "Hơn một tháng nay"].map(x => ({ label: x, act: "when", v: x }))); }
  if (s === "complain") return botHandle(c, "complainText", text);
  if (/nhân viên|người thật|tư vấn viên|gặp người|cskh|tổng đài/.test(t)) return botHandle(c, "human");
  if (/phiếu|bước nào|trạng thái|tiến độ|đến đâu|lịch kỹ thuật|đơn (hàng )?của tôi|đơn hàng/.test(t)) return botHandle(c, /phiếu|bước|kỹ thuật/.test(t) ? "status" : "orders");
  if (/bao lâu|chính sách|mấy ngày|điều kiện|thời hạn|phí ship|vận chuyển|trả góp/.test(t)) return botHandle(c, "policy", t);
  if (/hoàn tiền|trả tiền lại/.test(t)) return botHandle(c, "req", "Hoàn tiền");
  if (/đổi (hàng|máy|sản phẩm|cái khác)|muốn đổi|đổi trả|trả hàng/.test(t)) return botHandle(c, "req", "Đổi trả");
  if (/bảo hành/.test(t)) return botHandle(c, "req", "Bảo hành");
  if (/không|lỗi|hỏng|chảy|kêu|sọc|nóng|tắt|mất|yếu|chậm|rung|ồn/.test(t)) { c.bot.data = { problem: text }; return botHandle(c, "support"); }
  if (/cảm ơn|ok|oke|được rồi|thanks/.test(t)) return botPost(c, "Dạ không có gì ạ. Anh/chị cần gì thêm cứ nhắn mình nhé.", c.phone ? BOT_MENU : undefined);
  c.bot.miss = (c.bot.miss || 0) + 1;
  if (c.bot.miss >= 2) {
    const recent = c.messages.filter(m => m.from === "customer").slice(-3).map(m => m.text).join(" / ");
    escalateChat(c, `Trợ lý ảo không hiểu yêu cầu sau 2 lần. Khách nhắn: "${recent}"`, []);
    c.bot.step = "handoff";
    return botPost(c, "Xin lỗi, mình chưa hiểu rõ yêu cầu. Mình đã chuyển anh/chị sang nhân viên CSKH, anh/chị chờ trong giây lát nhé.");
  }
  botPost(c, "Mình chưa hiểu ý anh/chị lắm. Anh/chị chọn một mục dưới đây hoặc mô tả cụ thể hơn giúp mình nhé.", c.phone ? BOT_MENU : [{ label: "Hỏi chính sách", act: "policy" }, { label: "Gặp nhân viên CSKH", act: "human" }]);
}

const LOGIN_HINT = "Để tra cứu đơn hàng và gửi yêu cầu, anh/chị bấm Đăng nhập ở góc trên bên phải. Sau khi đăng nhập, mở lại khung chat là mình nhận ra anh/chị ngay.";

function botHandle(c, a, v) {
  c.bot = c.bot || { step: "menu" }; c.bot.data = c.bot.data || {};
  const delivered = () => DB.orders.filter(o => o.phone === c.phone && o.status === "Hoàn tất");
  const guest = () => { if (c.phone) return false; botPost(c, LOGIN_HINT, [{ label: "Gặp nhân viên CSKH", act: "human" }]); return true; };

  switch (a) {
    case "policy": {
      let txt = `Chính sách ElectronicY:\n• Đổi trả trong ${POLICY.returnDays} ngày kể từ ngày nhận hàng nếu lỗi do nhà sản xuất.\n• Bảo hành 12–24 tháng tùy sản phẩm, tính từ ngày giao, kích hoạt theo số serial.\n• Miễn phí vận chuyển cho đơn trên 5 triệu, lắp đặt 300.000đ/sản phẩm.\n• Hoàn tiền theo đúng phương thức đã thanh toán, sau khi thu hồi hàng về kho.\n• Lỗi do người dùng (rơi vỡ, vào nước…) không được bảo hành miễn phí.`;
      if (c.phone) {
        const ws = DB.warranties.filter(w => w.phone === c.phone);
        if (ws.length) txt += `\n\nSản phẩm của ${addrOf(c)}:\n` + ws.map(w => `• ${w.product}: bảo hành đến ${fmtDate(warrantyEnd(w))}`).join("\n");
      }
      return botPost(c, txt, c.phone ? BOT_MENU : [{ label: "Gặp nhân viên CSKH", act: "human" }]);
    }
    case "human": {
      escalateChat(c, (c.bot.data.problem ? `Khách cần hỗ trợ: "${c.bot.data.problem}". ` : "") + "Khách yêu cầu gặp nhân viên CSKH." + (c.phone ? "" : " Khách chưa đăng nhập."), c.tried || []);
      c.bot.step = "handoff";
      return botPost(c, "Mình đã chuyển anh/chị sang nhân viên CSKH kèm tóm tắt nội dung. Anh/chị chờ trong giây lát nhé.");
    }
    case "orders": {
      if (guest()) return;
      const os = DB.orders.filter(o => o.phone === c.phone).slice(0, 5);
      if (!os.length) return botPost(c, "Anh/chị chưa có đơn hàng nào.", BOT_MENU);
      return botPost(c, `Đơn gần đây của ${addrOf(c)}:\n` + os.map(o => `• ${o.id} – ${o.items[0].name}${o.items.length > 1 ? ` và ${o.items.length - 1} sản phẩm khác` : ""}: ${o.status}`).join("\n") + "\nXem chi tiết ở mục Đơn hàng của tôi.", BOT_MENU);
    }
    case "status": {
      if (guest()) return;
      const ts = DB.tickets.filter(t => t.phone === c.phone).slice(0, 4);
      if (!ts.length) return botPost(c, "Anh/chị chưa có phiếu yêu cầu nào.", BOT_MENU);
      const step = t => ({ "Chờ tiếp nhận": "đang chờ nhân viên tiếp nhận", "Đang xử lý": "nhân viên đang kiểm tra điều kiện bảo hành, đổi trả", "Chờ thẩm định": "đang chờ kỹ thuật viên kiểm tra sản phẩm",
        "Chờ quyết định": "đã kiểm tra xong, nhân viên đang chốt phương án xử lý", "Đang sửa chữa": "sản phẩm đang được sửa chữa bảo hành", "Chờ thu hồi hàng": "đang chờ thu hồi sản phẩm về kho",
        "Chờ hoàn tiền": "hàng đã về kho, đang duyệt hoàn tiền", "Khiếu nại": "Quản lý CSKH đang xem xét khiếu nại", "Đã hoàn tất": "đã xử lý xong", "Đã từ chối": "đã có kết quả: không được chấp nhận", "Đã đóng": "đã đóng" }[t.status] || t.status);
      return botPost(c, `Các phiếu của ${addrOf(c)}:\n` + ts.map(t => `• ${t.id} (${t.type} – ${t.product}): ${step(t)}` +
        (t.inspection && t.inspection.slot && t.status === "Chờ thẩm định" ? `. Lịch kỹ thuật viên: ${fmtDate(t.inspection.slot)}` : "")).join("\n"), BOT_MENU);
    }
    case "support": {
      if (guest()) return;
      const os = delivered();
      if (!os.length) return botPost(c, "Anh/chị chưa có đơn đã giao để mình hỗ trợ kỹ thuật. Anh/chị cần gì khác không ạ?", BOT_MENU);
      c.bot.step = "support_pick";
      return botPost(c, "Anh/chị cần hỗ trợ cho sản phẩm nào ạ?", os.map(o => ({ label: `${o.items[0].name} (${o.id})`, act: "supportOrder", v: o.id })));
    }
    case "supportOrder": {
      const o = findOrder(v); if (!o || o.phone !== c.phone) return;
      const p = findProduct(o.items[0].sku) || { category: "Gia dụng", name: o.items[0].name };
      const steps = KB[p.category] || KB["Gia dụng"];
      c.bot.data.order = v; c.tried = steps; c.bot.step = "support_confirm";
      return botPost(c, `Với ${p.name}, ${addrOf(c)} thử lần lượt giúp mình:\n` + steps.map((s, i) => `${i + 1}. ${s}`).join("\n") + "\n\nĐã khắc phục được chưa ạ?",
        [{ label: "Đã được", act: "solved", v: "yes" }, { label: "Chưa được", act: "solved", v: "no" }]);
    }
    case "solved": {
      const o = findOrder(c.bot.data.order); if (!o) return;
      const t = createTicket({ chat: c.id, order: o.id, customer: o.customer, phone: o.phone, type: "Hỗ trợ", product: o.items[0].name, sku: o.items[0].sku, serial: o.serials[0] || "",
        note: (c.bot.data.problem || "Cần hướng dẫn sử dụng / khắc phục sự cố") + ". Đã thử: " + (c.tried || []).join(" | ") });
      c.ticket = t.id;
      if (v === "yes") {
        t.status = "Đã đóng"; t.history.push({ t: nowISO(), by: "Trợ lý ảo", text: "Khách xác nhận đã giải quyết – đóng phiếu" });
        DB.notifications.shift();
        c.bot.step = "rate";
        return botPost(c, `Tuyệt quá! Mình đã ghi nhận và đóng phiếu ${t.id}. ${capFirst(addrOf(c))} đánh giá giúp mình mức độ hài lòng nhé:`, [1, 2, 3, 4, 5].map(n => ({ label: "★".repeat(n), act: "rate", v: n + "|" + t.id })));
      }
      escalateChat(c, `${o.items[0].name} (đơn ${o.id}): ${c.bot.data.problem || "khách cần hỗ trợ kỹ thuật"}. Đã thử ${(c.tried || []).length} cách khắc phục cơ bản nhưng chưa được.`, c.tried);
      c.bot.step = "handoff";
      return botPost(c, `Mình đã tạo phiếu ${t.id} và chuyển cho nhân viên CSKH kèm tóm tắt cùng các cách anh/chị đã thử. Anh/chị chờ trong giây lát nhé.`);
    }
    case "req": {
      if (guest()) return;
      const os = delivered();
      if (!os.length) return botPost(c, "Yêu cầu bảo hành, đổi trả, hoàn tiền chỉ mở sau khi đơn hàng đã giao thành công. Anh/chị chưa có đơn đã giao.", BOT_MENU);
      c.bot.step = "req_pick"; c.bot.data = { type: v };
      return botPost(c, `Anh/chị muốn gửi yêu cầu ${v.toLowerCase()} cho đơn nào ạ?`, os.map(o => ({ label: `${o.items[0].name} – giao ${fmtDate(o.deliveredAt)}`, act: "reqOrder", v: o.id })));
    }
    case "reqOrder": {
      const o = findOrder(v); if (!o || o.phone !== c.phone) return;
      c.bot.data.order = v; c.bot.step = "req_serial";
      return botPost(c, `Mình đã tự điền: ${o.items[0].name}, đơn ${o.id}, giao ngày ${fmtDate(o.deliveredAt)}.\nAnh/chị xác nhận số serial trên tem sản phẩm giúp mình:`,
        o.serials[0] ? [{ label: `Đúng là ${o.serials[0]}`, act: "serialOk", v: o.serials[0] }] : undefined);
    }
    case "serialOk": c.bot.data.serial = v; return askDesc(c);
    case "when": c.bot.data.when = v; c.bot.step = "req_media";
      return botPost(c, "Anh/chị đính kèm ảnh hoặc video tình trạng sản phẩm (nút kẹp giấy bên dưới) để xử lý nhanh hơn nhé.", [{ label: "Bỏ qua, gửi sau", act: "skipMedia" }]);
    case "skipMedia": return finishRequest(c);
    case "rate": {
      const [n, tid] = String(v).split("|");
      if (tid && findTicket(tid)) findTicket(tid).survey = +n;
      c.rating = +n; c.status = "Đã kết thúc"; c.bot.step = "done";
      c.messages.push({ from: "system", t: nowISO(), text: `Khách đánh giá ${n}/5 sao.` });
      return botPost(c, "Cảm ơn anh/chị đã đánh giá! Phản hồi giúp ElectronicY cải thiện chất lượng phục vụ.");
    }
    case "slot": {
      const [tid, slot] = String(v).split("|"); const t = findTicket(tid);
      if (!t || t.phone !== c.phone || t.status !== "Chờ thẩm định") return botPost(c, "Lịch này không còn hiệu lực.");
      t.inspection.slot = slot; delete t.inspection.offered; t.history.push({ t: nowISO(), by: "Trợ lý ảo", text: "Khách chọn lịch thẩm định " + fmtDate(slot) });
      notify([], `Phiếu ${tid}: khách chọn lịch thẩm định ${fmtDate(slot)}`, "thamdinh", tid, t.inspection.tech);
      notify([], `Phiếu ${tid}: khách đã chọn lịch KTV ${fmtDate(slot)}`, "haumai", tid, t.assignee);
      return botPost(c, `Đã đặt lịch kỹ thuật viên ${userName(t.inspection.tech)} ${fmtDate(slot)} (${t.inspection.place.toLowerCase()}). Kỹ thuật viên sẽ gọi trước khi đến.`);
    }
    case "complain": c.bot.step = "complain"; c.bot.data = { ticket: v }; return botPost(c, "Anh/chị cho mình biết lý do chưa đồng ý với kết quả để Quản lý CSKH xem xét lại nhé.");
    case "complainText": {
      const t = findTicket(c.bot.data.ticket); if (!t || t.phone !== c.phone) return;
      t.status = "Khiếu nại"; t.complaint = v;
      t.history.push({ t: nowISO(), by: "Khách hàng", text: "Khiếu nại: " + v });
      notify(["ql_cskh"], `Khách khiếu nại phiếu ${t.id}: ${v}`, "haumai", t.id);
      c.bot.step = "menu";
      return botPost(c, `Mình đã chuyển khiếu nại phiếu ${t.id} cho Quản lý CSKH. Kết quả xem xét sẽ được báo lại qua khung chat này.`, BOT_MENU);
    }
  }
}
function askDesc(c) { c.bot.step = "req_desc"; botPost(c, "Anh/chị mô tả giúp mình tình trạng sản phẩm và lỗi đang gặp nhé."); }
function finishRequest(c) {
  const d = c.bot.data; const o = findOrder(d.order); if (!o) return;
  const t = createTicket({ chat: c.id, order: o.id, customer: o.customer, phone: o.phone, type: d.type, priority: d.when === "Ngay khi nhận hàng" ? "Cao" : "Trung bình",
    product: o.items[0].name, sku: o.items[0].sku, serial: d.serial || "", note: `${d.desc}. Xuất hiện: ${(d.when || "").toLowerCase()}.${d.media ? " Đính kèm: " + d.media : " Chưa có ảnh."}` });
  c.ticket = t.id; c.bot.step = "menu"; c.bot.data = {};
  botPost(c, `Mình đã tạo phiếu ${t.id} (${t.type}). Yêu cầu đang được xem xét – nhân viên CSKH sẽ kiểm tra điều kiện và liên hệ ${addrOf(c)}. Mình chưa thể cam kết kết quả lúc này.\nAnh/chị có thể hỏi "phiếu của tôi đang ở bước nào?" bất kỳ lúc nào.`, BOT_MENU);
}

/* =========================================================
   NGHIỆP VỤ PHÍA KHÁCH HÀNG – chạy trên server
   QT5 GĐ1–2 (đặt hàng, thanh toán), luồng phụ đổi/hủy,
   QT3 Bước 6 (áp khuyến mãi), QT4 Bước 1 (gửi yêu cầu hậu mãi).
   Dùng chung DB và các hàm trong shared/store.js.
   ========================================================= */
const SHIP_FREE_FROM = 5000000, SHIP_FEE = 30000, INSTALL_FEE = 300000, PAY_MINUTES = 30;
const ONLINE = ["Thẻ", "Ví điện tử", "Chuyển khoản"];

function publicProduct(p) {
  const total = availTotal(p.sku);
  const minSum = DB.inventory.filter(r => r.sku === p.sku).reduce((s, r) => s + r.min, 0);
  const stock = total <= 0 ? "Tạm hết hàng" : total <= minSum ? "Sắp hết hàng" : "Còn hàng";
  const promos = activePromos().filter(k => inScope(k, p) && ["Giảm %", "Giảm tiền"].includes(k.type));
  const best = promos.map(k => ({ k, d: Math.min(discountFor(k, p), p.price - floorOf(p)) })).sort((a, b) => b.d - a.d)[0];
  const extra = activePromos().filter(k => inScope(k, p) && ["Quà tặng", "Trả góp 0%", "Mã giảm giá"].includes(k.type));
  const perks = extra.map(k => promoOffer(k));
  const deal = best && best.d > 0 && !best.k.minOrder ? { id: best.k.id, name: best.k.name, discount: Math.round(best.d), price: p.price - Math.round(best.d), pct: Math.round(best.d / p.price * 100), end: best.k.end, flash: best.k.end <= (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })() } : null;
  const sold = DB.orders.filter(o => o.status !== "Đã hủy").reduce((n, o) => n + o.items.filter(i => i.sku === p.sku).reduce((a, i) => a + i.qty, 0), 0);
  return { sku: p.sku, name: p.name, brand: p.brand, category: p.category, price: p.price, spec: p.spec, warranty: p.warranty, install: p.install, bulky: p.bulky,
    chips: String(p.spec || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 3), stock, left: total > 0 && total <= 5 ? total : null, sold,
    installment: extra.some(k => k.type === "Trả góp 0%") || p.price >= 3000000, zeroRate: extra.find(k => k.type === "Trả góp 0%") ? promoOffer(extra.find(k => k.type === "Trả góp 0%")) : "",
    gift: (extra.find(k => k.type === "Quà tặng") ? promoOffer(extra.find(k => k.type === "Quà tặng")) : ""), deal,
    perks, stores: DB.inventory.filter(r => r.sku === p.sku && r.store.startsWith("Siêu thị") && availOf(r) > 0).map(r => r.store) };
}
const ownsOrder = (cus, o) => !!o && (o.account === cus.phone || o.phone === cus.phone);
function activePromos() { const t = todayISO(); return DB.promotions.filter(k => k.status === "Đang hoạt động" && k.start <= t && k.end >= t && k.spent < k.budget && (!k.limitTotal || k.used < k.limitTotal)); }
function shopCatalog() {
  promoTick();
  return {
    products: DB.products.filter(p => p.status === "Đang kinh doanh").map(publicProduct),
    promotions: activePromos().map(k => ({ id: k.id, name: k.name, desc: k.desc, type: k.type, code: k.code || "", end: k.end, scope: scopeLabel(k.scope), scopes: scopeList(k.scope), minOrder: k.minOrder, offer: promoOffer(k) })),
    pickupStores: STORES.filter(s => s.startsWith("Siêu thị")), categories: CATEGORIES
  };
}

// Kiểm tra một chương trình cho cả giỏ hàng
function promoForCart(k, lines, sub, phone) {
  const t = todayISO();
  if (k.status !== "Đang hoạt động" || k.start > t || k.end < t) return { ok: false, reason: "Chương trình không còn hiệu lực" };
  if (k.spent >= k.budget) return { ok: false, reason: "Chương trình đã hết ngân sách" };
  if (k.limitTotal && k.used >= k.limitTotal) return { ok: false, reason: "Chương trình đã hết lượt" };
  const inLines = lines.filter(l => inScope(k, l.p));
  if (!inLines.length) return { ok: false, reason: `Chỉ áp dụng cho ${scopeLabel(k.scope)}` };
  if (tierNeed(k) > tierOf(phone).idx) return { ok: false, reason: `Dành cho thành viên hạng ${k.tier}`, hint: phone ? "" : "Đăng nhập để áp dụng ưu đãi theo hạng" };
  if (sub < k.minOrder) return { ok: false, reason: "Chưa đạt giá trị đơn tối thiểu", hint: `Thêm ${money(k.minOrder - sub)} để đủ điều kiện` };
  if (phone) {
    const used = DB.orders.filter(o => o.phone === phone && o.promo === k.id && o.status !== "Đã hủy").length;
    if (used >= k.limitPerCustomer) return { ok: false, reason: "Bạn đã dùng hết lượt cho chương trình này" };
  }
  let d = inLines.reduce((s, l) => s + Math.min(discountFor(k, l.p), l.p.price - floorOf(l.p)) * l.qty, 0);
  if (k.type === "Giảm %" && k.maxDiscount) d = Math.min(d, k.maxDiscount);
  if (k.budget - k.spent < d) return { ok: false, reason: "Ngân sách chương trình không còn đủ" };
  return { ok: true, discount: Math.round(d), perk: d ? "" : promoOffer(k) };
}

function cartQuote({ items, pickup, promo, phone }) {
  const errors = []; const lines = [];
  (Array.isArray(items) ? items : []).slice(0, 20).forEach(it => {
    const p = findProduct(it.sku); const qty = Math.max(1, Math.min(10, parseInt(it.qty, 10) || 1));
    if (!p || p.status !== "Đang kinh doanh") return errors.push(`${p ? p.name : it.sku} hiện không còn bán`);
    if (availTotal(p.sku) < qty) errors.push(availTotal(p.sku) ? `${p.name} chỉ còn ${availTotal(p.sku)} sản phẩm` : `${p.name} tạm hết hàng`);
    lines.push({ p, qty, sku: p.sku, name: p.name, price: p.price, install: p.install && !pickup });
  });
  if (!lines.length && !errors.length) errors.push("Giỏ hàng đang trống");
  const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
  // QT5 Bước 2: kiểm tra khả năng đáp ứng, xác định kho
  if (pickup && !STORES.includes(pickup)) errors.push("Siêu thị nhận hàng không hợp lệ");
  const cands = pickup ? [pickup] : STORES;
  const store = lines.length ? cands.find(s => lines.every(l => { const r = invRow(l.sku, s); return r && availOf(r) >= l.qty; })) : null;
  let stockNote = "";
  if (lines.length && !store && !errors.length) {
    const others = STORES.filter(s => s !== pickup && lines.every(l => { const r = invRow(l.sku, s); return r && availOf(r) >= l.qty; }));
    if (pickup && others.length) errors.push(`${pickup} không đủ hàng. Bạn có thể chọn giao tận nơi hoặc nhận tại ${others.filter(s => s.startsWith("Siêu thị")).join(", ") || "kho khác (giao tận nơi)"}.`);
    else errors.push("Không có kho nào đủ toàn bộ giỏ hàng. Bạn có thể tách thành nhiều đơn, mỗi đơn một sản phẩm.");
  }
  if (store) stockNote = pickup ? `Nhận tại ${store}` : `Giao từ ${store}`;
  const ship = pickup ? 0 : sub > SHIP_FREE_FROM ? 0 : (lines.length ? SHIP_FEE : 0);
  const installFee = lines.filter(l => l.install).reduce((s, l) => s + l.qty * INSTALL_FEE, 0);
  // QT3 Bước 6: kiểm tra từng chương trình
  const options = activePromos().map(k => ({ id: k.id, name: k.name, offer: promoOffer(k), code: k.code || "", ...promoForCart(k, lines, sub, phone) }));
  let chosen = null;
  if (promo === "auto" || promo == null) {            // tự áp ưu đãi tốt nhất mà giỏ hàng đủ điều kiện
    const best = options.filter(o => o.ok && o.discount > 0).sort((a, b) => b.discount - a.discount)[0];
    if (best) chosen = { ...best, auto: true };
  } else if (promo && promo !== "none") {
    const k = DB.promotions.find(x => x.id === promo || (x.code && x.code === String(promo).toUpperCase()));
    chosen = k ? { id: k.id, name: k.name, ...promoForCart(k, lines, sub, phone) } : { id: promo, ok: false, reason: "Mã khuyến mãi không tồn tại" };
  }
  const discount = chosen && chosen.ok ? chosen.discount : 0;
  return { lines: lines.map(({ p, ...l }) => ({ ...l, bulky: p.bulky })), sub, ship, installFee, discount, total: sub + ship + installFee - discount,
    store: store || "", stockNote, errors, promo: chosen, options };
}

function customerPlaceOrder(cus, body) {
  const r = body.receiver || {};
  const name = String(r.name || "").trim().slice(0, 60), phone = String(r.phone || "").trim(), address = String(r.address || "").trim().slice(0, 200);
  if (!name || !/^0\d{9}$/.test(phone)) return { error: "Kiểm tra lại họ tên và số điện thoại người nhận (10 số)" };
  if (!body.pickup && !/\d/.test(address)) return { error: "Địa chỉ giao hàng cần có số nhà, tên đường" };
  const method = ["COD", ...ONLINE, "Trả góp"].includes(body.method) ? body.method : null;
  if (!method) return { error: "Chọn phương thức thanh toán" };
  const q = cartQuote({ items: body.items, pickup: body.pickup, promo: body.promo, phone: cus.phone });
  if (q.errors.length) return { error: q.errors.join(". ") };
  if (body.promo && !["auto", "none"].includes(body.promo) && !(q.promo && q.promo.ok)) return { error: "Không áp dụng được khuyến mãi: " + (q.promo ? q.promo.reason : "") };
  const id = "DH" + (Math.max(...DB.orders.map(o => +o.id.slice(2))) + 1);
  const o = { id, date: todayISO(), createdAt: nowISO(), customer: name, phone, account: cus.phone, address: body.pickup ? `Nhận tại ${body.pickup}` : address, pickup: body.pickup || "", store: q.store,
    items: q.lines.map(l => ({ sku: l.sku, name: l.name, qty: l.qty, price: l.price })), needInstall: q.installFee > 0, method,
    payStatus: method === "COD" ? "Chưa thanh toán (COD)" : method === "Trả góp" ? "Chờ duyệt trả góp" : "Chờ thanh toán",
    status: method === "COD" ? "Chờ xác nhận" : "Chờ thanh toán", ship: q.ship, installFee: q.installFee, discount: q.discount, promo: q.promo && q.promo.ok ? q.promo.id : "",
    total: q.total, note: String(body.note || "").slice(0, 300), invoice: body.invoice ? String(body.invoice).slice(0, 200) : "", flags: [], serials: [],
    history: [{ t: nowISO(), by: "Website", text: `Khách đặt hàng – tạo đơn, giữ hàng tại ${q.store}` }] };
  DB.orders.unshift(o); reserveOrder(o);
  if (o.promo) { const k = DB.promotions.find(x => x.id === o.promo); k.used += 1; k.spent += o.discount; }
  notify(["nv_cskh", "ql_cskh"], `Đơn mới ${id} từ website – ${o.status}`, "donhang", id);
  log(`Khách đặt đơn ${id} (${money(o.total)})`);
  return { order: o };
}

// QT5 GĐ2: kết quả từ cổng thanh toán (mô phỏng)
function customerPay(o, ok) {
  if (o.status !== "Chờ thanh toán" || !ONLINE.includes(o.method)) return { error: "Đơn này không ở trạng thái chờ thanh toán" };
  if (!ok) { o.history.push({ t: nowISO(), by: "Cổng thanh toán", text: "Thanh toán chưa thành công – khách có thể thanh toán lại hoặc đổi phương thức" }); return { order: o }; }
  o.payStatus = "Đã thanh toán"; o.status = "Chờ xác nhận"; o.paidAt = nowISO();
  o.history.push({ t: nowISO(), by: "Cổng thanh toán", text: `Thanh toán thành công qua ${o.method}` });
  notify(["nv_cskh", "ql_cskh"], `Đơn ${o.id} đã thanh toán – chờ xác nhận`, "donhang", o.id);
  return { order: o };
}
function customerChangeMethod(o, method) {
  if (o.status !== "Chờ thanh toán") return { error: "Chỉ đổi phương thức khi đơn đang chờ thanh toán" };
  if (!["COD", ...ONLINE].includes(method)) return { error: "Phương thức không hợp lệ" };
  o.method = method; o.payStatus = method === "COD" ? "Chưa thanh toán (COD)" : "Chờ thanh toán"; o.status = method === "COD" ? "Chờ xác nhận" : "Chờ thanh toán"; o.createdAt = nowISO();
  o.history.push({ t: nowISO(), by: "Khách hàng", text: "Đổi phương thức thanh toán sang " + method });
  if (method === "COD") notify(["nv_cskh", "ql_cskh"], `Đơn ${o.id} đổi sang COD – chờ xác nhận`, "donhang", o.id);
  return { order: o };
}
// Luồng phụ: thay đổi / hủy khi chưa bàn giao vận chuyển
const CUSTOMER_EDITABLE = ["Chờ thanh toán", "Chờ xác nhận", "Đã xác nhận", "Đã chuẩn bị xong"];
function customerCancel(o, reason) {
  if (!CUSTOMER_EDITABLE.includes(o.status)) return { error: "Đơn đã bàn giao vận chuyển nên không thể hủy. Sau khi nhận hàng, bạn có thể gửi yêu cầu đổi trả." };
  cancelOrder(o, "khách hủy trên website" + (reason ? ": " + String(reason).slice(0, 120) : ""));
  notify(["nv_cskh", "ql_cskh"], `Khách hủy đơn ${o.id}`, "donhang", o.id);
  return { order: o };
}
function customerChangeAddress(o, r) {
  if (!CUSTOMER_EDITABLE.includes(o.status)) return { error: "Đơn đã bàn giao vận chuyển nên không thể đổi thông tin nhận hàng." };
  if (o.pickup) return { error: "Đơn nhận tại siêu thị không cần đổi địa chỉ." };
  const name = String(r.name || "").trim(), phone = String(r.phone || "").trim(), address = String(r.address || "").trim();
  if (!name || !/^0\d{9}$/.test(phone) || !/\d/.test(address)) return { error: "Kiểm tra lại họ tên, số điện thoại 10 số và địa chỉ có số nhà" };
  Object.assign(o, { customer: name.slice(0, 60), phone, address: address.slice(0, 200) });
  DB.deliveries.filter(d => d.order === o.id).forEach(d => d.address = o.address);
  o.history.push({ t: nowISO(), by: "Khách hàng", text: "Đổi thông tin nhận hàng" });
  notify(["nv_cskh", "nv_kho"], `Đơn ${o.id}: khách đổi thông tin nhận hàng`, "donhang", o.id);
  return { order: o };
}
function customerTicket(cus, body) {
  const o = findOrder(body.order);
  if (!ownsOrder(cus, o)) return { error: "Không tìm thấy đơn hàng" };
  if (o.status !== "Hoàn tất") return { error: "Yêu cầu hậu mãi chỉ mở sau khi đơn đã giao thành công" };
  if (!["Hỗ trợ", "Bảo hành", "Đổi trả", "Hoàn tiền"].includes(body.type)) return { error: "Chọn loại yêu cầu" };
  const note = String(body.note || "").trim();
  if (note.length < 5) return { error: "Mô tả vấn đề cụ thể hơn giúp chúng tôi" };
  const idx = Math.max(0, o.items.findIndex(i => i.sku === body.sku));
  const t = createTicket({ order: o.id, customer: o.customer, phone: o.phone, type: body.type, product: o.items[idx].name, sku: o.items[idx].sku, serial: o.serials[idx] || "",
    note: note.slice(0, 600) + (body.file ? " Đính kèm: " + String(body.file).slice(0, 80) : ""), source: "Biểu mẫu trang đơn hàng" });
  return { ticket: t };
}
function customerComplain(cus, t, text) {
  if (!t || t.phone !== cus.phone) return { error: "Không tìm thấy phiếu" };
  if (t.status !== "Đã từ chối" || t.complaintDone) return { error: "Phiếu này không thể khiếu nại" };
  t.status = "Khiếu nại"; t.complaint = String(text || "").slice(0, 400);
  t.history.push({ t: nowISO(), by: "Khách hàng", text: "Khiếu nại: " + t.complaint });
  notify(["ql_cskh"], `Khách khiếu nại phiếu ${t.id}`, "haumai", t.id);
  return { ticket: t };
}

// Định kỳ: tự kích hoạt/đóng khuyến mãi, hủy đơn quá hạn thanh toán
function serverTick() {
  let changed = promoTick();
  const now = Date.now();
  DB.orders.filter(o => o.status === "Chờ thanh toán" && ONLINE.includes(o.method) && o.createdAt && now - new Date(o.createdAt) > PAY_MINUTES * 60000).forEach(o => {
    cancelOrder(o, "quá hạn thanh toán"); notify(["nv_cskh"], `Đơn ${o.id} tự hủy do quá hạn thanh toán`, "donhang", o.id); changed = true;
  });
  return changed;
}

/* ---------------------------------------------------------
   "MÁY CHỦ" CHẠY NGAY TRONG TRÌNH DUYỆT (bản tĩnh cho GitHub Pages)
   Các API giống hệt bản có server, dữ liệu lưu ở localStorage.
   --------------------------------------------------------- */
const PRODUCT_IMAGES = new Set(["DT-IP-16-128", "DT-IP-16PM", "DT-OP-RENO12", "DT-SS-A55", "GD-PHL-NCD", "GD-SHP-LOC", "LT-ASUS-VB15", "LT-HP-15FD", "LT-MAC-AIR13", "MG-LG-FV1410", "MG-SS-WW90", "MG-TS-AW-K9", "ML-CS-1HP", "ML-DK-FTKB35", "ML-PN-CU-N12", "TL-PN-NR-BV36", "TL-SS-RT31", "TV-LG-43UR", "TV-SONY-65X80", "TV-TCL-55C645"]);
const productImage = p => p.image || (PRODUCT_IMAGES.has(p.sku) ? "assets/products/" + p.sku + ".webp" : "");
const SESS_KEY = "ey_shop_sessions";
const readSess = () => { try { return JSON.parse(localStorage.getItem(SESS_KEY) || "{}"); } catch (e) { return {}; } };
const writeSess = s => localStorage.setItem(SESS_KEY, JSON.stringify(s));
function newToken(type, id) { const t = Math.random().toString(36).slice(2) + Date.now().toString(36); const s = readSess(); s[t] = { type, id }; writeSess(s); return t; }
function auth(t) {
  const s = t && readSess()[t]; if (!s) return null;
  if (s.type === "customer") { const c = DB.customers.find(x => x.phone === s.id); return c ? { ...s, cus: c, token: t } : null; }
  return { ...s, token: t };
}
const listeners = [];
function bump() { saveDB(); listeners.forEach(f => { try { f(); } catch (e) {} }); }
window.onDBChange = () => listeners.forEach(f => { try { f(); } catch (e) {} });   // tab khác vừa thay đổi dữ liệu
const setActor = a => { ACTOR = a; };

const pubOrder = o => ({ id: o.id, date: o.date, createdAt: o.createdAt, customer: o.customer, phone: o.phone, address: o.address, pickup: o.pickup, items: o.items,
  needInstall: o.needInstall, installSchedule: o.installSchedule, method: o.method, payStatus: o.payStatus, status: o.status, ship: o.ship, installFee: o.installFee,
  discount: o.discount, promo: o.promo, total: o.total, serials: o.serials, deliveredAt: o.deliveredAt,
  delivery: (DB.deliveries.find(d => d.order === o.id && d.status !== "Đã hủy") || {}).schedule || "",
  history: o.history.filter(h => !/rà soát|Kho báo|nội bộ/.test(h.text)).map(h => ({ t: h.t, text: h.text })) });
const pubTicket = t => ({ id: t.id, order: t.order, type: t.type, product: t.product, serial: t.serial, note: t.note, status: t.status, created: t.created,
  slot: t.inspection && t.inspection.slot, decision: t.decision, complaintDone: t.complaintDone, survey: t.survey });
const pubChat = c => ({ id: c.id, status: c.status, agent: c.agent ? (DB.users.find(u => u.username === c.agent) || {}).fullname : "", customer: c.customer,
  messages: c.messages.map(m => ({ from: m.from, t: m.t, text: m.text, name: m.name, buttons: m.used ? undefined : m.buttons })) });
function me(cus) {
  const own = o => o.account === cus.phone || o.phone === cus.phone;
  return { profile: { phone: cus.phone, name: cus.name, address: cus.address || "" }, tier: tierOf(cus.phone), tiers: TIERS,
    orders: DB.orders.filter(own).map(pubOrder),
    tickets: DB.tickets.filter(t => t.phone === cus.phone).map(pubTicket),
    warranties: DB.warranties.filter(w => w.phone === cus.phone).map(w => ({ ...w, end: warrantyEnd(w) })) };
}

const routes = [];
const route = (method, pattern, need, fn) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "([^/]+)") + "$"), need, fn });

route("GET", "/api/shop/catalog", null, () => {
  setActor({ name: "Hệ thống", role: "" }); if (promoTick()) bump();
  const c = shopCatalog();
  c.products.forEach(x => { x.image = productImage(findProduct(x.sku)); });
  return c;
});
route("POST", "/api/shop/quote", null, ({ a, body }) => cartQuote({ ...body, phone: a && a.cus ? a.cus.phone : "" }));
route("GET", "/api/shop/warranty", null, ({ q }) => {
  const s = String(q.get("serial") || "").trim().toUpperCase();
  const w = DB.warranties.find(x => x.serial.toUpperCase() === s);
  if (!w) return [404, { error: "Không tìm thấy số serial này. Kiểm tra lại tem trên sản phẩm." }];
  return { serial: w.serial, product: w.product, start: w.start, months: w.months, end: warrantyEnd(w), active: warrantyEnd(w) >= todayISO() };
});
route("POST", "/api/customer/register", null, ({ body }) => {
  const phone = String(body.phone || "").trim(), name = String(body.name || "").trim();
  if (!/^0\d{9}$/.test(phone)) return [400, { error: "Số điện thoại gồm 10 số, bắt đầu bằng 0" }];
  if (name.length < 2) return [400, { error: "Nhập họ tên" }];
  if (String(body.password || "").length < 6) return [400, { error: "Mật khẩu cần ít nhất 6 ký tự" }];
  if (DB.customers.some(c => c.phone === phone)) return [409, { error: "Số điện thoại đã có tài khoản. Hãy đăng nhập." }];
  DB.customers.push({ phone, name: name.slice(0, 60), address: "", password: String(body.password), created: new Date().toISOString() });
  bump(); return { token: newToken("customer", phone), profile: { phone, name } };
});
route("POST", "/api/customer/login", null, ({ body }) => {
  const c = DB.customers.find(x => x.phone === String(body.phone || "").trim());
  if (!c || c.password !== String(body.password || "")) return [401, { error: "Số điện thoại hoặc mật khẩu không đúng." }];
  return { token: newToken("customer", c.phone), profile: { phone: c.phone, name: c.name } };
});
route("POST", "/api/customer/logout", "any", ({ a }) => { const s = readSess(); delete s[a.token]; writeSess(s); return { ok: true }; });
route("POST", "/api/guest", null, () => ({ token: newToken("guest", Math.random().toString(16).slice(2, 14)) }));
route("GET", "/api/me", "customer", ({ a }) => me(a.cus));
route("POST", "/api/me/profile", "customer", ({ a, body }) => {
  if (body.name) a.cus.name = String(body.name).trim().slice(0, 60);
  if (body.address != null) a.cus.address = String(body.address).trim().slice(0, 200);
  bump(); return me(a.cus);
});
function withCustomer(a, fn) { setActor({ name: "Khách " + a.cus.name, role: "Khách hàng" }); const r = fn(); if (r.error) return [400, r]; bump(); return r; }
const ownOrder = (a, id) => { const o = findOrder(id); return o && (o.account === a.cus.phone || o.phone === a.cus.phone) ? o : null; };
route("POST", "/api/orders", "customer", ({ a, body }) => withCustomer(a, () => { const r = customerPlaceOrder(a.cus, body); return r.error ? r : { order: pubOrder(r.order) }; }));
route("POST", "/api/orders/:id/pay", "customer", ({ a, body, p }) => withCustomer(a, () => { const o = ownOrder(a, p[0]); if (!o) return { error: "Không tìm thấy đơn" }; const r = customerPay(o, !!body.success); return r.error ? r : { order: pubOrder(o) }; }));
route("POST", "/api/orders/:id/method", "customer", ({ a, body, p }) => withCustomer(a, () => { const o = ownOrder(a, p[0]); if (!o) return { error: "Không tìm thấy đơn" }; const r = customerChangeMethod(o, body.method); return r.error ? r : { order: pubOrder(o) }; }));
route("POST", "/api/orders/:id/cancel", "customer", ({ a, body, p }) => withCustomer(a, () => { const o = ownOrder(a, p[0]); if (!o) return { error: "Không tìm thấy đơn" }; const r = customerCancel(o, body.reason); return r.error ? r : { order: pubOrder(o) }; }));
route("POST", "/api/orders/:id/address", "customer", ({ a, body, p }) => withCustomer(a, () => { const o = ownOrder(a, p[0]); if (!o) return { error: "Không tìm thấy đơn" }; const r = customerChangeAddress(o, body); return r.error ? r : { order: pubOrder(o) }; }));
route("POST", "/api/tickets", "customer", ({ a, body }) => withCustomer(a, () => { const r = customerTicket(a.cus, body); return r.error ? r : { ticket: pubTicket(r.ticket) }; }));
route("POST", "/api/tickets/:id/complain", "customer", ({ a, body, p }) => withCustomer(a, () => { const r = customerComplain(a.cus, findTicket(p[0]), body.text); return r.error ? r : { ticket: pubTicket(r.ticket) }; }));

const ownerOf = a => a.type === "customer" ? { key: "c:" + a.cus.phone, name: a.cus.name, phone: a.cus.phone } : { key: "g:" + a.id };
route("POST", "/api/chat/start", "any", ({ a, body }) => {
  const owner = ownerOf(a);
  setActor({ name: "Trợ lý ảo", role: "Hệ thống" });
  let c = !body.fresh && DB.chats.find(x => x.owner === owner.key && x.status !== "Đã kết thúc");
  if (!c) { c = newChat(owner); bump(); }
  return pubChat(c);
});
route("GET", "/api/chat/:id", "any", ({ a, p }) => { const c = findChat(p[0]); if (!c || c.owner !== ownerOf(a).key) return [404, { error: "Không tìm thấy hội thoại" }]; return pubChat(c); });
route("POST", "/api/chat/:id/send", "any", ({ a, p, body }) => {
  const c = findChat(p[0]); if (!c || c.owner !== ownerOf(a).key) return [404, { error: "Không tìm thấy hội thoại" }];
  setActor({ name: "Trợ lý ảo", role: "Hệ thống" });
  const r = botReceive(c, { text: body.text, i: body.i, k: body.k, file: body.file });
  if (r && r.error) return [400, r];
  bump(); return pubChat(c);
});

// Gọi API: trả { status, data } giống phản hồi HTTP
function call(method, path, body, token) {
  const u = new URL(path, "http://local");
  const r = routes.find(x => x.method === method && x.re.test(u.pathname));
  if (!r) return { status: 404, data: { error: "Không có API này" } };
  const a = auth(token);
  if (r.need === "customer" && (!a || a.type !== "customer")) return { status: 401, data: { error: "Vui lòng đăng nhập" } };
  if (r.need === "any" && !a) return { status: 401, data: { error: "Vui lòng đăng nhập" } };
  try {
    const out = r.fn({ a, body: body || {}, q: u.searchParams, p: u.pathname.match(r.re).slice(1).map(decodeURIComponent) });
    return Array.isArray(out) ? { status: out[0], data: out[1] } : { status: 200, data: JSON.parse(JSON.stringify(out)) };
  } catch (e) { console.error(e); return { status: 500, data: { error: "Lỗi: " + e.message } }; }
}
function resetShop() { resetDB(); localStorage.removeItem(SESS_KEY); }

loadDB();
setInterval(() => { setActor({ name: "Hệ thống", role: "" }); if (serverTick()) bump(); }, 30000);
return { call, onChange: f => listeners.push(f), reset: resetShop };

})();
