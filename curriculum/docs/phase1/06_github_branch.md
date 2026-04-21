# コマ6｜GitHub連携・ブランチ戦略・PR体験

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ5 TODOアプリ実装②（useEffect・API連携） |
| 次コマ | コマ7 テスト入門（なぜテストを書くか） |

##  目標

- 作ったTODOアプリをGitHubリポジトリに push できる
- 作業ブランチを切り、機能追加してコミットできる
- 自分のPR（プルリクエスト）を作り、セルフレビューしてマージできる

##  導入（15分）

### 前回までの振り返り

TODOアプリが手元で動くようになった。でもこのままだと自分のPCにしかない。**他人と共有する／他PCから続きをやる／過去に戻す** ためにはGitHub管理が必須。

### 今日のゴール

チーム開発の基本フロー **「ブランチ切る → コミット → プッシュ → PR作成 → マージ」** を一人で一通り体験する。

### なぜブランチを使うのか

`main` に直接コミットしていくと：

- 壊れたコードが混ざっても戻しにくい
- 複数の変更が混ざって何をやっていたか分からなくなる
- 他人のレビューを挟む余地がない

→ **機能ごとに枝（ブランチ）を切って作業し、完成したら main に取り込む**

```
main        ●───●───●────●─(merge)─●
                    ╲              ╱
feature      ●───●───●──────────●
```

##  本題（65分）

### 1. GitHub認証の準備（10分）

GitHubへのpush時に認証が必要。今回は **GitHub CLI（`gh`）** が便利。

```bash
# gh インストール（Ubuntu）
sudo apt update
sudo apt install gh -y

# ログイン
gh auth login
```

対話で聞かれる項目：

- `What account do you want to log into?` → **GitHub.com**
- `What is your preferred protocol?` → **HTTPS**
- `Authenticate Git with your GitHub credentials?` → **Yes**
- `How would you like to authenticate?` → **Login with a web browser**

表示された8桁コードを控えて、`Enter` → ブラウザが開くのでコードを入力して許可。

```bash
# ログイン確認
gh auth status
# => Logged in to github.com as ユーザー名
```

### 2. リポジトリ作成 & 初回push（15分）

TODOアプリのディレクトリで作業：

```bash
cd ~/workspace/todo-app
```

まず `.gitignore` が適切か確認（Vite作成時に自動で入る）：

```bash
cat .gitignore
# node_modules / dist などが入っていればOK
```

git 初期化（まだなら）：

```bash
git status
# fatal: not a git repository と出たら初期化する
git init
git branch -M main
git add .
git commit -m "initial commit: TODOアプリの基本実装"
```

GitHub上にリポジトリを作って push：

```bash
# プライベートリポジトリとして作成＆push
gh repo create todo-app --private --source=. --remote=origin --push
```

> **オプションの意味：**
> - `--private`：非公開リポジトリ
> - `--source=.`：現在のフォルダをソースに
> - `--remote=origin`：リモート名
> - `--push`：作成後に即push

ブラウザでGitHubを開いて、リポジトリが作られていることを確認：

```bash
gh repo view --web
```

### 3. 作業ブランチを切る（10分）

新機能：「全削除ボタン」を追加するという設定でブランチを切る。

```bash
# main から新しいブランチを作って切り替え
git switch -c feature/clear-all
```

> **ブランチ名の付け方**：`feature/〜`, `fix/〜`, `docs/〜` のように **プレフィックス+内容** が一般的。英小文字とハイフンがおすすめ。

### 4. 機能追加→コミット（15分）

`App.jsx` に全削除ボタンを追加：

```jsx
// src/App.jsx（該当部分だけ抜粋）
function App() {
  // ...（既存コード）...

  const clearAll = () => {
    if (window.confirm('本当に全削除しますか？')) {
      setTodos([])
    }
  }

  return (
    <div>
      <h1>TODOアプリ</h1>
      <TodoForm onAdd={addTodo} />
      <button onClick={clearAll} style={{ margin: '8px 0' }}>
        全削除
      </button>
      <TodoList todos={todos} onDelete={deleteTodo} />
    </div>
  )
}
```

動作確認して、コミット：

```bash
git status
# modified: src/App.jsx と出る

git add src/App.jsx
git commit -m "feat: 全削除ボタンを追加"
```

