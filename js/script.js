/**
 * 【憲法二十六条】
 * 全文は CONSTITUTION.md を参照。このファイルには埋め込まない
 * (理由: 本文が長く、js/script.js自体のファイルサイズ・初回ダウンロード時間に影響していたため、2026-08-06(67)で分離した)。
 * コードに変更を加える際は、CONSTITUTION.md の該当条文と矛盾しないか必ず確認すること。
 * 条文自体を追加・変更する場合は CONSTITUTION.md を直接編集する(省略・簡略化・要約はしない。全文を維持する。第25条)。
 */

// ============================================================
// 設定・状態管理(DB / state / imgs / trails / cardOutcomes / deckCounts / unlockedItems / 各種初期化処理)
// ============================================================

// 第22条: ファイル名は小文字、拡張子は常に大文字 .PNG
const DB = {
    ASSETS: ['player.PNG', 'player2.PNG', 'upper.PNG', 'damage.PNG', 'knock.PNG', 'knock2.PNG', 'dash.PNG', 'punch.PNG', 'punch2.PNG', 'guard.PNG', 'down.PNG', 'piyo.PNG'],
    SRC_PX: 32,   // キャラのソース解像度(32×32px)
    SCALE: 10,    // ソース1pxをcanvas上で何ユニットに拡大するか(キリのいい整数倍で崩れを防ぐ)
    POS: {
        CENTER_X: 480,      // 戦う位置は常に画面中心
        HOME_HALF: 260,     // 中心からホームポジションまでの距離（両者同一）
        ATTACK_HALF: 100,   // 中心から攻防の接触位置までの距離（両者同一）
        RETREAT_HALF: 200,  // 攻防のあと軽く距離を取る位置（ホームまでは戻らない）
        GROUND_MARGIN_PX: 3 // 地面バンドの高さ(ソースpx換算。キャラ下部3px想定)
    },
    DMG: { P: 10, U: 5, M: 35, CLASH: 3, TINY: 1, P_COMBO_STEP: 5, FINISHER: 50 }, // P:パンチ勝利 / U:アッパー初撃 / M:メテオ(初撃5+追撃10+追撃15+メテオ35=合計65になるよう調整) / CLASH:相討ち微ダメージ / TINY:ガードされたパンチの反撃 / P_COMBO_STEP:空中パンチ連続ヒットの増加量 / FINISHER:GUARD+PUNCH+GUARD+PUNCH+PUNCH成立時の必殺技(チャージ等の影響を受けない固定値)
    MAX_AIR_PUNCH: 3,
    BREATH_MS: 500, // player.PNG / player2.PNG の呼吸切替間隔
    DECK_TOTAL: 21 // デッキ合計枚数(内訳は編成画面で自由配分)
};
DB.IMG_SIZE = DB.SRC_PX * DB.SCALE; // 32×10=320。ソースpxとcanvasユニットの対応が常に整数になる
// 地面バンド(3px)ぶんの余白を残して、キャラの足元が浮かないギリギリの高さにGROUND_Yを置く
DB.POS.GROUND_Y = 560 - DB.IMG_SIZE - (DB.POS.GROUND_MARGIN_PX * DB.SCALE); // 560 - 320 - 30 = 210
DB.POS.FLOAT_Y = DB.POS.GROUND_Y - 200; // 被弾側がふわっと浮く高さ
DB.POS.HOP_Y = DB.POS.GROUND_Y - Math.round((DB.POS.GROUND_Y - DB.POS.FLOAT_Y) / 3); // 打つ方の初撃の小ホップ(1/3)
// PUNCH+PUNCH+UPPER(直前2連続の地上PUNCH勝利に続くUPPER): 2倍の高さまで打ち上げる(初撃のみ)
DB.POS.SUPER_FLOAT_Y = DB.POS.GROUND_Y - 400;
DB.POS.SUPER_HOP_Y = DB.POS.GROUND_Y - Math.round((DB.POS.GROUND_Y - DB.POS.SUPER_FLOAT_Y) / 3);
DB.POS.P_HOME_X = DB.POS.CENTER_X - DB.POS.HOME_HALF - DB.IMG_SIZE / 2;
DB.POS.E_HOME_X = DB.POS.CENTER_X + DB.POS.HOME_HALF - DB.IMG_SIZE / 2;
DB.POS.P_ATTACK_X = DB.POS.CENTER_X - DB.POS.ATTACK_HALF - DB.IMG_SIZE / 2;
DB.POS.E_ATTACK_X = DB.POS.CENTER_X + DB.POS.ATTACK_HALF - DB.IMG_SIZE / 2;
DB.POS.P_RETREAT_X = DB.POS.CENTER_X - DB.POS.RETREAT_HALF - DB.IMG_SIZE / 2;
DB.POS.E_RETREAT_X = DB.POS.CENTER_X + DB.POS.RETREAT_HALF - DB.IMG_SIZE / 2;
// 必殺技(GUARD+PUNCH+GUARD+PUNCH+PUNCH)で吹き飛ばす先の画面端座標
DB.POS.EDGE_P_X = 10;
DB.POS.EDGE_E_X = 960 - DB.IMG_SIZE - 10;
// 背景アート推奨解像度: canvas(960×560)をSCALEで割った値 = 96×56px。1px=キャラの1pxと完全に一致する。
DB.BG_SRC_W = 960 / DB.SCALE; // 96
DB.BG_SRC_H = 560 / DB.SCALE; // 56

// 第13条: この state オブジェクトは以後、再定義・再初期化しない。常にプロパティを書き換えて参照し続ける。
let state = {
    pY: DB.POS.GROUND_Y, eY: DB.POS.GROUND_Y,
    pX: DB.POS.P_HOME_X, eX: DB.POS.E_HOME_X,
    hpP: 100, hpE: 100,
    turn: 0,
    hands: new Array(5).fill(null), enemyHands: [],
    pAct: 'IDLE', eAct: 'IDLE', // 'IDLE' は player.PNG / player2.PNG の呼吸表現を意味するマーカー
    pShakeUntil: 0, eShakeUntil: 0,
    pBlinkUntil: 0, eBlinkUntil: 0,
    pLastAtk: null, eLastAtk: null,
    pNumbed: false, eNumbed: false, // しびれフラグ: 次のコマンドの成功率が1/2になる(ガード成功で相手に付与)
    piyoSide: null, // ピヨり演出: どちら側の頭上に出すか(truthyな間、継続して表示される)
    pPunchStreak: 0, ePunchStreak: 0, // 地上パンチの連続ヒット数(コンボではなく、単発同士の連続成功を記録)
    pGuardStreak: 0, eGuardStreak: 0, // ガード成功の連続回数(同一ターン内のみ。2回で2倍・3回以降は4倍が上限。ターン終了時にリセット)
    pChargeValue: 0, eChargeValue: 0, // チャージの倍率(0=無し、2、4)。ガード成功以外の次のカードで勝敗に関わらず消費される。ターンをまたいで持ち越す
    pUpperChargeReady: false, eUpperChargeReady: false, // UPPER→GUARDの連続成功で発動するチャージ(次に出すカードがUPPERの時だけ2倍高く速く強いアッパーになる)。水色の発光で示す。ターンをまたいで持ち越す
    pLastWinWasUpper: false, eLastWinWasUpper: false, // 直前の攻防でこの側がUPPERで勝ったか(UPPER→GUARDの連続検知に使う、毎攻防resolveExchangeの冒頭でリセットする一時フラグ)
    skipNextReposition: false, // UPPER→GUARDの専用着地演出の直後にtrueになり、次の攻防の後退→接近ダッシュ往復を1回だけスキップする
    pComboType: null, eComboType: null, // このターンの手札パターン('followup'=PUNCH+GUARD+PUNCH, 'finisher'=GUARD+PUNCH+GUARD+PUNCH+PUNCH, null=該当なし)。ターン開始時に手札から判定する
    pComboStart: -1, eComboStart: -1, // followup該当時、手札内でPUNCH+GUARD+PUNCHが始まる位置(0始まり)。finisherは常に0固定
    pComboAlive: false, eComboAlive: false, // 対応する各攻防が要件(勝ち、または必殺技は勝ちか相打ち)を満たし続けているか。1つでも要件を満たさなければfalseになりコンボは不成立になる
    // ------- COMBOカウンター(第26条とは別概念。上記pComboType等は手札パターン判定名で、こちらは連続成功回数の表示用) -------
    pHitCombo: 0, eHitCombo: 0, // 現在の連続成功回数。GUARD成功・空中コンボ・メテオ・追撃・必殺技も含め、成功する技すべてでカウントする。ターンをまたいでも持ち越す
    pHitComboEverBroken: false, eHitComboEverBroken: false, // このバトル中に一度でも連続が途切れた(負け/相討ちを経験した)か。COMBO PERFECT判定に使う。バトル開始時にリセット
    pHitComboDisplayValue: 0, eHitComboDisplayValue: 0, // 表示に使う値。フェードアウト中は直前の値を保持し続ける
    pHitComboFadeStartAt: 0, eHitComboFadeStartAt: 0, // フェードアウト開始時刻(0=フェードアウト中でない)。連続が途切れた際「フッと消す」演出用
    pHitComboPopAt: 0, eHitComboPopAt: 0, // 直近で連続成功回数が増えた時刻。ポップ(飛び上がる)アニメーション用
    pHitComboMilestoneAt: 0, eHitComboMilestoneAt: 0, // 直近で5に到達した時刻。一時的なきらびやか強調演出用
    pHitComboBigMilestoneAt: 0, eHitComboBigMilestoneAt: 0, // 直近で15/20/25…(5の倍数、15以上)に到達した時刻。大型の赤い強調演出用
    lastExchangeResult: null, // 直近の攻防結果 { P: 'win'|'lose'|'draw', E: 'win'|'lose'|'draw' }。resolveExchange/runFinisherが設定し、resolveTurnがコンボ判定に使う
    finisherAlreadyDown: false, // 必殺技でK.O.した場合、画面端でdown.PNGのまま倒れる(通常のホーム帰還演出をスキップする合図)
    pGuardHoldPose: false, eGuardHoldPose: false, // 相手がしびれている間、ガード成功側の構えを維持するフラグ
    gameMode: 'story', pendingMode: 'story', // 'story' | 'training'
    storyEnemyIndex: 0, // STORY MODE: ENEMY_ORDER内の現在の敵の位置(連戦で進んでいく想定。セーブデータから復元される)
    soundOn: true, // OPTION画面のサウンドON/OFF。BGM/SEの再生有無に連動する
    bgmVolume: 0.5, // BGM音量(0〜1)。SEを聴き取りやすくするため既定を控えめにしている
    seVolume: 1.0, // SE音量(0〜1)
    introCharAlpha: 1, // バトル開始演出: 味方のフェードイン係数(0〜1)
    introEnemyAlpha: 1, // バトル開始演出: 敵のフェードイン係数(0〜1)。ステージ固有の登場演出のため味方とは別に管理する
    screenFlashAlpha: 0, // 画面全体を白く明滅させる演出(5THステージの敵登場等で使用)
    bgRevealRadius: 0, // バトル開始演出: 背景を中心から広げる円形クリップの半径(0で真っ暗)
    playerDeck: [], playerDiscard: [], playerHand: new Array(5).fill(null), // 山札/捨札/手札
    enemyRevealedUpTo: 0, // 敵の手のうち、何枚目まで公開済みか
    battleReady: false, // バトル開始演出が完了し、操作可能になったか
    resolving: false
};
let trails = []; // 第24条: dash.PNGの残像
let cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン中の各カードの勝敗表現(card-lose/card-shatter)。ターン終了(両者が定位置へ戻り、場のカードが消えた後)にリセットする
let deckCounts = { PUNCH: 7, UPPER: 7, GUARD: 7 }; // デッキ編成(合計21枚、内訳は自由)
let unlockedItems = []; // 隠しアイテム(今後実装予定)。取得済みアイテムIDを貯めていく想定

// ------- 実績システム(汎用・今後も追加していく前提) -------
// 解除状況はすべてlocalStorageに永続保存し、ブラウザを閉じても解除済みのまま残る。
let unlockedSubStories = []; // 解除済みサブストーリーのenemyIndex(0〜4)の配列
let unlockedSkins = []; // 解除済みコスチュームのセット名('enemy_1'〜'enemy_5')の配列
let soundTestUnlocked = false; // SOUND TESTが解除済みか(旧条件。新条件はgameClearedOnce、後方互換のため残す)
let battleSpeedX2 = false; // バトル中2倍速が有効か。SPEED機能自体の解放条件はgameClearedOnce(クリア後)。セーブデータに永続化する
// SOUND TEST画面の状態: カテゴリ選択→BGM/SE一覧(6件ずつページ送り)の2階層
let soundTestCategory = null; // null=カテゴリ選択画面、'bgm'または'se'=一覧画面
let soundTestPage = 0; // 一覧画面でのページ番号(0始まり)
const SOUND_TEST_PAGE_SIZE = 6;
let soundTestSource = null; // SOUND TEST専用のプレビュー再生ノード(本編のBGM/SE再生とは独立)
let soundTestPlayingName = null; // 現在プレビュー再生中のトラック名(null=何も再生していない)
let specialsUsed = { superUpper: false, charge: false, followUp: false, finisher: false, upperGuardUpper: false }; // 各種必殺技を、これまでの対戦を通じて1回でも使ったか(バトルをまたいで積み上げ)。SOUND TESTの解放条件は当初の4種のまま(upperGuardUpperは将来の実績拡張用に記録のみ)
let selectedSkin = null; // 現在選択中のコスチューム('enemy_1'等、nullはデフォルトのプレイヤー見た目)
let gameClearedOnce = false; // STORY MODEを一度でも最後(5人目)までクリアしたか。COSTUMEの解放条件の一部
let costumeUnlockAnnounced = false; // タイトル画面でCOSTUME解放のポップアップを既に一度見せたか(繰り返し表示しないため)
let bonusContentsAnnounced = false; // タイトル画面でBONUS CONTENTS解放のポップアップを既に一度見せたか

// 各敵のストーリーシーン内に仕込む隠しタップで解除する、サブストーリーの仮テキスト(画像は今後配置予定、未配置ならプレースホルダー表示)
// 隠しタップの対象画面(ストーリーシーン3画面のうち何枚目か、0始まり)。敵ごとにバラバラの画面に仕込む。
// 3枚すべてではなく、対応する1枚の時だけ#storyHiddenTapを有効にする。仮の割り当てで、正確な位置・対象画面は画像が揃い次第調整する。
const STORY_HIDDEN_TAP_SCREEN_BY_ENEMY = {
    ENEMY_01: 1, // 2枚目
    ENEMY_02: 0, // 1枚目
    ENEMY_03: 2, // 3枚目
    ENEMY_04: 1, // 2枚目
    ENEMY_05: 0, // 1枚目
};
// 隠しタップの対象位置(画像内での中心座標、%指定)。指定が無い敵は仮の位置(左上寄り)のままにする。
// ENEMY_01は「ノアの大事な形見」が写っている位置(画像内 x:61%, y:56%あたり)に合わせてある。
const STORY_HIDDEN_TAP_POS_BY_ENEMY = {
    ENEMY_01: { x: 61, y: 56 },
};
const STORY_HIDDEN_TAP_DEFAULT_POS = { x: 10, y: 10 }; // 位置未指定の敵はこれまで通り左上寄り(仮)のまま

