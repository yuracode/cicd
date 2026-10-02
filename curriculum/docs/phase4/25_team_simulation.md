# コマ25｜チーム開発シミュレーション

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ24 トラブルシューティング演習 |
| 次コマ | コマ26 個人制作①：企画・設計と土台づくり |

##  目標

- 他の人をリポジトリに招待し、Issue を分担して並行に開発できる
- レビュー必須のルールのもとで、プレビュー URL とコードを見てレビューし、指摘を受けて直せる
- 同じファイルを同時に変えたときのコンフリクトを、チームで相談して解決できる

##  導入

### Phase 4 の振り返り

1人で「Issue → PR → CI → マージ → 自動公開」を回せるようになった。実際の現場では、これを **複数人で同時に** 回す。

### 1人のときとの違い

| | 1人 | チーム |
|--|-----|-------|
| レビュー | 自分で見直す | **他の人が見て承認する** まで取り込めない |
| 作業の重なり | 起きない | 同じファイルを同時に変えて **コンフリクト** が起きる |
| 何をしているか | 自分が知っている | **Issue と PR に書かないと伝わらない** |

### 今日の進め方

2〜3人のチームを作り、**1人のリポジトリ（オーナー）** に全員で機能を追加する。

| 役割 | やること |
|------|---------|
| オーナー（1人） | 自分の `todo-app` にメンバーを招待し、ルールセットを変える |
| メンバー（全員。オーナーも含む） | Issue を1つ担当し、PR を出す。他の人の PR をレビューする |

> 1人で取り組む場合は、`todo-app` を2つのフォルダにクローンして「Aさん役」「Bさん役」を交互に演じる。Required approvals は 0 のまま進め、レビューは自分の PR にコメントを書く形で行う。

##  本題

### 1. オーナー：メンバーを招待する

```powershell
cd ~/workspace/todo-app
gh repo view --web
```

**Settings** → **Collaborators** → **Add people** → メンバーの GitHub ユーザー名を入力して招待する。

メンバーは、GitHub から届くメール（または https://github.com/notifications ）で **招待を承認** する。

### 2. オーナー：レビュー必須にする

**Settings** → **Rules** → **Rulesets** → `protect-main` を編集する。

- **Require a pull request before merging**
  - Required approvals：**1**
  - ☑ **Dismiss stale pull request approvals when new commits are pushed**（承認のあとに変更が push されたら、承認を取り消す）
  - ☑ **Require conversation resolution before merging**（レビューのコメントがすべて「解決済み」になるまでマージできない）

**Save changes** で保存する。

> **Dismiss stale approvals の意味**：承認をもらったあとに、こっそり別の変更を足してマージする…ということを防ぐ。**承認は「そのコミットの内容」に対するもの**。

### 3. メンバー：クローンして準備する

オーナー以外のメンバーは、オーナーのリポジトリをクローンする。

```powershell
cd ~/workspace
gh repo clone <オーナーのユーザー名>/todo-app team-todo
cd team-todo
npm ci
cp .env.example .env.local
npm test
npm run dev
```

> 自分の `todo-app` と混ざらないよう、フォルダ名を `team-todo` にしている。

### 4. 全員：Issue を作って分担する

チームで相談して、次の中から **人数分** の Issue を作り、担当者を決める。

| Issue | 主に変えるファイル |
|-------|-----------------|
| A：TODO に期限（日付）を付け、期限切れは赤字にする | `TodoForm.js`、`TodoItem.js`、`lib/todos.js` |
| B：TODO に優先度（高・中・低）を付けて色分けする | `TodoForm.js`、`TodoItem.js`、`lib/todos.js` |
| C：「全 ○ 件 / 完了 ○ 件」の表示と「完了済みを削除」ボタン | `TodoApp.js`、`lib/todos.js` |

**わざと同じファイルを触る Issue を選んでいる**。後でコンフリクトが起きるのは想定どおり。

```powershell
gh issue create --title "TODOに期限を付ける" --body "期限（日付）を入力でき、期限切れの未完了TODOは赤字で表示する。" --assignee <担当者のユーザー名>
```

GitHub の Issue の画面で、担当者（Assignees）が設定されていることを確かめる。

### 5. 全員：ブランチを切って実装する

```powershell
git switch main
git pull
git switch -c feature/<Issueの内容>
```

実装のルール：

1. **`lib/todos.js` に関数を追加するなら、テストも追加する**（コマ9）
2. 手元で `npm run lint`、`npm test`、`npm run build` が通ってから push する
3. PR の本文に `Closes #<Issue番号>` と、**動作確認の手順** を書く

