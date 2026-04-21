# コマ17｜ブランチ保護ルール

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ16 CI：テストの自動化 |
| 次コマ | コマ18 Secrets管理 |

## 🎯 目標

- ブランチ保護ルールの目的を説明できる
- main ブランチに「CI通過必須」「PR必須」のルールを設定できる
- CODEOWNERS を使ってレビュー担当を自動割り当てできる

## 📋 導入（15分）

### 前回の振り返り

CIでLintとテストが自動実行されるようになった。ただ、今のままだと **CIが赤くてもマージできてしまう**。

### ブランチ保護ルールとは

mainブランチなど重要ブランチに対して、

- **直接 push を禁止**
- **PR必須**
- **CI通過必須**
- **レビュー必須**
- **強制push禁止**

などを設定して「壊れたコードがmainに混ざる」事故を防ぐ仕組み。

### 今日のゴール

1. mainブランチに保護ルールを設定
2. わざとCI失敗のPRを作ってマージできないことを確認
3. CODEOWNERS でレビュワー自動割り当て

## 🛠 本題（65分）

### 1. GitHubリポジトリでブランチ保護を設定（15分）

ブラウザでリポジトリを開く：

```bash
cd ~/workspace/todo-app
gh repo view --web
```

**Settings → Branches → Add branch ruleset** （または **Add rule**）

> **2024年以降のGitHub UI：** 旧「Branch Protection Rules」と新「Rulesets」が並存。今回は機能が豊富な **Rulesets** を使う。

**設定項目：**

1. **Ruleset Name：** `main-protection`
2. **Enforcement status：** `Active`
3. **Target branches：** Include default branch（＝main）
4. **Branch protections：**
   - ✅ **Restrict deletions**（削除禁止）
   - ✅ **Require a pull request before merging**（PR必須）
     - Required approvals: `1`（最低1承認）
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ **Require status checks to pass**
     - Add checks: `lint` と `test` を追加
   - ✅ **Block force pushes**（強制push禁止）

**Create** で確定。

### 2. 保護が効いているか確認：直接pushブロック（10分）

```bash
git switch main
echo "test" >> README.md
git add README.md
git commit -m "test: direct push"
git push origin main
```

**エラー** が返るはず：

```
remote: error: GH006: Protected branch update failed
remote: error: Changes must be made through a pull request.
```

変更を取り消す：

```bash
git reset --hard HEAD~1
```

### 3. CI失敗のPRはマージ不可を確認（15分）

```bash
git switch -c feature/break-ci
```

わざとテストを壊す：

```jsx
// src/TodoItem.test.jsx のどこかの expect を間違える
expect(screen.getByText('wrong text')).toBeInTheDocument()
```

コミット＆push：

```bash
git add src/TodoItem.test.jsx
git commit -m "test: わざと壊す（学習用）"
git push -u origin feature/break-ci
gh pr create --title "わざとCI失敗" --body "ブランチ保護の確認"
```

PR画面で：

- Checksが赤くなる
- **Merge pull request ボタンが押せない** / 警告で覆われる

これが保護ルールの効果。壊れたコードがmainに入らない状態が作れた。

PRを閉じて元に戻す：

```bash
gh pr close 番号
git switch main
git branch -D feature/break-ci
```

### 4. CODEOWNERS でレビュワー自動指定（15分）

`CODEOWNERS` ファイルを書くと、**特定のファイル／フォルダが変更されたPRに自動でレビュワーをアサイン** できる。

新しくブランチを切る：

```bash
git switch -c feature/codeowners
mkdir -p .github
```

`.github/CODEOWNERS` を作成：

```
# フォーマット：パターン  オーナー（GitHubユーザー／チーム）

# デフォルト：全ファイルは自分
*  @あなたのGitHubユーザー名

# .github/workflows の変更はCI担当（この授業では自分でOK）
/.github/workflows/  @あなたのGitHubユーザー名

# README/ドキュメント
*.md  @あなたのGitHubユーザー名
```

> **`@ユーザー名`** は本当の GitHub ハンドル名を書く。チーム開発なら `@org/team-name` も書ける。

```bash
git add .github/CODEOWNERS
git commit -m "ci: CODEOWNERS を追加"
git push -u origin feature/codeowners
gh pr create --title "CODEOWNERS 追加" --body "ファイル変更で自動アサイン"
```

> **動作確認：** 次回以降のPRで **Reviewers** が自動で指定されるか観察する。

### 5. 保護ルールに「レビュー承認」を強制する意味（10分）

今回 `Required approvals: 1` にしている。

**一人で開発している時は？**

- 自分のPRを自分で承認できない（GitHubの仕様）
- → 練習では一時的に `0` に下げるか、Admin roleで bypass 設定する

**チーム開発では：**

- 必ず誰かのレビュー＆承認が必要になる
- コードが一人の脳内に閉じない／バグを見つける目が増える／知識共有になる

> **授業では** レビュー要件は `0` にしておくか、学生同士で相互レビューする運用にする。

（実際のクラスでは「自分のPRは別の学生に承認してもらう」運用を推奨）

### 6. 自分のPRを別学生にレビュー依頼する練習（5分）

```bash
# 隣の学生のユーザー名を指定
gh pr edit 番号 --add-reviewer 隣のユーザー名
```

相手にSlack／Teams等で「レビューお願いします」と連絡。

レビュワー側は：

```bash
# PR ページ → Files changed → Review changes → Approve
```

Approve が付いたら元のPRをマージ。

## ✅ まとめ（10分）

### 今日できるようになったこと

- ブランチ保護で main への直接push禁止ができた
- CI失敗のPRはマージできない状態を作れた
- CODEOWNERS でレビュワー自動指定ができる

### よくある詰まりポイント

- **自分で自分のPRを承認したい** → 同一GitHubアカウントのApproveはできない仕様。管理者権限でbypass可
- **status checks の名前が見当たらない** → 一度CIを走らせた後のPR画面からリセットして再選択
- **CODEOWNERS が効かない** → ファイル置き場所は `.github/CODEOWNERS` か `docs/CODEOWNERS` か リポジトリ直下。**`.github/` 推奨**

### 次コマ予告

Phase 3ラスト。APIキーやパスワードをCIに渡す **Secrets** の扱い方を学ぶ。本来ソースに書きたくない情報の安全な渡し方。

## 📝 課題

1. 自分のリポジトリで、**`docs/**` ディレクトリ** の変更はドキュメント担当（自分）自動アサイン、**`src/**`** は開発担当（自分）という設定を CODEOWNERS に追加する
2. 今までのPRで「CI Fail → 修正 → 再push → CI Pass → マージ」の流れを1度ちゃんと体験する