// 各敵のストーリーシーン内に仕込む隠しタップで解除する、サブストーリーの仮テキスト(画像は今後配置予定、未配置ならプレースホルダー表示)。
// 本編のストーリーシーンと同じく、3枚の画像+テキストで展開する。
const SUBSTORY_BY_ENEMY = {
    ENEMY_01: {
        title: 'ノアの大事な形見',
        screens: [
            { img: 'substory_1_1.PNG', text: '（仮テキスト・敵01 裏話 1/3）誰にも言えない、敵01(仮)だけの秘密の物語がここに……' },
            { img: 'substory_1_2.PNG', text: '（仮テキスト・敵01 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_1_3.PNG', text: '（仮テキスト・敵01 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_02: {
        title: '敵02(仮)の裏話',
        screens: [
            { img: 'substory_2_1.PNG', text: '（仮テキスト・敵02 裏話 1/3）誰にも言えない、敵02(仮)だけの秘密の物語がここに……' },
            { img: 'substory_2_2.PNG', text: '（仮テキスト・敵02 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_2_3.PNG', text: '（仮テキスト・敵02 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_03: {
        title: '敵03(仮)の裏話',
        screens: [
            { img: 'substory_3_1.PNG', text: '（仮テキスト・敵03 裏話 1/3）誰にも言えない、敵03(仮)だけの秘密の物語がここに……' },
            { img: 'substory_3_2.PNG', text: '（仮テキスト・敵03 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_3_3.PNG', text: '（仮テキスト・敵03 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_04: {
        title: '敵04(仮)の裏話',
        screens: [
            { img: 'substory_4_1.PNG', text: '（仮テキスト・敵04 裏話 1/3）誰にも言えない、敵04(仮)だけの秘密の物語がここに……' },
            { img: 'substory_4_2.PNG', text: '（仮テキスト・敵04 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_4_3.PNG', text: '（仮テキスト・敵04 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
    ENEMY_05: {
        title: '敵05(仮)の裏話',
        screens: [
            { img: 'substory_5_1.PNG', text: '（仮テキスト・敵05 裏話 1/3）誰にも言えない、敵05(仮)だけの秘密の物語がここに……' },
            { img: 'substory_5_2.PNG', text: '（仮テキスト・敵05 裏話 2/3）その過去には、まだ語られていない出来事があった。' },
            { img: 'substory_5_3.PNG', text: '（仮テキスト・敵05 裏話 3/3）そして今、その真実がようやく明かされる。' },
        ],
    },
};
// サウンドテストの一覧(実ファイルはassets/audio/配下に今後配置。未配置の項目は再生時に何も鳴らないだけで、エラーにはしない)
const SOUND_TEST_TRACKS = [
    { name: 'bgm_title', label: 'title' },
    { name: 'bgm_prologue', label: 'opening' },
    { name: 'bgm_story', label: 'story' },
    { name: 'bgm_battle', label: 'Mifune' },
    { name: 'bgm_battle_1', label: 'Noah' },
    { name: 'bgm_battle_2', label: 'Rita' },
    { name: 'bgm_battle_3', label: 'Gald' },
    { name: 'bgm_battle_4', label: 'Jack' },
    { name: 'bgm_battle_5', label: 'Alv' },
    { name: 'bgm_victory', label: 'winner' },
    { name: 'bgm_ending', label: 'ending' },
    { name: 'se_punch', label: 'SE: パンチ' },
    { name: 'se_upper', label: 'SE: アッパー' },
    { name: 'se_guard', label: 'SE: ガード' },
    { name: 'se_meteor', label: 'SE: メテオ' },
    { name: 'se_finisher', label: 'SE: 必殺技' },
    { name: 'se_clash_punch', label: 'SE: あいこ(PUNCH)' },
    { name: 'se_clash_upper', label: 'SE: あいこ(UPPER)' },
    { name: 'se_clash_guard', label: 'SE: あいこ(GUARD)' },
    { name: 'se_ko', label: 'SE: K.O.' },
    { name: 'se_win', label: 'SE: YOU WIN' },
];

// ------- セーブ/ロード(localStorage) -------
// このゲームは単体のHTMLファイルとして配布する想定のため、通常のWebサイトと同様にlocalStorageを使用する。
const SAVE_KEY = 'commandbattle_save_v1';


// 起動時にセーブデータを読み込み、進行状況・デッキ編成・サウンド設定へ反映する


// ------- 山札操作 -------





// 手札・山が共に尽きた時の演出: DECK表示が3回点滅→「Refresh」表示→0から実際の枚数までカウントアップしながら
// 捨札を山へリシャッフルする(約2.5秒)


// ------- デッキ編成画面 -------


// タップ時にチカチカっと点滅させてから、コールバック(画面遷移など)を実行する




const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false; // 第10条

const imgs = {}; // 第13条: 再初期化しない
let loadedCount = 0;
let loadFailed = [];
let bgSettled = false; // bg.PNGは任意アセット。成功/失敗に関わらず「決着」したらtrue

// プロローグ/ストーリー/サブストーリー/エンディングの画像は、対象の枚数がステージ・実績の増加とともに
// 増えていくため、起動時に全部まとめて読み込むと(そのシーンに辿り着かない場合も含めて)無駄に重くなる。
// そのため、対象のシーンを実際に再生する直前だけ読み込みを開始する(遅延読み込み)。
const cutsceneLoadPromises = {}; // name -> 読み込み完了(成功/失敗問わず)を表すPromise。二重リクエスト防止と、呼び出し側が完了を待てるようにする両方を兼ねる
function loadCutsceneImage(name, folder) {
    if (imgs[name]) return Promise.resolve(imgs[name]);
    if (cutsceneLoadPromises[name]) return cutsceneLoadPromises[name];
    const p = new Promise(resolve => {
        const i = new Image();
        i.onload = () => { imgs[name] = i; resolve(i); };
        i.onerror = () => { resolve(null); /* 任意アセットのため未用意でもエラー扱いにしない。呼び出し側はnullならプレースホルダー表示にフォールバックする */ };
        i.src = `assets/images/cutscenes/${folder}/${name}`;
    });
    cutsceneLoadPromises[name] = p;
    return p;
}
// 1シーン分(3〜5画面)の画像をまとめて遅延読み込みし、全て決着(成功/失敗問わず)するまで待てるPromiseを返す
function loadCutsceneScreens(screens, folder) {
    return Promise.all(screens.map(sc => loadCutsceneImage(sc.img, folder)));
}

// バトルで使うキャラ画像(DB.ASSETS)・背景(bg.PNG)の読み込み状況フラグ。
// オープニング/タイトル/バトル開始のいずれも、この読み込み完了を待たない(バトル演出自体の数秒を読み込みの猶予時間にする)。
// 万一バトル開始時点で読み込みが間に合っていない場合は、draw()側の既存フォールバック表示(緑/赤の四角)が
// 一時的に使われ、読み込みが完了し次第そのフレームから自動的に実画像へ切り替わる(あくまで保険で、通常は発生しない想定)。
let battleAssetsReadyFlag = false;

document.querySelectorAll('.controls button').forEach(b => b.disabled = true);
document.getElementById('howToBtn').disabled = false; // HOW TOはゲーム状態に関係なく常に押せるようにする
document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様に常に押せる
document.getElementById('speedToggleBtn').disabled = false; // SPEEDも同様、解放済みならいつでも押せる(未解放時はvisibility:hiddenで見えない)


DB.ASSETS.forEach(n => {
    const i = new Image();
    i.onload = () => { imgs[n] = i; loadedCount++; checkAllSettled(); };
    i.onerror = () => { loadFailed.push(n); checkAllSettled(); };
    i.src = 'assets/images/characters/' + n;
});

// バトルで使うキャラ画像・背景の読み込み完了を待たず、ここで即座に起動する(NOW LOADING表示もここで隠れる)。
// オープニング(ロゴ/プロローグ)〜タイトルはこれらの画像を使わないため、最短で表示を始められる。
// setTimeoutで次のタスクへ回すことで、このファイル内の他のlet/const宣言(boot内部から辿って参照するもの)が
// すべて実行された後にboot()が呼ばれるようにしている(ここで同期的に直接呼ぶと、まだ宣言前の変数に触れてしまう)。
setTimeout(boot, 0);

// 背景(bg.PNG)はcanvasに直接描画するため、他アセットと同じ拡大パイプラインに乗る。
// 任意アセット扱いとし、読み込めなくてもエラーにせずdraw()側でフォールバック色を使う。
// bg.PNGは1stステージ(ENEMY_01)の背景を兼ねる。
const bgImgLoader = new Image();
bgImgLoader.onload = () => { imgs['bg.PNG'] = bgImgLoader; bgSettled = true; checkAllSettled(); };
bgImgLoader.onerror = () => { bgSettled = true; checkAllSettled(); };
bgImgLoader.src = 'assets/images/backgrounds/bg.PNG';

// 2〜5体目のステージ背景、およびTRAINING MODE専用背景(任意アセット)。
// 以前は起動時に5枚まとめて読み込んでいたが、実際に必要なのは今の対戦相手の1枚だけのため、
// 遅延読み込みに変更した(DB.ASSETS等と同じPromiseキャッシュの仕組みをここでも使う)。
const bgLoadPromises = {}; // name -> 読み込み完了(成功/失敗問わず)を表すPromise。二重リクエスト防止
function loadStageBackground(name) {
    if (imgs[name]) return Promise.resolve(imgs[name]);
    if (bgLoadPromises[name]) return bgLoadPromises[name];
    const p = new Promise(resolve => {
        const i = new Image();
        i.onload = () => { imgs[name] = i; resolve(i); };
        i.onerror = () => { resolve(null); /* 任意アセットのため未用意でもエラー扱いにしない。bg.PNGへフォールバック */ };
        i.src = 'assets/images/backgrounds/' + name;
    });
    bgLoadPromises[name] = p;
    return p;
}
// 現在の状況(TRAINING MODE、またはSTORY MODEの現在の敵)に応じた背景ファイル名を返す。
// 該当画像が未読み込みの場合は、1stステージを兼ねるbg.PNGへフォールバックする。
function currentBgName() {
    let name;
    if (state.gameMode === 'training') {
        name = 'bg_training.PNG';
    } else {
        const stageNum = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1; // 1〜5
        name = stageNum === 1 ? 'bg.PNG' : `bg_${stageNum}.PNG`;
    }
    return imgs[name] ? name : 'bg.PNG';
}

// ------- 敵専用グラフィックの差し替え余地(任意) -------
// 第19条: 敵(STORY MODEの対戦相手、またはTRAINING MODE)ごとに専用のグラフィックセットを用意できる。
// assets/images/characters_enemy/enemy_1/〜enemy_5/(STORY MODEの1〜5体目)、training/(TRAINING MODE)の
// 各フォルダに、プレイヤーと同じ11種類のファイル名(player.PNG, damage.PNG など)を置く。
// 未用意でも起動やUIをブロックせず、404になっても黙ってプレイヤー画像にフォールバックする。
const ENEMY_SET_NAMES = ['enemy_1', 'enemy_2', 'enemy_3', 'enemy_4', 'enemy_5', 'training'];
const ENEMY_OPTIONAL_KEYS = ['player', 'player2', 'upper', 'damage', 'knock', 'knock2', 'dash', 'punch', 'punch2', 'guard', 'down'];
// 以前は6セット×11ポーズ=66枚を起動時にまとめて読み込んでいたが、実際に使うのは今の対戦相手の1セットだけのため、
// 遅延読み込みに変更した(バトルで使うキャラ画像・背景と同様、実際にそのセットが必要になる直前だけ読み込みを開始する)。
const enemySetLoadPromises = {}; // setName -> そのセット(11枚)の読み込み完了(成功/失敗問わず)をまとめたPromise
function loadEnemySet(setName) {
    if (enemySetLoadPromises[setName]) return enemySetLoadPromises[setName];
    const p = Promise.all(ENEMY_OPTIONAL_KEYS.map(key => new Promise(resolve => {
        const imgKey = setName + '_' + key + '.PNG'; // imgs辞書内でのキー(例: 'enemy_3_damage.PNG')
        if (imgs[imgKey]) { resolve(imgs[imgKey]); return; }
        const i = new Image();
        i.onload = () => { imgs[imgKey] = i; resolve(i); }; // 用意されていれば以後自動的にこちらが使われる
        i.onerror = () => { resolve(null); /* 任意アセットのため未用意でもエラー扱いにしない */ };
        i.src = `assets/images/characters_enemy/${setName}/${key}.PNG`;
    })));
    enemySetLoadPromises[setName] = p;
    return p;
}
// 現在の状況(TRAINING MODE、またはSTORY MODEの現在の敵)に応じた敵グラフィックセット名を返す('enemy_1'〜'enemy_5'または'training')
function currentEnemySetName() {
    if (state.gameMode === 'training') return 'training';
    const idx = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1; // 1〜5
    return 'enemy_' + idx;
}
// 敵側の描画名を解決する。現在の敵グラフィックセットが読み込み済みならそちらを、なければプレイヤー画像を返す。


// ------- カード画像(任意) -------
// 用意されていれば card_P.PNG / card_U.PNG / card_G.PNG を使い、無ければ従来通り文字(P/U/G)を表示する。
const CARD_IMG_MAP = { PUNCH: 'card_P.PNG', UPPER: 'card_U.PNG', GUARD: 'card_G.PNG' };
Object.values(CARD_IMG_MAP).forEach(fname => {
    const i = new Image();
    i.onload = () => { imgs[fname] = i; };
    i.onerror = () => { /* 任意アセットのため未用意でもエラー扱いにしない。文字表示にフォールバック */ };
    i.src = 'assets/images/cards/' + fname;
});
// カードの裏面(任意)。用意されていれば card_back.PNG を使い、無ければCSSの縞模様にフォールバックする。
const CARD_BACK_IMG = 'card_back.PNG';
(() => {
    const i = new Image();
    i.onload = () => { imgs[CARD_BACK_IMG] = i; };
    i.onerror = () => { /* 未用意でもエラー扱いにしない */ };
    i.src = 'assets/images/cards/' + CARD_BACK_IMG;
})();
// カード表示用の要素(el)に、typeに応じた画像 or 文字フォールバックを適用する





// ------- ロゴシーン: BORN MAGAZINE presents(logo.PNGは任意アセット。無ければテキストにフォールバック) -------
let logoTokenCounter = 0;





// ------- プロローグ: op_1.PNG〜op_4.PNG(任意アセット)。未用意でもエラー扱いにせずプレースホルダー表示にする -------
const OPENING_SCREENS = [
    { img: 'op_1.PNG', text: '2026年、東京……。\nむかしも今も、ねむらない都市。\n夢を見つづける都市。\n……そして……' },
    { img: 'op_2.PNG', text: 'おのれの夢をかなえる都市……！！！！' },
    { img: 'op_3.PNG', text: 'ケンカに明けくれていた主人公ヴァルも、\n父を探すという夢があった……' },
    { img: 'op_4.PNG', text: 'しかし、突如として現れた異空の渦に吸い込まれ、\n見知らぬ世界でたたかうことになるのだった…！' }
];
// オープニング(プロローグ)の画像は、以前はplayPrologue()が呼ばれた時点(ロゴ演出の後)で初めて読み込みを開始していたため、
// 頭出しの猶予が無く表示までの待ちが目立っていた。DB.ASSETSと同様、ページ読み込み直後から先読みを始めることで、
// ロゴ画面が表示されている数秒間を読み込みの猶予時間として使う(playPrologue側の読み込み待ちは、
// このキャッシュ済みPromiseを再利用するだけになるため、通常は即座に解決する)。
loadCutsceneScreens(OPENING_SCREENS, 'opening');

let prologueToken = 0; // SKIP時に進行中のタイプライター処理を打ち切るためのトークン



// ------- ストーリーシーン(STORY MODE専用): story_{敵番号}_{画面番号}.PNG(任意アセット)。プロローグと同じ仕組みを流用 -------
// 敵ごとに3画面分の画像・テキストを用意する(例: 1体目=story_1_1〜3.PNG、2体目=story_2_1〜3.PNG)。
// 敵の追加時はこのオブジェクトに ENEMY_0N のキーを追加する(ENEMY_PRESETS/ENEMY_ORDERと合わせて追加すること)。
const STORY_SCREENS_BY_ENEMY = {
    ENEMY_01: [
        { img: 'story_1_1.PNG', text: 'ヴァルが降り立ったのは、\n小さな農村の入り口だった。\nそこに、老人の人影があらわれる。' },
        { img: 'story_1_2.PNG', text: 'ノア\n「見かけない顔だな。魔王のしもべか……？' },
        { img: 'story_1_3.PNG', text: 'ノア\n「よかろう……！\n　ワシの会得した拳法　“乱打拳”　で\n　今度こそ、返り討ちにしてくれるわ！！！' }
    ],
    ENEMY_02: [
        { img: 'story_2_1.PNG', text: '（仮テキスト・敵02 1/3）二人目の相手が、静かに姿を現す。' },
        { img: 'story_2_2.PNG', text: '（仮テキスト・敵02 2/3）先の戦いとは違う気配を感じる。' },
        { img: 'story_2_3.PNG', text: '（仮テキスト・敵02 3/3）気を引き締め、再びデッキを整える。' }
    ],
    ENEMY_03: [
        { img: 'story_3_1.PNG', text: '（仮テキスト・敵03 1/3）三人目の相手が、行く手に立ちはだかる。' },
        { img: 'story_3_2.PNG', text: '（仮テキスト・敵03 2/3）ここまでの戦いで、確かな手応えを掴んでいる。' },
        { img: 'story_3_3.PNG', text: '（仮テキスト・敵03 3/3）次の一戦に向け、デッキを整える。' }
    ],
    ENEMY_04: [
        { img: 'story_4_1.PNG', text: '（仮テキスト・敵04 1/3）四人目の相手が、行く手を阻む。' },
        { img: 'story_4_2.PNG', text: '（仮テキスト・敵04 2/3）疲れは見せられない。集中を切らさず前へ進む。' },
        { img: 'story_4_3.PNG', text: '（仮テキスト・敵04 3/3）残る力を振り絞り、デッキを整える。' }
    ],
    ENEMY_05: [
        { img: 'story_5_1.PNG', text: '（仮テキスト・敵05 1/3）ついに最後の相手と対峙する。' },
        { img: 'story_5_2.PNG', text: '（仮テキスト・敵05 2/3）ここまでの戦いのすべてが、この一戦に繋がっている。' },
        { img: 'story_5_3.PNG', text: '（仮テキスト・敵05 3/3）最後の力を込め、デッキを整える。' }
    ]
};
// 現在対戦中の敵(state.storyEnemyIndex)に対応する3画面分のストーリーを返す
function currentStoryScreens() {
    const id = ENEMY_ORDER[state.storyEnemyIndex % ENEMY_ORDER.length];
    return STORY_SCREENS_BY_ENEMY[id];
}

let storyToken = 0; // SKIP時に進行中のタイプライター処理を打ち切るためのトークン

// ------- エンディングシーン(5人目撃破後のみ再生): ending_1.PNG〜ending_5.PNG(任意アセット)。プロローグ/ストーリーと同じ仕組みを流用 -------
const ENDING_SCREENS = [
    { img: 'ending_1.PNG', text: '（仮テキスト・エンディング1/5）長かった戦いに、静かな幕が下りようとしていた。' },
    { img: 'ending_2.PNG', text: '（仮テキスト・エンディング2/5）出会った相手たちの顔が、一人また一人と思い出される。' },
    { img: 'ending_3.PNG', text: '（仮テキスト・エンディング3/5）失ったものと、得たもの。その両方が今の自分を作っている。' },
    { img: 'ending_4.PNG', text: '（仮テキスト・エンディング4/5）街には、いつもと変わらない朝が訪れる。' },
    { img: 'ending_5.PNG', text: '（仮テキスト・エンディング5/5）それでも、この手に残った強さだけは、確かなものだった。' }
];



// ------- 汎用アクセサ (P/E共通ロジックで扱うためのヘルパー) -------









// 第7条: idleマーカーの時は player.PNG / player2.PNG を時間で交互に呼吸させる








// バトル開始時だけの演出: 手札を裏向きで配り、左から順にめくって表向きにする





// GO!/CANCELは「バトル準備完了」「解決中でない」「場に1枚以上カードがある」の3条件が揃った時だけ押せる

// ターン終了後、場に出したカードをふわっと浮かせながらフェードアウトさせる

updateUI(); // 第1条: 起動直後から5つの空枠を表示する

// ------- STORY MODE: 敵プリセット(枚数配分・よく出す組み合わせは今後ここに設定していく) -------
// deck: PUNCH/UPPER/GUARDの「出やすさ」の重み(枚数感覚でそのまま指定できる)
// favoritePatterns: よく出す組み合わせ(例: ['GUARD','PUNCH'])。今後ここに配列を追加していく想定。まだ未設定。
const ENEMY_PRESETS = {
    ENEMY_01: { name: 'Noah', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_02: { name: 'Rita', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_03: { name: 'Gald', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_04: { name: 'Jack', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
    ENEMY_05: { name: 'Alv', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, favoritePatterns: [] },
};
const ENEMY_ORDER = ['ENEMY_01', 'ENEMY_02', 'ENEMY_03', 'ENEMY_04', 'ENEMY_05']; // 連戦の順番
const STAGE_ORDINALS = ['1ST', '2ND', '3RD', '4TH', '5TH']; // ENEMY_ORDERのインデックスに対応する序数表記

// 現在のステージ表記(例: '1ST STAGE')を返す。STORY MODEのみ表示し、TRAINING MODEでは空文字を返す(表示箇所ごとに非表示扱いにする)
function currentStageLabel() {
    if (state.gameMode !== 'story') return '';
    const ordinal = STAGE_ORDINALS[state.storyEnemyIndex] || (state.storyEnemyIndex + 1) + 'TH';
    return ordinal + ' STAGE';
}

// ------- シーン管理 (プロローグ → タイトル → バトル) -------






// バトル開始演出: 暗転 → 味方/敵がふわっと表示 → 背景が中心から拡大表示 → BATTLE START(左からディゾルブ→中央停止→拡大しつつ消える)






// ------- HOW TOポップアップ(ブラウザ機能ではなく画面内オーバーレイ) -------




// ------- OPTION画面 -------








// 図鑑(取得アイテムの一覧・ミニストーリー表示)。今後実装予定のプレースホルダー。

// OPTION内のRETRY: このバトル直前のデッキ編成へ戻る(現在のモードを維持)

// OPTION内のRETURN TO TITLE: ロゴシーンまで戻る


// 第3条: 3すくみ判定 P>U, U>G, G>P (プレイヤー視点で 'win'/'lose'/'draw')



// TRAINING MODE: ターン終了時に双方のHPを全回復する(赤バー・黄色バーとも即座に反映)




// 第24条: 双方が残像付きのdash.PNGでX座標を目標地点まで移動する汎用関数







// 決着演出: 体力を0にする最後の一撃を受けた側の専用シーケンス
// 点滅 → ゲーム全体がスローになりつつ軽くバウンドしながら初期位置へ戻る → down.PNGで倒れる → K.O./YOU WIN表示




// 通常のヒット(GUARD/PUNCHが勝った場合)。負けた側だけが振動する。
// 通常のヒット(地上PUNCHが勝った場合)。負けた側だけが振動する。連続でヒットするほどダメージが増加する。


// メテオ(空中3発目)演出


// UPPERが勝った場合の空中コンボ一式


// ガードが成功した時の演出(勝った側はガードのまま反撃、負けた側はしびれる)
// 第3すくみの通り、GUARDに勝てるのはPUNCHのみなので、負けた側は必ずpunch.PNGの姿勢になる


// ピヨり演出: damage.PNGで点滅させつつ、頭上のpiyo.PNGを反転させながら2往復させる


// しびれによる無条件敗北: ピヨり演出のあと、相手が出していた技に応じた通常の勝敗処理をそのまま適用する(3すくみ判定はしない)


// 場(#slots)または敵(#enemySlots)の指定インデックスのカードに勝敗の見た目を付与する







// ============================================================
// セーブ/ロード
// ============================================================
function loadSaveData() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null; // localStorageが使えない環境でも落ちないようにする
    }
}

function writeSaveData(patch) {
    try {
        const current = loadSaveData() || {};
        const merged = Object.assign({}, current, patch);
        localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
    } catch (e) { /* 保存できない環境でも無視する */ }
}

function applySaveDataOnBoot() {
    const save = loadSaveData();
    if (!save) return;
    if (typeof save.storyEnemyIndex === 'number') state.storyEnemyIndex = save.storyEnemyIndex;
    if (save.deckCounts) {
        deckCounts = {
            PUNCH: save.deckCounts.PUNCH ?? deckCounts.PUNCH,
            UPPER: save.deckCounts.UPPER ?? deckCounts.UPPER,
            GUARD: save.deckCounts.GUARD ?? deckCounts.GUARD,
        };
    }
    if (typeof save.soundOn === 'boolean') state.soundOn = save.soundOn;
    if (typeof save.bgmVolume === 'number') state.bgmVolume = save.bgmVolume;
    if (typeof save.seVolume === 'number') state.seVolume = save.seVolume;
    if (Array.isArray(save.unlockedItems)) unlockedItems = save.unlockedItems;
    if (Array.isArray(save.unlockedSubStories)) unlockedSubStories = save.unlockedSubStories;
    if (Array.isArray(save.unlockedSkins)) unlockedSkins = save.unlockedSkins;
    if (typeof save.soundTestUnlocked === 'boolean') soundTestUnlocked = save.soundTestUnlocked;
    if (typeof save.battleSpeedX2 === 'boolean') battleSpeedX2 = save.battleSpeedX2;
    if (save.specialsUsed) {
        specialsUsed = {
            superUpper: !!save.specialsUsed.superUpper,
            charge: !!save.specialsUsed.charge,
            followUp: !!save.specialsUsed.followUp,
            finisher: !!save.specialsUsed.finisher,
            upperGuardUpper: !!save.specialsUsed.upperGuardUpper,
        };
    }
    if (typeof save.selectedSkin === 'string' || save.selectedSkin === null) selectedSkin = save.selectedSkin;
    if (typeof save.gameClearedOnce === 'boolean') gameClearedOnce = save.gameClearedOnce;
    if (typeof save.costumeUnlockAnnounced === 'boolean') costumeUnlockAnnounced = save.costumeUnlockAnnounced;
    if (typeof save.bonusContentsAnnounced === 'boolean') bonusContentsAnnounced = save.bonusContentsAnnounced;
}

// サブストーリーを解除する(ストーリーシーン内の隠しタップから呼ばれる)。既に解除済みなら何もしない。
function unlockSubStory(enemyIdx) {
    if (unlockedSubStories.includes(enemyIdx)) return;
    unlockedSubStories.push(enemyIdx);
    writeSaveData({ unlockedSubStories });
}

// コスチュームを解除する(STORY MODEでノーダメージ撃破した時に呼ばれる)。既に解除済みなら何もしない。
function unlockSkin(skinName) {
    if (unlockedSkins.includes(skinName)) return;
    unlockedSkins.push(skinName);
    writeSaveData({ unlockedSkins });
}

// 必殺技の使用履歴を記録する(バトルをまたいで積み上げる)。4種類すべて使用済みになった時点でSOUND TESTを解除する。
function markSpecialUsed(key) {
    if (specialsUsed[key]) return; // 既に記録済みなら何もしない
    specialsUsed[key] = true;
    writeSaveData({ specialsUsed });
    // SOUND TESTの解放条件はgameClearedOnce(エンディングを迎えてタイトルへ戻る)に一本化した。
    // specialsUsedの記録自体は将来の実績拡張のために引き続き行う。
}

// ============================================================
// デッキ・山札システム
// ============================================================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildDeckArray(counts) {
    const deck = [];
    for (let i = 0; i < counts.PUNCH; i++) deck.push('PUNCH');
    for (let i = 0; i < counts.UPPER; i++) deck.push('UPPER');
    for (let i = 0; i < counts.GUARD; i++) deck.push('GUARD');
    return shuffleArray(deck);
}

function drawCard() {
    // 自動リシャッフルはしない。山が尽きたらnullを返し、その枠は空のまま残す。
    // 山と捨札を実際にリシャッフルするのは runDeckRefresh() のみ(手札・山が共に0になった時の演出内)。
    if (state.playerDeck.length === 0) return null;
    return state.playerDeck.pop();
}

function updateDeckCountDisplay() {
    const el = document.getElementById('deckInfo');
    if (!el) return;
    if (state.gameMode === 'training') {
        el.style.display = 'none'; // TRAINING MODEは山札を使わないため非表示にする
        return;
    }
    el.style.display = '';
    el.innerText = `DECK ${state.playerDeck.length}/${DB.DECK_TOTAL}`;
}

async function runDeckRefresh() {
    const deckEl = document.getElementById('deckInfo');
    const label = document.getElementById('deckRefreshLabel');
    label.classList.add('show');

    for (let i = 0; i < 3; i++) {
        deckEl.style.opacity = '0.15';
        await wait(75); // 倍速(元は150ms)
        deckEl.style.opacity = '1';
        await wait(75); // 倍速(元は150ms)
    }

    // ここで実際に捨札を山へ戻す(配分比率は変わらない)
    state.playerDeck = shuffleArray(state.playerDiscard.slice());
    state.playerDiscard = [];
    const target = state.playerDeck.length;

    const steps = 30;
    const stepMs = 1250 / steps; // 倍速(元は2500ms)
    for (let s = 1; s <= steps; s++) {
        const val = Math.round(target * (s / steps));
        deckEl.innerText = `DECK ${val}/${DB.DECK_TOTAL}`;
        await wait(stepMs);
    }
    deckEl.innerText = `DECK ${target}/${DB.DECK_TOTAL}`;
    label.classList.remove('show');
}

function adjustDeck(type, delta) {
    const next = deckCounts[type] + delta;
    if (next < 0) return;
    const total = deckCounts.PUNCH + deckCounts.UPPER + deckCounts.GUARD - deckCounts[type] + next;
    if (total > DB.DECK_TOTAL) return; // 21枚を超えない
    deckCounts[type] = next;
    updateDeckBuildUI();
}

function updateDeckBuildUI() {
    document.getElementById('deckCountPUNCH').innerText = deckCounts.PUNCH;
    document.getElementById('deckCountUPPER').innerText = deckCounts.UPPER;
    document.getElementById('deckCountGUARD').innerText = deckCounts.GUARD;
    const total = deckCounts.PUNCH + deckCounts.UPPER + deckCounts.GUARD;
    document.getElementById('deckTotalText').innerText = `合計 ${total} / ${DB.DECK_TOTAL}`;
    document.getElementById('deckConfirmBtn').disabled = (total !== DB.DECK_TOTAL);
}

// ============================================================
// アセット読み込み
// ============================================================
function checkAllSettled() {
    if (loadedCount + loadFailed.length === DB.ASSETS.length && bgSettled) {
        if (loadFailed.length > 0) {
            console.error('第12条違反: 以下のアセットが読み込めませんでした →', loadFailed.join(', '));
        }
        battleAssetsReadyFlag = true; // 現状どこからも参照していないが、読み込み状況の把握用に保持しておく
    }
}

function enemySpriteName(baseName) {
    const key = baseName.replace('.PNG', '');
    const enemyName = currentEnemySetName() + '_' + key + '.PNG';
    return imgs[enemyName] ? enemyName : baseName;
}

// プレイヤー側の描画名を解決する。実績で解除したコスチューム(selectedSkin)が選択されていれば、
// 敵専用グラフィックとして読み込み済みの同じ画像セット(例: enemy_3_player.PNG)を流用してプレイヤーの見た目に適用する。
// 未選択、または該当画像が読み込まれていない場合は通常のプレイヤー画像を返す。
function playerSpriteName(baseName) {
    if (!selectedSkin) return baseName;
    const key = baseName.replace('.PNG', '');
    const skinName = selectedSkin + '_' + key + '.PNG';
    return imgs[skinName] ? skinName : baseName;
}

function applyCardVisual(el, type) {
    const fname = type ? CARD_IMG_MAP[type] : null;
    const img = fname ? imgs[fname] : null;
    if (img) {
        el.style.backgroundImage = `url('assets/images/cards/${fname}')`;
        el.innerText = '';
    } else {
        el.style.backgroundImage = 'none';
        el.innerText = type ? type[0] : '';
    }
}

// ------- サウンド(BGM/SE) -------
// BGMはWeb Audio APIでシームレスループ再生する(オンデマンド読み込み、起動をブロックしない)。
// SEは軽量なため起動時にまとめて先読みし、複数の音が重なっても途切れないよう毎回新しい再生ノードを作る。
// ファイルの拡張子はBGM/SEどちらもmp3を基本としつつ、SEはwavで用意される場合もあるため両方を順に試す。
// いずれの拡張子でも見つからない場合は、他の任意アセットと同じくエラーにせず無音のままにする。
const AUDIO_EXTENSIONS = ['mp3', 'wav'];

let audioCtx = null; // 初回再生時に生成する(ブラウザの自動再生制限のため、無音のcontextを先に作らない)
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume(); // iOS Safari等、ユーザー操作後でないと再開しないブラウザ対策
    return audioCtx;
}

// BGM/SEそれぞれ専用のゲインノードを介して出力する(個別に音量調整できるようにするため)
let bgmGainNode = null;
function getBgmGainNode() {
    if (!bgmGainNode) {
        const ctx = getAudioCtx();
        bgmGainNode = ctx.createGain();
        bgmGainNode.gain.value = state.bgmVolume;
        bgmGainNode.connect(ctx.destination);
    }
    return bgmGainNode;
}
let seGainNode = null;
function getSeGainNode() {
    if (!seGainNode) {
        const ctx = getAudioCtx();
        seGainNode = ctx.createGain();
        seGainNode.gain.value = state.seVolume;
        seGainNode.connect(ctx.destination);
    }
    return seGainNode;
}
function setBgmVolume(v) {
    state.bgmVolume = v;
    writeSaveData({ bgmVolume: v });
    if (bgmGainNode) bgmGainNode.gain.value = v;
}
function setSeVolume(v) {
    state.seVolume = v;
    writeSaveData({ seVolume: v });
    if (seGainNode) seGainNode.gain.value = v;
}

// 指定した種別(bgm/se)・名前の音声をfetch+decodeしてAudioBufferとして返す。読み込めなければnull。
async function loadAudioBuffer(kind, name) {
    for (const ext of AUDIO_EXTENSIONS) {
        try {
            const res = await fetch(`assets/audio/${kind}/${name}.${ext}`);
            if (!res.ok) continue;
            const arrayBuffer = await res.arrayBuffer();
            return await getAudioCtx().decodeAudioData(arrayBuffer);
        } catch (e) { /* この拡張子では読み込めなかった。次の拡張子を試す(両方だめなら未配置として扱う) */ }
    }
    return null;
}

let currentBgmSource = null; // 現在再生中のBGMのAudioBufferSourceNode
let currentBgmName = null; // 現在再生中(またはリクエスト中)のBGM名。同一BGMの多重再生防止に使う
const bgmBufferCache = {}; // 一度読み込んだBGMのAudioBufferをキャッシュ(再入場のたびの再読み込みを省く)

// 指定したBGMをシームレスループで再生する。既に同じBGMがリクエスト/再生中なら何もしない。
// state.soundOnがfalseの場合、次にONにした時すぐ再生できるよう読み込みだけ行い、実際の再生はしない。
// 指定したBGMをシームレスループで再生する。既に同じ要求(name)がリクエスト/再生中なら何もしない。
// fallbackNameを指定すると、nameが未配置の場合にそちらを試す(例: ステージ別BGMが無ければ汎用バトルBGMを流す)。
async function playBGM(name, fallbackName) {
    if (currentBgmName === name) return;
    currentBgmName = name;
    stopBGM();

    let buffer = bgmBufferCache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer('bgm', name);
        if (!buffer && fallbackName) {
            buffer = bgmBufferCache[fallbackName];
            if (buffer === undefined) {
                buffer = await loadAudioBuffer('bgm', fallbackName);
                bgmBufferCache[fallbackName] = buffer;
            }
        }
        bgmBufferCache[name] = buffer; // フォールバック後のbufferであっても、nameキーにそのまま紐付けてキャッシュする
    }
    if (currentBgmName !== name) return; // 読み込み中に別のBGM要求へ切り替わっていたら中断
    if (!buffer || !state.soundOn) return;

    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // AudioBufferSourceNodeのloopはサンプル単位でシームレス
    source.connect(getBgmGainNode());
    source.start(0);
    currentBgmSource = source;
}

function stopBGM() {
    if (currentBgmSource) {
        try { currentBgmSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        currentBgmSource.disconnect();
        currentBgmSource = null;
    }
}

const seBufferCache = {}; // SEは軽量なため、一度読み込んだAudioBufferを使い回す
// SEを再生する。state.soundOnがfalseなら何もしない。連打・重なりに対応するため毎回新しい再生ノードを作る。
async function playSE(name) {
    if (!state.soundOn) return;
    let buffer = seBufferCache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer('se', name);
        if (!buffer && name !== 'se_punch') {
            // 素材が未配置でも無音のままだと不安なため、代わりにse_punchを鳴らす(se_punch自体が無ければ無音のまま)
            buffer = seBufferCache['se_punch'];
            if (buffer === undefined) {
                buffer = await loadAudioBuffer('se', 'se_punch');
                seBufferCache['se_punch'] = buffer;
            }
        }
        seBufferCache[name] = buffer; // フォールバック後のbufferであっても、nameキーにそのまま紐付けてキャッシュする
    }
    if (!buffer || !state.soundOn) return; // 読み込み待ちの間にOFFにされた場合も考慮
    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(getSeGainNode());
    source.start(0);
}

// SEは軽量なため起動時にまとめて先読みしておく(初回再生時の遅延をなくす。起動処理自体はブロックしない)
async function preloadSE() {
    const punchBuffer = await loadAudioBuffer('se', 'se_punch');
    seBufferCache['se_punch'] = punchBuffer;
    ['se_guard', 'se_ko', 'se_win', 'se_upper', 'se_meteor', 'se_finisher', 'se_clash_punch', 'se_clash_upper', 'se_clash_guard'].forEach(async name => {
        const buf = await loadAudioBuffer('se', name);
        seBufferCache[name] = buf || punchBuffer; // 未配置ならse_punchで代用(不安な無音を避ける)
    });
}

// スマホブラウザでアプリ/タブをバックグラウンドに回すと、AudioContextが正しく復帰せず音声が壊れてしまう対策。
// バックグラウンドに回った瞬間、実行中の状態だけサウンドをOFFにする(保存設定は変更しない)。
// OPTION画面で手動でONに戻すとsetSound(true)が呼ばれ、ユーザー操作を伴うためAudioContextも正しく再開する。
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.soundOn) {
        state.soundOn = false;
        stopBGM();
    }
});

function boot() {
    // オープニング(ロゴ/プロローグ)〜タイトルはバトル用画像(DB.ASSETS)を使わないため、その読み込み完了を待たずに起動する。
    // バトル用画像は裏で並行して読み込みを続け、バトル開始時には待たない(バトル演出時間そのものを読み込みの猶予にする)。
    // 以下の初期化処理は必ずtry/catchで囲み、万一どこかで予期しない例外が発生しても、
    // NOW LOADING表示だけは確実に解除する(でないと画面が永久に「NOW LOADING」のまま止まってしまうため)。
    try {
        applySaveDataOnBoot(); // 進行状況・デッキ編成・サウンド設定をセーブデータから復元

        // ▼▼▼ 動作確認用の一時デバッグ設定 ▼▼▼
        // 友人テスト用に、エンディングを見なくてもBONUS CONTENTS/SOUND TESTが見られるよう強制的に解放している。
        // あわせて、SUB STORY・COSTUMEも全解放しておく(隠しタップやサブストーリー閲覧を経由しなくても確認できるように)。
        // セーブ済みデータの復元(直前のapplySaveDataOnBoot)より後に上書きすることで、
        // 既存のセーブデータがあっても確実に解放状態になるようにしている。
        // 【本番リリース前に必ずこのブロックを削除すること】
        gameClearedOnce = true;
        unlockedSubStories = [0, 1, 2, 3, 4]; // 5体分すべてのサブストーリーを解放
        unlockedSkins = ['enemy_1', 'enemy_2', 'enemy_3', 'enemy_4', 'enemy_5']; // 5体分すべてのコスチュームを解放
        // ▲▲▲ 動作確認用の一時デバッグ設定 ▲▲▲

        preloadSE(); // SEは軽量なので先読みしておく(起動をブロックしない非同期処理)
        document.getElementById('startBtn').disabled = false;
        document.getElementById('trainingBtn').disabled = false;
        document.getElementById('optionBtn').disabled = false;
        updateTitleContinueVisibility();
        updateSpeedUI(); // セーブデータから復元したbattleSpeedX2をボタン表示に反映する
    } catch (e) {
        console.error('boot()の初期化処理でエラーが発生しましたが、NOW LOADINGは解除して起動を続行します:', e);
    }

    // オープニング〜タイトルの表示に必要な準備がここまでで整ったので、NOW LOADING表示を隠す。
    // 上のtry/catchの外に置くことで、初期化処理の一部が失敗してもここは必ず実行される。
    const nowLoading = document.getElementById('nowLoadingScreen');
    if (nowLoading) {
        nowLoading.style.opacity = '0';
        setTimeout(() => { nowLoading.style.display = 'none'; }, 300);
    }

    try {
        draw();
        playLogo();
    } catch (e) {
        console.error('boot()のdraw/playLogoでエラーが発生しました:', e);
    }
}

// ============================================================
// シーン遷移
// ============================================================
// タイトルのCONTINUEは、セーブデータが存在するだけでは表示しない。
// デッキ編成(deckCounts)やサウンド設定などの保存だけでも「セーブデータの存在」自体は真になってしまうため、
// 実際に敵2以降まで進んだ記録(storyEnemyIndex >= 1)があるかどうかで判定する。
function updateTitleContinueVisibility() {
    const save = loadSaveData();
    const hasStoryProgress = !!save && typeof save.storyEnemyIndex === 'number' && save.storyEnemyIndex >= 1;
    document.getElementById('titleContinueBtn').style.display = hasStoryProgress ? 'block' : 'none';
}

async function playLogo() {
    const myToken = ++logoTokenCounter;
    const content = document.getElementById('logoContent');
    content.style.transition = 'none';
    content.style.opacity = '0';
    await wait(30);
    if (logoTokenCounter !== myToken) return;

    content.style.transition = 'opacity 1s ease-in';
    content.style.opacity = '1';
    await wait(1000);
    if (logoTokenCounter !== myToken) return;

    await wait(2000); // 表示を2秒キープ
    if (logoTokenCounter !== myToken) return;

    content.style.transition = 'opacity 1s ease-out';
    content.style.opacity = '0';
    await wait(1000);
    if (logoTokenCounter !== myToken) return;

    goProloguePlay();
}

function skipLogo() {
    logoTokenCounter++; // 進行中のplayLogoのawaitループを無効化する
    goProloguePlay();
}

function goLogo() {
    hideResult();
    showScene('logo');
    playLogo();
}

function goProloguePlay() {
    showScene('prologue');
    playPrologue();
}

function skipPrologue() {
    prologueToken++; // 進行中のawaitループを無効化する
    goTitle();
}

async function playPrologue() {
    playBGM('bgm_prologue');
    const myToken = ++prologueToken;
    const content = document.getElementById('prologueContent');
    const imgArea = document.getElementById('prologueImgArea');
    const fallback = document.getElementById('prologueImgFallback');
    const textEl = document.getElementById('prologueText');

    // 再生開始時は必ず真っ黒(透明)にリセットしてからフェードインする
    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    await loadCutsceneScreens(OPENING_SCREENS, 'opening'); // 表示を始める前に4画面分の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)
    if (prologueToken !== myToken) return; // 読み込み待ちの間にSKIPされていたら中断

    for (let i = 0; i < OPENING_SCREENS.length; i++) {
        const screen = OPENING_SCREENS[i];
        if (prologueToken !== myToken) return; // SKIPされていたら中断

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/opening/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める
            await wait(30); // 直前のopacity:0が確実に描画されてから遷移を開始させる
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            if (prologueToken !== myToken) return;
            textEl.innerText += screen.text[c];
            await wait(45); // 1文字ずつ表示するスピード
        }

        if (prologueToken !== myToken) return;
        await wait(2000); // 1ページ読み終えてから次の画面まで、もう少し長めに読ませる
    }

    if (prologueToken !== myToken) return;
    goTitle(); // 4画面すべて終わったらSKIPしなくても自動でタイトルへ
}

let storyTapResolve = null; // タップ待ち中のPromiseのresolve関数(待っていない時はnull)

// storyContentタップ時に呼ばれる。タップ待ち中なら、待機しているplayStorySequence()を1つだけ先に進める
function onStoryTap() {
    if (storyTapResolve) { storyTapResolve(); storyTapResolve = null; }
}

// ストーリーシーン内の隠しタップゾーンをタップした時に呼ばれる。現在再生中の敵に対応するサブストーリーを解除する。
// 既に解除済みの場合は何も表示しない(何度タップしても無害)。
function onStoryHiddenTap() {
    const idx = state.storyEnemyIndex;
    const alreadyUnlocked = unlockedSubStories.includes(idx);
    unlockSubStory(idx);
    if (!alreadyUnlocked) {
        const sub = SUBSTORY_BY_ENEMY[ENEMY_ORDER[idx]];
        showUnlockToast({ small: `SUB STORY ${idx + 1}`, large: sub.title });
    }
}

// 実績解除時の簡易トースト表示(数秒でフェードアウトする)
// 実績解除風の通知(画面上部から弾むようにスライドイン→少し待ってスライドアウト)。
// 複数の通知が同時に発生してもキューに積んで順番に表示する(上書きしない)。
let unlockToastQueue = [];
let unlockToastBusy = false;
function showUnlockToast(message) {
    unlockToastQueue.push(message);
    processUnlockToastQueue();
}
async function processUnlockToastQueue() {
    if (unlockToastBusy || unlockToastQueue.length === 0) return;
    unlockToastBusy = true;
    const message = unlockToastQueue.shift();

    let toast = document.getElementById('unlockToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'unlockToast';
        // top はセーフエリア(iPhoneのDynamic Island/ノッチ等)の分だけ下げておく。
        // ホーム画面追加→ウェブアプリとして起動した場合、ブラウザのアドレスバー等の余白が無くなり画面いっぱいに表示されるため、
        // 通常のSafari表示では気にならなくても、ウェブアプリ表示だとこの余白を入れないとDynamic Islandと重なってしまう。
        toast.style.cssText = 'position:fixed; left:50%; top:env(safe-area-inset-top, 0px); transform:translateX(-50%) translateY(-120%);'
            + 'background:linear-gradient(135deg, #1a1a1a, #2a2a2a); color:#ffd23c;'
            + 'border:2px solid #ffd23c; border-top:none; border-radius:0 0 10px 10px;'
            + 'padding:12px 28px; font-size:14px; font-weight:900; letter-spacing:1px; text-align:center;'
            + 'z-index:9999; pointer-events:none; box-shadow:0 4px 20px rgba(0,0,0,0.6); white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '<span style="font-size:10px; letter-spacing:3px; color:#888; display:block;">UNLOCKED</span>'
        + (typeof message === 'string'
            ? message // 従来通りの単一行表示(BONUS CONTENTS解放！等)
            : `<span style="font-size:12px; display:block;">${message.small}</span><span style="font-size:19px; display:block; margin-top:2px;">${message.large}</span>`); // SUB STORY解放時: 番号(小)+タイトル(大)の2段階表示

    toast.style.transition = 'none';
    toast.style.transform = 'translateX(-50%) translateY(-120%)';
    await wait(30); // 直前のtransform:noneが確実に描画されてからアニメーションを開始させる
    toast.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'; // 少し弾むスライドイン(コンシューマーゲームの実績解除風)
    toast.style.transform = 'translateX(-50%) translateY(0)';
    await wait(2200);
    toast.style.transition = 'transform 0.4s ease-in';
    toast.style.transform = 'translateX(-50%) translateY(-120%)';
    await wait(450);

    unlockToastBusy = false;
    processUnlockToastQueue(); // 次に積まれた通知があれば続けて表示する
}

// タップされるまで待機するPromiseを返す
function waitForStoryTap() {
    return new Promise(resolve => { storyTapResolve = resolve; });
}

function goStoryThenDeck() {
    showScene('story');
    playStorySequence();
}

function skipStorySequence() {
    storyToken++; // 進行中のawaitループを無効化する
    if (storyTapResolve) { storyTapResolve(); storyTapResolve = null; } // タップ待ちで止まっていれば解除する(でないとトークン確認まで到達できない)
    goDeckBuild('story');
}

async function playStorySequence() {
    // これから戦う敵のグラフィックセット・背景をこの時点で先読み開始する(ストーリー閲覧〜デッキ編成までの時間を読み込みの猶予にするため)
    const storyStageNum = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1;
    loadEnemySet('enemy_' + storyStageNum);
    loadStageBackground(storyStageNum === 1 ? 'bg.PNG' : `bg_${storyStageNum}.PNG`);

    playBGM('bgm_story'); // ストーリーシーンは敵によらず共通のBGMを流す
    const myToken = ++storyToken;
    const content = document.getElementById('storyContent');
    const imgArea = document.getElementById('storyImgArea');
    const fallback = document.getElementById('storyImgFallback');
    const textEl = document.getElementById('storyText');

    // 再生開始時は必ず真っ黒(透明)にリセットしてからフェードインする
    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    const screens = currentStoryScreens(); // 現在の敵(state.storyEnemyIndex)に対応する3画面
    await loadCutsceneScreens(screens, 'story'); // 表示を始める前に3画面分の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)
    if (storyToken !== myToken) return; // 読み込み待ちの間にSKIPされていたら中断

    for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        if (storyToken !== myToken) return; // SKIPされていたら中断

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/story/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }
        // 隠しタップは3画面のうち対象の1枚だけで有効にする(敵ごとに違う画面。それ以外の画面では押せないようにする)
        const hiddenTapScreenIdx = STORY_HIDDEN_TAP_SCREEN_BY_ENEMY[ENEMY_ORDER[state.storyEnemyIndex]] ?? 1;
        const hiddenTapEl = document.getElementById('storyHiddenTap');
        hiddenTapEl.style.display = (i === hiddenTapScreenIdx) ? '' : 'none';
        if (i === hiddenTapScreenIdx) {
            // 敵ごとに指定された中心座標(%)に、判定用の矩形(幅20%×高さ20%)の中心を合わせる
            const pos = STORY_HIDDEN_TAP_POS_BY_ENEMY[ENEMY_ORDER[state.storyEnemyIndex]] || STORY_HIDDEN_TAP_DEFAULT_POS;
            hiddenTapEl.style.left = (pos.x - 10) + '%';
            hiddenTapEl.style.top = (pos.y - 10) + '%';
        }

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める
            await wait(30); // 直前のopacity:0が確実に描画されてから遷移を開始させる
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            if (storyToken !== myToken) return;
            textEl.innerText += screen.text[c];
            await wait(45); // 1文字ずつ表示するスピード
        }

        if (storyToken !== myToken) return;
        // オープニング(プロローグ)とは異なり、ストーリーシーンは自動送りにしない。
        // 戦いのヒントになる会話のため、プレイヤーが自分のペースで読めるよう画面タップで次へ進める(SKIPは従来通り別途利用可能)。
        await waitForStoryTap();
        if (storyToken !== myToken) return; // タップ待ち中にSKIPされていた場合はここで中断する
    }

    if (storyToken !== myToken) return;
    goDeckBuild('story'); // 3画面すべて終わったらデッキ編成へ
}

// エンディング5画面を再生する(スキップ不可。5人目撃破後の専用演出のため)
async function playEndingSequence() {
    playBGM('bgm_ending');
    const content = document.getElementById('endingContent');
    const imgArea = document.getElementById('endingImgArea');
    const fallback = document.getElementById('endingImgFallback');
    const textEl = document.getElementById('endingText');

    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    await loadCutsceneScreens(ENDING_SCREENS, 'ending'); // 表示を始める前に5画面分の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)

    for (let i = 0; i < ENDING_SCREENS.length; i++) {
        const screen = ENDING_SCREENS[i];

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/ending/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める(プロローグ/ストーリーと同じ仕様)
            await wait(30);
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            textEl.innerText += screen.text[c];
            await wait(45);
        }

        await wait(2000);
    }

    // 5画面すべて表示し終えたら、フェードアウトして暗転する
    content.style.transition = 'opacity 1.5s ease-out';
    content.style.opacity = '0';
    await wait(1500);
}

// エンドロール(下から上へスクロールするクレジット表示)を再生する。CSS側のtransition時間(14s)と合わせて待機する
async function playCredits() {
    const CREDITS_SCROLL_MS = 14000;
    showScene('credits');
    const scroll = document.getElementById('creditsScroll');
    scroll.classList.remove('roll');
    void scroll.offsetWidth; // 強制リフロー(アニメーションを確実に最初から再生させるため)
    await wait(30);
    scroll.classList.add('roll');
    await wait(CREDITS_SCROLL_MS);
}

// FIN画面(真っ黒な背景の中央に白文字)を10秒間表示し、その後ゆっくりフェードアウトする
async function playFinScreen() {
    const finScene = document.getElementById('sceneFin');
    finScene.style.transition = 'none';
    finScene.style.opacity = '1';
    showScene('fin');
    await wait(10000);
    finScene.style.transition = 'opacity 2s ease-out';
    finScene.style.opacity = '0';
    await wait(2000);
}

// 5人目(最終)撃破時の専用シーケンス: YOU WINの余韻を5秒→エンディング5画面→エンドロール→FIN.→タイトルへ自動的に戻る
// この間、storyEnemyIndexは進めない(advanceToNextEnemyを呼ばない)ため、タイトルのCONTINUEは5人目と戦う前の状態のまま残る
async function runFinalVictorySequence() {
    await wait(5000);
    hideResult();
    showScene('ending');
    await playEndingSequence();
    await playCredits();
    await playFinScreen();
    goTitle();
}

function showScene(name) {
    document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
    document.getElementById('scene' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
}

function goPrologue() { hideResult(); showScene('prologue'); playPrologue(); }

// タイトル画面に戻るたびに呼ぶ。新たに解放された(かつ未通知の)ものがあれば、スライド通知で知らせる
function checkUnlockAnnouncements() {
    if ((unlockedSubStories.length > 0 || gameClearedOnce || soundTestUnlocked) && !bonusContentsAnnounced) {
        bonusContentsAnnounced = true;
        writeSaveData({ bonusContentsAnnounced: true });
        showUnlockToast('BONUS CONTENTS 解放！');
    }
    if (unlockedSkins.length > 0 && gameClearedOnce && !costumeUnlockAnnounced) {
        costumeUnlockAnnounced = true;
        writeSaveData({ costumeUnlockAnnounced: true });
        showUnlockToast('COSTUME 解放！');
    }
}

// タイトルロゴの合流演出(左右から残像が中央へ合わさり、フラッシュしてくっきりロゴが完成する)。
// スキップ手段があるため、タイトルに戻るたびに毎回再生する。
let titleLogoAnimToken = 0;
async function playTitleLogoIntro() {
    const img = document.getElementById('titleLogoImg');
    if (!img || img.style.display === 'none') return; // 画像未配置(フォールバック文字表示)の場合はアニメーションしない

    const myToken = ++titleLogoAnimToken;
    const echoL = document.getElementById('titleLogoEchoL');
    const echoR = document.getElementById('titleLogoEchoR');
    const flash = document.getElementById('titleLogoFlash');
    if (echoL.style.display === 'none' || echoR.style.display === 'none') { img.style.opacity = '1'; return; }

    // 初期状態: 何も見えない(ロゴ・残像・フラッシュすべて透明)
    img.style.transition = 'none'; img.style.opacity = '0';
    echoL.style.transition = 'none'; echoR.style.transition = 'none';
    echoL.style.opacity = '0'; echoR.style.opacity = '0';
    echoL.style.transform = 'translateX(-160%)';
    echoR.style.transform = 'translateX(160%)';
    flash.style.transition = 'none'; flash.style.opacity = '0';
    flash.style.width = '20px'; flash.style.height = '20px';
    await wait(200); // 何も無い状態を少し見せる(1.5倍速: 300ms→200ms)

    if (titleLogoAnimToken !== myToken) return;
    // 左右の残像が中央へ向かって合流していく(1.5倍速: 2200ms→1467ms)
    echoL.style.transition = 'transform 1467ms ease-in, opacity 1467ms ease-in';
    echoR.style.transition = 'transform 1467ms ease-in, opacity 1467ms ease-in';
    echoL.style.opacity = '1'; echoR.style.opacity = '1';
    echoL.style.transform = 'translateX(0)';
    echoR.style.transform = 'translateX(0)';
    await wait(1467);
    if (titleLogoAnimToken !== myToken) return;

    // 合流の瞬間、ピカーンとフラッシュしてくっきりしたロゴを表示する(1.5倍速: 120ms→80ms、480ms→320ms)
    echoL.style.transition = 'opacity 80ms'; echoR.style.transition = 'opacity 80ms';
    echoL.style.opacity = '0'; echoR.style.opacity = '0';
    flash.style.opacity = '1';
    await wait(20); // 直前のスタイルが確実に描画されてからフラッシュの拡大を開始させる
    if (titleLogoAnimToken !== myToken) return;
    flash.style.transition = 'width 320ms ease-out, height 320ms ease-out, opacity 320ms ease-out';
    flash.style.width = '900px'; flash.style.height = '900px'; flash.style.opacity = '0';
    img.style.transition = 'opacity 200ms';
    img.style.opacity = '1';
    await wait(320);
}
// アニメーション中に画面をタップすると、即座にくっきりしたロゴ表示まで進める
function skipTitleLogoIntro() {
    titleLogoAnimToken++; // 進行中のアニメーションを中断させる
    const img = document.getElementById('titleLogoImg');
    const echoL = document.getElementById('titleLogoEchoL');
    const echoR = document.getElementById('titleLogoEchoR');
    const flash = document.getElementById('titleLogoFlash');
    if (!img) return;
    if (echoL) { echoL.style.transition = 'none'; echoL.style.opacity = '0'; }
    if (echoR) { echoR.style.transition = 'none'; echoR.style.opacity = '0'; }
    if (flash) { flash.style.transition = 'none'; flash.style.opacity = '0'; }
    img.style.transition = 'none';
    img.style.opacity = '1';
}

function goTitle() {
    showScene('title');
    updateTitleContinueVisibility();
    playBGM('bgm_title');
    updateBonusContentsUI();
    checkUnlockAnnouncements();
    playTitleLogoIntro();
}

// NEW GAME: 今回のプレイのstoryEnemyIndexだけを0にする(セーブデータ側は書き換えない)。
// こうすることで、誤ってNEW GAMEを押してしまっても、既存の進行状況(敵2以降まで到達したセーブ)は消えずに残る。
// セーブデータのstoryEnemyIndexが実際に更新されるのは、勝利してadvanceToNextEnemy()が呼ばれた時のみ。
function goNewGame() {
    state.storyEnemyIndex = 0;
    goStoryThenDeck();
}

// CONTINUE: ストーリー導入は省略し、保存済みの進行状況のまま直接デッキ編成へ
function goContinueGame() {
    goDeckBuild('story');
}

// 決着画面(YOU WIN)のNEXT BATTLEから呼ばれる: 次の敵へ進めてから、その敵のストーリーシーン(3画面)を経てデッキ編成へ遷移する
function goNextEnemy() {
    advanceToNextEnemy();
    goStoryThenDeck();
}

function goDeckBuild(mode) {
    // 明示的に指定があればそのモードへ、無ければ直近のモード(CONTINUE/RETRY用)、それも無ければstory
    state.pendingMode = mode || state.gameMode || 'story';
    // storyEnemyIndexはここではリセットしない(セーブされた進行状況を引き継ぐ)。
    // 最初からやり直したい場合はタイトルのOPTION画面から明示的にリセットする。
    updateDeckBuildUI();
    showScene('deck');
}

// TRAINING MODE専用: デッキ編成を経由せず、タイトルから直接バトルへ入る(手札は固定のPUNCH/UPPER/GUARD、選び放題)。
// デッキ編成を使わないため、goBattleStartと異なりdeckCountsのセーブ書き込みは行わない。
function goTrainingBattle() {
    state.pendingMode = 'training';
    loadEnemySet('training'); // TRAINING MODE用グラフィックの先読み(既に読み込み済み/読み込み中なら何もしない)
    loadStageBackground('bg_training.PNG');
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle');
}

function tapFlickerThen(el, callback) {
    el.classList.remove('tap-flicker');
    void el.offsetWidth; // 連打時もアニメーションを確実に再生させるための強制リフロー
    el.classList.add('tap-flicker');

    let done = false;
    const finish = () => {
        if (done) return; // animationendとフォールバックの二重発火を防ぐ
        done = true;
        el.classList.remove('tap-flicker'); // 点滅を完全に終わらせてから
        callback(); // 画面遷移する
    };
    el.addEventListener('animationend', finish, { once: true }); // 本当にアニメーションが終わった瞬間に発火
    setTimeout(finish, 500); // 保険(animationendが発火しない環境向けのフォールバック)
}

// ============================================================
// 描画・スプライト管理
// ============================================================
function setAct(side, v) { if (side === 'P') state.pAct = v; else state.eAct = v; }

function getX(side) { return side === 'P' ? state.pX : state.eX; }
function getY(side) { return side === 'P' ? state.pY : state.eY; }

function setX(side, v) { if (side === 'P') state.pX = v; else state.eX = v; }

function setY(side, v) { if (side === 'P') state.pY = v; else state.eY = v; }

function triggerShake(side, ms) { const until = performance.now() + ms; if (side === 'P') state.pShakeUntil = until; else state.eShakeUntil = until; }

function triggerBlink(side, ms) { const until = performance.now() + ms; if (side === 'P') state.pBlinkUntil = until; else state.eBlinkUntil = until; }

function nextPunchSprite(side) {
    const key = side === 'P' ? 'pLastAtk' : 'eLastAtk';
    state[key] = state[key] === 'punch.PNG' ? 'punch2.PNG' : 'punch.PNG'; // 第21条
    return state[key];
}

function moveSprite(move) {
    if (move === 'GUARD') return 'guard.PNG';
    if (move === 'UPPER') return 'upper.PNG';
    return 'punch.PNG';
}

function breathSprite(t) {
    return (Math.floor(t / DB.BREATH_MS) % 2 === 0) ? 'player.PNG' : 'player2.PNG';
}

function spriteFor(act, t) {
    return act === 'IDLE' ? breathSprite(t) : act;
}

function toIdle() {
    // しびれている側はIDLE(呼吸)へ戻さず、damage.PNGでの被弾/ピヨり姿勢を維持する
    if (!state.pNumbed) state.pAct = 'IDLE';
    if (!state.eNumbed) state.eAct = 'IDLE';
}
// ピヨり演出の開始/終了。以後は draw() が state.piyoSide を見て継続的に描画し続ける(固定時間の演出ではない)
function startPiyo(side) { state.piyoSide = side; }
function stopPiyo() { state.piyoSide = null; }

// COMBOカウンターの描画。2以上のみ表示し、以下の演出を重ねる:
// ・増えた瞬間: 軽く上へポップする(sinカーブで跳ねて戻る)
// ・途切れた瞬間: 直前の値を保持したまま短時間でフッとフェードアウトする
// ・5/10/15到達時: 一瞬だけ膨らみながら金色に光るきらびやかな強調演出
// COMBOは斜体、数字はCOMBOよりやや大きいフォントサイズで、同じ斜体にする。
function drawComboCounter(side, anchorX, align) {
    const p = side === 'P';
    const combo = state[p ? 'pHitCombo' : 'eHitCombo'];
    const dispValue = state[p ? 'pHitComboDisplayValue' : 'eHitComboDisplayValue'];
    const fadeStart = state[p ? 'pHitComboFadeStartAt' : 'eHitComboFadeStartAt'];
    const popAt = state[p ? 'pHitComboPopAt' : 'eHitComboPopAt'];
    const milestoneAt = state[p ? 'pHitComboMilestoneAt' : 'eHitComboMilestoneAt'];
    const bigMilestoneAt = state[p ? 'pHitComboBigMilestoneAt' : 'eHitComboBigMilestoneAt'];
    const now = performance.now();

    let opacity, showValue;
    const FADE_MS = 450;
    if (combo >= 2) {
        opacity = 1;
        showValue = combo;
    } else if (fadeStart > 0) {
        const elapsed = now - fadeStart;
        if (elapsed >= FADE_MS) return; // フェードアウト完了、表示しない
        opacity = 1 - (elapsed / FADE_MS);
        showValue = dispValue;
    } else {
        return; // 2未満・フェード中でもない = 非表示
    }

    // ポップ演出(増えた瞬間、軽く跳ねる)
    const POP_MS = 220;
    let popOffsetY = 0, popScale = 1;
    const popElapsed = now - popAt;
    if (popElapsed >= 0 && popElapsed < POP_MS) {
        const pt = popElapsed / POP_MS;
        popOffsetY = -Math.sin(pt * Math.PI) * 10;
        popScale = 1 + Math.sin(pt * Math.PI) * 0.25;
    }

    // 5到達時のみ、一時的なきらびやか(金色)強調演出
    const MILESTONE_MS = 700;
    const milestoneElapsed = now - milestoneAt;
    const isSmallMilestoneActive = milestoneElapsed >= 0 && milestoneElapsed < MILESTONE_MS;
    let milestoneScale = 1, milestoneGlow = 0;
    if (isSmallMilestoneActive) {
        const mt = milestoneElapsed / MILESTONE_MS;
        milestoneScale = 1 + Math.sin(mt * Math.PI) * 0.6;
        milestoneGlow = Math.sin(mt * Math.PI);
    }

    // 10以上は常時きらびやか(金色、ゆっくり明滅する光)
    const isAlwaysSparkly = showValue >= 10;
    const sparklyPulse = isAlwaysSparkly ? (0.6 + Math.sin(now / 220) * 0.4) : 0; // 0.2〜1.0でゆっくり明滅

    // 15,20,25…(5の倍数、15以上)到達時、さらに大きく赤い特別演出を一時的に重ねる
    const BIG_MILESTONE_MS = 850;
    const bigMilestoneElapsed = now - bigMilestoneAt;
    const isBigMilestoneActive = bigMilestoneElapsed >= 0 && bigMilestoneElapsed < BIG_MILESTONE_MS;
    let bigMilestoneScale = 1, bigMilestoneGlow = 0;
    if (isBigMilestoneActive) {
        const bt = bigMilestoneElapsed / BIG_MILESTONE_MS;
        bigMilestoneScale = 1 + Math.sin(bt * Math.PI) * 1.1; // 通常のマイルストーンよりさらに大きく膨らむ
        bigMilestoneGlow = Math.sin(bt * Math.PI);
    }

    const comboFontSize = 18, numberFontSize = 26;
    let color = '#fff';
    if (isBigMilestoneActive) color = '#ff3b3b';
    else if (isSmallMilestoneActive || isAlwaysSparkly) color = '#ffd23c';

    const totalScale = popScale * (isBigMilestoneActive ? bigMilestoneScale : milestoneScale);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(anchorX, 46 + popOffsetY);
    ctx.scale(totalScale, totalScale);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    if (isBigMilestoneActive) {
        ctx.shadowColor = 'rgba(255,59,59,0.95)';
        ctx.shadowBlur = 20 * bigMilestoneGlow;
    } else if (isSmallMilestoneActive) {
        ctx.shadowColor = 'rgba(255,210,60,0.9)';
        ctx.shadowBlur = 16 * milestoneGlow;
    } else if (isAlwaysSparkly) {
        ctx.shadowColor = 'rgba(255,210,60,0.9)';
        ctx.shadowBlur = 6 + 10 * sparklyPulse;
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 4;
    }

    const comboText = 'COMBO';
    const numberText = String(showValue);
    ctx.font = `italic 900 ${comboFontSize}px sans-serif`;
    const comboWidth = ctx.measureText(comboText).width;
    ctx.font = `italic 900 ${numberFontSize}px sans-serif`;
    const numberWidth = ctx.measureText(numberText).width;
    const gap = 6;
    const totalWidth = comboWidth + gap + numberWidth;
    const startX = align === 'left' ? 0 : -totalWidth; // 右揃えの場合、全体をtotalWidth分左へオフセットする

    ctx.font = `italic 900 ${comboFontSize}px sans-serif`;
    ctx.fillText(comboText, startX, 0);
    ctx.font = `italic 900 ${numberFontSize}px sans-serif`;
    ctx.fillText(numberText, startX + comboWidth + gap, 4); // 数字が大きい分、ベースラインを少し下げて視覚的に揃える

    ctx.restore();
}

function draw(tRaw) {
    const t = tRaw || performance.now();
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // 背景: キャラと同じ nearest-neighbor 拡大で描画。中心から広がる円形クリップで演出する。
    // TRAINING MODE、またはSTORY MODEの現在の敵に応じた背景(currentBgName)を使う。未読み込みなら1stステージのbg.PNGへフォールバックする。
    if (state.bgRevealRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cvs.width / 2, cvs.height / 2, state.bgRevealRadius, 0, Math.PI * 2);
        ctx.clip();
        const bgImg = imgs[currentBgName()];
        if (bgImg) {
            // 画像の実サイズに関わらず、canvas比率(960:560=12:7)ぶんだけ横幅いっぱいを使い、上側から切り取って描画する。
            // 例: 96x96で作られた背景でも、上側の96x56相当だけが使われる(下側は切り捨てられる)。
            const srcW = bgImg.naturalWidth || bgImg.width;
            const srcH = bgImg.naturalHeight || bgImg.height;
            const targetAspect = cvs.width / cvs.height; // 960/560
            const cropH = Math.min(srcH, srcW / targetAspect);
            ctx.drawImage(bgImg, 0, 0, srcW, cropH, 0, 0, cvs.width, cvs.height);
        } else {
            ctx.fillStyle = '#8fe0f0'; // bg.PNGが読み込めない場合の水色フォールバック
            ctx.fillRect(0, 0, cvs.width, cvs.height);
        }
        ctx.restore();
    }

    // 残像(第24条、およびPUNCH+PUNCH+UPPERの強さ演出)を先に描画。
    // 各残像は個別に寿命(life)・スプライト(sprite)・最大不透明度(maxAlpha)を持てる。省略時は従来のdash残像と同じ既定値になる。
    trails = trails.filter(tr => (t - tr.born) < (tr.life || 220));
    trails.forEach(tr => {
        const life = tr.life || 220;
        const maxAlpha = tr.maxAlpha != null ? tr.maxAlpha : 0.35;
        const age = t - tr.born;
        const alpha = maxAlpha * (1 - age / life);
        const spriteName = tr.sprite || 'dash.PNG';
        const img = imgs[tr.side === 'E' ? enemySpriteName(spriteName) : playerSpriteName(spriteName)];
        if (!img || alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (tr.side === 'E') {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -tr.x - DB.IMG_SIZE, tr.y, DB.IMG_SIZE, DB.IMG_SIZE);
        } else {
            ctx.drawImage(img, tr.x, tr.y, DB.IMG_SIZE, DB.IMG_SIZE);
        }
        ctx.restore();
    });

    // プレイヤー(振動・点滅対応)
    const pJit = t < state.pShakeUntil ? (Math.random() * 6 - 3) : 0;
    const pBlinkA = t < state.pBlinkUntil ? ((Math.floor((state.pBlinkUntil - t) / 80) % 2 === 0) ? 1 : 0.25) : 1;
    const pAlpha = pBlinkA * state.introCharAlpha;
    const pImg = imgs[playerSpriteName(spriteFor(state.pAct, t))];
    ctx.save();
    ctx.globalAlpha = pAlpha;
    const pGlowPulse = (Math.sin(t / 180) + 1) / 2; // 0〜1でゆっくり明滅
    if (state.pUpperChargeReady && pImg) {
        // UPPER+GUARD+UPPER用のチャージ: 水色の発光(ガード+ガードの金色とは別の色で見分けられるようにする)
        ctx.save();
        ctx.shadowColor = 'rgba(80, 220, 255, 0.95)';
        ctx.shadowBlur = 14 + pGlowPulse * 16;
        ctx.drawImage(pImg, state.pX + pJit, state.pY + pJit, DB.IMG_SIZE, DB.IMG_SIZE);
        ctx.restore();
    }
    if (state.pChargeValue > 0) { // ガード2連続成功以降のチャージ中は金色に発光する(次のコマンドまで持続)
        if (state.pChargeValue >= 4 && pImg) {
            // 3連続以降(4倍)は、外側に白いオーラをもう一段重ねて2倍と明確に区別する
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 36 + pGlowPulse * 20;
            ctx.drawImage(pImg, state.pX + pJit, state.pY + pJit, DB.IMG_SIZE, DB.IMG_SIZE);
            ctx.restore();
        }
        ctx.shadowColor = 'rgba(255, 215, 60, 0.95)';
        ctx.shadowBlur = 14 + pGlowPulse * 16;
    }
    if (pImg) ctx.drawImage(pImg, state.pX + pJit, state.pY + pJit, DB.IMG_SIZE, DB.IMG_SIZE);
    else { ctx.fillStyle = '#0f0'; ctx.fillRect(state.pX, state.pY, DB.IMG_SIZE, DB.IMG_SIZE); }
    ctx.restore();

    // 敵(振動・点滅・反転対応)
    const eJit = t < state.eShakeUntil ? (Math.random() * 6 - 3) : 0;
    const eBlinkA = t < state.eBlinkUntil ? ((Math.floor((state.eBlinkUntil - t) / 80) % 2 === 0) ? 1 : 0.25) : 1;
    const eAlpha = eBlinkA * state.introEnemyAlpha;
    const eImg = imgs[enemySpriteName(spriteFor(state.eAct, t))];
    ctx.save();
    ctx.globalAlpha = eAlpha;
    const eGlowPulse = (Math.sin(t / 180) + 1) / 2;
    if (state.eUpperChargeReady && eImg) {
        // UPPER+GUARD+UPPER用のチャージ: 水色の発光
        ctx.save();
        ctx.scale(-1, 1);
        ctx.shadowColor = 'rgba(80, 220, 255, 0.95)';
        ctx.shadowBlur = 14 + eGlowPulse * 16;
        ctx.drawImage(eImg, -(state.eX + eJit) - DB.IMG_SIZE, state.eY + eJit, DB.IMG_SIZE, DB.IMG_SIZE);
        ctx.restore();
    }
    if (state.eChargeValue > 0) { // ガード2連続成功以降のチャージ中は金色に発光する(次のコマンドまで持続)
        if (state.eChargeValue >= 4 && eImg) {
            // 3連続以降(4倍)は、外側に白いオーラをもう一段重ねて2倍と明確に区別する
            ctx.save();
            ctx.scale(-1, 1);
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 36 + eGlowPulse * 20;
            ctx.drawImage(eImg, -(state.eX + eJit) - DB.IMG_SIZE, state.eY + eJit, DB.IMG_SIZE, DB.IMG_SIZE);
            ctx.restore();
        }
        ctx.shadowColor = 'rgba(255, 215, 60, 0.95)';
        ctx.shadowBlur = 14 + eGlowPulse * 16;
    }
    if (eImg) {
        ctx.save(); ctx.scale(-1, 1); // 第19条: 敵は常に反転
        ctx.drawImage(eImg, -(state.eX + eJit) - DB.IMG_SIZE, state.eY + eJit, DB.IMG_SIZE, DB.IMG_SIZE);
        ctx.restore();
    } else { ctx.fillStyle = '#f00'; ctx.fillRect(state.eX, state.eY, DB.IMG_SIZE, DB.IMG_SIZE); }
    ctx.restore();

    // ピヨり演出: しびれている側の頭上にpiyo.PNGを表示(反転を交互に切り替える)。
    // state.piyoSideがtruthyな間はずっと表示し続ける(開始/終了は startPiyo/stopPiyo が担う)。反転は経過時間から計算する。
    // piyo.PNGは実ファイルが32x32pxで、実際に使う絵柄は左上を基準にした横21px×縦9pxの範囲のみ
    if (state.piyoSide) {
        const piyoImg = imgs['piyo.PNG'];
        if (piyoImg) {
            const SRC_X = 6, SRC_Y = 0, SRC_W = 20, SRC_H = 9; // 元画像内での切り出し範囲(上・横中央寄せ)
            const baseX = state.piyoSide === 'P' ? state.pX : state.eX;
            const baseY = state.piyoSide === 'P' ? state.pY : state.eY;
            const pw = SRC_W * DB.SCALE, ph = SRC_H * DB.SCALE;
            const px = baseX + (DB.IMG_SIZE - pw) / 2;
            const py = baseY - ph - 10;
            const piyoFlipNow = Math.floor(t / 180) % 2 === 1; // 180msごとに反転
            ctx.save();
            if (piyoFlipNow) {
                ctx.translate(px + pw, py);
                ctx.scale(-1, 1);
                ctx.drawImage(piyoImg, SRC_X, SRC_Y, SRC_W, SRC_H, 0, 0, pw, ph);
            } else {
                ctx.drawImage(piyoImg, SRC_X, SRC_Y, SRC_W, SRC_H, px, py, pw, ph);
            }
            ctx.restore();
        }
    }

    // COMBOカウンター(第26条とは別の演出用記録。バトル背景の左上=味方、右上=敵)。2以上のみ表示し、
    // 増えた瞬間に軽くポップ、途切れるとフッとフェードアウトし、5/10/15到達時はきらびやかに強調する。
    drawComboCounter('P', 24, 'left');
    drawComboCounter('E', cvs.width - 24, 'right');

    // 画面全体を白く明滅させる演出(5THステージの敵登場等で使用)。他の描画すべての最後に重ねる
    if (state.screenFlashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = state.screenFlashAlpha;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.restore();
    }

    requestAnimationFrame(draw);
}

// ============================================================
// 手札UI・敵AI
// ============================================================
function playCard(handIdx) {
    if (state.resolving || !state.battleReady) return;
    const card = state.playerHand[handIdx];
    if (!card) return;
    const slotIdx = state.hands.indexOf(null);
    if (slotIdx === -1) return; // 場(5枠)がすでに埋まっている
    state.hands[slotIdx] = card;
    if (state.gameMode !== 'training') state.playerHand[handIdx] = null; // TRAINING MODEは選び放題のため手札から取り除かない
    updateHandUI();
    updateUI();
}

function resetHands() {
    if (state.resolving || !state.battleReady) return;
    // 場に出したカードを手札の空きへ戻す
    state.hands.forEach(card => {
        if (!card) return;
        const emptyIdx = state.playerHand.indexOf(null);
        if (emptyIdx !== -1) state.playerHand[emptyIdx] = card;
    });
    state.hands = new Array(5).fill(null);
    updateHandUI();
    updateUI();
}

async function dealInitialHandAnimation() {
    const s = document.getElementById('handRow'); s.innerHTML = '';
    const n = state.playerHand.length; // STORY MODEは5、TRAINING MODEは3(PUNCH/UPPER/GUARD固定)
    const mid = (n - 1) / 2;
    const GAP_X = 48; // updateHandUI()と同じ配置計算に合わせる
    const ARC_K = 4;
    const cardEls = [];

    // 1. まず裏向きで、画面下からふわっと配られる(枚数はplayerHandの実際の長さに従う)
    state.playerHand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = 'card card-back';
        const offset = idx - mid;
        const ty = offset * offset * ARC_K;
        const tx = offset * GAP_X;
        const angle = offset * 9;
        d.dataset.tx = tx;
        d.dataset.angle = angle;
        if (imgs[CARD_BACK_IMG]) d.style.backgroundImage = `url('assets/images/cards/${CARD_BACK_IMG}')`;
        d.style.top = ty + 'px';
        d.style.transition = 'none';
        d.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(50px) rotate(${angle}deg)`;
        d.style.opacity = '0';
        s.appendChild(d);
        cardEls.push(d);
    });

    await wait(30);
    cardEls.forEach(d => {
        d.style.transition = 'transform 0.35s ease-out, opacity 0.3s ease-out';
        d.style.transform = `translateX(calc(-50% + ${d.dataset.tx}px)) rotate(${d.dataset.angle}deg)`;
        d.style.opacity = '1';
    });
    await wait(450); // 配り終わるまで待つ

    // 2. 左から順に、1枚ずつめくって表向きにする(速度2倍)
    for (let idx = 0; idx < cardEls.length; idx++) {
        const d = cardEls[idx];
        const tx = d.dataset.tx, angle = d.dataset.angle;
        d.style.transition = 'transform 0.08s ease-in';
        d.style.transform = `translateX(calc(-50% + ${tx}px)) rotate(${angle}deg) scaleX(0)`;
        await wait(80);

        d.className = 'card ' + (state.playerHand[idx] ? 'filled' : 'empty');
        applyCardVisual(d, state.playerHand[idx]);
        if (state.playerHand[idx]) d.onclick = () => playCard(idx);
        d.style.transition = 'transform 0.08s ease-out';
        d.style.transform = `translateX(calc(-50% + ${tx}px)) rotate(${angle}deg) scaleX(1)`;
        await wait(110); // 次のカードがめくれるまでの間隔
    }
}

function updateHandUI(animateIndices) {
    animateIndices = animateIndices || [];
    const s = document.getElementById('handRow'); s.innerHTML = '';
    const n = state.playerHand.length; // STORY MODEは5、TRAINING MODEは3(PUNCH/UPPER/GUARD固定・選び放題)
    const mid = (n - 1) / 2; // 中央インデックス
    const GAP_X = 48; // カード中心同士の横間隔(px)
    const ARC_K = 4;  // 円弧の深さ係数(大きいほど外側が下がる)
    state.playerHand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = 'card ' + (card ? 'filled' : 'empty');
        applyCardVisual(d, card); // card_p/u/G.PNGがあれば画像、無ければP/U/Gの文字

        const offset = idx - mid; // -2, -1, 0, 1, 2
        // 高さ(top)は放物線(offset^2)で決める。中心=0が最も高く(top最小)、外側ほどなだらかに下がる。
        // これはCSSレイアウト上のtop値なので、rotateの角度に一切影響されない。
        const ty = offset * offset * ARC_K; // 0, 4, 16
        const tx = offset * GAP_X; // 横方向の間隔(中心からの距離)
        const angle = offset * 9; // deg (外側ほど上が外向きに傾く。見た目の傾きのみ)
        d.style.top = ty + 'px';
        if (card) d.onclick = () => playCard(idx);

        const finalTransform = `translateX(calc(-50% + ${tx}px)) rotate(${angle}deg)`;
        if (animateIndices.includes(idx)) {
            // 補充されたカードは画面下から少し回転しながら手札へ滑り込む
            const fromAngle = angle + (offset >= 0 ? 20 : -20);
            d.style.transition = 'none';
            d.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(90px) rotate(${fromAngle}deg)`;
            d.style.opacity = '0';
            s.appendChild(d);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    d.style.transition = 'transform 0.35s ease-out, opacity 0.3s ease-out';
                    d.style.transform = finalTransform;
                    d.style.opacity = '1';
                });
            });
        } else {
            d.style.transform = finalTransform;
            s.appendChild(d);
        }
    });
}

