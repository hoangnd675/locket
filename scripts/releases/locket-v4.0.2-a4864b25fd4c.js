/* global $request, $response, $done, $argument, $persistentStore */
// One standalone runtime. No outbound requests; only sanitized diagnostics are persisted.
(function () {
  "use strict";

  var TAG = "[locket_cuios_stable] ";
  var VERSION = "4.0.2";
  var STATE_KEY = "CUIOS_STABLE_V4_DIAGNOSTICS";
  var WARNINGS = [];
  var CURRENT_SERVICE = "runtime";
  var VIDEO_SECONDS = 60;
  var VIDEO_BYTES = 100 * 1024 * 1024;
  var ASSET_BASE = "https://raw.githubusercontent.com/Cuongqtx11/locket_cuios_stable/main/assets/";
  // BEGIN GENERATED CAPTION CATALOGUE
  var CAPTIONS = [{"id":"brand","section":"Cuios • Bản quyền","background":"brand","items":[["certificate","t.me/tomqtx1111","👑"],["copyright","Bản quyền Cuios","✨"],["cun","Cưn🍤","🍤"],["tom","tom11th5","💛"]]},{"id":"tease","section":"Trêu đùa","background":"tease","items":[["pretend","Thấy tớ rồi, đừng giả vờ","😏",{"style":"prism","image":"captions/v4.0.2/tease_pretend-f0846303d0.png","colors":["#0D201A","#2D503E"]}],["look","Nhìn gì, thích tớ à?","👀",{"style":"prism","image":"captions/v4.0.2/tease_look-b1be52f1aa.png","colors":["#100F30","#272350"]}],["shy","Thả tim đi, đừng ngại","💛",{"style":"silk","image":"captions/v4.0.2/tease_shy-afc122d686.png","colors":["#2C112F","#6A284E"]}],["remember","Xem ảnh hay đang nhớ tớ?","🤭",{"style":"galaxy","image":"captions/v4.0.2/tease_remember-e46956e6d9.png","colors":["#132642","#204E6F"]}],["flirt","Cười gì? Đang thả thính đấy","🎣",{"style":"ember","image":"captions/v4.0.2/tease_flirt-55fe53fb40.png","colors":["#271426","#5D3B4F"]}],["know","Tớ xinh, tớ biết rồi","💅",{"style":"bloom","image":"captions/v4.0.2/tease_know-84f2fe795a.png","colors":["#081D2C","#0F4D4C"]}],["selective","Độc thân có chọn lọc","😌",{"style":"galaxy","image":"captions/v4.0.2/tease_selective-58cab08195.png","colors":["#13192C","#314268"]}],["longlook","Cậu nhìn lâu là tớ ngại","🙈",{"style":"silk","image":"captions/v4.0.2/tease_longlook-a11fbff776.png","colors":["#0E1B2F","#1F4D6E"]}],["loveplease","Đã xem thì phải thương","🥺",{"style":"aurora","image":"captions/v4.0.2/tease_loveplease-1edeb63ff3.png","colors":["#102036","#1A3E5A"]}],["space","Tim cậu còn chỗ không?","💘",{"style":"bloom","image":"captions/v4.0.2/tease_space-3d02cc2d7c.png","colors":["#12243E","#193D59"]}],["fee","Ảnh miễn phí, nhớ tớ tính tiền","🤑",{"style":"sunset","image":"captions/v4.0.2/tease_fee-7d4a38e239.png","colors":["#13253F","#1A405C"]}],["behave","Đang ngoan, đừng chọc","😼",{"style":"aurora","image":"captions/v4.0.2/tease_behave-9c87deb363.png","colors":["#281527","#472C3D"]}],["price","Không chảnh, chỉ hơi đắt giá","👑",{"style":"prism","image":"captions/v4.0.2/tease_price-93ac92e098.png","colors":["#20120B","#57381C"]}],["early","Chưa yêu mà nhớ hơi nhiều","🫣",{"style":"hologram","image":"captions/v4.0.2/tease_early-31297fbbd8.png","colors":["#0E231C","#345B47"]}],["closer","Thích thì nhích lại đây","🫶",{"style":"neon","image":"captions/v4.0.2/tease_closer-5cc9f1b9f8.png","colors":["#071A27","#0D4445"]}],["reply","Không rep là tớ dỗi","😤",{"style":"bloom","image":"captions/v4.0.2/tease_reply-32a8659a82.png","colors":["#100F2F","#322C63"]}],["attention","Xin vía được cậu để ý","✨",{"style":"aurora","image":"captions/v4.0.2/tease_attention-5f4b7508c2.png","colors":["#28170E","#51341A"]}],["order","Chốt đơn một người thương","🛒",{"style":"sunset","image":"captions/v4.0.2/tease_order-d36026ff6c.png","colors":["#15143E","#352E68"]}],["secret","Nhìn vậy thôi, mê cậu lắm","🤫",{"style":"aurora","image":"captions/v4.0.2/tease_secret-b05c31f9c6.png","colors":["#071A29","#0F4E4D"]}],["standstill","Đứng yên, tớ thả thính","🎯",{"style":"bloom","image":"captions/v4.0.2/tease_standstill-0ccc54c5db.png","colors":["#102126","#204446"]}],["cute","Xinh thế này ai chịu nổi","😎",{"style":"sunset","image":"captions/v4.0.2/tease_cute-793e004adc.png","colors":["#132D25","#2B4D3C"]}],["seen","Xem rồi thì nhớ tớ đi","👀",{"style":"ocean","image":"captions/v4.0.2/tease_seen-b538b442f7.png","colors":["#0F0F2E","#272350"]}],["crush","Đẹp vậy mà vẫn độc thân","😌",{"style":"liquid","image":"captions/v4.0.2/tease_crush-2af64e8a2c.png","colors":["#2A180F","#5F3D1F"]}],["heart","Lỡ xem là phải thả tim","😏",{"style":"liquid","image":"captions/v4.0.2/tease_heart-7dbc4a025d.png","colors":["#1D1134","#492C66"]}],["busy","Bận đáng yêu, lát nhắn","💅",{"style":"ocean","image":"captions/v4.0.2/tease_busy-9d8e692d0d.png","colors":["#143128","#2A4A3A"]}],["snack","Không giận, chỉ thiếu trà sữa","🧋",{"style":"hologram","image":"captions/v4.0.2/tease_snack-427794f461.png","colors":["#13253F","#1D4766"]}],["signal","Phát tín hiệu: nhớ bạn","📡",{"style":"aurora","image":"captions/v4.0.2/tease_signal-c3538be808.png","colors":["#2D182C","#543548"]}],["sleep","Online đó, nhưng buồn ngủ","😴",{"style":"liquid","image":"captions/v4.0.2/tease_sleep-b1b4b104db.png","colors":["#1B1C36","#32354F"]}],["model","Camera thường, người phi thường","🤳",{"style":"cyber","image":"captions/v4.0.2/tease_model-3530c6174f.png","colors":["#23143D","#492C67"]}],["notice","Thông báo: cần được cưng","📣",{"style":"galaxy","image":"captions/v4.0.2/tease_notice-478808ea82.png","colors":["#0D1A2D","#1F4D6E"]}]]},{"id":"humor","section":"Hài hước","background":"joy","items":[["wallet","Ví mỏng, tâm hồn phú hộ","💸",{"style":"bloom","image":"captions/v4.0.2/humor_wallet-feaaa2472a.png","colors":["#28161A","#4B2726"]}],["deadline","Deadline dí, tớ vẫn lì","🫠",{"style":"sunset","image":"captions/v4.0.2/humor_deadline-c0a4555844.png","colors":["#143128","#325744"]}],["attitude","Hết tiền nhưng còn thần thái","😎",{"style":"prism","image":"captions/v4.0.2/humor_attitude-cad748e545.png","colors":["#1B0F2F","#4D2E6C"]}],["awake","Dậy rồi, hồn chưa tới","👻",{"style":"prism","image":"captions/v4.0.2/humor_awake-a37aec1770.png","colors":["#181930","#3F4462"]}],["natural","Đẹp tự nhiên, lười tự phát","🦥",{"style":"ember","image":"captions/v4.0.2/humor_natural-c8445ca789.png","colors":["#12262B","#204547"]}],["maintenance","Não đang bảo trì","🧠",{"style":"aurora","image":"captions/v4.0.2/humor_maintenance-7de1434483.png","colors":["#250E28","#562041"]}],["eatfirst","Ăn trước, tính sau","🍜",{"style":"sunset","image":"captions/v4.0.2/humor_eatfirst-7da6f87d0b.png","colors":["#0F1D33","#1C4463"]}],["salary","Lương chưa về, đơn đã tới","📦",{"style":"aurora","image":"captions/v4.0.2/humor_salary-540a1e85e4.png","colors":["#111032","#2C2758"]}],["rest","Chăm chỉ nghỉ ngơi","🛌",{"style":"silk","image":"captions/v4.0.2/humor_rest-61d8a54865.png","colors":["#23140C","#59391D"]}],["hungry","Bụng đói, miệng vẫn cười","😋",{"style":"cyber","image":"captions/v4.0.2/humor_hungry-4698db8060.png","colors":["#141B30","#2F3F63"]}],["sleepy","Chưa giàu nhưng rất buồn ngủ","😴",{"style":"liquid","image":"captions/v4.0.2/humor_sleepy-166ae52e3a.png","colors":["#2B190F","#4E3219"]}],["lag","Mặt tỉnh, đầu đang lag","🌀",{"style":"neon","image":"captions/v4.0.2/humor_lag-bd502f912f.png","colors":["#311335","#552041"]}],["subject","Giỏi nhất môn nằm nghỉ","🏆",{"style":"galaxy","image":"captions/v4.0.2/humor_subject-f05e756e10.png","colors":["#143027","#294A3A"]}],["alarm","Sống lỗi với báo thức","⏰",{"style":"ocean","image":"captions/v4.0.2/humor_alarm-a5edf8a2f8.png","colors":["#151440","#272351"]}],["gossip","Pin yếu mà vẫn hóng","🍿",{"style":"silk","image":"captions/v4.0.2/humor_gossip-2f05829d4b.png","colors":["#17182E","#30344C"]}]]},{"id":"love","section":"Tình yêu","background":"love","items":[["choose","Tim tớ chọn cậu rồi","💗",{"style":"ocean","image":"captions/v4.0.2/love_choose-d96dce875d.png","colors":["#341C22","#5D312F"]}],["withyou","Đi đâu cũng muốn có cậu","🫶",{"style":"cyber","image":"captions/v4.0.2/love_withyou-82c81d9062.png","colors":["#29102C","#612448"]}],["soft","Gặp cậu là ngày đẹp","🌷",{"style":"prism","image":"captions/v4.0.2/love_soft-4a087f68fa.png","colors":["#2A1629","#674157"]}],["little","Thương cậu thêm một chút","💕",{"style":"cyber","image":"captions/v4.0.2/love_little-e322d0fa6d.png","colors":["#081E2F","#10504F"]}],["home","Bên cậu là thấy nhà","🏡",{"style":"neon","image":"captions/v4.0.2/love_home-cc1a3d73ef.png","colors":["#142A30","#22494A"]}],["hug","Gửi cậu một cái ôm","🤍",{"style":"bloom","image":"captions/v4.0.2/love_hug-49993c3c36.png","colors":["#1B1C36","#383C57"]}],["miss","Nhớ cậu, không cần lý do","💌",{"style":"liquid","image":"captions/v4.0.2/love_miss-24845da925.png","colors":["#071826","#105352"]}],["smile","Cậu cười là tớ thua","🥰",{"style":"ember","image":"captions/v4.0.2/love_smile-562e28ceee.png","colors":["#162D33","#1F4243"]}],["wait","Chừa một chỗ cạnh tớ nhé","💞",{"style":"hologram","image":"captions/v4.0.2/love_wait-a62057abc9.png","colors":["#141A2F","#314267"]}],["simple","Thích cậu, thế thôi","💘",{"style":"neon","image":"captions/v4.0.2/love_simple-bac6bedf2d.png","colors":["#081D2D","#115A58"]}]]},{"id":"joy","section":"Vui vẻ","background":"joy","items":[["enough","Hôm nay vui vừa đủ","🌞",{"style":"cyber","image":"captions/v4.0.2/joy_enough-dab80fd762.png","colors":["#2A1629","#664056"]}],["vitamin","Nạp một chút vitamin cười","🍊",{"style":"galaxy","image":"captions/v4.0.2/joy_vitamin-050193247d.png","colors":["#12233C","#173750"]}],["happy","Đang bận yêu đời","🌈",{"style":"liquid","image":"captions/v4.0.2/joy_happy-8b3b65a09e.png","colors":["#23143D","#3F265A"]}],["broadcast","Niềm vui đang phát sóng","📻",{"style":"bloom","image":"captions/v4.0.2/joy_broadcast-d016470dd7.png","colors":["#311B1F","#613330"]}],["sun","Mang nắng về nhà","☀️",{"style":"prism","image":"captions/v4.0.2/joy_sun-308e201e3c.png","colors":["#0A2437","#105453"]}],["luck","May mắn ghé chơi rồi","🍀",{"style":"ember","image":"captions/v4.0.2/joy_luck-023168ccbe.png","colors":["#100F2F","#282352"]}],["photo","Chụp vội một ngày xinh","📸",{"style":"ocean","image":"captions/v4.0.2/joy_photo-64672706c8.png","colors":["#261643","#472B65"]}],["weekend","Cuối tuần nằm trong tim","🎈",{"style":"ember","image":"captions/v4.0.2/joy_weekend-f1153a3a0d.png","colors":["#311B1F","#6C3935"]}],["save","Một ngày đáng lưu lại","✨",{"style":"liquid","image":"captions/v4.0.2/joy_save-4d16cb7762.png","colors":["#15143F","#352F68"]}],["laugh","Cười lên, ảnh đang đẹp","😆",{"style":"aurora","image":"captions/v4.0.2/joy_laugh-a8754e46e7.png","colors":["#0E221B","#2D4F3E"]}]]},{"id":"mood","section":"Cảm xúc","background":"mood","items":[["rain","Hôm nay lòng hơi mưa","🌧️",{"style":"sunset","image":"captions/v4.0.2/mood_rain-4a654b1ae3.png","colors":["#250E28","#5D2346"]}],["quiet","Cho tớ yên một chút","🌙",{"style":"silk","image":"captions/v4.0.2/mood_quiet-28172e70c4.png","colors":["#29102C","#511E3E"]}],["thought","Có vài điều chưa nói","💭",{"style":"ember","image":"captions/v4.0.2/mood_thought-6944e9a297.png","colors":["#111032","#272250"]}],["slow","Đang học cách chậm lại","🍃",{"style":"cyber","image":"captions/v4.0.2/mood_slow-a216d084c2.png","colors":["#122C24","#254334"]}],["hug","Một cái ôm là đủ","🫂",{"style":"liquid","image":"captions/v4.0.2/mood_hug-e4469b03ac.png","colors":["#15162A","#3B3F5B"]}],["tired","Hết pin, cần được thương","🪫",{"style":"ocean","image":"captions/v4.0.2/mood_tired-15625d5b32.png","colors":["#2A102D","#4E1D3C"]}],["okay","Không ổn cũng không sao","🤍",{"style":"neon","image":"captions/v4.0.2/mood_okay-f38da52d88.png","colors":["#351D22","#613330"]}],["hope","Ngày mai mình thử lại","🌅",{"style":"hologram","image":"captions/v4.0.2/mood_hope-245a949bbd.png","colors":["#121136","#302A60"]}],["memory","Có người nằm trong ký ức","🎞️",{"style":"neon","image":"captions/v4.0.2/mood_memory-23b05b34c1.png","colors":["#112138","#173750"]}],["feeling","Chẳng biết gọi tên cảm xúc","🫧",{"style":"sunset","image":"captions/v4.0.2/mood_feeling-4d86f30d50.png","colors":["#281745","#492C66"]}]]},{"id":"friends","section":"Bạn bè","background":"love","items":[["karma","Bạn thân, nghiệp ai nấy giữ","🤝",{"style":"neon","image":"captions/v4.0.2/friends_karma-a5bfb0375d.png","colors":["#0F0E2D","#302B60"]}],["stories","Có bạn là có chuyện kể","💬",{"style":"galaxy","image":"captions/v4.0.2/friends_stories-587481d12e.png","colors":["#251324","#563649"]}],["together","Đi cùng nhau mới vui","🎈",{"style":"prism","image":"captions/v4.0.2/friends_together-20f945b5cd.png","colors":["#2D1130","#4D1D3B"]}],["call","Bạn gọi, tớ có mặt","🫂",{"style":"silk","image":"captions/v4.0.2/friends_call-0b0e3e6484.png","colors":["#29161A","#4C2827"]}],["snacks","Đồng đội hệ ăn vặt","🍟",{"style":"galaxy","image":"captions/v4.0.2/friends_snacks-cf1c4b4c96.png","colors":["#13253F","#183A55"]}]]},{"id":"daily","section":"Đời thường","background":"mood","items":[["coffee","Cà phê trước, thế giới sau","☕",{"style":"hologram","image":"captions/v4.0.2/daily_coffee-db423704d1.png","colors":["#0F251E","#2B4D3C"]}],["study","Học một chút, mơ thật nhiều","📚",{"style":"ember","image":"captions/v4.0.2/daily_study-be2c48e577.png","colors":["#2C172B","#643F55"]}],["offwork","Tan làm là hồi sinh","🌅",{"style":"hologram","image":"captions/v4.0.2/daily_offwork-feab508772.png","colors":["#261642","#382251"]}],["anywhere","Đi đâu cũng được, miễn vui","🛵",{"style":"galaxy","image":"captions/v4.0.2/daily_anywhere-fe30e6bbd7.png","colors":["#161440","#26224E"]}],["ordinary","Ngày bình thường, ảnh xinh","📸",{"style":"neon","image":"captions/v4.0.2/daily_ordinary-1aa76b7bc0.png","colors":["#143027","#2D503E"]}]]},{"id":"confidence","section":"Tự tin · Yêu đời","background":"tease","items":[["filter","Tự tin là bộ lọc đẹp nhất","✨",{"style":"ocean","image":"captions/v4.0.2/confidence_filter-6703fe6e88.png","colors":["#171F37","#263350"]}],["choice","Tớ chọn vui, cậu chọn gì?","🌞",{"style":"cyber","image":"captions/v4.0.2/confidence_choice-1cf87211dd.png","colors":["#142642","#173852"]}],["version","Phiên bản này hơi đáng yêu","💖",{"style":"hologram","image":"captions/v4.0.2/confidence_version-a5da7658e0.png","colors":["#1D1032","#43285F"]}],["myway","Đẹp theo cách của tớ","🌷",{"style":"hologram","image":"captions/v4.0.2/confidence_myway-27022b568d.png","colors":["#1B1C36","#3D425F"]}],["imperfect","Không hoàn hảo, vẫn rất xịn","🌟",{"style":"silk","image":"captions/v4.0.2/confidence_imperfect-dcb30f9f89.png","colors":["#321B20","#6B3835"]}]]}];
  // END GENERATED CAPTION CATALOGUE
  var RC = /^https:\/\/(?:api\.revenuecat\.com|api\.rc-backup\.com|api-production\.8-lives-cat\.io)\/v1\/(?:receipts|subscribers\/[^/?#]+)\/?(?:\?[^#]*)?$/i;
  var RC_PROBE = /^https:\/\/(?:api\.revenuecat\.com|api\.rc-backup\.com|api-production\.8-lives-cat\.io)\/(?:v1|v2)\/(?:receipts|subscribers)(?:[/?]|$)/i;
  var FIREBASE = /^https:\/\/firebaseremoteconfig\.googleapis\.com\/v1\/projects\/(?:locket-4252a|869942740286)\/namespaces\/firebase:fetch\/?(?:\?[^#]*)?$/i;
  var FIREBASE_PROBE = /^https:\/\/firebaseremoteconfig\.googleapis\.com\/v1\/projects\/[^/?#]+\/namespaces\/[^/?#]+:fetch\/?(?:\?[^#]*)?$/i;
  var STATUS = /^http:\/\/cuios-status\.invalid\/(status|report\.json)(?:\?[^#]*)?$/i;
  var HTTPS_CHECK = /^https:\/\/(api\.revenuecat\.com|firebaseremoteconfig\.googleapis\.com)\/cuios-check(?:\?[^#]*)?$/i;

  function log(message) {
    // Deliberately omit URLs, headers, IDs and response bodies from logs.
    if (typeof console !== "undefined" && typeof console.log === "function") {
      try { console.log(TAG + message); } catch (_) { /* Logging must not abort a request. */ }
    }
  }

  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function header(headers, name) {
    var keys = Object.keys(headers || {});
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === name) return String(headers[keys[i]]);
    }
    return "";
  }

  function readDiagnostics() {
    var state = { schema: 1, version: VERSION, services: {} };
    try {
      if (typeof $persistentStore !== "undefined") {
        ["firebase", "revenuecat", "unidentified_revenuecat", "runtime", "https_revenuecat", "https_firebase"].forEach(function (service) {
          try {
            var parsed = JSON.parse($persistentStore.read(STATE_KEY + "_" + service) || "null");
            if (record(parsed) && parsed.schema === 1 && record(parsed.data) &&
                typeof parsed.data.at === "number" && isFinite(parsed.data.at) && parsed.data.at >= 0 && parsed.data.at < 8e15) {
              state.services[service] = parsed.data;
            }
          } catch (_) { /* One corrupt service record must not hide other observations. */ }
        });
      }
    } catch (_) { /* Diagnostics are optional; never block app traffic. */ }
    return state;
  }

  function event(service, values) {
    try {
      var state = readDiagnostics();
      var data = Object.assign({}, state.services[service] || {}, values, { at: Date.now(), version: VERSION });
      // Separate service keys prevent parallel RC/Firebase scripts from erasing each other's status.
      if (typeof $persistentStore !== "undefined" &&
          $persistentStore.write(JSON.stringify({ schema: 1, data: data }), STATE_KEY + "_" + service) === false) log("diagnostics: storage write failed");
    } catch (_) { /* A full/unsupported store must not change network behavior. */ }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function statusPage(request, json) {
    var method = String(request.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      return { response: { status: 405, headers: { Allow: "GET, HEAD" }, body: "Method not allowed" } };
    }
    var storageWorking = false;
    try {
      if (typeof $persistentStore !== "undefined") {
        var probe = String(Date.now());
        storageWorking = $persistentStore.write(probe, STATE_KEY + "_probe") !== false &&
          $persistentStore.read(STATE_KEY + "_probe") === probe;
      }
    } catch (_) { /* Show that observation storage is unavailable instead of implying no traffic. */ }
    var state = readDiagnostics();
    var report = {
      runtime: VERSION,
      storageAvailable: storageWorking,
      recipe: { seconds: VIDEO_SECONDS, uploadBytes: VIDEO_BYTES, captions: 94 },
      observed: state.services,
      deviceFeaturesVerified: false,
      note: "Đây là request/response script đã quan sát, không phải xác nhận Locket đã activate hoặc mic/video đã hoạt động."
    };
    var headers = { "Content-Type": json ? "application/json; charset=utf-8" : "text/html; charset=utf-8", "Cache-Control": "no-store" };
    var body;
    if (json) body = JSON.stringify(report, null, 2);
    else {
      function card(name, service) {
        var data = state.services[service];
        var stale = data && Date.now() - data.at > 300000;
        var description = !data ? "Chưa quan sát thấy request qua script này."
          : data.action === "patched" ? "Đã sửa response gửi về app. Chưa xác nhận app đã áp dụng."
          : data.action === "partial" ? "Đã sửa một phần; có trường không khớp schema."
          : data.action === "active_gold_preserved" ? "Response có Gold đang hoạt động; giữ nguyên."
          : data.action === "https_hook_seen" ? "Hook HTTPS đã chạy từ trình duyệt. Chưa chứng minh app Locket gửi request."
          : data.action === "request_seen" ? "Đã thấy request; chưa có kết quả response mới."
          : "Cần kiểm tra: " + String(data.action || "unknown");
        return "<section><h2>" + name + "</h2>" + (stale ? "<p><strong>Đây là quan sát cũ hơn 5 phút, chưa chứng minh app vừa tải lại cấu hình.</strong></p>" : "") + "<p>" + escapeHTML(description) + "</p>" +
          (data ? "<small>Lần cuối: " + escapeHTML(new Date(data.at).toISOString()) + "</small>" : "") + "</section>";
      }
      body = "<!doctype html><html lang=vi><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Cuios · Trạng thái</title>" +
        "<style>body{font:16px system-ui;background:#101522;color:#edf1ff;max-width:780px;margin:auto;padding:24px}section{background:#1d2639;border:1px solid #46516b;border-radius:16px;padding:18px;margin:16px 0}h1{font-size:27px}h2{font-size:20px}p{line-height:1.6}a{color:#b6c8ff}small{color:#b9c3d9}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}strong{color:#ffd693}</style>" +
        "<h1>Cuios · Kiểm tra kết nối</h1><p>Script đang chạy: <strong>v" + VERSION + "</strong>. Mục tiêu: 60s · 100 MiB · 94 ghi chú.</p>" +
        (storageWorking ? "" : "<section><strong>Kho chẩn đoán không ghi/đọc được. Thiếu trạng thái ở đây chưa chứng minh app không có request; cần xem log script.</strong></section>") +
        card("RevenueCat", "revenuecat") + card("Firebase Remote Config", "firebase") +
        "<section><h2>Kiểm tra HTTPS từ Safari</h2><p><a href='https://api.revenuecat.com/cuios-check'>Kiểm tra RevenueCat</a> · <a href='https://firebaseremoteconfig.googleapis.com/cuios-check'>Kiểm tra Firebase</a></p><p>Chỉ trang có chữ Cuios và v4.0.2 là response kiểm tra từ script. Trang lỗi Google/404 không phải kết quả thành công.</p></section>" +
        card("HTTPS RevenueCat qua trình duyệt", "https_revenuecat") + card("HTTPS Firebase qua trình duyệt", "https_firebase") +
        "<section><h2>Đọc kết quả</h2><p>Nếu chưa có request Firebase, đổi module chưa đủ để Locket tải cấu hình mới. Nếu response đã được sửa mà app vẫn cũ, cần kiểm tra activate/schema phía app. Trang này không tự xoá cache Locket hoặc cấp quyền mic.</p><p>Chỉ bật một module Locket. Bật proxy trước, mở Locket, rồi mở lại trang này.</p></section>" +
        "<p><a href='/status?reload=1'>Tải lại trạng thái</a> · <a href='/report.json'>Xem báo cáo chẩn đoán</a></p><details><summary>Chi tiết có thể gửi để kiểm tra</summary><pre>" + escapeHTML(JSON.stringify(report, null, 2)) + "</pre></details></html>";
      headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'";
      headers["X-Content-Type-Options"] = "nosniff";
    }
    return { response: { status: 200, headers: headers, body: method === "HEAD" ? "" : body } };
  }

  function identity(request) {
    var bundle = header(request.headers, "x-client-bundle-id") || header(request.headers, "x-ios-bundle-identifier");
    if (bundle) return /^com\.locket\.locket(?:\.[a-z0-9_.-]+)?$/i.test(bundle) ? "bundle" : "other_app";
    return /locket/i.test(header(request.headers, "user-agent")) ? "user_agent" : "unknown";
  }

  function locketRequest(request) {
    var kind = identity(request);
    return kind === "bundle" || kind === "user_agent";
  }

  function locketSubscriber(subscriber) {
    var gold = record(subscriber.entitlements) ? subscriber.entitlements.Gold : null;
    return (record(gold) && typeof gold.product_identifier === "string" &&
      /^locket_/i.test(gold.product_identifier)) ||
      (record(subscriber.subscriptions) && Object.keys(subscriber.subscriptions).some(function (key) {
        return /^locket_/i.test(key);
      }));
  }

  function statusCode(response) {
    var value = response.statusCode !== undefined ? response.statusCode : response.status;
    if (value === undefined) return 200; // Some compatible runtimes omit status.
    var match = String(value).match(/\b([1-5]\d{2})\b/);
    return match ? Number(match[1]) : 0;
  }

  function requestPatch(request, isRC) {
    // RevenueCat is shared by other apps. Only alter identifiable Locket requests.
    if (isRC && !locketRequest(request)) {
      event("unidentified_revenuecat", { action: "identity_missing_or_other_app", requestAt: Date.now() });
      return {};
    }
    event(CURRENT_SERVICE, { action: "request_seen", requestAt: Date.now(), identity: identity(request) });
    var headers = Object.assign({}, request.headers || {});
    var changed = false;
    Object.keys(headers).forEach(function (key) {
      if (/^(?:if-none-match|if-modified-since|x-revenuecat-etag)$/i.test(key)) {
        delete headers[key];
        changed = true;
      }
    });
    if (changed) log("request: removed conditional cache headers");
    return changed ? { headers: headers } : {};
  }

  function goldPatch(payload, request) {
    if (!record(payload.subscriber)) {
      log("revenuecat: skipped unexpected subscriber schema");
      if (locketRequest(request)) event("revenuecat", { action: "unexpected_subscriber_schema" });
      return false;
    }
    var subscriber = payload.subscriber;
    if (identity(request) === "other_app" || (!locketRequest(request) && !locketSubscriber(subscriber))) {
      log("revenuecat: skipped unrecognized app");
      event("unidentified_revenuecat", { action: "identity_missing_or_other_app", responseAt: Date.now() });
      return false;
    }
    if ((subscriber.entitlements != null && !record(subscriber.entitlements)) ||
        (subscriber.subscriptions != null && !record(subscriber.subscriptions))) {
      log("revenuecat: skipped unexpected entitlement schema");
      event("revenuecat", { action: "unexpected_entitlement_schema" });
      return false;
    }
    var entitlements = subscriber.entitlements || {};
    var subscriptions = subscriber.subscriptions || {};
    var oldGold = record(entitlements.Gold) ? entitlements.Gold : {};
    var currentProduct = oldGold.product_identifier;
    var currentSubscription = subscriptions[currentProduct];
    if (record(currentSubscription) &&
        (oldGold.expires_date === null || Date.parse(oldGold.expires_date) > Date.now()) &&
        (currentSubscription.expires_date === null || Date.parse(currentSubscription.expires_date) > Date.now())) {
      log("revenuecat: existing active Gold preserved");
      event("revenuecat", { action: "active_gold_preserved", responseAt: Date.now() });
      return false;
    }
    var product = typeof currentProduct === "string" && /^locket_/i.test(currentProduct)
      ? currentProduct : "locket_1600_1y";
    var previous = record(subscriptions[product]) ? subscriptions[product] : {};
    var purchase = "2024-01-01T00:00:00Z";
    var expiration = "2099-12-31T23:59:59Z";
    subscriber.subscriptions = subscriptions;
    subscriber.entitlements = entitlements;
    subscriptions[product] = Object.assign({}, previous, {
      purchase_date: purchase,
      original_purchase_date: purchase,
      expires_date: expiration,
      store: "app_store",
      ownership_type: "PURCHASED",
      period_type: "normal",
      is_sandbox: false,
      billing_issues_detected_at: null,
      unsubscribe_detected_at: null,
      grace_period_expires_date: null,
      refunded_at: null
    });
    entitlements.Gold = Object.assign({}, oldGold, {
      product_identifier: product,
      purchase_date: purchase,
      expires_date: expiration,
      grace_period_expires_date: null
    });
    log("revenuecat: local Gold response patched");
    event("revenuecat", { action: "patched", responseAt: Date.now(), identity: locketRequest(request) ? identity(request) : "payload_product" });
    return true;
  }

  function mergeEntry(entries, key, patch) {
    var previous = {};
    if (entries[key] !== undefined) {
      try {
        previous = typeof entries[key] === "string" ? JSON.parse(entries[key]) : entries[key];
      } catch (_) {
        log("firebase: skipped malformed nested entry " + key);
        WARNINGS.push(key);
        return false;
      }
      if (!record(previous)) {
        log("firebase: skipped unexpected nested entry " + key);
        WARNINGS.push(key);
        return false;
      }
    }
    // Remote Config entry values are strings, including nested JSON.
    entries[key] = JSON.stringify(Object.assign({}, previous, patch));
    return true;
  }

  function configDiagnostics(entries) {
    function shape(value) {
      if (value === undefined) return "absent";
      if (typeof value === "string") {
        try { value = JSON.parse(value); } catch (_) { return "unparsed-string"; }
      }
      if (Array.isArray(value)) return "array(" + value.length + ")";
      if (record(value)) return "object";
      return value === null ? "null" : typeof value;
    }
    function flag(value) {
      if (value === undefined) return "absent";
      if (value === true || value === "true") return "on";
      if (value === false || value === "false") return "off";
      return "other";
    }
    // Fixed allowlists and classifications only. Never print user-controlled values.
    log("diag v" + VERSION + " input schema " + ["camera", "camera_roll", "video_config",
      "feature_gates", "overlay_items", "overlay_dynamic_captions", "widget_frame_event"].map(function (key) {
      return key + "=" + shape(entries[key]);
    }).join(" "));
    log("diag v" + VERSION + " input flags " + ["video_sound_enabled", "microphone_enabled",
      "camera_microphone_enabled", "mh_mic_enabled_v16", "camera_roll_video_enabled",
      "camera_roll_video_upload_enabled", "internal_camera_roll_video_upload_enabled",
      "custom_widget_frames_enabled"].map(function (key) {
      return key + "=" + flag(entries[key]);
    }).join(" "));
    var library;
    try { library = typeof entries.camera_roll === "string" ? JSON.parse(entries.camera_roll) : entries.camera_roll; } catch (_) { library = null; }
    var report = [];
    function inspect(object, path, depth) {
      if (!record(object) || depth > 4 || report.length >= 8) return;
      var limits = { path: path };
      ["max_duration", "video_max_duration", "maximum_duration", "trim_max_duration",
        "max_duration_ms", "max_file_size", "max_upload_bytes", "max_size_bytes", "max_size_mb"].forEach(function (key) {
        if (typeof object[key] === "number" || (typeof object[key] === "string" && /^\d+(?:\.\d+)?$/.test(object[key]))) {
          var number = Number(object[key]);
          if (isFinite(number) && number >= 0 && number <= 1e12) limits[key] = number;
        }
      });
      if (Object.keys(limits).length > 1) report.push(limits);
      ["video", "upload", "recording", "trim", "limits", "free", "gold", "default"].forEach(function (key) {
        inspect(object[key], path + "." + key, depth + 1);
      });
    }
    inspect(library, "camera_roll", 0);
    log("diag v" + VERSION + " input library limits " + JSON.stringify(report));
    var schema = {}, flags = {};
    ["camera", "camera_roll", "video_config", "feature_gates", "overlay_items", "overlay_dynamic_captions", "widget_frame_event"].forEach(function (key) {
      schema[key] = shape(entries[key]);
    });
    ["video_sound_enabled", "microphone_enabled", "camera_microphone_enabled", "mh_mic_enabled_v16",
      "camera_roll_video_enabled", "camera_roll_video_upload_enabled", "internal_camera_roll_video_upload_enabled"].forEach(function (key) {
      flags[key] = flag(entries[key]);
    });
    var mediaFields = [];
    function fields(object, path, depth) {
      if (!record(object) || depth > 3 || mediaFields.length >= 60) return;
      Object.keys(object).forEach(function (key) {
        if (mediaFields.length >= 60 || !/^[a-zA-Z][a-zA-Z0-9_]{0,47}$/.test(key) ||
            /user|uid|token|auth|phone|mail|receipt|private|password|secret/i.test(key)) return;
        if (/audio|mic|sound|video|camera|record|duration|trim|size|length/i.test(key)) {
          var value = object[key];
          mediaFields.push({ path: path, field: key, type: shape(value), flag: flag(value) });
        }
      });
      ["video", "upload", "recording", "trim", "limits", "free", "gold", "default", "audio"].forEach(function (key) {
        fields(object[key], path + "." + key, depth + 1);
      });
    }
    ["camera", "camera_roll", "video_config"].forEach(function (key) {
      var value;
      try { value = typeof entries[key] === "string" ? JSON.parse(entries[key]) : entries[key]; } catch (_) { value = null; }
      fields(value, key, 0);
    });
    event("firebase", { inputSchema: schema, inputFlags: flags, inputLibraryLimits: report, inputMediaFields: mediaFields });
  }

  function patchMedia(entries, key, defaults) {
    if (defaults) mergeEntry(entries, key, defaults);
    if (entries[key] === undefined) return;
    var config;
    try {
      config = typeof entries[key] === "string" ? JSON.parse(entries[key]) : entries[key];
    } catch (_) { if (WARNINGS.indexOf(key) < 0) WARNINGS.push(key); return; }
    if (!record(config)) { if (WARNINGS.indexOf(key) < 0) WARNINGS.push(key); return; }

    // Compatibility defaults; these do not add native capture/picker implementations.
    var switches = key === "camera" ? ["microphone_enabled", "sound_enabled"]
      : key === "camera_roll" ? ["enabled", "video_enabled", "video_upload_enabled", "preserve_audio"] : [];
    switches.forEach(function (name) {
      if (config[name] === undefined) config[name] = true;
    });

    // Only known media entries; never rewrite arbitrary numbers or Android schemas.
    ["gold_max_duration", "goldMaxDuration", "max_duration", "maxDuration",
      "video_max_duration", "videoMaxDuration", "video_duration", "videoDuration",
      "trim_max_duration", "trimMaxDuration", "camera_roll_max_duration",
      "camera_roll_video_max_duration", "recording_duration", "recording_max_duration",
      "longer_videos_duration", "longer_video_duration", "maximum_duration", "maximumDuration", "max_length"].forEach(function (name) {
      if (Object.prototype.hasOwnProperty.call(config, name)) config[name] = VIDEO_SECONDS;
    });
    // Milliseconds are changed only for explicitly named fields already in the response.
    ["max_duration_ms", "video_max_duration_ms", "gold_max_duration_ms",
      "recording_duration_ms", "trim_max_duration_ms"].forEach(function (name) {
      if (Object.prototype.hasOwnProperty.call(config, name)) config[name] = VIDEO_SECONDS * 1000;
    });
    function audioFlags(object) {
      ["audio_enabled", "sound_enabled", "microphone_enabled", "include_audio", "preserve_audio",
        "muted", "mute", "strip_audio", "remove_audio"].forEach(function (name) {
        if (!Object.prototype.hasOwnProperty.call(object, name)) return;
        var enabled = !/^(?:muted|mute|strip_audio|remove_audio)$/.test(name);
        if (typeof object[name] === "boolean") object[name] = enabled;
        else if (object[name] === "true" || object[name] === "false") object[name] = String(enabled);
      });
    }
    ["enabled", "video_enabled", "video_upload_enabled", "camera_roll_enabled", "recording_enabled"].forEach(function (name) {
      if (typeof config[name] === "boolean") config[name] = true;
      else if (config[name] === "true" || config[name] === "false") config[name] = "true";
    });
    audioFlags(config);
    if (record(config.audio)) {
      audioFlags(config.audio);
      if (typeof config.audio.enabled === "boolean") config.audio.enabled = true;
      else if (config.audio.enabled === "true" || config.audio.enabled === "false") config.audio.enabled = "true";
    }
    function limits(object, depth) {
      ["gold_max_duration", "goldMaxDuration", "max_duration", "maxDuration", "video_max_duration", "videoMaxDuration",
        "maximum_duration", "maximumDuration", "trim_max_duration", "trimMaxDuration", "recording_duration",
        "max_length", "video_duration", "video_upload_max_duration", "camera_roll_max_duration", "camera_roll_video_max_duration"].forEach(function (name) {
        if (Object.prototype.hasOwnProperty.call(object, name)) object[name] = VIDEO_SECONDS;
      });
      ["max_duration_ms", "video_max_duration_ms", "gold_max_duration_ms", "recording_duration_ms", "trim_max_duration_ms"].forEach(function (name) {
        if (Object.prototype.hasOwnProperty.call(object, name)) object[name] = VIDEO_SECONDS * 1000;
      });
      ["max_file_size", "max_upload_bytes", "max_size_bytes", "max_file_size_bytes", "video_max_size_bytes", "max_video_size_bytes"].forEach(function (name) {
        if (Object.prototype.hasOwnProperty.call(object, name)) {
          object[name] = typeof object[name] === "string" ? String(VIDEO_BYTES) : VIDEO_BYTES;
        }
      });
      ["max_file_size_mb", "max_size_mb", "max_upload_mb"].forEach(function (name) {
        if (Object.prototype.hasOwnProperty.call(object, name)) object[name] = typeof object[name] === "string" ? "100" : 100;
      });
      audioFlags(object);
      if (record(object.audio)) audioFlags(object.audio);
      if (depth >= 4) return;
      ["video", "upload", "recording", "trim", "limits", "free", "gold", "default"].forEach(function (name) {
        if (record(object[name])) limits(object[name], depth + 1);
      });
    }
    limits(config, 0);
    entries[key] = JSON.stringify(config);
  }

  function captionPatch(entries) {
    // Replace the old picker catalogue as requested; never edit posted moments.
    var types = [];
    var count = 0;
    var colors = {
      brand: ["#3F2B13", "#77541F"], love: ["#59223F", "#342044"],
      joy: ["#6A3620", "#503058"], mood: ["#252B56", "#432B59"],
      tease: ["#4E2668", "#243E67"], gentle: ["#174B45", "#293F54"]
    };
    var groups = CAPTIONS.map(function (group) {
      return {
        section: group.section,
        items: group.items.map(function (template, index) {
          var type = "cuios_" + group.id + "_" + template[0];
          var background = group.background === "brand" ? "brand" : group.background + "_" + (index % 2 + 1);
          var decoration = group.id !== "brand" && record(template[3]) ? template[3] : null;
          var backdrop = {
            colors: decoration ? decoration.colors : colors[group.background],
            image: { type: "image", source: "url", data: ASSET_BASE + (decoration ? decoration.image :
              "captions/" + background + ".png?v=" + (group.id === "brand" ? "4.0.1" : VERSION)) }
          };
          types.push(type);
          count++;
          return {
            overlay_id: "caption:" + type,
            source: "remote",
            caption: {
              type: "static_content", text: template[1],
              localized_text: { vi: template[1], en: template[1] },
              icon: { type: "emoji", data: template[2] },
              background: backdrop,
              text_color: "#FFFFFF", max_lines: 1
            }
          };
        })
      };
    });
    entries.overlay_items = JSON.stringify(groups);
    entries.overlay_dynamic_captions = JSON.stringify(types);
    return count;
  }

  function widgetPatch(entries) {
    var mode = typeof $argument === "string" ? $argument : "";
    var theme = { "aura-frame": "aura", "gold-frame": "gold", "rose-frame": "rose" }[mode];
    if (!theme) return "off";
    var changed = mergeEntry(entries, "widget_frame_event", {
      uid: "cuios_" + theme + "_frame_v3",
      url: ASSET_BASE + "widget-" + theme + ".png?v=" + VERSION,
      placement: "below", use_local_time_zone: true,
      start_at: "2024-01-01T00:00:00", end_at: "2099-12-31T23:59:59"
    });
    return changed ? theme + "-event-experimental" : "skipped-schema";
  }

  function firebasePatch(payload) {
    if (!record(payload.entries)) {
      log("firebase: skipped missing entries (possibly NO_CHANGE)");
      event("firebase", { action: "no_entries", responseAt: Date.now(), serverState: payload.state === "NO_CHANGE" ? "NO_CHANGE" : "missing_or_other" });
      return false;
    }
    if (payload.state !== undefined && payload.state !== "UPDATE" && payload.state !== "NO_CHANGE") {
      event("firebase", { action: "unsupported_server_state", responseAt: Date.now() });
      return false;
    }
    var entries = payload.entries;
    configDiagnostics(entries);
    mergeEntry(entries, "feature_gates", {
      camera_roll: "enabled",
      longer_video: "enabled",
      longer_videos: "enabled",
      video_recording: "enabled",
      video_upload: "enabled",
      camera_roll_video: "enabled",
      video: "enabled",
      long_captions: "enabled",
      custom_widget_frames: "enabled",
      profile_badge: "enabled"
    });
    patchMedia(entries, "camera", {
      gold_max_duration: VIDEO_SECONDS,
      goldMaxDuration: VIDEO_SECONDS,
      max_duration: VIDEO_SECONDS,
      maxDuration: VIDEO_SECONDS,
      video_max_duration: VIDEO_SECONDS,
      videoMaxDuration: VIDEO_SECONDS
    });
    patchMedia(entries, "camera_roll", {
      gold_max_duration: VIDEO_SECONDS,
      goldMaxDuration: VIDEO_SECONDS,
      video_max_duration: VIDEO_SECONDS,
      videoMaxDuration: VIDEO_SECONDS,
      max_duration: VIDEO_SECONDS,
      maxDuration: VIDEO_SECONDS,
      trim_max_duration: VIDEO_SECONDS,
      trimMaxDuration: VIDEO_SECONDS,
      camera_roll_max_duration: VIDEO_SECONDS,
      camera_roll_video_max_duration: VIDEO_SECONDS,
      max_file_size: VIDEO_BYTES,
      max_upload_bytes: VIDEO_BYTES,
      max_size_bytes: VIDEO_BYTES
    });
    // Do not invent a video_config schema when the server does not provide one.
    patchMedia(entries, "video_config");
    ["camera_roll_video_config", "camera_roll_video_upload_config", "video_upload_config"].forEach(function (key) {
      patchMedia(entries, key);
    });
    Object.assign(entries, {
      camera_roll_preview_enabled: "true",
      camera_roll_enabled: "true",
      camera_roll_video_enabled: "true",
      camera_roll_video_upload_enabled: "true",
      internal_camera_roll_video_upload_enabled: "true",
      longer_camera_roll_videos_enabled: "true",
      longer_video_enabled: "true",
      longer_videos_enabled: "true",
      video_sound_enabled: "true",
      microphone_enabled: "true",
      camera_microphone_enabled: "true",
      // Community-observed compatibility switch, not a verified Locket API contract.
      mh_mic_enabled_v16: "true",
      custom_widget_frames_enabled: "true",
      captions_enabled: "true",
      overlay_navigator_enabled: "true",
      music_caption_enabled: "true",
      music_caption_song_preview_enabled: "true",
      link_caption_link_enabled: "true",
      profile_badge_visible: "true"
    });
    ["camera_roll_video_max_duration", "camera_roll_max_duration", "camera_roll_duration",
      "max_video_duration", "video_max_duration", "video_trim_max_duration", "trim_max_duration",
      "gold_max_duration", "goldMaxDuration", "longer_video_duration", "longer_videos_duration",
      "longer_video_max_duration", "longer_videos_max_duration", "video_duration",
      "video_record_max_duration", "video_record_duration", "max_recorded_duration",
      "recording_max_duration", "recording_duration", "max_video_record_duration",
      "max_video_duration_seconds", "video_upload_max_duration", "gold_max_video_length_seconds",
      "gold_video_length_limit", "longerVideoDuration", "video_maximum_duration",
      "camera_video_maximum_duration", "video_recording_maximum_duration"].forEach(function (key) {
      entries[key] = VIDEO_SECONDS.toFixed(1);
    });
    ["video", "longer_video", "longerVideo", "can_record_video", "enable_video_recording",
      "can_upload_video", "longerVideosEnabled"].forEach(function (key) {
      if (entries[key] !== undefined && /^(?:true|false)$/.test(String(entries[key]))) entries[key] = "true";
    });
    ["max_file_size", "max_upload_bytes", "max_size_bytes", "video_max_size_bytes", "camera_roll_video_max_size_bytes"].forEach(function (key) {
      entries[key] = String(VIDEO_BYTES);
    });
    ["video_upload_max_size_mb", "camera_roll_max_size_mb", "max_file_size_mb"].forEach(function (key) {
      if (entries[key] !== undefined) entries[key] = "100";
    });
    mergeEntry(entries, "overlays_v2_config", { suggestions_enabled: true });
    var added = captionPatch(entries);
    var widget = widgetPatch(entries);
    payload.state = "UPDATE";
    log("firebase: v" + VERSION + " config target=" + VIDEO_SECONDS + "s; upload-bytes=" + VIDEO_BYTES + "; captions=" + added + "; widget=" + widget);
    event("firebase", { action: WARNINGS.length ? "partial" : "patched", responseAt: Date.now(), warnings: WARNINGS,
      sentRecipe: VERSION, sentSeconds: VIDEO_SECONDS, sentUploadBytes: VIDEO_BYTES, sentCaptions: added, widget: widget });
    return true;
  }

  function configRevision(payload) {
    // An HTTP cache validator, not a cryptographic signature or an entitlement proof.
    function canonical(value) {
      if (Array.isArray(value)) return value.map(canonical);
      if (!record(value)) return value;
      var ordered = {};
      Object.keys(value).sort().forEach(function (key) { ordered[key] = canonical(value[key]); });
      return ordered;
    }
    // Include rollout/personalization metadata as well as entries so those updates aren't masked.
    var text = JSON.stringify(canonical(payload)), hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      hash >>>= 0;
    }
    return '"cuios-' + VERSION + "-" + hash.toString(16) + "-" + text.length.toString(16) + '"';
  }

  function rewrittenResponse(payload, response, isFirebase) {
    var result = { body: JSON.stringify(payload) };
    var headers = record(response.headers) ? Object.assign({}, response.headers) : {};
    Object.keys(headers).forEach(function (key) {
      if (/^(?:etag|last-modified|content-length|cache-control)$/i.test(key)) delete headers[key];
    });
    headers["Cache-Control"] = "no-store";
    if (isFirebase) {
      headers.etag = configRevision(payload);
      event("firebase", { sentETag: headers.etag });
    }
    result.headers = headers;
    return result;
  }

  function main() {
    if (typeof $request === "undefined") return {};
    var url = String($request.url || "");
    var statusMatch = STATUS.exec(url);
    if (statusMatch && typeof $response === "undefined") return statusPage($request, statusMatch[1] === "report.json");
    var check = HTTPS_CHECK.exec(url);
    if (check && typeof $response === "undefined") {
      var service = check[1].toLowerCase() === "api.revenuecat.com" ? "https_revenuecat" : "https_firebase";
      event(service, { action: "https_hook_seen" });
      return { response: { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'" },
        body: "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><h1>Cuios · HTTPS check v" + VERSION + "</h1><p>Script đã nhận request HTTPS kiểm tra từ trình duyệt qua host này. Đây chưa phải bằng chứng Locket gửi request hoặc tính năng native hoạt động.</p><p><a href='http://cuios-status.invalid/status'>Quay lại trang trạng thái</a></p>" } };
    }
    var isRC = RC.test(url);
    var isFirebase = FIREBASE.test(url);
    if (!isRC && !isFirebase) {
      if (RC_PROBE.test(url) && locketRequest($request)) event("revenuecat", { action: "unhandled_endpoint", responseAt: Date.now() });
      if (FIREBASE_PROBE.test(url) && locketRequest($request)) event("firebase", { action: "unhandled_project_or_namespace", requestAt: Date.now() });
      return {};
    }
    CURRENT_SERVICE = isRC ? "revenuecat" : "firebase";
    if (isFirebase && identity($request) === "other_app") return {};
    if (typeof $response === "undefined") return requestPatch($request, isRC);
    if (!record($response)) return {};
    var status = statusCode($response);
    // Keep shared RevenueCat traffic from other apps out of Locket's successful status.
    if (isFirebase || locketRequest($request)) event(CURRENT_SERVICE, { action: "response_seen", responseAt: Date.now(), httpStatus: status,
      signedResponse: Boolean(header($response.headers, "x-signature")) });
    if (status < 200 || status >= 300) {
      log("response: skipped HTTP " + status);
      if (isFirebase || locketRequest($request)) event(CURRENT_SERVICE, { action: "http_error", httpStatus: status });
      return {};
    }
    if (typeof $response.body !== "string" || !$response.body.trim()) {
      log("response: skipped empty or non-text body");
      if (isFirebase || locketRequest($request)) event(CURRENT_SERVICE, { action: "empty_or_nontext_body" });
      return {};
    }
    var payload;
    try { payload = JSON.parse($response.body); }
    catch (_) {
      if (isFirebase || locketRequest($request)) event(CURRENT_SERVICE, { action: "invalid_json_or_unsupported_format" });
      return {};
    }
    if (!record(payload) || Object.prototype.hasOwnProperty.call(payload, "error")) {
      log("response: skipped unexpected payload");
      if (isFirebase || locketRequest($request)) event(CURRENT_SERVICE, { action: "unexpected_payload" });
      return {};
    }
    if (!(isRC ? goldPatch(payload, $request) : firebasePatch(payload))) return {};
    return rewrittenResponse(payload, $response, isFirebase);
  }

  var result = {};
  try {
    result = main();
  } catch (_) {
    log("response: skipped invalid JSON or unsupported runtime");
    event(CURRENT_SERVICE, { action: "runtime_error" });
  }
  // A single completion point also covers invalid input and unknown URLs.
  $done(result);
}());
