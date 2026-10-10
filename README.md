# GARAGE HOUSE NAVI

Next.js App Router / TypeScript / Tailwind CSS / Supabase を使ったガレージハウス検索アプリ。

## 普段の操作

- `/admin`：公開物件数と反響数を確認します。反響数には物件問い合わせと希望条件リクエストの両方が含まれます。
- `/admin/properties`：物件・写真を登録して公開します。
- `/admin/leads`：すべての反響を新しい順に確認し、対応状況と内部メモを保存します。種類や対応状況で絞り込めます。
- `/admin/social`：公開物件からSNS文章・画像を作成し、内容を確認してBufferへ予約します。[初回接続・使い方](docs/SOCIAL_AUTOMATION.md)。
- `/admin/settings`：通知先・送信元・受付状態を確認し、通知先にテストメールを送れます。APIキーの値は表示しません。
- 旧 `/admin/requests` のリンクは、反響一覧の「希望条件リクエスト」に転送されます。

GitHubはコード変更、Vercelは公開と秘密の設定、Supabaseは保存とログイン、Resendはメール配送を担当します。日常の確認を管理画面へ集約しています。SNS予約には接続済みのBufferを利用します。メール通知に失敗しても、保存済みの反響は管理画面で確認できます。

### メールの確認

1. 「設定・動作確認」で通知先と送信元を確認します。
2. 「通知先にテストメールを送る」を押します。実際の問い合わせデータは作成しません。
3. エラーの場合は表示された理由を確認します。送信元認証の失敗はResendとDNSの設定が対象です。
4. 送信受付に成功した場合は、通知先の受信箱・迷惑メールと送信IDで到着を確認します。送信受付は受信完了の証明ではありません。

テスト送信は管理者だけが実行でき、通知先はサーバー側の登録済みアドレスに固定されます。同一管理者のテスト送信は1時間に10回までです。

画面確認用の架空物件は `DEMO_MODE=true` のときだけ表示します。デモ中は問い合わせ受付を停止し、サンプル表示・noindexを設定します。DB未接続時に保存成功を装う処理はありません。

## 起動

Node.js 22.15以上（推奨24）、npmを使用。

```bash
npm ci
cp env.example .env.local
npm run dev
```

`http://localhost:3000` を開きます。デザインと検索の確認だけなら `.env.local` で `DEMO_MODE=true` にします。

```bash
npm run typecheck
npm test
npm run build
npm start
```

## Supabaseの接続

1. 接続済みSupabaseプロジェクトは `fgedwotipostbtadrxzz`（project URLはDashboardで確認）です。4件のDBマイグレーション適用と47都道府県データを確認済みです。既存プロジェクトへ同じSQLを再実行しないでください。
2. 新規Supabaseプロジェクトを別途作る場合のみ、SQL Editorで `supabase/migrations/001_initial.sql` から `004_admin_predicate_invoker_wrapper.sql` まで順番に実行します。
3. Supabase URL、publishable/anon key、service role keyを環境変数に設定します。service role keyはサーバー専用です。チャットやGitへ貼り付けず、Vercelの秘密の環境変数として設定します。各環境の設定は管理画面の「設定・動作確認」で確認します。
4. Supabase Authの公開サインアップを無効にします。DashboardのAuthenticationから管理者ユーザーを作成し、確認済みのメールアドレスとパスワードを設定します。既存の管理者を作り直す必要はありません。
5. そのAuthユーザーのUUIDを確認し、SQL Editorから次の登録を実行します。アプリ画面やユーザーの自己申告による管理者昇格はできません。

```sql
insert into public.admin_profiles(id, display_name)
values ('管理者AuthユーザーのUUID', '管理者名');
```

6. `/login` でログインします。通常のAuthユーザーは `admin_profiles` に存在しないため管理者画面を開けません。

Storageの `property-images` バケットはマイグレーションで作成されます。**privateのまま使用**します。公開画像だけをRLS経由で読み取り、短期署名URLで配信します。下書きの画像も一般公開するpublicバケットにはしないでください。

## 実運用前の設定

`env.example` を参照してください。