function filledCount() {
    const idx = state.hands.indexOf(null);
    return idx === -1 ? state.hands.length : idx;
}

function updateUI(activeIndex) {
    const s = document.getElementById('slots'); s.innerHTML = '';
    state.hands.forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot ' + (h ? 'filled' : 'empty');
        if (idx === activeIndex) cls += ' active-card';
        if (cardOutcomes.P[idx]) cls += ' ' + cardOutcomes.P[idx]; // ターン中の勝敗表現を保持
        d.className = cls;
        applyCardVisual(d, h);
        s.appendChild(d);
    });
    updateActionButtons();
}

function updateActionButtons() {
    const enabled = state.battleReady && !state.resolving && filledCount() > 0;
    document.getElementById('goBtn').disabled = !enabled;
    document.getElementById('clrBtn').disabled = !enabled;
}

async function fadeOutQueueCards() {
    const cards = document.querySelectorAll('#slots .slot.filled');
    if (cards.length === 0) return;
    cards.forEach(el => {
        el.style.transition = 'opacity 0.45s ease-out, transform 0.45s ease-out';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-16px) scale(1.06)'; // ふわっと浮きながら消える
    });
    await wait(450);
}

function currentEnemyPreset() {
    const id = ENEMY_ORDER[state.storyEnemyIndex % ENEMY_ORDER.length];
    return ENEMY_PRESETS[id];
}