```powershell
git add .
git commit -m "feat: TODOに期限を付ける"
git push -u origin feature/<Issueの内容>
gh pr create --title "TODOに期限を付ける" --body @'
Closes #1

## 変更内容
- 追加フォームに日付の入力欄を追加
- 期限切れの未完了TODOを赤字で表示

## 確認してほしいこと
- プレビューで、昨日の日付のTODOが赤字になるか

## テスト
- lib/todos.test.js に isOverdue のテストを追加
'@
```

レビューを **依頼** する。

```powershell
gh pr edit --add-reviewer <レビューしてほしい人のユーザー名>
```

### 6. 全員：レビューする

依頼された PR を開く。

```powershell
gh pr list
gh pr view <PR番号> --web
```

レビューの手順：

1. **Vercel のプレビュー URL** を開き、「確認してほしいこと」を実際に操作して確かめる
2. **Files changed** タブでコードを読む
3. 気になる行の左の **＋** を押してコメントを書く
4. 右上の **Review changes** から、次のどれかを選んで送信する

| 種類 | 使うとき |
|------|---------|
| **Comment** | 質問や感想だけ。承認も差し戻しもしない |
| **Approve** | このままマージしてよい |
| **Request changes** | 直してほしいところがある（直すまでマージしない） |

良いレビューコメントのコツ：

| ✕ | ○ |
|---|---|
| 「これ変」 | 「ここ、期限が空のときに `Invalid Date` と表示されました。空なら何も出さないのはどうでしょう？」 |
| 「テストないの？」 | 「`isOverdue` に、期限が今日のときのテストがあると安心です」 |
| （良いところには何も言わない） | 「関数に切り出してあって読みやすいです」 |

**コードではなく変更について**、**理由と提案をセットで** 書く。良いところも伝える。

### 7. 全員：指摘に対応してマージする

レビューで指摘をもらったら：

1. 直してコミットし、push する（PR に自動で追加される）
2. 対応したコメントに「直しました」と返信し、**Resolve conversation** を押す
3. もう一度レビューを依頼する（**Dismiss stale approvals** により、前の承認は取り消されている）

```powershell
git commit -am "fix: 期限が空のときは表示しない"
git push
gh pr edit --add-reviewer <レビューしてくれた人のユーザー名>
```

**CI が緑・承認が1つ以上・コメントがすべて解決済み** になったら、PR の作者がマージする。

```powershell
gh pr merge --merge --delete-branch
```

### 8. コンフリクトを解決する

1つ目の PR がマージされると、同じファイルを触っていた他の PR にはこう表示される。

```text
This branch has conflicts that must be resolved
Conflicting files: components/TodoItem.js
```

手元で最新の `main` を取り込み、コンフリクトを解決する。

```powershell
git switch feature/<自分のブランチ>
git pull origin main
```

```jsx
<<<<<<< HEAD
      <label style={{ color: priorityColor(todo.priority) }}>
=======
      <label style={{ color: isOverdue(todo) ? 'red' : 'inherit' }}>
>>>>>>> ...
```

**どちらか一方を選ぶのではなく、両方の機能が動くように合わせる** のがポイント。どう合わせるか迷ったら、**先にマージされた PR の作者に相談する**。

```jsx
      <label style={{ color: isOverdue(todo) ? 'red' : priorityColor(todo.priority) }}>
```

解決したら、テストが両方の機能で通ることを確かめてから push する。

```powershell
npm test
git add .
git commit -m "merge: mainを取り込み、期限と優先度の表示を両立させる"
git push
```

CI が動き直し、もう一度レビューを受けてからマージする。

### 9. ふりかえり（KPT）

最後の10分で、チームでふりかえる。

| | 書くこと |
|--|---------|
| **K**eep（続けたいこと） | うまくいったこと。例：PR の本文に確認手順を書いたらレビューが速かった |
| **P**roblem（困ったこと） | うまくいかなかったこと。例：同じファイルを同時に大きく変えて、コンフリクトの解決に時間がかかった |
| **T**ry（次に試すこと） | Problem への対策。例：同じファイルを触る Issue は、先に誰が何を変えるか話してから始める |

ふりかえりの内容は、オーナーのリポジトリに Issue として残しておく。

```powershell
gh issue create --title "ふりかえり（コマ25）" --body "## Keep
- ...
## Problem
- ...
## Try
- ..."
```

##  演習

### 演習1（基本）：suggestion でコードを提案する