| 変数 | 用途 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | SupabaseプロジェクトURL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | publishableまたはanon key |
| SUPABASE_SERVICE_ROLE_KEY | サーバー側フォーム保存・レート制限専用 |
| NEXT_PUBLIC_SITE_URL | 実際のサイトのorigin。例 `https://garage.example.com` |
| DEMO_MODE | 実運用は `false` |
| LEAD_FORMS_ENABLED | 接続・表示内容を確認後に `true` |
| OPERATOR_NAME / ADDRESS / PHONE / EMAIL / LICENSE / REPRESENTATIVE | 運営会社情報 |
| LEAD_NOTIFICATION_EMAIL | 反響通知の受信先。未設定の場合は OPERATOR_EMAIL に送信 |
| RESEND_API_KEY | Resendのサーバー専用APIキー。VercelではSecretとして登録 |
| LEAD_EMAIL_FROM | Resendで認証済みの送信元。例 `GARAGE HOUSE NAVI <no-reply@notify.example.jp>` |

`NEXT_PUBLIC_SITE_URL` は公式URL・メール内リンク・SEOに使用します。変更操作のOrigin検証は、実際にリクエストを受けたURLと同じOriginかどうかで判定します。

会社情報・利用規約・プライバシーポリシーは構造とドラフトです。実際の運営会社、業態、委託先、個人情報の取扱い等に合わせて確認・確定してください。架空の会社名・免許番号は入れていません。フォームを有効にするには最低でも運営会社名・連絡先とサービスキーの設定が必要です。

問い合わせをメール通知する場合はResendを設定します。Resendで送信ドメインを認証し、`RESEND_API_KEY` と認証済み送信元 `LEAD_EMAIL_FROM` をVercelのProduction環境に登録してください。問い合わせは先にDBへ保存され、その後 `LEAD_NOTIFICATION_EMAIL`（未設定時は `OPERATOR_EMAIL`）へ管理画面リンク付き通知を送ります。メール入力がある場合は受付確認メールも送ります。メール送信に失敗しても保存済み問い合わせは管理画面に残ります。送信者のAPIキーや問い合わせ本文などの個人情報はログへ出しません。

## 最重要フローの確認手順

1. `/admin/properties/new` で物件を下書き保存。
2. 保存後の編集ページで写真を複数追加。先頭がメイン写真。
3. 画像説明、メイン設定、前後の並び替え、削除を確認。
4. 掲載承諾・確認日、取引態様、情報確認日、次回更新予定日を入力。
5. 状態を公開中にし保存。
6. ログアウトした別ブラウザーで、一覧・検索条件・詳細を確認。
7. `LEAD_FORMS_ENABLED=true` で問い合わせを送信し、成功画面を確認。
8. 管理者でLeadsを開き、受信・物件紐付け・ステータス変更・内部メモを確認。
9. `/request` から希望条件を送信し、Property Requestsに保存されることを確認。
10. 物件を下書きまたは募集終了へ変更し、一般ユーザー側の一覧・詳細・画像で非公開になることを確認。

公開済み画像の発行済み署名URLは最長1時間、Next/Imageの最適化画像はキャッシュ期間中アクセスできる場合があります。非公開化は過去に取得された画像の回収を意味しません。機微な画像は掲載しないでください。

## GitHub / Vercel

1. このフォルダーをGitHubの新しいprivate repositoryへpushします。`.env*`、`node_modules`、`.next` は除外します。
2. VercelでリポジトリをImport。FrameworkはNext.js、buildは `npm run build`。
3. 上記環境変数をPreview/Productionごとに設定します。
4. Preview URLで上記フローを確認後、Productionへ公開します。
5. 公開直前にデモを無効化し、実物件の掲載許諾・募集状況・取引条件・会社情報を確認します。

コードはGitHubへpush済みですが、Vercelアカウント／プロジェクトはまだ接続されていません。VercelでGitHubリポジトリをImportし、上記環境変数を設定してください。Sites用の別フレームワークやDBへ置換せず、指定のNext.js / Supabase / Vercel構成を維持しています。

## 実装済み機能