// HPバー下の名前表示を更新する。味方は固定でVAL、敵はSTORY MODEなら現在の敵プリセット名、
// TRAINING MODEなら固定でENEMY(STORY MODEは今後の連戦で敵が変わるたびに自動で切り替わる)
function updateCharNames() {
    document.getElementById('playerName').innerText = 'VAL';
    document.getElementById('enemyName').innerText =
        state.gameMode === 'training' ? 'ENEMY' : currentEnemyPreset().name;
}

// 連戦で次の敵へ進む(YOU WIN時、決着画面のNEXT BATTLEからgoNextEnemy経由で呼ばれる)
function advanceToNextEnemy() {
    state.storyEnemyIndex = (state.storyEnemyIndex + 1) % ENEMY_ORDER.length;
    writeSaveData({ storyEnemyIndex: state.storyEnemyIndex }); // 進行状況を保存
}

function weightedRandomMove(weights) {
    const total = weights.PUNCH + weights.UPPER + weights.GUARD;
    let r = Math.random() * total;
    if (r < weights.PUNCH) return 'PUNCH';
    r -= weights.PUNCH;
    if (r < weights.UPPER) return 'UPPER';
    return 'GUARD';
}

// TRAINING MODE: プレイヤーが出した技に、必ず負ける技を返す(PUNCHにはUPPER、UPPERにはGUARD、GUARDにはPUNCH)。
// judge()の3すくみ関係(beats)と同じ対応表を使う。これにより、何を出しても必ず勝てる。
const TRAINING_LOSES_TO = { PUNCH: 'UPPER', UPPER: 'GUARD', GUARD: 'PUNCH' };
function trainingCounterMove(playerMove) {
    return TRAINING_LOSES_TO[playerMove];
}

