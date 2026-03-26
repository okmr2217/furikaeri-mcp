const commonStyles = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; color: #111; min-height: 100vh; padding: 16px; }
h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.sub { font-size: 13px; color: #666; margin-bottom: 20px; }
.card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.card h2 { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
.desc { font-size: 12px; color: #888; margin-bottom: 14px; }
label { display: block; font-size: 13px; font-weight: 500; color: #444; margin: 12px 0 4px; }
input[type=month], input[type=file], input[type=password] {
  width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 15px; background: white;
}
button { width: 100%; padding: 13px; font-size: 15px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; margin-top: 14px; }
.btn-p { background: #0070f3; color: white; }
.btn-p:disabled { background: #9db8d9; }
.btn-s { background: #f0f0f0; color: #333; }
.btn-s:disabled { opacity: .5; }
.info { font-size: 12px; color: #888; margin-top: 6px; min-height: 16px; }
.status { margin-top: 10px; padding: 10px 12px; border-radius: 8px; font-size: 13px; display: none; }
.ok { background: #e6f7ee; color: #1a7f3c; display: block; }
.ng { background: #fde8e8; color: #c00; display: block; }
.loading { background: #f0f4ff; color: #0070f3; display: block; }
a.logout { display: block; text-align: center; font-size: 13px; color: #999; padding: 12px; margin-top: 4px; }
.steps { margin: 8px 0 0; padding-left: 18px; }
.steps li { font-size: 13px; color: #444; margin-bottom: 5px; line-height: 1.5; }
.platform { font-size: 12px; font-weight: 600; color: #0070f3; margin: 10px 0 4px; }
.platform:first-child { margin-top: 0; }
`;

// String.raw を使うことで \n \d 等のエスケープが不要になる
const uploadScript = String.raw`
function fmt(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function setStatus(id, cls, msg) {
  const el = document.getElementById(id);
  el.className = 'status ' + cls;
  el.textContent = msg;
}

// --- 収支 CSV ---
document.getElementById('txFile').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('txInfo').textContent = file.name + ' (' + fmt(file.size) + ')';
  try {
    const buf = await file.arrayBuffer();
    const text = new TextDecoder('shift-jis').decode(buf);
    const lines = text.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].replace(/"/g, '').split(',');
      if (cols[1] && cols[1].includes('/')) {
        const p = cols[1].trim().split('/');
        if (p.length >= 2) {
          document.getElementById('txMonth').value = p[0] + '-' + p[1].padStart(2, '0');
        }
        break;
      }
    }
  } catch (_) {}
});

async function uploadTx() {
  const fileInput = document.getElementById('txFile');
  const month = document.getElementById('txMonth').value;
  const file = fileInput.files[0];
  if (!file) { setStatus('txStatus', 'ng', 'ファイルを選択してください'); return; }
  if (!month) { setStatus('txStatus', 'ng', '年月を選択してください'); return; }
  const btn = document.getElementById('txBtn');
  btn.disabled = true;
  setStatus('txStatus', 'loading', 'アップロード中...');
  try {
    const buf = await file.arrayBuffer();
    const text = new TextDecoder('shift-jis').decode(buf);
    const res = await fetch('/admin/upload/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Year-Month': month },
      body: text
    });
    const json = await res.json();
    if (res.ok) setStatus('txStatus', 'ok', '✓ アップロード完了（transactions/' + month + '.csv）');
    else setStatus('txStatus', 'ng', json.error || 'エラーが発生しました');
  } catch (e) {
    setStatus('txStatus', 'ng', 'エラー: ' + e.message);
  }
  btn.disabled = false;
}

// --- 位置情報 JSON ---
document.getElementById('locFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('locInfo').textContent = file.name + ' (' + fmt(file.size) + ')';
  const m = file.name.match(/(\d{4})-(\d{2})/);
  if (m) document.getElementById('locMonth').value = m[1] + '-' + m[2];
});

async function uploadLoc() {
  const fileInput = document.getElementById('locFile');
  const month = document.getElementById('locMonth').value;
  const file = fileInput.files[0];
  if (!file) { setStatus('locStatus', 'ng', 'ファイルを選択してください'); return; }
  if (!month) { setStatus('locStatus', 'ng', '年月を選択してください'); return; }
  const btn = document.getElementById('locBtn');
  btn.disabled = true;
  setStatus('locStatus', 'loading', 'アップロード中... (' + fmt(file.size) + ')');
  try {
    const text = await file.text();
    const res = await fetch('/admin/upload/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Year-Month': month },
      body: text
    });
    const json = await res.json();
    if (res.ok) setStatus('locStatus', 'ok', '✓ アップロード完了（location-history/' + month + '.json）\nKVキャッシュは7日で自動更新されます');
    else setStatus('locStatus', 'ng', json.error || 'エラーが発生しました');
  } catch (e) {
    setStatus('locStatus', 'ng', 'エラー: ' + e.message);
  }
  btn.disabled = false;
}

// --- 位置情報（全データ一括） ---
document.getElementById('fullFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('fullInfo').textContent = file.name + ' (' + fmt(file.size) + ')';
});

async function uploadFull() {
  const file = document.getElementById('fullFile').files[0];
  if (!file) { setStatus('fullStatus', 'ng', 'ファイルを選択してください'); return; }
  const btn = document.getElementById('fullBtn');
  btn.disabled = true;
  setStatus('fullStatus', 'loading', 'ファイルを読み込み中...');
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch (e) {
    setStatus('fullStatus', 'ng', 'JSON パースエラー: ' + e.message);
    btn.disabled = false;
    return;
  }
  const segments = data.semanticSegments || [];
  if (segments.length === 0) { setStatus('fullStatus', 'ng', 'semanticSegments が見つかりません'); btn.disabled = false; return; }
  const byMonth = {};
  for (const seg of segments) {
    const ym = (seg.startTime || '').slice(0, 7);
    if (!ym || ym.length < 7) continue;
    if (!byMonth[ym]) byMonth[ym] = { semanticSegments: [] };
    byMonth[ym].semanticSegments.push(seg);
  }
  const months = Object.keys(byMonth).sort();
  if (months.length === 0) { setStatus('fullStatus', 'ng', 'startTime から年月を取得できませんでした'); btn.disabled = false; return; }
  const errors = [];
  for (let i = 0; i < months.length; i++) {
    const ym = months[i];
    setStatus('fullStatus', 'loading', ym + ' をアップロード中... (' + (i + 1) + '/' + months.length + ')');
    try {
      const res = await fetch('/admin/upload/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Year-Month': ym },
        body: JSON.stringify(byMonth[ym])
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        errors.push(ym + ': ' + (json.error || res.status));
      }
    } catch (e) {
      errors.push(ym + ': ' + e.message);
    }
  }
  if (errors.length > 0) {
    setStatus('fullStatus', 'ng', '一部エラー: ' + errors.join(', '));
  } else {
    setStatus('fullStatus', 'ok', '✓ ' + months.length + ' ヶ月分をアップロード完了（' + months[0] + ' 〜 ' + months[months.length - 1] + '）');
  }
  btn.disabled = false;
}

// --- KVキャッシュ削除 ---
async function invalidate() {
  const month = document.getElementById('invMonth').value;
  if (!month) { setStatus('invStatus', 'ng', '年月を選択してください'); return; }
  const btn = document.getElementById('invBtn');
  btn.disabled = true;
  setStatus('invStatus', 'loading', '削除中...');
  try {
    const res = await fetch('/admin/invalidate/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearMonth: month })
    });
    const json = await res.json();
    if (res.ok) setStatus('invStatus', 'ok', '✓ ' + json.deletedCount + '件のキャッシュを削除しました');
    else setStatus('invStatus', 'ng', json.error || 'エラー');
  } catch (e) {
    setStatus('invStatus', 'ng', 'エラー: ' + e.message);
  }
  btn.disabled = false;
}
`;

export function renderLoginPage(error = false): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理 — furikaeri-mcp</title>
<style>
${commonStyles}
body { display: flex; align-items: center; justify-content: center; }
.wrap { max-width: 340px; width: 100%; }
.err { color: #c00; font-size: 13px; margin-top: 10px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1>furikaeri-mcp</h1>
    <p class="sub">管理パスワードを入力</p>
    <form method="post" action="/admin/login">
      <label>パスワード</label>
      <input type="password" name="password" autocomplete="current-password" autofocus>
      <button type="submit" class="btn-p">ログイン</button>
      ${error ? '<p class="err">パスワードが違います</p>' : ""}
    </form>
  </div>
</div>
</body>
</html>`;
}

export function renderUploadPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理 — furikaeri-mcp</title>
<style>${commonStyles}</style>
</head>
<body>
<h1>furikaeri-mcp</h1>
<p class="sub">データファイルのアップロード</p>

<div class="card">
  <h2>収支 CSV</h2>
  <p class="desc">マネーフォワード ME からダウンロードした CSV（Shift_JIS）をアップロード。年月はファイルから自動検出します。</p>
  <label>対象年月</label>
  <input type="month" id="txMonth">
  <label>CSV ファイル</label>
  <input type="file" id="txFile" accept=".csv">
  <p class="info" id="txInfo"></p>
  <button class="btn-p" id="txBtn" onclick="uploadTx()">アップロード</button>
  <div class="status" id="txStatus"></div>
</div>

<div class="card">
  <h2>位置情報のエクスポート方法</h2>
  <p class="desc">Google Maps タイムラインから Timeline.json を取得する手順。</p>
  <p class="platform">Android</p>
  <ol class="steps">
    <li>端末の「設定」を開く</li>
    <li>「位置情報」→「位置情報サービス」→「タイムライン」</li>
    <li>「タイムラインデータをエクスポート」→「保存」</li>
  </ol>
  <p class="platform">iOS</p>
  <ol class="steps">
    <li>Google マップアプリを開く</li>
    <li>右上のプロフィールアイコン →「…」</li>
    <li>「位置情報とプライバシーの設定」</li>
    <li>「タイムラインデータをエクスポート」</li>
  </ol>
</div>

<div class="card">
  <h2>位置情報（全データ一括）</h2>
  <p class="desc">Google Maps タイムラインからエクスポートした Timeline.json（全期間）をアップロード。月別に自動分割して R2 に保存します。</p>
  <label>Timeline.json ファイル</label>
  <input type="file" id="fullFile" accept=".json">
  <p class="info" id="fullInfo"></p>
  <button class="btn-p" id="fullBtn" onclick="uploadFull()">分割してアップロード</button>
  <div class="status" id="fullStatus"></div>
</div>

<div class="card">
  <h2>位置情報 JSON（月別）</h2>
  <p class="desc">Google Maps タイムラインからエクスポートした月別 JSON をアップロード。ファイル名に年月（例: 2026-03.json）が含まれていると自動検出します。</p>
  <label>対象年月</label>
  <input type="month" id="locMonth">
  <label>JSON ファイル</label>
  <input type="file" id="locFile" accept=".json">
  <p class="info" id="locInfo"></p>
  <button class="btn-p" id="locBtn" onclick="uploadLoc()">アップロード</button>
  <div class="status" id="locStatus"></div>
</div>

<div class="card">
  <h2>KV キャッシュ削除</h2>
  <p class="desc">位置情報を再アップロードした後、即座に反映させたい場合はキャッシュを削除してください。削除しなくても7日で自動更新されます。</p>
  <label>対象年月</label>
  <input type="month" id="invMonth">
  <button class="btn-s" id="invBtn" onclick="invalidate()">キャッシュを削除</button>
  <div class="status" id="invStatus"></div>
</div>

<a href="/admin/logout" class="logout">ログアウト</a>

<script>
${uploadScript}
</script>
</body>
</html>`;
}
