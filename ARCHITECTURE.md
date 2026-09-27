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
| `gameMode, pendingMode` | 現在/次回のゲームモード(`'story'` \| `'training'` \| `'substoryBattle'` \| `'versus'`) |
| `trainingCycleIndex` | TRAINING MODEの技サイクル位置 |
| `storyEnemyIndex` | STORY MODEでの現在の敵の位置(セーブ対象) |
| `soundOn` | サウンド設定値(セーブ対象。再生処理は未実装) |
| `introCharAlpha, bgRevealRadius` | バトル開始演出の進行度 |
| `playerDeck, playerDiscard, playerHand` | 山札/捨札/手札 |
| `enemyRevealedUpTo` | 敵の手のうち公開済みの枚数 |
| `battleReady` | 操作可能かどうか |
| `resolving` | ターン解決処理中かどうか |
| `pChargeValue, eChargeValue` | ガード連続成功チャージの倍率(0=無し、2または4)。次に出すカードの初撃1回分のみに適用され、勝敗を問わず消費される |
| `pUpperChargeReady, eUpperChargeReady` | UPPER→GUARD連続成功で発動するチャージ(次がUPPERの時だけライジング!になる) |
| `pComboType, eComboType` | このターンの手札パターン(`'followup'`=ラッシュ!、`'finisher'`=クラッシュ!、`'guardPunchUpper'`=ブレイク!、`null`=該当なし)。ターン開始時に手札から判定する |

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
`updateTitleContinueVisibility`, `playLogo`, `skipLogo`, `goLogo`, `goProloguePlay`, `skipPrologue`, `playPrologue`, `goStoryThenDeck`, `skipStorySequence`, `playStorySequence`, `showScene`, `goPrologue`, `goTitle`, `goNewGame`, `goContinueGame`, `goDeckBuild`, `tapFlickerThen`, `goSubstoryBattle`(EXTRA BATTLE開始。IMPLEMENTATION.md「EXTRA BATTLE」参照), `retrySubstoryBattle`

ロゴ→プロローグ→タイトル→ストーリー→デッキ編成の画面遷移全般と、共通のタップ演出(`tapFlickerThen`)を担当。

### 5. 描画・スプライト管理
`setAct`, `getX`, `setX`, `setY`, `triggerShake`, `triggerBlink`, `nextPunchSprite`, `moveSprite`, `breathSprite`, `spriteFor`, `toIdle`, `draw`, `spawnHitEffect`, `spawnTechNamePop`, `drawTechNamePops`(2026-09-27、VERSUS対応時に関数化。技名ポップの生成・描画。CONSTITUTION.md第30条参照)

canvas描画ループ本体と、キャラクターの座標・表示スプライト・振動/点滅状態を操作する汎用アクセサ群。

### 6. 手札UI・敵AI
`playCard`, `resetHands`, `dealInitialHandAnimation`, `updateHandUI`, `filledCount`, `updateUI`, `updateActionButtons`, `fadeOutQueueCards`, `currentEnemyPreset`, `updateCharNames`, `advanceToNextEnemy`(未呼び出し。`TODO.md`参照), `weightedRandomMove`, `currentTrainingMove`, `showTrainingPreview`, `generateEnemyTurnHand`, `drawEnemySlots`

手札の表示・カード操作と、STORY MODE/TRAINING MODEの敵の手札生成・表示を担当。

### 7. バトル進行
`goBattleStart`, `resetBattleState`, `playBattleIntro`, `showResult`, `hideResult`, `judge`(3すくみ判定), `applyDamage`, `healBothToFull`, `wait`, `moveBothX`, `approachCenter`, `retreatSlightly`, `goHome`, `waitBothLanded`, `runFinishSequence`, `nextQueuedMove`, `runNormalHit`, `runMeteor`(メテオ!), `runUpperCombo`(内部で`isSuperUpper`判定=ライジング!), `runGuardSuccess`, `runPiyoEffect`, `runNumbFail`, `runFollowUpFlurry`(ラッシュ!), `runGuardPunchUpperWallStrike`(ブレイク!), `runFinisher`(クラッシュ!), `flashAttackerWhite`(追撃・追加打系の白い発光。CONSTITUTION.md第28条), `chargeMultOf`, `consumeCharge`, `consumeUpperCharge`, `atkMultOf`, `defMultOf`, `markCardOutcome`, `markEnemyDefeated`(STORY MODEでの撃破記録。EXTRA BATTLEの「？？？」マスキング判定に使う), `isEnemyDefeated`, `resolveExchange`(1回の攻防を解決する中心関数), `resolveTurn`(GO!ボタン押下時のエントリーポイント)

バトル開始演出から、1回の攻防の解決、ターン全体の進行、決着演出までを担当する最大のモジュール。これらの関数群は互いに密結合しているため、あえて分割していない。