function generateEnemyTurnHand(count) {
    // STORY MODE: 現在の敵プリセットの配分に基づいて生成する(favoritePatternsは今後ここに組み込む)
    const weights = currentEnemyPreset().deck;
    const arr = [];
    for (let i = 0; i < count; i++) arr.push(weightedRandomMove(weights));
    return arr;
}

function drawEnemySlots(activeIndex) {
    // 第2条: 公開済み(enemyRevealedUpTo)の枚数までは中身を見せ、それ以降は伏せ札(?)にする
    const s = document.getElementById('enemySlots'); s.innerHTML = '';
    state.enemyHands.forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot filled';
        if (idx === activeIndex) cls += ' active-card';
        if (cardOutcomes.E[idx]) cls += ' ' + cardOutcomes.E[idx]; // ターン中の勝敗表現を保持
        d.className = cls;
        if (idx < state.enemyRevealedUpTo) {
            applyCardVisual(d, h);
        } else {
            d.style.backgroundImage = 'none';
            d.innerText = '?';
        }
        s.appendChild(d);
    });
}

// ============================================================
// バトル進行
// ============================================================
function goBattleStart() {
    writeSaveData({ deckCounts: { PUNCH: deckCounts.PUNCH, UPPER: deckCounts.UPPER, GUARD: deckCounts.GUARD } }); // デッキ編成を保存
    // CONTINUE等、playStorySequenceを経由しない経路もあるため、ここでも念のため先読みを開始する(既に読み込み済み/読み込み中なら何もしない)
    const battleStageNum = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1;
    loadEnemySet('enemy_' + battleStageNum);
    loadStageBackground(battleStageNum === 1 ? 'bg.PNG' : `bg_${battleStageNum}.PNG`);
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    // STORY MODEはステージ(敵)ごとに異なるBGMを流す。未配置の場合は汎用のbgm_battleへフォールバックする
    playBGM('bgm_battle_' + (state.storyEnemyIndex + 1), 'bgm_battle');
}

function resetBattleState() {
    // 第13条: state自体は再定義せず、プロパティのみ初期値に戻す
    state.hpP = 100; state.hpE = 100;
    state.turn = 0;
    state.hands = new Array(5).fill(null);
    state.pX = DB.POS.P_HOME_X; state.eX = DB.POS.E_HOME_X;
    state.pY = DB.POS.GROUND_Y; state.eY = DB.POS.GROUND_Y;
    state.pAct = 'IDLE'; state.eAct = 'IDLE';
    state.pShakeUntil = 0; state.eShakeUntil = 0;
    state.pBlinkUntil = 0; state.eBlinkUntil = 0;
    state.pLastAtk = null; state.eLastAtk = null;
    state.pNumbed = false;
    state.eNumbed = false;
    state.piyoSide = null;
    state.pPunchStreak = 0;
    state.ePunchStreak = 0;
    state.pGuardStreak = 0;
    state.eGuardStreak = 0;
    state.pChargeValue = 0;
    state.eChargeValue = 0;
    state.pUpperChargeReady = false;
    state.eUpperChargeReady = false;
    state.pLastWinWasUpper = false;
    state.eLastWinWasUpper = false;
    state.skipNextReposition = false;
    state.pComboType = null; state.eComboType = null;
    state.pComboStart = -1; state.eComboStart = -1;
    state.pComboAlive = false; state.eComboAlive = false;
    state.pHitCombo = 0; state.eHitCombo = 0;
    state.pHitComboEverBroken = false; state.eHitComboEverBroken = false;
    state.pHitComboDisplayValue = 0; state.eHitComboDisplayValue = 0;
    state.pHitComboFadeStartAt = 0; state.eHitComboFadeStartAt = 0;
    state.pHitComboPopAt = 0; state.eHitComboPopAt = 0;
    state.pHitComboMilestoneAt = 0; state.eHitComboMilestoneAt = 0;
    state.pHitComboBigMilestoneAt = 0; state.eHitComboBigMilestoneAt = 0;
    updateSpeedUI(); // バトル操作列のSPEEDボタンの表示(解放状態・▶︎/▶︎▶︎)をここで同期する
    state.lastExchangeResult = null;
    state.finisherAlreadyDown = false;
    state.pGuardHoldPose = false;
    state.eGuardHoldPose = false;
    state.gameMode = state.pendingMode || 'story'; // デッキ編成画面へ来た時に選んだモードを確定
    updateCharNames(); // 味方=VAL(固定)、敵=STORY MODEなら現在の敵プリセット名、TRAINING MODEならENEMY
    state.introCharAlpha = 0; // 開始演出でふわっと表示するため、まずは透明から
    state.introEnemyAlpha = 0; // 敵も同様、まずは透明から(ステージ固有演出の場合は別タイミングで表示する)
    state.screenFlashAlpha = 0;
    state.bgRevealRadius = 0; // 背景も真っ暗な状態からスタート
    state.battleReady = false; // 開始演出が終わるまで操作不可
    state.resolving = false;
    trails = [];
    cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) };

    // デッキ編成画面で決めた配分から山札を構築し、初期手札5枚を引く。
    // TRAINING MODEのみ、山札を使わず固定でPUNCH/UPPER/GUARDの3枚を手札にする(タップしても減らない=選び放題)。
    if (state.gameMode === 'training') {
        state.playerDeck = [];
        state.playerDiscard = [];
        state.playerHand = ['PUNCH', 'UPPER', 'GUARD'];
    } else {
        state.playerDeck = buildDeckArray(deckCounts);
        state.playerDiscard = [];
        state.playerHand = new Array(5).fill(null);
        for (let i = 0; i < 5; i++) state.playerHand[i] = drawCard();
    }

    document.getElementById('hpP').style.width = '100%';
    document.getElementById('hpP_y').style.width = '100%';
    document.getElementById('hpE').style.width = '100%';
    document.getElementById('hpE_y').style.width = '100%';
    document.getElementById('turnDisplay').innerHTML = `TURN<br>0<br><span id="turnStageLabel">${currentStageLabel()}</span>`;
    document.querySelectorAll('.controls button').forEach(b => b.disabled = true); // 演出完了までは操作不可
    document.getElementById('howToBtn').disabled = false; // HOW TOは常に押せる
    document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様
    document.getElementById('speedToggleBtn').disabled = false; // SPEEDも同様
    const bst = document.getElementById('battleStartText');
    bst.classList.remove('enter', 'exit');
    hideResult();
    updateUI();
    document.getElementById('handRow').innerHTML = ''; // 手札はBATTLE START後にdealInitialHandAnimation()で配る
    updateDeckCountDisplay();

    // 敵の手はターンごとに(必要枚数だけ)生成する。開始時点では空。
    // TRAINING MODEは、GO!を押した時点でプレイヤーの手に応じて必ず負ける手を生成する(resolveTurn内)。
    state.enemyHands = [];
    state.enemyRevealedUpTo = 0;
    drawEnemySlots();
}

async function playBattleIntro() {
    await wait(300); // 真っ暗な状態を一瞬見せる

    // ステージ固有の敵登場演出(STORY MODEの2ND/4TH/5THステージのみ)。該当する場合、敵は背景表示後に個別の演出で登場する。
    const specialStage = state.gameMode === 'story' ? state.storyEnemyIndex : -1; // 0=1st,1=2nd,2=3rd,3=4th,4=5th
    const enemyEntersWithPlayer = !(specialStage === 1 || specialStage === 3 || specialStage === 4);

    // 味方は常にふわっとフェードイン。敵は、ステージ固有演出が無い場合のみ味方と同時にフェードインする。
    const fadeSteps = 10;
    for (let s = 1; s <= fadeSteps; s++) {
        state.introCharAlpha = s / fadeSteps;
        if (enemyEntersWithPlayer) state.introEnemyAlpha = s / fadeSteps;
        await wait(50);
    }
    state.introCharAlpha = 1;
    if (enemyEntersWithPlayer) state.introEnemyAlpha = 1;
    await wait(200);

    // 背景が中心から広がるように表示される(canvas上を円形クリップで拡大)
    const maxRadius = Math.hypot(cvs.width / 2, cvs.height / 2) + 20; // 対角線の半分+余裕分で確実に全面を覆う
    const revealSteps = 16;
    for (let s = 1; s <= revealSteps; s++) {
        state.bgRevealRadius = maxRadius * (s / revealSteps);
        await wait(1300 / revealSteps);
    }
    state.bgRevealRadius = maxRadius;

    // ステージ固有の敵登場演出: 背景が表示された後、敵だけを個別の方法で定位置へ登場させる
    if (specialStage === 1) {
        // 2ND STAGE: 画面右外からdash.PNGの姿勢で定位置へ(残像付き、通常のdash移動よりゆっくり)
        state.eY = DB.POS.GROUND_Y;
        state.eX = cvs.width + DB.IMG_SIZE; // 画面右外
        state.introEnemyAlpha = 1; // dash移動なのでフェードではなく最初から見えている
        setAct('E', 'dash.PNG');
        const steps = 22, stepMs = 40;
        const fromX = state.eX, toX = DB.POS.E_HOME_X;
        for (let s = 1; s <= steps; s++) {
            setX('E', fromX + (toX - fromX) * (s / steps));
            trails.push({ side: 'E', x: state.eX, y: state.eY, born: performance.now() });
            await wait(stepMs);
        }
        setX('E', toX);
        setAct('E', 'IDLE'); // dash完了後は通常の待機姿勢に戻す
        await wait(200);
    } else if (specialStage === 3) {
        // 4TH STAGE: 空中コンボで打ち上げられたくらいの高さ(FLOAT_Y)から、フェードインしながら等速でゆっくり降りてくる(重力による加速はさせない)
        state.eX = DB.POS.E_HOME_X;
        state.eY = DB.POS.FLOAT_Y;
        state.introEnemyAlpha = 0; // ふわっと現れるようフェードインさせる
        const steps = 20, stepMs = 45;
        const fromY = state.eY, toY = DB.POS.GROUND_Y;
        for (let s = 1; s <= steps; s++) {
            const dt = s / steps;
            setY('E', fromY + (toY - fromY) * dt); // 等速(線形)でゆっくり降りてくる。加速させない
            state.introEnemyAlpha = dt; // 降りてくると同時にフェードインする
            await wait(stepMs);
        }
        setY('E', toY);
        state.introEnemyAlpha = 1;
        await wait(200);
    } else if (specialStage === 4) {
        // 5TH STAGE: 画面が白く4回明滅→0.5秒待機→もう一度4回明滅→明滅が終わった直後、定位置へじわっとフェードイン
        state.eX = DB.POS.E_HOME_X;
        state.eY = DB.POS.GROUND_Y;
        state.introEnemyAlpha = 0; // フェードインするまでは見せない
        for (let i = 0; i < 4; i++) {
            state.screenFlashAlpha = 0.9;
            await wait(70);
            state.screenFlashAlpha = 0;
            await wait(70);
        }
        await wait(500);
        for (let i = 0; i < 4; i++) {
            state.screenFlashAlpha = 0.9;
            await wait(70);
            state.screenFlashAlpha = 0;
            await wait(70);
        }
        // 2度目の明滅が終わった直後、じわっと定位置にフェードインする
        const fadeSteps = 14, fadeStepMs = 40;
        for (let s = 1; s <= fadeSteps; s++) {
            state.introEnemyAlpha = s / fadeSteps;
            await wait(fadeStepMs);
        }
        state.introEnemyAlpha = 1;
        await wait(200);
    }

    // BATTLE START: 左からディゾルブして中央で停止(STORY MODEのみ、上の行にステージ表記を添える)
    document.getElementById('battleStageLabel').innerText = currentStageLabel();
    const bst = document.getElementById('battleStartText');
    bst.classList.add('enter');
    await wait(650);
    await wait(450); // 中央で少し静止

    // 拡大しながら消える
    bst.classList.add('exit');
    await wait(550);
    bst.classList.remove('enter', 'exit');

    await dealInitialHandAnimation(); // 手札を裏向きで配り、左から順にめくる(バトル開始時だけの演出)

    state.battleReady = true;
    updateActionButtons();
}