> **コミットメッセージの書き方（Conventional Commits）**：
> - `feat:` 新機能
> - `fix:` バグ修正
> - `docs:` ドキュメント
> - `refactor:` 動きは変えずコード整理
> - `test:` テストの追加・修正
> - `chore:` 雑用（設定ファイル等）
>
> この授業では基本この形で書く。あとでCIや自動リリースを組む時に役立つ。

### 5. ブランチを push（5分）

```bash
git push -u origin feature/clear-all
```

> **`-u` は「上流ブランチを設定」** の意味。初回のみ付ける。次回以降は `git push` だけでOK。

### 6. プルリクエスト（PR）を作る（10分）

GitHub CLIから作成：

```bash
gh pr create --title "全削除ボタンを追加" --body "$(cat <<'EOF'
## 変更内容
- 一覧の上に「全削除」ボタンを追加
- 押下時に confirm ダイアログを出して、OKなら空配列に

## 動作確認
- [x] 追加→全削除で空になる
- [x] キャンセル押下で削除されない
EOF
)"
```

ブラウザでPRを開く：

```bash
gh pr view --web
```

### 7. セルフレビュー→マージ（5分）

PRページの **Files changed** タブで自分の差分を確認。

「Merge pull request」→「Confirm merge」→「Delete branch」まで実行。

ローカルも main を最新にする：

```bash
git switch main
git pull origin main
# 不要になったブランチを削除
git branch -d feature/clear-all
```

##  まとめ（10分）

### 今日できるようになったこと

- `gh` でリポジトリ作成＆push できるようになった
- ブランチ切る→コミット→push→PR→マージ の1サイクルを自分でできる
- Conventional Commits の書き方を知った

### よくある詰まりポイント

- **`gh auth login` が通らない**：プロキシや社内ネットが原因のことが多い。スマホテザリング等で再試行
- **`git push` で rejected**：main が進んでいる状態。`git pull --rebase origin main` で取り込んでから push
- **巨大ファイルをコミット**：`node_modules` を間違ってadd しないこと（`.gitignore` を確認）

### 次コマ予告

Phase 2 に突入。次回は「なぜテストを書くのか」から始めて、自動テストの世界に入る。TODOアプリに後からテストを足していく。

##  課題

### 基礎課題（必須）

1. 新しいブランチ `feature/completed-count` を切り、「完了済み：N件」の表示をTODOリスト上部に追加する
2. PRを作り、セルフマージまで行う（コミットメッセージは `feat:` で始めること）
3. `git log --oneline` で履歴がきれいに見えるか確認する

### 応用課題（推奨）

4. 上の作業を **コミット3つに分けて** やり直す： ①実装 (`feat:`)、②見た目調整 (`style:` または `refactor:`)、③READMEに使い方追記 (`docs:`)。1コミット1役割で積めているかを `git log --oneline` で確認する

```bash
# 例：3回にわける場合のイメージ
git commit -m "feat: 完了件数の集計ロジックを追加"
git commit -m "style: 件数表示の余白と文字サイズを調整"
git commit -m "docs: READMEに完了件数表示について追記"
```

5. PRの **Description（本文）** を充実させる：何をしたか／なぜか／確認した動作、を箇条書きで3項目以上書く。読む人（未来の自分・他人）のために書く意識を持つ

### チャレンジ課題（挑戦）

6. **意図的にコンフリクト（衝突）を起こして解決する** 練習：
   - mainブランチで `App.jsx` の1行を編集 → コミット
   - 同じ行を feature ブランチでも別の内容に編集 → コミット
   - feature から main へ `git merge origin/main`（または `git rebase origin/main`）を試す → コンフリクト発生
   - エディタで `<<<<<<<` `=======` `>>>>>>>` マーカーを手動で解決
   - 「どちらを残すか」は自分で判断して、PRにマージまで持っていく

> **狙い：** コマ24のチーム開発でも必ず直面する。今のうちに1人で体験しておくと本番で慌てない。

7. `.gitignore` を読み直し、**なぜ `node_modules/` をコミットしてはいけないか** を自分の言葉で1〜2行にまとめてメモに残す（ヒント：サイズ・再現性・`package-lock.json` の役割）