- 写真中心のTOP、関西4地域、47都道府県の検索導線。
- エリア・賃料・間取り・面積・築年・駅徒歩・台数・5種類の寸法・設備フィルター。
- 検索URL共有、4種の並び替え、ページネーション、0件時の条件引継ぎ。
- 物件詳細、複数画像ギャラリー、寸法、設備、契約条件、スマートフォン固定CTA。
- 問い合わせ／物件リクエスト。氏名とメールまたは電話、問い合わせ内容をサーバー検証。
- 同意日時・送信元URL・物件ID／物件名の保存。
- Supabase Auth、管理者RLS、Dashboard、物件CRUD、Sources管理、問い合わせ対応管理。
- private Storage、複数アップロード、メイン画像、画像説明、並び替え、削除。
- 原子的な物件＋掲載元保存、原子的な画像並び替え。
- DB共有レート制限、honeypot、期限付き署名フォームトークン、同一origin検証、入力サイズ制限。
- HTMLエスケープ、任意HTMLの非許可、サーバー専用シークレット。
- 地域SEOページ、動的metadata、OG/Twitter、canonical、パンくず、RealEstateListing、sitemap、robots。
- 記事一覧と記事ルート。未執筆記事は404、一覧は準備中としてnoindex。

## セキュリティとデータ

- 公開APIは公開中の物件のみ。掲載元は別テーブル。問い合わせを掲載元へ自動送信する処理はありません。
- 問い合わせの公開DB直接INSERTは禁止。サーバーで検証後、service roleで保存。
- `admin_profiles` は一般ユーザーから書き込み不可。認証・管理者判定はAPI各処理でも実行。
- 電話番号・メール等はログに出しません。Rate limitにはIPのHMACだけを保存し、古い値を削除。
- 本番のIP判定はVercelが設定する `x-vercel-forwarded-for` を使用。別ホストへ移す場合は信頼できるプロキシの仕様に合わせて `lib/security.ts` を変更。
- DBの公開制御はRLSに加え、明示的な `status=published` 検索を使用。
- 広告掲載承諾を取り消すと下書きへ戻ります。
- 削除時、問い合わせの物件IDはnullになり、物件名のスナップショットは残ります。
- 不明な寸法・費用はnull。0円や0mmに置換しません。
- 物件写真のStorage削除に失敗しても、DB行削除後は一般ユーザーから参照できません。運用時は孤立オブジェクトの定期清掃を検討してください。

## MVPの範囲外・残っている確認

- メール／LINE通知：未実装。問い合わせは管理画面で確認します（仕様の必須要件はDB保存）。
- 車種マスタとの自動寸法判定、CMS、有料掲載、一般会員、地図検索：未実装。
- 記事本文：未作成。
- 実Supabase Auth/Storage/RESTを通したフロー、実Vercel環境でのOrigin、画像、権限、モバイル操作確認：接続後に実施。
- 公開後の募集情報の期限管理・更新は管理者運用。次回更新予定日到来による自動非公開は未実装。

## テスト

`npm test` は5テストを実行。PostgreSQL互換のPGliteで、SupabaseのAuth/Storageメタデータを最小構成で再現し、実際のマイグレーションSQLと権限を検証します。これは実Supabaseへの結合テストの代わりではありません。

ブラウザー検証用スクリプト `scripts/browser-check.mjs` は、`DEMO_MODE=true` でアプリを起動後に実行できます。

```bash
npx playwright install chromium
TEST_BASE_URL=http://localhost:3000 node scripts/browser-check.mjs
```

この環境ではプレビューへの接続に失敗したため、このスクリプトの成功はまだ確認できていません。

## 画像

`ASSET_CREDITS.md` 参照。ヒーローは海外住宅のイメージ写真であり、実際の掲載物件ではありません。実物件の写真は管理画面から登録してください。

## 管理画面の動作確認

`node scripts/admin-browser-check.mjs` は専用のローカル接続先と架空の管理者・反響を使います。必要なら先に `npx playwright install chromium` を実行します。認証・権限・一覧の統合・絞り込み・ページ送り・メール結果の表示・スマートフォンの横幅を確認します。実際のメールは送信せず、実Supabaseや本番データを書き換えません。