### 8. UIポップアップ
`openHowTo`, `closeHowTo`, `closeHowToBackdrop`, `openOption`, `closeOption`, `closeOptionBackdrop`, `updateOptionUI`, `setSound`, `openResetConfirm`, `closeResetConfirm`, `doResetProgress`, `optionRetry`, `optionReturnToTitle`, `bonusContentsAvailable`, `updateBonusContentsUI`, `openBonusContents`, `closeBonusContents`, `closeBonusContentsBackdrop`, `setBattleSpeed`, `toggleBattleSpeed`, `updateSpeedUI`(SPEED機能), `costumeSelectionAvailable`, `unlockSkin`, `openCostumeSelect`, `selectCostume`, `costumeAssetFolder`(COSTUME), `openSoundTest`, `renderSoundTestScreen`, `selectSoundTestCategory`, `stopSoundTestPlayback`等(SOUND TEST), `giftCodeChecksumChar`, `normalizeGiftCode`, `isValidGiftCode`, `giftCodeRewardSkin`, `openGiftCodeInput`, `closeGiftCodeInput`, `showGiftCodeError`, `submitGiftCode`(GIFT CODE), `openSubStoryList`, `readSubStory`, `onSubStoryTap`, `subStoryDisplayTitle`, `playSubStoryEndScreen`(SUB STORY)

HOW TO/OPTIONポップアップの開閉と、OPTION画面内の各操作、およびBONUS CONTENTS(COSTUME/SOUND TEST/SPEED/GIFT CODE/SUB STORY一覧)関連の画面を担当。いずれも2026-09-27時点でIMPLEMENTATION.mdへのドキュメント化が追いついていなかった実装済み機能群(詳細はIMPLEMENTATION.md「8. BONUS CONTENTS」以降を参照)。

### 9. ローカル対戦(VERSUS)
`enterVersusLayout`, `exitVersusLayout`, `getVersusMirrorCtx`, `isVersusMirrorActive`, `vsRenderMirror`, `vsPlayerSetName`, `setCardBackVisual`, `versusSlotsHidden`, `vsHandHidden`, `vsCountFilled`, `vsResetBattleSide2`, `vsDrawCard2`, `vsDiscardAndDraw2`, `vsRefreshDecksIfNeeded`, `vsRunDeckRefresh2`, `vsRenderHand2`, `vsFlipRevealHand`, `vsPlayCard2`, `vsResetHands2`, `vsBeginTurnInput`, `vsOnReady`, `vsSubmitP`, `vsGo2`, `vsSetGates`, `vsRenderTop`, `vsMirrorCardOutcome`, `vsUpdateNames`, `vsShowResult`, `vsHideResults`, `vsStartBattle`, `vsRematch`, `vsBackToSelect`, `vsExitToTitle`, `goVersusSelect`, `vsCharByKey`, `vsCharUnlocked`, `vsThumbSrc`, `vsRenderSelect`, `vsSelectChar`, `vsToggleSelectReady`, `vsStartFromSelect`, `vsAvailableStages`, `vsSelectBackToTitle`, `playerCharacterSetName`

スマホ縦画面を上下に分けた2人対戦(下=1P、上=2Pを180°回転)。キャラ選択、2P側の山札・手札、1P→2Pの交代(ゲート)、2P側canvasへの反転コピー、上下別の決着表示を担当する。バトルの判定・演出はモジュール7をそのまま使い、既存関数には`state.gameMode === 'versus'`の分岐でこのモジュールを呼ぶフックだけを入れている(`resolveTurn`/`resetBattleState`/`playBattleIntro`/`showResult`/`updateUI`/`updateHandUI`/`drawEnemySlots`/`markCardOutcome`/`rollRequiredHandSize`/`draw`等)。
状態は`versusState`(定数`VERSUS_CHARACTERS`/`VERSUS_STAGE_COUNT`)にまとめている。`draw`内の技名ポップは`drawTechNamePops`に関数化し、`drawComboCounter`は描画先contextを引数で受け取れるようにした(反転canvasにも正しい向きで文字を描くため)。

## 処理フローの起点(呼び出しの入口)

- ゲーム起動: 画像読み込み完了 → `checkAllSettled` → `boot` → `playLogo`
- カードを場に出す: `playCard`(手札タップ時のonclick)
- ターン実行: `resolveTurn`(GO!ボタンのonclick) → ループ内で `resolveExchange` を攻防回数分呼び出す → `finally`句で後処理
- バトル開始: `goBattleStart` → `resetBattleState` → `playBattleIntro`
- ローカル対戦: タイトルのVERSUS → `goVersusSelect` → 両者READY → `vsStartFromSelect` → `vsStartBattle` → `resetBattleState` → `playBattleIntro` → `vsBeginTurnInput`。各ターンは `vsOnReady('P')` → 1PのGO!(`resolveTurn`→`vsSubmitP`) → `vsOnReady('E')` → 2PのGO!(`vsGo2`→`resolveTurn`) の順
