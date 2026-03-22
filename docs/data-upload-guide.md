# データアップロードガイド

furikaeri-mcp で使用する外部データを Cloudflare R2 にアップロードする手順。

R2 バケット: `furikaeri-storage`

---

## 1. マネーフォワード ME の取引履歴 CSV

### キー設計

```
transactions/YYYY-MM.csv
```

月ごとに1ファイル。例: `transactions/2026-03.csv`

### 手順

#### 1-1. マネーフォワード ME からダウンロード

1. マネーフォワード ME の PC 版にログイン
2. 「家計簿」→「明細」→「CSVダウンロード」
3. 対象月を選択してダウンロード（ファイルは Shift_JIS エンコード）

#### 1-2. UTF-8 に変換

```bash
iconv -f SHIFT_JIS -t UTF-8 download.csv > transactions-YYYY-MM.csv
```

Windows（PowerShell）の場合:

```powershell
Get-Content "download.csv" -Encoding Default | Set-Content "transactions-YYYY-MM.csv" -Encoding UTF8
```

#### 1-3. R2 にアップロード

```bash
npx wrangler r2 object put furikaeri-storage/transactions/YYYY-MM.csv \
  --file=./transactions-YYYY-MM.csv \
  --remote
```

例（2026年4月分）:

```bash
npx wrangler r2 object put furikaeri-storage/transactions/2026-04.csv \
  --file=./transactions-2026-04.csv \
  --remote
```

### 運用タイミング

毎月初に前月分をアップロードする。

---

## 2. Google Maps タイムライン（Timeline.json）

### キー設計

```
location-history/Timeline.json
```

1ファイル固定（全期間の累積データ）。

### 手順

#### 2-1. Google Maps アプリからエクスポート

1. スマートフォンの Google マップアプリを開く
2. プロフィールアイコン → 「タイムライン」
3. 右上のメニュー（...）→ 「場所の履歴のエクスポート」
4. `タイムライン.json`（または `Timeline.json`）がダウンロードされる

> ファイルサイズは数十〜100MB 超になることがある（KV ではなく R2 に格納する理由）

#### 2-2. R2 にアップロード

```bash
npx wrangler r2 object put furikaeri-storage/location-history/Timeline.json \
  --file="./タイムライン.json" \
  --remote
```

### 運用タイミング

新しいデータを反映したいときに都度アップロード（ファイルは上書きされる）。

---

## アップロード済みファイルの確認

```bash
npx wrangler r2 object get furikaeri-storage/transactions/2026-03.csv --remote --pipe | head -3
npx wrangler r2 object head furikaeri-storage/location-history/Timeline.json --remote
```
