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

## 2. Google Maps タイムライン（位置情報）

### キー設計

```
location-history/YYYY-MM.json  （例: location-history/2026-03.json）
```

月ごとに1ファイル。分割スクリプトで生成する。

### 手順

#### 2-1. Google Maps アプリからエクスポート

1. スマートフォンの Google マップアプリを開く
2. プロフィールアイコン → 「タイムライン」
3. 右上のメニュー（...）→ 「場所の履歴のエクスポート」
4. `タイムライン.json`（または `Timeline.json`）がダウンロードされる

#### 2-2. 月別に分割

```bash
npx tsx scripts/split-timeline.ts ./タイムライン.json
```

`output/location-history/` に月別の JSON が生成される。

#### 2-3. R2 にアップロード

```bash
for f in output/location-history/*.json; do
  key="location-history/$(basename "$f")"
  npx wrangler r2 object put "furikaeri-storage/$key" --file="$f" --remote
  echo "uploaded: $key"
done
```

#### 2-4. KV キャッシュのクリア（任意）

既に KV にキャッシュされた日付がある場合、古いキャッシュを削除する:

```bash
# 特定の日付のキャッシュを削除
npx wrangler kv key delete "location-history:2026-03-20" --binding FURIKAERI_KV --remote

# または全キャッシュをクリア（location-history: プレフィックスのキーを列挙して削除）
npx wrangler kv key list --binding FURIKAERI_KV --remote --prefix "location-history:" \
  | jq -r '.[].name' \
  | xargs -I{} npx wrangler kv key delete "{}" --binding FURIKAERI_KV --remote
```

### 運用タイミング

新しいデータを反映したいときに 2-1 → 2-2 → 2-3 を実行する。
差分アップロード: 直近の月のみ再アップロードすれば OK（過去の月は変わらない）。

---

## アップロード済みファイルの確認

```bash
npx wrangler r2 object get furikaeri-storage/transactions/2026-03.csv --remote --pipe | head -3
npx wrangler r2 object head furikaeri-storage/location-history/Timeline.json --remote
```
