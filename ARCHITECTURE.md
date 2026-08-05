# アーキテクチャ(コード構造マップ)

`js/script.js` は物理的には1ファイルだが、論理的には以下の8モジュール(+設定・状態管理)に区切られている。
各モジュールの境界には `// ====...` の見出しコメントがあり、見出し名はこのファイルの節タイトルと完全に一致させている。
「何が実装されているか」は `IMPLEMENTATION.md`、「なぜそう動くべきか」は `CONSTITUTION.md` を参照。
このファイルは「どこに何が書いてあるか」だけを示す地図であり、挙動の説明はしない。

行番号は変更のたびにズレるため記載しない。関数名またはセクション見出し(`// セーブ/ロード` 等)で検索(`grep`等)して該当箇所を開くこと。

## 主要オブジェクト(設定・状態管理)

`script.js` 冒頭、憲法二十六条コメントの直後に置かれる。定数・可変状態ともにこの範囲にまとまっている。

| 名前 | 種別 | 役割 |
|---|---|---|
| `DB` | 定数 | アセット一覧、キャラのサイズ/座標計算、ダメージ数値、デッキ枚数などのゲーム定数。第13条により再定義しない。 |
| `state` | 可変状態 | ゲームの現在状態全体(下記「state プロパティ一覧」参照)。第13条により再定義・再初期化しない。 |
| `imgs` | 可変状態 | 読み込み済み画像の辞書。キーは常に短いファイル名(例: `'player.PNG'`)。 |
| `deckCounts` | 可変状態 | デッキ編成画面で編集中のPUNCH/UPPER/GUARD内訳。 |
| `cardOutcomes` | 可変状態 | ターン中の各カードの勝敗表現(`card-lose`/`card-shatter`)。ターン終了時にリセット。 |
| `trails` | 可変状態 | dash.PNGの残像座標リスト。 |

### `state` プロパティ一覧

| プロパティ | 意味 |
|---|---|
| `pX, pY, eX, eY` | 味方(p)/敵(e)のcanvas上の座標 |
| `hpP, hpE` | 味方/敵の残りHP(0〜100) |
| `turn` | 現在のターン数 |
| `hands` | 場(5枠)に出したカードの配列 |
| `enemyHands` | 敵がそのターンに出す手の配列 |
| `pAct, eAct` | 現在の表示スプライト名(`'IDLE'`は呼吸表現のマーカー) |
| `pShakeUntil, eShakeUntil` | 振動演出の終了時刻(`performance.now()`基準) |
| `pBlinkUntil, eBlinkUntil` | 点滅演出の終了時刻 |
| `pLastAtk, eLastAtk` | 直近に使ったパンチスプライト(punch/punch2の交互切り替え用) |
| `pNumbed, eNumbed` | しびれ状態フラグ |
| `piyoSide, piyoFlip` | ピヨり演出の対象側/反転状態 |
| `pPunchStreak, ePunchStreak` | 地上パンチの連続ヒット数 |
| `pGuardHoldPose, eGuardHoldPose` | ガード構え維持フラグ |
| `gameMode, pendingMode` | 現在/次回のゲームモード(`'story'` \| `'training'`) |
| `trainingCycleIndex` | TRAINING MODEの技サイクル位置 |
| `storyEnemyIndex` | STORY MODEでの現在の敵の位置(セーブ対象) |
| `soundOn` | サウンド設定値(セーブ対象。再生処理は未実装) |
| `introCharAlpha, bgRevealRadius` | バトル開始演出の進行度 |
| `playerDeck, playerDiscard, playerHand` | 山札/捨札/手札 |
| `enemyRevealedUpTo` | 敵の手のうち公開済みの枚数 |
| `battleReady` | 操作可能かどうか |
| `resolving` | ターン解決処理中かどうか |

## モジュール一覧(script.js内の出現順)

### 1. セーブ/ロード
`loadSaveData`, `writeSaveData`, `applySaveDataOnBoot`

