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
| `RNG` | 可変状態 | シード付き乱数の状態(`seed` / 系統ごとの`streams` / 次回用の`nextSeed`)。関数は`rngHashString`, `rngFreshSeed`, `rngSetSeed`, `rngReseed`, `rngNext(系統)`, `rngInt(系統, n)`。対戦結果に関わる乱数はここから取る(2026-10-03、オンライン対戦の準備。`IMPLEMENTATION.md`「14. シード付き乱数」参照)。 |

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
| `gameMode, pendingMode` | 現在/次回のゲームモード(`'story'` \| `'training'` \| `'substoryBattle'` \| `'versus'` \| `'rush'` \| `'online'`) |
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
| `pComboType, eComboType` | このターンの5枚ワザ(`'finisher'`=クラッシュ!、`'miracle'`=ミラクル!、`null`=該当なし)。ターン開始時に手札から判定する |
| `pCombos, eCombos` | このターンの3枚ワザの候補一覧`[{type, start, alive}]`(`'followup'`=ラッシュ!、`'guardPunchUpper'`=ブレイク!、`'feint'`=フェイント!、`'parry'`=パリィ!)。1ターンに複数発動できる(2026-10-01) |
| `numbSureSide` | パリィ!でピヨった側。次の攻防で必ず負ける(2026-10-01) |

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
`goBattleStart`, `resetBattleState`, `playBattleIntro`, `showResult`, `hideResult`, `judge`(3すくみ判定), `applyDamage`, `healBothToFull`, `wait`, `moveBothX`, `approachCenter`, `retreatSlightly`, `goHome`, `waitBothLanded`, `runFinishSequence`, `nextQueuedMove`, `runNormalHit`, `runMeteor`(メテオ!), `runUpperCombo`(内部で`isSuperUpper`判定=ライジング!), `runGuardSuccess`, `runPiyoEffect`, `runNumbFail`, `runFollowUpFlurry`(ラッシュ!), `runGuardPunchUpperWallStrike`(ブレイク!), `runFinisher`(クラッシュ!), `runFeintCounter`(フェイント!), `runParry`(パリィ!), `detectComboType`(5枚ワザ), `detectThreeCardCombos` / `aliveComboEndingAt`(3枚ワザ、2026-10-01), `flashAttackerWhite`(追撃・追加打系の白い発光。CONSTITUTION.md第28条), `chargeMultOf`, `consumeCharge`, `consumeUpperCharge`, `atkMultOf`, `defMultOf`, `markCardOutcome`, `markEnemyDefeated`(STORY MODEでの撃破記録。EXTRA BATTLEの「？？？」マスキング判定に使う), `isEnemyDefeated`, `resolveExchange`(1回の攻防を解決する中心関数), `resolveTurn`(GO!ボタン押下時のエントリーポイント)

バトル開始演出から、1回の攻防の解決、ターン全体の進行、決着演出までを担当する最大のモジュール。これらの関数群は互いに密結合しているため、あえて分割していない。

### 8. UIポップアップ
`openHowTo`, `openHowToVs`(LOCAL V.S.用), `renderHowTo`, `toggleHowToSection`, `renderHowToTechniques`, `closeHowTo`, `closeHowToBackdrop`, `openRecords`, `renderRecords`, `toggleRecordsSection`, `openOption`, `closeOption`, `closeOptionBackdrop`, `updateOptionUI`, `setSound`, `openResetConfirm`, `closeResetConfirm`, `doResetProgress`, `optionRetry`, `optionReturnToTitle`, `bonusContentsAvailable`, `updateBonusContentsUI`, `openBonusContents`, `closeBonusContents`, `closeBonusContentsBackdrop`, `setBattleSpeed`, `toggleBattleSpeed`, `updateSpeedUI`(SPEED機能), `costumeSelectionAvailable`, `unlockSkin`, `openCostumeSelect`, `selectCostume`, `costumeAssetFolder`(COSTUME), `openSoundTest`, `renderSoundTestScreen`, `selectSoundTestCategory`, `stopSoundTestPlayback`等(SOUND TEST), `normalizeGiftCode`, `giftCodeHash`, `giftCodeReward`, `openGiftCodeInput`, `closeGiftCodeInput`, `showGiftCodeError`, `submitGiftCode`(GIFT CODE), `openSubStoryList`, `readSubStory`, `onSubStoryTap`, `subStoryDisplayTitle`, `playSubStoryEndScreen`(SUB STORY)