function showResult(type) {
    // 5人目(最終)の敵をYOU WINで倒した場合のみ、通常の決着画面ではなく専用のエンディング演出に分岐する
    const isFinalVictory = (type !== 'KO') && (state.storyEnemyIndex === ENEMY_ORDER.length - 1);
    if (isFinalVictory && !gameClearedOnce) {
        gameClearedOnce = true; // COSTUME解放条件の一部。実際のポップアップ通知はエンディング終了後のタイトル画面で行う
        writeSaveData({ gameClearedOnce: true });
    }

    document.getElementById('resultText').innerText = type === 'KO' ? 'K.O.' : 'YOU WIN';

    // 決着音・決着BGM: K.O.は効果音のみでバトルBGMを止め、YOU WINは効果音と共に勝利BGMへ切り替える
    if (type === 'KO') {
        playSE('se_ko');
        stopBGM();
    } else {
        playSE('se_win');
        playBGM('bgm_victory');
    }

    // 最初から最後まで一度もCOMBOが途切れずに勝利した場合、YOU WINの上に「COMBO PERFECT!!」を表示する(実績の解除自体はここでは行わない)
    const isPerfect = type !== 'KO' && state.gameMode === 'story' && !state.pHitComboEverBroken;
    document.getElementById('resultPerfectText').style.display = isPerfect ? '' : 'none';

    const continueBtn = document.getElementById('continueBtn');
    const backTitleBtn = document.getElementById('backTitleBtn');

    if (isFinalVictory) {
        // ボタンは表示せず、YOU WINの余韻を見せた後、自動でエンディングへ遷移する(runFinalVictorySequence内で5秒待機)
        continueBtn.style.display = 'none';
        backTitleBtn.style.display = 'none';
        document.getElementById('resultOverlay').classList.add('show');
        runFinalVictorySequence();
        return;
    }

    // K.O.(敗北)・YOU WIN(勝利、最終戦以外)いずれもボタン(id: continueBtn)を表示するが、ラベルと遷移先が異なる。
    // K.O.時は「CONTINUE」表記で直前のデッキ編成へ(同じ敵と再戦)、YOU WIN時は「NEXT BATTLE」表記で次の敵へ進めてからストーリーシーンを経てデッキ編成へ遷移する。
    continueBtn.style.display = 'inline-block';
    backTitleBtn.style.display = 'inline-block';
    continueBtn.innerText = (type === 'KO') ? 'CONTINUE' : 'NEXT BATTLE';
    continueBtn.onclick = (type === 'KO') ? (() => goDeckBuild()) : goNextEnemy;
    document.getElementById('resultOverlay').classList.add('show');
}

function hideResult() {
    document.getElementById('resultOverlay').classList.remove('show');
}

function judge(p, e) {
    if (p === e) return 'draw';
    const beats = { PUNCH: 'UPPER', UPPER: 'GUARD', GUARD: 'PUNCH' };
    return beats[p] === e ? 'win' : 'lose';
}

// ガード2連続成功によるチャージが、指定した攻撃側(side)のこの攻防で有効かどうかの倍率(1または2)を返す。
// resolveExchangeの冒頭で、次に出すカードが確定した時点で1回だけ決定される(勝敗に関わらず消費済み)。
function chargeMultOf(side) {
    const v = side === 'P' ? state.pChargeValue : state.eChargeValue;
    return v || 1; // チャージが無ければ等倍
}

// チャージを消費する(ガード成功以外の攻防終了時に呼ぶ)。勝敗に関わらず、次に出したカードで必ず消費される。
function consumeCharge(side) {
    if (side === 'P') state.pChargeValue = 0; else state.eChargeValue = 0;
}

// UPPER→GUARDの連続で発動するチャージ(次に出すカードがUPPERの時だけ有効)を消費する。
// 通常のチャージ(consumeCharge)と同じく、勝敗に関わらず次に出したカードで必ず消費される。
function consumeUpperCharge(side) {
    if (side === 'P') state.pUpperChargeReady = false; else state.eUpperChargeReady = false;
}

function applyDamage(target, amount) {
    if (target === 'E') {
        state.hpE = Math.max(0, state.hpE - amount);
        document.getElementById('hpE').style.width = state.hpE + '%';
        setTimeout(() => { document.getElementById('hpE_y').style.width = state.hpE + '%'; }, 0); // 第17条
    } else {
        state.hpP = Math.max(0, state.hpP - amount);
        document.getElementById('hpP').style.width = state.hpP + '%';
        setTimeout(() => { document.getElementById('hpP_y').style.width = state.hpP + '%'; }, 0);
    }
    triggerBlink(target, 180); // どんなダメージでも、受けた側を一瞬点滅させる
}

function healBothToFull() {
    state.hpP = 100; state.hpE = 100;
    document.getElementById('hpP').style.width = '100%';
    document.getElementById('hpP_y').style.width = '100%';
    document.getElementById('hpE').style.width = '100%';
    document.getElementById('hpE_y').style.width = '100%';
}

// バトル中(GO!を押してからターン解決が終わるまで、state.resolvingがtrueの間)のみ、2倍速設定を反映する。
// プロローグ/ストーリー/タイトル演出等、バトル以外のシーンはこの関数を使っていても速度が変わらない。
function wait(ms) {
    const scaledMs = (battleSpeedX2 && state.resolving) ? ms / 2 : ms;
    return new Promise(r => setTimeout(r, scaledMs));
}

// 第24条: 双方が残像付きのdash.PNGでX座標を目標地点まで移動する汎用関数。
// ただしピヨり中(state.piyoSide)の側は、次のコマンドが始まるまでその場に留まり、dashで動かない(位置・残像とも据え置き)。
async function moveBothX(pTo, eTo, steps = 6, stepMs = 40) {
    const pFrozen = state.piyoSide === 'P';
    const eFrozen = state.piyoSide === 'E';
    // ガード成功後、相手がしびれている間は構え(guard.PNG)を維持し、dash.PNGへ上書きしない
    if (!pFrozen && !state.pGuardHoldPose) state.pAct = 'dash.PNG';
    if (!eFrozen && !state.eGuardHoldPose) state.eAct = 'dash.PNG';
    const pFrom = state.pX, eFrom = state.eX;
    for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        if (!pFrozen) state.pX = pFrom + (pTo - pFrom) * t;
        if (!eFrozen) state.eX = eFrom + (eTo - eFrom) * t;
        if (!pFrozen) trails.push({ side: 'P', x: state.pX, y: state.pY, born: performance.now() });
        if (!eFrozen) trails.push({ side: 'E', x: state.eX, y: state.eY, born: performance.now() });
        await wait(stepMs);
    }
}

async function approachCenter() { await moveBothX(DB.POS.P_ATTACK_X, DB.POS.E_ATTACK_X); }

async function retreatSlightly() { await moveBothX(DB.POS.P_RETREAT_X, DB.POS.E_RETREAT_X, 4, 35); }

// 指定した片側だけを、現在位置から目標X座標までアニメーション付きで後退させる(相手側は動かさない)。
// 地上パンチの連続ヒットで威力が増していく演出(2発目=少し後退、3発目=ホーム位置まで後退)に使う。
async function knockbackTo(side, targetX) {
    const steps = 5, stepMs = 30;
    const fromX = getX(side);
    for (let s = 1; s <= steps; s++) {
        setX(side, fromX + (targetX - fromX) * (s / steps));
        await wait(stepMs);
    }
    setX(side, targetX);
}

async function goHome() { await moveBothX(DB.POS.P_HOME_X, DB.POS.E_HOME_X); }

// 第5条: 着地同期。現在の高さ(通常/PUNCH+PUNCH+UPPERどちらでも実際のYを起点にする)から
// 地面まで、固定ステップ数・固定所要時間でアニメーションさせる。高い位置からでも同じ時間で降りるため、
// 見た目の落下速度は距離に応じて自然に速くなる(間延びしない)。
async function waitBothLanded() {
    const steps = 6, stepMs = 30;
    const pFromY = state.pY, eFromY = state.eY;
    for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        state.pY = pFromY + (DB.POS.GROUND_Y - pFromY) * t;
        state.eY = eFromY + (DB.POS.GROUND_Y - eFromY) * t;
        await wait(stepMs);
    }
    state.pY = DB.POS.GROUND_Y;
    state.eY = DB.POS.GROUND_Y;
    await wait(50);
}

// 決着演出: 体力を0にする最後の一撃を受けた側の専用シーケンス。
// 必殺技(GUARD+PUNCH+GUARD+PUNCH+PUNCH)でK.O.した場合(state.finisherAlreadyDown)は、
// 画面端で既にdown.PNGになっているため、通常のホーム帰還バウンド演出は行わずそのまま結果表示へ進む。
async function runFinishSequence(loserSide) {
    if (state.finisherAlreadyDown) {
        await wait(700);
        showResult(loserSide === 'P' ? 'KO' : 'WIN');
        return;
    }

    setAct(loserSide, 'damage.PNG');
    triggerBlink(loserSide, 1300);
    triggerShake(loserSide, 400);
    await wait(900); // 一呼吸置いて余韻を出す

    const homeX = loserSide === 'P' ? DB.POS.P_HOME_X : DB.POS.E_HOME_X;
    const fromX = getX(loserSide);
    const bounceSteps = 10;
    for (let s = 1; s <= bounceSteps; s++) {
        const t = s / bounceSteps;
        setX(loserSide, fromX + (homeX - fromX) * t);
        const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 18 * (1 - t); // 減衰する軽いバウンド
        setY(loserSide, DB.POS.GROUND_Y - bounce);
        await wait(140); // スローモーション気味に間隔を長く取る
    }
    setX(loserSide, homeX);
    setY(loserSide, DB.POS.GROUND_Y);
    setAct(loserSide, 'down.PNG');
    await wait(700);

    showResult(loserSide === 'P' ? 'KO' : 'WIN');
}

function nextQueuedMove(side, cursor) {
    const idx = cursor.i + 1;
    return side === 'P' ? state.hands[idx] : state.enemyHands[idx];
}

// 地上の連続パンチも、空中コンボと同様にpunch.PNG/punch2.PNGを交互に使う(第21条)。
// 本関数はPUNCH勝利時のみ呼ばれる想定だが、念のためPUNCH以外はmoveSpriteにフォールバックする。
// COMBOカウンター: 連続成功回数を1増やす。GUARD成功・空中コンボの各撃・メテオ・追撃・必殺技のいずれも、
// 成功する技すべてで呼ぶ(第26条: このCOMBO表示はダメージ計算等のゲームロジックに一切影響しない、純粋な演出用の記録)。
function hitComboSuccess(side) {
    const comboKey = side === 'P' ? 'pHitCombo' : 'eHitCombo';
    const dispKey = side === 'P' ? 'pHitComboDisplayValue' : 'eHitComboDisplayValue';
    const fadeKey = side === 'P' ? 'pHitComboFadeStartAt' : 'eHitComboFadeStartAt';
    const popKey = side === 'P' ? 'pHitComboPopAt' : 'eHitComboPopAt';
    const milestoneKey = side === 'P' ? 'pHitComboMilestoneAt' : 'eHitComboMilestoneAt';
    const bigMilestoneKey = side === 'P' ? 'pHitComboBigMilestoneAt' : 'eHitComboBigMilestoneAt';
    // TRAINING MODEはコンボが延々と続いてしまうため、前回既に100へ到達していた場合はここで0に戻してから数える
    // (100到達時点の表示はそのまま見せ、次に成功した瞬間からコンボ1で自然に再スタートする)
    if (state.gameMode === 'training' && state[comboKey] >= 100) {
        state[comboKey] = 0;
    }
    state[comboKey]++;
    state[dispKey] = state[comboKey];
    state[fadeKey] = 0; // フェードアウト中だった場合は打ち切り、表示を継続する
    state[popKey] = performance.now();
    if (state[comboKey] === 5) {
        state[milestoneKey] = performance.now(); // 5到達時のみ、一時的なきらびやか強調演出を出す(10以降は常時きらびやかになるため不要)
    }
    if (state[comboKey] >= 15 && state[comboKey] % 5 === 0) {
        state[bigMilestoneKey] = performance.now(); // 15,20,25…(5の倍数)到達時、さらに大きく赤い特別演出を追加で出す
    }
}
// COMBOカウンター: 連続成功が途切れた(負けた、または相討ちだった)ことを記録する。
// 表示中(2以上)だった場合は、直前の値を保持したままフェードアウトを開始する(「フッと消す」演出)。
function hitComboBreak(side) {
    const comboKey = side === 'P' ? 'pHitCombo' : 'eHitCombo';
    const fadeKey = side === 'P' ? 'pHitComboFadeStartAt' : 'eHitComboFadeStartAt';
    const everBrokenKey = side === 'P' ? 'pHitComboEverBroken' : 'eHitComboEverBroken';
    if (state[comboKey] >= 2 && state[fadeKey] === 0) {
        state[fadeKey] = performance.now();
    }
    state[everBrokenKey] = true; // COMBO PERFECT判定用: このバトル中に一度でも途切れたことを記録する
    state[comboKey] = 0;
}

async function runNormalHit(winner, loser, move) {
    hitComboSuccess(winner);
    hitComboBreak(loser);
    setAct(winner, move === 'PUNCH' ? nextPunchSprite(winner) : moveSprite(move));
    setAct(loser, 'damage.PNG');
    const winnerStreakKey = winner === 'P' ? 'pPunchStreak' : 'ePunchStreak';
    const loserStreakKey = loser === 'P' ? 'pPunchStreak' : 'ePunchStreak';
    const cyclePos = state[winnerStreakKey] % 3; // 0=1発目, 1=2発目, 2=3発目(この後4発目で0に戻る)
    const dmg = (DB.DMG.P + cyclePos * DB.DMG.P_COMBO_STEP) * chargeMultOf(winner); // 3発周期で増加、チャージ中は2倍/4倍
    state[winnerStreakKey]++; // 命中したので連続記録を伸ばす
    state[loserStreakKey] = 0; // 負けた側の連続記録は途切れる
    state.pGuardStreak = 0; state.eGuardStreak = 0; // ガード以外で勝敗が決したのでガード連続記録は途切れる
    consumeCharge(winner); consumeCharge(loser); // ガード勝利以外なので、双方のチャージをここで消費する
    consumeUpperCharge(winner); consumeUpperCharge(loser); // UPPER+GUARD+UPPER用のチャージも同様に消費する
    state.pLastWinWasUpper = false; state.eLastWinWasUpper = false; // このPUNCH勝利はUPPER勝利ではないため、連続検知用フラグをリセットする
    applyDamage(loser, dmg);
    triggerShake(loser, 350); // 第8条: 負けた側のみ振動
    if (move === 'PUNCH') playSE('se_punch');

    // 威力が増していく演出: 2発目は少し後退、3発目はホーム位置まで大きく後退する(1発目・4発目相当は後退なし)
    if (cyclePos === 1) {
        await knockbackTo(loser, loser === 'P' ? DB.POS.P_RETREAT_X : DB.POS.E_RETREAT_X);
    } else if (cyclePos === 2) {
        await knockbackTo(loser, loser === 'P' ? DB.POS.P_HOME_X : DB.POS.E_HOME_X);
    }

    await wait(300);
    toIdle();
}

async function runMeteor(attacker, defender) {
    hitComboSuccess(attacker);
    hitComboBreak(defender);
    applyDamage(defender, DB.DMG.M * chargeMultOf(attacker));
    playSE('se_meteor'); // 未配置ならse_punchで代用される
    setAct(attacker, 'knock.PNG');
    setAct(defender, 'damage.PNG');
    await wait(400); // 一時停止

    // 打たれる方が先に地面へ落下(実際の現在の高さを起点にする。PUNCH+PUNCH+UPPERで通常より高い位置にいても正しく動作する)
    const defenderFromY = getY(defender);
    const fallSteps = 5;
    for (let s = 1; s <= fallSteps; s++) {
        setY(defender, defenderFromY + (DB.POS.GROUND_Y - defenderFromY) * (s / fallSteps));
        await wait(30);
    }
    setY(defender, DB.POS.GROUND_Y);
    triggerShake(defender, 500);
    triggerBlink(defender, 900); // 振動＋点滅

    await wait(60); // 打つ方は少し遅れて急降下開始
    const attackerFromY = getY(attacker);
    const atkFallSteps = 6;
    for (let s = 1; s <= atkFallSteps; s++) {
        setY(attacker, attackerFromY + (DB.POS.GROUND_Y - attackerFromY) * (s / atkFallSteps));
        await wait(35);
    }
    setY(attacker, DB.POS.GROUND_Y);
    setAct(attacker, 'knock2.PNG');
    triggerShake(attacker, 350);
    await wait(500);
    toIdle();
}

async function runUpperCombo(attacker, defender, cursor) {
    hitComboSuccess(attacker);
    hitComboBreak(defender);
    // PUNCH+PUNCH+UPPER: 直前2連続の地上PUNCH勝利(pPunchStreak/ePunchStreak >= 2)に続けてUPPERで勝った場合、
    // このアッパーは2倍の高さ・2倍の速度で打ち上げ、ダメージも2倍になる。ストリークをリセットする前に判定する。
    // UPPER+GUARD+UPPER: 直前にUPPER→GUARDと連続成功した場合のチャージ(pUpperChargeReady)が有効な場合も同様の扱いになる。
    const winnerStreakKey = attacker === 'P' ? 'pPunchStreak' : 'ePunchStreak';
    const upperChargeKey = attacker === 'P' ? 'pUpperChargeReady' : 'eUpperChargeReady';
    const viaPunchPunch = state[winnerStreakKey] >= 2;
    const viaUpperGuard = state[upperChargeKey];
    const isSuperUpper = viaPunchPunch || viaUpperGuard;
    if (viaPunchPunch) markSpecialUsed('superUpper'); // 実績: PUNCH+PUNCH+UPPERの使用を記録

    // このUPPERの勝敗が決まったので、UPPER→GUARDの連続検知用フラグを更新する(次のGUARDが直前の勝敗を正しく参照できるように)
    if (attacker === 'P') { state.pLastWinWasUpper = true; state.eLastWinWasUpper = false; }
    else { state.eLastWinWasUpper = true; state.pLastWinWasUpper = false; }

    // UPPERが決まった時点で地上パンチの連続記録は途切れる(コンボ中の空中パンチとは別カウント)
    state.pPunchStreak = 0;
    state.ePunchStreak = 0;
    state.pGuardStreak = 0; state.eGuardStreak = 0; // ガード以外で勝敗が決したのでガード連続記録は途切れる

    setAct(attacker, 'upper.PNG');
    setAct(defender, 'damage.PNG');
    applyDamage(defender, DB.DMG.U * chargeMultOf(attacker) * (isSuperUpper ? 2 : 1));
    playSE('se_upper'); // 未配置ならse_punchで代用される
    triggerShake(defender, 300);
    // チャージ(ガード+ガード、UPPER+GUARD+UPPER)は「次に出すカードの初撃」のみに適用される一度限りの効果のため、
    // ここで即座に消費する。以降の空中コンボ継続・メテオには適用しない(通常倍率で計算する)。
    consumeCharge(attacker); consumeCharge(defender);
    consumeUpperCharge(attacker); consumeUpperCharge(defender);
    if (viaUpperGuard) markSpecialUsed('upperGuardUpper'); // 実績: UPPER+GUARD+UPPERの使用を記録

    // 上昇アニメーション: 地面(または現在の高さ)から浮遊高さまで、固定ステップ数・固定所要時間で上昇させる。
    // PUNCH+PUNCH+UPPERの場合は目標の高さが2倍になるため、同じ時間でより長い距離を移動する=体感速度も2倍になる。
    // PUNCH+PUNCH+UPPERの上昇中は、通常のアッパーより強く見えるよう残像を残す(第24条の残像表現を流用)。
    const floatTargetY = isSuperUpper ? DB.POS.SUPER_FLOAT_Y : DB.POS.FLOAT_Y;
    const hopTargetY = isSuperUpper ? DB.POS.SUPER_HOP_Y : DB.POS.HOP_Y;
    const riseSteps = 6, riseStepMs = 45;
    const defenderFromY = getY(defender), attackerFromY = getY(attacker);
    for (let s = 1; s <= riseSteps; s++) {
        const t = s / riseSteps;
        setY(defender, defenderFromY + (floatTargetY - defenderFromY) * t);
        setY(attacker, attackerFromY + (hopTargetY - attackerFromY) * t);
        if (isSuperUpper) {
            trails.push({ side: attacker, x: getX(attacker), y: getY(attacker), born: performance.now(), sprite: 'upper.PNG', life: 260, maxAlpha: 0.5 });
            trails.push({ side: defender, x: getX(defender), y: getY(defender), born: performance.now(), sprite: 'damage.PNG', life: 260, maxAlpha: 0.5 });
        }
        await wait(riseStepMs);
    }
    await wait(430); // 空中での間(上昇分と合わせて元の700ms相当を維持)

    let airPunches = 0;
    while (true) {
        const next = nextQueuedMove(attacker, cursor);
        if (next !== 'PUNCH') break;
        cursor.i++; // 次のコマンドを消費してコンボ継続
        updateUI(cursor.i); // ハイライトも追従させる
        drawEnemySlots(cursor.i);
        airPunches++;

        if (airPunches < DB.MAX_AIR_PUNCH) {
            if (airPunches === 1) {
                // 1発目の追撃: 打ち上げられた側(被弾側)が、アッパーの当たった高さ(攻撃側の現在の高さ。
                // 通常ならHOP_Y、PUNCH+PUNCH+UPPERならSUPER_HOP_Y)まで滑らかに落ちてきて、その高さでコンボが始まる。
                // 攻撃側は構えたまま動かさない(打つ方が浮き上がるのではなく、相手が落ちてくる方が自然なため)。
                const meetY = getY(attacker);
                const defenderFromY = getY(defender);
                const descSteps = 5, descStepMs = 30;
                for (let s = 1; s <= descSteps; s++) {
                    const dt = s / descSteps;
                    setY(defender, defenderFromY + (meetY - defenderFromY) * dt);
                    await wait(descStepMs);
                }
                setY(defender, meetY);
            }
            // 2発目以降は、1発目で既に同じ高さに揃っているため、両者とも高さの変更は不要
            hitComboSuccess(attacker); // 空中コンボの各撃もCOMBOとして数える(第26条: 空中打ち上げ時の無防備状態への攻撃を含む)
            setAct(attacker, nextPunchSprite(attacker)); // 第21条
            markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のコンボ継続: ヒビ割れる
            const comboDmg = (DB.DMG.P + (airPunches - 1) * DB.DMG.P_COMBO_STEP) * chargeMultOf(attacker); // 1発目=P, 2発目=P+STEP...
            applyDamage(defender, comboDmg);
            playSE('se_punch');
            triggerShake(defender, 200);
            await wait(500);
        } else {
            // 3発目: メテオへ変換
            markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のメテオ: ヒビ割れる
            await runMeteor(attacker, defender);
            return;
        }
    }

    // コンボ終了(メテオに至らない場合): 次の手がGUARDの場合は専用の演出にする(UPPER+GUARD+UPPERが成立するかどうかに関わらず、
    // 次の手がGUARDであれば常にこの演出になる)。攻撃側はdashで元の位置には戻らず、その場で着地して次のGUARDの構えを先取りする。
    // 被弾側は無防備なままdamage.PNGの姿勢を保ち、重力に従うように加速しながら落下する(弾んだりはしない)。
    // 両者ともこの短い時間内に着地を終え、そのままその場でGUARDの攻防に入る(後退→接近のダッシュ往復はしない)。
    if (nextQueuedMove(attacker, cursor) === 'GUARD') {
        const attackerFromY = getY(attacker), defenderFromY = getY(defender);
        const steps = 6, stepMs = 25;
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            setY(attacker, attackerFromY + (DB.POS.GROUND_Y - attackerFromY) * t); // 攻撃側は一定速度で着地
            setY(defender, defenderFromY + (DB.POS.GROUND_Y - defenderFromY) * (t * t)); // 被弾側は重力っぽく加速しながら落下(t^2のイージング)、同じ時間で着地を終える
            await wait(stepMs);
        }
        setY(attacker, DB.POS.GROUND_Y);
        setY(defender, DB.POS.GROUND_Y);
        setAct(attacker, 'guard.PNG'); // 次に控えるGUARDの構えを先取りする
        setAct(defender, 'damage.PNG'); // 無防備なまま、弾んだりせずそのまま静止する
        state.skipNextReposition = true; // 次のGUARDは、この着地した位置でそのまま行う(後退→接近のダッシュ往復をしない)
        return;
    }

    // 通常時: アニメーション付きで双方着地(高い位置からでも間延びしない。第5条)
    await waitBothLanded();
    setAct(attacker, 'dash.PNG'); // 第6条
    setAct(defender, 'damage.PNG'); // 第6条
    await wait(300);
    toIdle();
}