レビューのコメントで、次のように書くと **その場で直したコードを提案** できる。

````markdown
```suggestion
      <label style={{ color: isOverdue(todo) ? 'red' : 'inherit' }}>
```
````

他のメンバーの PR に、suggestion 付きのコメントを1つ送る。受け取った人は **Commit suggestion** を押して取り込む。

**確認方法**：PR の Commits に、suggestion から作られたコミットが1つ追加されていればOK。

### 演習2（基本）：レビューの観点リストを作る

チームで「PR をレビューするときに確かめること」のチェックリストを5項目以上作り、`.github/pull_request_template.md` として PR でマージする（もちろんレビューを受けてから）。

**確認方法**：次に PR を作ったとき、本文にチェックリストが自動で入っていればOK。

<details>
<summary>例</summary>

```markdown
## 関連 Issue
Closes #

## 変更内容
-

## 確認してほしいこと
-

## セルフチェック
- [ ] 手元で `npm run lint` / `npm test` / `npm run build` が通った
- [ ] ロジックを追加したらテストも追加した
- [ ] プレビュー URL で見た目と動きを確かめた
- [ ] 関係ないファイルの変更が混ざっていない
- [ ] `console.log` を消した
```

</details>

### 演習3（応用）：ワークフローの変更には必ずオーナーのレビューを付ける

`.github/CODEOWNERS` を作り、`.github/` の中のファイルを変える PR には **オーナーのレビューが必須** になるようにする。

```text
# .github/CODEOWNERS
/.github/ @<オーナーのユーザー名>
```

ルールセットの **Require review from Code Owners** にもチェックを入れる。

**確認方法**：メンバーが `ci.yml` に小さな変更（コメントを1行足すなど）をした PR を作ると、オーナーが自動でレビュアーに追加され、他のメンバーが承認してもマージできないことを確かめられればOK。

> CI/CD の設定は、**壊れると全員が困る** し、**Secrets に触れられる** 場所でもある。変更できる人・承認できる人を絞っておくのが一般的。

### 演習4（早く終わった人向け）：リリースを作る

全員の機能がマージされたら、この時点を「バージョン 1.1.0」としてリリースする。

```powershell
git switch main
git pull
gh release create v1.1.0 --generate-notes --title "v1.1.0 チーム開発版"
```

**確認方法**：リポジトリの **Releases** に v1.1.0 ができ、マージされた PR の一覧が自動でリリースノートに書かれていればOK。

> `--generate-notes` は、前のリリースから今までにマージされた PR をまとめてくれる。**PR のタイトルをきちんと書いておくと、そのままリリースノートになる**。

##  まとめ

### 今日できるようになったこと

- メンバーを招待し、Issue を分担して並行に開発できるようになった
- プレビュー URL とコードを見てレビューし、Approve / Request changes と suggestion を使い分けられるようになった
- 承認必須・コメント解決必須のルールのもとで、指摘に対応し、コンフリクトを両方の機能が動く形で解決できた

### よくある詰まりポイント

- **自分の PR を承認できない**：GitHub では自分の PR は承認できない。他のメンバーにレビューを依頼する
- **承認されたのにマージできない**：承認後に push して承認が取り消された（Dismiss stale approvals）、未解決のコメントが残っている、CI が赤い、のどれかを確認する
- **コンフリクトの解決で相手の変更を消してしまった**：解決したあとに、相手の機能もブラウザとテストで確かめる。迷ったら相手に相談する

### 次コマ予告

Phase 5 に入る。ここからは **自分で作りたいアプリ** を企画し、これまで学んだテスト・CI/CD・デプロイを自分のアプリに組み込んで、最終発表に向けて仕上げていく。次回は企画と設計。

##  課題

### 基礎課題（必須）

1. 自分が担当した Issue の PR をマージまで完了させる
2. 他のメンバーの PR を1つ以上レビューし、Approve か Request changes を送る

### 応用課題（推奨）

3. 演習2のプルリクエストテンプレートを、自分の `todo-app` にも入れる
4. ふりかえりの Try を1つ選び、次のチーム作業（または個人制作）で実際に試す

### チャレンジ課題（挑戦）

5. GitHub **Projects** でボード（To do / In progress / Done）を作り、Issue と PR を並べる。PR がマージされたら自動で Done に移るよう、Projects の Workflows を設定する
6. 「コンフリクトを起こしにくくする工夫」を3つ考える（ヒント：PR を小さくする、`main` をこまめに取り込む、ファイルの分け方）