HOW TO/OPTIONポップアップの開閉と、OPTION画面内の各操作、およびBONUS CONTENTS(COSTUME/SOUND TEST/SPEED/GIFT CODE/SUB STORY一覧)関連の画面を担当。いずれも2026-09-27時点でIMPLEMENTATION.mdへのドキュメント化が追いついていなかった実装済み機能群(詳細はIMPLEMENTATION.md「8. BONUS CONTENTS」以降を参照)。

### 9. ローカル対戦(VERSUS)
`enterVersusLayout`, `exitVersusLayout`, `getVersusMirrorCtx`, `isVersusMirrorActive`, `vsRenderMirror`, `vsPlayerSetName`, `setCardBackVisual`, `versusSlotsHidden`, `vsHandHidden`, `vsCountFilled`, `vsResetBattleSide2`, `vsDrawCard2`, `vsDiscardAndDraw2`, `vsRefreshDecksIfNeeded`, `vsRunDeckRefresh2`, `vsRenderHand2`, `vsFlipRevealHand`, `vsPlayCard2`, `vsResetHands2`, `vsBeginTurnInput`, `vsOnReady`, `vsSubmitP`, `vsGo2`, `vsSetGates`, `vsRenderTop`, `vsMirrorCardOutcome`, `vsUpdateNames`, `vsShowResult`, `vsHideResults`, `vsStartBattle`, `vsRematch`, `vsBackToSelect`, `vsExitToTitle`, `goVersusSelect`, `vsCharByKey`, `vsCharUnlocked`, `vsThumbSrc`, `vsRenderSelect`, `vsSelectChar`, `vsToggleSelectReady`, `vsStartFromSelect`, `vsAvailableStages`, `vsSelectBackToTitle`, `playerCharacterSetName`

スマホ縦画面を上下に分けた2人対戦(下=1P、上=2Pを180°回転)。キャラ選択、2P側の山札・手札、1P→2Pの交代(ゲート)、2P側canvasへの反転コピー、上下別の決着表示を担当する。バトルの判定・演出はモジュール7をそのまま使い、既存関数には`state.gameMode === 'versus'`の分岐でこのモジュールを呼ぶフックだけを入れている(`resolveTurn`/`resetBattleState`/`playBattleIntro`/`showResult`/`updateUI`/`updateHandUI`/`drawEnemySlots`/`markCardOutcome`/`rollRequiredHandSize`/`draw`等)。
状態は`versusState`(定数`VERSUS_CHARACTERS`/`VERSUS_STAGE_COUNT`)にまとめている。`draw`内の技名ポップは`drawTechNamePops`に関数化し、`drawComboCounter`は描画先contextを引数で受け取れるようにした(反転canvasにも正しい向きで文字を描くため)。

### 10. オンライン対戦(ONLINE V.S.)(2026-10-03追加)
`onlineNetMode`, `onlineCreateFirebaseNet`, `onlineDummyHub`, `onlineCreateDummyHub`, `onlineEnsureNet`(通信部分。Firebase版/ダミー版を同じ形で扱う), `onlineGameVersion`, `onlineOppRole`, `onlineRoomPath`, `onlineTurnPath`, `onlineRoomIsStale`, `onlineRandomHex`, `onlineSha256`, `onlineHpKey`, `finisherTieSide`(resolveExchangeから呼ぶ), `onlineInputBlocked`(playCard等から呼ぶ), `onlineSetStatus`, `onlineSetGate`, `onlineHideBattleOverlays`, `onlineShowPanel`, `onlineSetLobbyMsg`, `goOnlineLobby`, `onlineErrorText`, `onlineCreateRoom`, `onlineJoinRoom`, `onlineEnterRoom`, `onlineCancelHost`, `onlineLeave`(goLogoからも呼ぶ), `onlineBackToTitle`, `onlineBackToLobby`, `onlineShowMessage`, `onlineProcess` / `onlineProcessOnce`(部屋のデータが変わるたびに呼ばれる進行役), `onlineBothReady`, `onlineGoSelect`, `onlineWriteSel`, `onlineRenderSelect`, `onlineRenderRival`, `onlineSelectChar`, `onlineRandomSelect`, `onlineToggleReady`, `onlineStartMatch`, `onlineEnemySetName`, `onlinePlayerSetName`, `onlineBeginTurn`, `onlineSubmit`, `onlineSyncError`, `onlineShowResult`, `onlineRenderResult`, `onlineRematch`, `onlineOpponentLeft`, `onlineEndByLeave`, `onlineEndAbnormal`, `onlineConnectionLost`, `onlineReserveRoom` / `onlineTryJoin`(部屋を作る/入るトランザクション。合言葉対戦とランダムマッチで共通), `onlineLaunchMatch`(試合開始の共通部分), `onlineStartCpuMatch`
- ランダムマッチ(2026-10-03、段階3): `onlineSetSearchText`, `onlineShowCpuPrompt`, `onlineUpdateSearchTime`, `onlineStartSearch`, `onlineResumeSearch`, `onlineScheduleCpuPrompt` / `onlineScheduleCpuPromptLater`, `onlineKeepSearching`, `onlineCancelSearch`, `onlineStopSearch`(onlineLeaveから呼ぶ), `onlineLeaveQueue`, `onlineSearchStep`(待合室全体のトランザクション), `onlineScheduleSearchStep`, `onlineReleaseClaim`, `onlineOnQueueEntry`, `onlineMatchAsHost`, `onlineMatchAsGuest`, `onlineStartCpu`, `onlineRivalLabel`