// GUARDが勝った場合の演出(勝った側はガードのまま反撃、負けた側はしびれる)
// 第3すくみの通り、GUARDに勝てるのはPUNCHのみなので、通常は負けた側が必ずpunch.PNGの姿勢になる。
// ただし、しびれによる無条件敗北(runNumbFail)経由で呼ばれた場合は、負けた側が実際にPUNCHを出していたとは限らないため、
// loserPoseOverrideでポーズを明示的に上書きできるようにしている(その場合はdamage.PNGを指定する)。
// ブロックされた瞬間からピヨり(頭上のpiyo.PNG)を開始し、以後damage.PNGの姿勢のまま維持する(IDLEには戻さない)。
// このピヨり状態は、次の攻防でしびれ判定が解決される瞬間(resolveExchange)まで継続する。
async function runGuardSuccess(winner, loser, loserPoseOverride) {
    hitComboSuccess(winner);
    hitComboBreak(loser);
    state.pPunchStreak = 0; // ガードでパンチが止まった場合も連続記録は途切れる
    state.ePunchStreak = 0;
    setAct(winner, 'guard.PNG');
    setAct(loser, loserPoseOverride || 'punch.PNG'); // ブロックされた瞬間の姿勢(通常はパンチのまま)
    applyDamage(winner, DB.DMG.TINY); // 自己反動の微ダメージのため、チャージ倍率は適用しない
    playSE('se_guard');
    triggerShake(winner, 250);
    triggerShake(loser, 400); // しびれによる振動(ダメージなし)
    if (loser === 'P') state.pNumbed = true; else state.eNumbed = true; // 次のコマンドの成功率が1/2になる
    if (winner === 'P') state.pGuardHoldPose = true; else state.eGuardHoldPose = true; // 相手がしびれている間、ガードの構えを維持する
    consumeCharge(loser); // 敗者側は「次に出したカード」がガードに防がれて負けたので、持っていたチャージがあればここで消費される
    consumeUpperCharge(loser); // UPPER+GUARD+UPPER用のチャージも同様に、敗者側が持っていればここで消費される

    // UPPER+GUARD+UPPER: 勝者が直前の攻防でUPPERにも勝っていた場合、このGUARD成功で
    // 「次に出すカードがUPPERの時だけ有効な」チャージ(水色の発光)が発動する。
    const winnerLastUpperKey = winner === 'P' ? 'pLastWinWasUpper' : 'eLastWinWasUpper';
    const wasUpperGuardChain = state[winnerLastUpperKey];
    if (wasUpperGuardChain) {
        if (winner === 'P') state.pUpperChargeReady = true; else state.eUpperChargeReady = true;
    }
    // このGUARDの勝敗が決まったので、UPPER→GUARD連続検知用フラグを更新する(GUARD自体はUPPER勝利ではないため両者falseにする)
    state.pLastWinWasUpper = false;
    state.eLastWinWasUpper = false;

    // ガード+ガード(チャージ): 同一ターン内でガード成功が2回連続すると2倍、3回連続以降は4倍(上限)になる。
    // ガード成功自体はチャージを消費しない(次に出したカードが実際に攻撃として命中/失敗した時に初めて消費される)。
    const winnerGuardStreakKey = winner === 'P' ? 'pGuardStreak' : 'eGuardStreak';
    const loserGuardStreakKey = loser === 'P' ? 'pGuardStreak' : 'eGuardStreak';
    state[winnerGuardStreakKey]++;
    state[loserGuardStreakKey] = 0;
    if (state[winnerGuardStreakKey] >= 3) {
        if (winner === 'P') state.pChargeValue = 4; else state.eChargeValue = 4; // 3連続以降は4倍が上限
        markSpecialUsed('charge'); // 実績: ガード+ガードの使用を記録
    } else if (state[winnerGuardStreakKey] >= 2) {
        if (winner === 'P') state.pChargeValue = 2; else state.eChargeValue = 2; // 2連続で2倍発動
        markSpecialUsed('charge'); // 実績: ガード+ガードの使用を記録
    }

    // UPPER+GUARD+UPPERが成立する場合、両者は既にrunUpperCombo側の専用演出でGROUND_Yまで降下済み(このGUARDの前に完了している)。

    await wait(400);
    setAct(loser, 'damage.PNG'); // ブロック反応から、しびれてダウン気味の姿勢へ
    startPiyo(loser); // ここから次の攻防が解決されるまでピヨり続ける(チャージとは独立して、通常通りターン終了時に解消される)
    await wait(100);
}

async function runNumbFail(numbedSide, cursor, pAct, eAct) {
    const winner = numbedSide === 'P' ? 'E' : 'P';
    const loser = numbedSide;
    const winnerMove = winner === 'P' ? pAct : eAct;

    // ピヨりは前の攻防(GUARDにブロックされた瞬間)から継続表示中。ここでは点滅を強めて「発動」を演出するだけに留める
    setAct(loser, 'damage.PNG');
    triggerBlink(loser, 1400);
    await wait(700);

    // 相手の技の種類に応じた通常の勝敗処理へ(空中コンボならコンボも発生する)
    if (winnerMove === 'UPPER') {
        await runUpperCombo(winner, loser, cursor);
    } else if (winnerMove === 'GUARD') {
        await runGuardSuccess(winner, loser, 'damage.PNG'); // しびれ側は実際に出していた技に関わらずdamage.PNGにする
    } else {
        await runNormalHit(winner, loser, winnerMove);
    }
}

function markCardOutcome(side, idx, outcomeClass) {
    const arr = side === 'P' ? cardOutcomes.P : cardOutcomes.E;
    arr[idx] = outcomeClass || null; // ターンが終わるまで保持する
    const container = document.getElementById(side === 'P' ? 'slots' : 'enemySlots');
    const el = container.children[idx];
    if (!el) return;
    el.classList.remove('card-lose', 'card-shatter');
    if (outcomeClass) el.classList.add(outcomeClass);
}

// このターンの手札から特殊コンボの種類を判定する。
// 'finisher'(GUARD+PUNCH+GUARD+PUNCH+PUNCH)は手札の1〜5枚目に固定で該当するかのみを見る。
// 該当する場合は即座に返す(内部にPUNCH+GUARD+PUNCHの並びを含むが、followup判定へは進まないため自動的にキャンセルされる)。
// 'followup'(PUNCH+GUARD+PUNCH)は、手札のどの位置でも3連続で出ていれば該当し、開始インデックス(start)も返す。
function detectComboType(hand, total) {
    if (total >= 5 && hand[0] === 'GUARD' && hand[1] === 'PUNCH' && hand[2] === 'GUARD' && hand[3] === 'PUNCH' && hand[4] === 'PUNCH') {
        return { type: 'finisher', start: 0 };
    }
    for (let start = 0; start + 2 < total; start++) {
        if (hand[start] === 'PUNCH' && hand[start + 1] === 'GUARD' && hand[start + 2] === 'PUNCH') {
            return { type: 'followup', start };
        }
    }
    return { type: null, start: -1 };
}

// PUNCH+GUARD+PUNCH(1〜3枚目が全て勝利)成立時の追撃。punch.PNG/punch2.PNGを素早く切り替えながら3連打し、必ずヒットする。
// 合計ダメージは通常パンチ1発の3倍(1発ごとにDB.DMG.P、チャージ等の影響は受けない)。
async function runFollowUpFlurry(attacker, defender) {
    hitComboBreak(defender);
    for (let i = 0; i < 3; i++) {
        hitComboSuccess(attacker); // 追撃は3連打それぞれをCOMBOとして数える
        setAct(attacker, nextPunchSprite(attacker)); // 第21条
        setAct(defender, 'damage.PNG');
        applyDamage(defender, DB.DMG.P);
        playSE('se_punch');
        triggerShake(defender, 150);
        await wait(120); // 素早い連打
    }
    await wait(200);
    toIdle();
}

// GUARD+PUNCH+GUARD+PUNCH+PUNCH(1〜4枚目が全て勝ちまたは相打ち)成立時の必殺技。
// 3すくみ判定を行わずヒット確定で固定ダメージ(チャージ等の影響を受けない)を与え、被弾側を画面端まで吹き飛ばす。
// 被弾側はdamage.PNGのまま端まで飛び、ぶつかって点滅した後knock2.PNGになり、通常のターン終了処理で定位置へ戻る。
// このダメージでK.O.した場合は、画面端でdown.PNGのまま倒れさせ、通常の決着演出(ホームへの帰還バウンド)はスキップする。
async function runFinisher(attacker, defender, cursor) {
    hitComboSuccess(attacker);
    hitComboBreak(defender);
    setAct(attacker, nextPunchSprite(attacker)); // 第21条
    setAct(defender, 'damage.PNG');
    markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のヒットなのでヒビ割れ表現にする
    applyDamage(defender, DB.DMG.FINISHER);
    playSE('se_finisher'); // 未配置ならse_punchで代用される
    triggerShake(defender, 300);
    await wait(150);

    // 被弾側を画面端まで吹き飛ばす(damage.PNGのまま)
    const edgeX = defender === 'P' ? DB.POS.EDGE_P_X : DB.POS.EDGE_E_X;
    const fromX = getX(defender);
    const flySteps = 8, flyStepMs = 30;
    for (let s = 1; s <= flySteps; s++) {
        setX(defender, fromX + (edgeX - fromX) * (s / flySteps));
        await wait(flyStepMs);
    }
    setX(defender, edgeX);

    // 端にぶつかって点滅
    triggerBlink(defender, 500);
    triggerShake(defender, 300);
    await wait(500);

    const isLethal = (defender === 'P' ? state.hpP : state.hpE) <= 0;
    if (isLethal) {
        setAct(defender, 'down.PNG'); // 画面端でそのまま倒れる。通常の決着演出のホーム帰還バウンドはスキップする
        state.finisherAlreadyDown = true;
        await wait(300);
        return;
    }

    setAct(defender, 'knock2.PNG');
    await wait(400);
    // 「元の定位置に戻る」は、このターンの通常の終了処理(goHome)がまとめて行う
}

async function resolveExchange(pAct, eAct, cursor) {
    // チャージ(state.pChargeValue/eChargeValue)はここでは消費しない。
    // ガード成功時は消費せず連続カウントを伸ばして格上げし、それ以外(PUNCH/UPPER勝利・負け・相討ち)の
    // 結果が決まった時点で、各処理関数(runNormalHit/runUpperCombo/resolveExchange内の相討ち処理)がconsumeCharge()を呼んで消費する。

    // UPPER→GUARDの専用着地演出の直後は、既にその場でGUARDを実行する想定のため、
    // 通常の後退→接近ダッシュ往復をスキップする(間延びを防ぐ)。
    if (state.skipNextReposition) {
        state.skipNextReposition = false;
    } else {
        await approachCenter(); // 第24条: 残像付きで中央へ踏み込む
    }

    // 必殺技(GUARD+PUNCH+GUARD+PUNCH+PUNCH、5枚目)の判定: 3すくみ・しびれ判定を行わずヒット確定で処理する
    if (cursor.i === 4) {
        const pFinisherReady = state.pComboType === 'finisher' && state.pComboAlive;
        const eFinisherReady = state.eComboType === 'finisher' && state.eComboAlive;
        if (pFinisherReady || eFinisherReady) {
            const attacker = pFinisherReady ? 'P' : 'E'; // 両者同時成立は理論上稀なケースのためPを優先する
            const defender = attacker === 'P' ? 'E' : 'P';
            markCardOutcome(defender, cursor.i, 'card-shatter');
            await runFinisher(attacker, defender, cursor);
            markSpecialUsed('finisher'); // 実績: 必殺技の使用を記録
            state.lastExchangeResult = attacker === 'P' ? { P: 'win', E: 'lose' } : { P: 'lose', E: 'win' };
            return;
        }
    }

    // しびれ判定: 直前の攻防でガードに阻まれた側は、1/2の確率でこの攻防に無条件で敗北する(3すくみ判定は行わない)
    if (state.pNumbed || state.eNumbed) {
        const numbedSide = state.pNumbed ? 'P' : 'E';
        const guardSide = numbedSide === 'P' ? 'E' : 'P';
        if (numbedSide === 'P') state.pNumbed = false; else state.eNumbed = false;
        if (guardSide === 'P') state.pGuardHoldPose = false; else state.eGuardHoldPose = false; // 判定が出たので構え保持を解除
        stopPiyo(); // この攻防で結果が決まるので、ここまで継続していたピヨりを終了する
        if (Math.random() < 0.5) {
            markCardOutcome(numbedSide, cursor.i, 'card-shatter'); // 3すくみ無視の敗北: ヒビ割れる
            consumeCharge(numbedSide); // しびれで無条件敗北する側のチャージも、次のカードとして消費される
            consumeUpperCharge(numbedSide); // UPPER+GUARD+UPPER用のチャージも同様に消費する
            if (numbedSide === 'P') state.pLastWinWasUpper = false; else state.eLastWinWasUpper = false; // 無条件敗北なのでUPPER勝利ではない
            state.lastExchangeResult = numbedSide === 'P' ? { P: 'lose', E: 'win' } : { P: 'win', E: 'lose' };
            await runNumbFail(numbedSide, cursor, pAct, eAct);
            return;
        }
    }

    const result = judge(pAct, eAct);
    if (result === 'draw') {
        // 相討ち: 同じ手同士がぶつかる場合、双方が微ダメージを受けて振動し、反動で一歩下がる
        hitComboBreak('P'); hitComboBreak('E'); // 相討ちはどちらも「成功」ではないため、双方のCOMBOが途切れる
        state.pPunchStreak = 0; // 相討ちでは連続記録が途切れる
        state.ePunchStreak = 0;
        state.pGuardStreak = 0; // 相討ちではガードの連続記録も途切れる
        state.eGuardStreak = 0;
        consumeCharge('P'); consumeCharge('E'); // 相討ちはどちらもガード勝利ではないため、双方のチャージを消費する
        consumeUpperCharge('P'); consumeUpperCharge('E'); // UPPER+GUARD+UPPER用のチャージも同様に消費する
        state.pLastWinWasUpper = false; state.eLastWinWasUpper = false; // 相討ちはどちらもUPPER勝利ではないため、連続検知用フラグをリセットする
        state.lastExchangeResult = { P: 'draw', E: 'draw' };
        state.pAct = moveSprite(pAct);
        state.eAct = moveSprite(eAct);
        applyDamage('P', DB.DMG.CLASH);
        applyDamage('E', DB.DMG.CLASH);
        // あいこ専用のSE。出した手の種類に応じて鳴らす(いずれも未配置ならse_punchで代用される)
        playSE(pAct === 'PUNCH' ? 'se_clash_punch' : pAct === 'UPPER' ? 'se_clash_upper' : 'se_clash_guard');
        triggerShake('P', 300);
        triggerShake('E', 300);
        await wait(250);
        await moveBothX(DB.POS.P_RETREAT_X, DB.POS.E_RETREAT_X, 4, 30); // 反動で一歩下がる
        toIdle();
        return;
    }

    const winner = result === 'win' ? 'P' : 'E';
    const loser = winner === 'P' ? 'E' : 'P';
    const winnerMove = winner === 'P' ? pAct : eAct;
    state.lastExchangeResult = winner === 'P' ? { P: 'win', E: 'lose' } : { P: 'lose', E: 'win' };
    markCardOutcome(loser, cursor.i, 'card-lose'); // 敗者だけ暗くする。勝者は黄色いハイライトのまま

    if (winnerMove === 'UPPER') {
        await runUpperCombo(winner, loser, cursor);
    } else if (winnerMove === 'GUARD') {
        // 直前の攻防でこの勝者がUPPERに勝っていた場合、敗者は無防備なまま落ちてきた直後のため、
        // 通常の「パンチを繰り出した」ポーズ(punch.PNG)ではなくdamage.PNGのまま維持する。
        const winnerLastUpperKey = winner === 'P' ? 'pLastWinWasUpper' : 'eLastWinWasUpper';
        const loserPoseOverride = state[winnerLastUpperKey] ? 'damage.PNG' : undefined;
        await runGuardSuccess(winner, loser, loserPoseOverride); // ガード成功: 勝者は極小ダメージ、敗者はしびれる
    } else {
        await runNormalHit(winner, loser, winnerMove);
    }
}

async function resolveTurn() {
    if (state.resolving || !state.battleReady || filledCount() === 0) return;
    state.resolving = true;
    document.querySelectorAll('.controls button').forEach(b => b.disabled = true);
    document.getElementById('howToBtn').disabled = false; // HOW TOは解決中でも常に押せる
    document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様
    document.getElementById('speedToggleBtn').disabled = false; // SPEEDも同様、解決中でも切り替えられる

    state.turn++;
    document.getElementById('turnDisplay').innerHTML = `TURN<br>${state.turn}<br><span id="turnStageLabel">${currentStageLabel()}</span>`;

    const cursor = { i: 0 };
    const total = filledCount();
    let gameOverSide = null; // 'P' または 'E'。体力0になった側

    // プレイヤーが出した枚数だけ、敵も手を出してくる
    if (state.gameMode === 'training') {
        // プレイヤーが実際に場に出した手に応じて、必ず負ける手を1枚ずつ生成する(第20条: 相手と同じ枚数だけ行動する点は維持)
        state.enemyHands = state.hands.slice(0, total).map(trainingCounterMove);
        state.enemyRevealedUpTo = total; // 生成した時点で内容は確定しているため、そのまま公開する
    } else {
        state.enemyHands = generateEnemyTurnHand(total);
        state.enemyRevealedUpTo = 0; // 第2条: 中身を伏せて攻防の直前に1枚ずつ公開する
    }
    drawEnemySlots();

    // このターンの手札から特殊コンボの種類を判定する(GUARD+PUNCH+GUARD+PUNCH+PUNCHの必殺技、PUNCH+GUARD+PUNCHの追撃)。
    // 手札は既に確定しているため、攻防が始まる前(敵の手が伏せられている段階)でも判定して問題ない。
    const pCombo = detectComboType(state.hands, total);
    const eCombo = detectComboType(state.enemyHands, total);
    state.pComboType = pCombo.type; state.pComboStart = pCombo.start;
    state.eComboType = eCombo.type; state.eComboStart = eCombo.start;
    state.pComboAlive = state.pComboType !== null;
    state.eComboAlive = state.eComboType !== null;
    state.lastExchangeResult = null;
    state.finisherAlreadyDown = false;

    try {
        while (cursor.i < total) {
            if (gameOverSide) break;

            const pAct = state.hands[cursor.i];
            const eAct = state.enemyHands[cursor.i];

            if (state.gameMode !== 'training') {
                // このタイミングで敵の手を公開する(STORY MODEのみ)
                state.enemyRevealedUpTo = cursor.i + 1;
            }
            drawEnemySlots(cursor.i); // 対戦中の敵カードを光らせる
            updateUI(cursor.i);       // 対戦中の味方カードを光らせる

            await resolveExchange(pAct, eAct, cursor);

            // コンボ成立要件の判定を更新する(1つでも要件を満たさなければ不成立になる)。
            // followup(PUNCH+GUARD+PUNCH)は該当する3枚(index: start〜start+2)がすべて勝ちである必要がある。
            // finisher(GUARD+PUNCH+GUARD+PUNCH+PUNCH)は1〜4枚目(index0-3)が勝ちまたは相打ちである必要がある。
            const res = state.lastExchangeResult;
            if (res) {
                if (state.pComboType === 'followup' && cursor.i >= state.pComboStart && cursor.i <= state.pComboStart + 2 && res.P !== 'win') state.pComboAlive = false;
                if (state.pComboType === 'finisher' && cursor.i <= 3 && res.P === 'lose') state.pComboAlive = false;
                if (state.eComboType === 'followup' && cursor.i >= state.eComboStart && cursor.i <= state.eComboStart + 2 && res.E !== 'win') state.eComboAlive = false;
                if (state.eComboType === 'finisher' && cursor.i <= 3 && res.E === 'lose') state.eComboAlive = false;
            }
            // PUNCH+GUARD+PUNCHの3枚目(start+2枚目)が成立した直後に追撃を発生させる
            if (state.pComboType === 'followup' && cursor.i === state.pComboStart + 2 && state.pComboAlive) { await runFollowUpFlurry('P', 'E'); markSpecialUsed('followUp'); }
            if (state.eComboType === 'followup' && cursor.i === state.eComboStart + 2 && state.eComboAlive) { await runFollowUpFlurry('E', 'P'); markSpecialUsed('followUp'); }

            // TRAINING MODEは練習場のためK.O./YOU WIN判定を行わない(ターン終了時にHPが全回復する)
            if (state.gameMode !== 'training' && (state.hpP <= 0 || state.hpE <= 0)) {
                gameOverSide = state.hpP <= 0 ? 'P' : 'E';
                break;
            }

            cursor.i++;
            // 第16条: 攻防のたびに初期位置へ戻るのではなく、軽く距離を取るだけ
            // ただしUPPER→GUARDの専用着地演出の直後は、既にその場に構えているため後退させない
            if (cursor.i < total && !state.skipNextReposition) {
                await retreatSlightly();
            }
        }
    } finally {
        // しびれはターンをまたいで持ち越さない仕様: 使われなかった場合はここで消える(ピヨり表示も同時に終了する)
        state.pNumbed = false;
        state.eNumbed = false;
        state.pGuardHoldPose = false;
        state.eGuardHoldPose = false;
        stopPiyo();
        // ガード連続成功のカウントは同一ターン内のみ有効。ターンをまたいで持ち越さない(チャージ状態自体は持ち越すため、ここではリセットしない)
        state.pGuardStreak = 0;
        state.eGuardStreak = 0;
        // 地上パンチの連続ヒット数(ダメージ周期)も同一ターン内のみ有効。ターンをまたいで持ち越さない
        state.pPunchStreak = 0;
        state.ePunchStreak = 0;
        // UPPER+GUARD+UPPER用のチャージ(水色)は、ガード+ガードの金色チャージと異なりターンをまたいで持ち越さない。
        // ターン内で使われなかった場合は、ここで無駄に終わる(消える)。
        state.pUpperChargeReady = false;
        state.eUpperChargeReady = false;
        state.pLastWinWasUpper = false;
        state.eLastWinWasUpper = false;
        state.skipNextReposition = false; // 念のためターンをまたいで残らないようにする

        // 使用したプレイヤーカードを捨て札へ送り、使った枚数分だけ山から補充する。
        // TRAINING MODEは固定パレット(選び放題)のため、捨札・補充の概念自体がなく丸ごとスキップする。
        if (state.gameMode !== 'training') {
            for (let i = 0; i < total; i++) {
                if (state.hands[i]) state.playerDiscard.push(state.hands[i]);
            }
            const drawnIndices = [];
            for (let i = 0; i < state.playerHand.length; i++) {
                if (state.playerHand[i] === null) {
                    const c = drawCard(); // 山の残数を超えては引けない(nullなら空枠のまま残る)
                    if (c !== null) {
                        state.playerHand[i] = c;
                        drawnIndices.push(i);
                    }
                }
            }
            updateHandUI(drawnIndices); // 補充分だけ画面下から回転しつつ登場するアニメーション
            updateDeckCountDisplay();
        }

        if (gameOverSide) {
            // 体力を0にする最後の一撃: 通常の帰還処理の代わりに専用の決着演出を実行
            state.battleReady = false; // 決着後は手札タップ含め操作不可にする
            await runFinishSequence(gameOverSide);
            await fadeOutQueueCards(); // 場のカードがふわっと消える
            cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン終了につき勝敗表現をリセット
            state.hands = new Array(5).fill(null);
            updateUI();
            state.resolving = false; // バトルは決着済み。ボタンは結果画面から「タイトルへ戻る」でリセットされる
        } else {
            // 第9条: ターン完了時のみ、残像付きでホームポジションへ確実に帰還する
            state.pY = DB.POS.GROUND_Y;
            state.eY = DB.POS.GROUND_Y;
            await goHome();
            toIdle();

            // 手札・山が共に尽きた場合のみ、Refresh演出(点滅→カウントアップ)を挟んで捨札をリシャッフルする。
            // 両者が元の立ち位置に戻った後に行う。
            const handIsEmpty = state.playerHand.every(c => c === null);
            if (handIsEmpty && state.playerDeck.length === 0) {
                await runDeckRefresh();
                for (let i = 0; i < state.playerHand.length; i++) {
                    if (state.playerHand[i] === null) {
                        const c = drawCard();
                        if (c !== null) state.playerHand[i] = c;
                    }
                }
                updateDeckCountDisplay();
                // refresh後の5枚も、バトル開始時と同じく裏向きで配ってから左から順にめくる演出にする
                await dealInitialHandAnimation();
            }

            await fadeOutQueueCards(); // 場のカードがふわっと消える
            cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン終了(両者が定位置へ戻った後)につき勝敗表現をリセット
            if (state.gameMode === 'training') {
                healBothToFull(); // TRAINING MODE: ターン終了ごとに双方のHPを全回復する
            }
            state.hands = new Array(5).fill(null); // 第1条: 5つの空枠に戻す
            updateUI();
            state.enemyHands = [];
            state.enemyRevealedUpTo = 0;
            drawEnemySlots();
            state.resolving = false;
        }
    }
}