localStorageへの保存・復元を担当。

### 2. デッキ・山札システム
`shuffleArray`, `buildDeckArray`, `drawCard`, `updateDeckCountDisplay`, `runDeckRefresh`, `adjustDeck`, `updateDeckBuildUI`

デッキ編成画面での枚数調整、山札の構築・シャッフル・ドロー・リフレッシュ演出を担当。

### 3. アセット読み込み
`checkAllSettled`, `enemySpriteName`, `applyCardVisual`, `boot`

画像アセットの読み込み完了判定、敵グラフィックのフォールバック解決、カード画像の表示切り替え、起動処理を担当。

### 4. シーン遷移
`updateTitleContinueVisibility`, `playLogo`, `skipLogo`, `goLogo`, `goProloguePlay`, `skipPrologue`, `playPrologue`, `goStoryThenDeck`, `skipStorySequence`, `playStorySequence`, `showScene`, `goPrologue`, `goTitle`, `goNewGame`, `goContinueGame`, `goDeckBuild`, `tapFlickerThen`

ロゴ→プロローグ→タイトル→ストーリー→デッキ編成の画面遷移全般と、共通のタップ演出(`tapFlickerThen`)を担当。

### 5. 描画・スプライト管理
`setAct`, `getX`, `setX`, `setY`, `triggerShake`, `triggerBlink`, `nextPunchSprite`, `moveSprite`, `breathSprite`, `spriteFor`, `toIdle`, `draw`

canvas描画ループ本体と、キャラクターの座標・表示スプライト・振動/点滅状態を操作する汎用アクセサ群。

### 6. 手札UI・敵AI
`playCard`, `resetHands`, `dealInitialHandAnimation`, `updateHandUI`, `filledCount`, `updateUI`, `updateActionButtons`, `fadeOutQueueCards`, `currentEnemyPreset`, `updateCharNames`, `advanceToNextEnemy`(未呼び出し。`TODO.md`参照), `weightedRandomMove`, `currentTrainingMove`, `showTrainingPreview`, `generateEnemyTurnHand`, `drawEnemySlots`

手札の表示・カード操作と、STORY MODE/TRAINING MODEの敵の手札生成・表示を担当。

### 7. バトル進行
`goBattleStart`, `resetBattleState`, `playBattleIntro`, `showResult`, `hideResult`, `judge`(3すくみ判定), `applyDamage`, `healBothToFull`, `wait`, `moveBothX`, `approachCenter`, `retreatSlightly`, `goHome`, `waitBothLanded`, `runFinishSequence`, `nextQueuedMove`, `runNormalHit`, `runMeteor`, `runUpperCombo`, `runGuardSuccess`, `runPiyoEffect`, `runNumbFail`, `markCardOutcome`, `resolveExchange`(1回の攻防を解決する中心関数), `resolveTurn`(GO!ボタン押下時のエントリーポイント)

バトル開始演出から、1回の攻防の解決、ターン全体の進行、決着演出までを担当する最大のモジュール。これらの関数群は互いに密結合しているため、あえて分割していない。

### 8. UIポップアップ
`openHowTo`, `closeHowTo`, `closeHowToBackdrop`, `openOption`, `closeOption`, `closeOptionBackdrop`, `updateOptionUI`, `setSound`, `openResetConfirm`, `closeResetConfirm`, `doResetProgress`, `openItemGallery`, `optionRetry`, `optionReturnToTitle`

HOW TO/OPTIONポップアップの開閉と、OPTION画面内の各操作を担当。

## 処理フローの起点(呼び出しの入口)

- ゲーム起動: 画像読み込み完了 → `checkAllSettled` → `boot` → `playLogo`
- カードを場に出す: `playCard`(手札タップ時のonclick)
- ターン実行: `resolveTurn`(GO!ボタンのonclick) → ループ内で `resolveExchange` を攻防回数分呼び出す → `finally`句で後処理
- バトル開始: `goBattleStart` → `resetBattleState` → `playBattleIntro`