離れた2人の対戦。部屋の作成・入室・キャラ選択(`#sceneOnline`)、各ターンの手の送受信(コミット→公開)、決着・切断処理を担当する。バトルの判定・演出はモジュール7をそのまま使い、既存関数には`state.gameMode === 'online'`の分岐でこのモジュールを呼ぶフックだけを入れている(`resolveTurn`/`resetBattleState`/`playBattleIntro`/`showResult`/`updateCharNames`/`playCard`/`resetHands`/`updateActionButtons`/`syncSlotsWaiting`/`playerSpriteName`/`playerCharacterSetName`/`currentStageLabel`/`markSpecialUsed`/`updateOptionUI`/`goLogo`)。
状態は`onlineState`(定数`ONLINE_FIREBASE_CONFIG`/`ONLINE_SDK_BASE`/`ONLINE_ROOM_STALE_MS`/`ONLINE_LEAVE_GRACE_MS`/`ONLINE_CARD_NAMES`、ランダムマッチの`ONLINE_SEARCH_CPU_PROMPT_MS`/`ONLINE_QUEUE_REFRESH_MS`/`ONLINE_QUEUE_STALE_MS`/`ONLINE_QUEUE_CLAIM_WAIT_MS`/`ONLINE_RANDOM_GUEST_WAIT_MS`)にまとめている。ランダムマッチの状態は`onlineState`の`random`/`queued`/`searchTimers`/`matchTimer`等、CPU戦は`onlineState.cpu`(通信なし。相手の手は`onlineSubmit`で`generateEnemyTurnHand`から作る)。セーブ対象の`onlineUnlocked`/`onlineWins`は設定・状態管理の範囲にある。Firebaseのデータの形は、このモジュールの冒頭コメントと`ONLINE_PLAN.md`を参照。

## 処理フローの起点(呼び出しの入口)

- ゲーム起動: 画像読み込み完了 → `checkAllSettled` → `boot` → `playLogo`
- カードを場に出す: `playCard`(手札タップ時のonclick)
- ターン実行: `resolveTurn`(GO!ボタンのonclick) → ループ内で `resolveExchange` を攻防回数分呼び出す → `finally`句で後処理
- バトル開始: `goBattleStart` → `resetBattleState` → `playBattleIntro`
- ローカル対戦: タイトルのVERSUS → `goVersusSelect` → 両者READY → `vsStartFromSelect` → `vsStartBattle` → `resetBattleState` → `playBattleIntro` → `vsBeginTurnInput`。各ターンは `vsOnReady('P')` → 1PのGO!(`resolveTurn`→`vsSubmitP`) → `vsOnReady('E')` → 2PのGO!(`vsGo2`→`resolveTurn`) の順
- オンライン対戦: タイトルのONLINE V.S. → `goOnlineLobby` → `onlineCreateRoom`(または`onlineJoinRoom`、またはランダムマッチ`onlineStartSearch` → `onlineSearchStep` → `onlineMatchAsHost` / `onlineMatchAsGuest`) → `onlineEnterRoom` → `onlineGoSelect` → 両者READY → `onlineProcess`が`onlineStartMatch` → `resetBattleState` → `playBattleIntro` → `onlineBeginTurn`。各ターンは GO!(`resolveTurn`→`onlineSubmit`、ハッシュ値を送る) → 相手のハッシュ値が届く(`onlineProcess`が中身を送る) → 相手の中身が届く(`onlineProcess`が照合して`resolveTurn`) → `onlineBeginTurn`