// ============================================================
// UIポップアップ
// ============================================================
function openHowTo() {
    document.getElementById('howToOverlay').classList.add('show');
}

function closeHowTo() {
    document.getElementById('howToOverlay').classList.remove('show');
}

function closeHowToBackdrop(e) {
    if (e.target.id === 'howToOverlay') closeHowTo();
}

function openOption() {
    updateOptionUI();
    document.getElementById('optionOverlay').classList.add('show');
}

// BONUS CONTENTS(タイトル画面専用): SUB STORY/SOUND TESTのいずれかが1つでも解除されていればボタン自体を表示する
function updateBonusContentsUI() {
    const soundTestAvailable = gameClearedOnce || soundTestUnlocked; // 新条件(エンディングを迎えてタイトルへ戻る)。旧セーブデータのsoundTestUnlockedも引き続き有効
    const costumeAvailable = unlockedSkins.length > 0 && gameClearedOnce; // OPTION画面のCOSTUME行と同じ解放条件
    const speedAvailable = gameClearedOnce; // SPEED機能自体の解放条件(クリア後に出現)
    const anyUnlocked = unlockedSubStories.length > 0 || soundTestAvailable || costumeAvailable || speedAvailable;
    const btn = document.getElementById('bonusContentsBtn');
    if (btn) btn.style.display = anyUnlocked ? '' : 'none';
    const subRow = document.getElementById('bonusSubStoryRow');
    const soundRow = document.getElementById('bonusSoundTestRow');
    const costumeRow = document.getElementById('bonusCostumeRow');
    if (subRow) subRow.style.display = unlockedSubStories.length > 0 ? 'flex' : 'none';
    if (soundRow) soundRow.style.display = soundTestAvailable ? 'flex' : 'none';
    if (costumeRow) costumeRow.style.display = costumeAvailable ? 'flex' : 'none';
    updateSpeedUI(); // SPEED行・バトル操作列のSPEEDボタンをまとめて同期する
}

// SPEED(バトル2倍速)機能: クリア後(gameClearedOnce)に解放される。バトル操作列のボタンとBONUS CONTENTSのSPEED行、
// どちらからでも切り替えでき、常に両方の表示を同期させる。実際の速度反映はwait()側で行う(第26条の対象外、演出専用)。
function setBattleSpeed(isX2) {
    battleSpeedX2 = isX2;
    writeSaveData({ battleSpeedX2 });
    updateSpeedUI();
}
function toggleBattleSpeed() {
    setBattleSpeed(!battleSpeedX2);
}
function updateSpeedUI() {
    const unlocked = gameClearedOnce;
    const battleBtn = document.getElementById('speedToggleBtn');
    if (battleBtn) {
        battleBtn.style.visibility = unlocked ? 'visible' : 'hidden';
        battleBtn.innerText = battleSpeedX2 ? '▶︎▶︎' : '▶︎';
        battleBtn.classList.toggle('speed-active', battleSpeedX2);
    }
    const row = document.getElementById('bonusSpeedRow');
    const note = document.getElementById('bonusSpeedNote');
    if (row) row.style.display = unlocked ? 'flex' : 'none';
    if (note) note.style.display = unlocked ? 'block' : 'none';
    const btn1x = document.getElementById('bonusSpeedBtn1x');
    const btn2x = document.getElementById('bonusSpeedBtn2x');
    if (btn1x) btn1x.classList.toggle('selected', !battleSpeedX2);
    if (btn2x) btn2x.classList.toggle('selected', battleSpeedX2);
}

function openBonusContents() {
    updateBonusContentsUI();
    document.getElementById('bonusContentsOverlay').classList.add('show');
}
function closeBonusContents() {
    stopSoundTestPlayback(); // SOUND TESTが裏で開いたまま再生中の場合に備えて念のため止める
    document.getElementById('bonusContentsOverlay').classList.remove('show');
}
function closeBonusContentsBackdrop(e) { if (e.target.id === 'bonusContentsOverlay') closeBonusContents(); }

// BONUS関連のポップアップ(BONUS本体・SUB STORY・SOUND TEST)をすべて閉じる。
// どの階層の×ボタンから呼ばれても、BONUS自体を完全に終了させる(戻るボタンとは異なり1段階ずつ戻らない)。
function closeAllBonus() {
    stopSoundTestPlayback();
    subStoryToken++; // サブストーリー再生中なら中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    document.getElementById('bonusContentsOverlay').classList.remove('show');
    document.getElementById('subStoryOverlay').classList.remove('show');
    document.getElementById('soundTestOverlay').classList.remove('show');
    document.getElementById('costumeOverlay').classList.remove('show'); // BONUS経由でCOSTUMEが開いたまま残っている場合の安全策
}

function closeOption() {
    document.getElementById('optionOverlay').classList.remove('show');
}

function closeOptionBackdrop(e) {
    if (e.target.id === 'optionOverlay') closeOption();
}

function updateOptionUI() {
    document.querySelector(`input[name="soundRadio"][value="${state.soundOn ? 'on' : 'off'}"]`).checked = true;
    document.getElementById('bgmVolumeSlider').value = Math.round(state.bgmVolume * 100);
    document.getElementById('seVolumeSlider').value = Math.round(state.seVolume * 100);
    document.getElementById('optionItemsRow').style.display = unlockedItems.length > 0 ? 'flex' : 'none';
    // COSTUMEは「サブストーリーを1つ以上見た」に加え「STORY MODEを一度最後までクリアした」場合のみ表示する
    document.getElementById('optionCostumeRow').style.display = (unlockedSkins.length > 0 && gameClearedOnce) ? 'flex' : 'none';
    // タイトルから開いた場合は「今のバトル」が存在しないため、RETRY/RETURN TO TITLEを隠す
    const isTitle = document.getElementById('sceneTitle').classList.contains('active');
    document.getElementById('optionFooter').style.display = isTitle ? 'none' : 'flex';
    // TRAINING MODEはデッキ編成を経由しない(選び放題の固定手札のため)、RETRYボタン自体を隠す
    document.getElementById('optionRetryBtn').style.display = state.gameMode === 'training' ? 'none' : '';
    // RETURN TO TITLEの確認文言: STORY MODEは進行状況の保存に触れるが、TRAINING MODEは進行状況を持たないため短い文言にする
    document.getElementById('returnConfirmText').innerHTML = state.gameMode === 'training'
        ? 'タイトルに戻りますか？'
        : 'タイトルに戻りますか？<br>（ストーリーの進行状況は保存されます）';
    closeResetConfirm(); // 開き直したら確認状態はリセット
    closeRetryConfirm();
    closeReturnConfirm();
}

function setSound(on) {
    state.soundOn = on;
    writeSaveData({ soundOn: on });
    if (!on) {
        stopBGM(); // OFFにした瞬間、鳴っているBGMを止める
    } else if (currentBgmName) {
        // 直前まで鳴らそうとしていたBGMがあれば、ONに戻した時点で再生を試みる
        const name = currentBgmName;
        currentBgmName = null; // playBGMの「同じ名前なら何もしない」ガードを一旦外す
        playBGM(name);
    }
}

function openResetConfirm() { document.getElementById('resetConfirmPanel').classList.add('show'); }

function closeResetConfirm() { document.getElementById('resetConfirmPanel').classList.remove('show'); }

// OPTION内の「進行状況(セーブデータ)のリセット」: storyEnemyIndexをセーブデータごと0に戻す。
// これによりタイトルのCONTINUEも即座に消える(図鑑等の隠し要素のリセットは別途用意する予定)。
function doResetProgress() {
    state.storyEnemyIndex = 0;
    writeSaveData({ storyEnemyIndex: 0 });
    updateTitleContinueVisibility();
    closeResetConfirm();
}

function openItemGallery() {
    alert('図鑑機能は準備中です。');
}

// ------- SUB STORY(一覧/閲覧) -------
function openSubStoryList() {
    const rows = document.getElementById('subStoryListRows');
    rows.innerHTML = '';
    unlockedSubStories.slice().sort((a, b) => a - b).forEach(idx => {
        const enemyKey = ENEMY_ORDER[idx];
        const sub = SUBSTORY_BY_ENEMY[enemyKey];
        if (!sub) return;
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `<span class="option-label">${sub.title}</span><button onclick="readSubStory(${idx})">読む</button>`;
        rows.appendChild(row);
    });
    if (unlockedSubStories.length === 0) {
        rows.innerHTML = '<p style="color:#888;">まだ何も解除されていません。</p>';
    }
    document.getElementById('subStoryOverlay').classList.add('show');
}
let subStoryToken = 0;
let subStoryTapResolve = null; // サブストーリーのタップ待ち中のPromiseのresolve関数

function onSubStoryTap() {
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
}
function waitForSubStoryTap() {
    return new Promise(resolve => { subStoryTapResolve = resolve; });
}

// サブストーリーを再生する。本編のストーリーシーンと同じく3画面(画像+1文字ずつのテキスト)を、タップで送りながら表示する。
// 3画面すべて読み終えたタイミングで、対応する敵のコスチュームを解除する。
async function readSubStory(idx) {
    const sub = SUBSTORY_BY_ENEMY[ENEMY_ORDER[idx]];
    if (!sub) return;
    const myToken = ++subStoryToken;
    const imgArea = document.getElementById('subStoryImgArea');
    const fallback = document.getElementById('subStoryImgFallback');
    const textEl = document.getElementById('subStoryText');
    const block = document.getElementById('subStoryBlock');

    // 戦う前のストーリーシーンと同じフルスクリーン表示に切り替える(ポップアップは一旦閉じる)
    document.getElementById('bonusContentsOverlay').classList.remove('show');
    document.getElementById('subStoryOverlay').classList.remove('show');
    showScene('subStoryRead');
    block.style.transition = 'none';
    block.style.opacity = '0';
    await wait(30); // 直前のopacity:0が確実に描画されてからフェードインを開始させる
    block.style.transition = 'opacity 0.6s ease-in';
    block.style.opacity = '1';

    await loadCutsceneScreens(sub.screens, 'substory'); // 表示を始める前に3画面分の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)
    if (subStoryToken !== myToken) return; // 読み込み待ちの間に戻る/閉じるで中断されていたら止める

    for (let i = 0; i < sub.screens.length; i++) {
        const screen = sub.screens[i];
        if (subStoryToken !== myToken) return; // 戻る/閉じるで中断されていたら止める

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/substory/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        textEl.innerText = '';
        for (let c = 0; c < screen.text.length; c++) {
            if (subStoryToken !== myToken) return;
            textEl.innerText += screen.text[c];
            await wait(45);
        }

        if (subStoryToken !== myToken) return;
        await waitForSubStoryTap(); // 本編と同じくタップで次へ(自動送りしない)
        if (subStoryToken !== myToken) return;
    }

    // 実績: サブストーリーを3画面すべて読み終えた(体験した)タイミングで、対応する敵のコスチュームを解除する。
    const skinName = 'enemy_' + (idx + 1);
    unlockSkin(skinName);
    if (gameClearedOnce) {
        updateOptionUI(); // 既にクリア済みなら、背後で開いたままのOPTION画面のCOSTUME行を即座に表示させる
        // 既にエンディングを見た後にサブストーリーを見た場合は、次にタイトルへ戻るのを待たず、読み終えた直後にCOSTUME解放を通知する
        if (!costumeUnlockAnnounced) {
            costumeUnlockAnnounced = true;
            writeSaveData({ costumeUnlockAnnounced: true });
            showUnlockToast('COSTUME 解放！');
        }
    }
    // (エンディングをまだ見ていない場合は、後から見てタイトルへ戻った時点でcheckUnlockAnnouncementsが通知する)
    backToSubStoryList();
}
function backToSubStoryList() {
    subStoryToken++; // 再生中なら中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    showScene('title'); // BONUS CONTENTSはタイトル画面専用のため、戻る先は常にタイトル
    document.getElementById('bonusContentsOverlay').classList.add('show');
    openSubStoryList(); // SUB STORYの一覧(ポップアップ)を再度開く
}
function closeSubStory() {
    subStoryToken++; // 再生中なら中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    document.getElementById('subStoryOverlay').classList.remove('show');
}
function closeSubStoryBackdrop(e) { if (e.target.id === 'subStoryOverlay') closeSubStory(); }

// ------- SOUND TEST -------
function openSoundTest() {
    soundTestCategory = null;
    soundTestPage = 0;
    renderSoundTestScreen();
    document.getElementById('soundTestOverlay').classList.add('show');
}

// 現在の状態(カテゴリ選択 or 一覧)に応じてsoundTestBodyを描画する。呼ぶたびに再生中のプレビューは必ず止める。
function renderSoundTestScreen() {
    stopSoundTestPlayback();
    const body = document.getElementById('soundTestBody');
    // 戻るボタンは常に表示する(カテゴリ選択画面でもBONUS本体へ戻れるように)

    if (soundTestCategory === null) {
        body.innerHTML = `
            <div class="sound-test-category-row">
                <button onclick="selectSoundTestCategory('bgm')">BGM</button>
                <button onclick="selectSoundTestCategory('se')">SE</button>
            </div>
        `;
        return;
    }

    const prefix = soundTestCategory === 'bgm' ? 'bgm_' : 'se_';
    const tracks = SOUND_TEST_TRACKS.filter(t => t.name.startsWith(prefix));
    const totalPages = Math.max(1, Math.ceil(tracks.length / SOUND_TEST_PAGE_SIZE));
    if (soundTestPage >= totalPages) soundTestPage = totalPages - 1;
    const pageTracks = tracks.slice(soundTestPage * SOUND_TEST_PAGE_SIZE, (soundTestPage + 1) * SOUND_TEST_PAGE_SIZE);

    const rowsHtml = pageTracks.map(t => `
        <div class="option-row">
            <span class="option-label">${t.label}</span>
            <button class="sound-test-play-btn" data-track-name="${t.name}" onclick="toggleSoundTestTrack('${t.name}')">▶</button>
        </div>
    `).join('');

    body.innerHTML = `
        <div class="sound-test-rows">${rowsHtml}</div>
        <div class="sound-test-pager">
            <button onclick="soundTestChangePage(-1)" ${soundTestPage === 0 ? 'disabled' : ''}>◀</button>
            <span>${soundTestPage + 1} / ${totalPages}</span>
            <button onclick="soundTestChangePage(1)" ${soundTestPage >= totalPages - 1 ? 'disabled' : ''}>▶</button>
        </div>
    `;
}

function selectSoundTestCategory(cat) {
    soundTestCategory = cat;
    soundTestPage = 0;
    renderSoundTestScreen();
}

function soundTestChangePage(delta) {
    soundTestPage += delta;
    renderSoundTestScreen();
}

function soundTestBack() {
    if (soundTestCategory === null) {
        // カテゴリ選択画面(第2階層)からの「戻る」は、BONUS本体(第1階層)へ戻る
        closeSoundTest();
        return;
    }
    soundTestCategory = null;
    soundTestPage = 0;
    renderSoundTestScreen();
}

// 再生ボタンの表示(▶/⏸)を、現在再生中のトラックに合わせて更新する
function updateSoundTestPlayButtons() {
    document.querySelectorAll('.sound-test-play-btn').forEach(btn => {
        btn.innerText = (btn.dataset.trackName === soundTestPlayingName) ? '⬛︎' : '▶';
    });
}

// 再生中のプレビューがあれば止める(画面切り替え・ポップアップを閉じる時に必ず呼ぶ)
function stopSoundTestPlayback() {
    if (soundTestSource) {
        try { soundTestSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        try { soundTestSource.disconnect(); } catch (e) { /* 何もしない */ }
        soundTestSource = null;
    }
    soundTestPlayingName = null;
    updateSoundTestPlayButtons();
}

// タップされたトラックが再生中なら止め、そうでなければ(他のトラックが鳴っていれば止めてから)再生する。
// 本編のBGM/SE再生とは独立したノードを使うため、本編のBGMを止めてしまうことはない。
// また、未配置ファイルをse_punch等で代用せず、そのまま無音にする(どのファイルが未配置かを正確に確認できるようにするため)。
async function toggleSoundTestTrack(name) {
    if (soundTestPlayingName === name) {
        stopSoundTestPlayback();
        return;
    }
    stopSoundTestPlayback();

    const isBgm = name.startsWith('bgm_');
    const cache = isBgm ? bgmBufferCache : seBufferCache;
    let buffer = cache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer(isBgm ? 'bgm' : 'se', name);
        cache[name] = buffer;
    }
    if (!buffer) return; // 未配置ならそのまま無音(代用しない)
    // 読み込み待ちの間に別のトラックへ切り替えられていたら中断
    if (!document.getElementById('soundTestOverlay').classList.contains('show')) return;

    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = isBgm; // BGMはループ、SEは1回のみ
    source.connect(isBgm ? getBgmGainNode() : getSeGainNode());
    source.onended = () => {
        if (soundTestSource === source) {
            soundTestSource = null;
            soundTestPlayingName = null;
            updateSoundTestPlayButtons();
        }
    };
    source.start(0);
    soundTestSource = source;
    soundTestPlayingName = name;
    updateSoundTestPlayButtons();
}

function closeSoundTest() {
    stopSoundTestPlayback();
    document.getElementById('soundTestOverlay').classList.remove('show');
}
function closeSoundTestBackdrop(e) { if (e.target.id === 'soundTestOverlay') closeSoundTest(); }

// ------- COSTUME(コスチューム選択) -------
function openCostumeSelect(fromBonus) {
    const rows = document.getElementById('costumeRows');
    rows.innerHTML = '';
    const defaultRow = document.createElement('div');
    defaultRow.className = 'option-row';
    defaultRow.innerHTML = `<span class="option-label">デフォルト</span><button onclick="selectCostume(null)">${selectedSkin === null ? '選択中' : '選ぶ'}</button>`;
    rows.appendChild(defaultRow);
    unlockedSkins.slice().sort((a, b) => parseInt(a.replace('enemy_', ''), 10) - parseInt(b.replace('enemy_', ''), 10)).forEach(skinName => {
        const idx = parseInt(skinName.replace('enemy_', ''), 10);
        const enemyName = ENEMY_PRESETS['ENEMY_0' + idx] ? ENEMY_PRESETS['ENEMY_0' + idx].name : `敵${idx}`;
        const label = `${enemyName}の見た目`;
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `<span class="option-label">${label}</span><button onclick="selectCostume('${skinName}')">${selectedSkin === skinName ? '選択中' : '選ぶ'}</button>`;
        rows.appendChild(row);
    });
    // BONUS CONTENTS経由で開いた場合のみ、OPTIONからもいつでも変更できる旨の注記を表示する(OPTION自身から開いた時は不要なため)
    document.getElementById('costumeFromBonusNote').style.display = fromBonus ? 'block' : 'none';
    document.getElementById('costumeOverlay').classList.add('show');
}
function selectCostume(skinName) {
    selectedSkin = skinName;
    writeSaveData({ selectedSkin });
    openCostumeSelect(); // 選択状態を反映して再描画
}
function closeCostume() { document.getElementById('costumeOverlay').classList.remove('show'); }
function closeCostumeBackdrop(e) { if (e.target.id === 'costumeOverlay') closeCostume(); }

// OPTION内のRETRY: このバトル直前のデッキ編成へ戻る(現在のモードを維持)。確認ポップアップを挟む。
function openRetryConfirm() { document.getElementById('retryConfirmPanel').classList.add('show'); }
function closeRetryConfirm() { document.getElementById('retryConfirmPanel').classList.remove('show'); }
function doOptionRetry() {
    closeRetryConfirm();
    closeOption();
    if (state.gameMode === 'training') {
        goTrainingBattle(); // TRAINING MODEはデッキ編成を経由しないため直接バトルへ
    } else {
        // STORY MODEは、デッキ編成へ直接ではなく現在の敵のストーリーシーンから再生する。
        // 戦う前の会話が相手の癖を読み取るヒントになるため、RETRY時も見返せるようにする。
        goStoryThenDeck();
    }
}

// OPTION内のRETURN TO TITLE: ロゴシーンまで戻る。確認ポップアップを挟む(ストーリーの進行状況はセーブ済みのまま消えない)。
function openReturnConfirm() { document.getElementById('returnConfirmPanel').classList.add('show'); }
function closeReturnConfirm() { document.getElementById('returnConfirmPanel').classList.remove('show'); }
function doOptionReturnToTitle() {
    closeReturnConfirm();
    closeOption();
    goLogo();
}