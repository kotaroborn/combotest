/**
 * 【憲法三十条】
 * 全文は CONSTITUTION.md を参照。このファイルには埋め込まない
 * (理由: 本文が長く、js/script.js自体のファイルサイズ・初回ダウンロード時間に影響していたため、2026-08-06(67)で分離した)。
 * コードに変更を加える際は、CONSTITUTION.md の該当条文と矛盾しないか必ず確認すること。
 * 条文自体を追加・変更する場合は CONSTITUTION.md を直接編集する(省略・簡略化・要約はしない。全文を維持する。第25条)。
 */

// ============================================================
// 設定・状態管理(DB / state / imgs / trails / cardOutcomes / deckCounts / 各種初期化処理)
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
    DMG: { P: 10, U: 7, M: 35, CLASH: 3, TINY: 1, P_COMBO_STEP: 5, FINISHER: 50, WALL_LAUNCH_BONUS: 2, WALL_IMPACT: 3, MIRACLE: 20, FEINT: 15 }, // FEINT: P+U+Gの反撃パンチ(2026-10-01)  // MIRACLE: 同じカード5枚の技の追撃ダメージ(壁激突込みの合計、2026-09-30) / // P:パンチ勝利 / U:アッパー初撃(2026-09-20、初見のプレイヤーがコンボを知らずに単発で出した時に弱く見えすぎる問題を受け、5→7に引き上げ。コンボ・メテオ側の追撃ダメージ(P_COMBO_STEP等)には触れていないため、メテオまで通した場合の合計は65→67に微増するのみ) / M:メテオ(初撃7+追撃10+追撃15+メテオ35=合計67) / CLASH:相討ち微ダメージ / TINY:ガードされたパンチの反撃 / P_COMBO_STEP:空中パンチ連続ヒットの増加量 / FINISHER:GUARD+PUNCH+GUARD+PUNCH+PUNCH成立時の必殺技(チャージ等の影響を受けない固定値) / WALL_LAUNCH_BONUS・WALL_IMPACT:壁に叩きつける技(必殺技の壁激突・GUARD+PUNCH+UPPERの壁のめり込み)専用(2026-09-26追加)。「壁まで飛ばす力が強いので初撃に微量ダメージ増加、壁に当たること自体にも別枠のダメージ」という要望を受けたもの。WALL_LAUNCH_BONUSは初撃(パンチ/必殺技)のダメージに上乗せする微量ボーナス(他の倍率と一緒に乗算される)。WALL_IMPACTは壁に当たった瞬間の固定ダメージで、TINY/CLASHと同様チャージ・敵の個性(atkMult/defMult)いずれの倍率も適用しない(壁への激突という物理的な衝撃そのもののダメージのため)
    MAX_AIR_PUNCH: 3,
    BREATH_MS: 500, // player.PNG / player2.PNG の呼吸切替間隔
    DECK_TOTAL: 21, // デッキ合計枚数(内訳は編成画面で自由配分)
    GUARD_PIYO_CHANCE: 0.8, // ガード成功時に相手をピヨらせる(しびれさせる)確率(2026-09-30、ガードが弱くなりすぎたため0.5→0.8)。以前は100%固定だったが、
    // UPPER→GUARD→UPPERのような連携で「ピヨりによる無条件敗北(1/2)」がUPPERの空中コンボ突入率を
    // 底上げしすぎる(GUARDを当てるだけで次のUPPERが読み合い無視で通りやすくなる)という懸念から確率制にした。
    // ヒットストップ(2026-09-26追加): 「攻撃側の攻撃絵→一瞬静止→被弾側のダメージ絵(命中の瞬間)→一瞬静止→
    // 振動/移動などの反応」という3拍子の間合いを作る演出。暗転演出(playFinisherBuildup)を伴う技(必殺技・
    // メテオ・PUNCH+PUNCH+UPPER/UPPER+GUARD+UPPERのスーパーアッパー・追撃)、および壁のめり込み技
    // (GUARD+PUNCH+UPPER)など、「最後のコマンドに何かしら付加されている技」に共通で使う。
    // POSE_MS: 攻撃絵を見せてから静止する時間。IMPACT_MS: ダメージ絵(命中の瞬間、効果音・ヒットエフェクト・
    // ダメージ反映を含む)を見せてから、振動/移動などの反応が始まるまでの静止時間。
    HITSTOP: { POSE_MS: 90, IMPACT_MS: 110 }
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
    pNumbed: false, eNumbed: false, numbSureSide: null, // numbSureSide: PARRY!でピヨった側(次の攻防で必ず負ける)
    // しびれフラグ: 次のコマンドの成功率が1/2になる(ガード成功で相手に付与)
    piyoSide: null, // ピヨり演出: どちら側の頭上に出すか(truthyな間、継続して表示される)
    piyoBreakUntil: 0, // ピヨりが割れて分裂する演出の終了時刻(performance.now()基準)。しびれた側の判定が決着した時に使う
    piyoBroken: false, // 割れる演出を開始済みかどうか。trueの間はdraw()側が通常のバウンド表示に戻らないようにする(下記参照)
    pPunchStreak: 0, ePunchStreak: 0, // 地上パンチの連続ヒット数(コンボではなく、単発同士の連続成功を記録)
    pPunchChain: 0, ePunchChain: 0, // 技(PUNCH+PUNCH+UPPER)判定用: 「負けなかった」PUNCHの連続数(あいこも数える。ダメージ周期のpPunchStreakとは別、2026-09-30)
    pGuardStreak: 0, eGuardStreak: 0, // ガード成功の連続回数(同一ターン内のみ。2回で2倍・3回以降は4倍が上限。ターン終了時にリセット)
    pChargeValue: 0, eChargeValue: 0, // チャージの倍率(0=無し、2以上の数値)。ガード成功以外の次のカードで勝敗に関わらず消費される。ターンをまたいで持ち越す
    pChargeIsMax: false, eChargeIsMax: false, // 3連続以降(上位段階)かどうかを表すフラグ。演出の二重オーラ判定に使う(敵ごとにchargeValueの実数値が異なりうるため、実数値ではなくこのフラグで判定する)
    pUpperChargeReady: false, eUpperChargeReady: false, // UPPER→GUARDの連続成功で発動するチャージ(次に出すカードがUPPERの時だけ2倍高く速く強いアッパーになる)。水色の発光で示す。ターンをまたいで持ち越す
    pLastWinWasUpper: false, eLastWinWasUpper: false, // 直前の攻防でこの側がUPPERで勝ったか(UPPER→GUARDの連続検知に使う、毎攻防resolveExchangeの冒頭でリセットする一時フラグ)
    skipNextReposition: false, // UPPER→GUARDの専用着地演出の直後にtrueになり、次の攻防の後退→接近ダッシュ往復を1回だけスキップする
    pComboType: null, eComboType: null, // このターンの5枚ワザ('finisher'=FINISHER_PATTERNSのいずれか(CRASH!), 'miracle'=同じカード5枚, null=該当なし)。ターン開始時に手札から判定する。3枚ワザはpCombos/eCombos(2026-10-01)
    pComboStart: -1, eComboStart: -1, // followup/guardPunchUpper該当時、手札内で該当パターンが始まる位置(0始まり)。finisherは常に0固定
    pCombos: [], eCombos: [], // 3枚ワザ(RUSH/BREAK/FEINT/PARRY)の候補一覧 [{type, start, alive}]。2026-10-01、1ターンに複数のワザが成立できるようにした(5枚ワザは従来どおりpComboType側)
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
    gameMode: 'story', pendingMode: 'story', // 'story' | 'training' | 'substoryBattle' | 'versus'(ローカル対戦。詳細は「ローカル対戦(VERSUS)」節) | 'rush'(BATTLE RUSH。詳細は「BATTLE RUSH」節)
    hpMaxE: 100, // 敵HPの最大値(HPバーの割合計算用)。通常は100固定。BATTLE RUSHのみ敵ごとに変わる
    storyEnemyIndex: 0, // STORY MODE: ENEMY_ORDER内の現在の敵の位置(連戦で進んでいく想定。セーブデータから復元される)
    // サブストーリーバトル(検討中の新機能): プレイヤーがENEMY_PRESETSのいずれかのキャラとして戦う時に使う。
    // いずれもnull/未設定なら通常のSTORY MODE/TRAINING MODEと完全に同じ挙動になる(既存動作に影響しない)。
    pPresetKey: null, // プレイヤー側が借りるENEMY_PRESETSのキー(例: 'ENEMY_01'=Noahとして戦う)
    ePresetKey: null, // 敵側のENEMY_PRESETSキーを直接指定する(通常はstoryEnemyIndexから自動算出するが、これがあれば優先)
    substoryStageNum: null, // 使用する背景のステージ番号(1〜5)を直接指定する(通常はstoryEnemyIndexから自動算出するが、これがあれば優先)
    substoryMusicNum: null, // EXTRA BATTLE中に使うバトル曲の番号(1〜5、bgm_battle_Nに対応)。背景のステージ番号とは独立して指定できる
    requiredHandSize: null, // このターン、場に出さなければならない枚数(1〜5)。設定時は必ずこの枚数ちょうどでなければGO!できない
    soundOn: true, // OPTION画面のサウンドON/OFF。BGM/SEの再生有無に連動する
    bgmVolume: 0.5, // BGM音量(0〜1)。SEを聴き取りやすくするため既定を控えめにしている
    seVolume: 1.0, // SE音量(0〜1)
    introCharAlpha: 1, // バトル開始演出: 味方のフェードイン係数(0〜1)
    introEnemyAlpha: 1, // バトル開始演出: 敵のフェードイン係数(0〜1)。ステージ固有の登場演出のため味方とは別に管理する
    screenFlashAlpha: 0, // 画面全体を白く明滅させる演出(5THステージの敵登場等で使用)
    screenShakeUntil: 0, // 画面全体を揺らす演出の終了時刻(performance.now()基準、メテオ着地等で使用)
    screenShakeMagnitude: 0, // 画面全体の揺れ幅(px)
    bgRevealRadius: 0, // バトル開始演出: 背景を中心から広げる円形クリップの半径(0で真っ暗)
    playerDeck: [], playerDiscard: [], playerHand: new Array(5).fill(null), // 山札/捨札/手札
    enemyRevealedUpTo: 0, // 敵の手のうち、何枚目まで公開済みか
    battleReady: false, // バトル開始演出が完了し、操作可能になったか
    resolving: false
};
let trails = []; // 第24条: dash.PNGの残像
let hitEffects = []; // ヒットエフェクト(命中の瞬間に一瞬表示し、割れるように消える)。技種別ごとに拡張していく想定
// スーパーアッパー/メテオ/必殺技(異なるコマンドを組み合わせ、フィニッシュで攻撃力が上がる技)の直前に挟む、
// 「背景暗転→一時停止→攻撃側が白く発光→発光で暗転が晴れる」演出用の状態。draw()が毎フレーム参照して描画する。
let finisherDarkenAlpha = 0; // 0〜1、画面全体を覆う黒の不透明度
let finisherFlashSide = null; // 'P'または'E'。発光中の攻撃側(該当無しはnull)
let finisherFlashAlpha = 0; // 0〜1、発光の強さ
let finisherFlashCanvasEl = null; // フィニッシュ発光専用のオフスクリーンcanvas(遅延生成、使い回す)
function getFinisherFlashCanvas() {
    if (!finisherFlashCanvasEl) {
        finisherFlashCanvasEl = document.createElement('canvas');
        finisherFlashCanvasEl.width = DB.IMG_SIZE;
        finisherFlashCanvasEl.height = DB.IMG_SIZE;
    }
    return finisherFlashCanvasEl.getContext('2d');
}
// 技種別ごとのヒットエフェクト画像・表示サイズ(ソースpx単位、実際の描画時にDB.SCALEを掛ける)。
// 現時点ではPUNCHのみ(縦32×横5px、32×32pxのソース画像のうち左側5px幅だけを使う)。
// 今後メテオ・アッパー・ガードにも同様の形式で追加していく想定。
const HIT_EFFECT_DEFS = {
    // imgs: コンボ段階/チャージ段階ごとの画像。段階に対応する画像が無ければ1番目(imgs[0])にフォールバックする
    // anim: 消え方の演出タイプ('retreat'=放った側へ少し戻りながら消える, 'rise'=上へ残像しながら消える, 'wobble'=その場で揺れながら消える,
    //       'meteor'=キャラと同じ場所に下から上へ表示されていく, 'wallburst'=壁から飛び出してから落下する)
    // life: このエフェクト専用の表示時間(ms)。省略時はHIT_EFFECT_LIFE(260ms)を使う
    PUNCH: { imgs: ['hit_punch.PNG', 'hit_punch_2.PNG', 'hit_punch_3.PNG'], srcW: 10, srcH: 32, anim: 'retreat' },
    UPPER: { imgs: ['hit_upper.PNG', 'hit_upper_2.PNG'], srcW: 10, srcH: 32, anim: 'rise' }, // 1=通常, 2=2倍(コンボ成立時)
    GUARD: { imgs: ['hit_guard.PNG', 'hit_guard_2.PNG', 'hit_guard_3.PNG'], srcW: 10, srcH: 32, anim: 'wobble' }, // 1=通常, 2=2倍, 3=4倍
    METEOR: { imgs: ['hit_meteor.PNG'], srcW: 32, srcH: 32, anim: 'meteor', life: 500 }, // 被弾側キャラと全く同じ場所・同じ大きさで表示する
    METEOR_LAUNCH: { imgs: ['meteor.PNG'], srcW: 32, srcH: 32, anim: 'meteorLaunch', life: 950 }, // メテオを放つ瞬間、攻撃側に重ねて表示する光のエフェクト(攻撃側が地面に落下し終えるまで持続させる)
    WALL: { imgs: ['hit_wall.PNG'], srcW: 10, srcH: 32, anim: 'wallburst', life: 450 }, // 必殺技で壁に当たった瞬間
};
const HIT_EFFECT_LIFE = 260; // 表示開始から消えるまでの時間(ms)。最初の25%は静止、残りでanimに応じたフェードをしながら消える
// 攻撃側(side)が技(moveType)を命中させた瞬間に呼ぶ。攻撃側キャラの「相手に向いている側の端から3px(ソース基準)」を
// 基準点として、そこにエフェクトの中心を置く(プレイヤーは右端から3px、敵は反転描画のため左端から3pxが同じ意味になる)。
// tier(1〜3、省略時1)は、そのパンチが連続何発目に相当するかを表し、対応する段階の画像を選ぶために使う
// (地上PUNCHの3発周期、空中コンボの1・2発目、追撃・必殺技の各撃、いずれもこのtierで指定する)。
function spawnHitEffect(side, moveType, tier, xOverride, yOverride) {
    const def = HIT_EFFECT_DEFS[moveType];
    if (!def) return;
    hitEffects.push({
        side, moveType, tier: tier || 1,
        x: xOverride !== undefined ? xOverride : getX(side),
        y: yOverride !== undefined ? yOverride : getY(side),
        born: performance.now(),
    });
}

// 技名ポップ(2026-09-27追加): 各技(ラッシュ/ブレイク/クラッシュ/メテオ/ライジング。第36条参照)が発動した瞬間に、
// その英語名を手書き風フォント(Permanent Marker、CDN経由)でキャラの頭上に表示する。「発生時に技名も入れたいが
// 英語で」との要望を受けたもの。技が発動した側(attacker)を渡して呼ぶ。
let techNamePops = [];
const TECH_NAME_POP_LIFE = 1000; // 表示開始から消えるまでの時間(ms)
const TECH_NAME_FONT_FAMILY = "'Permanent Marker', cursive"; // 読み込み前・失敗時はcursiveの汎用フォントにフォールバック
function spawnTechNamePop(side, text) {
    techNamePops.push({ side, text, x: getX(side), y: getY(side), born: performance.now() });
}
let cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン中の各カードの勝敗表現(card-lose/card-shatter)。ターン終了(両者が定位置へ戻り、場のカードが消えた後)にリセットする
let deckCounts = { PUNCH: 7, UPPER: 7, GUARD: 7 }; // デッキ編成(合計21枚、内訳は自由)

// ------- 実績システム(汎用・今後も追加していく前提) -------
// 解除状況はすべてlocalStorageに永続保存し、ブラウザを閉じても解除済みのまま残る。
let unlockedSubStories = []; // 解除済みサブストーリーのenemyIndex(0〜4)の配列
let defeatedEnemyIndices = []; // STORY MODEで一度でも撃破したことのある敵のenemyIndex(0〜4)の配列。
// BONUSの解除状況(SUB STORY/SOUND TEST/COSTUME/SPEED)とは別軸の、恒久的な進行記録として扱う
// (storyEnemyIndexと同様、BONUS ALLリセットの対象には含めない)。
let unlockedSkins = []; // 解除済みコスチュームのセット名('enemy_1'〜'enemy_5'、GIFT CODEで解放したもの('mifune'等)も同じ配列に入る)の配列
let redeemedGiftCodes = []; // 使用済みGIFT CODEの配列(同じコードを二度使えないようにする。BONUS ALLリセットの対象に含む)
let soundTestUnlocked = false; // SOUND TESTが解除済みか(旧条件。新条件はgameClearedOnce、後方互換のため残す)
let battleSpeedX2 = false; // バトル中2倍速が有効か。SPEED機能自体の解放条件はgameClearedOnce(クリア後)。セーブデータに永続化する
// SOUND TEST画面の状態: カテゴリ選択→BGM/SE一覧(6件ずつページ送り)の2階層
let soundTestCategory = null; // null=カテゴリ選択画面、'bgm'または'se'=一覧画面
let soundTestPage = 0; // 一覧画面でのページ番号(0始まり)
const SOUND_TEST_PAGE_SIZE = 6;
let soundTestBgmSource = null; // SOUND TEST専用のBGMプレビュー再生ノード(本編のBGM/SE再生とは独立)。画面のナビゲーション(戻る等)をまたいでも鳴り続ける
let soundTestBgmPlayingName = null; // 現在プレビュー再生中のBGMトラック名(null=何も再生していない)
let soundTestSeSource = null; // SOUND TEST専用のSEプレビュー再生ノード。BGMプレビューとは独立に、単発で重ねて鳴らせる
let soundTestSePlayingName = null; // 現在プレビュー再生中のSEトラック名(null=何も再生していない)
let specialsUsed = { superUpper: false, charge: false, followUp: false, finisher: false, upperGuardUpper: false, guardPunchUpper: false, miracle: false, meteor: false, feint: false, parry: false }; // 各種必殺技を、これまでの対戦を通じて1回でも使ったか(バトルをまたいで積み上げ)。SOUND TESTの解放条件は当初の4種のまま(upperGuardUpper/guardPunchUpperは将来の実績拡張用に記録のみ)
let selectedSkin = null; // 現在選択中のコスチューム('enemy_1'等、nullはデフォルトのプレイヤー見た目)
let gameClearedOnce = false; // STORY MODEを一度でも最後(5人目)までクリアしたか。COSTUMEの解放条件の一部
let costumeUnlockAnnounced = false; // タイトル画面でCOSTUME解放のポップアップを既に一度見せたか(繰り返し表示しないため)
let bonusContentsAnnounced = false; // タイトル画面でBONUS CONTENTS解放のポップアップを既に一度見せたか
let versusUnlocked = false; // 対戦モード(VERSUS)が解放済みか。専用のGIFT CODEでのみ解放する(2026-09-27追加。それまでは常時解放だった)
let perfectWins = 0; // ノーダメージ勝利(PERFECT!!)の回数。RECORDSで表示する(2026-09-30追加)
let tutorialSeen = { deck: false, battle: false }; // はじめてのデッキ編成・Noah戦で出すチュートリアルを既に見たか(2026-10-01追加、セーブ対象)
let recordsHintAnnounced = false; // クリア後の「まだ見つけていない秘密がある…」トーストを既に出したか(2026-09-28追加)
let storyMaxCombo = 0; // STORY MODEのバトルでの最大COMBO(プレイヤー側)。RECORDSで表示する。セーブデータに永続化する(2026-09-28追加)
let rushUnlocked = false; // BATTLE RUSHが解放済みか。専用のGIFT CODEでのみ解放する(2026-09-28追加)
let rushBest = { kills: 0, clearTimeMs: null, maxCombo: 0 }; // BATTLE RUSHの自己ベスト(撃破数・100人撃破時の最速タイム・最大COMBO)。セーブデータに永続化する

// 各敵のストーリーシーン内に仕込む隠しタップで解除するサブストーリー(本文は完成済み。画像は今後配置予定、未配置ならプレースホルダー表示)
// 隠しタップの対象画面(ストーリーシーン3画面のうち何枚目か、0始まり)。敵ごとにバラバラの画面に仕込む。
// 3枚すべてではなく、対応する1枚の時だけ#storyHiddenTapを有効にする。位置は投入予定の絵の想定位置に合わせて設定(2026-09-27、5人目まで設定完了。実際の絵が来たら微調整の可能性あり)。
const STORY_HIDDEN_TAP_SCREEN_BY_ENEMY = {
    ENEMY_01: 1, // 2枚目
    ENEMY_02: 2, // 3枚目(2-3)
    ENEMY_03: 2, // 3枚目(3-3)
    ENEMY_04: 2, // 3枚目(4-3)
    ENEMY_05: 0, // 1枚目
};
// 隠しタップの対象位置(画像内での中心座標、%指定)。指定が無い敵は仮の位置(左上寄り)のままにする。
// w/hを指定すると判定矩形の幅/高さ(%)を既定の20%から変更できる(未指定は20%)。
// ENEMY_01は「ノアの大事な形見」が写っている位置(画像内 x:61%, y:56%あたり)に合わせてある。
const STORY_HIDDEN_TAP_POS_BY_ENEMY = {
    ENEMY_01: { x: 61, y: 56 },
    ENEMY_02: { x: 88, y: 46 }, // リタのぬいぐるみ
    ENEMY_03: { x: 53, y: 27 }, // ガルドが護ったイノチ
    ENEMY_04: { x: 52, y: 35 }, // ジャックの義眼
    ENEMY_05: { x: 26, y: 53.5, h: 35 }, // 指定範囲(x:26%, y:36〜71%あたり)の中心に合わせ、縦方向のみ他より広い判定矩形(高さ35%)にする
};
const STORY_HIDDEN_TAP_DEFAULT_POS = { x: 10, y: 10 }; // 位置未指定の敵はこれまで通り左上寄り(仮)のまま

// 各敵のストーリーシーン内に仕込む隠しタップで解除するサブストーリー(本文は完成済み。画像は今後配置予定、未配置ならプレースホルダー表示)。
// 本編のストーリーシーンと同じく、3枚の画像+テキストで展開する。
const SUBSTORY_BY_ENEMY = {
    ENEMY_01: {
        title: 'ノアの大事な形見',
        screens: [
            { img: 'substory_1_1.PNG', entranceEffect: 'blurIn', text: [
                '3年前。村の教会。\nこの日は孫娘の結婚式だった。',
                '祝いの声と笑顔の中で、\nノアも静かに笑っていた。',
                'ノア「幸せにな。\n孫娘「ありがとう、おじいちゃん。',
                '孫娘のその指には銀の婚約指輪が輝いていた。'
            ] },
            { img: 'substory_1_2.PNG', pageSE: { 4: 'se_deck_minus' }, text: [
                'すると突然、教会の扉が開き、\n人形のような兵を連れた道化師が\n笑って立っていた。',
                '道化師「おめでとう〜。ボクにも祝わせてよ。',
                '突然の襲来にノアや孫娘も傷を負い、\n神聖な教会も、理由もなく破壊されていった。',
                '道化師「これで大体終わり……ん？\nそこのじいさん、まだ、生きてるの？',
                'うずくまるノアをめがけて\n鋭利なナイフが投げられた！'
            ] },
            { img: 'substory_1_3.PNG', entranceSE: 'se_deck_minus', entranceEffect: 'blackRedFlash', text: [
                '孫娘「おじいちゃん！！！！',
                'ノア「……！！！　なぜかばったのじゃ……。\n孫娘「……無事で、よかった……。',
                '孫娘はノアをかばい、しずかに目を閉じた。\nノアは傷ついた体で道化師に立ち向かう。',
                'ノア「……絶対に許さんぞぉ！……貴様ぁぁ……！！'
            ] },
        ],
    },
    ENEMY_02: {
        title: 'リタのぬいぐるみ',
        screens: [
            { img: 'substory_2_1.PNG', text: [
                '“ぬいぐるみを連れて、この地をたずねよ”',
                'ともに暮らしていた\n亡き司祭の言葉を頼りに、\n少女リタは、はるか遠くの村を訪れた。'
            ] },
            { img: 'substory_2_2.PNG', text: [
                'ノア「そのぬいぐるみ……\nやはり来たか。',
                '“ぬいぐるみを持つ者が来たら、\n見定めてほしい”\nノアも亡き司祭から頼みを受けていた。'
            ] },
            { img: 'substory_2_3.PNG', text: [
                'ノア「この村の教会を守るには、\n強さが必要じゃ。',
                'リタはぬいぐるみを置き、\nノアの前に立った。',
                'リタ「わかった。\nなら、証明してあげる……！！'
            ] },
        ],
    },
    ENEMY_03: {
        title: 'ガルドが護ったイノチ',
        screens: [
            { img: 'substory_3_1.PNG', text: [
                'かつて、魔王城の奥に\n封じられた巨大人形があった。',
                '迷い込んだある若き少年は、好奇心から、\nその人形へ手を伸ばしてしまった。',
                'するととつぜん糸が身体に絡みつき、\n巨大人形が目を覚ました。',
                '少年「なに……これ……？'
            ] },
            { img: 'substory_3_2.PNG', text: [
                '異変を聞き駆けつけた門番ガルドの前には、\n糸にあやつられた少年が立っていた。',
                '少年は自らの意志に逆らい、ガルドへ向かってくる。'
            ] },
            { img: 'substory_3_3.PNG', text: [
                '少年「逃げて……！身体が動かない！',
                'ガルド「そうはいかん……おまえを助ける！！',
                '人形の支配を弱めるには、\nあやつられた少年をたおすしかない。\nガルドは拳をかまえた。'
            ] },
        ],
    },
    ENEMY_04: {
        title: 'ジャックの義眼',
        screens: [
            { img: 'substory_4_1.PNG', text: [
                '昔、ある教会に\n司祭の息子がいた。',
                'ある日、その息子は\n教会の外ではぐれ……\nそのまま行方不明になった。'
            ] },
            // exitFade: 最後のページを読み終えたら、画像を黒へフェードアウトする
            { img: 'substory_4_2.PNG', exitFade: true, text: [
                'それから数年後……\n義眼を持つ道化師が現れた。\n名は、ジャック。',
                'ジャックの身体は、\n時おり勝手に動きだし、\n各地の教会を襲った。',
                '司祭もその手にかかり、\n命を落とした。'
            ] },
            // darkUntilPage: 指定ページ(0始まり)までは画像を暗いままにし、そのページでフェードインする
            { img: 'substory_4_3.PNG', darkUntilPage: 1, text: [
                'そこからさらに数年。\nひとりの聖職者がジャックのもとへ現れた。',
                'リタ「はぁ、はぁ……その義眼…！\nやっと見つけた……！\n司祭様のカタキ……ここで倒す！',
                'ジャック「……ボクが？\nふふふ。やられるワケないじゃん…'
            ] },
        ],
    },
    ENEMY_05: {
        title: 'アルヴとヴァル',
        screens: [
            { img: 'substory_5_1.PNG', text: [
                'かつて二つの世界は、\n互いの存在を知らずにいた。',
                'だが近年の生成AIの登場が\n世界の痕跡を結び、\n誰かがその存在に気づきはじめる。',
                'アルヴ「……境界が揺らいでいる。\nお前が来る日も近いということか……。'
            ] },
            { img: 'substory_5_2.PNG', text: [
                'アルヴが感じ取った存在。\nそれは、ヴァルだった。',
                '二人は表裏一体。\n同じ世界に二人が存在することは\n世界の仕組みで許されない。',
                'アルヴ「ならば備えるまでだ。\n私は消えるわけにはいかない。'
            ] },
            { img: 'substory_5_3.PNG', text: [
                'アルヴは、ジャックの義眼を通じて\nジャックを操り、人々の魂を集めていく。',
                'そしてアルヴは、ジャックの集めた魂を器にして、\n仮想ヴァルというべき存在を造り出した。',
                'アルヴ「来い、ヴァルよ。\nお前を討つ……！'
            ] },
        ],
    },
};
// サブストーリーのタイトルを表示する箇所(一覧・解除トースト)で共通して使う、「Ex1:」「Ex2:」…という接頭辞付きの表示名。
// 上から順にEx+(enemyIndex+1)を付ける(隠しタップで解除した順ではなく、常に敵の並び順=ENEMY_ORDERの順)。
function subStoryDisplayTitle(idx) {
    const sub = SUBSTORY_BY_ENEMY[ENEMY_ORDER[idx]];
    return sub ? `Ex${idx + 1}: ${sub.title}` : '';
}
// サウンドテストの一覧(実ファイルはassets/audio/配下に今後配置。未配置の項目は再生時に何も鳴らないだけで、エラーにはしない)
const SOUND_TEST_TRACKS = [
    { name: 'bgm_title', label: 'title' },
    { name: 'bgm_prologue', label: 'opening' },
    { name: 'bgm_story', label: 'story' },
    { name: 'bgm_story_5', label: 'story: Alv' },
    { name: 'bgm_deck', label: 'deck build' },
    { name: 'bgm_battle', label: 'MIFUNE' },
    { name: 'bgm_battle_1', label: 'Noah' },
    { name: 'bgm_battle_2', label: 'Rita' },
    { name: 'bgm_battle_3', label: 'Gald' },
    { name: 'bgm_battle_4', label: 'Jack' },
    { name: 'bgm_battle_5', label: 'Alv' },
    { name: 'bgm_ending', label: 'ending' },
    { name: 'se_select', label: 'SE: メニュー決定 / GO!' },
    { name: 'se_deck_plus', label: 'SE: デッキ+ / カードを出す' },
    { name: 'se_deck_minus', label: 'SE: デッキ- / キャンセル' },
    { name: 'se_menu_open', label: 'SE: OPTION/HOW TOを開く' },
    { name: 'se_refresh', label: 'SE: カードリフレッシュ' },
    { name: 'se_punch', label: 'SE: パンチ' },
    { name: 'se_upper', label: 'SE: アッパー' },
    { name: 'se_guard', label: 'SE: ガード' },
    { name: 'se_guard_2', label: 'SE: ガード(2倍)' },
    { name: 'se_guard_3', label: 'SE: ガード(4倍)' },
    { name: 'se_meteor', label: 'SE: メテオ' },
    { name: 'se_piyo', label: 'SE: ピヨり' },
    { name: 'se_kabe', label: 'SE: down' },
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

// 任意のURLの画像を1枚読み込み、成功/失敗問わず決着したら解決するPromiseを返す汎用ヘルパー。
// タイトルロゴ(title_logo.PNG)のように、既にHTML側の<img src>タグで自然に読み込みが始まっている画像を
// boot()側でも「読み込み完了まで待つ」ために使う(<img>タグ自体は変更しない。同じURLへのリクエストはブラウザ側で
// 共有・重複排除されるため、二重ダウンロードにはならない)。
function preloadImageUrl(url) {
    return new Promise(resolve => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => resolve(null); // 任意アセットのため、読み込めなくても起動をブロックしない
        i.src = url;
    });
}

// battleSpeedX2の影響を受けない、単純なミリ秒待機(演出用のwait()とは別。ローディング表示の猶予時間・タイムアウト計測専用)
function rawWait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// バトル開始前/ストーリー開始前など、画面遷移の直前に必要な画像の読み込みが完了しているかどうかに応じて、
// 簡易ローディング表示(#sceneLoadingScreen)を出し分けるための共通ヘルパー。
// readyPromiseがgraceMsミリ秒以内に解決すれば(=既に読み込み済み、または十分速く終わる場合)、ローディング表示は
// 一切見せない(体感の悪いチラつきを防ぐ)。graceMsを超えてもまだ解決していない場合のみ表示し、実際に解決する
// (またはtimeoutMsに達する)まで待ってから隠す。timeoutMsは、万一何らかの理由で読み込みが完了しない場合の安全策
// (fetchがハングする等)で、経過後は読み込み未完了のまま進行を続ける(永久にローディングのまま止まらないようにするため)。
async function ensureReadyWithLoading(readyPromise, graceMs = 150, timeoutMs = 8000) {
    const winner = await Promise.race([
        readyPromise.then(() => 'ready'),
        rawWait(graceMs).then(() => 'grace')
    ]);
    if (winner === 'ready') return; // 猶予時間内に読み込みが間に合った
    showSceneLoading();
    try {
        await Promise.race([readyPromise, rawWait(timeoutMs)]);
    } finally {
        hideSceneLoading();
    }
}
function showSceneLoading() {
    const el = document.getElementById('sceneLoadingScreen');
    if (!el) return;
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.classList.add('show');
}
function hideSceneLoading() {
    const el = document.getElementById('sceneLoadingScreen');
    if (!el) return;
    el.style.transition = 'opacity 0.2s ease-out';
    el.style.opacity = '0';
    setTimeout(() => { el.classList.remove('show'); }, 200);
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

// ヒットエフェクト画像(パンチ命中時等)。任意アセットのため、未配置でもエラーにしない(その場合はエフェクトが出ないだけ)。
// ソースは32×32pxで統一するが、実際に使うのは左側5px幅の部分のみ(縦32×横5pxの縦長エフェクト)。
[
    'hit_punch.PNG', 'hit_punch_2.PNG', 'hit_punch_3.PNG',
    'hit_upper.PNG', 'hit_upper_2.PNG',
    'hit_guard.PNG', 'hit_guard_2.PNG', 'hit_guard_3.PNG',
    'hit_meteor.PNG', 'hit_wall.PNG', 'meteor.PNG',
].forEach(name => {
    const i = new Image();
    i.onload = () => { imgs[name] = i; };
    i.onerror = () => { /* 任意アセットのため、未配置でもエラーにしない(描画時にimgs[0]へフォールバックする) */ };
    i.src = 'assets/images/effects/' + name;
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
    } else if (state.gameMode === 'rush') {
        const n = rushStageNum(); // BATTLE RUSH: 次に控える中ボスのステージ(中ボスを倒すたびに切り替わる)
        name = n === 1 ? 'bg.PNG' : `bg_${n}.PNG`;
    } else if (state.substoryStageNum) {
        // サブストーリーバトルでステージ番号を直接指定する場合(対戦相手の敵番号とは独立して背景を選べる)
        name = state.substoryStageNum === 1 ? 'bg.PNG' : `bg_${state.substoryStageNum}.PNG`;
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
// enemy_N形式ではない追加コスチューム(GIFT CODE等で解放するもの)の表示名。COSTUME選択画面・解放トーストの両方で使う。
const EXTRA_COSTUME_LABELS = {
    mifune: 'MIFUNE',
};
// 上記のような追加コスチュームは、専用の画像フォルダ(assets/images/characters_enemy/{スキン名}/)を持たず、
// 既存の別セットの画像をそのまま流用したい場合がある。ここに登録したスキンは、読み込み・描画の際に
// 実際の画像フォルダ名としてこちらを使う(未登録のスキンは従来通りスキン名=フォルダ名のまま)。
// 例: 'mifune'はTRAINING MODEで使っている'training'セット(assets/images/characters_enemy/training/)を流用する。
const COSTUME_ASSET_FOLDER = {
    mifune: 'training',
};
function costumeAssetFolder(skinName) {
    return COSTUME_ASSET_FOLDER[skinName] || skinName;
}
// COSTUME選択(OPTION画面のCOSTUME行・BONUS CONTENTSのCOSTUME行、両方で共通の解放条件)。
// enemy_N形式の通常コスチュームは「STORY MODEを一度最後までクリアした(gameClearedOnce)」まで隠す設計だが、
// EXTRA_COSTUME_LABELSに登録された追加コスチューム(GIFT CODE等、ストーリー進行と無関係に解放されるもの)を
// 1つでも持っていれば、gameClearedOnceを問わずCOSTUME自体(延いてはBONUS CONTENTSボタン自体)を解放する。
// これが無いと、ゲーム開始直後にGIFT CODEでMIFUNEを解放しても、BONUS CONTENTS自体が出現せず選べない不具合になる。
// 2026-09-28変更: COSTUMEの行(BONUS/OPTION)は、コスチュームを1つでも手に入れた時点で表示する。
// ただしenemy_N形式(敵1〜5)のコスチュームは、ゲームクリア前は一覧に出るだけで選べない(canChangeCostume参照)。
// 以前はクリア前にEXTRA BATTLEでコスチュームを手に入れても、トーストが出るだけでCOSTUME自体が現れなかった。
function costumeSelectionAvailable() {
    return unlockedSkins.length > 0;
}
function isEnemyCostume(skinName) { return /^enemy_\d+$/.test(skinName); }
// そのコスチュームを今選べるか。GIFT CODE等の追加コスチューム(MIFUNE等)はクリアを問わず選べる
function canChangeCostume(skinName) {
    return !skinName || !isEnemyCostume(skinName) || gameClearedOnce;
}
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
    if (state.gameMode === 'rush') return rushCurrentEnemySetName(); // BATTLE RUSH: 雑魚はtraining(MIFUNE)、中ボスはenemy_N
    if (state.ePresetKey) {
        // サブストーリーバトルで対戦相手を直接指定する場合。'ENEMY_03'→'enemy_3'のように変換する。
        // 対応するグラフィックセットが無いキー(例: 'VAL')は、存在しないフォルダ名を返すことで、
        // 既存のフォールバック(未配置なら自動的にplayer.PNG等を使う仕組み)が自然に働くようにする。
        if (state.ePresetKey === 'MIFUNE') return 'training'; // LOCAL V.S.のMIFUNEはTRAINING MODEと同じ見た目
        const m = state.ePresetKey.match(/^ENEMY_(\d+)$/);
        return m ? 'enemy_' + parseInt(m[1], 10) : 'val';
    }
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
// ============================================================
// カットシーンの文字送り(2026-09-30追加、プロローグ/ストーリー/エンディング/サブストーリー/エピローグ共通)
// ・「名前「」で始まる行は、名前と「を金色にする(.cine-speaker)
// ・文字送り中は▌、読み終えてタップ待ちの時は▼、自動送りの時は■を文末に点滅表示する(data-cine属性でCSSが切り替える)
// ・タップで進む場面では、文字送りの途中でタップすると全文を一気に表示する(cineSkipRequested)
// ============================================================
let cineSkipRequested = false;
function escapeCineHtml(t) { return t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
// 金色にする話し手の名前(セリフを話す人物のみ)。地の文の「」(例: おとぎ話のはずだった「魔王」)は対象外にするため、
// 行頭がこの一覧の名前+「の場合だけ色を付ける(2026-09-30)。新しい話し手を増やす時はここに追加する。
const CINE_SPEAKER_NAMES = ['ヴァル', 'ノア', 'リタ', 'ガルド', 'ジャック', 'アルヴ', '魔王アルヴ', '孫娘', '道化師', '少年', '？？？？'];
const CINE_SPEAKER_RE = new RegExp('^(' + CINE_SPEAKER_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')「');
// 全文から話し手の名前部分(各行頭の「名前「」)の範囲を求める
function cineSpeakerRanges(text) {
    const ranges = [];
    let lineStart = 0;
    for (const line of text.split('\n')) {
        const m = line.match(CINE_SPEAKER_RE);
        if (m) ranges.push([lineStart, lineStart + m[0].length]); // m[0] = 名前+「
        lineStart += line.length + 1;
    }
    return ranges;
}
function renderCineText(text, n, ranges) {
    let html = '', pos = 0;
    for (const [a, b] of ranges) {
        if (a >= n) break;
        html += escapeCineHtml(text.slice(pos, a)) + '<span class="cine-speaker">' + escapeCineHtml(text.slice(a, Math.min(b, n))) + '</span>';
        pos = Math.min(b, n);
    }
    return html + escapeCineHtml(text.slice(pos, n));
}
// 1文字ずつ表示する。isCancelled()がtrueになったら中断してfalseを返す。canSkipがtrueなら途中のタップで全文表示
async function typeCineText(el, text, ms, isCancelled, canSkip) {
    const ranges = cineSpeakerRanges(text);
    el.dataset.cine = 'typing';
    cineSkipRequested = false;
    for (let n = 1; n <= text.length; n++) {
        if (isCancelled()) return false;
        if (canSkip && cineSkipRequested) n = text.length;
        el.innerHTML = renderCineText(text, n, ranges);
        if (n < text.length) await wait(ms);
    }
    cineSkipRequested = false;
    return !isCancelled();
}
// 読み終えた後の表示: 'tap'=▼(タップ待ち) / 'auto'=■(自動送り)
function setCineTextEnd(el, mode) { el.dataset.cine = mode; }
function clearCineText(el) { el.innerHTML = ''; el.dataset.cine = 'typing'; }

// 2026-09-29、テキストと演出を改訂。enter/exitで画面ごとの入り方・終わり方を指定する(playPrologue参照)。
//   enter: 'fade'(黒からフェードイン) / 'flash'(白フラッシュ+画面の揺れ) / 省略(そのまま切り替え)
//   exit:  'fade'(黒へフェードアウト) / 'swirl'(渦を巻くようにフェードアウト) / 省略(そのまま次へ)
const OPENING_SCREENS = [
    { img: 'op_1.PNG', enter: 'fade', text: [
        '2026年、東京……。',
        'むかしも今も、ねむらない都市。\n夢を見つづける都市。',
        '……そして……'
    ] },
    { img: 'op_2.PNG', enter: 'flash', exit: 'fade', text: [
        'おのれの夢をかなえる都市……！！！'
    ] },
    { img: 'op_3.PNG', enter: 'fade', text: [
        'ケンカに明けくれていた主人公ヴァルも、\n父を探すという夢があった……'
    ] },
    { img: 'op_4.PNG', exit: 'swirl', text: [
        'そんなヴァルの目の前に\n突如としてナゾの渦があらわれ、',
        'ヴァルは異世界へと吸い込まれてしまう……',
        'しかし、これが偶然ではないことは\nヴァルはまだ、知るよしもなかった……'
    ] }
];
// オープニング(プロローグ)の画像は、以前はplayPrologue()が呼ばれた時点(ロゴ演出の後)で初めて読み込みを開始していたため、
// 頭出しの猶予が無く表示までの待ちが目立っていた。DB.ASSETSと同様、ページ読み込み直後から先読みを始めることで、
// ロゴ画面が表示されている数秒間を読み込みの猶予時間として使う(playPrologue側の読み込み待ちは、
// このキャッシュ済みPromiseを再利用するだけになるため、通常は即座に解決する)。
// このPromiseはboot()側でも参照し、NOW LOADING表示を隠す前にここまでの読み込み完了を待つ(第X条参照)。
const openingScreensReadyPromise = loadCutsceneScreens(OPENING_SCREENS, 'opening');

let prologueToken = 0; // SKIP時に進行中のタイプライター処理を打ち切るためのトークン



// ------- ストーリーシーン(STORY MODE専用): story_{敵番号}_{画面番号}.PNG(任意アセット)。プロローグと同じ仕組みを流用 -------
// 敵ごとに3画面分の画像・テキストを用意する(例: 1体目=story_1_1〜3.PNG、2体目=story_2_1〜3.PNG)。
// 敵の追加時はこのオブジェクトに ENEMY_0N のキーを追加する(ENEMY_PRESETS/ENEMY_ORDERと合わせて追加すること)。
const STORY_SCREENS_BY_ENEMY = {
    ENEMY_01: [
        { img: 'story_1_1.PNG', text: [
            '異界の渦に巻き込まれて、\nはじめてヴァルが降り立ったのは、\n小さな農村の入り口だった。',
            'そこに、老人の人影があらわれる。'
        ] },
        { img: 'story_1_2.PNG', text: [
            'ノア「見かけない顔だな。\nお前も魔王のしもべか……？',
            'ヴァル「なっ…なんで俺が魔王の……？\nそれよりココは……？'
        ] },
        { img: 'story_1_3.PNG', text: [
            'ノア「名も知らぬ村を襲おうとするとは……！',
            'ノア「ワシの会得した拳法　“乱殴拳”　で\n今度こそ、返り討ちにしてくれるわ！！！'
        ] }
    ],
    ENEMY_02: [
        { img: 'story_2_1.PNG', text: [
            'ノアに勝ち、話を聞くと、\n村の教会のあたりで妙な渦を見かけたという。',
            'ヴァルは吸い込まれた渦とのつながりを\n確かめるため、村の教会を訪ねた。'
        ] },
        // enter:'fade'で黒からフェードイン、spotlightで数秒間だけ周りを暗く中心を明るくする。
        // ページを{ text, shake:true }にすると、その文を表示し終えた瞬間に画面をどかっと揺らす
        { img: 'story_2_2.PNG', enter: 'fade', spotlight: true, text: [
            '教会は古びていて、すでに廃墟になっていた。',
            'そしてそこに立っていたのは、聖職者のリタだった。',
            'リタ「ちょっとーー！ なによ、勝手に入ってきて……',
            'リタ「……っ！',
            { text: 'リタ「アンタみたいなのは\n神聖な教会には入れないんだから！早く出てけ！', shake: true }
        ] },
        { img: 'story_2_3.PNG', text: [
            'リタ「……まだ出てかない気？\nじゃあ、ここの住人として遠慮なく……',
            'リタ「必殺！！“えんじぇるアッパー”で\n追い出してやるよっ！！'
        ] }
    ],
    ENEMY_03: [
        { img: 'story_3_1.PNG', text: [
            'リタとの戦いの最中、\n突然、大きな渦が上空を包み込む。',
            'リタ「なっ…なんなのよ、あの渦……\nもしかしてアンタ、あれを探してたの？',
            'ヴァル「あぁ。あの渦から出てきた魔物を追えば\n何か分かるかもしれないな……',
            'ヴァルは、大きな渦から現れた謎の生物を追うため、\n教会を後にした。'
        ] },
        { img: 'story_3_2.PNG', text: [
            '大きな門にたどり着いたヴァル。',
            '謎の生物はその先の城に向かって飛び去っていった。',
            'ヴァル「アイツは……あの城に何かあるのか？'
        ] },
        { img: 'story_3_3.PNG', text: [
            'ガルド「…やっと。やっと来たか……。\nこの門の先を目指す者よ。',
            'ガルド「この先へは……\n通すわけにはいかん。',
            { text: 'ガルド「なぜならオレは、ここで“守り通す”ことが\n宿命だからな……！！！', shakeBefore: true }
        ] }
    ],
    ENEMY_04: [
        { img: 'story_4_1.PNG', text: [
            '誘われるように魔王の城の中へ\n潜入するヴァル。',
            '？？？？「…ようこそ。ボクの部屋へ。'
        ] },
        { img: 'story_4_2.PNG', text: [
            'ヴァルが見上げると、\n大きな操り人形の上に道化師の姿があった。',
            'ジャック「ボクはジャック。\nよろしくね…ヴァル。',
            'ヴァル「おい、なんでオレのことを……！',
            'ジャック「…ナルホドね…。\nたしかに魔王様と同じニオイだ。\nだから来たんだね…。'
        ] },
        { img: 'story_4_3.PNG', text: [
            { text: 'ジャック「でもその前に\n遊んでいこうよ？！', shakeBefore: true }, // 画像が出た瞬間に画面をどかっと揺らす
            'ジャック「ボクの“天才的なワザの数々”を\nキミにお見せしたいんだ！！！！'
        ] }
    ],
    ENEMY_05: [
        { img: 'story_5_1.PNG', text: [
            '魔王アルヴ「…やはり来たか。ヴァルよ。',
            'アルヴ「キサマがここに来るのは運命なのだ。\n私とキサマは同じ魂をもつ者だからな。'
        ] },
        { img: 'story_5_2.PNG', text: [
            'アルヴ「つまり、この世界のヴァル。\nそれが私ということだ。',
            'ヴァル「お前が、この世界のオレ…だと……？',
            'アルヴ「そうだ。\nこの世界は、キサマの世界と対を成す世界。\nもっとも今は、何の因果か、\n境界が曖昧になってしまっているがな……。',
            'アルヴ「この世界に、同じ魂は永く存在できない。\n私が存在するために、\n私はキサマを排除せねばならん。'
        ] },
        // flash:'pulse': 画像が出た瞬間にピカピカと数回フラッシュし、その後もこの画面の間は3秒ごとにフラッシュし続ける
        { img: 'story_5_3.PNG', flash: 'pulse', text: [
            'アルヴ「……さあ、ヴァルよ。\nキサマの最後だ。',
            'アルヴ「死ぬ気で\n“全てを出し尽くしてみせろ” ……！\nそして、私の野望のための血肉となるがいい！'
        ] }
    ]
};
// 現在対戦中の敵(state.storyEnemyIndex)に対応する3画面分のストーリーを返す
function currentStoryScreens() {
    const id = ENEMY_ORDER[state.storyEnemyIndex % ENEMY_ORDER.length];
    return STORY_SCREENS_BY_ENEMY[id];
}

let storyToken = 0; // SKIP時に進行中のタイプライター処理を打ち切るためのトークン
let storyFlashTimer = null; // flash:'pulse'の画面で、3秒ごとのフラッシュを繰り返すためのタイマー
function stopStoryFlashPulse() {
    if (storyFlashTimer) { clearInterval(storyFlashTimer); storyFlashTimer = null; }
    const el = document.getElementById('storyFlash');
    if (el) { el.style.transition = 'none'; el.style.opacity = '0'; }
}
// 画像部分を短く白く光らせる(times回、ピカピカと)
async function storyFlashBurst(times, token) {
    const el = document.getElementById('storyFlash');
    if (!el) return;
    for (let k = 0; k < times; k++) {
        if (storyToken !== token) return;
        el.style.transition = 'none';
        el.style.opacity = '0.9';
        await wait(70);
        el.style.transition = 'opacity 0.12s ease-out';
        el.style.opacity = '0';
        await wait(110);
    }
}

// ------- エンディングシーン(5人目撃破後のみ再生): ending_1.PNG〜ending_5.PNG(任意アセット)。プロローグ/ストーリーと同じ仕組みを流用 -------
const ENDING_SCREENS = [
    { img: 'ending_1.PNG', text: [
        '激しい戦いは終わった。\nアルヴはひざをつき、しずかに語る。',
        'アルヴ「……キサマの勝ちだ。'
    ] },
    { img: 'ending_2.PNG', text: [
        'アルヴ「私は魔王の血を引いている。',
        'アルヴ「私と対になるキサマにも\n同じ血が流れているはずだ。',
        'ヴァル「……魔王の血？'
    ] },
    { img: 'ending_3.PNG', text: [
        'アルヴ「父に会いたいのだろう。\nそれも私と同じだ。',
        'アルヴ「私の父はキサマの世界にいる。\nならばキサマの父はこちらだ。'
    ] },
    { img: 'ending_4.PNG', text: [
        'アルヴ「せいぜい父を探すがよい。\nキサマの父ならば、\n世界がつながった理由も知っているはず…',
        'そう言うと、アルヴはちりとなり、\n消えていった。'
    ] },
    { img: 'ending_5.PNG', text: [
        'おとぎ話のはずだった「魔王」の血が、\n自分にも流れている。\n自分は本当に元の世界の人間なのか。',
        'ヴァルはこの異世界に残ると決め、\n父と自分自身の正体を探す\n新たな旅をはじめる。'
    ] }
];



// ------- 汎用アクセサ (P/E共通ロジックで扱うためのヘルパー) -------









// 第7条: idleマーカーの時は player.PNG / player2.PNG を時間で交互に呼吸させる








// バトル開始時だけの演出: 手札を裏向きで配り、左から順にめくって表向きにする





// GO!/CANCELは「バトル準備完了」「解決中でない」「場に1枚以上カードがある」の3条件が揃った時だけ押せる

// ターン終了後、場に出したカードをふわっと浮かせながらフェードアウトさせる

updateUI(); // 第1条: 起動直後から5つの空枠を表示する

// ------- STORY MODE: 敵プリセット(枚数配分・よく出す組み合わせは今後ここに設定していく) -------
// deck: PUNCH/UPPER/GUARDの「出やすさ」の重み(枚数感覚でそのまま指定できる)
// favoritePatterns: よく出す組み合わせ(手の並び、例: ['PUNCH','GUARD','PUNCH'])の配列。
//   直近に出した手が、いずれかのパターンの先頭部分と一致していると、そのパターンの続きの手が出やすくなる
//   (複数のパターンが同時に一致する場合は、それぞれの「次の手」の重みが積み上がる)。
//   ただし絶対に完成させるわけではなく、あくまで重みを底上げするだけ(generateEnemyTurnHand参照)。
// firstMoveBias: そのターンの1枚目にだけ追加でかかる重み(通常のdeck比率に加算される)。「一手目に出しがち」を表現する。
const ENEMY_PRESETS = {
    ENEMY_01: {
        name: 'Noah', deck: { PUNCH: 13, UPPER: 4, GUARD: 4 },
        favoritePatterns: [
            ['PUNCH', 'GUARD', 'PUNCH'], // P+G+P(追撃)
            ['PUNCH', 'PUNCH'],          // P+P
            ['PUNCH', 'PUNCH', 'PUNCH'], // P+P+P
            ['PUNCH', 'PUNCH', 'UPPER'], // P+P+U(強化UPPER)
        ],
        noFiveOfAKind: true, // 同じカード5枚(MIRACLE)は出さない(パンチ中心のため偶然そろいやすく、最初の相手として強すぎたため、2026-09-30)
        firstMoveBias: { PUNCH: 10 }, // 一手目はPUNCHが出やすい
        // 最初の相手(チュートリアル役)として、RitaやGaldより強く感じられていたため弱めに調整(2026-09-30)。
        // パンチ中心で読みやすい、という個性はそのまま。
        atkMult: 0.8, // 攻撃力は低め
        defMult: 1.1, // 防御力も少し低め(被弾ダメージ1.1倍)
    },
    ENEMY_02: {
        name: 'Rita', deck: { PUNCH: 8, UPPER: 10, GUARD: 3 },
        favoritePatterns: [
            ['UPPER', 'PUNCH'],           // UPPER始動の空中コンボへ入りたがる
            ['UPPER', 'PUNCH', 'PUNCH'],  // U+P+P(2発止め)を特に好む
            ['UPPER', 'GUARD', 'UPPER'],  // U+G+U(強化UPPER)を狙いたがる
        ],
        avoidPatterns: [
            ['UPPER', 'PUNCH', 'PUNCH', 'PUNCH'], // U+P+Pの後、3発目(メテオ)まではあまり踏み込みたがらない
        ],
        firstMoveBias: { UPPER: 8 }, // 一手目はUPPERが出やすい
        atkMult: 0.85, // 攻撃力は全体的に少し低め(防御力=被弾時のダメージ量は変えないため、ここでは触れない)
        atkMultByMove: { UPPER: 1.1 }, // ただし得意技のUPPERだけは、通常より少し高い(atkMultより優先される)
        alwaysSuperUpperVisual: true, // 通常のUPPERでも、U+P+P/U+G+Uと同じ高さ・速度・残像で放つ(ダメージは変えず見た目の迫力だけ常時アップ。UPPERが得意という個性を演出面でも表現する)
    },
    ENEMY_03: {
        name: 'Gald', deck: { PUNCH: 6, UPPER: 3, GUARD: 12 },
        favoritePatterns: [
            ['GUARD', 'GUARD'],                   // G+G(2倍チャージ)へ入りたがる
            ['GUARD', 'GUARD', 'PUNCH'],          // 2倍後の重いパンチ
            ['GUARD', 'GUARD', 'UPPER'],          // 2倍後の重いアッパー
            ['GUARD', 'GUARD', 'GUARD'],          // さらに我慢してG+G+G(4倍)へ踏み込む
            ['GUARD', 'GUARD', 'GUARD', 'PUNCH'], // 4倍後の重いパンチ
            ['GUARD', 'GUARD', 'GUARD', 'UPPER'], // 4倍後の重いアッパー
            ['GUARD', 'UPPER', 'GUARD'],          // G+U+G(PARRY!): 守りでアッパーを挟み、相手をしびれさせる(2026-10-01追加)
        ],
        avoidPatterns: [
            ['UPPER', 'PUNCH', 'PUNCH'], // 空中コンボを連続させたがらない(機敏さが無い)
            ['PUNCH', 'PUNCH'],          // 素早い連打も苦手
        ],
        firstMoveBias: { GUARD: 10 }, // 一手目はGUARDが出やすい(様子見でまず固める)
        atkMult: 1.15, // 攻撃力は全体的にやや高め(鎧の重さ・巨体)
        defMult: 0.6, // 防御力は高い(被弾ダメージ40%減、鎧で弾く)。2026-09-30、0.8→0.6: アッパーが決まった途端に空中コンボ〜メテオで一気に倒せてしまい弱かったため
        defMultByMove: { UPPER: 1.0 }, // UPPER(すくい上げ)の初撃だけは鎧の上からでも通常どおり入る(決まりやすいが、その後の追撃は硬くて通りにくい)。以前は1.15
        numbFailMult: 1.25, // 自分のガードで相手をしびれさせた時、無条件敗北の確率が通常の1.25倍(50%→62.5%)
        chargeValueTwo: 4, // 通常なら2倍のところ、Galdは4倍になる(演出上の「2連続時」の閾値は変えず、実際の倍率だけ引き上げる)
        chargeValueFour: 5, // 通常なら4倍のところ、Galdは5倍になる
    },
    ENEMY_04: {
        name: 'Jack', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, // トリッキーな道化師: 特定の技への偏りは持たせず、バランス配分のまま
        favoritePatterns: [
            // 揃えば手当たり次第、この作品にある「技」をひと通り多用する(1つの得意技に絞らないのが個性)
            ['PUNCH', 'GUARD', 'PUNCH'],                   // P+G+P(追撃)
            ['PUNCH', 'PUNCH', 'UPPER'],                   // P+P+U(強化UPPER)
            ['PUNCH', 'PUNCH', 'PUNCH'],                   // P+P+P
            ['UPPER', 'PUNCH', 'PUNCH'],                   // U+P+P(空中コンボ)
            ['UPPER', 'GUARD', 'UPPER'],                   // U+G+U(強化UPPER)
            ['GUARD', 'PUNCH', 'GUARD', 'PUNCH', 'PUNCH'], // 必殺技
            ['PUNCH', 'UPPER', 'GUARD'],                   // P+U+G(FEINT!): 攻めると見せてガードで返す、道化師らしいワザ(2026-10-01追加)
        ],
        // firstMoveBiasは意図的に設定しない(一手目も含めて何を出すか読めない、トリッキーさの表現)
        atkMult: 1.2, // 攻撃力は高め
        defMult: 1.05, // 防御力は少し低め(被弾ダメージが通常より5%増える。以前は1.2で、手数を絞る戦法との組み合わせが強すぎたため緩和)
        numbVulnerableMult: 1.25, // ガード成功後のしびりで無条件敗北しやすい(トリッキーだが打たれ弱い)
        doubleHitMult: 0.5, // パンチが命中すると、1発目の半分の威力で2発目が追加でヒットする(合計で通常の1.5倍相当)
    },
    ENEMY_05: {
        name: 'Alv', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, // ラスボス、ヴァルの裏のような存在: 特定の技に絞らず全ワザを網羅する
        favoritePatterns: [
            // Gald系(ガードでチャージを溜めて一気に叩き込む)
            ['GUARD', 'GUARD'], ['GUARD', 'GUARD', 'PUNCH'], ['GUARD', 'GUARD', 'UPPER'],
            ['GUARD', 'GUARD', 'GUARD'], ['GUARD', 'GUARD', 'GUARD', 'PUNCH'], ['GUARD', 'GUARD', 'GUARD', 'UPPER'],
            // Noah/Rita/Jack系(その他の主要な技)
            ['PUNCH', 'GUARD', 'PUNCH'], ['PUNCH', 'PUNCH', 'UPPER'], ['PUNCH', 'PUNCH', 'PUNCH'],
            ['UPPER', 'PUNCH', 'PUNCH'], ['UPPER', 'GUARD', 'UPPER'],
            ['PUNCH', 'UPPER', 'GUARD'], ['GUARD', 'UPPER', 'GUARD'], // FEINT!・PARRY!(2026-10-01追加)
            ['GUARD', 'PUNCH', 'GUARD', 'PUNCH', 'PUNCH'], // 必殺技
        ],
        smallHandThreshold: 2, // 2枚以下の少ない手数の時
        smallHandBias: { PUNCH: 12 }, // ガードを溜める余裕が無いので、PUNCH連打でダメージを稼ごうとする
        atkMult: 1.2, // 攻撃力は高い
        defMult: 0.75, // 防御力も高い(被弾ダメージ25%減、5人の中で最も硬い)
        numbVulnerableMult: 0.6, // しびれ(無条件敗北)に強い(通常0.5→0.3、他の誰よりも打たれ強い)
    },
    // VAL: サブストーリーバトル(検討中の新機能)専用の6人目のエントリ。ENEMY_05(Alv)と中身は完全に同一
    // (デッキ配分・行動パターン・攻撃力/防御力/しびれ耐性すべて)で、名前と扱いのみ異なる。
    // ENEMY_ORDERには含めない(通常のSTORY MODE連戦には登場しない、サブストーリーバトル限定の対戦相手)。
    // 専用グラフィックセットは用意せず、既存のフォールバックにより自然にplayer.PNG等の絵柄になる
    // (VAL=主人公なので、プレイヤーと同じ見た目になること自体が正しい)。
    VAL: {
        name: 'VAL', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 }, // 表示名は大文字のVAL(2026-09-30、表記統一)
        favoritePatterns: [
            ['GUARD', 'GUARD'], ['GUARD', 'GUARD', 'PUNCH'], ['GUARD', 'GUARD', 'UPPER'],
            ['GUARD', 'GUARD', 'GUARD'], ['GUARD', 'GUARD', 'GUARD', 'PUNCH'], ['GUARD', 'GUARD', 'GUARD', 'UPPER'],
            ['PUNCH', 'GUARD', 'PUNCH'], ['PUNCH', 'PUNCH', 'UPPER'], ['PUNCH', 'PUNCH', 'PUNCH'],
            ['UPPER', 'PUNCH', 'PUNCH'], ['UPPER', 'GUARD', 'UPPER'],
            ['GUARD', 'PUNCH', 'GUARD', 'PUNCH', 'PUNCH'],
        ],
        smallHandThreshold: 2,
        smallHandBias: { PUNCH: 12 },
        atkMult: 1.2,
        defMult: 0.75,
        numbVulnerableMult: 0.6,
    },
};
// MIFUNE: LOCAL V.S.専用(GIFT CODEでMIFUNEコスチュームを持っている人だけ選べる、2026-09-30追加)。見た目はTRAINING MODEのMIFUNE(trainingセット)。
// 防御力は全体的に低い(被弾ダメージ1.3倍)が、攻撃力は全体的に高い(1.3倍)。ENEMY_ORDERには含めない。
ENEMY_PRESETS.MIFUNE = {
    name: 'MIFUNE', deck: { PUNCH: 7, UPPER: 7, GUARD: 7 },
    atkMult: 1.3,
    defMult: 1.3,
};
const ENEMY_ORDER = ['ENEMY_01', 'ENEMY_02', 'ENEMY_03', 'ENEMY_04', 'ENEMY_05']; // 連戦の順番

// サブストーリーバトル(検討中の新機能)の対戦カード設定。
// キー: プレイヤーが操作する(=デッキ・特性を借りる)キャラのENEMY_PRESETSキー。
// opponent: 対戦相手のENEMY_PRESETSキー。stage: 使用する背景のステージ番号(1〜5、対戦相手の番号とは独立)。
const SUBSTORY_BATTLE_CONFIG = {
    ENEMY_01: { opponent: 'ENEMY_04', stage: 2, music: 4 }, // Noah vs Jack, 2ndステージ背景、4thステージの曲
    ENEMY_02: { opponent: 'ENEMY_01', stage: 1, music: 1 }, // Rita vs Noah, 1stステージ背景、1stステージの曲
    ENEMY_03: { opponent: 'ENEMY_04', stage: 4, music: 3 }, // Gald vs Jack, 4thステージ背景、3rdステージの曲
    ENEMY_04: { opponent: 'ENEMY_02', stage: 3, music: 2 }, // Jack vs Rita, 3rdステージ背景、2ndステージの曲
    ENEMY_05: { opponent: 'VAL', stage: 5, music: 5 },      // Alv vs Val, 5thステージ背景、5thステージの曲
};
// サブストーリーバトルの対戦相手の表示名を返す。プレイヤーがSTORY MODEでまだ遭遇したことのない敵は
// 「？？？」にしてネタバレを防ぐ。VAL(主人公として認識されている)は例外で、いつ戦っても実名を表示する。
function substoryBattleOpponentName(opponentKey) {
    if (opponentKey === 'VAL') return ENEMY_PRESETS.VAL.name;
    const idx = ENEMY_ORDER.indexOf(opponentKey);
    if (idx !== -1 && !isEnemyDefeated(idx)) return '？？？';
    return ENEMY_PRESETS[opponentKey].name;
}
const STAGE_ORDINALS = ['1ST', '2ND', '3RD', '4TH', '5TH']; // ENEMY_ORDERのインデックスに対応する序数表記

// 現在のステージ表記(例: '1ST STAGE')を返す。STORY MODEの5人目(最終)のみ'FINAL STAGE'にする。
// TRAINING MODEは'TRAINING'、EXTRA BATTLE(サブストーリーバトル)は'EXTRA'を返す
// (バトル開始演出やターン表示の上段に、ステージ表記の代わりとして使われる)。
function currentStageLabel() {
    if (state.gameMode === 'training') return 'TRAINING';
    if (state.gameMode === 'substoryBattle') return 'EXTRA';
    if (state.gameMode === 'rush') return 'BATTLE RUSH';
    if (state.gameMode === 'versus') return 'LOCAL V.S.'; // ローカル対戦(2026-09-27、モード表示名を「VERSUS」から変更)
    if (state.gameMode !== 'story') return '';
    if (state.storyEnemyIndex === ENEMY_ORDER.length - 1) return 'FINAL STAGE'; // 5人目(最終)のみ特別表記
    const ordinal = STAGE_ORDINALS[state.storyEnemyIndex] || (state.storyEnemyIndex + 1) + 'TH';
    return ordinal + ' STAGE';
}

// ------- シーン管理 (プロローグ → タイトル → バトル) -------






// バトル開始演出: 暗転 → 味方/敵がふわっと表示 → 背景が中心から拡大表示 → BATTLE START(左からディゾルブ→中央停止→拡大しつつ消える)






// ------- HOW TOポップアップ(ブラウザ機能ではなく画面内オーバーレイ) -------




// ------- OPTION画面 -------








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
    if (Array.isArray(save.unlockedSubStories)) unlockedSubStories = save.unlockedSubStories;
    if (Array.isArray(save.defeatedEnemyIndices)) defeatedEnemyIndices = save.defeatedEnemyIndices;
    if (Array.isArray(save.unlockedSkins)) unlockedSkins = save.unlockedSkins;
    if (Array.isArray(save.redeemedGiftCodes)) redeemedGiftCodes = save.redeemedGiftCodes;
    if (typeof save.soundTestUnlocked === 'boolean') soundTestUnlocked = save.soundTestUnlocked;
    if (typeof save.battleSpeedX2 === 'boolean') battleSpeedX2 = save.battleSpeedX2;
    if (save.specialsUsed) {
        specialsUsed = {
            superUpper: !!save.specialsUsed.superUpper,
            charge: !!save.specialsUsed.charge,
            followUp: !!save.specialsUsed.followUp,
            finisher: !!save.specialsUsed.finisher,
            upperGuardUpper: !!save.specialsUsed.upperGuardUpper,
            guardPunchUpper: !!save.specialsUsed.guardPunchUpper,
            miracle: !!save.specialsUsed.miracle,
            meteor: !!save.specialsUsed.meteor,
            feint: !!save.specialsUsed.feint,
            parry: !!save.specialsUsed.parry,
        };
    }
    if (typeof save.selectedSkin === 'string' || save.selectedSkin === null) selectedSkin = save.selectedSkin;
    if (typeof save.gameClearedOnce === 'boolean') gameClearedOnce = save.gameClearedOnce;
    if (typeof save.costumeUnlockAnnounced === 'boolean') costumeUnlockAnnounced = save.costumeUnlockAnnounced;
    if (typeof save.bonusContentsAnnounced === 'boolean') bonusContentsAnnounced = save.bonusContentsAnnounced;
    if (typeof save.versusUnlocked === 'boolean') versusUnlocked = save.versusUnlocked;
    if (typeof save.rushUnlocked === 'boolean') rushUnlocked = save.rushUnlocked;
    if (typeof save.storyMaxCombo === 'number') storyMaxCombo = save.storyMaxCombo;
    if (typeof save.recordsHintAnnounced === 'boolean') recordsHintAnnounced = save.recordsHintAnnounced;
    if (save.tutorialSeen) tutorialSeen = { deck: !!save.tutorialSeen.deck, battle: !!save.tutorialSeen.battle };
    if (typeof save.perfectWins === 'number') perfectWins = save.perfectWins;
    if (save.rushBest25 && typeof save.rushBest25 === 'object') { // 2026-09-30: 25人制に変わったため、100人制時代の記録(rushBest)は引き継がない
        rushBest = {
            kills: typeof save.rushBest25.kills === 'number' ? save.rushBest25.kills : 0,
            clearTimeMs: typeof save.rushBest25.clearTimeMs === 'number' ? save.rushBest25.clearTimeMs : null,
            maxCombo: typeof save.rushBest25.maxCombo === 'number' ? save.rushBest25.maxCombo : 0,
        };
    }
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
// side: 技を出した側('P'/'E')。2026-09-30、RECORDSの「TECHNIQUES」に使うため、敵(E)が出した技は記録しないようにした
// (以前は敵が技を出してもプレイヤーの実績として記録されていた)。
function markSpecialUsed(key, side) {
    if (side === 'E') return;
    // TRAINING MODE・LOCAL V.S.で使った技はRECORDSに記録しない(HOW TO TRAINING / HOW TO LOCAL V.S.の説明どおり、2026-10-01)
    if (state.gameMode === 'training' || state.gameMode === 'versus') return;
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
    startLoopingSE('se_refresh'); // リフレッシュ演出が終わるまでループ再生する

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
    stopLoopingSE();
}

function adjustDeck(type, delta) {
    const next = deckCounts[type] + delta;
    if (next < 0) return;
    const total = deckCounts.PUNCH + deckCounts.UPPER + deckCounts.GUARD - deckCounts[type] + next;
    if (total > DB.DECK_TOTAL) return; // 21枚を超えない
    deckCounts[type] = next;
    playSE(delta > 0 ? 'se_deck_plus' : 'se_deck_minus'); // 実際に増減できた時だけ鳴らす(上限/下限で弾かれた場合は鳴らさない)
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
    const setName = currentEnemySetName();
    const enemyName = setName + '_' + key + '.PNG';
    if (imgs[enemyName]) return enemyName;
    // そのポーズの絵が未配置なら、同じキャラの立ち絵(player.PNG)で代用する(2026-09-30: 制作途中のDOLL等で、
    // 未配置のポーズだけ主人公の絵に入れ替わってしまうのを防ぐ)。立ち絵も無い場合は従来通り主人公の絵
    const ownIdle = setName + '_player.PNG';
    return imgs[ownIdle] ? ownIdle : baseName;
}

// プレイヤー側の描画名を解決する。サブストーリーバトル中(state.pPresetKey)は、選択中のコスチュームより優先して
// 借りているキャラのグラフィックセット(例: Noahなら'enemy_1_player.PNG')を使う。それ以外は、実績で解除した
// コスチューム(selectedSkin)が選択されていれば、敵専用グラフィックとして読み込み済みの同じ画像セットを流用する。
// いずれにも該当しない、または該当画像が読み込まれていない場合は通常のプレイヤー画像を返す。
function playerSpriteName(baseName) {
    let skin = selectedSkin;
    // ローカル対戦(VERSUS)も、1Pが選んだキャラ(pPresetKey)の見た目で固定する(コスチュームは反映しない。'VAL'は既定の見た目)
    if ((state.gameMode === 'substoryBattle' || state.gameMode === 'versus') && state.pPresetKey) {
        const m = state.pPresetKey.match(/^ENEMY_(\d+)$/);
        skin = state.pPresetKey === 'MIFUNE' ? 'mifune' : m ? 'enemy_' + parseInt(m[1], 10) : null;
    }
    if (!skin) return baseName;
    const key = baseName.replace('.PNG', '');
    // COSTUME_ASSET_FOLDERに登録されたスキン(例: 'mifune'→'training')は、実際に読み込んだ画像セットの
    // フォルダ名で解決する(loadEnemySet側もこのマッピング先の名前で読み込んでいるため、揃える必要がある)。
    const skinName = costumeAssetFolder(skin) + '_' + key + '.PNG';
    return imgs[skinName] ? skinName : baseName;
}

function applyCardVisual(el, type) {
    const fname = type ? CARD_IMG_MAP[type] : null;
    const img = fname ? imgs[fname] : null;
    if (img) {
        const path = `assets/images/cards/${fname}`;
        el.style.backgroundImage = `url('${path}')`;
        // CSS変数にも同じ画像を複製して持たせておく(card-shatter演出の::before/::afterが、
        // 分裂した破片としてこの絵柄を複製表示する際に参照する)。ここだけは相対パスではなく
        // 絶対URL(new URLで解決)を使う必要がある: CSSのvar()内のurl()は「変数を設定した場所」ではなく
        // 「var()を実際に使っている(参照している)スタイルシートの場所」を基準に解決されるため、
        // css/style.css側で参照すると`css/assets/images/cards/...`という誤ったパスになり、画像が
        // 読み込めず割れた破片が無地になってしまう(実機で発生・報告を受けて特定した不具合)。
        el.style.setProperty('--card-img', `url('${new URL(path, document.baseURI).href}')`);
        el.innerText = '';
        el.removeAttribute('data-letter'); // 画像表示時は文字フォールバック用属性を残さない(card-shatter側は--card-imgを使う)
    } else {
        el.style.backgroundImage = 'none';
        el.style.removeProperty('--card-img');
        const letter = type ? type[0] : '';
        el.innerText = letter;
        // card-shatter演出の::before/::afterが`content: attr(data-letter)`でこの文字を複製表示するために必要
        // (カード画像が用意されておらず文字表示にフォールバックしている場合、--card-imgが無いため画像複製ができず、
        // 以前はここが空のままで「無地のカードになる」不具合があった。詳細はstyle.css側のコメントを参照)。
        if (letter) el.setAttribute('data-letter', letter); else el.removeAttribute('data-letter');
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
    return audioCtx;
}
// 実際に音を鳴らす直前(バッファソースの作成・開始前)は、こちらを必ず経由する。AudioContextがsuspended状態の場合、
// resume()の完了を確実に待ってから返す。resume()はPromiseを返す非同期処理のため、awaitせずに次の処理(バッファ
// ソースの作成・開始)へ進んでしまうと、resume完了前に音を鳴らそうとすることになり、JSエラーは出ないのに実際には
// 音が鳴らない(タブをバックグラウンドに回してAudioContextがsuspendedになった後、OPTIONで手動でサウンドをONに
// 戻しても再生が再開しない)という不具合が実際に発生したため、この待機を徹底する専用のヘルパーに分離した。
async function getReadyAudioCtx() {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { /* 稀に失敗することがあるが、ここでは無視して呼び出し元の処理を続けさせる */ }
    }
    return ctx;
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
let piyoGainNode = null; // se_piyo専用の減衰ノード。常にSE音量の半分程度で再生するために使う
function getPiyoGainNode() {
    if (!piyoGainNode) {
        piyoGainNode = getAudioCtx().createGain();
        piyoGainNode.gain.value = 0.5; // 固定で半分に減衰させる
        piyoGainNode.connect(getSeGainNode()); // 共通のSE音量ノードの後段に繋ぐことで、音量スライダーの変更にも自動的に追従する
    }
    return piyoGainNode;
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
let currentBgmName = null; // 現在実際に再生中のBGM名。stopBGMで必ずnullに戻す(同一BGMの多重再生防止と、停止後に同じ曲名でも再度鳴らせるようにするため)
let lastBgmName = null; // 直近にplayBGMで再生を試みたBGM名。stopBGMを呼んでも(soundOFFやK.O.等で一時的に止まっていても)保持され続け、setSound(true)での再開時に参照する
let bgmToken = 0; // BGM要求の世代カウンタ。stopBGM()や新たなplayBGM()呼び出しのたびに進める。
// 読み込み待ち中の古いplayBGM呼び出しが後から解決しても、この値が変わっていれば「自分より後の要求で上書き済み」と判断して再生を中断する。
// 同名のBGMを止めてすぐ同じ名前で鳴らし直すような操作(SOUND TESTを閉じてすぐ開き直す等)でも、
// name比較だけでは区別できない世代のズレをここで確実に検出できる。
const bgmBufferCache = {}; // 一度読み込んだBGMのAudioBufferをキャッシュ(再入場のたびの再読み込みを省く)

// 指定したBGMを、実際に再生はせず読み込み(fetch+decode)だけ先に済ませておく。boot()がNOW LOADING中にこれを
// 呼ぶことで、実際にplayBGMが呼ばれる時点(プロローグ開始時)ではbgmBufferCacheに既に載っており、即座に鳴らせる。
// playBGM側と同じbgmBufferCacheを参照・共有するため、二重に読み込むことはない。
// fallbackNameを指定すると、nameが未配置の場合にそちらを試す(playBGMのfallbackName引数と全く同じ考え方)。
// フォールバック後のbufferであっても、nameキーにそのまま紐付けてキャッシュする(playBGM側と同じ挙動なので、
// 後でplayBGM(name, fallbackName)が呼ばれた時、bgmBufferCache[name]が既に定義済みとなり即座に再生できる)。
async function preloadBgm(name, fallbackName) {
    if (bgmBufferCache[name] !== undefined) return bgmBufferCache[name];
    let buffer = await loadAudioBuffer('bgm', name);
    if (!buffer && fallbackName) {
        buffer = bgmBufferCache[fallbackName];
        if (buffer === undefined) {
            buffer = await loadAudioBuffer('bgm', fallbackName);
            bgmBufferCache[fallbackName] = buffer;
        }
    }
    bgmBufferCache[name] = buffer; // 未配置(null)の場合もその結果自体をキャッシュし、後で再度fetchし直さないようにする
    return buffer;
}

// 指定したBGMをシームレスループで再生する。既に同じBGMがリクエスト/再生中なら何もしない。
// state.soundOnがfalseの場合、次にONにした時すぐ再生できるよう読み込みだけ行い、実際の再生はしない。
// 指定したBGMをシームレスループで再生する。既に同じ要求(name)がリクエスト/再生中なら何もしない。
// fallbackNameを指定すると、nameが未配置の場合にそちらを試す(例: ステージ別BGMが無ければ汎用バトルBGMを流す)。
async function playBGM(name, fallbackName) {
    if (currentBgmName === name) return;
    stopBGM(); // この中でcurrentBgmNameのクリア・bgmTokenの更新が行われる
    currentBgmName = name; // stopBGM()の後に設定する(stopBGM内でnullにリセットされるため、この順序でないと上書きされてしまう)
    lastBgmName = name; // setSound(true)での再開用に、こちらは停止後も保持され続ける
    const myToken = bgmToken; // 自分の世代は、stopBGM()の後で確定した値を記録する(先に記録すると、直後のstopBGM内の加算で即座に自分自身が無効化されてしまうため)

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
    // 読み込み中に、別のBGM要求(同名の再要求も含む)やstopBGM()の呼び出しで世代が進んでいたら、この呼び出しは中断する
    if (bgmToken !== myToken) return;
    if (!buffer || !state.soundOn) return;

    const ctx = await getReadyAudioCtx();
    // resumeを待っている間に、別のBGM要求やstopBGM()で世代が進んでいた場合はここでも中断する
    if (bgmToken !== myToken) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // AudioBufferSourceNodeのloopはサンプル単位でシームレス
    source.connect(getBgmGainNode());
    source.start(0);
    currentBgmSource = source;
}

function stopBGM() {
    bgmToken++; // 保留中のplayBGM呼び出しがあれば、この時点で確実に無効化する
    if (currentBgmSource) {
        try { currentBgmSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        currentBgmSource.disconnect();
        currentBgmSource = null;
    }
    currentBgmName = null; // 「今何の曲が鳴っているか」の記録も必ずクリアする。これをしないと、実際には停止しているのに
    // playBGM側の「同じ名前なら何もしない」ガードが古い名前を見て誤って早期returnしてしまい、次に同じ曲名で
    // playBGMを呼んでも無音のままになる不具合が実際に発生した(K.O.後、CONTINUEで同じ曲のバトルへ戻る場合など)。
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
    const ctx = await getReadyAudioCtx();
    if (!state.soundOn) return; // resumeを待っている間にOFFにされた場合も考慮
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(name === 'se_piyo' ? getPiyoGainNode() : getSeGainNode()); // se_piyoは常に半分程度の音量に抑える
    source.start(0);
}

let loopingSeSource = null; // ループ再生中のSEノード(デッキリフレッシュ中の演出音等、開始→明示的に停止するまで鳴り続けるSE用)
// ループ再生を開始する。既に何か鳴っていれば先に止める。名前を明示的に指定して呼んだstopLoopingSE()でのみ止まる。
// 未配置でもエラーにはしない(代用もしない。ループ音は無くても支障が無いよう作る想定のため)。
async function startLoopingSE(name) {
    stopLoopingSE();
    if (!state.soundOn) return;
    let buffer = seBufferCache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer('se', name);
        seBufferCache[name] = buffer;
    }
    if (!buffer || !state.soundOn) return;
    const ctx = await getReadyAudioCtx();
    if (!state.soundOn) return; // resumeを待っている間にOFFにされた場合も考慮
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(getSeGainNode());
    source.start(0);
    loopingSeSource = source;
}
function stopLoopingSE() {
    if (loopingSeSource) {
        try { loopingSeSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        try { loopingSeSource.disconnect(); } catch (e) { /* 何もしない */ }
        loopingSeSource = null;
    }
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

async function boot() {
    // オープニング(ロゴ/プロローグ)〜タイトルのうち「重い」素材(プロローグ4画面ぶんの画像・プロローグBGM・
    // タイトルロゴ画像)は、NOW LOADING表示を隠す前にここで読み込み完了を待つ(この3つはページ読み込み直後から
    // 既に並行して先読みが始まっているため、実際にはここで待つのはその残り時間だけで済むことが多い)。
    // これ以外のバトル用画像(DB.ASSETS)・背景・STORY MODE各ステージの画像等は、従来通りここでは待たない
    // (バトル/ストーリー演出そのものの数秒間を読み込みの猶予時間として使う方針は変更しない)。
    const bootAssetsReadyPromise = Promise.all([
        openingScreensReadyPromise,
        preloadBgm('bgm_prologue'),
        preloadImageUrl('assets/images/logo/title_logo.PNG')
    ]);
    // 万一これらの読み込みが何らかの理由で完了しない(ネットワーク切断等でfetchがハングする等)場合の安全策。
    // 8秒経っても決着しなければ、読み込み未完了のまま起動を続行する(NOW LOADINGが永久に残る事態を避ける)。
    const bootAssetsTimeoutPromise = new Promise(resolve => setTimeout(resolve, 8000));

    // 以下の初期化処理は必ずtry/catchで囲み、万一どこかで予期しない例外が発生しても、
    // NOW LOADING表示だけは確実に解除する(でないと画面が永久に「NOW LOADING」のまま止まってしまうため)。
    try {
        applySaveDataOnBoot(); // 進行状況・デッキ編成・サウンド設定をセーブデータから復元
        if (selectedSkin) loadEnemySet(costumeAssetFolder(selectedSkin)); // 前回セッションで選択済みのコスチュームがあれば、対戦する敵に関わらずここで先読みしておく

        // ▼▼▼ 動作確認用の一時デバッグ設定 ▼▼▼
        // 友人テスト用に、エンディングを見なくてもBONUS CONTENTS/SOUND TESTが見られるよう強制的に解放している。
        // あわせて、SUB STORY・COSTUMEも全解放しておく(隠しタップやサブストーリー閲覧を経由しなくても確認できるように)。
        // セーブ済みデータの復元(直前のapplySaveDataOnBoot)より後に上書きすることで、
        // 既存のセーブデータがあっても確実に解放状態になるようにしている。
        // 【本番リリース前に必ずこのブロックを削除すること】
        gameClearedOnce = true;
        unlockedSubStories = [0, 1, 2, 3, 4]; // 5体分すべてのサブストーリーを解放
        unlockedSkins = ['enemy_1', 'enemy_2', 'enemy_3', 'enemy_4', 'enemy_5', 'mifune']; // 5体分すべてのコスチューム+MIFUNE(GIFT CODE限定)を解放
        versusUnlocked = true; // 対戦モード(VERSUS)もGIFT CODEなしで確認できるようにしておく
        rushUnlocked = true; // BATTLE RUSHもGIFT CODEなしで確認できるようにしておく
        // ▲▲▲ 動作確認用の一時デバッグ設定 ▲▲▲

        preloadSE(); // SEは軽量なので先読みしておく(起動をブロックしない非同期処理)
        document.getElementById('startBtn').disabled = false;
        document.getElementById('trainingBtn').disabled = false;
        document.getElementById('versusBtn').disabled = false;
        document.getElementById('rushBtn').disabled = false;
        document.getElementById('optionBtn').disabled = false;
        updateTitleContinueVisibility();
        updateVersusButtonVisibility(); // GIFT CODEでのみ解放するVERSUSボタンの表示を、復元済みのversusUnlockedに合わせる
        updateRushButtonVisibility(); // BATTLE RUSHボタンも同様
        updateSpeedUI(); // セーブデータから復元したbattleSpeedX2をボタン表示に反映する
    } catch (e) {
        console.error('boot()の初期化処理でエラーが発生しましたが、NOW LOADINGは解除して起動を続行します:', e);
    }

    try {
        await Promise.race([bootAssetsReadyPromise, bootAssetsTimeoutPromise]);
    } catch (e) {
        console.error('boot()のプロローグ素材読み込み待機でエラーが発生しましたが、NOW LOADINGは解除して起動を続行します:', e);
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
    layoutTitleMenu();
}

// 対戦モード(VERSUS)ボタンの表示を、専用GIFT CODEでの解放状態(versusUnlocked)に合わせる。
// 未解放時はボタン自体を隠す(titleContinueBtn/bonusContentsBtnと同じ、隠し要素の表示パターン)。
function updateVersusButtonVisibility() {
    const btn = document.getElementById('versusBtn');
    if (btn) btn.style.display = versusUnlocked ? '' : 'none';
    layoutTitleMenu();
}
// BATTLE RUSHボタンの表示を、専用GIFT CODEでの解放状態(rushUnlocked)に合わせる(VERSUSと同じパターン)
function updateRushButtonVisibility() {
    const btn = document.getElementById('rushBtn');
    if (btn) btn.style.display = rushUnlocked ? '' : 'none';
    layoutTitleMenu();
}
// タイトルのメニューを、表示中のボタンだけで下から詰めて並べる(2026-09-28追加)。OPTIONは常に最下部。
// 未解放で隠れているボタンの分の隙間は作らない。表示/非表示を切り替える各関数の最後で呼ぶ。
const TITLE_MENU_ORDER = ['titleContinueBtn', 'startBtn', 'trainingBtn', 'versusBtn', 'rushBtn', 'bonusContentsBtn', 'optionBtn']; // 上から順
const TITLE_MENU_BOTTOM = 12;  // 最下段(OPTION)の位置(bottom %)
const TITLE_MENU_STEP = 5.2;   // ボタン同士の間隔(%)
function layoutTitleMenu() {
    const visible = TITLE_MENU_ORDER.map(id => document.getElementById(id))
        .filter(el => el && getComputedStyle(el).display !== 'none');
    visible.reverse().forEach((el, i) => { el.style.bottom = (TITLE_MENU_BOTTOM + i * TITLE_MENU_STEP) + '%'; });
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
    // サブストーリーバトル(EXTRA BATTLE)の状態(pPresetKey等)が残ったままだと、この後NEW GAME等で
    // 新しく始まるSTORY MODEのバトルにまで意図せず引き継がれてしまう(対戦相手・デッキ配分・背景等が
    // サブストーリーバトルのものになってしまう不具合が実際に発生した)。タイトルへ戻る経路はここに集約されて
    // いるため、endSubstoryBattle()は必ず呼ぶ(サブストーリーバトル中でない場合は何もしない安全な処理)。
    endSubstoryBattle();
    exitVersusLayout(); // ローカル対戦(VERSUS)の上下分割レイアウトも必ず解除する(対戦中でない場合は何もしない)
    endRush(); // BATTLE RUSHのタイマー・進行中の演出も必ず止める(RUSH中でない場合は何もしない)
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
    content.style.filter = 'none'; // 前回再生時の暗転(ぼかし)が残らないようにリセットする
    content.style.transform = 'none'; // 前回再生時の渦(回転・縮小)も残らないようにリセットする
    content.classList.remove('cine-shake');
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    await loadCutsceneScreens(OPENING_SCREENS, 'opening'); // 表示を始める前に4画面分の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)
    if (prologueToken !== myToken) return; // 読み込み待ちの間にSKIPされていたら中断

    for (let i = 0; i < OPENING_SCREENS.length; i++) {
        const screen = OPENING_SCREENS[i];
        if (prologueToken !== myToken) return; // SKIPされていたら中断

        if (screen.enter === 'flash') {
            // 白フラッシュ+se_meteor+画面の一時的な揺れの後に画像を見せる演出。
            // フラッシュが白一色になっている間(cineFlashのkeyframe参照)に裏で画像を差し替えることで、
            // フラッシュが引いた瞬間に新しい画像が既に見えている、という自然な見え方になる。
            playSE('se_meteor');
            triggerCineFlash('prologueFlash');
            content.classList.remove('cine-shake');
            void content.offsetWidth;
            content.classList.add('cine-shake');
            await wait(250);
            if (prologueToken !== myToken) return;
        }

        textEl.innerText = '';
        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/opening/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        if (screen.enter === 'fade') {
            // 黒からフェードインで始める
            content.style.transition = 'none';
            content.style.opacity = '0';
            await wait(30); // 直前のopacity:0が確実に描画されてから遷移を開始させる
            content.style.transition = 'opacity 2s ease-in';
            content.style.opacity = '1';
            await wait(2000);
            if (prologueToken !== myToken) return;
        }

        // textは通常は1画面1ページの文字列だが、同じ画像のまま複数ページ分のテキストを送りたい場合は配列にできる
        const pages = Array.isArray(screen.text) ? screen.text : [screen.text];
        for (let p = 0; p < pages.length; p++) {
            if (prologueToken !== myToken) return;
            clearCineText(textEl);
            if (!await typeCineText(textEl, pages[p], 90, () => prologueToken !== myToken, false)) return; // 1文字ずつ(自動送りなので途中タップでの全文表示はしない)
            setCineTextEnd(textEl, 'auto'); // 自動送り: 文末に■
            await wait(4000); // 1ページ読み終えてから次へ
        }

        if (prologueToken !== myToken) return;
        if (screen.exit === 'fade') {
            // 黒へフェードアウトし、少し暗転を保つ
            content.style.transition = 'opacity 1.5s ease-out';
            content.style.opacity = '0';
            await wait(1500);
            await wait(400);
        } else if (screen.exit === 'swirl') {
            // 渦を巻くように、回転しながら縮み・ぼやけつつ暗転する
            content.style.transition = 'transform 2.6s ease-in, filter 2.6s ease-in, opacity 2.6s ease-in';
            content.style.transform = 'rotate(540deg) scale(0.05)';
            content.style.filter = 'blur(10px) brightness(0.3)';
            content.style.opacity = '0';
            await wait(2600);
        }
        content.classList.remove('cine-shake');
    }

    if (prologueToken !== myToken) return;
    goTitle(); // 4画面すべて終わったらSKIPしなくても自動でタイトルへ
}

let storyTapResolve = null; // タップ待ち中のPromiseのresolve関数(待っていない時はnull)

// storyContentタップ時に呼ばれる。タップ待ち中なら、待機しているplayStorySequence()を1つだけ先に進める
function onStoryTap() {
    if (storyTapResolve) { storyTapResolve(); storyTapResolve = null; }
    else cineSkipRequested = true; // 文字送りの途中なら全文を一気に表示する
}

// ストーリーシーン内の隠しタップゾーンをタップした時に呼ばれる。現在再生中の敵に対応するサブストーリーを解除する。
// 既に解除済みの場合は何も表示しない(何度タップしても無害)。
function onStoryHiddenTap() {
    const idx = state.storyEnemyIndex;
    const alreadyUnlocked = unlockedSubStories.includes(idx);
    unlockSubStory(idx);
    if (!alreadyUnlocked) {
        playHiddenTapSparkle(); // 発見の瞬間、タップ位置に小さなキラキラエフェクトを出す
        const sub = SUBSTORY_BY_ENEMY[ENEMY_ORDER[idx]];
        showUnlockToast({ small: `SUB STORY ${idx + 1}`, large: subStoryDisplayTitle(idx) });
    }
}

// 隠しタップを発見した瞬間、その位置(敵ごとの中心座標、STORY_HIDDEN_TAP_POS_BY_ENEMYと同じ)に
// 小さなキラキラエフェクト(sparkle.PNG)を1回だけ再生する(フェードイン→少し上へ浮かぶ→フェードアウト)。
// 任意アセットのため、画像が未配置(onerrorでdata-missing='1'になる)の場合は何もしない。
// カットシーン(プロローグ/ストーリー)の画像エリアに白フラッシュを1回再生する(cineFlashクラス、CSS側で定義)
function triggerCineFlash(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('flashing');
    void el.offsetWidth; // 強制リフローで、連続発火時も確実に最初から再生させる
    el.classList.add('flashing');
}
// カットシーンの画像エリアを1回揺らす(cineShakeクラス、CSS側で定義)
function triggerCineShake(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('shaking');
    void el.offsetWidth;
    el.classList.add('shaking');
}

function playHiddenTapSparkle() {
    const el = document.getElementById('storyHiddenTapSparkle');
    if (!el || el.dataset.missing === '1') return;
    const pos = STORY_HIDDEN_TAP_POS_BY_ENEMY[ENEMY_ORDER[state.storyEnemyIndex]] || STORY_HIDDEN_TAP_DEFAULT_POS;
    el.style.left = pos.x + '%';
    el.style.top = pos.y + '%';
    el.classList.remove('playing');
    void el.offsetWidth; // 強制リフローで、アニメーションを確実に最初から再生させる
    el.classList.add('playing');
    // アニメーション終了後は必ずplayingクラスを外す。付けたままだと、後でシーンがdisplay:none→表示に
    // 切り替わった際(RETRY等でストーリーシーンを開き直した時)にCSSアニメーションが自動的に再始動し、
    // タップしていないのに演出だけ再生されてしまう不具合があったため。
    el.addEventListener('animationend', () => { el.classList.remove('playing'); }, { once: true });
}

// 実績解除時の簡易トースト表示(数秒でフェードアウトする)
// 実績解除風の通知(画面上部から弾むようにスライドイン→少し待ってスライドアウト)。
// 複数の通知が同時に発生してもキューに積んで順番に表示する(上書きしない)。
let unlockToastQueue = [];
let unlockToastBusy = false;
// 解放トースト。2026-09-28変更: 読み逃し防止のため、自動では消えずトースト自体をタップした時だけ閉じる。
// 閉じた後は画面外(セーフエリアの上)まで完全に退避させてから非表示にする(以前は-120%だけ上げていたため、
// ホーム画面から起動した時に時計の部分へ一部が残って見えていた)。
// 戻り値のPromiseは、そのトーストが閉じられた時に解決する(閉じられるまで次の処理を待ちたい場合に使う)。
function showUnlockToast(message) {
    return new Promise(resolve => {
        unlockToastQueue.push({ message, resolve });
        processUnlockToastQueue();
    });
}
const UNLOCK_TOAST_HIDDEN_TRANSFORM = 'translateX(-50%) translateY(calc(-100% - var(--safe-top) - 24px))'; // 上端のセーフエリアごと完全に画面外
async function processUnlockToastQueue() {
    if (unlockToastBusy || unlockToastQueue.length === 0) return;
    unlockToastBusy = true;
    const { message, resolve } = unlockToastQueue.shift();
    playSE('se_select'); // 実績解除トースト表示時の共通音(隠しタップ経由・それ以外のBONUS/COSTUME解放通知いずれも含む)

    let toast = document.getElementById('unlockToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'unlockToast';
        // top はセーフエリア(iPhoneのDynamic Island/ノッチ等)の分だけ下げておく。
        // ホーム画面追加→ウェブアプリとして起動した場合、ブラウザのアドレスバー等の余白が無くなり画面いっぱいに表示されるため、
        // 通常のSafari表示では気にならなくても、ウェブアプリ表示だとこの余白を入れないとDynamic Islandと重なってしまう。
        // env(safe-area-inset-top)の値だけでは実機で不足するケースがあるため、CSS側の共通変数--safe-top
        // (standalone起動時は59pxを下限として保証する、css/style.css参照)を使う。
        toast.style.cssText = 'position:fixed; left:50%; top:var(--safe-top); display:none;'
            + 'background:linear-gradient(135deg, #1a1a1a, #2a2a2a);'
            + 'border:2px solid; border-top:none; border-radius:0 0 10px 10px;'
            + 'padding:12px 28px 10px; font-size:14px; font-weight:900; letter-spacing:1px; text-align:center;'
            + 'z-index:9999; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,0.6); white-space:nowrap;'
            + '-webkit-tap-highlight-color:transparent;';
        document.body.appendChild(toast);
    }
    // SUB STORY解放(隠しタップ経由、messageがオブジェクト)は従来通り金色。
    // BONUS CONTENTS/COSTUME解放(messageが文字列、大元そのものが解放されたことを示す通知)は白にする。
    const accentColor = typeof message === 'string' ? '#ffffff' : '#ffd23c';
    toast.style.color = accentColor;
    toast.style.borderColor = accentColor;
    const header = (typeof message === 'object' && message.header) || 'UNLOCKED'; // 見出しは通常UNLOCKED。RECORDSへの誘導はHINT
    toast.innerHTML = `<span style="font-size:10px; letter-spacing:3px; color:#888; display:block;">${header}</span>`
        + (typeof message === 'string'
            ? message // 従来通りの単一行表示(BONUS CONTENTS解放！等)
            : `<span style="font-size:12px; display:block;">${message.small}</span><span style="font-size:19px; display:block; margin-top:2px;">${message.large}</span>`) // SUB STORY解放時: 番号(小)+タイトル(大)の2段階表示
        + '<span class="unlock-toast-tap">TAP TO CLOSE</span>';

    toast.style.transition = 'none';
    toast.style.transform = UNLOCK_TOAST_HIDDEN_TRANSFORM;
    toast.style.display = 'block';
    await wait(30); // 直前のtransform:noneが確実に描画されてからアニメーションを開始させる
    toast.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'; // 少し弾むスライドイン(コンシューマーゲームの実績解除風)
    toast.style.transform = 'translateX(-50%) translateY(0)';
    // トースト自体をタップするまで表示し続ける(背後の画面へタップが伝わらないようにする)
    await new Promise(done => {
        const onTap = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.removeEventListener('click', onTap);
            done();
        };
        setTimeout(() => toast.addEventListener('click', onTap), 350); // 出現直後の誤タップで即閉じないよう、スライドインの途中からタップを受け付ける
    });
    playSE('se_select');
    toast.style.transition = 'transform 0.4s ease-in';
    toast.style.transform = UNLOCK_TOAST_HIDDEN_TRANSFORM;
    await wait(450);
    toast.style.display = 'none'; // 完全に非表示にする

    resolve();
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
    stopStoryFlashPulse(); // 繰り返しフラッシュも止める
    if (storyTapResolve) { storyTapResolve(); storyTapResolve = null; } // タップ待ちで止まっていれば解除する(でないとトークン確認まで到達できない)
    goDeckBuild('story');
}

async function playStorySequence() {
    // これから戦う敵のグラフィックセット・背景をこの時点で先読み開始する(ストーリー閲覧〜デッキ編成までの時間を読み込みの猶予にするため)
    const storyStageNum = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1;
    loadEnemySet('enemy_' + storyStageNum);
    loadStageBackground(storyStageNum === 1 ? 'bg.PNG' : `bg_${storyStageNum}.PNG`);

    // ストーリーシーンのBGM(5人目(Alv)のみ専用曲、未配置なら共通のbgm_storyへフォールバック)。
    // 以前はここで即座にplayBGMを呼んで鳴らし始めていたが、画像と同じくローディング対象に含めるため、
    // 読み込みだけ先に済ませておき(preloadBgm)、実際の再生開始は後段の読み込み待ち完了後に行う。
    const storyBgmName = storyStageNum === 5 ? 'bgm_story_5' : 'bgm_story';
    const storyBgmFallback = storyStageNum === 5 ? 'bgm_story' : undefined;
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
    // 表示を始める前に3画面分の画像・ストーリーBGM両方の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)。
    // 以前はこの待機中も画面は透明(真っ暗)なままだったが、読み込みが間に合っていない場合は#sceneLoadingScreenで
    // 明示的にローディングを見せる。
    await ensureReadyWithLoading(Promise.all([
        loadCutsceneScreens(screens, 'story'),
        preloadBgm(storyBgmName, storyBgmFallback)
    ]));
    if (storyToken !== myToken) return; // 読み込み待ちの間にSKIPされていたら中断
    playBGM(storyBgmName, storyBgmFallback); // 画像・BGM共に読み込み済みのはずなので、ここから即座に再生を開始する

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
        // (以前はここで4人目(Jack)の3枚目だけ画像を軽く揺らしていたが、2026-09-30からページ指定のshakeBefore(画面ごとどかっと揺らす)に置き換えた)
        // 隠しタップは3画面のうち対象の1枚だけで有効にする(敵ごとに違う画面。それ以外の画面では押せないようにする)
        const hiddenTapScreenIdx = STORY_HIDDEN_TAP_SCREEN_BY_ENEMY[ENEMY_ORDER[state.storyEnemyIndex]] ?? 1;
        const hiddenTapEl = document.getElementById('storyHiddenTap');
        hiddenTapEl.style.display = (i === hiddenTapScreenIdx) ? '' : 'none';
        if (i === hiddenTapScreenIdx) {
            // 敵ごとに指定された中心座標(%)に、判定用の矩形(既定は幅20%×高さ20%。pos.w/pos.hがあればそちらを使う)の中心を合わせる
            const pos = STORY_HIDDEN_TAP_POS_BY_ENEMY[ENEMY_ORDER[state.storyEnemyIndex]] || STORY_HIDDEN_TAP_DEFAULT_POS;
            const tapW = pos.w || 20;
            const tapH = pos.h || 20;
            hiddenTapEl.style.width = tapW + '%';
            hiddenTapEl.style.height = tapH + '%';
            hiddenTapEl.style.left = (pos.x - tapW / 2) + '%';
            hiddenTapEl.style.top = (pos.y - tapH / 2) + '%';
        }

        content.classList.remove('cine-shake'); // 前の画面の揺れ演出のクラスを外しておく
        stopStoryFlashPulse(); // 前の画面の繰り返しフラッシュを止める
        if (screen.flash === 'pulse') {
            // 画像が出た瞬間にピカピカと光らせ、その後もこの画面の間は3秒ごとに光らせ続ける(awaitせずテキスト送りと並行)
            playSE('se_meteor');
            storyFlashBurst(3, myToken);
            storyFlashTimer = setInterval(() => {
                if (storyToken !== myToken) { stopStoryFlashPulse(); return; }
                storyFlashBurst(1, myToken);
            }, 3000);
        }
        const spotlight = document.getElementById('storySpotlight');
        if (screen.spotlight) {
            // 周りが暗く中心が明るい状態から始め、数秒後にゆっくり晴れる(フェードインと並行して進み、テキスト送りは止めない)
            spotlight.style.transition = 'none';
            spotlight.style.opacity = '1';
            setTimeout(() => {
                if (storyToken !== myToken) return;
                spotlight.style.transition = 'opacity 2s ease-out';
                spotlight.style.opacity = '0';
            }, 4000);
        } else {
            spotlight.style.transition = 'none';
            spotlight.style.opacity = '0';
        }

        if (i === 0 || screen.enter === 'fade') {
            // 一番はじめの画面、およびenter:'fade'の画面はフェードインで始める
            textEl.innerText = '';
            content.style.transition = 'none';
            content.style.opacity = '0';
            await wait(30); // 直前のopacity:0が確実に描画されてから遷移を開始させる
            content.style.transition = 'opacity 1s ease-in';
            content.style.opacity = '1';
            await wait(1000);
            if (storyToken !== myToken) return;
        }

        // textは通常は1画面1ページの文字列だが、同じ画像のまま複数ページ分のセリフを送りたい場合は配列にできる
        // (例: 教会の場面のように、1枚の絵の中で会話が続く場合)。配列でなければ1ページ扱いにする。
        // 各ページは文字列、または{ text, shake, shakeBefore }(shake:trueなら表示し終えた瞬間、shakeBefore:trueならページの始まりに画面をどかっと揺らす)
        const pages = Array.isArray(screen.text) ? screen.text : [screen.text];
        for (let p = 0; p < pages.length; p++) {
            if (storyToken !== myToken) return;
            const page = typeof pages[p] === 'string' ? { text: pages[p] } : pages[p];
            textEl.innerText = '';
            const doShake = () => {
                playSE('se_kabe');
                content.classList.remove('cine-shake');
                void content.offsetWidth;
                content.classList.add('cine-shake');
            };
            if (page.shakeBefore) doShake(); // shakeBefore:trueなら、そのページが始まる瞬間に揺らす
            if (!await typeCineText(textEl, page.text, 45, () => storyToken !== myToken, true)) return; // 途中タップで全文表示
            setCineTextEnd(textEl, 'tap'); // タップ待ち: 文末に▼
            if (page.shake) doShake(); // shake:trueなら、その文を表示し終えた瞬間に揺らす

            if (storyToken !== myToken) return;
            // オープニング(プロローグ)とは異なり、ストーリーシーンは自動送りにしない。
            // 戦いのヒントになる会話のため、プレイヤーが自分のペースで読めるよう画面タップで次へ進める(SKIPは従来通り別途利用可能)。
            await waitForStoryTap();
            if (storyToken !== myToken) return; // タップ待ち中にSKIPされていた場合はここで中断する
        }
    }

    stopStoryFlashPulse();
    if (storyToken !== myToken) return;
    goDeckBuild('story'); // 3画面すべて終わったらデッキ編成へ
}

// エンディング5画面を再生する(スキップ不可。5人目撃破後の専用演出のため)
// 2026-09-28変更:
// ・エンディング画像はassets/images/cutscenes/story/に置かれているが、以前はending/フォルダを読みに行っていたため
//   一枚も表示されていなかった(通信状況とは無関係)。読み込み先をstory/に修正した。
// ・画像5枚とエンディング曲の読み込みが終わるまでローディングを表示し、揃ってから曲と画像を出す。
// ・エンドロールの長さは曲の実際の長さから逆算し、FINが出る頃にちょうど曲が終わるようにする(playCredits参照)。
const ENDING_IMAGE_FOLDER = 'story';
const ENDING_FIN_LEAD_MS = 5000; // 曲が終わる何ms前にFINのフェードインを始めるか
let endingBgmStartedAt = 0;      // エンディング曲を鳴らし始めた時刻(performance.now)。エンドロールの長さの計算に使う
function endingBgmDurationMs() {
    const buf = bgmBufferCache['bgm_ending'];
    return buf ? buf.duration * 1000 : 0;
}
async function playEndingSequence() {
    const content = document.getElementById('endingContent');
    const imgArea = document.getElementById('endingImgArea');
    const fallback = document.getElementById('endingImgFallback');
    const textEl = document.getElementById('endingText');

    content.style.transition = 'none';
    content.style.opacity = '0';
    textEl.innerText = '';
    imgArea.classList.remove('placeholder');
    imgArea.style.backgroundImage = 'none';

    // 画像5枚とエンディング曲が揃うまでローディングを表示して待つ(通信が遅くても、揃ってから始める)
    await ensureReadyWithLoading(Promise.all([
        loadCutsceneScreens(ENDING_SCREENS, ENDING_IMAGE_FOLDER),
        preloadBgm('bgm_ending'),
    ]), 150, 30000);
    playBGM('bgm_ending');
    endingBgmStartedAt = performance.now();

    for (let i = 0; i < ENDING_SCREENS.length; i++) {
        const screen = ENDING_SCREENS[i];

        if (imgs[screen.img]) {
            imgArea.style.backgroundImage = `url('assets/images/cutscenes/${ENDING_IMAGE_FOLDER}/${screen.img}')`;
            imgArea.classList.remove('placeholder');
        } else {
            imgArea.style.backgroundImage = 'none';
            imgArea.classList.add('placeholder');
            fallback.innerText = screen.img + ' (未配置)';
        }

        if (i === 0) {
            // 一番はじめの画面だけフェードインで始める(プロローグ/ストーリーと同じ仕様)
            await wait(30);
            content.style.transition = 'opacity 2s ease-in'; // 0.5倍速: 1s→2s
            content.style.opacity = '1';
            await wait(2000); // 0.5倍速: 1000ms→2000ms
        }

        // textは通常は1画面1ページの文字列だが、同じ画像のまま複数ページ分のテキストを送りたい場合は配列にできる
        const pages = Array.isArray(screen.text) ? screen.text : [screen.text];
        for (let p = 0; p < pages.length; p++) {
            clearCineText(textEl);
            await typeCineText(textEl, pages[p], 90, () => false, false); // 0.5倍速: 45ms→90ms(スキップ不可の自動送り)
            setCineTextEnd(textEl, 'auto'); // 自動送り: 文末に■
            await wait(4000); // 0.5倍速: 2000ms→4000ms
        }
    }

    // 5画面目の最後のテキストを読み終えたら、ゆっくり黒へフェードアウトし、真っ暗な状態を少し保ってからエンドロールへ
    content.style.transition = 'opacity 2.5s ease-out';
    content.style.opacity = '0';
    await wait(2500);
    await wait(1000);
}

// エンドロール(下から上へスクロールするクレジット表示)を再生する。CSS側のtransition時間(14s)と合わせて待機する
// 2026-09-28変更: 長さは固定の14秒ではなく、「エンディング曲の残り時間 − ENDING_FIN_LEAD_MS」にする
// (FINが出る頃に曲が終わる)。曲が読み込めなかった等で計算できない場合は従来の14秒、短すぎる場合も最低14秒。
async function playCredits() {
    const MIN_CREDITS_MS = 14000;
    const songMs = endingBgmDurationMs();
    const elapsed = endingBgmStartedAt ? performance.now() - endingBgmStartedAt : 0;
    const creditsMs = songMs ? Math.max(MIN_CREDITS_MS, songMs - elapsed - ENDING_FIN_LEAD_MS) : MIN_CREDITS_MS;
    showScene('credits');
    const scroll = document.getElementById('creditsScroll');
    scroll.classList.remove('roll');
    scroll.style.transition = 'none';
    void scroll.offsetWidth; // 強制リフロー(アニメーションを確実に最初から再生させるため)
    await wait(30);
    scroll.style.transition = `top ${Math.round(creditsMs)}ms linear`;
    scroll.classList.add('roll');
    await wait(creditsMs);
}

// FIN画面(真っ黒な背景の中央に白文字)をフェードインで表示し、10秒間表示した後、ゆっくりフェードアウトする
async function playFinScreen() {
    const finScene = document.getElementById('sceneFin');
    finScene.style.transition = 'none';
    finScene.style.opacity = '0'; // フェードインさせるため、最初は透明にしておく
    showScene('fin');
    await wait(30); // 直前のopacity:0が確実に描画されてからフェードインを開始させる
    finScene.style.transition = 'opacity 1.5s ease-in';
    finScene.style.opacity = '1';
    await wait(1500);
    await wait(10000); // フェードイン完了後、そのまま10秒間表示する
    finScene.style.transition = 'opacity 2s ease-out';
    finScene.style.opacity = '0';
    await wait(2000);
}

// サブストーリーバトル(EXTRA BATTLE)勝利後のエピローグ末尾に出す終了画面。FIN.と全く同じ演出(フェードイン→
// 表示→フェードアウト)だが、表示文言が「SUB STORY / 〈キャラ名〉 / END」になり、表示時間もFINの10秒より短い
// 3秒にしている(こちらは本編クリアほどの重みは無いため)。
async function playSubStoryEndScreen(characterName) {
    const scene = document.getElementById('sceneSubStoryEnd');
    document.getElementById('subStoryEndCharName').innerText = characterName;
    scene.style.transition = 'none';
    scene.style.opacity = '0';
    showScene('subStoryEnd');
    await wait(30);
    scene.style.transition = 'opacity 1.5s ease-in';
    scene.style.opacity = '1';
    await wait(1500);
    await wait(3000); // フェードイン完了後、3秒間表示する(FINの10秒よりは短め)
    scene.style.transition = 'opacity 2s ease-out';
    scene.style.opacity = '0';
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
    // エンディング曲はループ再生のため、曲の終わりで止めてFINの表示中に頭から鳴り直さないようにする
    const songMs = endingBgmDurationMs();
    if (songMs && endingBgmStartedAt) {
        const remain = Math.max(0, songMs - (performance.now() - endingBgmStartedAt));
        setTimeout(() => { if (currentBgmName === 'bgm_ending') stopBGM(); }, remain);
    }
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
    if (bonusContentsAvailable() && !bonusContentsAnnounced) {
        bonusContentsAnnounced = true;
        writeSaveData({ bonusContentsAnnounced: true });
        showUnlockToast('BONUS CONTENTS 解放！');
    }
    if (costumeSelectionAvailable() && !costumeUnlockAnnounced) {
        costumeUnlockAnnounced = true;
        writeSaveData({ costumeUnlockAnnounced: true });
        showUnlockToast('COSTUME 解放！');
    }
    // ゲームクリア後、未発見の要素が残っていれば一度だけRECORDSへ誘導する
    if (gameClearedOnce && !recordsHintAnnounced && recordsHasUndiscovered()) {
        recordsHintAnnounced = true;
        writeSaveData({ recordsHintAnnounced: true });
        showUnlockToast({ header: 'HINT', small: 'OPTION › RECORDS で確認', large: 'ストーリーの会話に<br>秘密が隠れている…' }); // 1行だと狭い画面で切れるため2行にする
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
    updateVersusButtonVisibility();
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
    if (state.pendingMode === 'story' && !tutorialSeen.deck) showTutorial('deck'); // はじめてのデッキ編成のみ(2026-10-01)
    if (state.storyEnemyIndex === 4) {
        // 5人目(Alv)のデッキ編成は、専用ストーリーBGM(bgm_story_5)を引き続き流す。
        // 既にストーリーシーンから再生中であればplayBGM内の早期returnによりそのまま継続され、
        // CONTINUE等でストーリーシーンを経由していない場合はここで新たに再生を始める(未配置ならbgm_storyへフォールバック)。
        playBGM('bgm_story_5', 'bgm_story');
    } else {
        playBGM('bgm_deck');
    }
}

// TRAINING MODE専用: デッキ編成を経由せず、タイトルから直接バトルへ入る(手札は固定のPUNCH/UPPER/GUARD、選び放題)。
// デッキ編成を使わないため、goBattleStartと異なりdeckCountsのセーブ書き込みは行わない。
async function goTrainingBattle() {
    state.pendingMode = 'training';
    // TRAINING MODE用グラフィック・背景・BGMの読み込みが間に合っていない場合のみ、#sceneLoadingScreenを挟んでから入る
    // (第X条: 以前はここで読み込み完了を待たず、間に合わなければバトル中にフォールバック表示→実画像へ差し替わり、
    // BGMも読み込み完了を待たず鳴らし始めていたが、バトル前に素材が揃っていない場合は明示的にローディングを
    // 挟んでほしいとの要望を受けて変更した)。
    await ensureReadyWithLoading(Promise.all([
        loadEnemySet('training'),
        loadStageBackground('bg_training.PNG'),
        preloadBgm('bgm_battle')
    ]));
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle');
}

// サブストーリーバトル(検討中の新機能)を開始する。playerPresetKeyはプレイヤーが借りるキャラのENEMY_PRESETSキー
// (例: 'ENEMY_01'=Noahとして戦う)。SUBSTORY_BATTLE_CONFIGから対戦相手・ステージを自動的に決定する。
// デッキ編成は経由せず(借りているキャラのデッキ配分に固定)、直接バトルへ入る。
async function goSubstoryBattle(playerPresetKey) {
    const config = SUBSTORY_BATTLE_CONFIG[playerPresetKey];
    if (!config) return;
    state.pendingMode = 'substoryBattle';
    state.pPresetKey = playerPresetKey;
    state.ePresetKey = config.opponent;
    state.substoryStageNum = config.stage;
    state.substoryMusicNum = config.music; // バトル曲は背景のステージ番号とは独立して指定できる
    const playerIdx = ENEMY_ORDER.indexOf(playerPresetKey);
    // 対戦相手側(ePresetKeyから導出。VALの場合は存在しない'val'でplayer.PNGに自然にフォールバック)・
    // プレイヤー側(借りているキャラの見た目)・背景・BGM、いずれかの読み込みが間に合っていない場合のみローディングを挟む
    await ensureReadyWithLoading(Promise.all([
        loadEnemySet(currentEnemySetName()),
        playerIdx !== -1 ? loadEnemySet('enemy_' + (playerIdx + 1)) : Promise.resolve(),
        loadStageBackground(config.stage === 1 ? 'bg.PNG' : `bg_${config.stage}.PNG`),
        preloadBgm('bgm_battle_' + state.substoryMusicNum, 'bgm_battle')
    ]));
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle_' + state.substoryMusicNum, 'bgm_battle');
}
// サブストーリーバトルで敗北(K.O.)した後、同じ対戦カード(pPresetKey/ePresetKey/substoryStageNumは維持したまま)で再戦する。
// デッキ編成を経由しない点はgoSubstoryBattleと同じだが、こちらは既に設定済みの状態をそのまま使い回す。
async function retrySubstoryBattle() {
    state.pendingMode = 'substoryBattle'; // resetBattleStateはこの値からgameModeを決定するため、必ず設定する
    const playerIdx = ENEMY_ORDER.indexOf(state.pPresetKey);
    // 通常は既に読み込み済み(goSubstoryBattle側で先読み済み)のため、ここでローディングが実際に表示されることは稀
    await ensureReadyWithLoading(Promise.all([
        loadEnemySet(currentEnemySetName()),
        playerIdx !== -1 ? loadEnemySet('enemy_' + (playerIdx + 1)) : Promise.resolve(),
        loadStageBackground(state.substoryStageNum === 1 ? 'bg.PNG' : `bg_${state.substoryStageNum}.PNG`),
        preloadBgm('bgm_battle_' + state.substoryMusicNum, 'bgm_battle')
    ]));
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle_' + state.substoryMusicNum, 'bgm_battle');
}

function tapFlickerThen(el, callback) {
    playSE('se_select'); // タイトルの各ボタン(NEW GAME/TRAINING MODE/CONTINUE)・デッキ編成のFIGHTボタン、共通のメニュー決定音
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
// 個別キャラではなく画面全体を揺らす(メテオの着地等で使用)
function triggerScreenShake(ms, magnitude) {
    state.screenShakeUntil = performance.now() + ms;
    state.screenShakeMagnitude = magnitude;
}

function triggerBlink(side, ms) { const until = performance.now() + ms; if (side === 'P') state.pBlinkUntil = until; else state.eBlinkUntil = until; }

// スーパーアッパー/メテオ/必殺技(異なるコマンドを組み合わせ、フィニッシュで攻撃力が上がる技)の直前に挟む演出。
// 背景暗転→一時停止(暗いまま)→攻撃側が白く発光→その発光と共に暗転が晴れる、という一連の流れをawaitで完結させる。
// 呼び出し側は、この関数の完了を待ってから実際の打撃モーション(setAct等)・ダメージ処理へ進む。
async function playFinisherBuildup(attacker) {
    const darkenSteps = 8, darkenStepMs = 10; // 暗転(約80ms)
    for (let s = 1; s <= darkenSteps; s++) {
        finisherDarkenAlpha = (s / darkenSteps) * 0.5; // 50%程度の暗さに留める(キャラは別レイヤーで通常の明るさのまま描画される)
        await wait(darkenStepMs);
    }
    await wait(150); // 一時停止(暗いまま、キャラは静止した状態)

    finisherFlashSide = attacker;
    const flashSteps = 6, flashStepMs = 13; // 発光がパッと現れる(約78ms)
    for (let s = 1; s <= flashSteps; s++) {
        finisherFlashAlpha = s / flashSteps;
        await wait(flashStepMs);
    }
    const clearSteps = 8, clearStepMs = 10; // 発光で暗転が晴れていく(約80ms)
    for (let s = 1; s <= clearSteps; s++) {
        const t = s / clearSteps;
        finisherDarkenAlpha = 0.5 * (1 - t);
        finisherFlashAlpha = 1 - t;
        await wait(clearStepMs);
    }
    finisherDarkenAlpha = 0;
    finisherFlashAlpha = 0;
    finisherFlashSide = null;
}

// 追撃・追加打系の技の命中を強調する簡易な白い発光(2026-09-26追加)。
// 当初はGUARD+PUNCH+UPPER(簡易な追加打)の空中コンボ統合分岐(4枚目がPUNCHの場合)専用として追加した。
// この追加打は、通常の空中コンボ1発目と全く同じ見た目・ダメージで処理されるため、続く本来の4枚目(PUNCH、
// 空中コンボ2発目)と並ぶと「どちらが技で増えた1発なのか分かりづらい」との指摘を受けて対応したもの。
// その後、「追撃となる攻撃の場合は、全てこの白発光にしてみよう」との要望を受け、PUNCH+GUARD+PUNCH(追撃)の
// 3連打(`runFollowUpFlurry`)にも同様に適用するようになったため、汎用の名前に変更した。
// playFinisherBuildupの発光部分(finisherFlashSide/finisherFlashAlpha)のみを流用し、暗転は伴わない簡易な
// 白い発光を攻撃側キャラにパッと出す。呼び出し側ではawaitせず(ヒットストップの間合いと並行して進む)、
// 打撃絵を出した瞬間(Beat1)から発光を開始し、振動が始まる頃(Beat3)には消え始めるようにしている。
// PUNCH+GUARD+PUNCH(追撃)の3連打のように、1サイクル(約270ms)より短い間隔(約120ms)で連続してこの関数が
// 呼ばれる場合があるため、世代トークン(flashWhiteToken)で「自分より後に開始した呼び出しがあれば、そちらに
// 譲って以降のグローバル状態の書き換えを行わない」という仕組みを入れている。これが無いと、古い呼び出しの
// 消灯処理が新しい呼び出しの立ち上げ中の値を上書きしてしまい、発光がちらついたり途中で消えたりする不具合が
// 起きる(実際にPlaywrightのトレースで発生を確認して対応した)。
let flashWhiteToken = 0;
async function flashAttackerWhite(attacker) {
    const myToken = ++flashWhiteToken;
    finisherFlashSide = attacker;
    const inSteps = 4, inStepMs = 15; // パッと立ち上がる(約60ms)
    for (let s = 1; s <= inSteps; s++) {
        if (myToken !== flashWhiteToken) return; // 後続の呼び出しに追い越された場合は何もしない
        finisherFlashAlpha = s / inSteps;
        await wait(inStepMs);
    }
    if (myToken !== flashWhiteToken) return;
    await wait(120); // 発光を保つ(ヒットストップの静止と重なる間)
    const outSteps = 6, outStepMs = 15; // 消えていく(約90ms)
    for (let s = 1; s <= outSteps; s++) {
        if (myToken !== flashWhiteToken) return;
        finisherFlashAlpha = 1 - s / outSteps;
        await wait(outStepMs);
    }
    if (myToken !== flashWhiteToken) return;
    finisherFlashAlpha = 0;
    finisherFlashSide = null;
}

function nextPunchSprite(side) {
    const key = side === 'P' ? 'pLastAtk' : 'eLastAtk';
    state[key] = state[key] === 'punch.PNG' ? 'punch2.PNG' : 'punch.PNG'; // 第21条
    return state[key];
}

// パンチが2発以上連続する技(2発目以降)で、punch.PNG⇔punch2.PNGへの切り替わり直前に一瞬dash.PNGを挟む。
// 素早い踏み込み/踏み替えのような質感を出すための、ごく短い経由ポーズ(1発目には使わない)。
async function flashDashBetweenPunches(side) {
    setAct(side, 'dash.PNG');
    await wait(60);
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
function startPiyo(side) { state.piyoSide = side; state.piyoBroken = false; }
function stopPiyo() { state.piyoSide = null; state.piyoBroken = false; }

// COMBOカウンターの描画。2以上のみ表示し、以下の演出を重ねる:
// ・増えた瞬間: 軽く上へポップする(sinカーブで跳ねて戻る)
// ・途切れた瞬間: 直前の値を保持したまま短時間でフッとフェードアウトする
// ・5/10/15到達時: 一瞬だけ膨らみながら金色に光るきらびやかな強調演出
// COMBOは斜体、数字はCOMBOよりやや大きいフォントサイズで、同じ斜体にする。
// c: 描画先のcontext(省略時はメインのctx)。ローカル対戦(VERSUS)では2P側の反転canvasにも同じ関数で描く。
function drawComboCounter(side, anchorX, align, c) {
    c = c || ctx;
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

    c.save();
    c.globalAlpha = opacity;
    c.translate(anchorX, 46 + popOffsetY);
    c.scale(totalScale, totalScale);
    c.textBaseline = 'alphabetic';
    c.fillStyle = color;
    if (isBigMilestoneActive) {
        c.shadowColor = 'rgba(255,59,59,0.95)';
        c.shadowBlur = 20 * bigMilestoneGlow;
    } else if (isSmallMilestoneActive) {
        c.shadowColor = 'rgba(255,210,60,0.9)';
        c.shadowBlur = 16 * milestoneGlow;
    } else if (isAlwaysSparkly) {
        c.shadowColor = 'rgba(255,210,60,0.9)';
        c.shadowBlur = 6 + 10 * sparklyPulse;
    } else {
        c.shadowColor = 'rgba(0,0,0,0.7)';
        c.shadowBlur = 4;
    }

    const comboText = 'COMBO';
    const numberText = String(showValue);
    c.font = `italic 900 ${comboFontSize}px sans-serif`;
    const comboWidth = c.measureText(comboText).width;
    c.font = `italic 900 ${numberFontSize}px sans-serif`;
    const numberWidth = c.measureText(numberText).width;
    const gap = 6;
    const totalWidth = comboWidth + gap + numberWidth;
    const startX = align === 'left' ? 0 : -totalWidth; // 右揃えの場合、全体をtotalWidth分左へオフセットする

    c.font = `italic 900 ${comboFontSize}px sans-serif`;
    c.fillText(comboText, startX, 0);
    c.font = `italic 900 ${numberFontSize}px sans-serif`;
    c.fillText(numberText, startX + comboWidth + gap, 4); // 数字が大きい分、ベースラインを少し下げて視覚的に揃える

    c.restore();
}

// キャラごとの表示サイズ倍率(見た目のみの変更。座標・当たり判定・エフェクト位置・攻撃力等には一切影響しない)。
// キーは敵グラフィックセット名(currentEnemySetName()やselectedSkinと同じ 'enemy_1'〜'enemy_5' 形式)。
// Gald(3人目)は敵本体として登場する時も、プレイヤーがコスチュームとして選択した時も、どちらも1.2倍で表示する。
// Alv(5人目、ラスボス)も同様に、敵本体・コスチュームどちらでも1.1倍で表示する。
const CHARACTER_SCALE_BY_SET = { enemy_3: 1.2, enemy_5: 1.1 };
// 指定した座標(スプライトの左上基準点)を、指定倍率で描画するための矩形に変換する。
// 横方向は中央基準で左右均等に広がり、縦方向は下端(足元)を基準に上方向にだけ広がる(地面に立つキャラが浮いたり
// めり込んだりしないようにするため)。倍率1(既定)の場合は元の座標・DB.IMG_SIZEをそのまま返す。
function growRectKeepBottomCenter(x, y, scale) {
    if (!scale || scale === 1) return { x, y, size: DB.IMG_SIZE };
    const size = DB.IMG_SIZE * scale;
    const grow = size - DB.IMG_SIZE;
    return { x: x - grow / 2, y: y - grow, size };
}

// 技名ポップの描画(2026-09-27追加の演出を、ローカル対戦(VERSUS)の反転canvasでも描けるよう関数化したもの)。
// c: 描画先のcontext。mirrorW: 0以外なら、その幅で左右反転した位置に(文字は正しい向きのまま)描く。
function drawTechNamePops(c, t, mirrorW) {
    const TECH_NAME_POP_IN_MS = 130; // 出現: 0.3倍→1.3倍まで一気に飛び出す
    const TECH_NAME_SETTLE_MS = 90; // 直後: 1.3倍→1.0倍まで一瞬で収まる
    const TECH_NAME_POP_OUT_MS = 130; // 消滅: 最後の一瞬で1.0倍→1.4倍に弾けながら消える(なだらかなフェードにしない)
    const TECH_NAME_TILT_RAD = -14 * Math.PI / 180; // 右肩上がりに傾ける角度(斜め上を向く見た目にする)
    techNamePops.forEach(p => {
        const age = t - p.born;
        const life = TECH_NAME_POP_LIFE;
        const popOutStart = life - TECH_NAME_POP_OUT_MS;
        let scale, alpha;
        if (age < TECH_NAME_POP_IN_MS) {
            const ip = age / TECH_NAME_POP_IN_MS;
            scale = 0.3 + ip * 1.0; // 0.3倍→1.3倍
            alpha = 1; // 透明度はフェードさせず、最初から不透明のまま勢いだけで見せる
        } else if (age < TECH_NAME_POP_IN_MS + TECH_NAME_SETTLE_MS) {
            const sp = (age - TECH_NAME_POP_IN_MS) / TECH_NAME_SETTLE_MS;
            scale = 1.3 - sp * 0.3; // 1.3倍→1.0倍
            alpha = 1;
        } else if (age < popOutStart) {
            scale = 1.0; // 静止表示(なだらかな変化を挟まない)
            alpha = 1;
        } else {
            const op = (age - popOutStart) / TECH_NAME_POP_OUT_MS; // 0→1
            scale = 1.0 + op * 0.4; // 1.0倍→1.4倍に一気に弾ける
            alpha = 1 - op; // 消える直前まで不透明を保ち、最後の短い間だけ一気に消える
        }
        if (alpha <= 0) return;
        const baseAnchorX = p.x + DB.IMG_SIZE / 2; // 位置は固定(移動させない)
        const anchorX = mirrorW ? mirrorW - baseAnchorX : baseAnchorX; // 反転canvasでは位置だけ左右反転し、文字自体は反転させない
        const anchorY = p.y - 10;
        c.save();
        c.globalAlpha = alpha;
        c.translate(anchorX, anchorY);
        c.rotate(TECH_NAME_TILT_RAD);
        c.scale(scale, scale);
        c.font = `32px ${TECH_NAME_FONT_FAMILY}`;
        c.textAlign = 'center';
        c.textBaseline = 'alphabetic';
        c.lineJoin = 'round';
        c.lineWidth = 4;
        c.strokeStyle = 'rgba(0,0,0,0.8)'; // 背景を選ばず読めるよう、黒い縁取りを先に描いてから白抜きにする
        c.strokeText(p.text, 0, 0);
        c.fillStyle = '#fff';
        c.fillText(p.text, 0, 0);
        c.restore();
    });
}

function draw(tRaw) {
    const t = tRaw || performance.now();
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // 画面全体を揺らす演出(メテオの着地等で使用)。以降の描画すべてに反映させ、関数末尾でrestoreする。
    ctx.save();
    if (t < state.screenShakeUntil) {
        const shakeX = (Math.random() - 0.5) * state.screenShakeMagnitude;
        const shakeY = (Math.random() - 0.5) * state.screenShakeMagnitude;
        ctx.translate(shakeX, shakeY);
    }

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

    // スーパーアッパー/メテオ/必殺技の直前に挟む暗転演出。背景の直後・キャラより前に重ねることで、
    // 暗くなるのは背景だけになり、この後に描画されるキャラは常に通常の明るさのまま(暗くならない)。
    if (finisherDarkenAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = finisherDarkenAlpha;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.restore();
    }

    // 残像(第24条、およびPUNCH+PUNCH+UPPERの強さ演出)を先に描画。
    // 各残像は個別に寿命(life)・スプライト(sprite)・最大不透明度(maxAlpha)を持てる。省略時は従来のdash残像と同じ既定値になる。
    trails = trails.filter(tr => (t - tr.born) < (tr.life || 220));
    trails.forEach(tr => {
        const life = tr.life || 220;
        const maxAlpha = tr.maxAlpha != null ? tr.maxAlpha : 0.35;
        const age = t - tr.born;
        // 本体が透明な間(BATTLE RUSHで倒した敵が消えた後、登場演出前など)は、その側の残像も出さない
        // (2026-09-28修正: 敵が消えた後のホーム帰還でdashの残像だけが現れていた)
        const ownerAlpha = tr.side === 'E' ? state.introEnemyAlpha : state.introCharAlpha;
        const alpha = maxAlpha * (1 - age / life) * ownerAlpha;
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

    // ヒットエフェクトは、プレイヤー・敵のスプライトより後(手前)に描画する必要があるため、この位置では描画しない
    // (下の「プレイヤー(振動・点滅対応)」「敵(振動・点滅・反転対応)」両方の描画が終わった後にまとめて描画する)。

    // プレイヤー(振動・点滅対応)
    const pJit = t < state.pShakeUntil ? (Math.random() * 6 - 3) : 0;
    const pBlinkA = t < state.pBlinkUntil ? ((Math.floor((state.pBlinkUntil - t) / 80) % 2 === 0) ? 1 : 0.25) : 1;
    const pAlpha = pBlinkA * state.introCharAlpha;
    const pImg = imgs[playerSpriteName(spriteFor(state.pAct, t))];
    ctx.save();
    ctx.globalAlpha = pAlpha;
    const pGlowPulse = (Math.sin(t / 180) + 1) / 2; // 0〜1でゆっくり明滅
    // EXTRA BATTLE・ローカル対戦(VERSUS)でキャラを借りている場合は、そのキャラのセットで倍率を決める
    // (Gald/Alvとして戦う時も、敵として登場する時と同じ大きさにする。2026-09-27、KNOWN_ISSUESの不具合を修正)。
    // それ以外はコスチュームとしてGald/Alvを選んでいる場合のみ1.2倍/1.1倍になる
    const pScale = CHARACTER_SCALE_BY_SET[playerCharacterSetName()] || 1;
    const pRect = growRectKeepBottomCenter(state.pX + pJit, state.pY + pJit, pScale);
    if (state.pUpperChargeReady && pImg) {
        // UPPER+GUARD+UPPER用のチャージ: 水色の発光(ガード+ガードの金色とは別の色で見分けられるようにする)
        ctx.save();
        ctx.shadowColor = 'rgba(80, 220, 255, 0.95)';
        ctx.shadowBlur = 14 + pGlowPulse * 16;
        ctx.drawImage(pImg, pRect.x, pRect.y, pRect.size, pRect.size);
        ctx.restore();
    }
    if (state.pChargeValue > 0) { // ガード2連続成功以降のチャージ中は金色に発光する(次のコマンドまで持続)
        if (state.pChargeIsMax && pImg) {
            // 3連続以降(上位段階)は、外側に白いオーラをもう一段重ねて2倍と明確に区別する(実数値ではなくpChargeIsMaxフラグで判定する)
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 36 + pGlowPulse * 20;
            ctx.drawImage(pImg, pRect.x, pRect.y, pRect.size, pRect.size);
            ctx.restore();
        }
        ctx.shadowColor = 'rgba(255, 215, 60, 0.95)';
        ctx.shadowBlur = 14 + pGlowPulse * 16;
    }
    if (pImg) ctx.drawImage(pImg, pRect.x, pRect.y, pRect.size, pRect.size);
    else { ctx.fillStyle = '#0f0'; ctx.fillRect(pRect.x, pRect.y, pRect.size, pRect.size); }
    ctx.restore();
    // フィニッシュ発光(スーパーアッパー/メテオ/必殺技)。プレイヤーが攻撃側の場合のみ、キャラ画像だけを描いた
    // オフスクリーンcanvas上でsource-atop(その画像の非透明ピクセルにのみ新しい色が乗る合成モード)を使って
    // 白く塗りつぶし、それを本canvasへ重ねる。本canvas上で直接source-atopを使うと、既に描画済みの背景(不透明)
    // まで巻き込んで白くなってしまうため、オフスクリーンで完結させてから貼り付ける2段階にしている。
    if (finisherFlashSide === 'P' && finisherFlashAlpha > 0 && pImg) {
        const flashCtx = getFinisherFlashCanvas();
        flashCtx.clearRect(0, 0, DB.IMG_SIZE, DB.IMG_SIZE);
        flashCtx.globalCompositeOperation = 'source-over';
        flashCtx.drawImage(pImg, 0, 0, DB.IMG_SIZE, DB.IMG_SIZE);
        flashCtx.globalCompositeOperation = 'source-atop';
        flashCtx.fillStyle = '#fff';
        flashCtx.fillRect(0, 0, DB.IMG_SIZE, DB.IMG_SIZE);
        ctx.save();
        ctx.globalAlpha = finisherFlashAlpha;
        ctx.shadowColor = 'rgba(255,255,255,0.95)';
        ctx.shadowBlur = 30;
        ctx.drawImage(flashCtx.canvas, pRect.x, pRect.y, pRect.size, pRect.size);
        ctx.restore();
    }

    // 敵(振動・点滅・反転対応)
    const eJit = t < state.eShakeUntil ? (Math.random() * 6 - 3) : 0;
    const eBlinkA = t < state.eBlinkUntil ? ((Math.floor((state.eBlinkUntil - t) / 80) % 2 === 0) ? 1 : 0.25) : 1;
    const eAlpha = eBlinkA * state.introEnemyAlpha;
    const eImg = imgs[enemySpriteName(spriteFor(state.eAct, t))];
    ctx.save();
    ctx.globalAlpha = eAlpha;
    const eGlowPulse = (Math.sin(t / 180) + 1) / 2;
    const eScale = CHARACTER_SCALE_BY_SET[currentEnemySetName()] || 1; // Gald/Alvとして登場している場合のみ1.2倍/1.1倍になる
    const eRect = growRectKeepBottomCenter(-(state.eX + eJit) - DB.IMG_SIZE, state.eY + eJit, eScale);
    if (state.eUpperChargeReady && eImg) {
        // UPPER+GUARD+UPPER用のチャージ: 水色の発光
        ctx.save();
        ctx.scale(-1, 1);
        ctx.shadowColor = 'rgba(80, 220, 255, 0.95)';
        ctx.shadowBlur = 14 + eGlowPulse * 16;
        ctx.drawImage(eImg, eRect.x, eRect.y, eRect.size, eRect.size);
        ctx.restore();
    }
    if (state.eChargeValue > 0) { // ガード2連続成功以降のチャージ中は金色に発光する(次のコマンドまで持続)
        if (state.eChargeIsMax && eImg) {
            // 3連続以降(上位段階)は、外側に白いオーラをもう一段重ねて2倍と明確に区別する(実数値ではなくeChargeIsMaxフラグで判定する)
            ctx.save();
            ctx.scale(-1, 1);
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 36 + eGlowPulse * 20;
            ctx.drawImage(eImg, eRect.x, eRect.y, eRect.size, eRect.size);
            ctx.restore();
        }
        ctx.shadowColor = 'rgba(255, 215, 60, 0.95)';
        ctx.shadowBlur = 14 + eGlowPulse * 16;
    }
    if (eImg) {
        ctx.save(); ctx.scale(-1, 1); // 第19条: 敵は常に反転
        ctx.drawImage(eImg, eRect.x, eRect.y, eRect.size, eRect.size);
        ctx.restore();
        // フィニッシュ発光(スーパーアッパー/メテオ/必殺技)。敵が攻撃側の場合のみ、P側と同じくオフスクリーンcanvasで
        // キャラの非透明ピクセルだけ白くしたものを、反転済みの座標系で重ねて貼り付ける。
        if (finisherFlashSide === 'E' && finisherFlashAlpha > 0) {
            const flashCtx = getFinisherFlashCanvas();
            flashCtx.clearRect(0, 0, DB.IMG_SIZE, DB.IMG_SIZE);
            flashCtx.globalCompositeOperation = 'source-over';
            flashCtx.drawImage(eImg, 0, 0, DB.IMG_SIZE, DB.IMG_SIZE);
            flashCtx.globalCompositeOperation = 'source-atop';
            flashCtx.fillStyle = '#fff';
            flashCtx.fillRect(0, 0, DB.IMG_SIZE, DB.IMG_SIZE);
            ctx.save();
            ctx.scale(-1, 1); // 元のdrawImageと同じ反転座標系に合わせる
            ctx.globalAlpha = finisherFlashAlpha;
            ctx.shadowColor = 'rgba(255,255,255,0.95)';
            ctx.shadowBlur = 30;
            ctx.drawImage(flashCtx.canvas, eRect.x, eRect.y, eRect.size, eRect.size);
            ctx.restore();
        }
    } else {
        const eFallbackRect = growRectKeepBottomCenter(state.eX, state.eY, eScale); // フォールバックは反転前の座標系のまま
        ctx.fillStyle = '#f00'; ctx.fillRect(eFallbackRect.x, eFallbackRect.y, eFallbackRect.size, eFallbackRect.size);
    }
    ctx.restore();

    // ヒットエフェクト(命中の瞬間に一瞬表示し、技種別ごとの演出で消えていく)。
    // プレイヤー・敵両方のスプライトを描き終えた後に描画することで、キャラに隠れず手前に表示されるようにする。
    hitEffects = hitEffects.filter(fx => {
        const def = HIT_EFFECT_DEFS[fx.moveType];
        const life = (def && def.life) || HIT_EFFECT_LIFE;
        return (t - fx.born) < life;
    });
    hitEffects.forEach(fx => {
        const def = HIT_EFFECT_DEFS[fx.moveType];
        if (!def) return;
        const life = def.life || HIT_EFFECT_LIFE;
        const tierIdx = Math.min(Math.max(fx.tier || 1, 1), def.imgs.length) - 1;
        const img = imgs[def.imgs[tierIdx]] || imgs[def.imgs[0]]; // 該当段階の画像が無ければ1番目にフォールバック
        if (!img) return;
        const age = t - fx.born;
        const dispW = def.srcW * DB.SCALE;
        const dispH = def.srcH * DB.SCALE;

        if (def.anim === 'meteorLaunch') {
            // メテオを放つ瞬間、攻撃側に重ねて表示する光のエフェクト。攻撃側の実際の位置(この後、地面へ落下していく
            // アニメーション中も)を毎フレーム追従することで、キャラと同様に下へ落ちていくように見せる。
            // それに加えて、時間とともに収束していく縦方向の揺れを重ね、ガードの上位チャージ(3連続以降)と同じ
            // 白い光彩(shadowColor)をまとわせながら、時間経過でフェードアウトして消える。
            const decay = Math.max(0, 1 - age / life); // 1→0
            if (decay <= 0) return;
            const liveX = getX(fx.side);
            const liveY = getY(fx.side);
            const wobble = Math.sin(age / 22) * 3 * DB.SCALE; // 縦揺れ(振幅・周期とも一定の小刻みな揺れ。フェードに連動して収束させない)
            const drawY = liveY + (DB.IMG_SIZE - dispH) / 2 + wobble; // キャラの縦中央付近+縦揺れ
            ctx.save();
            ctx.globalAlpha = decay;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)'; // ガード上位チャージと同じ白い光彩
            ctx.shadowBlur = 26;
            if (fx.side === 'E') {
                // 敵側はキャラ本体と同じく反転して描画する(第19条)。反転コンテキスト内では、
                // 通常座標系のliveXに対応する位置は`-liveX - DB.IMG_SIZE`になる(敵キャラ本体の描画と同じ式)。
                // これをしないと、位置が実際の敵の位置とズレるだけでなく、画像自体も反転されないまま出てしまう。
                ctx.scale(-1, 1);
                const drawX = -liveX - DB.IMG_SIZE + (DB.IMG_SIZE - dispW) / 2;
                ctx.drawImage(img, 0, 0, def.srcW, def.srcH, drawX, drawY, dispW, dispH);
            } else {
                const drawX = liveX + (DB.IMG_SIZE - dispW) / 2; // キャラの横中央に重ねる
                ctx.drawImage(img, 0, 0, def.srcW, def.srcH, drawX, drawY, dispW, dispH);
            }
            ctx.restore();
            return;
        }

        if (def.anim === 'meteor') {
            // 被弾側キャラと全く同じ場所・同じ大きさ(fx.x, fx.yをそのまま使う)で表示する。
            // 最初の40%で下から上へワイプで現れ、続く25%は保持、残りでフェードアウトする。
            const revealDur = life * 0.4, holdDur = life * 0.25;
            let revealP, alpha;
            if (age < revealDur) {
                revealP = age / revealDur; alpha = 1;
            } else if (age < revealDur + holdDur) {
                revealP = 1; alpha = 1;
            } else {
                revealP = 1;
                alpha = 1 - (age - revealDur - holdDur) / (life - revealDur - holdDur);
            }
            if (alpha <= 0) return;
            const revealHeight = dispH * revealP;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.beginPath();
            ctx.rect(fx.x, fx.y + dispH - revealHeight, dispW, revealHeight); // 下端から上へ伸びる矩形でクリップする
            ctx.clip();
            ctx.drawImage(img, 0, 0, def.srcW, def.srcH, fx.x, fx.y, dispW, dispH);
            ctx.restore();
            return;
        }

        if (def.anim === 'wallburst') {
            // 壁(fx.xに保存済みの画面端座標)に接した状態から始まり、10px(ソース基準)内側へ飛び出したら、
            // すぐにその場から落下しながら消える。
            const burstDur = life * 0.35; // 飛び出す動きがはっきり見える速さにする(以前は0.12=54msと速すぎて視認しづらかった)
            const burstDist = 10 * DB.SCALE;
            let mag = 0, oy = 0, alpha = 1; // mag: 壁からの移動距離(絶対値、0〜burstDist)
            if (age < burstDur) {
                mag = (age / burstDur) * burstDist;
            } else {
                mag = burstDist;
                const fp = (age - burstDur) / (life - burstDur); // 0〜1
                oy = fp * 30 * DB.SCALE;
                alpha = 1 - fp;
            }
            if (alpha <= 0) return;
            // 壁に接する側の端をfx.xに固定し、そこから内側へmagだけ移動した位置に描画する(中央基準ではなく、壁面基準の配置)。
            // プレイヤー側(左壁)は左端をfx.xに固定して右へ、敵側(右壁)は右端をfx.xに固定して左へ。
            const drawX = fx.side === 'P' ? fx.x + mag : fx.x - dispW - mag;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.drawImage(img, 0, 0, def.srcW, def.srcH, drawX, fx.y + oy - dispH / 2, dispW, dispH);
            ctx.restore();
            return;
        }

        // PUNCH/UPPER/GUARD共通(retreat/rise/wobble)。最初の25%は静止した全表示、残りでanimに応じてフェードアウトしながら消える。
        const holdTime = life * 0.25;
        let alpha, p;
        if (age < holdTime) {
            alpha = 1; p = 0;
        } else {
            p = (age - holdTime) / (life - holdTime); // 0〜1
            alpha = 1 - p;
        }
        if (alpha <= 0) return;

        // X基準点: キャラの相手側の端から3px(ソース基準)。プレイヤーは右端、敵は反転描画のため左端が同じ意味になる。
        const baseAnchorX = fx.side === 'P' ? fx.x + DB.IMG_SIZE - 3 * DB.SCALE : fx.x + 3 * DB.SCALE;
        // Y基準点: PUNCHはキャラ縦中央、UPPER/GUARDはキャラ上端(「右上から」の基準)を、それぞれエフェクト自体の描画開始Y座標に変換する
        const baseAnchorY = fx.moveType === 'PUNCH' ? fx.y + DB.IMG_SIZE / 2 - dispH / 2 : fx.y;

        let offsetX = 0, offsetY = 0;
        if (def.anim === 'retreat') {
            // 放った側(自分自身)へ少しずつ戻りながら消える。プレイヤーは左へ、敵は右へ(画面座標基準、反転描画を踏まえた向き)。
            const retreat = p * 3 * DB.SCALE;
            offsetX = fx.side === 'P' ? -retreat : retreat;
        } else if (def.anim === 'rise') {
            // 上へ残像しながら消えていく
            offsetY = -p * 20 * DB.SCALE;
        } else if (def.anim === 'wobble') {
            // その場で細かく左右に揺れながら消える
            offsetX = Math.sin(age / 30) * p * 3 * DB.SCALE;
        }

        const drawOne = (a, extraOffsetY) => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, a);
            const destY = baseAnchorY + offsetY + (extraOffsetY || 0);
            if (fx.side === 'E') {
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, def.srcW, def.srcH, -(baseAnchorX + offsetX) - dispW / 2, destY, dispW, dispH);
            } else {
                ctx.drawImage(img, 0, 0, def.srcW, def.srcH, (baseAnchorX + offsetX) - dispW / 2, destY, dispW, dispH);
            }
            ctx.restore();
        };

        if (def.anim === 'rise') {
            // 残像: 本体のまだ上昇していない位置(少し下)に、より薄い分身を2つ重ねて描き、上昇の軌跡が見えるようにする
            drawOne(alpha * 0.25, dispH * 0.5);
            drawOne(alpha * 0.45, dispH * 0.25);
        }
        drawOne(alpha, 0);
    });

    // 技名ポップ(2026-09-27追加): 技が発動した瞬間、その英語名をキャラの頭上に、位置は動かさず斜め上へ
    // 傾けた状態で表示する(「斜め上に飛んでいくのではなく、斜め上に傾けて表示して欲しかっただけ」との指摘を
    // 受け、移動させる演出から角度を固定した表示に変更した)。出現・消滅とも「メリハリをつけた演出」にしたい
    // との要望を受け、なだらかなフェードではなく、短時間で勢いよく飛び出す(オーバーシュートしてから僅かに
    // 収まる)ポップイン→そのまま静止表示→短時間で一気に弾けるように消えるポップアウト、という構成にした。
    techNamePops = techNamePops.filter(p => (t - p.born) < TECH_NAME_POP_LIFE);
    // ローカル対戦(VERSUS)中は、文字(技名ポップ・COMBOカウンター)を反転コピーの後に描く(vsRenderMirror参照)。
    // 先にメインcanvasへ描いてしまうと、2P側の反転canvasで文字が鏡文字になってしまうため。
    const versusMirrorActive = isVersusMirrorActive();
    if (!versusMirrorActive) drawTechNamePops(ctx, t, 0);

    // ピヨり演出: しびれている側の頭上にpiyo.PNGを表示(反転を交互に切り替える)。
    // state.piyoSideがtruthyな間はずっと表示し続ける(開始/終了は startPiyo/stopPiyo が担う)。反転は経過時間から計算する。
    // piyo.PNGは実ファイルが32x32pxで、実際に使う絵柄は左上を基準にした横21px×縦9pxの範囲のみ。
    // state.piyoBrokenがtrueの間(割れる演出が開始されてからstopPiyoが呼ばれるまで)は、通常のバウンドの
    // 代わりに「ひび割れて分裂する」演出にする(2026-09-26: 以前は等倍のまま縮小+フェードするだけだったが、
    // 「割れるというより縮んで消える演出に見える」との指摘を受け、ひびの線が入った直後に左右2つの破片に
    // 分裂して弾け飛ぶ、より「割れた」感のある表現に変更した)。
    // 割れ終わった後(t >= piyoBreakUntil)も、呼び出し元がstopPiyo()を呼ぶまでのごく短い間(setTimeout系の
    // wait()とrequestAnimationFrameのタイミングのずれ分)はstate.piyoSideがまだtruthyのまま残るが、この間に
    // 「割れる前の通常表示」へ一瞬戻ってしまう(せっかく消えたのに一瞬だけ元の姿が見える)不具合が実際にあった。
    // これを防ぐため、割れる演出を開始したかどうかをstate.piyoBrokenで記録し、trueの間は割れ終わった後も
    // 何も描画しない(通常表示には絶対に戻さない)ようにする。
    if (state.piyoSide) {
        const piyoImg = imgs['piyo.PNG'];
        if (piyoImg) {
            const SRC_X = 6, SRC_Y = 0, SRC_W = 20, SRC_H = 9; // 元画像内での切り出し範囲(上・横中央寄せ)
            const baseX = state.piyoSide === 'P' ? state.pX : state.eX;
            const baseY = state.piyoSide === 'P' ? state.pY : state.eY;
            const isBreaking = state.piyoBroken && t < state.piyoBreakUntil;
            const breakFinished = state.piyoBroken && !isBreaking; // 割れ終わったが、stopPiyoがまだ呼ばれていない一瞬の猶予
            const breakP = isBreaking ? 1 - Math.max(0, (state.piyoBreakUntil - t) / 300) : 0; // 0〜1
            const pw = SRC_W * DB.SCALE, ph = SRC_H * DB.SCALE; // 割れる演出中もサイズは縮めない(分裂そのもので「割れた」感を出す)
            const px = baseX + (DB.IMG_SIZE - pw) / 2;
            const py = baseY - ph - 10;
            // 通常表示時の反転(180msごとに交互)。割れ始めた瞬間の状態で固定する(分裂した破片が
            // 飛び散っている途中で絵柄が反転すると不自然なため、割れ始めの時刻を使って以後固定する)。
            const flipRefTime = isBreaking ? (state.piyoBreakUntil - 300) : t;
            const piyoFlipNow = Math.floor(flipRefTime / 180) % 2 === 1;
            const drawWhole = (dx, dy) => {
                if (piyoFlipNow) {
                    ctx.translate(dx + pw, dy);
                    ctx.scale(-1, 1);
                    ctx.drawImage(piyoImg, SRC_X, SRC_Y, SRC_W, SRC_H, 0, 0, pw, ph);
                } else {
                    ctx.drawImage(piyoImg, SRC_X, SRC_Y, SRC_W, SRC_H, dx, dy, pw, ph);
                }
            };
            if (breakFinished) {
                // 割れ終わった後、まだstopPiyoが呼ばれていない一瞬の猶予: 何も描画しない
                // (通常表示への巻き戻りを防ぐ。上のコメント参照)。
            } else if (!isBreaking) {
                ctx.save();
                drawWhole(px, py);
                ctx.restore();
            } else {
                // 最初の30%(90ms)はひびの線を重ねて見せるだけに留め、そこから分裂を始める。
                const CRACK_FRAC = 0.3;
                const shatterP = Math.max(0, Math.min(1, (breakP - CRACK_FRAC) / (1 - CRACK_FRAC))); // 0〜1
                const halfW = pw / 2;
                const drawShard = (isLeft) => {
                    const dir = isLeft ? -1 : 1;
                    const cx = px + (isLeft ? halfW * 0.5 : halfW * 1.5); // 破片の中心(回転軸)
                    const cy = py + ph * 0.5;
                    const offsetX = shatterP * 10 * DB.SCALE * dir; // 左右に弾け飛ぶ距離
                    const offsetY = shatterP * 6 * DB.SCALE; // わずかに落下もさせる
                    const rot = shatterP * 0.6 * dir; // 外側へ回転しながら飛ぶ(ラジアン)
                    // フェードは分裂が始まってしばらく経ってから(破片が見えている時間を確保する)
                    const alpha = Math.max(0, 1 - Math.max(0, (shatterP - 0.2) / 0.8));
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.translate(cx + offsetX, cy + offsetY);
                    ctx.rotate(rot);
                    ctx.translate(-cx, -cy);
                    ctx.beginPath();
                    ctx.rect(px + (isLeft ? 0 : halfW), py, halfW, ph); // 縦の中央線で2分割してクリップ
                    ctx.clip();
                    drawWhole(px, py);
                    ctx.restore();
                };
                ctx.save();
                drawShard(true);
                drawShard(false);
                ctx.restore();

                // ひびの線: 分裂が始まる前(CRACK_FRACの間)だけ、不透明度を上げながら重ねて表示する。
                const crackIn = Math.max(0, Math.min(1, breakP / CRACK_FRAC));
                const crackOut = 1 - Math.max(0, Math.min(1, (breakP - CRACK_FRAC) / 0.08)); // 分裂開始直後に素早く消す
                const crackAlpha = crackIn * crackOut;
                if (crackAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = crackAlpha;
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = Math.max(1, DB.SCALE * 0.3);
                    ctx.beginPath();
                    ctx.moveTo(px + pw * 0.5, py);
                    ctx.lineTo(px + pw * 0.5, py + ph);
                    ctx.moveTo(px + pw * 0.35, py + ph * 0.25);
                    ctx.lineTo(px + pw * 0.5, py + ph * 0.45);
                    ctx.moveTo(px + pw * 0.65, py + ph * 0.6);
                    ctx.lineTo(px + pw * 0.5, py + ph * 0.8);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }

    // COMBOカウンター(第26条とは別の演出用記録。バトル背景の左上=味方、右上=敵)。2以上のみ表示し、
    // 増えた瞬間に軽くポップ、途切れるとフッとフェードアウトし、5/10/15到達時はきらびやかに強調する。
    if (!versusMirrorActive) {
        drawComboCounter('P', 24, 'left');
        drawComboCounter('E', cvs.width - 24, 'right');
    }

    // 画面全体を白く明滅させる演出(5THステージの敵登場等で使用)。他の描画すべての最後に重ねる
    if (state.screenFlashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = state.screenFlashAlpha;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.restore();
    }

    // ローカル対戦(VERSUS): 2P側のcanvasへ左右反転コピーし、文字だけは両canvasに正しい向きで描き足す
    if (versusMirrorActive) vsRenderMirror(t);

    requestAnimationFrame(draw);
    ctx.restore(); // 画面揺れの変換を解除(次フレームのclearRectに影響しないようにする)
}

// ============================================================
// 手札UI・敵AI
// ============================================================
function playCard(handIdx) {
    if (state.resolving || !state.battleReady) return;
    if (state.gameMode === 'versus' && versusState.phase !== 'inputP') return; // ローカル対戦: 1Pの入力番以外は操作不可
    const card = state.playerHand[handIdx];
    if (!card) return;
    if (state.requiredHandSize && filledCount() >= state.requiredHandSize) return; // このターン出せる枚数(ちょうど)に既に達している
    const slotIdx = state.hands.indexOf(null);
    if (slotIdx === -1) return; // 場(5枠)がすでに埋まっている
    state.hands[slotIdx] = card;
    playSE('se_deck_plus'); // デッキ編成の+ボタンと同じ音を、カードを場に出す音としても使う
    if (state.gameMode !== 'training') state.playerHand[handIdx] = null; // TRAINING MODEは選び放題のため手札から取り除かない
    updateHandUI();
    updateUI();
}

function resetHands() {
    if (state.resolving || !state.battleReady) return;
    if (state.gameMode === 'versus' && versusState.phase !== 'inputP') return; // ローカル対戦: 1Pの入力番以外は操作不可
    playSE('se_cancel');
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
    const GAP_X = handGapX(); // updateHandUI()と同じ配置計算に合わせる
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
    // ローカル対戦(VERSUS): 1Pの入力番以外は、相手に見られないよう手札を裏向き(タップ不可)で表示する
    const hideForVersus = state.gameMode === 'versus' && versusState.phase !== 'inputP';
    const n = state.playerHand.length; // STORY MODEは5、TRAINING MODEは3(PUNCH/UPPER/GUARD固定・選び放題)
    const mid = (n - 1) / 2; // 中央インデックス
    const GAP_X = handGapX(); // カード中心同士の横間隔(px)
    const ARC_K = 4;  // 円弧の深さ係数(大きいほど外側が下がる)
    state.playerHand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = 'card ' + (card ? 'filled' : 'empty');
        if (hideForVersus && card) setCardBackVisual(d);
        else applyCardVisual(d, card); // card_p/u/G.PNGがあれば画像、無ければP/U/Gの文字

        const offset = idx - mid; // -2, -1, 0, 1, 2
        // 高さ(top)は放物線(offset^2)で決める。中心=0が最も高く(top最小)、外側ほどなだらかに下がる。
        // これはCSSレイアウト上のtop値なので、rotateの角度に一切影響されない。
        const ty = offset * offset * ARC_K; // 0, 4, 16
        const tx = offset * GAP_X; // 横方向の間隔(中心からの距離)
        const angle = offset * 9; // deg (外側ほど上が外向きに傾く。見た目の傾きのみ)
        d.style.top = ty + 'px';
        if (card && !hideForVersus) d.onclick = () => playCard(idx);

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
    const label = document.getElementById('requiredHandSizeLabel');
    if (state.requiredHandSize) {
        label.style.display = '';
        // 英語表記(アーケード風のUIトーンに合わせる)。1枚の時だけ単数形(CARD)、2枚以上は複数形(CARDS)にする。
        const n = state.requiredHandSize;
        label.innerText = `PLAY ${n} CARD${n === 1 ? '' : 'S'} THIS TURN`;
    } else if (state.gameMode === 'training') {
        // TRAINING MODEはrequiredHandSizeを使わない(何枚出してもよい)ため、同じラベル欄を使って
        // 「好きなカードを出して自由に練習してよい」という雰囲気を出す一言を表示する(EXTRA BATTLEの指示表示と同じ枠)
        label.style.display = '';
        label.innerText = 'PLAY ANY CARD, MAKE ANY COMBO!';
    } else {
        label.style.display = 'none';
    }
    const s = document.getElementById('slots'); s.innerHTML = '';
    state.hands.forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot ' + (h ? 'filled' : 'empty');
        if (idx === activeIndex) cls += ' active-card';
        if (state.requiredHandSize && idx >= state.requiredHandSize) cls += ' slot-locked'; // 出せない枠を薄く見せる
        if (cardOutcomes.P[idx]) cls += ' ' + cardOutcomes.P[idx]; // ターン中の勝敗表現を保持
        d.className = cls;
        // ローカル対戦(VERSUS): 両者の手が揃う(解決が始まる)までは、1P以外が見ている間は場のカードも伏せる
        if (h && state.gameMode === 'versus' && versusSlotsHidden('P')) setCardBackVisual(d);
        else applyCardVisual(d, h);
        s.appendChild(d);
    });
    updateActionButtons();
    if (state.gameMode === 'versus') vsRenderTop(activeIndex); // 2P側(上半分)の場・相手カード表示も同期する
}

function updateActionButtons() {
    // GO!は、通常なら1枚でも出せば押せる。requiredHandSizeが設定されている場合(EXTRA BATTLE)は、
    // ちょうどその枚数出した時だけ有効になる(少なく出して確定する、は不可)。
    // CANCELはGO!と異なり、requiredHandSizeの有無に関わらず1枚でも場に出ていれば常に押せる
    // (揃っていない途中でも取り消せるようにするため。以前はGO!と同じ条件を共有しており、
    // EXTRA BATTLEでちょうどの枚数を揃えるまでCANCELすら押せない不具合があった)。
    const goOk = state.requiredHandSize ? filledCount() === state.requiredHandSize : filledCount() > 0;
    const clrOk = filledCount() > 0;
    // ローカル対戦(VERSUS): 1PのGO!/CANCELは1Pの入力番の間だけ押せる
    const versusBlocked = state.gameMode === 'versus' && versusState.phase !== 'inputP';
    document.getElementById('goBtn').disabled = !(state.battleReady && !state.resolving && goOk && !versusBlocked);
    document.getElementById('clrBtn').disabled = !(state.battleReady && !state.resolving && clrOk && !versusBlocked);
}

async function fadeOutQueueCards() {
    // ローカル対戦(VERSUS)では、2P側(上半分)の場のカードも同時に消す
    const cards = document.querySelectorAll(state.gameMode === 'versus' ? '#slots .slot.filled, #vsSlots2 .slot.filled' : '#slots .slot.filled');
    if (cards.length === 0) return;
    cards.forEach(el => {
        el.style.transition = 'opacity 0.45s ease-out, transform 0.45s ease-out';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-16px) scale(1.06)'; // ふわっと浮きながら消える
    });
    await wait(450);
}

// サブストーリーバトル(state.pPresetKeyが設定されている間)は、ターンごとに「出さなければならない枚数」を
// 1〜5の完全ランダムで再抽選する(少なく出して確定する、は不可。毎回ちょうどその枚数を揃える必要がある)。
// 通常のSTORY MODE/TRAINING MODEでは常にnullのままで、5枚まで自由に出せる従来の挙動を保つ。
// デッキの残り枚数が少ない終盤は、手札そのものが5枚に満たないことがある(山札が尽きても補充できないため)。
// この場合、実際に手札にある枚数を超える指示(例: 手札2枚しか無いのに4枚出せと言われる)を出さないよう、
// 上限を実際の手札枚数に合わせて絞る(手札4枚以下なら5は出さない、3枚以下なら4以上は出さない、…という形)。
function rollRequiredHandSize() {
    if (!state.pPresetKey) { state.requiredHandSize = null; return; }
    let availableCount = state.playerHand.filter(c => c !== null).length;
    // ローカル対戦(VERSUS): 両者とも同じ枚数を出すため、2Pの手札枚数とも比べて少ない方に合わせる
    if (state.gameMode === 'versus') availableCount = Math.min(availableCount, versusState.hand2.filter(c => c !== null).length);
    const maxAllowed = Math.max(1, Math.min(5, availableCount)); // 万一0枚でも最低1にしておく安全策
    state.requiredHandSize = 1 + Math.floor(Math.random() * maxAllowed);
}

function currentEnemyPreset() {
    if (state.gameMode === 'rush') return rushCurrentPreset(); // BATTLE RUSH: 雑魚(MIFUNE)か中ボス(既存5人)
    if (state.ePresetKey) return ENEMY_PRESETS[state.ePresetKey]; // サブストーリーバトルで対戦相手を直接指定する場合はこちらを優先
    const id = ENEMY_ORDER[state.storyEnemyIndex % ENEMY_ORDER.length];
    return ENEMY_PRESETS[id];
}
// このside(P/E)が現在どのENEMY_PRESETSエントリの特性(攻撃力/防御力/しびれ耐性/デッキ配分等)を持つかを返す
// (該当が無ければnull)。通常はE側(currentEnemyPreset())のみが該当するが、サブストーリーバトルで
// プレイヤーがいずれかの敵キャラとして戦う場合は、P側もstate.pPresetKeyのプリセットを持つようになる。
// atkMultOf/defMultOf等、これまで「side==='E'」で決め打ちしていた箇所を、この関数経由に置き換えることで、
// 通常時は完全に同じ挙動を保ったまま、サブストーリーバトルにも同じロジックを流用できるようにする。
function presetForSide(side) {
    if (side === 'E') return currentEnemyPreset();
    if (side === 'P' && state.pPresetKey) return ENEMY_PRESETS[state.pPresetKey];
    return null;
}

// HPバー下の名前表示を更新する。味方は固定でVAL、敵はSTORY MODEなら現在の敵プリセット名、
// TRAINING MODEなら固定でMIFUNE(STORY MODEは今後の連戦で敵が変わるたびに自動で切り替わる)
function updateCharNames() {
    if (state.gameMode === 'versus') { vsUpdateNames(); return; } // ローカル対戦は1P/2P表記付きの実名(？？？マスキングなし)
    document.getElementById('playerName').innerText =
        state.pPresetKey ? ENEMY_PRESETS[state.pPresetKey].name : 'VAL'; // 表記はVAL/Noah/Rita/Gald/Jack/Alv/MIFUNEで統一(大文字化しない) // サブストーリーバトルは借りているキャラの名前を表示
    document.getElementById('enemyName').innerText =
        state.gameMode === 'training' ? 'MIFUNE' :
        state.gameMode === 'rush' ? rushCurrentPreset().name :
        state.ePresetKey ? substoryBattleOpponentName(state.ePresetKey) : // サブストーリーバトルは？？？マスキングを経由する
        currentEnemyPreset().name;
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

// 直近に出した手(history、配列)が、favoritePatternsのいずれかの先頭部分と一致していれば、
// その続きの手の重みを底上げして返す。複数のパターンが同時に一致する場合は重みが積み上がる。
// 一致するパターンが無ければbaseWeightsをそのまま返す(絶対に完成させるわけではなく、あくまで出やすくなるだけ)。
function getPatternBoostedWeights(history, patterns, avoidPatterns, baseWeights) {
    let w = null;
    if (patterns && patterns.length > 0 && history.length > 0) {
        for (const pattern of patterns) {
            const matchLen = Math.min(history.length, pattern.length - 1);
            if (matchLen === 0) continue;
            const historyTail = history.slice(-matchLen).join(',');
            const patternPrefix = pattern.slice(0, matchLen).join(',');
            if (historyTail === patternPrefix) {
                const nextMove = pattern[matchLen];
                if (!w) w = Object.assign({}, baseWeights);
                w[nextMove] = (w[nextMove] || 0) + 25; // 一致したパターンの数だけ重みが積み上がる
            }
        }
    }
    if (avoidPatterns && avoidPatterns.length > 0 && history.length > 0) {
        for (const pattern of avoidPatterns) {
            const matchLen = Math.min(history.length, pattern.length - 1);
            if (matchLen === 0) continue;
            const historyTail = history.slice(-matchLen).join(',');
            const patternPrefix = pattern.slice(0, matchLen).join(',');
            if (historyTail === patternPrefix) {
                const nextMove = pattern[matchLen];
                if (!w) w = Object.assign({}, baseWeights);
                w[nextMove] = Math.max(1, (w[nextMove] || 0) - 6); // 大きく減らすが、完全に0にはしない(絶対に避けるわけではない)
            }
        }
    }
    return w || baseWeights;
}

function generateEnemyTurnHand(count) {
    // STORY MODE: 現在の敵プリセットの配分に基づいて生成する。
    // favoritePatterns(よく出す手の並び)・avoidPatterns(避けたがる手の並び)・firstMoveBias(一手目の出やすさ)があれば、その分だけ重みを増減する。
    // smallHandThreshold/smallHandBiasがあり、そのターンの手数がしきい値以下であれば、全カードに追加の重みをかける
    // (例: 少ない手数の時はPUNCH連打でダメージを稼ごうとする、といった手数依存の性格を表現できる)。
    const preset = currentEnemyPreset();
    const weights = preset.deck;
    const patterns = preset.favoritePatterns || [];
    const avoidPatterns = preset.avoidPatterns || [];
    const isSmallHand = preset.smallHandThreshold && count <= preset.smallHandThreshold;
    const arr = [];
    for (let i = 0; i < count; i++) {
        let w = getPatternBoostedWeights(arr, patterns, avoidPatterns, weights);
        if (i === 0 && preset.firstMoveBias) {
            w = Object.assign({}, w);
            for (const key in preset.firstMoveBias) {
                w[key] = (w[key] || 0) + preset.firstMoveBias[key];
            }
        }
        if (isSmallHand && preset.smallHandBias) {
            w = Object.assign({}, w);
            for (const key in preset.smallHandBias) {
                w[key] = (w[key] || 0) + preset.smallHandBias[key];
            }
        }
        if (i === 4 && preset.noFiveOfAKind && arr.slice(0, 4).every(m => m === arr[0])) {
            w = Object.assign({}, w);
            w[arr[0]] = 0; // 5枚目で同じカードが5枚そろわないようにする
        }
        arr.push(weightedRandomMove(w));
    }
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
    if (state.gameMode === 'versus') vsRenderTop(activeIndex); // 2P側(上半分)の相手カード表示も同期する
}

// ============================================================
// バトル進行
// ============================================================
async function goBattleStart() {
    writeSaveData({ deckCounts: { PUNCH: deckCounts.PUNCH, UPPER: deckCounts.UPPER, GUARD: deckCounts.GUARD } }); // デッキ編成を保存
    // CONTINUE等、playStorySequenceを経由しない経路もあるため、ここでも念のため先読みを開始する(既に読み込み済み/読み込み中なら何もしない)。
    // 通常はplayStorySequence〜デッキ編成までの時間で既に読み込みが終わっているため、ここでローディングが実際に表示されるのは
    // CONTINUE等でその猶予時間を経由しなかった場合が主になる。
    const battleStageNum = (state.storyEnemyIndex % ENEMY_ORDER.length) + 1;
    await ensureReadyWithLoading(Promise.all([
        loadEnemySet('enemy_' + battleStageNum),
        loadStageBackground(battleStageNum === 1 ? 'bg.PNG' : `bg_${battleStageNum}.PNG`),
        preloadBgm('bgm_battle_' + (state.storyEnemyIndex + 1), 'bgm_battle')
    ]));
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    // STORY MODEはステージ(敵)ごとに異なるBGMを流す。未配置の場合は汎用のbgm_battleへフォールバックする
    playBGM('bgm_battle_' + (state.storyEnemyIndex + 1), 'bgm_battle');
}

function resetBattleState() {
    // 第13条: state自体は再定義せず、プロパティのみ初期値に戻す
    state.hpP = 100; state.hpE = 100;
    state.pTookDamage = false; // このバトルでプレイヤーが一度でもダメージを受けたか(PERFECT!!判定用、2026-09-30)
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
    state.numbSureSide = null;
    state.piyoSide = null;
    state.piyoBroken = false;
    state.pPunchStreak = 0; state.pPunchChain = 0;
    state.ePunchStreak = 0; state.ePunchChain = 0;
    state.pGuardStreak = 0;
    state.eGuardStreak = 0;
    state.pChargeValue = 0;
    state.eChargeValue = 0;
    state.pChargeIsMax = false;
    state.eChargeIsMax = false;
    state.pUpperChargeReady = false;
    state.eUpperChargeReady = false;
    state.pLastWinWasUpper = false;
    state.eLastWinWasUpper = false;
    state.skipNextReposition = false;
    state.pComboType = null; state.eComboType = null;
    state.pComboStart = -1; state.eComboStart = -1;
    state.pComboAlive = false; state.eComboAlive = false;
    state.pCombos = []; state.eCombos = [];
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
    state.gameMode = state.pendingMode || 'story'; // デッキ編成画面へ来た時に選んだモードを確定
    // 敵の最大HP。BATTLE RUSHのみ1人目の最大HPで始め、以後は敵が入れ替わるたびにrushSpawnNextEnemyで設定し直す
    state.hpMaxE = state.gameMode === 'rush' ? rushEnemyMaxHp() : 100;
    state.hpE = state.hpMaxE;
    updateSpeedUI(); // gameModeの確定後にもう一度同期する(BATTLE RUSHではSPEEDボタンを隠すため)
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
    // ただしpPresetKeyが設定されている場合(サブストーリーバトル)は、通常の編成可能なdeckCountsではなく、
    // 借りているキャラ(ENEMY_PRESETS)のデッキ配分をそのまま使う(編成不可、そのキャラの比率固定)。
    // TRAINING MODEのみ、山札を使わず固定でPUNCH/UPPER/GUARDの3枚を手札にする(タップしても減らない=選び放題)。
    if (state.gameMode === 'training') {
        state.playerDeck = [];
        state.playerDiscard = [];
        state.playerHand = ['PUNCH', 'UPPER', 'GUARD'];
    } else {
        // BATTLE RUSHはデッキ編成を経由せず、VALの固定デッキ(7/7/7)を使う(能力は通常のプレイヤーのまま)
        const deckSource = state.gameMode === 'rush' ? RUSH_PLAYER_DECK : state.pPresetKey ? ENEMY_PRESETS[state.pPresetKey].deck : deckCounts;
        state.playerDeck = buildDeckArray(deckSource);
        state.playerDiscard = [];
        state.playerHand = new Array(5).fill(null);
        for (let i = 0; i < 5; i++) state.playerHand[i] = drawCard();
    }
    if (state.gameMode === 'versus') vsResetBattleSide2(); // ローカル対戦: 2P側の山札・手札・場も同様に用意する
    rollRequiredHandSize(); // サブストーリーバトルなら1枚目のターン分の枚数をここで決める(通常時はnullのまま)

    document.getElementById('hpP').style.width = '100%';
    document.getElementById('hpP_y').style.width = '100%';
    document.getElementById('hpE').style.width = '100%';
    document.getElementById('hpE_y').style.width = '100%';
    document.getElementById('turnDisplay').innerHTML = `TURN<br>0<br><span id="turnStageLabel">${currentStageLabel()}</span>`;
    if (state.gameMode === 'rush') rushUpdateHud(); // BATTLE RUSHはTURN表示の位置を撃破数/経過タイムにする
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

// STORY MODEの敵登場演出の最後に、その敵の得意技を一瞬デモさせる。ストーリーのセリフで語られる得意技(第◯条参照)を、
// 演出としても直接見せることで、SKIPされても・セリフの意味を読み取れなくても伝わるようにするための補助。
// PUNCH/UPPERのポーズにはse_deck_plusを、GUARDのポーズにはガード成功と同じ効果音(se_guard)を鳴らす。
async function playEnemySignaturePose() {
    if (state.gameMode !== 'story') return; // STORY MODEの敵のみ(TRAINING MODEは対象外)
    const idx = state.storyEnemyIndex;
    if (idx === 0) {
        // Noah: パンチを素早く3連打
        for (let i = 0; i < 3; i++) {
            if (i >= 1) await flashDashBetweenPunches('E'); // 2発目以降のみ、パンチ同士の切り替えなのでdashを挟む
            setAct('E', i % 2 === 0 ? 'punch.PNG' : 'punch2.PNG');
            playSE('se_deck_plus');
            await wait(150);
        }
        setAct('E', 'IDLE');
        await wait(200);
    } else if (idx === 1) {
        // Rita: アッパーを1回、通常の半分の高さで
        setAct('E', 'upper.PNG');
        playSE('se_deck_plus');
        const halfHopY = DB.POS.GROUND_Y - (DB.POS.GROUND_Y - DB.POS.HOP_Y) / 2;
        const fromY = state.eY;
        const steps = 6, stepMs = 40;
        for (let s = 1; s <= steps; s++) {
            setY('E', fromY + (halfHopY - fromY) * (s / steps));
            await wait(stepMs);
        }
        await wait(150);
        for (let s = 1; s <= steps; s++) {
            setY('E', halfHopY + (fromY - halfHopY) * (s / steps));
            await wait(stepMs);
        }
        setY('E', fromY);
        setAct('E', 'IDLE');
        await wait(200);
    } else if (idx === 2) {
        // Gald: ガードを1回構え、2段階チャージの発光演出を見せてから、通常ポーズに戻す(チャージは実際には持ち越さない)
        setAct('E', 'guard.PNG');
        playSE('se_guard');
        await wait(200);
        state.eChargeValue = 2; state.eChargeIsMax = false; // 2段階(金色の発光)の演出だけを見せる
        await wait(500);
        state.eChargeValue = 0; state.eChargeIsMax = false; // デモ用のチャージなので解除し、実際の対戦には影響させない
        setAct('E', 'IDLE');
        await wait(200);
    } else if (idx === 3) {
        // Jack: パンチ・ガード・アッパー、全部見せる(1つに絞らないのが個性のため)
        setAct('E', 'punch.PNG');
        playSE('se_deck_plus');
        await wait(350);
        setAct('E', 'guard.PNG');
        playSE('se_guard');
        await wait(350);
        setAct('E', 'upper.PNG');
        playSE('se_deck_plus');
        await wait(350);
        setAct('E', 'IDLE');
        await wait(200);
    }
    // idx === 4 (Alv): 何もしない(あえて手の内を見せない、というラスボスらしさの演出)
}

// ------- 敵の登場演出(ステージ固有) -------
// 以前はplayBattleIntro内に直接書いていたが、BATTLE RUSHの中ボス登場でも同じ演出を使うため関数に切り出した(挙動は同一)。
// 2ND STAGE: 画面右外からdash.PNGの姿勢で定位置へ(残像付き、通常のdash移動よりゆっくり)
async function enemyEntryDash() {
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
}
// 4TH STAGE: 空中コンボで打ち上げられたくらいの高さ(FLOAT_Y)から、フェードインしながら等速でゆっくり降りてくる(重力による加速はさせない)
async function enemyEntryDescend() {
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
}
// 5TH STAGE: 画面が白く4回明滅→0.5秒待機→もう一度4回明滅→明滅が終わった直後、定位置へじわっとフェードイン
async function enemyEntryFlash() {
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
// 1ST/3RD STAGE(固有演出なし)相当: 定位置にふわっとフェードインする(通常は味方と同時だが、BATTLE RUSHの中ボス交代時は敵だけで行う)
async function enemyEntryFade() {
    state.eX = DB.POS.E_HOME_X;
    state.eY = DB.POS.GROUND_Y;
    state.introEnemyAlpha = 0;
    const fadeSteps = 10;
    for (let s = 1; s <= fadeSteps; s++) {
        state.introEnemyAlpha = s / fadeSteps;
        await wait(50);
    }
    state.introEnemyAlpha = 1;
    await wait(200);
}

async function playBattleIntro() {
    await wait(300); // 真っ暗な状態を一瞬見せる

    // ステージ固有の敵登場演出(STORY MODEの2ND/4TH/5THステージのみ)。該当する場合、敵は背景表示後に個別の演出で登場する。
    // BATTLE RUSHの1人目は雑魚(MIFUNE)のため、2ND STAGEと同じdashで右から登場させる
    const specialStage = state.gameMode === 'story' ? state.storyEnemyIndex : state.gameMode === 'rush' ? 1 : -1; // 0=1st,1=2nd,2=3rd,3=4th,4=5th
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
    if (specialStage === 1) await enemyEntryDash();
    else if (specialStage === 3) await enemyEntryDescend();
    else if (specialStage === 4) await enemyEntryFlash();

    // ステージ固有の登場演出が終わった直後、得意技のデモポーズを一瞬見せる(STORY MODEのみ)
    await playEnemySignaturePose();

    // BATTLE START: 左からディゾルブして中央で停止(STORY MODEのみ、上の行にステージ表記を添える)
    // BATTLE RUSHのみ、「BATTLE RUSH」+「BATTLE START」では画面に入り切らないため「BATTLE RUSH」+「START」の2行にする
    const isRushStart = state.gameMode === 'rush';
    document.getElementById('battleStageLabel').innerText = isRushStart ? 'BATTLE RUSH' : currentStageLabel();
    document.getElementById('battleStartLabel').innerText = isRushStart ? 'START' : 'BATTLE START';
    const bst = document.getElementById('battleStartText');
    // ローカル対戦(VERSUS)では、2P側(上半分)の同じ表示にも同じクラスを付け外しして同時に演出する
    const bstMirror = state.gameMode === 'versus' ? document.getElementById('vsBattleStartText2') : null;
    if (bstMirror) document.getElementById('vsBattleStageLabel2').innerText = currentStageLabel();
    bst.classList.add('enter');
    if (bstMirror) bstMirror.classList.add('enter');
    await wait(650);
    await wait(450); // 中央で少し静止

    // 拡大しながら消える
    bst.classList.add('exit');
    if (bstMirror) bstMirror.classList.add('exit');
    await wait(550);
    bst.classList.remove('enter', 'exit');
    if (bstMirror) bstMirror.classList.remove('enter', 'exit');

    if (state.gameMode === 'versus') {
        // ローカル対戦: 手札は相手に見られないよう、各自の入力番が来た時にめくる(vsBeginTurnInput参照)
        state.battleReady = true;
        vsBeginTurnInput();
        return;
    }

    await dealInitialHandAnimation(); // 手札を裏向きで配り、左から順にめくる(バトル開始時だけの演出)

    state.battleReady = true;
    updateActionButtons();
    if (state.gameMode === 'story' && state.storyEnemyIndex === 0 && !tutorialSeen.battle) showTutorial('battle'); // はじめてのNoah戦のみ(2026-10-01)
    if (state.gameMode === 'rush') rushStartTimer(); // BATTLE RUSH: 手札が配られて操作できるようになった瞬間から計測する
}

// STORY MODEでenemyIndexの敵を撃破したことを記録する(既に記録済みなら何もしない)。
// サブストーリーバトル(検討中の新機能)で、まだ本編で見たことのない敵の名前を「？？？」にして
// ネタバレを防ぐための判定に使う想定。
function markEnemyDefeated(idx) {
    if (defeatedEnemyIndices.includes(idx)) return;
    defeatedEnemyIndices.push(idx);
    writeSaveData({ defeatedEnemyIndices });
}
// enemyIndexの敵をSTORY MODEで一度でも撃破したことがあるかどうか
function isEnemyDefeated(idx) {
    return defeatedEnemyIndices.includes(idx);
}

function showResult(type) {
    if (state.gameMode === 'rush') { showRushResult(false); return; } // BATTLE RUSH: 倒れた時点で専用のRESULT(敵撃破はここを通らない)
    if (state.gameMode === 'versus') { vsShowResult(); return; } // ローカル対戦は上下それぞれにYOU WIN/YOU LOSEを出す専用の決着画面
    // STORY MODEでの勝利(K.O.以外)は、その時点で戦っていた敵を撃破履歴に記録する(最終戦に限らず毎回)
    if (type !== 'KO' && state.gameMode === 'story') {
        markEnemyDefeated(state.storyEnemyIndex);
    }

    // 5人目(最終)の敵をYOU WINで倒した場合のみ、通常の決着画面ではなく専用のエンディング演出に分岐する
    const isFinalVictory = (type !== 'KO') && state.gameMode === 'story' && (state.storyEnemyIndex === ENEMY_ORDER.length - 1);
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
    // 一度もダメージを受けずに勝利した場合は「PERFECT!!」を表示する(STORY MODE・EXTRA BATTLE。COMBO PERFECTと両方達成なら両方出る)
    const isNoDamage = type !== 'KO' && (state.gameMode === 'story' || state.gameMode === 'substoryBattle') && !state.pTookDamage;
    document.getElementById('resultNoDamageText').style.display = isNoDamage ? '' : 'none';
    if (isNoDamage) { perfectWins++; writeSaveData({ perfectWins }); }

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

    // サブストーリーバトル(検討中の新機能)は、通常のCONTINUE/NEXT BATTILEとは異なる専用の分岐にする。
    if (state.gameMode === 'substoryBattle') {
        if (type === 'KO') {
            // 敗北: 同じ対戦カード(相手・ステージ・借りているキャラ)のまま再戦できる
            continueBtn.style.display = 'inline-block';
            backTitleBtn.style.display = 'inline-block';
            continueBtn.innerText = 'CONTINUE';
            continueBtn.onclick = () => retrySubstoryBattle();
            backTitleBtn.onclick = () => { endSubstoryBattle(); goLogo(); }; // 諦めてタイトルへ戻る場合も、必ず状態をクリーンアップする
            document.getElementById('resultOverlay').classList.add('show');
        } else {
            // 勝利: 通常のボタンは出さず、YOU WINの余韻の後、直接エピローグ→コスチューム解放へ進む
            continueBtn.style.display = 'none';
            backTitleBtn.style.display = 'none';
            document.getElementById('resultOverlay').classList.add('show');
            (async () => {
                await wait(4000); // YOU WINの余韻を見せてから(STORY MODEの自動進行と揃える)
                hideResult();
                await playSubstoryBattleEpilogue(state.pPresetKey);
            })();
        }
        return;
    }

    // K.O.(敗北)は従来通りCONTINUE/タイトルへ戻るの選択肢を出す。
    // YOU WIN(勝利、最終戦以外)は、STORY MODEに限り選択肢を出さず、余韻の後に自動で次の敵へ進む
    // (EXTRA BATTLE勝利時の演出と揃える)。TRAINING MODE等、他のモードでこの分岐に達した場合
    // (例: 1ターン中にダメージでHPが0になった場合)は、意図せずgoNextEnemy(STORY MODEの進行)を
    // 呼んでしまわないよう、安全のため従来通りボタンを表示する形のままにする。
    if (type === 'KO' || state.gameMode !== 'story') {
        continueBtn.style.display = 'inline-block';
        backTitleBtn.style.display = 'inline-block';
        continueBtn.innerText = (type === 'KO') ? 'CONTINUE' : 'NEXT BATTLE';
        continueBtn.onclick = (type === 'KO') ? (() => goDeckBuild()) : goNextEnemy;
        backTitleBtn.onclick = () => goLogo(); // サブストーリーバトルの分岐で上書きされている場合があるため、通常時のハンドラを都度明示的に戻す
        document.getElementById('resultOverlay').classList.add('show');
    } else {
        continueBtn.style.display = 'none';
        backTitleBtn.style.display = 'none';
        document.getElementById('resultOverlay').classList.add('show');
        (async () => {
            await wait(4000); // YOU WINの余韻を見せてから
            hideResult();
            goNextEnemy();
        })();
    }
}

function hideResult() {
    document.getElementById('resultOverlay').classList.remove('show');
    const rushOv = document.getElementById('rushResultOverlay');
    if (rushOv) rushOv.classList.remove('show');
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

// 敵ごとの攻撃力の癖(ENEMY_PRESETSのatkMult)。通常は敵側のみ適用されプレイヤーの与ダメには影響しないが、
// サブストーリーバトルでプレイヤーがそのキャラとして戦う場合は、presetForSide経由でプレイヤー側にも適用される。
// 「少し低め」のような表現は0.85(15%減)のように具体的な倍率に変換して設定する。指定が無ければ1(等倍)。
// moveを指定すると、ENEMY_PRESETSのatkMultByMove(技ごとの個別倍率、例: { UPPER: 1.1 })があればそちらを優先して使う
// (例: 全体は少し低めでも、得意技のUPPERだけは通常より少し高くする、といった調整ができる)。指定が無ければ通常のatkMultにフォールバックする。
function atkMultOf(side, move) {
    if (state.gameMode === 'rush' && side === 'E') return rushAtkRatio(move); // BATTLE RUSH: 敵の攻撃力は段階的に上がる専用の値
    const preset = presetForSide(side);
    if (!preset) return 1;
    if (move && preset.atkMultByMove && preset.atkMultByMove[move] !== undefined) {
        return preset.atkMultByMove[move];
    }
    return preset.atkMult || 1;
}

// 敵ごとの防御力の癖(ENEMY_PRESETSのdefMult)。atkMultOfと対になるヘルパーで、該当プリセットを持つ側が
// 被弾する時のみ適用する(defenderに該当側を渡した時だけ意味を持つ)。
// moveを指定すると、ENEMY_PRESETSのdefMultByMove(技ごとの個別倍率、例: { UPPER: 1.3 }=UPPERに弱い)があればそちらを優先する。
function defMultOf(side, move) {
    const preset = presetForSide(side);
    if (!preset) return 1;
    if (move && preset.defMultByMove && preset.defMultByMove[move] !== undefined) {
        return preset.defMultByMove[move];
    }
    return preset.defMult || 1;
}

// チャージを消費する(ガード成功以外の攻防終了時に呼ぶ)。勝敗に関わらず、次に出したカードで必ず消費される。
function consumeCharge(side) {
    if (side === 'P') { state.pChargeValue = 0; state.pChargeIsMax = false; }
    else { state.eChargeValue = 0; state.eChargeIsMax = false; }
}

// UPPER→GUARDの連続で発動するチャージ(次に出すカードがUPPERの時だけ有効)を消費する。
// 通常のチャージ(consumeCharge)と同じく、勝敗に関わらず次に出したカードで必ず消費される。
function consumeUpperCharge(side) {
    if (side === 'P') state.pUpperChargeReady = false; else state.eUpperChargeReady = false;
}

function applyDamage(target, amount) {
    if (target === 'P' && amount > 0) state.pTookDamage = true; // ノーダメージ勝利(PERFECT!!)判定用
    if (target === 'E') {
        state.hpE = Math.max(0, state.hpE - amount);
        const ePct = state.hpE / (state.hpMaxE || 100) * 100; // 通常はhpMaxE=100のため従来通り。BATTLE RUSHのみ敵ごとの最大HPに対する割合
        document.getElementById('hpE').style.width = ePct + '%';
        setTimeout(() => { document.getElementById('hpE_y').style.width = ePct + '%'; }, 0); // 第17条
    } else {
        state.hpP = Math.max(0, state.hpP - amount);
        document.getElementById('hpP').style.width = state.hpP + '%';
        setTimeout(() => { document.getElementById('hpP_y').style.width = state.hpP + '%'; }, 0);
    }
    triggerBlink(target, 180); // どんなダメージでも、受けた側を一瞬点滅させる
}

function healBothToFull() {
    state.hpP = 100; state.hpE = 100; state.hpMaxE = 100;
    document.getElementById('hpP').style.width = '100%';
    document.getElementById('hpP_y').style.width = '100%';
    document.getElementById('hpE').style.width = '100%';
    document.getElementById('hpE_y').style.width = '100%';
}

// バトル中(GO!を押してからターン解決が終わるまで、state.resolvingがtrueの間)のみ、2倍速設定を反映する。
// プロローグ/ストーリー/タイトル演出等、バトル以外のシーンはこの関数を使っていても速度が変わらない。
function wait(ms) {
    const scaledMs = (battleSpeedX2 && state.resolving && state.gameMode !== 'rush') ? ms / 2 : ms; // BATTLE RUSHは2倍速を使えない
    return new Promise(r => setTimeout(r, scaledMs));
}

// 第24条: 双方が残像付きのdash.PNGでX座標を目標地点まで移動する汎用関数。
// ただしピヨり中(state.piyoSide)の側は、次のコマンドが始まるまでその場に留まり、dashで動かない(位置・残像とも据え置き)。
async function moveBothX(pTo, eTo, steps = 6, stepMs = 40) {
    const pFrozen = state.piyoSide === 'P';
    const eFrozen = state.piyoSide === 'E';
    // 2026-09-22: 以前はガード成功後、相手がしびれている間は構え(guard.PNG)を維持しdash.PNGへ上書きしない
    // 仕様だったが、「ガードを連続で決めた時、dashではなくガードの構えのまま下がる動きになるのが気になる」
    // という要望を受け、ピヨり中(state.piyoSide、その場に留まる側)以外は常にdash.PNGへ切り替えるよう変更した。
    if (!pFrozen) state.pAct = 'dash.PNG';
    if (!eFrozen) state.eAct = 'dash.PNG';
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
        await wait(1700); // 倒れてからYOU WIN/K.O.が出るまでの間をもう1秒長くする(700ms→1700ms)
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
    playSE('se_kabe'); // 最後に倒れ込む音(壁激突と同じ音を流用)
    await wait(1700); // 倒れてからYOU WIN/K.O.が出るまでの間をもう1秒長くする(700ms→1700ms)

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
    if (state.gameMode === 'rush' && side === 'P') rushState.maxCombo = Math.max(rushState.maxCombo, state[comboKey]); // BATTLE RUSHの最大COMBO記録
    if (state.gameMode === 'story' && side === 'P' && state[comboKey] > storyMaxCombo) { // STORY MODEの最大COMBO記録(RECORDS用)
        storyMaxCombo = state[comboKey];
        writeSaveData({ storyMaxCombo });
    }
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
    const dmg = (DB.DMG.P + cyclePos * DB.DMG.P_COMBO_STEP) * chargeMultOf(winner) * atkMultOf(winner) * defMultOf(loser); // 3発周期で増加、チャージ中は2倍/4倍
    state[winnerStreakKey]++; // 命中したので連続記録を伸ばす
    state[loserStreakKey] = 0; // 負けた側の連続記録は途切れる
    // 技判定用のPUNCH連続(あいこも含む)。PUNCHで勝てば伸び、PUNCH以外の勝ち・負けで途切れる
    const winnerChainKey = winner === 'P' ? 'pPunchChain' : 'ePunchChain';
    state[winnerChainKey] = move === 'PUNCH' ? state[winnerChainKey] + 1 : 0;
    state[loser === 'P' ? 'pPunchChain' : 'ePunchChain'] = 0;
    state.pGuardStreak = 0; state.eGuardStreak = 0; // ガード以外で勝敗が決したのでガード連続記録は途切れる
    consumeCharge(winner); consumeCharge(loser); // ガード勝利以外なので、双方のチャージをここで消費する
    consumeUpperCharge(winner); consumeUpperCharge(loser); // UPPER+GUARD+UPPER用のチャージも同様に消費する
    state.pLastWinWasUpper = false; state.eLastWinWasUpper = false; // このPUNCH勝利はUPPER勝利ではないため、連続検知用フラグをリセットする
    applyDamage(loser, dmg);
    triggerShake(loser, 350); // 第8条: 負けた側のみ振動
    if (move === 'PUNCH') { playSE('se_punch'); spawnHitEffect(winner, 'PUNCH', cyclePos + 1); }

    // Jackの特性(またはJackとして戦うプレイヤー): パンチが命中すると、控えめな威力の2発目が追加でヒットする(トリッキーな二段攻撃)
    const winnerPresetForDoubleHit = presetForSide(winner);
    if (move === 'PUNCH' && winnerPresetForDoubleHit && winnerPresetForDoubleHit.doubleHitMult) {
        await wait(150);
        const secondDmg = dmg * winnerPresetForDoubleHit.doubleHitMult;
        await flashDashBetweenPunches(winner);
        setAct(winner, nextPunchSprite(winner)); // 2発目のスプライトに切り替える
        applyDamage(loser, secondDmg);
        triggerShake(loser, 250);
        playSE('se_punch');
        spawnHitEffect(winner, 'PUNCH', cyclePos + 1); // 1発目と同じ段階の見た目を使う(3発周期そのものはこの2発目では進めていないため)
        hitComboSuccess(winner); // 実際に2発当たっているので、COMBOカウンターも2発分(1発目の分と合わせて)加算する
    }

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
    markSpecialUsed('meteor', attacker); // 実績: メテオの使用を記録(2026-09-30追加)
    spawnTechNamePop(attacker, 'METEOR!'); // 技名ポップ(第36条: メテオ)。暗転が始まるタイミングで表示する
    await playFinisherBuildup(attacker); // 暗転→一時停止→攻撃側が白く発光→晴れる、のフィニッシュ演出
    setAct(attacker, 'knock.PNG'); // Beat1: 攻撃絵(放つ瞬間のポーズ)
    await wait(DB.HITSTOP.POSE_MS); // ヒットストップ
    applyDamage(defender, DB.DMG.M * chargeMultOf(attacker) * atkMultOf(attacker, 'METEOR') * defMultOf(defender)); // 'METEOR'はatkMultByMoveに該当が無いため通常時はatkMultのまま(BATTLE RUSHでアッパー系として扱うための目印) // Beat2: ダメージ絵(命中の瞬間)
    playSE('se_meteor'); // 未配置ならse_punchで代用される
    spawnHitEffect(attacker, 'METEOR_LAUNCH'); // 放つ瞬間、攻撃側に重ねて光のエフェクトを表示する
    setAct(defender, 'damage.PNG');
    await wait(DB.HITSTOP.IMPACT_MS);
    await wait(400 - DB.HITSTOP.POSE_MS - DB.HITSTOP.IMPACT_MS); // 元の一時停止(400ms)の残り分。Beat3(落下)開始までの間合いを概ね維持する

    // 打たれる方が先に地面へ落下(実際の現在の高さを起点にする。PUNCH+PUNCH+UPPERで通常より高い位置にいても正しく動作する)
    const defenderFromY = getY(defender);
    const fallSteps = 5;
    for (let s = 1; s <= fallSteps; s++) {
        setY(defender, defenderFromY + (DB.POS.GROUND_Y - defenderFromY) * (s / fallSteps));
        await wait(30);
    }
    setY(defender, DB.POS.GROUND_Y);
    setAct(defender, 'knock2.PNG'); // 着地の瞬間、damage.PNGのままにせずknock2.PNGにする
    spawnHitEffect(defender, 'METEOR'); // 被弾側キャラと全く同じ場所に、下から上へ表示されていくエフェクト
    triggerScreenShake(300, 12); // 画面全体を少し揺らす
    playSE('se_kabe'); // 地面に叩きつけられる音(壁激突と同じ音を流用)
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
    setAct(attacker, 'knock2.PNG'); // 打つ方の着地には音を鳴らさない(叩きつけられるのは被弾側のみのイメージのため)
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
    // 2026-09-30: 技は「途中は負けなければ(あいこでも)OK、最後だけ勝てば発動」に変更。
    // PUNCH+PUNCH+UPPERは、負けなかったPUNCHが2回続いた後(pPunchChain、あいこも数える)にUPPERで勝てば成立する。
    const winnerChainKey = attacker === 'P' ? 'pPunchChain' : 'ePunchChain';
    const upperChargeKey = attacker === 'P' ? 'pUpperChargeReady' : 'eUpperChargeReady';
    const viaPunchPunch = state[winnerChainKey] >= 2;
    const viaUpperGuard = state[upperChargeKey];
    const isSuperUpper = viaPunchPunch || viaUpperGuard; // ダメージ2倍の判定(コンボ成立時のみ)
    // 演出(高さ・速度・残像)は、ダメージ2倍の条件に加えて、敵ごとのalwaysSuperUpperVisual(ENEMY_PRESETS)でも有効にできる。
    // ダメージは変えず見た目の迫力だけを常時アップさせたい場合に使う(例: Ritaは通常のUPPERでもこの高さ・速度で放つ)。
    const isSuperUpperVisual = isSuperUpper || !!(presetForSide(attacker) && presetForSide(attacker).alwaysSuperUpperVisual);
    if (viaPunchPunch) markSpecialUsed('superUpper', attacker); // 実績: PUNCH+PUNCH+UPPERの使用を記録

    // このUPPERの勝敗が決まったので、UPPER→GUARDの連続検知用フラグを更新する(次のGUARDが直前の勝敗を正しく参照できるように)
    if (attacker === 'P') { state.pLastWinWasUpper = true; state.eLastWinWasUpper = false; }
    else { state.eLastWinWasUpper = true; state.pLastWinWasUpper = false; }

    // UPPERが決まった時点で地上パンチの連続記録は途切れる(コンボ中の空中パンチとは別カウント)
    state.pPunchStreak = 0; state.pPunchChain = 0;
    state.ePunchStreak = 0; state.ePunchChain = 0;
    state.pGuardStreak = 0; state.eGuardStreak = 0; // ガード以外で勝敗が決したのでガード連続記録は途切れる

    if (isSuperUpper) spawnTechNamePop(attacker, 'RISING!'); // 技名ポップ(第36条: 2倍アッパー=ライジング)。暗転が始まるタイミングで表示する
    if (isSuperUpper) await playFinisherBuildup(attacker); // スーパーアッパー(ダメージ2倍)成立時のみ、暗転→一時停止→発光の演出を挟む
    setAct(attacker, 'upper.PNG'); // Beat1: 攻撃絵
    if (isSuperUpper) flashAttackerWhite(attacker); // awaitしない(命中の瞬間にもう一度白く発光させる。playFinisherBuildupの発光は命中前の演出のため別枠)
    if (isSuperUpper) await wait(DB.HITSTOP.POSE_MS); // スーパーアッパーのみヒットストップを挟む(通常のUPPERは従来通り)
    setAct(defender, 'damage.PNG'); // Beat2: ダメージ絵(命中の瞬間)
    applyDamage(defender, DB.DMG.U * chargeMultOf(attacker) * (isSuperUpper ? 2 : 1) * atkMultOf(attacker, 'UPPER') * defMultOf(defender, 'UPPER'));
    playSE('se_upper'); // 未配置ならse_punchで代用される
    spawnHitEffect(attacker, 'UPPER', isSuperUpper ? 2 : 1); // ダメージが2倍になる時はhit_upper_2を使う
    if (isSuperUpper) await wait(DB.HITSTOP.IMPACT_MS);
    triggerShake(defender, 300); // Beat3: 振動などの反応
    // チャージ(ガード+ガード、UPPER+GUARD+UPPER)は「次に出すカードの初撃」のみに適用される一度限りの効果のため、
    // ここで即座に消費する。以降の空中コンボ継続・メテオには適用しない(通常倍率で計算する)。
    consumeCharge(attacker); consumeCharge(defender);
    consumeUpperCharge(attacker); consumeUpperCharge(defender);
    if (viaUpperGuard) markSpecialUsed('upperGuardUpper', attacker); // 実績: UPPER+GUARD+UPPERの使用を記録

    // 上昇アニメーション: 地面(または現在の高さ)から浮遊高さまで、固定ステップ数・固定所要時間で上昇させる。
    // PUNCH+PUNCH+UPPERの場合は目標の高さが2倍になるため、同じ時間でより長い距離を移動する=体感速度も2倍になる。
    // PUNCH+PUNCH+UPPERの上昇中は、通常のアッパーより強く見えるよう残像を残す(第24条の残像表現を流用)。
    const floatTargetY = isSuperUpperVisual ? DB.POS.SUPER_FLOAT_Y : DB.POS.FLOAT_Y;
    const hopTargetY = isSuperUpperVisual ? DB.POS.SUPER_HOP_Y : DB.POS.HOP_Y;
    const riseSteps = 6, riseStepMs = 45;
    const defenderFromY = getY(defender), attackerFromY = getY(attacker);
    for (let s = 1; s <= riseSteps; s++) {
        const t = s / riseSteps;
        setY(defender, defenderFromY + (floatTargetY - defenderFromY) * t);
        setY(attacker, attackerFromY + (hopTargetY - attackerFromY) * t);
        if (isSuperUpperVisual) {
            trails.push({ side: attacker, x: getX(attacker), y: getY(attacker), born: performance.now(), sprite: 'upper.PNG', life: 260, maxAlpha: 0.5 });
            trails.push({ side: defender, x: getX(defender), y: getY(defender), born: performance.now(), sprite: 'damage.PNG', life: 260, maxAlpha: 0.5 });
        }
        await wait(riseStepMs);
    }
    await wait(430); // 空中での間(上昇分と合わせて元の700ms相当を維持)

    let airPunches = 0;

    // GUARD+PUNCH+UPPER(簡易な追加打)の3枚目がこのUPPERだった場合の分岐(2026-09-26)。
    // この技の3枚目は常にUPPERのため、このタイミング(浮遊後・空中コンボ開始前)でのみ判定できる。
    // 直後の手がPUNCHなら、この追加打自体を空中コンボの1発目として扱う(カードを消費せず、
    // 通常の1発目と全く同じ演出・ダメージ計算で処理し、airPunchesを1から始める。続く実際のPUNCHカードは
    // 2発目以降として通常通り消費される)。直後の手がPUNCH以外(手札が尽きている場合を含む)なら、
    // まだ浮いたままの被弾側を、地面に降ろさずそのまま画面端まで吹き飛ばす専用の壁めり込みパンチにする。
    const gpuComboType = attacker === 'P' ? state.pComboType : state.eComboType;
    const gpuComboAlive = attacker === 'P' ? state.pComboAlive : state.eComboAlive;
    if (gpuComboType === 'miracle' && cursor.i === 4 && gpuComboAlive) {
        // MIRACLE(UPPER×5): 5枚目のUPPERで打ち上げた相手を、空中のまま壁までめり込ませる(1〜4枚目の成否は判定済み、ここに来た=5枚目は勝ち)
        markSpecialUsed('miracle', attacker);
        await runGuardPunchUpperWallStrike(attacker, defender, 'MIRACLE!');
        return;
    }
    if (aliveComboEndingAt(attacker, 'guardPunchUpper', cursor.i)) {
        markSpecialUsed('guardPunchUpper', attacker);
        if (nextQueuedMove(attacker, cursor) === 'PUNCH') {
            // 通常の空中コンボ1発目と同じ演出(打ち上げられた側が攻撃側の高さまで降りてくる)
            const meetY = getY(attacker);
            const defenderFromY = getY(defender);
            const descSteps = 5, descStepMs = 30;
            for (let s = 1; s <= descSteps; s++) {
                const dt = s / descSteps;
                setY(defender, defenderFromY + (meetY - defenderFromY) * dt);
                await wait(descStepMs);
            }
            setY(defender, meetY);
            hitComboSuccess(attacker);
            await flashDashBetweenPunches(attacker);
            setAct(attacker, nextPunchSprite(attacker)); // Beat1: 攻撃絵
            flashAttackerWhite(attacker); // awaitしない(この追加打だけキャラを白く発光させ、続く本来の4枚目と見分けやすくする)
            await wait(DB.HITSTOP.POSE_MS); // ヒットストップ(この技はGUARD+PUNCH+UPPER成立時のみ発生するため常に挟む)
            applyDamage(defender, DB.DMG.P * chargeMultOf(attacker) * atkMultOf(attacker) * defMultOf(defender)); // Beat2: ダメージ絵(命中の瞬間、被弾側は既にdamage.PNGのまま)
            playSE('se_punch');
            spawnHitEffect(attacker, 'PUNCH', 1);
            await wait(DB.HITSTOP.IMPACT_MS);
            triggerShake(defender, 200); // Beat3: 振動などの反応
            await wait(500);
            airPunches = 1; // 続く実際のPUNCHカードは2発目以降として通常のループで処理される
        } else {
            await runGuardPunchUpperWallStrike(attacker, defender);
            return; // 着地・後処理はrunGuardPunchUpperWallStrike側で完結させる
        }
    }

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
            await flashDashBetweenPunches(attacker); // 1発目(upper.PNGから)・2発目以降(パンチ同士)いずれもdashを挟み、勢いを出す
            setAct(attacker, nextPunchSprite(attacker)); // 第21条
            markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のコンボ継続: ヒビ割れる
            const comboDmg = (DB.DMG.P + (airPunches - 1) * DB.DMG.P_COMBO_STEP) * chargeMultOf(attacker) * atkMultOf(attacker) * defMultOf(defender); // 1発目=P, 2発目=P+STEP...
            applyDamage(defender, comboDmg);
            playSE('se_punch');
            spawnHitEffect(attacker, 'PUNCH', airPunches); // 空中コンボの1・2発目に対応する段階の見た目を使う
            triggerShake(defender, 200);
            await wait(500);
        } else {
            // 3発目: メテオへ変換
            markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のメテオ: ヒビ割れる
            await runMeteor(attacker, defender);
            return;
        }
    }

    // UPPER+GUARD+UPPERのチャージは「UPPERの直後にGUARDが来た」場合にのみ成立させたい(コマンドとしてのUGU)。
    // 空中コンボでPUNCHを1発でも挟んだ場合(例: UPPER+PUNCH+PUNCH+GUARD+UPPER)は、そのPUNCH自体は3すくみ判定を経ない
    // 自動ヒットのため直前勝利フラグ(pLastWinWasUpper/eLastWinWasUpper)がリセットされずに生き残ってしまうが、
    // 「UPPERの直後」ではなくなっているため、ここで明示的に解除し、この後に続くGUARDでチャージが発動しないようにする。
    if (airPunches > 0) {
        state.pLastWinWasUpper = false;
        state.eLastWinWasUpper = false;
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

// GUARDが勝った場合の演出(勝った側はガードのまま反撃、負けた側はDB.GUARD_PIYO_CHANCEの確率でしびれる)
// 第3すくみの通り、GUARDに勝てるのはPUNCHのみなので、通常は負けた側が必ずpunch.PNGの姿勢になる。
// ただし、しびれによる無条件敗北(runNumbFail)経由で呼ばれた場合は、負けた側が実際にPUNCHを出していたとは限らないため、
// loserPoseOverrideでポーズを明示的に上書きできるようにしている(その場合はdamage.PNGを指定する)。
// ピヨり発動判定(guardPiyoTriggered)を通過した場合のみ、ブロックされた瞬間からピヨり(頭上のpiyo.PNG)を開始し、
// 以後damage.PNGの姿勢のまま維持する(IDLEには戻さない)。このピヨり状態は、次の攻防でしびれ判定が解決される
// 瞬間(resolveExchange)まで継続する。発動しなかった場合はしびれ扱いにならず、通常通りIDLEへ戻る。
async function runGuardSuccess(winner, loser, loserPoseOverride) {
    hitComboSuccess(winner);
    hitComboBreak(loser);
    state.pPunchStreak = 0; state.pPunchChain = 0; // ガードでパンチが止まった場合も連続記録は途切れる
    state.ePunchStreak = 0; state.ePunchChain = 0;
    setAct(winner, 'guard.PNG');
    setAct(loser, loserPoseOverride || 'punch.PNG'); // ブロックされた瞬間の姿勢(通常はパンチのまま)
    // (2026-09-30: 以前はここでガードした側にも反動の微ダメージ(DB.DMG.TINY)を与えていたが、守りきった側が削られるのは
    // 不自然でノーダメージ勝利もできなかったため廃止。ガード成功は無傷)
    triggerShake(winner, 250);
    triggerShake(loser, 400); // しびれによる振動(ダメージなし)
    // ピヨり発動判定(DB.GUARD_PIYO_CHANCE、既定50%)。外れた場合はしびれフラグを立てず、
    // 敗者はこの後の演出でもダウン気味の姿勢(damage.PNG)やピヨり演出には移行せず、通常のブロック反応のまま
    // (toIdle()がstate.pNumbed/eNumbedを見て判定するため、次の攻防が始まる頃には自然に通常ポーズへ戻る)。
    const guardPiyoTriggered = Math.random() < DB.GUARD_PIYO_CHANCE;
    if (guardPiyoTriggered) {
        if (loser === 'P') state.pNumbed = true; else state.eNumbed = true; // 次のコマンドの成功率が1/2になる
    }
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
    // ガード成功が何回連続したかによって音とヒットエフェクトを変える(1回目=se_guard/hit_guard、2回目=se_guard_2/hit_guard_2、3回目以降=se_guard_3/hit_guard_3)
    if (state[winnerGuardStreakKey] >= 3) {
        playSE('se_guard_3');
        spawnHitEffect(winner, 'GUARD', 3);
    } else if (state[winnerGuardStreakKey] === 2) {
        playSE('se_guard_2');
        spawnHitEffect(winner, 'GUARD', 2);
    } else {
        playSE('se_guard');
        spawnHitEffect(winner, 'GUARD', 1);
    }
    if (state[winnerGuardStreakKey] >= 3) {
        // 3連続以降のチャージ倍率(既定4)。該当プリセットを持つ側(敵、またはそのキャラとして戦うプレイヤー)は
        // ENEMY_PRESETSのchargeValueFourがあればそちらを優先する
        const winnerPresetForCharge4 = presetForSide(winner);
        const chargeVal4 = (winnerPresetForCharge4 && winnerPresetForCharge4.chargeValueFour) ? winnerPresetForCharge4.chargeValueFour : 4;
        if (winner === 'P') { state.pChargeValue = chargeVal4; state.pChargeIsMax = true; }
        else { state.eChargeValue = chargeVal4; state.eChargeIsMax = true; }
        markSpecialUsed('charge', winner); // 実績: ガード+ガードの使用を記録
    } else if (state[winnerGuardStreakKey] >= 2) {
        // 2連続のチャージ倍率(既定2)。該当プリセットを持つ側は ENEMY_PRESETS の chargeValueTwo があればそちらを優先する
        const winnerPresetForCharge2 = presetForSide(winner);
        const chargeVal2 = (winnerPresetForCharge2 && winnerPresetForCharge2.chargeValueTwo) ? winnerPresetForCharge2.chargeValueTwo : 2;
        if (winner === 'P') { state.pChargeValue = chargeVal2; state.pChargeIsMax = false; }
        else { state.eChargeValue = chargeVal2; state.eChargeIsMax = false; }
        markSpecialUsed('charge', winner); // 実績: ガード+ガードの使用を記録
    }

    // UPPER+GUARD+UPPERが成立する場合、両者は既にrunUpperCombo側の専用演出でGROUND_Yまで降下済み(このGUARDの前に完了している)。

    await wait(400);
    if (guardPiyoTriggered) {
        setAct(loser, 'damage.PNG'); // ブロック反応から、しびれてダウン気味の姿勢へ
        startPiyo(loser); // ここから次の攻防が解決されるまでピヨり続ける(チャージとは独立して、通常通りターン終了時に解消される)
        playSE('se_piyo');
        await wait(100);
    }
    // guardPiyoTriggeredがfalseの場合はここで何もせず、ブロック反応(punch.PNG等)のまま関数を抜ける。
    // 敗者のポーズは、次の攻防が始まる際のtoIdle()呼び出しでstate.pNumbed/eNumbedがfalseのため
    // 自然にIDLE(通常の呼吸ポーズ)へ戻る。
}

async function runNumbFail(numbedSide, cursor, pAct, eAct) {
    const winner = numbedSide === 'P' ? 'E' : 'P';
    const loser = numbedSide;
    const winnerMove = winner === 'P' ? pAct : eAct;

    // ピヨりは前の攻防(GUARDにブロックされた瞬間)から継続表示中。ここで判定が確定し、もう無防備な
    // (ピヨり)状態ではなくなった合図として、頭上のpiyoをrunNumbEscape側と同じ「割れて消える」演出
    // (state.piyoBreakUntilをdraw()が見て縮小+フェードアウトさせる)に切り替える。
    // ただの消失(setAct+stopPiyoのみ)ではなく、ここでも割れる演出を挟むようにした(2026-09-26)。
    setAct(loser, 'damage.PNG');
    triggerBlink(loser, 1400);
    state.piyoBreakUntil = performance.now() + 300; // 300msかけて割れて消える
    state.piyoBroken = true; // 割れ始めたことを記録する(draw()側が通常表示に巻き戻らないようにするため)
    await wait(300);
    // 完全にフェードし終わったこのタイミングでstopPiyo()を呼び、再表示されないよう確定させる
    // (呼ぶまでの短い間もstate.piyoBrokenにより通常表示には戻らない。詳細はdraw()側のコメントを参照)。
    stopPiyo();
    await wait(400); // 点滅演出の残り時間(割れる演出と合わせて合計700ms)

    // 点滅演出の間は攻撃側を初期位置(RETREAT_X)に留め、この演出が終わった直後、実際に攻撃が始まる
    // 直前になって初めて中央(ATTACK_X)まで一気に踏み込む(第24条: 残像付き。攻撃側が相手のすぐ近くで
    // 無意味に待機して見える時間を無くすため)。
    await approachCenter();

    // 相手の技の種類に応じた通常の勝敗処理へ(空中コンボならコンボも発生する)
    if (winnerMove === 'UPPER') {
        await runUpperCombo(winner, loser, cursor);
    } else if (winnerMove === 'GUARD') {
        await runGuardSuccess(winner, loser, 'damage.PNG'); // しびれ側は実際に出していた技に関わらずdamage.PNGにする
    } else {
        await runNormalHit(winner, loser, winnerMove);
    }
}

// しびれていた側が、無条件敗北のコイントス(numbFailChance)を外してダメージを受けずに済んだ場合の演出。
// 頭上のpiyoが割れて消え(draw()側のstate.piyoBreakUntilで表現)、damage.PNGのまま少し横揺れしてから、
// 通常ポーズ(player.PNG)に戻る。この後、呼び出し元で通常の3すくみ判定(judge)へ進む。
async function runNumbEscape(numbedSide) {
    state.piyoBreakUntil = performance.now() + 300; // 300msかけて割れて消える
    state.piyoBroken = true; // 割れ始めたことを記録する(draw()側が通常表示に巻き戻らないようにするため)
    await wait(300);
    stopPiyo();
    triggerShake(numbedSide, 300); // damage.PNGのまま横揺れ
    await wait(300);
    setAct(numbedSide, 'player.PNG'); // 通常ポーズへ戻る
    await wait(150);
    // この一連の演出の間は攻撃側を初期位置(RETREAT_X)に留め、演出が終わり通常の3すくみ判定へ進む
    // 直前になって初めて中央(ATTACK_X)まで一気に踏み込む(runNumbFail側の対応する処理と同じ理由)。
    await approachCenter();
}

function markCardOutcome(side, idx, outcomeClass) {
    const arr = side === 'P' ? cardOutcomes.P : cardOutcomes.E;
    arr[idx] = outcomeClass || null; // ターンが終わるまで保持する(以後updateUI/drawEnemySlotsの再描画でこの文字列がそのままクラス名として使われる)
    if (state.gameMode === 'versus') vsMirrorCardOutcome(side, idx, outcomeClass); // 2P側(上半分)の同じカードにも反映する
    const container = document.getElementById(side === 'P' ? 'slots' : 'enemySlots');
    const el = container.children[idx];
    if (!el) return;
    el.classList.remove('card-lose', 'card-shatter', 'card-shatter-flash');
    if (outcomeClass) {
        el.classList.add(outcomeClass);
        // card-shatterが割れる瞬間(今まさにmarkCardOutcomeが呼ばれた、この一回だけ)にのみ、
        // 割れるアニメーション(css側のcardShatterLeft/Right)を再生させるための一時的なクラス。
        // cardOutcomes配列(=updateUI/drawEnemySlotsが再描画時に付与するクラス文字列そのもの)には含めないため、
        // このカードが既に割れている状態のまま手札全体が再描画(他のカードの決着やハイライト移動のたびに
        // #slots/#enemySlotsはinnerHTMLごと作り直される)されても、新しく作られる要素にはこのクラスが付かず、
        // 割れるアニメーションが再生されない(以前は無条件でcard-shatterクラスにアニメーションを持たせていたため、
        // 既に割れたカードや他のカードが割れるたびに何度も割れ直すように見える不具合があった)。
        if (outcomeClass === 'card-shatter') el.classList.add('card-shatter-flash');
    }
}

// 必殺技(5枚固定・1〜4枚目が勝ちまたは相打ちで5枚目がヒット確定になる)として認める手札の並び。
// 当初はGUARD+PUNCH+GUARD+PUNCH+PUNCHの1種類のみだったが、「負けなければ発動する手をいくつか増やしたい」との
// 要望を受け、2026-09-26に3種追加した(P+P+G+G+U/U+G+P+P+G/U+U+G+G+P)。追加した3種はいずれも既存の
// 追撃(PUNCH+GUARD+PUNCH)・アッパーチャージ(UPPER+GUARD+UPPER)・空中コンボの起点(PUNCH+PUNCH+UPPER)・
// ガードチャージ(GUARD+GUARD/GUARD+GUARD+GUARD)のいずれとも3枚連続の並びが重ならないように選んでいる。
// 発動時の演出・ダメージ(runFinisher)はいずれも既存の必殺技と全く同じ(3すくみ判定を行わずヒット確定・
// 固定ダメージ・画面端までの吹き飛ばし)で、5枚目の見た目上の技種別(UPPER/GUARD/PUNCH)による違いは無い
// (発動条件のバリエーションを増やすことが目的で、専用の新規演出は今回作っていない)。
const FINISHER_PATTERNS = [
    ['GUARD', 'PUNCH', 'GUARD', 'PUNCH', 'PUNCH'],
    ['PUNCH', 'PUNCH', 'GUARD', 'GUARD', 'UPPER'],
    ['UPPER', 'GUARD', 'PUNCH', 'PUNCH', 'GUARD'],
    ['UPPER', 'UPPER', 'GUARD', 'GUARD', 'PUNCH'],
];

// このターンの手札から特殊コンボの種類を判定する。
// 'finisher'は`FINISHER_PATTERNS`のいずれかに手札の1〜5枚目が完全一致するかのみを見る(固定位置)。
// 該当する場合は即座に返す(4種のいずれも、内部にPUNCH+GUARD+PUNCHおよびGUARD+PUNCH+UPPERの並びを
// 含まないよう選んであるため、followup/guardPunchUpper判定と競合することはない)。
// 3枚ワザ(RUSH!/BREAK!/FEINT!/PARRY!)は2026-10-01からdetectThreeCardCombos側で、手札の中の該当箇所をすべて拾う。
// UPPER+GUARD+UPPER(アッパーチャージ)は「UPPER勝利の直後にGUARD勝利」という状態遷移で判定しており、
// 手札の1〜2枚目が常にU,Gになるため、GUARD+PUNCH+UPPERのように先頭2枚がG,Pの並びであれば、
// アッパーチャージを狙った手(1〜2枚目がU,G)とは先頭からして一致せず、意図せず同時発動することがない。
function detectComboType(hand, total) {
    // MIRACLE(2026-09-30追加): 同じカードを5枚(PUNCH×5 / UPPER×5 / GUARD×5)。1〜4枚目は負けなければOK、5枚目で勝てば壁めり込みの追撃
    if (total >= 5 && hand[0] && [1, 2, 3, 4].every(i => hand[i] === hand[0])) {
        return { type: 'miracle', start: 0 };
    }
    if (total >= 5) {
        for (const pattern of FINISHER_PATTERNS) {
            if (pattern.every((move, i) => hand[i] === move)) {
                return { type: 'finisher', start: 0 };
            }
        }
    }
    return { type: null, start: -1 };
}
// 3枚ワザ(2026-10-01): 手札の中で成立しうる並びをすべて返す(1ターンに複数のワザが発動できる)。
// それぞれ「1・2枚目は負けなければOK、3枚目は勝ち」が守られたものだけが発動する。5枚ワザ(CRASH!/MIRACLE!)の手札では使わない。
const THREE_CARD_TECHS = [
    { type: 'followup',        seq: ['PUNCH', 'GUARD', 'PUNCH'] }, // RUSH!
    { type: 'guardPunchUpper', seq: ['GUARD', 'PUNCH', 'UPPER'] }, // BREAK!
    { type: 'feint',           seq: ['PUNCH', 'UPPER', 'GUARD'] }, // FEINT!
    { type: 'parry',           seq: ['GUARD', 'UPPER', 'GUARD'] }, // PARRY!
];
function detectThreeCardCombos(hand, total) {
    const list = [];
    for (let start = 0; start + 2 < total; start++) {
        for (const t of THREE_CARD_TECHS) {
            if (t.seq.every((m, i) => hand[start + i] === m)) list.push({ type: t.type, start, alive: true });
        }
    }
    return list;
}
// 指定位置(endIndex)で3枚目を迎える、要件を満たしたままの3枚ワザを返す(無ければnull)
function aliveComboEndingAt(side, type, endIndex) {
    const list = side === 'P' ? state.pCombos : state.eCombos;
    return list.find(c => c.type === type && c.alive && c.start + 2 === endIndex) || null;
}

// PUNCH+GUARD+PUNCH(1〜3枚目が全て勝利)成立時の追撃。punch.PNG/punch2.PNGを素早く切り替えながら3連打し、必ずヒットする。
// 合計ダメージは通常パンチ1発の3倍(1発ごとにDB.DMG.P、チャージ等の影響は受けない)。
// FEINT!(PUNCH+UPPER+GUARD、2026-10-01追加): 1・2枚目は負けなければOK、3枚目のGUARDで勝つと、受け止めた直後に
// ダッシュしてパンチで反撃する(必ず当たる)。ガード成功で付いたピヨりは、この反撃に置き換わる(PARRY!との役割分け)。
async function runFeintCounter(attacker, defender) {
    hitComboSuccess(attacker);
    if (defender === 'P') state.pNumbed = false; else state.eNumbed = false;
    if (state.piyoSide === defender) stopPiyo();
    spawnTechNamePop(attacker, 'FEINT!');
    await flashDashBetweenPunches(attacker);
    setAct(attacker, nextPunchSprite(attacker)); // Beat1: 攻撃絵
    flashAttackerWhite(attacker); // awaitしない
    await wait(DB.HITSTOP.POSE_MS);
    setAct(defender, 'damage.PNG'); // Beat2: ダメージ絵(命中の瞬間)
    applyDamage(defender, DB.DMG.FEINT * atkMultOf(attacker) * defMultOf(defender));
    playSE('se_punch');
    spawnHitEffect(attacker, 'PUNCH', 2);
    await wait(DB.HITSTOP.IMPACT_MS);
    triggerShake(defender, 300); // Beat3: 振動などの反応
    await knockbackTo(defender, defender === 'P' ? DB.POS.P_RETREAT_X : DB.POS.E_RETREAT_X);
    await wait(300);
    toIdle();
}
// PARRY!(GUARD+UPPER+GUARD、2026-10-01追加): 1・2枚目は負けなければOK、3枚目のGUARDで勝つと、相手を必ずピヨらせる。
// ダメージは無いが、ピヨった相手は次の攻防で必ず負ける(state.numbSureSide)。ターンの最後のカードで決めると効果は持ち越さない。
async function runParry(attacker, defender) {
    spawnTechNamePop(attacker, 'PARRY!');
    flashAttackerWhite(attacker); // awaitしない
    if (defender === 'P') state.pNumbed = true; else state.eNumbed = true;
    state.numbSureSide = defender;
    setAct(defender, 'damage.PNG');
    triggerShake(defender, 400);
    if (state.piyoSide !== defender) { startPiyo(defender); playSE('se_piyo'); }
    await wait(500);
}
async function runFollowUpFlurry(attacker, defender) {
    hitComboBreak(defender);
    spawnTechNamePop(attacker, 'RUSH!'); // 技名ポップ(第36条: 追撃=ラッシュ)。3連打全体で1回だけ、暗転が始まるタイミングで表示する
    await playFinisherBuildup(attacker); // 暗転→一時停止→攻撃側が白く発光→晴れる、のフィニッシュ演出(3連打全体の前に1回だけ)
    for (let i = 0; i < 3; i++) {
        hitComboSuccess(attacker); // 追撃は3連打それぞれをCOMBOとして数える
        if (i >= 1) await flashDashBetweenPunches(attacker); // 2発目以降のみ、パンチ同士の切り替えなのでdashを挟む
        setAct(attacker, nextPunchSprite(attacker)); // 第21条。Beat1: 攻撃絵
        flashAttackerWhite(attacker); // awaitしない(追撃は3連打すべてに白い発光を入れる)
        // ヒットストップは1発目にのみ挟む(2・3発目まで挟むと3連打の「素早い連打」感が失われるため)。
        if (i === 0) await wait(DB.HITSTOP.POSE_MS);
        setAct(defender, 'damage.PNG'); // Beat2: ダメージ絵(命中の瞬間)
        applyDamage(defender, DB.DMG.P * atkMultOf(attacker) * defMultOf(defender));
        playSE('se_punch');
        spawnHitEffect(attacker, 'PUNCH', i + 1); // 追撃3連打それぞれに対応する段階の見た目を使う
        if (i === 0) await wait(DB.HITSTOP.IMPACT_MS);
        triggerShake(defender, 150); // Beat3: 振動などの反応
        await wait(120); // 素早い連打
    }
    await wait(200);
    toIdle();
}

// GUARD+PUNCH+UPPER(1〜3枚目が全て勝利)成立時、直後の手がPUNCH以外(手札が尽きている場合を含む)だった
// 場合の専用演出(2026-09-26)。3枚目のUPPERで浮かせた直後のため、被弾側はまだ地面に降りていない
// (空中コンボが続く場合と異なり、このタイミングでは着地させない)。この浮いたままの状態を保ったまま、
// 3すくみ判定を行わずヒット確定のパンチをもう1発追加し、被弾側を地面へ降ろさず画面端まで吹き飛ばす
// (`runFinisher`の壁演出と同じ考え方だが、Yは地面まで落とさず浮遊高さのまま横方向にのみ移動させる)。
// ダメージは通常パンチ1発分(チャージ等の影響は受けない)。必殺技と異なりこのターンの最後のカードとは
// 限らないため(このUPPERが手札の3枚目で、4・5枚目が残っている場合がある)、壁への激突後は
// 必殺技のようにターン終了処理任せにはせず、この関数自身で両者を地面まで着地させてから返す。
// label: 技名ポップの文字(既定はBREAK!。同じカード5枚のMIRACLEでも、この壁めり込み演出を流用する)
async function runGuardPunchUpperWallStrike(attacker, defender, label = 'BREAK!') {
    hitComboSuccess(attacker);
    hitComboBreak(defender);
    setAct(attacker, nextPunchSprite(attacker)); // 第21条。Beat1: 攻撃絵
    spawnTechNamePop(attacker, label); // 技名ポップ(第36条: GUARD+PUNCH+UPPERの壁のめり込み=ブレイク / 同じカード5枚=MIRACLE!)
    if (label === 'MIRACLE!') flashAttackerWhite(attacker); // MIRACLEは攻撃側を白く光らせて特別感を出す
    const wallStrikeMult = atkMultOf(attacker) * defMultOf(defender);
    if (wallStrikeMult !== 1) flashAttackerWhite(attacker); // awaitしない(敵の個性(atkMult/defMult)でダメージが通常と異なる場合のみ光らせる)
    await wait(DB.HITSTOP.POSE_MS); // ヒットストップ(被弾側は既にUPPERでdamage.PNGのまま浮いている)
    // Beat2: ダメージ絵(命中の瞬間。壁まで飛ばす力が強いので通常のパンチより微量ダメージ増加)。
    // MIRACLEは壁激突(WALL_IMPACT)と合わせて合計20になるよう、初撃を17にする(2026-09-30)
    const launchBase = label === 'MIRACLE!' ? DB.DMG.MIRACLE - DB.DMG.WALL_IMPACT : DB.DMG.P + DB.DMG.WALL_LAUNCH_BONUS;
    applyDamage(defender, launchBase * wallStrikeMult);
    playSE('se_punch');
    spawnHitEffect(attacker, 'PUNCH', 1);
    await wait(DB.HITSTOP.IMPACT_MS);
    triggerShake(defender, 150); // Beat3: 振動などの反応
    await wait(150);

    // 被弾側を、浮いた高さを保ったまま画面端まで吹き飛ばす(damage.PNGのまま)
    const edgeX = defender === 'P' ? DB.POS.EDGE_P_X : DB.POS.EDGE_E_X;
    const wallOverlap = Math.round(DB.IMG_SIZE * 2 / 3); // 絵柄と壁の隙間をなくすためのめり込み量(runFinisherと同じ)
    const finalX = defender === 'P' ? edgeX - wallOverlap : edgeX + wallOverlap;
    const fromX = getX(defender);
    const flySteps = 6, flyStepMs = 30;
    for (let s = 1; s <= flySteps; s++) {
        setX(defender, fromX + (finalX - fromX) * (s / flySteps));
        await wait(flyStepMs);
    }
    setX(defender, finalX);
    const wallX = defender === 'P' ? edgeX : edgeX + DB.IMG_SIZE;
    spawnHitEffect(defender, 'WALL', 1, wallX, getY(defender) + DB.IMG_SIZE / 2);
    applyDamage(defender, DB.DMG.WALL_IMPACT); // 壁に当たること自体の固定ダメージ(倍率は適用しない)
    triggerBlink(defender, 400);
    triggerShake(defender, 250);
    playSE('se_kabe');
    await wait(400);

    // このターンはここで終わるとは限らない(必殺技と違い最終カードとは限らないため)ので、
    // ここで両者を地面まで着地させてから通常の攻防に戻す(Xは戻さず、後続の後退演出に任せる)
    await waitBothLanded();
    setAct(attacker, 'dash.PNG');
    setAct(defender, 'damage.PNG');
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
    spawnTechNamePop(attacker, 'CRASH!'); // 技名ポップ(第36条: 必殺技=クラッシュ)。暗転が始まるタイミングで表示する
    await playFinisherBuildup(attacker); // 暗転→一時停止→攻撃側が白く発光→晴れる、のフィニッシュ演出
    setAct(attacker, nextPunchSprite(attacker)); // 第21条。Beat1: 攻撃絵
    flashAttackerWhite(attacker); // awaitしない(命中の瞬間にもう一度白く発光させる。playFinisherBuildupの発光は命中前の演出のため別枠)
    await wait(DB.HITSTOP.POSE_MS); // ヒットストップ
    setAct(defender, 'damage.PNG'); // Beat2: ダメージ絵(命中の瞬間)
    markCardOutcome(defender, cursor.i, 'card-shatter'); // 3すくみ無視のヒットなのでヒビ割れ表現にする
    applyDamage(defender, (DB.DMG.FINISHER + DB.DMG.WALL_LAUNCH_BONUS) * atkMultOf(attacker) * defMultOf(defender)); // 壁まで飛ばす力が強いので通常の必殺技より微量ダメージ増加
    playSE('se_finisher'); // 未配置ならse_punchで代用される
    spawnHitEffect(attacker, 'PUNCH', 3); // 必殺技の一撃として、最も迫力のある段階(3)の見た目を使う
    await wait(DB.HITSTOP.IMPACT_MS);
    triggerShake(defender, 300); // Beat3: 振動などの反応
    await wait(150);

    // 被弾側を画面端まで吹き飛ばす(damage.PNGのまま)
    const edgeX = defender === 'P' ? DB.POS.EDGE_P_X : DB.POS.EDGE_E_X;
    // キャラの絵柄自体が32×32のスプライト内で中央寄りに描かれているため、スプライトの基準点(edgeX)を
    // そのまま画面端に合わせただけでは、実際の見た目上は壁から離れて見えてしまう。そのため、最終停止位置は
    // 基準点をさらに壁の方向へIMG_SIZEの約2/3だけめり込ませ、絵柄が壁に接しているように見せる
    // (当初1/3で対応したが、まだ壁から離れて見えるとの指摘を受け、さらに1/3(合計2/3)に増やした)。
    const wallOverlap = Math.round(DB.IMG_SIZE * 2 / 3);
    const finalX = defender === 'P' ? edgeX - wallOverlap : edgeX + wallOverlap;
    const fromX = getX(defender);
    const flySteps = 8, flyStepMs = 30;
    for (let s = 1; s <= flySteps; s++) {
        setX(defender, fromX + (finalX - fromX) * (s / flySteps));
        await wait(flyStepMs);
    }
    setX(defender, finalX);
    // edgeXはキャラのスプライト基準点(左端)の座標。左壁(プレイヤー側)はこれがそのまま画面端に接するが、
    // 右壁(敵側)は逆にスプライトの右端(edgeX + IMG_SIZE)こそが実際に画面端(壁)に接する位置になるため、側で分けて求める。
    // 壁の破裂エフェクト自体は実際の画面端(edgeX基準、上記のめり込み分は含めない)の位置に表示する。
    const wallX = defender === 'P' ? edgeX : edgeX + DB.IMG_SIZE;
    spawnHitEffect(defender, 'WALL', 1, wallX, getY(defender) + DB.IMG_SIZE / 2); // 壁(画面端)から飛び出してから落下するエフェクト
    applyDamage(defender, DB.DMG.WALL_IMPACT); // 壁に当たること自体の固定ダメージ(倍率は適用しない)

    // 端にぶつかって点滅
    triggerBlink(defender, 500);
    triggerShake(defender, 300);
    playSE('se_kabe');
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

    // 必殺技(5枚目)が成立する攻防かどうかは、しびれ演出の分岐より前に判定しておく必要がある(成立時は
    // 3すくみ・しびれ判定を行わずヒット確定で処理するため、しびれの1/2抽選専用の間合い・溜め演出も対象外とする)。
    const pFinisherReadyPre = cursor.i === 4 && state.pComboType === 'finisher' && state.pComboAlive;
    const eFinisherReadyPre = cursor.i === 4 && state.eComboType === 'finisher' && state.eComboAlive;
    // しびれ(ピヨり)の1/2抽選を伴う攻防かどうか。伴う場合は、通常の「中央まで一気に踏み込む」演出はここでは行わない。
    // 抽選(1/2の的中判定)自体を初期位置(後退位置、RETREAT_X)のまま、全く踏み込まずに確定させ、
    // 結果が決まった後の演出がすべて終わってから、初めて中央(ATTACK_X)まで一気に踏み込む
    // (2026-09-26: 少しでも踏み込んだ位置で判定しているのが不自然という指摘を受け、間に一段手前で
    // 止まる中間地点(旧SUSPENSE_X)を挟む方式自体を廃止し、初期位置から全く動かさずに判定するよう変更)。
    const numbJudgmentPending = (state.pNumbed || state.eNumbed) && !pFinisherReadyPre && !eFinisherReadyPre;

    // UPPER→GUARDの専用着地演出の直後は、既にその場でGUARDを実行する想定のため、
    // 通常の後退→接近ダッシュ往復をスキップする(間延びを防ぐ)。
    if (state.skipNextReposition) {
        state.skipNextReposition = false;
    } else if (numbJudgmentPending) {
        // ここでは何もしない(初期位置=RETREAT_Xのまま動かさない)。中央への踏み込みは、抽選確定後の演出が
        // すべて終わった直後、runNumbFail/runNumbEscape側でapproachCenter()を呼ぶ形で行う。
    } else {
        await approachCenter(); // 第24条: 残像付きで中央へ踏み込む
    }

    // 必殺技(FINISHER_PATTERNSのいずれか、5枚目)の判定: 3すくみ・しびれ判定を行わずヒット確定で処理する
    if (cursor.i === 4) {
        const pFinisherReady = pFinisherReadyPre;
        const eFinisherReady = eFinisherReadyPre;
        if (pFinisherReady || eFinisherReady) {
            const attacker = pFinisherReady ? 'P' : 'E'; // 両者同時成立は理論上稀なケースのためPを優先する
            const defender = attacker === 'P' ? 'E' : 'P';
            markCardOutcome(defender, cursor.i, 'card-shatter');
            await runFinisher(attacker, defender, cursor);
            markSpecialUsed('finisher', attacker); // 実績: 必殺技の使用を記録
            state.lastExchangeResult = attacker === 'P' ? { P: 'win', E: 'lose' } : { P: 'lose', E: 'win' };
            return;
        }
    }

    // しびれ判定: 直前の攻防でガードに阻まれた側は、通常1/2の確率でこの攻防に無条件で敗北する(3すくみ判定は行わない)。
    // ガードでこのしびれを引き起こした側が敵(guardSide==='E')で、かつその敵がnumbFailMultを持っていれば、
    // 0.5に乗算してこの確率を調整する(例: Galdは1.25倍→0.625、ガードで転ばせる力が強い、という個性)。
    // 逆に、しびれさせられた側が敵(numbedSide==='E')で、その敵がnumbVulnerableMultを持っていれば、そちらを優先する
    // (1より大きければしびれに弱い=Jack、1より小さければしびれに強い=Alv、という個性を表現できる)。
    // ダメージを受ける(無条件敗北)場合は、runNumbFail内で点滅演出とあわせてピヨりが割れて解ける演出を行い、解除する。
    // ダメージを受けずに済んだ場合は、runNumbEscapeで同様にピヨりが割れて解ける演出を挟んでから、通常の3すくみ判定へ進む。
    if (state.pNumbed || state.eNumbed) {
        const numbedSide = state.pNumbed ? 'P' : 'E';
        const guardSide = numbedSide === 'P' ? 'E' : 'P';
        if (numbedSide === 'P') state.pNumbed = false; else state.eNumbed = false;
        let numbFailChance = 0.5;
        const numbedSidePreset = presetForSide(numbedSide);
        const guardSidePreset = presetForSide(guardSide);
        if (numbedSidePreset && numbedSidePreset.numbVulnerableMult) {
            numbFailChance = Math.min(1, 0.5 * numbedSidePreset.numbVulnerableMult);
        } else if (guardSidePreset && guardSidePreset.numbFailMult) {
            numbFailChance = Math.min(1, 0.5 * guardSidePreset.numbFailMult);
        }
        if (state.numbSureSide === numbedSide) numbFailChance = 1; // PARRY!でピヨった側は、次の攻防で必ず負ける(2026-10-01)
        state.numbSureSide = null;
        const numbFailed = Math.random() < numbFailChance; // 判定は初期位置(RETREAT_X、全く踏み込んでいない)のまま確定させる
        // ここでは踏み込まない(中央=ATTACK_Xへの接近は、runNumbFail/runNumbEscape側で
        // 点滅・シェイク等の「間」の演出を終えた直後、実際に攻撃が始まる/3すくみ判定へ進む直前まで遅らせる。
        // ここで先に詰めてしまうと、抽選後もしばらく攻撃側だけが相手のすぐ近くで待機して見えるため)。
        if (numbFailed) {
            markCardOutcome(numbedSide, cursor.i, 'card-shatter'); // 3すくみ無視の敗北: ヒビ割れる
            consumeCharge(numbedSide); // しびれで無条件敗北する側のチャージも、次のカードとして消費される
            consumeUpperCharge(numbedSide); // UPPER+GUARD+UPPER用のチャージも同様に消費する
            if (numbedSide === 'P') state.pLastWinWasUpper = false; else state.eLastWinWasUpper = false; // 無条件敗北なのでUPPER勝利ではない
            state.lastExchangeResult = numbedSide === 'P' ? { P: 'lose', E: 'win' } : { P: 'win', E: 'lose' };
            await runNumbFail(numbedSide, cursor, pAct, eAct); // ピヨりの解除(割れて消える演出)はrunNumbFail内で行う
            return;
        }
        await runNumbEscape(numbedSide); // ダメージを受けずに済んだので、割れて解ける演出を挟んでから通常判定へ
    }

    const result = judge(pAct, eAct);
    if (result === 'draw') {
        // 相討ち: 同じ手同士がぶつかる場合、双方が微ダメージを受けて振動し、反動で一歩下がる
        hitComboBreak('P'); hitComboBreak('E'); // 相討ちはどちらも「成功」ではないため、双方のCOMBOが途切れる
        // 2026-09-30: 技は「途中は負けなければ(あいこでも)OK、最後だけ勝てば発動」。あいこは技の途中の手としては
        // 成功扱いで連続を途切れさせないが、技そのもの(チャージや強化アッパー等)はあいこでは発動しない(最後は勝ちが必要)。
        state.pPunchStreak = 0; // ダメージ周期用の連続ヒット数は、あいこでは途切れる(命中していないため)
        state.ePunchStreak = 0;
        if (pAct === 'PUNCH') { state.pPunchChain++; state.ePunchChain++; } // PUNCH同士のあいこ: P+P+UPPERの途中として数える
        else { state.pPunchChain = 0; state.ePunchChain = 0; }
        if (pAct === 'GUARD') { state.pGuardStreak++; state.eGuardStreak++; } // GUARD同士のあいこ: G+Gの途中として数える(チャージは次のガード勝利で付く)
        else { state.pGuardStreak = 0; state.eGuardStreak = 0; }
        consumeCharge('P'); consumeCharge('E'); // 相討ちはどちらもガード勝利ではないため、双方のチャージを消費する
        consumeUpperCharge('P'); consumeUpperCharge('E'); // UPPER+GUARD+UPPER用のチャージも同様に消費する
        if (pAct === 'GUARD') {
            // UPPER(負けず)→GUARD(あいこ)でも、U+G+Uの途中として次のUPPER用チャージ(水色)を用意する
            if (state.pLastWinWasUpper) state.pUpperChargeReady = true;
            if (state.eLastWinWasUpper) state.eUpperChargeReady = true;
        }
        // UPPER同士のあいこはU+G+Uの1枚目として数える(フラグ名はLastWinだが「負けなかったUPPER」の意味で使う)。それ以外はリセット
        const upperDraw = pAct === 'UPPER';
        state.pLastWinWasUpper = upperDraw; state.eLastWinWasUpper = upperDraw;
        state.lastExchangeResult = { P: 'draw', E: 'draw' };
        state.pAct = moveSprite(pAct);
        state.eAct = moveSprite(eAct);
        if (pAct !== 'GUARD') {
            // PUNCH同士・UPPER同士はぶつかり合うので双方に微ダメージ。GUARD同士は攻撃していないので無傷(2026-09-30)
            applyDamage('P', DB.DMG.CLASH);
            applyDamage('E', DB.DMG.CLASH);
        }
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
    // ローカル対戦(VERSUS): 1PのGO!は「1Pの手を確定して2Pへ交代」の意味になる。両者が確定した後、
    // 2PのGO!(vsGo2)がphaseを'resolve'にしてから改めてこの関数を呼び、通常のターン解決へ進む。
    if (state.gameMode === 'versus' && versusState.phase !== 'resolve') {
        if (versusState.phase === 'inputP') vsSubmitP();
        return;
    }
    if (state.requiredHandSize && filledCount() !== state.requiredHandSize) return; // このターン出す枚数がちょうど揃っていない場合は開始しない(ボタンの無効化と二重の安全策)
    playSE('se_go');
    state.resolving = true;
    document.querySelectorAll('.controls button').forEach(b => b.disabled = true);
    document.getElementById('howToBtn').disabled = false; // HOW TOは解決中でも常に押せる
    document.getElementById('optionBattleBtn').disabled = false; // OPTIONも同様
    document.getElementById('speedToggleBtn').disabled = false; // SPEEDも同様、解決中でも切り替えられる

    state.turn++;
    document.getElementById('turnDisplay').innerHTML = `TURN<br>${state.turn}<br><span id="turnStageLabel">${currentStageLabel()}</span>`;
    if (state.gameMode === 'rush') rushUpdateHud();

    const cursor = { i: 0 };
    const total = filledCount();
    let gameOverSide = null; // 'P' または 'E'。体力0になった側

    // プレイヤーが出した枚数だけ、敵も手を出してくる
    if (state.gameMode === 'training') {
        // プレイヤーが実際に場に出した手に応じて、必ず負ける手を1枚ずつ生成する(第20条: 相手と同じ枚数だけ行動する点は維持)
        state.enemyHands = state.hands.slice(0, total).map(trainingCounterMove);
        state.enemyRevealedUpTo = total; // 生成した時点で内容は確定しているため、そのまま公開する
    } else if (state.gameMode === 'versus') {
        // ローカル対戦: 敵AIではなく、2Pが確定させた手をそのまま使う(中身は伏せたまま攻防の直前に1枚ずつ公開する)
        state.enemyHands = versusState.played2.slice(0, total);
        state.enemyRevealedUpTo = 0;
    } else {
        state.enemyHands = generateEnemyTurnHand(total);
        state.enemyRevealedUpTo = 0; // 第2条: 中身を伏せて攻防の直前に1枚ずつ公開する
    }
    drawEnemySlots();

    // このターンの手札から特殊コンボの種類を判定する(FINISHER_PATTERNSのいずれかに該当する必殺技、
    // PUNCH+GUARD+PUNCHの追撃、GUARD+PUNCH+UPPERの簡易な追加打)。
    // 手札は既に確定しているため、攻防が始まる前(敵の手が伏せられている段階)でも判定して問題ない。
    const pCombo = detectComboType(state.hands, total);
    const eCombo = detectComboType(state.enemyHands, total);
    state.pCombos = pCombo.type ? [] : detectThreeCardCombos(state.hands, total);
    state.eCombos = eCombo.type ? [] : detectThreeCardCombos(state.enemyHands, total);
    state.pComboType = pCombo.type; state.pComboStart = pCombo.start;
    state.eComboType = eCombo.type; state.eComboStart = eCombo.start;
    state.pComboAlive = state.pComboType !== null;
    state.eComboAlive = state.eComboType !== null;
    state.lastExchangeResult = null;
    state.finisherAlreadyDown = false;

    try {
        while (cursor.i < total) {
            if (gameOverSide) break;

            const iAtStart = cursor.i; // resolveExchange呼び出し前のインデックスを保持しておく(下記コメント参照)
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
            // followup(PUNCH+GUARD+PUNCH)・guardPunchUpper(GUARD+PUNCH+UPPER)は該当する3枚
            // (index: start〜start+2)がすべて勝ちである必要がある。
            // finisher(`FINISHER_PATTERNS`のいずれか、2026-09-26に3種追加)は1〜4枚目(index0-3)が
            // 勝ちまたは相打ちである必要がある(=負けなければ良い)。
            // 2026-09-30: followup/guardPunchUpperも同じ考え方に変更。1・2枚目は負けなければ(あいこでも)OK、3枚目だけ勝ちが必要。
            // 判定には`cursor.i`ではなく上で保持した`iAtStart`(resolveExchange呼び出し前のインデックス)を使う。
            // `resolveExchange`はUPPER勝利+次カードがPUNCHの場合、空中コンボとして内部で`cursor.i`を
            // 追加でインクリメントすることがあるため(3発目は自動でメテオに変換)、呼び出し後の`cursor.i`を
            // そのまま使うと本来の「今回解決したカードの位置」とズレる場合がある。
            // なお、guardPunchUpperの発動チェック自体(3枚目=UPPERの直後に追加打を出すかどうか)は、
            // この位置ではなく`runUpperCombo`内で行っている(3枚目は常にUPPERのため、そちらでしか
            // 「直後の手がPUNCHかどうか」を空中コンボ開始前に判定できないため。詳細は`runUpperCombo`を参照)。
            const res = state.lastExchangeResult;
            if (res) {
                state.pCombos.forEach(c => { // 3枚ワザ: 途中は負けなければOK、最後は勝ちが必要
                    if (iAtStart >= c.start && iAtStart <= c.start + 2 && (iAtStart === c.start + 2 ? res.P !== 'win' : res.P === 'lose')) c.alive = false;
                });
                if (state.pComboType === 'finisher' && iAtStart <= 3 && res.P === 'lose') state.pComboAlive = false;
                state.eCombos.forEach(c => { // 3枚ワザ: 途中は負けなければOK、最後は勝ちが必要
                    if (iAtStart >= c.start && iAtStart <= c.start + 2 && (iAtStart === c.start + 2 ? res.E !== 'win' : res.E === 'lose')) c.alive = false;
                });
                if (state.eComboType === 'finisher' && iAtStart <= 3 && res.E === 'lose') state.eComboAlive = false;
                // MIRACLE: 1〜4枚目は負けなければOK、5枚目は勝ちが必要
                if (state.pComboType === 'miracle' && (iAtStart <= 3 ? res.P === 'lose' : res.P !== 'win')) state.pComboAlive = false;
                if (state.eComboType === 'miracle' && (iAtStart <= 3 ? res.E === 'lose' : res.E !== 'win')) state.eComboAlive = false;
            }
            // PUNCH+GUARD+PUNCHの3枚目(start+2枚目)が成立した直後に追撃を発生させる
            // RUSH!(P+G+P)・FEINT!(P+U+G)・PARRY!(G+U+G): 3枚目で勝った直後に発動。BREAK!(G+P+U)はrunUpperCombo内で発動済み
            for (const [side, other] of [['P', 'E'], ['E', 'P']]) {
                if (aliveComboEndingAt(side, 'followup', iAtStart)) { await runFollowUpFlurry(side, other); markSpecialUsed('followUp', side); }
                else if (aliveComboEndingAt(side, 'feint', iAtStart)) { markSpecialUsed('feint', side); await runFeintCounter(side, other); }
                else if (aliveComboEndingAt(side, 'parry', iAtStart)) { markSpecialUsed('parry', side); await runParry(side, other); }
            }
            // MIRACLE(PUNCH×5 / GUARD×5): 5枚目で勝った直後に壁めり込みの追撃。UPPER×5はrunUpperCombo内で空中から発動済み
            if (state.pComboType === 'miracle' && iAtStart === 4 && state.pComboAlive && state.hands[0] !== 'UPPER') { markSpecialUsed('miracle', 'P'); await runGuardPunchUpperWallStrike('P', 'E', 'MIRACLE!'); }
            if (state.eComboType === 'miracle' && iAtStart === 4 && state.eComboAlive && state.enemyHands[0] !== 'UPPER') { markSpecialUsed('miracle', 'E'); await runGuardPunchUpperWallStrike('E', 'P', 'MIRACLE!'); }

            // TRAINING MODEは練習場のためK.O./YOU WIN判定を行わない(ターン終了時にHPが全回復する)
            if (state.gameMode !== 'training' && (state.hpP <= 0 || state.hpE <= 0)) {
                gameOverSide = state.hpP <= 0 ? 'P' : 'E';
                if (state.gameMode === 'rush' && gameOverSide === 'P') rushStopTimer(); // BATTLE RUSH: 倒れた瞬間でタイムを止める
                break; // BATTLE RUSHで敵を倒した場合も、このターンの残りのカードは破棄する
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
        state.numbSureSide = null;
        stopPiyo();
        // ガード連続成功のカウントは同一ターン内のみ有効。ターンをまたいで持ち越さない(チャージ状態自体は持ち越すため、ここではリセットしない)
        state.pGuardStreak = 0;
        state.eGuardStreak = 0;
        // 地上パンチの連続ヒット数(ダメージ周期)も同一ターン内のみ有効。ターンをまたいで持ち越さない
        state.pPunchStreak = 0; state.pPunchChain = 0;
        state.ePunchStreak = 0; state.ePunchChain = 0;
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
        if (state.gameMode === 'versus') vsDiscardAndDraw2(total); // ローカル対戦: 2P側も同じく捨札へ送り、使った枚数分だけ補充する

        // BATTLE RUSHで敵を倒した場合は、決着演出ではなく「点滅して消える→次の敵が登場」の流れにする
        const rushKilled = state.gameMode === 'rush' && gameOverSide === 'E';
        if (gameOverSide && !rushKilled) {
            // 体力を0にする最後の一撃: 通常の帰還処理の代わりに専用の決着演出を実行
            state.battleReady = false; // 決着後は手札タップ含め操作不可にする
            await runFinishSequence(gameOverSide);
            await fadeOutQueueCards(); // 場のカードがふわっと消える
            cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) }; // ターン終了につき勝敗表現をリセット
            state.hands = new Array(5).fill(null);
            if (state.gameMode === 'versus') versusState.played2 = new Array(5).fill(null); // ローカル対戦: 2Pの場も同様に空にする
            updateUI();
            state.resolving = false; // バトルは決着済み。ボタンは結果画面から「タイトルへ戻る」でリセットされる
        } else {
            let rushCleared = false;
            if (rushKilled) rushCleared = await rushOnEnemyDefeated(); // 撃破数の加算・中ボス突破時の回復。100人目ならtrue
            // 第9条: ターン完了時のみ、残像付きでホームポジションへ確実に帰還する
            state.pY = DB.POS.GROUND_Y;
            state.eY = DB.POS.GROUND_Y;
            await goHome();
            toIdle();
            if (rushCleared) {
                // 100人撃破: 次の敵は出さず、場を片付けてRESULT(CLEAR)へ
                state.battleReady = false;
                await fadeOutQueueCards();
                cardOutcomes = { P: new Array(5).fill(null), E: new Array(5).fill(null) };
                state.hands = new Array(5).fill(null);
                state.enemyHands = [];
                state.enemyRevealedUpTo = 0;
                drawEnemySlots();
                updateUI();
                state.resolving = false;
                await wait(600);
                if (state.gameMode === 'rush') showRushResult(true);
                return;
            }

            // 手札・山が共に尽きた場合のみ、Refresh演出(点滅→カウントアップ)を挟んで捨札をリシャッフルする。
            // 両者が元の立ち位置に戻った後に行う。
            const handIsEmpty = state.playerHand.every(c => c === null);
            if (state.gameMode === 'versus') {
                await vsRefreshDecksIfNeeded(); // ローカル対戦: 両者分のリフレッシュ(手札は各自の入力番まで伏せたまま)
            } else if (handIsEmpty && state.playerDeck.length === 0) {
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
            if (state.gameMode === 'versus') versusState.played2 = new Array(5).fill(null); // ローカル対戦: 2Pの場も同様に空にする
            rollRequiredHandSize(); // サブストーリーバトルなら次のターン分の枚数をここで新たに抽選し直す(通常時はnullのまま)
            updateUI();
            state.enemyHands = [];
            state.enemyRevealedUpTo = 0;
            drawEnemySlots();
            if (rushKilled) await rushSpawnNextEnemy(); // BATTLE RUSH: 次の敵が登場し終わってから次のターンの入力を受け付ける
            state.resolving = false;
            if (rushKilled) updateActionButtons();
            if (state.gameMode === 'versus') vsBeginTurnInput(); // ローカル対戦: 次のターンの入力(1Pから)へ
        }
    }
}

// ============================================================
// UIポップアップ
// ============================================================
// チュートリアル(2026-10-01): はじめてのデッキ編成と、はじめてのNoah戦(STORY MODE)で一度だけ出す短い説明。
// ページ送り式(次へ→OK)。見たかどうかはセーブデータ(tutorialSeen)に残す。文面はTUTORIAL_PAGESだけ書き換えればよい。
// 本文の（P）（U）（G）はカードのアイコン、{img}は3すくみの図(howto.PNG)に置き換わる。
const TUTORIAL_PAGES = {
    deck: [
        { title: 'デッキビルド', body: 'PUNCH・UPPER・GUARDの3種類のカードで、<br>合計21枚のデッキを作ろう！<br><br>（P）は（U）に勝ち、（U）は（G）に勝ち、<br>（G）は（P）に勝つ。{img}迷ったら7枚ずつでもOK。<br>相手のクセが分かったら、<br>デッキを組み直して挑もう！' },
    ],
    battle: [
        { title: 'バトル', body: '手札のカードをタップして、<br>場に1〜5枚出そう。<br>出し終えたらGO!で勝負！<br><br>相手と1枚ずつ出し合って、<br>勝ったカードで攻撃するぞ！' },
        { title: 'ワザ', body: '決まった並びでカードを出すと、<br>ワザが出る！<br><br>ワザ表は左下のHOW TOから<br>いつでも見られるぞ。' },
    ],
};
let tutorialKey = null, tutorialPage = 0;
function showTutorial(key) {
    tutorialKey = key; tutorialPage = 0;
    renderTutorialPage();
    document.getElementById('tutorialOverlay').classList.add('show');
}
function renderTutorialPage() {
    const pages = TUTORIAL_PAGES[tutorialKey];
    const page = pages[tutorialPage];
    document.getElementById('tutorialTitle').textContent = page.title;
    const body = document.getElementById('tutorialBody');
    body.innerHTML = page.body.replace('{img}', '<img class="howto-img" src="assets/images/ui/howto.PNG" alt="" onerror="this.style.display=\'none\';">');
    applyHowToCardIcons(body);
    document.getElementById('tutorialPageNum').textContent = pages.length > 1 ? `${tutorialPage + 1} / ${pages.length}` : '';
    document.getElementById('tutorialNextBtn').textContent = tutorialPage < pages.length - 1 ? '次へ' : 'OK';
}
function nextTutorialPage() {
    playSE('se_select');
    if (tutorialPage < TUTORIAL_PAGES[tutorialKey].length - 1) { tutorialPage++; renderTutorialPage(); return; }
    document.getElementById('tutorialOverlay').classList.remove('show');
    tutorialSeen[tutorialKey] = true;
    writeSaveData({ tutorialSeen });
    tutorialKey = null;
}

// HOW TO(2026-10-01): どこから開いても、まず3すくみの図があるHOW TO BATTLEを出す。一番上に、RECORDSと同じく
// 見出しをタップすると開閉する欄を置く: モード別の説明(TRAINING/BATTLE RUSH/EXTRA BATTLE/LOCAL V.S.の対戦中だけ)と
// TECHNIQUES(ワザ表)。どちらも最初は閉じていて、開閉状態はアプリを開いている間だけ覚えておく。
const HOWTO_MODE_TEXTS = {
    training:       { text: 'howToTextTraining', label: 'HOW TO TRAINING' },
    rush:           { text: 'howToTextRush',     label: 'HOW TO BATTLE RUSH' },
    substoryBattle: { text: 'howToTextExtra',    label: 'HOW TO EXTRA BATTLE' },
    versus:         { text: 'howToTextVersus',   label: 'HOW TO LOCAL V.S.' },
};
const howToOpenSections = { mode: false, tech: false };
let howToCurrentMode = null; // 今開いているHOW TOで表示するモード(HOWTO_MODE_TEXTSのキー)。無ければnull
function renderHowTo() {
    const mode = howToCurrentMode && HOWTO_MODE_TEXTS[howToCurrentMode];
    const modeSec = document.getElementById('howToModeSection');
    modeSec.style.display = mode ? '' : 'none';
    if (mode) {
        document.getElementById('howToModeLabel').textContent = mode.label;
        const body = document.getElementById('howToModeBody');
        body.innerHTML = document.getElementById(mode.text).innerHTML;
        applyHowToCardIcons(body);
    }
    modeSec.classList.toggle('open', howToOpenSections.mode);
    document.getElementById('howToModeArrow').textContent = howToOpenSections.mode ? '▼' : '▶\ufe0e';
    renderHowToTechniques();
}
function toggleHowToSection(key) {
    howToOpenSections[key] = !howToOpenSections[key];
    playSE('se_select');
    renderHowTo();
}
function showHowToOverlay(extraClass) {
    renderHowTo();
    document.getElementById('howToPageBattle').scrollTop = 0;
    const ov = document.getElementById('howToOverlay');
    ov.classList.remove('vs-half-P', 'vs-half-E', 'vs-full-E');
    if (extraClass) ov.classList.add(extraClass);
    ov.classList.add('show');
}
function openHowTo() {
    const inBattle = document.getElementById('sceneBattle').classList.contains('active');
    howToCurrentMode = inBattle && HOWTO_MODE_TEXTS[state.gameMode] ? state.gameMode : null;
    showHowToOverlay(null);
    rushPauseTimer('howto'); // BATTLE RUSH: HOW TOを開いている間はタイマーを止める(RUSH中でなければ何もしない)
}

function closeHowTo() {
    const ov = document.getElementById('howToOverlay');
    ov.classList.remove('show', 'vs-half-P', 'vs-half-E', 'vs-full-E');
    rushResumeTimer('howto');
}
// LOCAL V.S.のHOW TO(2026-10-01): 各プレイヤーの左下のボタンから開く(HOW TO LOCAL V.S.の欄付き)。
// ・キャラ選択: 2人が同時に画面を使うため、押した人の側の半分だけに出す(2P側は180°回転)。
// ・バトル中: 自分がカードを選んでいる間(inputP/inputE)だけ押せる。その間は相手は画面を使わないので、
//   通常の1人用と同じ全画面で出す(2Pが押した時は全画面を180°回転させ、2Pから読める向きにする)。
function openHowToVs(side) {
    const inBattle = document.getElementById('sceneBattle').classList.contains('active');
    if (inBattle && versusState.phase !== (side === 'P' ? 'inputP' : 'inputE')) return;
    playSE('se_menu_open');
    howToCurrentMode = 'versus';
    showHowToOverlay(!inBattle ? 'vs-half-' + side : (side === 'E' ? 'vs-full-E' : null));
}
// バトル中のHOW TOボタンは、そのプレイヤーがカードを選んでいる間だけ表示する(vsSetGatesから呼ぶ)
function vsUpdateHowToBtns() {
    const ph = versusState.phase;
    const b1 = document.getElementById('vsHowToBtn1'), b2 = document.getElementById('vsHowToBtn2');
    if (b1) b1.style.visibility = ph === 'inputP' ? 'visible' : 'hidden';
    if (b2) b2.style.visibility = ph === 'inputE' ? 'visible' : 'hidden';
}

function closeHowToBackdrop(e) {
    if (e.target.id === 'howToOverlay') closeHowTo();
}

function openOption() {
    updateOptionUI();
    document.getElementById('optionOverlay').classList.add('show');
    rushPauseTimer('option'); // BATTLE RUSH: OPTIONを開いている間はタイマーを止める(RUSH中でなければ何もしない)
}

// BONUS CONTENTS(タイトル画面専用): SUB STORY/SOUND TEST/COSTUME/SPEEDのいずれかが1つでも解除されていればボタン自体を表示する。
// この関数とcheckUnlockAnnouncements(タイトル復帰時の「BONUS CONTENTS 解放！」トースト)の両方から共通で参照し、
// ボタンの表示条件とトースト発火条件がズレないようにする。
function bonusContentsAvailable() {
    const soundTestAvailable = gameClearedOnce || soundTestUnlocked; // 新条件(エンディングを迎えてタイトルへ戻る)。旧セーブデータのsoundTestUnlockedも引き続き有効
    const costumeAvailable = costumeSelectionAvailable(); // OPTION画面のCOSTUME行と同じ解放条件
    const speedAvailable = gameClearedOnce; // SPEED機能自体の解放条件(クリア後に出現)
    return unlockedSubStories.length > 0 || soundTestAvailable || costumeAvailable || speedAvailable;
}
function updateBonusContentsUI() {
    const soundTestAvailable = gameClearedOnce || soundTestUnlocked;
    const costumeAvailable = costumeSelectionAvailable(); // OPTION画面のCOSTUME行と同じ解放条件
    const btn = document.getElementById('bonusContentsBtn');
    if (btn) btn.style.display = bonusContentsAvailable() ? '' : 'none';
    layoutTitleMenu();
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
        battleBtn.style.visibility = (unlocked && state.gameMode !== 'rush') ? 'visible' : 'hidden'; // BATTLE RUSHでは2倍速を使えないためボタンを隠す
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
    stopCostumeThumbAnim();
    document.getElementById('costumeOverlay').classList.remove('show'); // BONUS経由でCOSTUMEが開いたまま残っている場合の安全策
    playBGM('bgm_title'); // SOUND TESTでタイトルBGMを止めていた場合でも、×で一括で閉じた時に確実に再開させる(既に流れていれば何もしない)
}

// BONUS ALLリセット: 実績で解除した内容(SUB STORY/SOUND TEST/COSTUME/SPEED)をすべて取得前の状態に戻す。
// 本番環境でも残す機能(進行状況=storyEnemyIndexのリセットとは別軸で、BONUS関連の解除状況のみを対象とする)。
function openBonusResetConfirm() { document.getElementById('bonusResetConfirmPanel').classList.add('show'); }
function closeBonusResetConfirm() { document.getElementById('bonusResetConfirmPanel').classList.remove('show'); }
function doResetAllBonus() {
    gameClearedOnce = false;
    soundTestUnlocked = false; // 旧セーブデータ互換の解除フラグも一緒に戻す
    unlockedSubStories = [];
    unlockedSkins = [];
    redeemedGiftCodes = []; // GIFT CODEの使用履歴も戻す(再度同じコードを入力できるようにする)
    selectedSkin = null;
    battleSpeedX2 = false; // SPEED設定も初期状態(通常速度)に戻す
    writeSaveData({ gameClearedOnce, soundTestUnlocked, unlockedSubStories, unlockedSkins, redeemedGiftCodes, selectedSkin, battleSpeedX2 });
    closeBonusResetConfirm();
    closeAllBonus(); // リセット後は表示する内容が無くなるため、BONUS関連のポップアップを一括で閉じる
}

function closeOption() {
    document.getElementById('optionOverlay').classList.remove('show');
    rushResumeTimer('option');
}

function closeOptionBackdrop(e) {
    if (e.target.id === 'optionOverlay') closeOption();
}

function updateOptionUI() {
    document.querySelector(`input[name="soundRadio"][value="${state.soundOn ? 'on' : 'off'}"]`).checked = true;
    document.getElementById('bgmVolumeSlider').value = Math.round(state.bgmVolume * 100);
    document.getElementById('seVolumeSlider').value = Math.round(state.seVolume * 100);
    // タイトルから開いた場合は「今のバトル」が存在しないため、RETRY/RETURN TO TITLEを隠す
    const isTitle = document.getElementById('sceneTitle').classList.contains('active');
    // COSTUMEは「STORY MODEを一度最後までクリアした」場合、またはGIFT CODE等の追加コスチュームを1つでも
    // 持っている場合(costumeSelectionAvailable)のみ表示する
    document.getElementById('optionCostumeRow').style.display =
        (costumeSelectionAvailable() && state.gameMode !== 'substoryBattle' && state.gameMode !== 'versus') ? 'flex' : 'none'; // サブストーリーバトル中は借りているキャラの見た目を変更できないようにする
    // GIFT CODEはタイトル画面のOPTIONからのみ入力できるようにする(バトル中は表示しない)
    document.getElementById('optionGiftCodeRow').style.display = isTitle ? 'flex' : 'none';
    document.getElementById('optionRecordsRow').style.display = 'flex'; // RECORDSはどのOPTIONからでも見られる(2026-10-01、バトル中にもワザのヒントを確認できるように)
    document.getElementById('optionResetRow').style.display = isTitle ? 'flex' : 'none'; // 進行状況リセットもタイトルのOPTIONからのみ(バトル中の誤操作防止、2026-09-28)
    document.getElementById('optionFooter').style.display = isTitle ? 'none' : 'flex';
    // TRAINING MODEはデッキ編成を経由しない(選び放題の固定手札のため)、RETRYボタン自体を隠す
    document.getElementById('optionRetryBtn').style.display = state.gameMode === 'training' ? 'none' : '';
    // RETURN TO TITLEの確認文言: STORY MODEは進行状況の保存に触れるが、TRAINING MODEは進行状況を持たないため短い文言にする
    document.getElementById('returnConfirmText').innerHTML = (state.gameMode === 'training' || state.gameMode === 'versus' || state.gameMode === 'rush')
        ? 'タイトルに戻りますか？'
        : 'タイトルに戻りますか？<br>（ストーリーの進行状況は保存されます）';
    closeResetConfirm(); // 開き直したら確認状態はリセット
    closeRetryConfirm();
    closeReturnConfirm();
    closeGiftCodeInput();
}

function setSound(on) {
    state.soundOn = on;
    writeSaveData({ soundOn: on });
    if (!on) {
        stopBGM(); // OFFにした瞬間、鳴っているBGMを止める(currentBgmNameはクリアされるが、lastBgmNameは保持され続ける)
    } else if (lastBgmName) {
        // 直前まで鳴らそうとしていたBGMがあれば、ONに戻した時点で再生を試みる。currentBgmNameは
        // stopBGM()で既にnullになっているため、playBGM側の「同じ名前なら何もしない」ガードは気にせず直接呼べる
        playBGM(lastBgmName);
    }
}

function openResetConfirm() { document.getElementById('resetConfirmPanel').classList.add('show'); }

function closeResetConfirm() { document.getElementById('resetConfirmPanel').classList.remove('show'); }

// OPTION内の「進行状況(セーブデータ)のリセット」: storyEnemyIndexをセーブデータごと0に戻す。
// これによりタイトルのCONTINUEも即座に消える。
function doResetProgress() {
    state.storyEnemyIndex = 0;
    writeSaveData({ storyEnemyIndex: 0 });
    updateTitleContinueVisibility();
    closeResetConfirm();
}

// ------- GIFT CODE(シリアルコード) -------
// 2026-09-28、照合方式を変更: 以前は「計算式(チェックサム)に合う文字列ならどれでも有効」だったため、
// ソースを読めば誰でも有効なコードを作れてしまっていた。現在は、発行済みのコードそのものは一切ソースに置かず、
// PBKDF2(SHA-256を多数回繰り返す、ブラウザ標準のcrypto.subtle)で変換した値だけを持ち、入力されたコードを
// 同じ方法で変換して一致したものだけを有効にする(通信不要、オフラインで完結)。
// 繰り返し回数を多くしているのは、8桁のコードを総当たりで探し当てられにくくするため(1回の照合が意図的に重い)。
// 新しいコードを追加する手順: コードを決める → 下記と同じソルト・回数でPBKDF2値を計算 → GIFT_CODE_HASHESに1行追加。
// コードの平文はリポジトリ・ドキュメントに書かないこと(配布先にだけ伝える)。
const GIFT_CODE_PBKDF2_SALT = 'CLASH5-GIFT-2026';
const GIFT_CODE_PBKDF2_ITER = 150000;
// GIFT_CODE_VERSUS_REWARD / GIFT_CODE_RUSH_REWARD: コスチュームではなくモード解放を表す特別な報酬値。
// submitGiftCode側でこの値かどうかを見て、コスチューム解放とは別の専用処理に分岐する。
const GIFT_CODE_VERSUS_REWARD = 'unlock_versus';
const GIFT_CODE_RUSH_REWARD = 'unlock_rush';
// PBKDF2値(16進) → 報酬
const GIFT_CODE_HASHES = {
    '8a1cc7fe3be521332e30b87dd716f2b23ce952dc15df2bb46ae93fd19dcf775c': 'mifune',               // MIFUNEコスチューム
    '0ed3577057a45b7eca95cb92ffd8de9e86661241827f4a676c57215ca77ade3c': GIFT_CODE_VERSUS_REWARD, // LOCAL V.S.解放
    '75c11927e586db4af6e3352382cde7af57d49676fdad0b1787b3d9993fdf3c51': GIFT_CODE_RUSH_REWARD,   // BATTLE RUSH解放
};
function normalizeGiftCode(raw) {
    return (raw || '').trim().toUpperCase();
}
async function giftCodeHash(code) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(GIFT_CODE_PBKDF2_SALT), iterations: GIFT_CODE_PBKDF2_ITER, hash: 'SHA-256' }, key, 256);
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}
// 入力されたコードの報酬を返す(該当なしはnull)。crypto.subtleが使えない環境(https以外で開いた場合など)は'unsupported'
async function giftCodeReward(code) {
    if (!/^[0-9A-Z]{8}$/.test(code)) return null; // 形式が違うものは重い変換をせずに弾く
    if (!(window.crypto && crypto.subtle)) return 'unsupported';
    try {
        return GIFT_CODE_HASHES[await giftCodeHash(code)] || null;
    } catch (e) {
        return 'unsupported';
    }
}
let giftCodeChecking = false; // 照合中の連打で二重に処理しないためのフラグ
function openGiftCodeInput() {
    document.getElementById('giftCodeInput').value = '';
    document.getElementById('giftCodeError').style.display = 'none';
    document.getElementById('giftCodeConfirmPanel').classList.add('show');
}
function closeGiftCodeInput() {
    document.getElementById('giftCodeConfirmPanel').classList.remove('show');
}
function showGiftCodeError(text) {
    const errorEl = document.getElementById('giftCodeError');
    errorEl.textContent = text;
    errorEl.style.display = 'block';
}
async function submitGiftCode() {
    if (giftCodeChecking) return;
    const code = normalizeGiftCode(document.getElementById('giftCodeInput').value);
    giftCodeChecking = true;
    let reward;
    try {
        reward = await giftCodeReward(code);
    } finally {
        giftCodeChecking = false;
    }
    if (reward === 'unsupported') {
        showGiftCodeError('この環境ではコードを確認できません');
        return;
    }
    if (!reward) {
        showGiftCodeError('コードが正しくありません');
        return;
    }
    if (redeemedGiftCodes.includes(code)) {
        showGiftCodeError('このコードは使用済みです');
        return;
    }
    redeemedGiftCodes.push(code);
    writeSaveData({ redeemedGiftCodes });
    if (reward === GIFT_CODE_RUSH_REWARD) {
        // BATTLE RUSH解放コード。VERSUSと同じく、コスチューム解放処理には進まずここで完結させる。
        const alreadyUnlocked = rushUnlocked;
        rushUnlocked = true;
        writeSaveData({ rushUnlocked: true });
        updateRushButtonVisibility();
        updateBonusContentsUI();
        checkUnlockAnnouncements(); // 初回のBONUS CONTENTS解放であれば、ここで案内する
        closeGiftCodeInput();
        updateOptionUI();
        if (!alreadyUnlocked) {
            showUnlockToast({ small: 'BATTLE RUSH', large: 'バトルラッシュモード 解放！' });
        }
        return;
    }
    if (reward === GIFT_CODE_VERSUS_REWARD) {
        // 対戦モード(VERSUS)解放コード。コスチュームではないため、以下のコスチューム解放処理には進まずここで完結させる。
        const alreadyUnlocked = versusUnlocked;
        versusUnlocked = true;
        writeSaveData({ versusUnlocked: true });
        updateVersusButtonVisibility();
        updateBonusContentsUI();
        checkUnlockAnnouncements(); // 初回のBONUS CONTENTS解放であれば、ここで案内する
        closeGiftCodeInput();
        updateOptionUI();
        if (!alreadyUnlocked) {
            showUnlockToast({ small: 'LOCAL V.S. MODE', large: 'ローカル対戦モード 解放！' });
        }
        return;
    }
    const rewardSkin = reward;
    const alreadyUnlocked = unlockedSkins.includes(rewardSkin);
    unlockSkin(rewardSkin);
    closeGiftCodeInput();
    updateOptionUI();
    // GIFT CODEはタイトル画面のOPTIONから直接入力するため(シーン遷移を経ないため)goTitle()は呼ばれない。
    // そのため、タイトル画面本体のBONUS CONTENTSボタンをここで明示的に再描画し、OPTIONを閉じた瞬間から
    // (ゲーム開始直後の初回コード入力のように、これがBONUS CONTENTS自体の初解放になる場合でも)選べるようにする。
    updateBonusContentsUI();
    checkUnlockAnnouncements(); // 初回のBONUS CONTENTS解放であれば、ここで「BONUS CONTENTS 解放！」も案内する
    // 他のコスチューム解放と同じ2段階トースト(COSTUMEモード自体の初回案内→個別の解放案内)を出す
    if (!costumeUnlockAnnounced) {
        costumeUnlockAnnounced = true;
        writeSaveData({ costumeUnlockAnnounced: true });
        showUnlockToast('COSTUME 解放！');
    }
    if (!alreadyUnlocked) {
        const label = EXTRA_COSTUME_LABELS[rewardSkin] || rewardSkin;
        showUnlockToast({ small: 'COSTUME', large: `${label} 解放！` });
    }
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
        row.innerHTML = `<span class="option-label">${subStoryDisplayTitle(idx)}</span><button onclick="readSubStory(${idx})">読む</button>`;
        rows.appendChild(row);
    });
    if (unlockedSubStories.length === 0) {
        rows.innerHTML = '<p style="color:#888;">まだ何も解除されていません。</p>';
    }
    document.getElementById('subStoryOverlay').classList.add('show');
}
let subStoryToken = 0;
let subStoryTapResolve = null; // サブストーリーのタップ待ち中のPromiseのresolve関数
let subStoryReadIdx = null; // readSubStoryで現在読んでいるサブストーリーのenemyIndex(0〜4)。右下のSKIPボタンから参照する

function onSubStoryTap() {
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    else cineSkipRequested = true; // 文字送りの途中なら全文を一気に表示する
}
function waitForSubStoryTap() {
    return new Promise(resolve => { subStoryTapResolve = resolve; });
}

// サブストーリーを再生する。本編のストーリーシーンと同じく3画面(画像+1文字ずつのテキスト)を、タップで送りながら表示する。
// 3画面すべて読み終えたタイミングで、対応する敵のコスチュームを解除する。
// サブストーリーバトル(検討中の新機能)勝利後のエピローグ。1枚の画像+複数ページのテキストで構成する
// (通常のサブストーリー=3画面とは異なり1画面のみ)。表示にはreadSubStoryと同じDOM要素を流用する。
const SUBSTORY_BATTLE_EPILOGUE = {
    // darkUntilPage: 指定ページ(0始まり)までは画面を暗いままにし、そのページでフェードインする
    ENEMY_01: { img: 'substory_battle_1.PNG', darkUntilPage: 1, text: [
        '戦いの末、ノアは道化師を逃がしてしまった。\nそれを3年の間ずっと悔やんでいた。',
        'そして今、そのとき無くなったはずの\n婚約指輪が偶然見つかる。',
        'ノアは形見を強く握り、誓った。',
        'ノア「……今度こそ、この村を守ってみせる。'
    ] },
    // whiteFadeAtPage: 画面を出す前に白くフラッシュして白のまま始め、指定ページで白からフェードインする
    ENEMY_02: { img: 'substory_battle_2.PNG', whiteFadeAtPage: 1, text: [
        '戦いのさなか、\nぬいぐるみが宙へ投げ出された。',
        'リタは、とっさにぬいぐるみを抱き止めた。\nノアの拳が、リタの背中の寸前で止まる。',
        'ノア「……託されたものを守り抜く。\n……大事なことじゃ。',
        'かくして、ノアはリタに教会の鍵を渡し、\n村の聖職者として教会で暮らすことになった。'
    ] },
    // shakeAtPage/shakeMs: 指定ページで指定時間だけ画面を揺らす。darkenAtPage: 指定ページから画像が徐々に暗くなる
    ENEMY_03: { img: 'substory_battle_3.PNG', darkUntilPage: 1, shakeAtPage: 1, shakeMs: 2000, darkenAtPage: 3, text: [
        '少年が倒れると、あやつられていた糸は切れた。',
        'だが、戦いの衝撃によって壁が崩れ、二人を襲った。',
        'ガルドは少年を覆い被さって護るが、\n少年の息は、止まってしまっていた。',
        '……ガルドは、そのときについた額のキズを\n自らの過ちとして刻みながら生き続けている。'
    ] },
    ENEMY_04: { img: 'substory_battle_4.PNG', text: [
        'ジャック「……じゃあね。\nこの“目”が呼んでるんだ。',
        '敗れたリタのそばに、\n古いぬいぐるみが転がる。',
        'リタ「…くっ…\n司祭様の大事にしていたぬいぐるみ……',
        'リタ「……司祭様の息子の名は……“ジャック”……',
        'リタ「あなた、なんでしょ……！？'
    ] },
    ENEMY_05: { img: 'substory_battle_5.PNG', text: [
        '仮想ヴァルは倒れた。\nだが本物が現れる日は、確実に近づいていた。',
        'アルヴ「私は生きる。この世界の秩序も\n壊させはしない。',
        'アルヴ「そのためなら、犠牲もいとわぬ。\nそれが魔王たる、私の正義だ。'
    ] },
};

// サブストーリーバトルの状態(pPresetKey等)をクリーンアップし、通常のSTORY MODEへ戻す
function endSubstoryBattle() {
    state.pPresetKey = null;
    state.ePresetKey = null;
    state.substoryStageNum = null;
    state.substoryMusicNum = null;
    state.requiredHandSize = null;
    state.gameMode = 'story';
    state.pendingMode = 'story';
}

// サブストーリーバトルに勝利した後、1画面のエピローグを再生し、コスチューム解放→BONUS CONTENTSへ戻る。
// readSubStoryとほぼ同じ構造(タップで送る、text配列で複数ページ)だが、画面数が1枚固定の点のみ異なる。
async function playSubstoryBattleEpilogue(playerPresetKey) {
    const epilogue = SUBSTORY_BATTLE_EPILOGUE[playerPresetKey];
    const myToken = ++subStoryToken;
    const imgArea = document.getElementById('subStoryImgArea');
    const fallback = document.getElementById('subStoryImgFallback');
    const textEl = document.getElementById('subStoryText');
    const block = document.getElementById('subStoryBlock');
    const flashEl = document.getElementById('subStoryFlash');

    playBGM('bgm_story', 'bgm_story');
    document.getElementById('bonusContentsOverlay').classList.remove('show');
    document.getElementById('subStoryOverlay').classList.remove('show');
    showScene('subStoryRead');
    document.getElementById('subStoryReadSkipBtn').style.display = 'none'; // エピローグ中は(readSubStory由来のSKIPボタンが残っていないよう)必ず隠す
    block.style.transition = 'none';
    block.style.opacity = '0';
    await wait(30);
    if (epilogue && epilogue.whiteFadeAtPage !== undefined) {
        // 白から始まるエピローグは、黒から一瞬でパッと白くフラッシュさせる(フェードで徐々に白くしない)
        flashEl.style.transition = 'none';
        flashEl.style.background = '#fff';
        flashEl.style.opacity = '1';
        block.style.transition = 'none';
    } else {
        block.style.transition = 'opacity 0.6s ease-in';
    }
    block.style.opacity = '1';

    if (epilogue) {
        await loadCutsceneScreens([epilogue], 'substory');
        if (subStoryToken === myToken) {
            if (imgs[epilogue.img]) {
                imgArea.style.backgroundImage = `url('assets/images/cutscenes/substory/${epilogue.img}')`;
                imgArea.classList.remove('placeholder');
            } else {
                imgArea.style.backgroundImage = 'none';
                imgArea.classList.add('placeholder');
                fallback.innerText = epilogue.img + ' (未配置)';
            }
            // epilogue.shake: 画像表示直後から1秒間だけ小刻みに揺れる演出(1回きりのshakingとは別のループ用クラス)。
            // 以前はエピローグを読み終える(全ページタップし終える)までずっと揺れ続けていたが、
            // 「EXTRA BATTLE後、振動し続けているのが気になる」という指摘を受け、1秒経過したら
            // 自動的に揺れを止める(以降はテキストを読み終えるまで静止した画像のまま)よう変更した。
            imgArea.classList.remove('shaking-loop');
            if (epilogue.shake) {
                void imgArea.offsetWidth; // クラス再付与時にアニメーションを確実に最初から再生させるための強制リフロー
                imgArea.classList.add('shaking-loop');
                setTimeout(() => {
                    if (subStoryToken === myToken) imgArea.classList.remove('shaking-loop');
                }, 1000);
            }
            // epilogue.darkenAtPage: 指定したページ(0始まり)に到達した時点で、画像を徐々に暗く沈めていく演出
            imgArea.style.transition = 'none';
            imgArea.style.filter = 'none';
            // epilogue.whiteFadeAtPage: 最初は真っ白(画像を覆い隠す)な状態から始め、指定したページに到達した時点で
            // 白いオーバーレイ(#subStoryFlash、黒→赤フラッシュと共用)を1.8秒かけてフェードアウトさせ、
            // 裏の画像を徐々に露わにする演出(それより前のページでは白一色のまま画像を見せない)。
            if (epilogue.whiteFadeAtPage !== undefined) {
                flashEl.style.transition = 'none';
                flashEl.style.background = '#fff';
                flashEl.style.opacity = '1';
            } else if (epilogue.darkUntilPage !== undefined) {
                // 画面は暗いまま(黒で覆い隠す)始め、指定ページでフェードインする
                flashEl.style.transition = 'none';
                flashEl.style.background = '#000';
                flashEl.style.opacity = '1';
            } else {
                flashEl.style.opacity = '0';
            }

            const pages = Array.isArray(epilogue.text) ? epilogue.text : [epilogue.text];
            for (let p = 0; p < pages.length; p++) {
                if (subStoryToken !== myToken) break;
                if (epilogue.darkenAtPage === p) {
                    imgArea.style.transition = 'filter 1.8s ease-out';
                    imgArea.style.filter = 'brightness(0.15)';
                }
                if (epilogue.whiteFadeAtPage === p || epilogue.darkUntilPage === p) {
                    flashEl.style.transition = 'opacity 1.8s ease-out';
                    flashEl.style.opacity = '0';
                }
                if (epilogue.shakeAtPage === p) {
                    imgArea.classList.remove('shaking-loop');
                    void imgArea.offsetWidth;
                    imgArea.classList.add('shaking-loop');
                    setTimeout(() => {
                        if (subStoryToken === myToken) imgArea.classList.remove('shaking-loop');
                    }, epilogue.shakeMs || 1000);
                }
                clearCineText(textEl);
                if (!await typeCineText(textEl, pages[p], 45, () => subStoryToken !== myToken, true)) break; // 途中タップで全文表示
                setCineTextEnd(textEl, 'tap'); // タップ待ち: 文末に▼
                await waitForSubStoryTap();
            }
            imgArea.classList.remove('shaking-loop'); // 次に別のサブストーリー等を開いた時に揺れが残らないよう、必ずリセットする
        }
    }

    // 最後のページまで読み終えたら、コンテンツをゆっくりフェードアウトさせる(真っ黒になる。#appRoot/bodyの背景が
    // もともと黒のため、blockを透明にするだけで暗転が完成する)
    if (subStoryToken === myToken) {
        block.style.transition = 'opacity 1.5s ease-out';
        block.style.opacity = '0';
        await wait(1500);
    }

    // 真っ黒になったところで、「SUB STORY / キャラ名 / END」をFIN.と同じ演出(フェードイン→表示→フェードアウト)で見せる
    if (subStoryToken === myToken) {
        await playSubStoryEndScreen(ENEMY_PRESETS[playerPresetKey].name);
    }

    // END画面が消えた直後、真っ黒な画面のまま、コスチュームがまだ未解除だった場合のみ実績解除トーストを出す。
    // このバトル自体がまさにこのコスチュームを解除するためのものなので、gameClearedOnce等の他条件は問わず、
    // 「未解除だったかどうか」だけで判定する。
    // 通知は2段階: (1) COSTUMEというモード自体が増えたことの案内(「COSTUME 解放！」、costumeUnlockAnnouncedで
    // 一度だけ)、(2) このキャラ個別の解放案内(「COSTUME」+「〈キャラ名〉 解放！」の2段組み、SUB STORYの通知と
    // 同じ形式)。(1)は初回のみ、(2)は解放されるたびに毎回出す。
    const idx = ENEMY_ORDER.indexOf(playerPresetKey);
    if (idx !== -1) {
        const skinName = 'enemy_' + (idx + 1);
        const alreadyUnlocked = unlockedSkins.includes(skinName);
        unlockSkin(skinName);
        updateOptionUI(); // 背後で開いたままのOPTION画面のCOSTUME行を即座に表示させる(クリア前でも行自体は出る)
        if (!alreadyUnlocked) {
            let lastToast = null;
            if (!costumeUnlockAnnounced) {
                // 以後、他の経路(タイトル復帰時のcheckUnlockAnnouncements等)で重複して案内されないようにする
                costumeUnlockAnnounced = true;
                writeSaveData({ costumeUnlockAnnounced: true });
                showUnlockToast('COSTUME 解放！'); // モード自体が増えたことの案内(初回のみ)
            }
            lastToast = showUnlockToast({ small: 'COSTUME', large: `${ENEMY_PRESETS[playerPresetKey].name} 解放！` }); // このキャラ個別の案内
            await lastToast; // トーストはタップで閉じる方式のため、最後の1件が閉じられるまで待つ(キューで順番に流れる)
        }
    }
    endSubstoryBattle();
    showScene('title');
    playBGM('bgm_title');
    document.getElementById('bonusContentsOverlay').classList.add('show'); // backToSubStoryListと同じパターンで背後にBONUS CONTENTSを表示しておく
    openSubStoryList(); // サブストーリー選択画面へ戻す
}

async function readSubStory(idx) {
    const sub = SUBSTORY_BY_ENEMY[ENEMY_ORDER[idx]];
    if (!sub) return;
    const myToken = ++subStoryToken;
    const imgArea = document.getElementById('subStoryImgArea');
    const fallback = document.getElementById('subStoryImgFallback');
    const textEl = document.getElementById('subStoryText');
    const block = document.getElementById('subStoryBlock');
    const flashEl = document.getElementById('subStoryFlash');

    // サブストーリーごとに個別のBGM(sub.bgm、例: 'bgm_battle_2'のような既存BGMの流用)を指定できる。
    // 指定が無ければ本編ストーリーシーンと同じ共通BGM(bgm_story)を流す。
    // 以前はここで即座にplayBGMを呼んで鳴らし始めていたが、画像と同じくローディング対象に含めるため、
    // 読み込みだけ先に済ませておき(preloadBgm)、実際の再生開始は後段の読み込み待ち完了後に行う。
    const subStoryBgmName = sub.bgm || 'bgm_story';

    // 戦う前のストーリーシーンと同じフルスクリーン表示に切り替える(ポップアップは一旦閉じる)
    document.getElementById('bonusContentsOverlay').classList.remove('show');
    document.getElementById('subStoryOverlay').classList.remove('show');
    showScene('subStoryRead');
    // 右下のSKIPボタン(バトルへ直接スキップ)は、このサブストーリーバトルに既に勝利済み(コスチューム解除済み)の
    // 場合のみ表示する。押された時にどのキャラかわかるよう、対象のidxをモジュール変数に覚えておく。
    subStoryReadIdx = idx;
    const skinNameForSkip = 'enemy_' + (idx + 1);
    document.getElementById('subStoryReadSkipBtn').style.display = unlockedSkins.includes(skinNameForSkip) ? '' : 'none';
    block.style.transition = 'none';
    block.style.opacity = '0';
    await wait(30); // 直前のopacity:0が確実に描画されてからフェードインを開始させる
    block.style.transition = 'opacity 0.6s ease-in';
    block.style.opacity = '1';
    flashEl.style.transition = 'none';
    flashEl.style.opacity = '0'; // 他の機能(エピローグのwhiteFadeAtPage等)がこの要素を使った直後でも、必ず非表示から始める
    subStoryPrevExitFade = false;

    // 表示を始める前に3画面分の画像・BGM両方の読み込み完了を待つ(未配置ならnullで解決されすぐ進む)。読み込みが
    // 間に合っていない場合は#sceneLoadingScreenで明示的にローディングを見せる(以前はここでも画面が一時的に空白のままだった)。
    await ensureReadyWithLoading(Promise.all([
        loadCutsceneScreens(sub.screens, 'substory'),
        preloadBgm(subStoryBgmName, 'bgm_story')
    ]));
    if (subStoryToken !== myToken) return; // 読み込み待ちの間に戻る/閉じるで中断されていたら止める
    playBGM(subStoryBgmName, 'bgm_story'); // 画像・BGM共に読み込み済みのはずなので、ここから即座に再生を開始する

    for (let i = 0; i < sub.screens.length; i++) {
        const screen = sub.screens[i];
        if (subStoryToken !== myToken) return; // 戻る/閉じるで中断されていたら止める

        if (screen.darkUntilPage !== undefined) {
            // 画像を見せる前に黒で覆っておく(指定ページでフェードインする)
            flashEl.style.transition = 'none';
            flashEl.style.background = '#000';
            flashEl.style.opacity = '1';
        }
        if (screen.entranceSE) playSE(screen.entranceSE); // 画面が切り替わる瞬間の効果音(2026-09-30追加)
        // 画面切り替え時の特殊演出(screen.entranceEffect)。無指定なら従来通り即座に切り替える。
        if (screen.entranceEffect === 'blackRedFlash') {
            // 黒画面を保持→赤く一瞬フラッシュ→裏で画像を差し替えてから消す、という2段階の演出
            imgArea.style.backgroundImage = 'none'; // 赤フラッシュが消えるまで、実際の画像はまだ見せない
            flashEl.style.transition = 'none';
            flashEl.style.background = '#000';
            flashEl.style.opacity = '1';
            await wait(400); // 黒画面を少し保持する
            if (subStoryToken !== myToken) return;
            flashEl.style.transition = 'background 0.12s ease-out';
            flashEl.style.background = '#c00'; // 赤フラッシュ
            await wait(180);
            if (subStoryToken !== myToken) return;
            if (imgs[screen.img]) {
                imgArea.style.backgroundImage = `url('assets/images/cutscenes/substory/${screen.img}')`;
                imgArea.classList.remove('placeholder');
            } else {
                imgArea.style.backgroundImage = 'none';
                imgArea.classList.add('placeholder');
                fallback.innerText = screen.img + ' (未配置)';
            }
            flashEl.style.transition = 'opacity 0.3s ease-out';
            flashEl.style.opacity = '0';
            await wait(300);
        } else {
            if (imgs[screen.img]) {
                imgArea.style.backgroundImage = `url('assets/images/cutscenes/substory/${screen.img}')`;
                imgArea.classList.remove('placeholder');
            } else {
                imgArea.style.backgroundImage = 'none';
                imgArea.classList.add('placeholder');
                fallback.innerText = screen.img + ' (未配置)';
            }
        }

        // ぼけた画像がだんだんはっきりしてくる演出(screen.entranceEffect === 'blurIn')。無指定ならぼかし無し。
        if (screen.entranceEffect === 'blurIn') {
            imgArea.style.transition = 'none';
            imgArea.style.filter = 'blur(18px)';
            await wait(30);
            if (subStoryToken !== myToken) return;
            imgArea.style.transition = 'filter 2s ease-out';
            imgArea.style.filter = 'blur(0px)';
            await wait(2000);
        } else {
            imgArea.style.transition = 'none';
            imgArea.style.filter = 'none'; // 前の画面でぼかしが残っていないよう、毎回明示的にリセットする
        }
        if (subStoryToken !== myToken) return;
        if (screen.darkUntilPage === undefined && screen.entranceEffect !== 'blackRedFlash' && subStoryPrevExitFade) {
            // 前の画面がexitFadeで暗転していた場合は、黒からフェードインして見せる
            flashEl.style.transition = 'opacity 1s ease-in';
            flashEl.style.opacity = '0';
            await wait(1000);
            if (subStoryToken !== myToken) return;
        }
        subStoryPrevExitFade = false;

        // textは通常は1画面1ページの文字列だが、同じ画像のまま複数ページ分のテキストを送りたい場合は配列にできる
        const pages = Array.isArray(screen.text) ? screen.text : [screen.text];
        for (let p = 0; p < pages.length; p++) {
            if (subStoryToken !== myToken) return;

            // ページ単位で効果音を鳴らしたい場合(screen.pageSE、キーはページ番号=0始まり)
            if (screen.pageSE && screen.pageSE[p]) playSE(screen.pageSE[p]);
            if (screen.darkUntilPage === p) {
                flashEl.style.transition = 'opacity 1.8s ease-out';
                flashEl.style.opacity = '0';
            }

            clearCineText(textEl);
            if (!await typeCineText(textEl, pages[p], 45, () => subStoryToken !== myToken, true)) return; // 途中タップで全文表示
            setCineTextEnd(textEl, 'tap'); // タップ待ち: 文末に▼
            await waitForSubStoryTap(); // 本編と同じくタップで次へ(自動送りしない)
            if (subStoryToken !== myToken) return;
        }
        if (screen.exitFade) {
            // 読み終えたら画像を黒へフェードアウトする(テキストも消す)
            textEl.innerText = '';
            flashEl.style.transition = 'opacity 1.5s ease-out';
            flashEl.style.background = '#000';
            flashEl.style.opacity = '1';
            await wait(1500);
            if (subStoryToken !== myToken) return;
            subStoryPrevExitFade = true;
        }
    }

    // サブストーリーを3画面すべて読み終えた(体験した)タイミングで、対応する敵の「サブストーリーバトル」へつなげる。
    // まだコスチュームを解除していない(=このサブストーリーバトルにまだ勝利していない)場合は、選択の余地なく直接バトルへ進む。
    // 既に解除済み(2回目以降の読み返し)の場合は、バトルを強制せず「バトルをしますか？」の確認ポップアップを出し、
    // 「いいえ」を選べばバトルせずに勝利後のエピローグへ直接進める(気軽に後日談だけ読み返せるようにするため)。
    const skinName = 'enemy_' + (idx + 1);
    if (!unlockedSkins.includes(skinName)) {
        goSubstoryBattle(ENEMY_ORDER[idx]);
        return;
    }
    openSubstoryBattleConfirm(idx);
}

// 右下のSKIPボタン(readSubStory側で、既に勝利済み=コスチューム解除済みの場合のみ表示している)。
// テキストを読み終えるのを待たず、その場でサブストーリーバトルへ直接進む(読み終えた時の確認ポップアップは経由しない)。
function skipSubStoryToBattle() {
    if (subStoryReadIdx === null) return;
    const idx = subStoryReadIdx;
    subStoryToken++; // 読み進行(文字送り・タップ待ち)を中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    goSubstoryBattle(ENEMY_ORDER[idx]);
}

// 「このキャラでバトルをしますか？」確認パネルの制御。解放済みのサブストーリーを読み終えた直後にのみ表示する。
let subStoryPrevExitFade = false; // 直前の画面がexitFadeで暗転したままか(次の画面をフェードインで見せるため)
let pendingSubstoryBattleIdx = null; // 確認パネル表示中、対象のサブストーリー番号(0〜4)を覚えておく
function openSubstoryBattleConfirm(idx) {
    pendingSubstoryBattleIdx = idx;
    document.getElementById('substoryBattleConfirmPanel').classList.add('show');
}
function closeSubstoryBattleConfirmPanel() {
    document.getElementById('substoryBattleConfirmPanel').classList.remove('show');
}
function acceptSubstoryBattle() {
    const idx = pendingSubstoryBattleIdx;
    pendingSubstoryBattleIdx = null;
    closeSubstoryBattleConfirmPanel();
    goSubstoryBattle(ENEMY_ORDER[idx]);
}
function declineSubstoryBattle() {
    const idx = pendingSubstoryBattleIdx;
    pendingSubstoryBattleIdx = null;
    closeSubstoryBattleConfirmPanel();
    playSubstoryBattleEpilogue(ENEMY_ORDER[idx]); // バトルせず、勝利後のエピローグへ直接進む(コスチュームは既に解除済みのため再解除は何もしない)
}
function backToSubStoryList() {
    subStoryToken++; // 再生中なら中断する
    if (subStoryTapResolve) { subStoryTapResolve(); subStoryTapResolve = null; }
    showScene('title'); // BONUS CONTENTSはタイトル画面専用のため、戻る先は常にタイトル
    playBGM('bgm_title'); // サブストーリー専用BGMが流れていた場合、タイトルへ戻ったのでタイトルBGMに戻す
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
    // サウンドテスト中はタイトルBGMを止める(プレビューと二重に鳴ってしまうため)。
    // currentBgmNameも空にしておくことで、closeSoundTest側のplayBGM('bgm_title')が
    // 「同じ名前だから何もしない」判定で素通りされず、確実に再生し直される
    currentBgmName = null;
    stopBGM();
}

// 現在の状態(カテゴリ選択 or 一覧)に応じてsoundTestBodyを描画する。
// BGMプレビューはナビゲーションをまたいで鳴り続けさせたいため、ここでは止めない(ボタン表示だけ最新の状態に合わせる)。
function renderSoundTestScreen() {
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
    updateSoundTestPlayButtons(); // 新しく描画した行に、現在再生中のBGM/SEの状態を反映する
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

// 再生ボタンの表示(▶/⬛︎)を、現在再生中のBGM・SEに合わせて更新する(BGM/SEどちらのプレビューでも押されていれば⬛︎にする)
function updateSoundTestPlayButtons() {
    document.querySelectorAll('.sound-test-play-btn').forEach(btn => {
        const n = btn.dataset.trackName;
        btn.innerText = (n === soundTestBgmPlayingName || n === soundTestSePlayingName) ? '⬛︎' : '▶';
    });
}

function stopSoundTestBgmPreview() {
    if (soundTestBgmSource) {
        try { soundTestBgmSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        try { soundTestBgmSource.disconnect(); } catch (e) { /* 何もしない */ }
        soundTestBgmSource = null;
    }
    soundTestBgmPlayingName = null;
    updateSoundTestPlayButtons();
}
function stopSoundTestSePreview() {
    if (soundTestSeSource) {
        try { soundTestSeSource.stop(); } catch (e) { /* 既に停止済み等は無視 */ }
        try { soundTestSeSource.disconnect(); } catch (e) { /* 何もしない */ }
        soundTestSeSource = null;
    }
    soundTestSePlayingName = null;
    updateSoundTestPlayButtons();
}
// SOUND TESTのプレビュー(BGM・SEとも)を両方止める。サウンドテスト自体を閉じる時に呼ぶ
function stopSoundTestPlayback() {
    stopSoundTestBgmPreview();
    stopSoundTestSePreview();
}

// タップされたトラックが再生中なら止め、そうでなければ再生する。
// BGMプレビューとSEプレビューは互いに独立しており、一方を再生してももう一方は止まらない
// (例: BGMを流したまま画面を「戻る」で移動し、SEカテゴリで試聴する、ということができる)。
// 同じ種別(BGM同士、SE同士)の別トラックへ切り替える場合のみ、その種別の再生中のものを止める。
// 本編のBGM/SE再生とは独立したノードを使うため、本編のBGMを止めてしまうことはない。
// また、未配置ファイルをse_punch等で代用せず、そのまま無音にする(どのファイルが未配置かを正確に確認できるようにするため)。
async function toggleSoundTestTrack(name) {
    const isBgm = name.startsWith('bgm_');
    const currentPlayingName = isBgm ? soundTestBgmPlayingName : soundTestSePlayingName;
    if (currentPlayingName === name) {
        if (isBgm) stopSoundTestBgmPreview(); else stopSoundTestSePreview();
        return;
    }
    if (isBgm) stopSoundTestBgmPreview(); else stopSoundTestSePreview();

    const cache = isBgm ? bgmBufferCache : seBufferCache;
    let buffer = cache[name];
    if (buffer === undefined) {
        buffer = await loadAudioBuffer(isBgm ? 'bgm' : 'se', name);
        cache[name] = buffer;
    }
    if (!buffer) return; // 未配置ならそのまま無音(代用しない)
    // 読み込み待ちの間にサウンドテスト自体が閉じられていたら中断
    if (!document.getElementById('soundTestOverlay').classList.contains('show')) return;

    const ctx = await getReadyAudioCtx();
    // resumeを待っている間にサウンドテスト自体が閉じられていたら中断
    if (!document.getElementById('soundTestOverlay').classList.contains('show')) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = isBgm; // BGMはループ、SEは1回のみ
    source.connect(isBgm ? getBgmGainNode() : getSeGainNode());
    source.onended = () => {
        if (isBgm) {
            if (soundTestBgmSource === source) { soundTestBgmSource = null; soundTestBgmPlayingName = null; updateSoundTestPlayButtons(); }
        } else {
            if (soundTestSeSource === source) { soundTestSeSource = null; soundTestSePlayingName = null; updateSoundTestPlayButtons(); }
        }
    };
    source.start(0);
    if (isBgm) { soundTestBgmSource = source; soundTestBgmPlayingName = name; }
    else { soundTestSeSource = source; soundTestSePlayingName = name; }
    updateSoundTestPlayButtons();
}

function closeSoundTest() {
    stopSoundTestPlayback(); // サウンドテストのプレビュー(BGM・SEとも)を止める
    document.getElementById('soundTestOverlay').classList.remove('show');
    playBGM('bgm_title'); // タイトルBGMを再開する(サウンドテストはタイトルからしか開けないため、常にタイトルBGMへ戻せばよい)
}
function closeSoundTestBackdrop(e) { if (e.target.id === 'soundTestOverlay') closeSoundTest(); }

// ------- COSTUME(コスチューム選択) -------
let costumeOpenedFromBonus = false; // COSTUME画面をBONUS CONTENTS経由で開いたかどうか。選択操作等で再描画されても状態を保持する
// 各行のプレビュー画像(player.PNG/player2.PNG)を第7条の呼吸表現(DB.BREATH_MS間隔での交互切り替え)と
// 同じ周期でアニメーションさせるためのタイマー。COSTUME画面を開くたびに張り直し、閉じる時に必ず止める。
let costumeThumbTimer = null;
function costumeThumbSrc(skinName, frame) {
    // skinNameがnull(Val=デフォルト見た目)の場合は本編と同じ既定のキャラ画像フォルダを使う。
    // COSTUME_ASSET_FOLDERに登録されたスキンは、実際の画像フォルダ名(例: 'mifune'→'training')で解決する。
    return skinName ? `assets/images/characters_enemy/${costumeAssetFolder(skinName)}/${frame}` : `assets/images/characters/${frame}`;
}
function startCostumeThumbAnim() {
    stopCostumeThumbAnim();
    let frameIsFirst = true;
    const tick = () => {
        const frame = frameIsFirst ? 'player.PNG' : 'player2.PNG';
        document.querySelectorAll('#costumeRows .costume-thumb').forEach(img => {
            const skinName = img.dataset.skin || null; // data-skin未指定(空文字)はデフォルト見た目
            // 用意されていないセットの場合、既定のプレイヤー画像へフォールバックする(任意アセットの既存パターンに倣う)
            img.onerror = () => { img.onerror = null; img.src = `assets/images/characters/${frame}`; };
            img.src = costumeThumbSrc(skinName, frame);
        });
        frameIsFirst = !frameIsFirst;
    };
    tick(); // 開いた瞬間に1コマ目を反映してから、以後は一定間隔で交互に切り替える
    costumeThumbTimer = setInterval(tick, DB.BREATH_MS);
}
function stopCostumeThumbAnim() {
    if (costumeThumbTimer) { clearInterval(costumeThumbTimer); costumeThumbTimer = null; }
}
function openCostumeSelect(fromBonus) {
    if (fromBonus !== undefined) costumeOpenedFromBonus = fromBonus; // 明示的に指定された時だけ更新し、再描画時(引数省略)は前回の状態を保つ
    const rows = document.getElementById('costumeRows');
    rows.innerHTML = '';
    const defaultRow = document.createElement('div');
    defaultRow.className = 'option-row';
    defaultRow.innerHTML = `<span class="option-label costume-label-group"><img class="costume-thumb" data-skin=""><span>VAL</span></span><button onclick="selectCostume(null)">${selectedSkin === null ? '選択中' : '選ぶ'}</button>`;
    rows.appendChild(defaultRow);
    // 'enemy_N'形式(敵1〜5、STORY MODEクリアで解放)は番号順に並べ、それ以外(GIFT CODE等で解放する追加コスチューム)は
    // EXTRA_COSTUME_LABELSの表示名を使い、末尾にまとめて並べる
    const isEnemySkin = (name) => /^enemy_\d+$/.test(name);
    const sortedEnemySkins = unlockedSkins.filter(isEnemySkin)
        .sort((a, b) => parseInt(a.replace('enemy_', ''), 10) - parseInt(b.replace('enemy_', ''), 10));
    const extraSkins = unlockedSkins.filter(name => !isEnemySkin(name));
    sortedEnemySkins.concat(extraSkins).forEach(skinName => {
        let label;
        if (isEnemySkin(skinName)) {
            const idx = parseInt(skinName.replace('enemy_', ''), 10);
            label = ENEMY_PRESETS['ENEMY_0' + idx] ? ENEMY_PRESETS['ENEMY_0' + idx].name : `敵${idx}`;
        } else {
            label = EXTRA_COSTUME_LABELS[skinName] || skinName;
        }
        const row = document.createElement('div');
        row.className = 'option-row';
        const selectable = canChangeCostume(skinName);
        const btnHtml = selectable
            ? `<button onclick="selectCostume('${skinName}')">${selectedSkin === skinName ? '選択中' : '選ぶ'}</button>`
            : '<button disabled>クリア後</button>'; // ゲームクリア前は一覧に出るだけで選べない
        // 選べない行にだけ、名前の下へ小さく理由を添える(画面下に共通の注記を出すと、MIFUNE等の選べるコスチュームまで
        // ロックされているように読めてしまうため)
        const nameHtml = selectable ? `<span>${label}</span>`
            : `<span class="costume-name-stack"><span>${label}</span><span class="costume-locked-caption">ゲームクリアで使用可能</span></span>`;
        row.innerHTML = `<span class="option-label costume-label-group"><img class="costume-thumb" data-skin="${skinName}">${nameHtml}</span>${btnHtml}`;
        rows.appendChild(row);
    });
    // BONUS CONTENTS経由で開いた場合のみ、OPTIONからもいつでも変更できる旨の注記と「戻る」ボタンを表示する(OPTION自身から開いた時は不要なため)
    // 選べるコスチュームがVal以外に1つも無い間は「OPTIONからいつでも変更できます」の注記は出さない
    const hasSelectableCostume = unlockedSkins.some(n => canChangeCostume(n));
    document.getElementById('costumeFromBonusNote').style.display = (costumeOpenedFromBonus && hasSelectableCostume) ? 'block' : 'none';
    document.getElementById('costumeBackBtn').style.display = costumeOpenedFromBonus ? 'block' : 'none';
    document.getElementById('costumeOverlay').classList.add('show');
    startCostumeThumbAnim();
}
function selectCostume(skinName) {
    if (!canChangeCostume(skinName)) return; // 念のため(ボタン自体も無効化している)
    selectedSkin = skinName;
    writeSaveData({ selectedSkin });
    if (skinName) loadEnemySet(costumeAssetFolder(skinName)); // まだ対戦していない敵のコスチュームを選んだ場合でも、その場でグラフィックセットを読み込む
    openCostumeSelect(); // 選択状態を反映して再描画(fromBonus省略、costumeOpenedFromBonusの現在値がそのまま使われる)
}
// 「戻る」ボタン用: COSTUME単体を閉じ、BONUS本体(または呼び出し元のOPTION)は開いたまま残す
function closeCostume() { stopCostumeThumbAnim(); document.getElementById('costumeOverlay').classList.remove('show'); }
// 右上の×・背景クリック用: BONUS CONTENTS経由で開いた場合はBONUS全体を一括で閉じる(closeAllBonus、SUB STORY/SOUND TESTと同じ一貫した挙動)。
// OPTION経由の場合は、closeAllBonusのBGM切り替え等の副作用(バトル中に呼ばれる可能性があるため)を避け、従来通りCOSTUME単体だけを閉じる。
function closeCostumeX() {
    if (costumeOpenedFromBonus) closeAllBonus();
    else closeCostume();
}
function closeCostumeBackdrop(e) { if (e.target.id === 'costumeOverlay') closeCostumeX(); }

// OPTION内のRETRY: このバトル直前のデッキ編成へ戻る(現在のモードを維持)。確認ポップアップを挟む。
function openRetryConfirm() { document.getElementById('retryConfirmPanel').classList.add('show'); }
function closeRetryConfirm() { document.getElementById('retryConfirmPanel').classList.remove('show'); }
function doOptionRetry() {
    closeRetryConfirm();
    closeOption();
    if (state.gameMode === 'training') {
        goTrainingBattle(); // TRAINING MODEはデッキ編成を経由しないため直接バトルへ
    } else if (state.gameMode === 'substoryBattle') {
        retrySubstoryBattle(); // EXTRA BATTLEも同じ対戦カードのまま、デッキ編成・ストーリーシーンを経由せず直接バトルへ
    } else if (state.gameMode === 'versus') {
        vsRematch(); // ローカル対戦も同じキャラ同士のまま最初から
    } else if (state.gameMode === 'rush') {
        goRushStart(); // BATTLE RUSHは1人目から最初からやり直す
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

// ============================================================
// ローカル対戦(VERSUS)
// ============================================================
// スマホ縦持ちの1画面を上下に分け、下半分=1P(通常の向き)、上半分=2P(180°回転)として向かい合って遊ぶ2人対戦。
// ・キャラ選択: デッキ編成は行わず、ENEMY_PRESETSのキャラ(VAL+本編の5人)から選ぶ。デッキ配分・攻撃力/防御力等の
//   個性はそのキャラのプリセットをそのまま使う(EXTRA BATTLEでプレイヤーが敵キャラを借りる仕組みと同じ)。
// ・バトルの中身(判定・コンボ・しびれ・チャージ・必殺技・ダメージ)は通常のバトル進行(resolveTurn/resolveExchange)を
//   そのまま使う。敵AIの代わりに、2Pが確定させた手(versusState.played2)をstate.enemyHandsとして渡すだけ。
// ・出す枚数はEXTRA BATTLEと同じく毎ターン1〜5のランダム(rollRequiredHandSize)。両者とも同じ枚数を出す。
// ・同じ画面を覗くため、入力は1P→2Pの順番制。自分の番以外は手札・場のカードを裏向きにし、各自のUI部分は
//   「READY」ボタン付きの目隠し(ゲート)で覆う。両者が確定したら、攻防の直前に1枚ずつ公開していく。
// ・描画: 2P側のcanvas(#cvs2)には、メインのcanvasを毎フレーム左右反転してコピーする。上半分全体(#vsTop)をCSSで
//   180°回転させるため、2Pから見ても「自分が左・相手が右」になる。文字(技名・COMBO)だけは鏡文字にならないよう、
//   コピーの後で両canvasに描き足す(vsRenderMirror)。
// ・体力ゲージは画面中央(既存の#gameHeader)を両者で共有する。1PのHPが左・2PのHPが右の点対称配置なので、
//   2Pから見ても自分のHPが左に来る。
// ・下半分(1P)は既存のバトル画面の要素(#gameArea/#ui/#handRow/#slots等)をそのまま使い、上半分(2P)は
//   #vsTop以下の専用要素を使う。
const VERSUS_CHARACTERS = [
    { key: 'VAL', storyIdx: -1, thumbSet: null }, // 主人公(常に選択可)。見た目は既定のプレイヤー画像
    { key: 'ENEMY_01', storyIdx: 0, thumbSet: 'enemy_1' },
    { key: 'ENEMY_02', storyIdx: 1, thumbSet: 'enemy_2' },
    { key: 'ENEMY_03', storyIdx: 2, thumbSet: 'enemy_3' },
    { key: 'ENEMY_04', storyIdx: 3, thumbSet: 'enemy_4' },
    { key: 'ENEMY_05', storyIdx: 4, thumbSet: 'enemy_5' },
    { key: 'MIFUNE', storyIdx: -1, thumbSet: 'training', gift: true }, // GIFT CODEでMIFUNEコスチュームを持っている人だけ
];
// キャラ選択の並び(4列×2段)。右上はMIFUNE(未入手なら枠ごと空欄)、右下は常に？(ランダム)
const VS_SELECT_LAYOUT = ['VAL', 'ENEMY_01', 'ENEMY_02', 'MIFUNE', 'ENEMY_03', 'ENEMY_04', 'ENEMY_05', 'RANDOM'];
const VERSUS_STAGE_COUNT = 5; // 背景・BGMは、STORY MODEでクリア済みのステージ(1〜5)からランダムに選ぶ(再戦時は同じステージのまま)

// ローカル対戦の状態。stateと同様、以後再定義・再初期化せず、プロパティのみ書き換えて使う(第13条に倣う)。
let versusState = {
    // 'idle'(対戦外) | 'select'(キャラ選択) | 'intro'(開始演出中) | 'readyP'/'readyE'(交代待ち、READY待ち) |
    // 'inputP'/'inputE'(各自がカードを選んでいる) | 'resolve'(ターン解決中) | 'over'(決着)
    phase: 'idle',
    selP: 'VAL', selE: 'VAL', // 選択中のキャラ(ENEMY_PRESETSのキー)
    readyP: false, readyE: false, // キャラ選択画面でREADYを押したか
    stageNum: 1, // 使用中のステージ(背景・BGM)番号
    deck2: [], discard2: [], hand2: new Array(5).fill(null), // 2Pの山札/捨札/手札(1Pはstate.playerDeck等をそのまま使う)
    played2: new Array(5).fill(null), // 2Pがこのターン場に出したカード(1Pのstate.handsに相当)
    committedP: [], // このターンに1Pが確定させた手の控え(2P側に表示する相手カード用。決着時にstate.handsが空になっても表示を保つ)
    winsP: 0, winsE: 0, // 同じキャラ選択のまま続けた場合の勝利数(キャラ選択へ戻るとリセット)
    revealToken: 0, // 手札をめくる演出の世代カウンタ(途中で番が変わった場合に打ち切る)
    mirrorCtx: null // #cvs2のcontext(初回使用時に取得)
};

// ------- レイアウト(body.versus-layoutで上下分割のCSSに切り替える) -------
function enterVersusLayout() {
    document.body.classList.add('versus-layout');
}
// タイトルへ戻る経路(goLogo等)から必ず呼ばれる。ローカル対戦中でなければ何もしない安全な処理。
function exitVersusLayout() {
    if (!document.body.classList.contains('versus-layout')) return;
    document.body.classList.remove('versus-layout');
    versusState.phase = 'idle'; vsUpdateHowToBtns();
    versusState.revealToken++;
    vsHideResults();
}

// ------- 描画(2P側の反転canvas) -------
function getVersusMirrorCtx() {
    if (versusState.mirrorCtx) return versusState.mirrorCtx;
    const c2 = document.getElementById('cvs2');
    if (!c2) return null;
    versusState.mirrorCtx = c2.getContext('2d');
    return versusState.mirrorCtx;
}
function isVersusMirrorActive() {
    return state.gameMode === 'versus' && document.body.classList.contains('versus-layout') && !!getVersusMirrorCtx();
}
// draw()の最後に毎フレーム呼ばれる。メインcanvasの内容を#cvs2へ左右反転してコピーし、文字だけは両方へ正しい向きで描く。
function vsRenderMirror(t) {
    const c2 = getVersusMirrorCtx();
    const W = cvs.width, H = cvs.height;
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.clearRect(0, 0, W, H);
    c2.imageSmoothingEnabled = false; // 第10条: ドット絵品質を維持する
    c2.save();
    c2.translate(W, 0);
    c2.scale(-1, 1);
    c2.drawImage(cvs, 0, 0);
    c2.restore();
    // 1P側(メインcanvas): 通常と同じ位置・向き
    drawTechNamePops(ctx, t, 0);
    drawComboCounter('P', 24, 'left', ctx);
    drawComboCounter('E', W - 24, 'right', ctx);
    // 2P側: 位置だけ左右反転(2Pのコンボが左上、1Pのコンボが右上)
    drawTechNamePops(c2, t, W);
    drawComboCounter('E', 24, 'left', c2);
    drawComboCounter('P', W - 24, 'right', c2);
}
// 1Pが選んだキャラのグラフィックセット名('VAL'はnull=既定の見た目)。表示倍率(CHARACTER_SCALE_BY_SET)の判定に使う
function vsPlayerSetName() {
    if (state.pPresetKey === 'MIFUNE') return 'training';
    const m = state.pPresetKey ? state.pPresetKey.match(/^ENEMY_(\d+)$/) : null;
    return m ? 'enemy_' + parseInt(m[1], 10) : null;
}
// プレイヤー側に実際に使われる見た目のセット名(表示倍率の判定用)。キャラを借りるモード(EXTRA BATTLE/VERSUS)では
// 借りているキャラ(playerSpriteNameと同じ判定)、それ以外は選択中のコスチューム
function playerCharacterSetName() {
    if ((state.gameMode === 'substoryBattle' || state.gameMode === 'versus') && state.pPresetKey) return vsPlayerSetName();
    return selectedSkin;
}

// ------- カード表示の共通処理 -------
// 裏向きのカード表示にする(.card/.slotどちらにも使える)。card_back.PNGが無ければCSSの縞模様にフォールバックする
function setCardBackVisual(el) {
    el.classList.add('card-back');
    el.innerText = '';
    el.removeAttribute('data-letter');
    el.style.removeProperty('--card-img');
    el.style.backgroundImage = imgs[CARD_BACK_IMG] ? `url('assets/images/cards/${CARD_BACK_IMG}')` : '';
}
// そのside('P'/'E')の場のカードを、今は伏せて表示すべきかどうか。
// 入力の交代中(ready/input)は、自分の入力番以外は自分の場も伏せる(相手が画面を見ているため)。
function versusSlotsHidden(side) {
    const ph = versusState.phase;
    const own = side === 'P' ? 'inputP' : 'inputE';
    return ['readyP', 'inputP', 'readyE', 'inputE'].includes(ph) && ph !== own;
}
function vsHandHidden(side) {
    return versusState.phase !== (side === 'P' ? 'inputP' : 'inputE');
}
function vsCountFilled(arr) {
    const idx = arr.indexOf(null);
    return idx === -1 ? arr.length : idx;
}

// ------- 2P側の山札・手札 -------
function vsResetBattleSide2() {
    const preset = ENEMY_PRESETS[state.ePresetKey];
    versusState.deck2 = buildDeckArray(preset.deck);
    versusState.discard2 = [];
    versusState.hand2 = new Array(5).fill(null);
    for (let i = 0; i < 5; i++) versusState.hand2[i] = vsDrawCard2();
    versusState.played2 = new Array(5).fill(null);
    versusState.committedP = [];
    versusState.phase = 'intro'; vsUpdateHowToBtns();
    versusState.revealToken++;
    vsHideResults();
    vsRenderHand2();
    vsSetGates();
    vsRenderTop();
}
function vsDrawCard2() {
    if (versusState.deck2.length === 0) return null; // 1Pと同じく自動リシャッフルはしない
    return versusState.deck2.pop();
}
// ターン終了時(resolveTurnのfinally)に呼ばれる: 使ったカードを捨札へ送り、使った枚数分だけ山から補充する
function vsDiscardAndDraw2(total) {
    for (let i = 0; i < total; i++) {
        if (versusState.played2[i]) versusState.discard2.push(versusState.played2[i]);
    }
    for (let i = 0; i < versusState.hand2.length; i++) {
        if (versusState.hand2[i] === null) {
            const c = vsDrawCard2();
            if (c !== null) versusState.hand2[i] = c;
        }
    }
    vsRenderHand2();
    vsRenderTop();
}
// 手札・山が共に尽きた側だけ、捨札を山へリシャッフルする(両者とも毎ターン同じ枚数を出すため、通常は同時に起きる)
async function vsRefreshDecksIfNeeded() {
    const needP = state.playerHand.every(c => c === null) && state.playerDeck.length === 0;
    const needE = versusState.hand2.every(c => c === null) && versusState.deck2.length === 0;
    const tasks = [];
    if (needP) {
        tasks.push(runDeckRefresh().then(() => {
            for (let i = 0; i < state.playerHand.length; i++) {
                if (state.playerHand[i] === null) {
                    const c = drawCard();
                    if (c !== null) state.playerHand[i] = c;
                }
            }
        }));
    }
    if (needE) {
        tasks.push(vsRunDeckRefresh2().then(() => {
            for (let i = 0; i < versusState.hand2.length; i++) {
                if (versusState.hand2[i] === null) {
                    const c = vsDrawCard2();
                    if (c !== null) versusState.hand2[i] = c;
                }
            }
        }));
    }
    if (tasks.length === 0) return;
    await Promise.all(tasks);
    updateDeckCountDisplay();
    updateHandUI();
    vsRenderHand2();
    vsRenderTop();
}
// 2P側のRefresh演出(runDeckRefreshと同じ見た目。効果音は1P側のループ再生と重ならないよう鳴らさない)
async function vsRunDeckRefresh2() {
    const deckEl = document.getElementById('vsDeckInfo2');
    const label = document.getElementById('vsDeckRefreshLabel2');
    label.classList.add('show');
    for (let i = 0; i < 3; i++) {
        deckEl.style.opacity = '0.15';
        await wait(75);
        deckEl.style.opacity = '1';
        await wait(75);
    }
    versusState.deck2 = shuffleArray(versusState.discard2.slice());
    versusState.discard2 = [];
    const target = versusState.deck2.length;
    const steps = 30;
    for (let s = 1; s <= steps; s++) {
        deckEl.innerText = `DECK ${Math.round(target * (s / steps))}/${DB.DECK_TOTAL}`;
        await wait(1250 / steps);
    }
    deckEl.innerText = `DECK ${target}/${DB.DECK_TOTAL}`;
    label.classList.remove('show');
}

// ------- 手札の表示(2P) -------
// updateHandUI(1P用)と同じ円弧配置で、2Pの手札を#vsHandRow2へ描く。2Pの入力番以外は裏向き・タップ不可。
// 手札のカード中心同士の横間隔(px)。LOCAL V.S.は左下にHOW TOボタンを置く分、手札の幅が狭いので少し詰める(2026-10-01)
function handGapX() { return state.gameMode === 'versus' ? 44 : 48; }
function vsRenderHand2() {
    const s = document.getElementById('vsHandRow2');
    if (!s) return;
    s.innerHTML = '';
    const hidden = vsHandHidden('E');
    const hand = versusState.hand2;
    const mid = (hand.length - 1) / 2;
    hand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = 'card ' + (card ? 'filled' : 'empty');
        if (hidden && card) setCardBackVisual(d);
        else applyCardVisual(d, card);
        const offset = idx - mid;
        d.style.top = (offset * offset * 4) + 'px';
        d.style.transform = `translateX(calc(-50% + ${offset * handGapX()}px)) rotate(${offset * 9}deg)`;
        if (card && !hidden) d.onclick = () => vsPlayCard2(idx);
        s.appendChild(d);
    });
}
// READYを押した直後、裏向きの手札を左から順にめくって見せる(dealInitialHandAnimationのめくり部分と同じ見た目)
async function vsFlipRevealHand(side) {
    const token = ++versusState.revealToken;
    const row = document.getElementById(side === 'P' ? 'handRow' : 'vsHandRow2');
    const hand = side === 'P' ? state.playerHand : versusState.hand2;
    const els = Array.from(row.children);
    for (let idx = 0; idx < els.length; idx++) {
        if (token !== versusState.revealToken) return; // 途中で番が変わった(GO!を押した等)場合は打ち切る
        const d = els[idx];
        const card = hand[idx];
        if (!card) continue;
        const base = d.style.transform;
        d.style.transition = 'transform 0.07s ease-in';
        d.style.transform = base + ' scaleX(0)';
        await rawWait(70);
        if (token !== versusState.revealToken) return;
        d.classList.remove('card-back');
        applyCardVisual(d, card);
        d.onclick = side === 'P' ? () => playCard(idx) : () => vsPlayCard2(idx);
        d.style.transition = 'transform 0.07s ease-out';
        d.style.transform = base;
        await rawWait(50);
    }
}

// ------- 2Pのカード操作 -------
function vsPlayCard2(handIdx) {
    if (versusState.phase !== 'inputE' || state.resolving) return;
    const card = versusState.hand2[handIdx];
    if (!card) return;
    if (state.requiredHandSize && vsCountFilled(versusState.played2) >= state.requiredHandSize) return;
    const slotIdx = versusState.played2.indexOf(null);
    if (slotIdx === -1) return;
    versusState.played2[slotIdx] = card;
    versusState.hand2[handIdx] = null;
    playSE('se_deck_plus');
    vsRenderHand2();
    vsRenderTop();
}
function vsResetHands2() {
    if (versusState.phase !== 'inputE' || state.resolving) return;
    playSE('se_cancel');
    versusState.played2.forEach(card => {
        if (!card) return;
        const emptyIdx = versusState.hand2.indexOf(null);
        if (emptyIdx !== -1) versusState.hand2[emptyIdx] = card;
    });
    versusState.played2 = new Array(5).fill(null);
    vsRenderHand2();
    vsRenderTop();
}

// ------- 交代の流れ -------
// ターン開始(バトル開始演出の直後、または前のターンの解決が終わった直後): 1PのREADY待ちから始める
function vsBeginTurnInput() {
    versusState.played2 = new Array(5).fill(null);
    versusState.committedP = [];
    versusState.phase = 'readyP';
    versusState.revealToken++;
    updateHandUI();
    vsRenderHand2();
    updateUI();
    vsSetGates();
}
// ゲートのREADYボタン: 自分の手札をめくって入力を始める
function vsOnReady(side) {
    if (side === 'P' && versusState.phase !== 'readyP') return;
    if (side === 'E' && versusState.phase !== 'readyE') return;
    playSE('se_select');
    versusState.phase = side === 'P' ? 'inputP' : 'inputE';
    vsSetGates();
    updateUI(); // 自分の場の伏せ表示を解除する(updateUI内でvsRenderTopも呼ばれる)
    // いったん裏向きのまま描いてから、左から順にめくる
    if (side === 'P') {
        versusState.phase = 'readyP'; updateHandUI(); versusState.phase = 'inputP';
    } else {
        versusState.phase = 'readyE'; vsRenderHand2(); versusState.phase = 'inputE';
    }
    updateActionButtons();
    vsFlipRevealHand(side);
}
// 1PのGO!(resolveTurnから呼ばれる): 1Pの手を確定して2Pへ交代する
function vsSubmitP() {
    if (state.requiredHandSize && filledCount() !== state.requiredHandSize) return;
    playSE('se_select');
    versusState.phase = 'readyE';
    versusState.revealToken++;
    updateHandUI();
    updateUI();
    vsRenderHand2();
    vsSetGates();
}
// 2PのGO!: 2Pの手を確定し、通常のターン解決(resolveTurn)へ進む
function vsGo2() {
    if (versusState.phase !== 'inputE' || state.resolving) return;
    const count = vsCountFilled(versusState.played2);
    if (count === 0 || (state.requiredHandSize && count !== state.requiredHandSize)) return;
    versusState.phase = 'resolve';
    versusState.committedP = state.hands.slice(0, count);
    versusState.revealToken++;
    vsSetGates();
    updateHandUI();
    vsRenderHand2();
    updateUI();
    resolveTurn();
}

// ------- ゲート(各自のUI部分を覆う目隠し・交代案内) -------
function vsSetGates() {
    const ph = versusState.phase;
    const n = state.requiredHandSize;
    const cardsText = n ? `PLAY ${n} CARD${n === 1 ? '' : 'S'}` : '';
    ['P', 'E'].forEach(side => {
        const gate = document.getElementById(side === 'P' ? 'vsGate1' : 'vsGate2');
        if (!gate) return;
        const me = side === 'P' ? '1P' : '2P';
        const other = side === 'P' ? '2P' : '1P';
        const myReady = side === 'P' ? 'readyP' : 'readyE';
        const otherTurn = side === 'P' ? ['readyE', 'inputE'] : ['readyP', 'inputP'];
        gate.className = 'vs-gate vs-gate-' + side;
        if (ph === myReady) {
            gate.classList.add('show');
            gate.innerHTML = `<div class="vs-gate-title">${me} TURN</div>` +
                `<div class="vs-gate-sub">${cardsText}</div>` +
                `<button class="vs-ready-btn" onclick="vsOnReady('${side}')">READY</button>`;
        } else if (otherTurn.includes(ph)) {
            gate.classList.add('show', 'waiting');
            gate.innerHTML = `<div class="vs-gate-title">${other} IS CHOOSING...</div>` +
                `<div class="vs-gate-sub">DON'T PEEK!</div>`;
        } else {
            gate.innerHTML = '';
        }
    });
    vsUpdateHowToBtns();
}

// ------- 上半分(2P側)の場・相手カード・ボタン等の同期 -------
function vsRenderTop(activeIndex) {
    const slots2 = document.getElementById('vsSlots2');
    if (!slots2) return;
    const n = state.requiredHandSize;

    const label = document.getElementById('vsRequiredLabel2');
    label.innerText = n ? `PLAY ${n} CARD${n === 1 ? '' : 'S'} THIS TURN` : '';

    // 2P自身の場(1Pの#slotsに相当)
    const hideE = versusSlotsHidden('E');
    slots2.innerHTML = '';
    versusState.played2.forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot ' + (h ? 'filled' : 'empty');
        if (idx === activeIndex) cls += ' active-card';
        if (n && idx >= n) cls += ' slot-locked';
        if (cardOutcomes.E[idx]) cls += ' ' + cardOutcomes.E[idx];
        d.className = cls;
        if (h && hideE) setCardBackVisual(d);
        else applyCardVisual(d, h);
        slots2.appendChild(d);
    });

    // 2Pから見た相手(1P)のカード(1Pの#enemySlotsに相当)。ターン解決中のみ、攻防の直前に1枚ずつ公開する
    const enemy2 = document.getElementById('vsEnemySlots2');
    enemy2.innerHTML = '';
    const total = state.enemyHands.length;
    versusState.committedP.slice(0, total).forEach((h, idx) => {
        const d = document.createElement('div');
        let cls = 'slot filled';
        if (idx === activeIndex) cls += ' active-card';
        if (cardOutcomes.P[idx]) cls += ' ' + cardOutcomes.P[idx];
        d.className = cls;
        if (idx < state.enemyRevealedUpTo) {
            applyCardVisual(d, h);
        } else {
            d.style.backgroundImage = 'none';
            d.innerText = '?';
        }
        enemy2.appendChild(d);
    });

    const count = vsCountFilled(versusState.played2);
    const canInput = versusState.phase === 'inputE' && state.battleReady && !state.resolving;
    document.getElementById('vsGoBtn2').disabled = !(canInput && (n ? count === n : count > 0));
    document.getElementById('vsClrBtn2').disabled = !(canInput && count > 0);

    document.getElementById('vsDeckInfo2').innerText = `DECK ${versusState.deck2.length}/${DB.DECK_TOTAL}`;
    document.getElementById('vsTurn2').innerHTML = `TURN<br>${state.turn}`;
}
// markCardOutcomeから呼ばれる: 1P側で付けた勝敗表現(暗転・ヒビ割れ)を、上半分の同じカードにも付ける
function vsMirrorCardOutcome(side, idx, outcomeClass) {
    const container = document.getElementById(side === 'E' ? 'vsSlots2' : 'vsEnemySlots2');
    if (!container) return;
    const el = container.children[idx];
    if (!el) return;
    el.classList.remove('card-lose', 'card-shatter', 'card-shatter-flash');
    if (outcomeClass) {
        el.classList.add(outcomeClass);
        if (outcomeClass === 'card-shatter') el.classList.add('card-shatter-flash');
    }
}
// HPバーの名前表示。下(1P向き)の名前はHPバーの下、上(2P向き)の名前はHPバーの上に逆さで表示する
function vsUpdateNames() {
    const nameP = ENEMY_PRESETS[state.pPresetKey].name; // 表記統一のため大文字化しない
    const nameE = ENEMY_PRESETS[state.ePresetKey].name;
    document.getElementById('playerName').innerText = '1P ' + nameP;
    document.getElementById('enemyName').innerText = '2P ' + nameE;
    document.getElementById('vsNameRotP').innerText = '1P ' + nameP;
    document.getElementById('vsNameRotE').innerText = '2P ' + nameE;
}

// ------- 決着 -------
// showResultから呼ばれる。勝った側の半分にYOU WIN、負けた側の半分にYOU LOSEを出す(同時にHPが0ならDRAW)
function vsShowResult() {
    versusState.phase = 'over';
    const winner = (state.hpP <= 0 && state.hpE <= 0) ? null : (state.hpE <= 0 ? 'P' : 'E');
    if (winner === 'P') versusState.winsP++;
    else if (winner === 'E') versusState.winsE++;
    const textFor = side => winner === null ? 'DRAW' : (winner === side ? 'YOU WIN' : 'YOU LOSE');
    [['P', 'vsResult1'], ['E', 'vsResult2']].forEach(([side, id]) => {
        const el = document.getElementById(id);
        const mine = side === 'P' ? versusState.winsP : versusState.winsE;
        const theirs = side === 'P' ? versusState.winsE : versusState.winsP;
        const me = side === 'P' ? '1P' : '2P', other = side === 'P' ? '2P' : '1P';
        el.className = 'vs-result show ' + (winner === null ? 'draw' : (winner === side ? 'win' : 'lose'));
        el.innerHTML = `<div class="vs-result-text">${textFor(side)}</div>` +
            `<div class="vs-result-score">${me} ${mine} - ${theirs} ${other}</div>`;
    });
    // 操作ボタンは各自の手元(ゲートの位置)に出す。タイトルへ戻るのは1P側のみ
    ['P', 'E'].forEach(side => {
        const gate = document.getElementById(side === 'P' ? 'vsGate1' : 'vsGate2');
        gate.className = 'vs-gate vs-gate-' + side + ' show result';
        gate.innerHTML = `<div class="vs-result-btns">` +
            `<button class="vs-ready-btn" onclick="vsRematch()">REMATCH</button>` +
            `<button class="vs-sub-btn" onclick="vsBackToSelect()">CHARACTER</button>` +
            (side === 'P' ? `<button class="vs-sub-btn" onclick="vsExitToTitle()">TITLE</button>` : '') +
            `</div>`;
    });
    playSE('se_win');
    playBGM('bgm_victory');
}
function vsHideResults() {
    ['vsResult1', 'vsResult2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.className = 'vs-result'; el.innerHTML = ''; }
    });
}

// ------- 開始・再戦・終了 -------
async function vsStartBattle() {
    state.pendingMode = 'versus'; // resetBattleStateはこの値からgameModeを決定する
    state.pPresetKey = versusState.selP;
    state.ePresetKey = versusState.selE;
    state.substoryStageNum = versusState.stageNum; // 背景の指定はEXTRA BATTLEと同じ仕組みを使う
    state.substoryMusicNum = versusState.stageNum;
    const pSet = vsPlayerSetName();
    await ensureReadyWithLoading(Promise.all([
        loadEnemySet(currentEnemySetName()),
        pSet ? loadEnemySet(pSet) : Promise.resolve(),
        loadStageBackground(versusState.stageNum === 1 ? 'bg.PNG' : `bg_${versusState.stageNum}.PNG`),
        preloadBgm('bgm_battle_' + versusState.stageNum, 'bgm_battle')
    ]));
    enterVersusLayout();
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle_' + versusState.stageNum, 'bgm_battle');
}
// 同じキャラ・同じステージのまま、もう一度最初から(決着画面のREMATCH、OPTIONのRETRY)
function vsRematch() {
    playSE('se_select');
    vsHideResults();
    vsStartBattle();
}
function vsBackToSelect() {
    playSE('se_select');
    vsHideResults();
    goVersusSelect();
}
function vsExitToTitle() {
    playSE('se_select');
    exitVersusLayout();
    endSubstoryBattle(); // pPresetKey等を通常の状態へ戻す(STORY MODEへの持ち越しを防ぐ)
    goTitle();
}

// ------- キャラ選択画面 -------
function goVersusSelect() {
    enterVersusLayout();
    versusState.phase = 'select';
    versusState.readyP = false;
    versusState.readyE = false;
    versusState.winsP = 0;
    versusState.winsE = 0;
    // 本編の敵を選べる状態なら、選択肢のグラフィックを先に読み込んでおく(サムネイル自体は<img>で直接読む)
    VERSUS_CHARACTERS.forEach(ch => { if (ch.thumbSet && vsCharUnlocked(ch)) loadEnemySet(ch.thumbSet); });
    if (!vsCharUnlocked(vsCharByKey(versusState.selP))) versusState.selP = 'VAL';
    if (!vsCharByKey(versusState.selE) || !vsCharUnlocked(vsCharByKey(versusState.selE))) versusState.selE = 'VAL';
    document.getElementById('vsSelFight').classList.remove('show');
    vsRenderSelect();
    showScene('versusSelect');
    playBGM('bgm_deck');
}
function vsCharByKey(key) { return VERSUS_CHARACTERS.find(c => c.key === key); }
// 本編で出会う前の敵はネタバレ防止のため選べない(EXTRA BATTLEの？？？表示と同じ考え方)。
// STORY MODEで撃破済み、またはSTORY MODEを一度クリアしていれば選べる。VALは常に選べる。
function vsCharUnlocked(ch) {
    if (!ch) return false;
    if (ch.gift) return unlockedSkins.includes('mifune');
    if (ch.storyIdx < 0) return true;
    return gameClearedOnce || isEnemyDefeated(ch.storyIdx);
}
function vsThumbSrc(ch) {
    return ch.thumbSet ? `assets/images/characters_enemy/${ch.thumbSet}/player.PNG` : 'assets/images/characters/player.PNG';
}
function vsRenderSelect() {
    ['P', 'E'].forEach(side => {
        const grid = document.getElementById(side === 'P' ? 'vsSelGridP' : 'vsSelGridE');
        const selKey = side === 'P' ? versusState.selP : versusState.selE;
        const ready = side === 'P' ? versusState.readyP : versusState.readyE;
        grid.innerHTML = '';
        const rolling = versusState.rolling && versusState.rolling[side];
        VS_SELECT_LAYOUT.forEach(key => {
            if (key === 'RANDOM') {
                // ？(ランダム): タップするとルーレットのように選択枠が動き回り、どれか1人で止まって選択される
                const tile = document.createElement('div');
                tile.className = 'vs-sel-tile vs-sel-random' + (rolling ? ' rolling' : '');
                tile.innerHTML = '<div class="vs-sel-random-mark">?</div><div class="vs-sel-tile-name">RANDOM</div>';
                tile.onclick = () => vsRandomSelect(side);
                grid.appendChild(tile);
                return;
            }
            const ch = vsCharByKey(key);
            if (ch.gift && !vsCharUnlocked(ch)) {
                // GIFT CODE限定キャラを持っていない場合は、枠を置かず空欄にする
                const empty = document.createElement('div');
                empty.className = 'vs-sel-empty';
                grid.appendChild(empty);
                return;
            }
            const unlocked = vsCharUnlocked(ch);
            const tile = document.createElement('div');
            tile.dataset.key = ch.key;
            tile.className = 'vs-sel-tile' + (unlocked ? '' : ' locked') + (ch.key === selKey ? ' selected' : '');
            const name = unlocked ? ENEMY_PRESETS[ch.key].name : '???';
            tile.innerHTML = `<img class="vs-sel-thumb" src="${vsThumbSrc(ch)}" alt="" onerror="this.onerror=null; this.src='assets/images/characters/player.PNG';"><div class="vs-sel-tile-name">${name}</div>`;
            if (unlocked) tile.onclick = () => vsSelectChar(side, ch.key);
            grid.appendChild(tile);
        });
        const preset = ENEMY_PRESETS[selKey];
        document.getElementById(side === 'P' ? 'vsSelNameP' : 'vsSelNameE').innerText = preset.name; // 表記統一のため大文字化しない
        document.getElementById(side === 'P' ? 'vsSelDeckP' : 'vsSelDeckE').innerText =
            `DECK  P${preset.deck.PUNCH} / U${preset.deck.UPPER} / G${preset.deck.GUARD}`;
        const btn = document.getElementById(side === 'P' ? 'vsSelReadyP' : 'vsSelReadyE');
        btn.innerText = ready ? 'CANCEL' : 'READY';
        btn.classList.toggle('is-ready', ready);
        document.getElementById(side === 'P' ? 'vsSelHalfP' : 'vsSelHalfE').classList.toggle('ready', ready);
    });
}
function vsSelectChar(side, key) {
    if (versusState.phase !== 'select') return;
    if (versusState.rolling && versusState.rolling[side]) return; // ルーレット中は操作不可
    if (side === 'P' ? versusState.readyP : versusState.readyE) return; // READY中は変更不可(CANCELで解除してから)
    if (side === 'P') versusState.selP = key; else versusState.selE = key;
    playSE('se_deck_plus');
    vsRenderSelect();
}
// ？(ランダム)をタップした時: 選べるキャラの間を選択枠がランダムに飛び回り、だんだん遅くなって1人で止まる
async function vsRandomSelect(side) {
    if (versusState.phase !== 'select') return;
    if (side === 'P' ? versusState.readyP : versusState.readyE) return; // READY中は変更不可
    if (!versusState.rolling) versusState.rolling = { P: false, E: false };
    if (versusState.rolling[side]) return;
    const pool = VERSUS_CHARACTERS.filter(ch => vsCharUnlocked(ch)).map(ch => ch.key);
    if (pool.length === 0) return;
    versusState.rolling[side] = true;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const steps = 14 + Math.floor(Math.random() * 4);
    let prev = side === 'P' ? versusState.selP : versusState.selE;
    for (let k = 0; k < steps; k++) {
        if (versusState.phase !== 'select') { versusState.rolling[side] = false; return; }
        let key;
        if (k === steps - 1) key = target;
        else {
            const others = pool.filter(x => x !== prev);
            key = (others.length ? others : pool)[Math.floor(Math.random() * (others.length || pool.length))];
        }
        prev = key;
        if (side === 'P') versusState.selP = key; else versusState.selE = key;
        playSE('se_deck_plus');
        vsRenderSelect();
        await rawWait(60 + k * k * 1.6); // だんだん遅くなる
    }
    versusState.rolling[side] = false;
    playSE('se_select');
    vsRenderSelect();
    const grid = document.getElementById(side === 'P' ? 'vsSelGridP' : 'vsSelGridE');
    const chosen = grid.querySelector(`.vs-sel-tile[data-key="${target}"]`);
    if (chosen) { chosen.classList.remove('decided'); void chosen.offsetWidth; chosen.classList.add('decided'); } // 決まった瞬間に一度光らせる
}
function vsToggleSelectReady(side) {
    if (versusState.phase !== 'select') return;
    if (versusState.rolling && versusState.rolling[side]) return; // ルーレット中はREADYにできない
    if (side === 'P') versusState.readyP = !versusState.readyP; else versusState.readyE = !versusState.readyE;
    playSE(side === 'P' ? (versusState.readyP ? 'se_select' : 'se_cancel') : (versusState.readyE ? 'se_select' : 'se_cancel'));
    vsRenderSelect();
    if (versusState.readyP && versusState.readyE) vsStartFromSelect();
}
async function vsStartFromSelect() {
    versusState.phase = 'starting';
    const stages = vsAvailableStages();
    versusState.stageNum = stages[Math.floor(Math.random() * stages.length)];
    document.getElementById('vsSelFight').classList.add('show');
    playSE('se_go');
    await rawWait(900);
    document.getElementById('vsSelFight').classList.remove('show');
    vsStartBattle();
}
// 出現させるステージ番号の一覧。STORY MODEで撃破済みの敵のステージ(enemyIndex+1)のみ。クリア済み(gameClearedOnce)なら全ステージ。
// 1人も撃破していない場合は、1ST STAGE(bg.PNG)のみにする。
function vsAvailableStages() {
    const list = [];
    for (let n = 1; n <= VERSUS_STAGE_COUNT; n++) {
        if (gameClearedOnce || isEnemyDefeated(n - 1)) list.push(n);
    }
    return list.length > 0 ? list : [1];
}
function vsSelectBackToTitle() {
    if (versusState.phase !== 'select') return;
    vsExitToTitle();
}

// ============================================================
// BATTLE RUSH(100人組手、2026-09-28追加)
// ============================================================
// ・専用GIFT CODEで解放(タイトルのLOCAL V.S.の下にボタンが出現)。デッキ編成なし、VALの固定デッキ(7/7/7)・通常のプレイヤー能力。
// ・自分のHPは戦闘間で引き継ぐ(雑魚撃破でHP5、中ボス撃破でHP30回復。上限100)。HP0で終了。100人撃破までのタイムを競う。2倍速は使えない。
// ・5人目・10人目…(5の倍数)が中ボスで、既存5人(Noah→Rita→Gald→Jack→Alv)を順番に4周する(計20人。100人目は4周目のAlv)。
//   それ以外は雑魚(TRAINING MODEのMIFUNEの見た目、完全ランダムに手を出す)。
// ・背景とBGMは「次に控える中ボスのステージ」。中ボスを倒した瞬間に次の中ボスのステージへ切り替わる。
// ・攻撃力は基本値(パンチ10/アッパー7)に対する割合で、その敵の技全体(コンボ・メテオ・必殺技等)の威力を縮める。
//   アッパー初撃とメテオをアッパー系、それ以外(パンチ・空中の連打・追撃・必殺技等)をパンチ系として扱う。
//   相討ち等の固定の微ダメージ(CLASH/TINY/WALL_IMPACT)は、通常時と同じく倍率の対象外。
//   ・雑魚: パンチ1/アッパー1から、中ボスを倒すたびに両方+1(パンチ10/アッパー7で頭打ち)。HPは雑魚の通し番号(1,2,3…、50で頭打ち)。
//   ・中ボス(k人目): パンチ2+floor(k/2)、アッパー1+floor((k-1)/2)。そのキャラ固有の攻撃力(基本値×atkMult)で頭打ち。
//     HPは20+5(k-1)(100で頭打ち)。防御力・その他の個性はそのキャラ固有のまま。
// ・敵を倒したらそのターンの残りのカードは破棄し、敵は点滅して消える→次の敵が登場してから次のターンへ。
//   雑魚は右からdashで登場。中ボスはステージ固有の登場演出(得意技ポーズは無し)。
const RUSH_TOTAL = 25; // 2026-09-30、100→25(中ボス5人=Noah〜Alvが1回ずつ出て、最後がAlvになる)
const RUSH_BOSS_EVERY = 5;
const RUSH_BOSS_HEAL = 30; // 中ボス撃破時の回復量(2026-09-28、20→30)
const RUSH_MOB_HEAL = 5;   // 雑魚撃破時の回復量(2026-09-28追加)
const RUSH_PLAYER_DECK = { PUNCH: 7, UPPER: 7, GUARD: 7 };
// 雑魚用のプリセット(完全ランダム: 重みを均等にし、行動パターン・個性は持たせない)
const RUSH_MOB_NAME = 'DOLL'; // 雑魚の専用グラフィックの名前(2026-09-30決定)。専用グラフィックが未配置の間は見た目に合わせてMIFUNE表記
const RUSH_MOB_PRESET = {
    get name() { return (rushMobSetName() === RUSH_MOB_SET && RUSH_MOB_NAME) ? RUSH_MOB_NAME : 'MIFUNE'; },
    deck: { PUNCH: 1, UPPER: 1, GUARD: 1 },
};

let rushState = {
    enemyNo: 1,      // 今戦っている敵の通し番号(1〜100)
    kills: 0,        // 撃破数
    maxCombo: 0,     // 最大COMBO(プレイヤー側)
    startAt: 0,      // タイマー開始時刻(performance.now)。0なら未開始
    endAt: 0,        // タイマー停止時刻。0なら計測中
    timerId: null,   // HUD更新用のsetInterval
    token: 0,        // 途中でタイトルへ戻る/RETRYした時に、進行中の演出を打ち切るための世代番号
    pausedTotal: 0,  // OPTION/HOW TOを開いていて止めていた時間の合計(ms)。経過タイムから差し引く
    pausedAt: 0,     // 現在止めている場合、止め始めた時刻。0なら計測中
    pauseReasons: new Set(), // 止めている理由('option'/'howto')。両方開いている場合も、すべて閉じるまで再開しない
};

function rushIsBoss(no) { return no % RUSH_BOSS_EVERY === 0; }
function rushBossOrdinal(no) { return Math.floor(no / RUSH_BOSS_EVERY); } // 中ボスの場合、何人目の中ボスか(1〜20)
function rushBossesDefeatedBefore(no) { return Math.floor((no - 1) / RUSH_BOSS_EVERY); } // この敵より前に倒した中ボスの数
function rushMobOrdinal(no) { return no - Math.floor(no / RUSH_BOSS_EVERY); } // 雑魚の場合、何人目の雑魚か
function rushBossKey(no) { return ENEMY_ORDER[(rushBossOrdinal(no) - 1) % ENEMY_ORDER.length]; }
// 背景・BGMのステージ番号(1〜5): 次に控える中ボスのステージ
function rushStageNum(no = rushState.enemyNo) { return (rushBossesDefeatedBefore(no) % ENEMY_ORDER.length) + 1; }

function rushCurrentPreset() {
    return rushIsBoss(rushState.enemyNo) ? ENEMY_PRESETS[rushBossKey(rushState.enemyNo)] : RUSH_MOB_PRESET;
}
// 雑魚の専用グラフィック(assets/images/characters_enemy/rush/、2026-09-30追加)。未配置ならTRAINING MODEのMIFUNE(training)で代用する
const RUSH_MOB_SET = 'rush';
function rushMobSetName() { return imgs[RUSH_MOB_SET + '_player.PNG'] ? RUSH_MOB_SET : 'training'; }
function rushCurrentEnemySetName() {
    return rushIsBoss(rushState.enemyNo) ? 'enemy_' + (ENEMY_ORDER.indexOf(rushBossKey(rushState.enemyNo)) + 1) : rushMobSetName();
}
function rushEnemyMaxHp(no = rushState.enemyNo) {
    if (rushIsBoss(no)) return Math.min(100, 20 + 5 * (rushBossOrdinal(no) - 1));
    return Math.min(50, rushMobOrdinal(no));
}
// 現在の敵の攻撃力 { P: パンチ系, U: アッパー系 }(基本値はパンチ10/アッパー7)
function rushEnemyAtk(no = rushState.enemyNo) {
    if (rushIsBoss(no)) {
        const k = rushBossOrdinal(no);
        const preset = ENEMY_PRESETS[rushBossKey(no)];
        const byMove = preset.atkMultByMove || {};
        const base = preset.atkMult || 1;
        const capP = DB.DMG.P * (byMove.PUNCH !== undefined ? byMove.PUNCH : base);
        const capU = DB.DMG.U * (byMove.UPPER !== undefined ? byMove.UPPER : base);
        return { P: Math.min(capP, 2 + Math.floor(k / 2)), U: Math.min(capU, 1 + Math.floor((k - 1) / 2)) };
    }
    const b = rushBossesDefeatedBefore(no);
    return { P: Math.min(DB.DMG.P, 1 + b), U: Math.min(DB.DMG.U, 1 + b) };
}
// atkMultOfから呼ばれる。基本値に対する割合を倍率として返す
function rushAtkRatio(move) {
    const atk = rushEnemyAtk();
    if (move === 'UPPER' || move === 'METEOR') return atk.U / DB.DMG.U;
    return atk.P / DB.DMG.P;
}

// ------- タイマー・HUD(TURN表示の位置に撃破数/経過タイム) -------
function rushElapsedMs() {
    if (!rushState.startAt) return 0;
    const now = rushState.endAt || performance.now();
    const pausingNow = rushState.pausedAt ? (now - rushState.pausedAt) : 0;
    return now - rushState.startAt - rushState.pausedTotal - pausingNow;
}
// OPTION/HOW TOを開いた時にタイマーを一時停止する(計測中のRUSHでなければ何もしない)
function rushPauseTimer(reason) {
    if (state.gameMode !== 'rush' || !rushState.startAt || rushState.endAt) return;
    rushState.pauseReasons.add(reason);
    if (!rushState.pausedAt) rushState.pausedAt = performance.now();
    rushUpdateHud();
}
function rushResumeTimer(reason) {
    rushState.pauseReasons.delete(reason);
    if (rushState.pauseReasons.size > 0 || !rushState.pausedAt) return;
    rushState.pausedTotal += performance.now() - rushState.pausedAt;
    rushState.pausedAt = 0;
    rushUpdateHud();
}
function formatRushTime(ms) {
    const totalTenths = Math.floor(ms / 100);
    const m = Math.floor(totalTenths / 600);
    const sec = Math.floor(totalTenths / 10) % 60;
    const t = totalTenths % 10;
    return `${m}:${String(sec).padStart(2, '0')}.${t}`;
}
function rushUpdateHud() {
    if (state.gameMode !== 'rush') return;
    const el = document.getElementById('turnDisplay');
    if (!el) return;
    el.innerHTML = `<span class="rush-hud-label">KILLS</span><br>${rushState.kills}<br><span class="rush-hud-time">${formatRushTime(rushElapsedMs())}</span>`;
}
function rushStartTimer() {
    if (rushState.startAt) return; // 既に計測中(念のため二重開始しない)
    rushState.startAt = performance.now();
    rushState.endAt = 0;
    if (rushState.timerId) clearInterval(rushState.timerId);
    rushState.timerId = setInterval(rushUpdateHud, 100);
    // 開始演出中にOPTION/HOW TOを開いたままだった場合は、止めた状態から始める
    if (document.getElementById('optionOverlay').classList.contains('show')) rushPauseTimer('option');
    if (document.getElementById('howToOverlay').classList.contains('show')) rushPauseTimer('howto');
    rushUpdateHud();
}
function rushStopTimer() {
    if (rushState.startAt && !rushState.endAt) {
        const now = performance.now();
        if (rushState.pausedAt) { rushState.pausedTotal += now - rushState.pausedAt; rushState.pausedAt = 0; }
        rushState.pauseReasons.clear();
        rushState.endAt = now;
    }
    if (rushState.timerId) { clearInterval(rushState.timerId); rushState.timerId = null; }
    rushUpdateHud();
}
// タイトルへ戻る時などの後始末(RUSH中でなければ何もしない安全な処理)
function endRush() {
    rushState.token++;
    if (rushState.timerId) { clearInterval(rushState.timerId); rushState.timerId = null; }
    if (state.gameMode === 'rush') state.pendingMode = 'story';
}

// 次のステージ(中ボス)の素材を裏で先読みしておく(awaitしない。中ボス交代時のローディング表示をなるべく出さないため)
function rushPrefetchStage(stageNum) {
    loadEnemySet('enemy_' + stageNum);
    loadStageBackground(stageNum === 1 ? 'bg.PNG' : `bg_${stageNum}.PNG`);
    preloadBgm('bgm_battle_' + stageNum, 'bgm_battle');
}
function rushStageAssetsPromise(stageNum) {
    return Promise.all([
        loadEnemySet('enemy_' + stageNum),
        loadStageBackground(stageNum === 1 ? 'bg.PNG' : `bg_${stageNum}.PNG`),
        preloadBgm('bgm_battle_' + stageNum, 'bgm_battle'),
    ]);
}

// タイトルの「BATTLE RUSH」ボタン、RESULT/OPTIONのRETRYから呼ばれる。1人目から始める
async function goRushStart() {
    endRush(); // 前回分のタイマー・演出を確実に止める
    endSubstoryBattle(); // EXTRA BATTLE等の借りキャラ状態が残らないようにする(該当しなければ何もしない)
    state.pPresetKey = null;
    state.ePresetKey = null;
    rushState.enemyNo = 1;
    rushState.kills = 0;
    rushState.maxCombo = 0;
    rushState.startAt = 0;
    rushState.endAt = 0;
    rushState.pausedTotal = 0;
    rushState.pausedAt = 0;
    rushState.pauseReasons.clear();
    state.pendingMode = 'rush';
    state.gameMode = 'rush'; // 素材の読み込み判定(currentBgName等)をRUSH基準にするため、ここで先に確定させる
    hideResult();
    await ensureReadyWithLoading(Promise.all([
        loadEnemySet(RUSH_MOB_SET), // 雑魚の専用グラフィック(未配置なら次のtrainingで代用)
        loadEnemySet('training'),
        rushStageAssetsPromise(1),
    ]));
    rushPrefetchStage(2);
    resetBattleState();
    showScene('battle');
    playBattleIntro();
    playBGM('bgm_battle_1', 'bgm_battle');
}

// 敵のHPが0になった時(resolveTurnから呼ばれる)。敵は点滅して消える。100人目ならtrueを返す
async function rushOnEnemyDefeated() {
    const tk = rushState.token;
    const wasBoss = rushIsBoss(rushState.enemyNo);
    rushState.kills++;
    if (rushState.kills >= RUSH_TOTAL) rushStopTimer(); // 100人目を倒した瞬間でタイムを止める
    rushUpdateHud();
    state.eNumbed = false;
    if (state.piyoSide === 'E') stopPiyo();
    if (!state.finisherAlreadyDown) setAct('E', 'down.PNG');
    setY('E', DB.POS.GROUND_Y);
    playSE('se_kabe');
    triggerBlink('E', 700);
    await wait(700);
    if (tk !== rushState.token) return false;
    state.introEnemyAlpha = 0; // 点滅の後、消える
    state.eBlinkUntil = 0;
    trails = trails.filter(tr => tr.side !== 'E'); // 消えた敵の残像も残さない
    rushHealPlayer(wasBoss ? RUSH_BOSS_HEAL : RUSH_MOB_HEAL);
    if (rushState.kills >= RUSH_TOTAL) return true;
    await wait(250);
    return false;
}
function rushHealPlayer(amount) {
    if (state.hpP >= 100) return; // 満タンなら何もしない(表示も出さない)
    state.hpP = Math.min(100, state.hpP + amount);
    document.getElementById('hpP').style.width = state.hpP + '%';
    document.getElementById('hpP_y').style.width = state.hpP + '%';
    playSE('se_refresh');
    spawnTechNamePop('P', `HP +${amount}`);
}

// 敵の個別状態(チャージ・しびれ・COMBO等)を、新しい敵のために初期化する(プレイヤー側の状態は引き継ぐ)
function rushResetEnemySide() {
    state.eAct = 'IDLE';
    state.eShakeUntil = 0; state.eBlinkUntil = 0;
    state.eLastAtk = null;
    state.eNumbed = false;
    if (state.piyoSide === 'E') stopPiyo();
    state.ePunchStreak = 0; state.ePunchChain = 0; state.eGuardStreak = 0;
    state.eChargeValue = 0; state.eChargeIsMax = false;
    state.eUpperChargeReady = false; state.eLastWinWasUpper = false;
    state.eComboType = null; state.eComboStart = -1; state.eComboAlive = false; state.eCombos = [];
    state.eHitCombo = 0; state.eHitComboEverBroken = false; state.eHitComboDisplayValue = 0;
    state.eHitComboFadeStartAt = 0; state.eHitComboPopAt = 0;
    state.eHitComboMilestoneAt = 0; state.eHitComboBigMilestoneAt = 0;
    state.finisherAlreadyDown = false;
}

// 中ボスを倒した直後: 背景を一度暗転させ、次の中ボスのステージの背景・BGMに切り替える
async function rushChangeStage() {
    const tk = rushState.token;
    const maxRadius = Math.hypot(cvs.width / 2, cvs.height / 2) + 20;
    const steps = 10;
    for (let s = steps - 1; s >= 0; s--) {
        state.bgRevealRadius = maxRadius * (s / steps);
        await wait(40);
    }
    state.bgRevealRadius = 0;
    const n = rushStageNum();
    await ensureReadyWithLoading(rushStageAssetsPromise(n)); // 通常は先読み済みのため、ここでローディングが出ることは稀
    if (tk !== rushState.token) return;
    playBGM('bgm_battle_' + n, 'bgm_battle');
    const revealSteps = 16;
    for (let s = 1; s <= revealSteps; s++) {
        state.bgRevealRadius = maxRadius * (s / revealSteps);
        await wait(900 / revealSteps);
    }
    state.bgRevealRadius = maxRadius;
    rushPrefetchStage((n % ENEMY_ORDER.length) + 1); // さらに次のステージを裏で先読みしておく
}

// 次の敵を登場させる(resolveTurnのターン終了処理から呼ばれる)
async function rushSpawnNextEnemy() {
    if (state.gameMode !== 'rush') return; // 演出中にタイトルへ戻った場合など
    const tk = rushState.token;
    const prevWasBoss = rushIsBoss(rushState.enemyNo);
    rushState.enemyNo++;
    rushResetEnemySide();
    state.introEnemyAlpha = 0;
    state.hpMaxE = rushEnemyMaxHp();
    state.hpE = state.hpMaxE;
    // 新しい敵のHPバーは満タンから(黄色の遅延バーも即座に満タンへ)
    const hpE = document.getElementById('hpE');
    const hpEy = document.getElementById('hpE_y');
    hpEy.style.transition = 'none';
    hpE.style.width = '100%';
    hpEy.style.width = '100%';
    void hpEy.offsetWidth;
    hpEy.style.transition = '';
    updateCharNames();
    if (prevWasBoss) {
        await rushChangeStage();
        if (tk !== rushState.token) return;
    }
    if (rushIsBoss(rushState.enemyNo)) {
        await ensureReadyWithLoading(loadEnemySet(rushCurrentEnemySetName()));
        if (tk !== rushState.token) return;
        // 中ボスはステージ固有の登場演出(得意技ポーズは無し)
        const idx = ENEMY_ORDER.indexOf(rushBossKey(rushState.enemyNo)); // 0=1st…4=5th
        if (idx === 1) await enemyEntryDash();
        else if (idx === 3) await enemyEntryDescend();
        else if (idx === 4) await enemyEntryFlash();
        else await enemyEntryFade();
    } else {
        await enemyEntryDash(); // 雑魚は右からdashで登場
    }
    toIdle();
}

// ------- RESULT -------
function showRushResult(cleared) {
    if (state.gameMode !== 'rush') return;
    rushStopTimer();
    const ms = rushElapsedMs();
    const kills = rushState.kills;
    const combo = rushState.maxCombo;
    const newKills = kills > (rushBest.kills || 0);
    const newTime = cleared && (rushBest.clearTimeMs === null || ms < rushBest.clearTimeMs);
    const newCombo = combo > (rushBest.maxCombo || 0);
    if (newKills) rushBest.kills = kills;
    if (newTime) rushBest.clearTimeMs = ms;
    if (newCombo) rushBest.maxCombo = combo;
    if (newKills || newTime || newCombo) writeSaveData({ rushBest25: rushBest });

    document.getElementById('rushResultClear').style.display = cleared ? '' : 'none';
    document.getElementById('rushResultKills').innerText = `${kills} / ${RUSH_TOTAL}`;
    document.getElementById('rushResultTime').innerText = formatRushTime(ms);
    document.getElementById('rushResultCombo').innerText = String(combo);
    document.getElementById('rushBestKills').innerText = `BEST ${rushBest.kills}`;
    document.getElementById('rushBestTime').innerText = `BEST ${rushBest.clearTimeMs === null ? '--:--.-' : formatRushTime(rushBest.clearTimeMs)}`;
    document.getElementById('rushBestCombo').innerText = `BEST ${rushBest.maxCombo}`;
    document.getElementById('rushNewKills').classList.toggle('show', newKills);
    document.getElementById('rushNewTime').classList.toggle('show', newTime);
    document.getElementById('rushNewCombo').classList.toggle('show', newCombo);

    if (cleared) {
        playSE('se_win');
        playBGM('bgm_victory');
    } else {
        playSE('se_ko');
        stopBGM();
    }
    document.getElementById('rushResultOverlay').classList.add('show');
}
function rushRetry() {
    hideResult();
    goRushStart();
}
function rushBackToTitle() {
    hideResult();
    goLogo();
}

// ============================================================
// RECORDS(BONUS内、2026-09-28追加)
// ============================================================
// 何を解放したか・どうやって手に入れたか・各種記録を1画面で見返せる一覧。
// 達成率は誰でも達成できる項目(SUB STORY/敵コスチューム/SOUND TEST/SPEED)が基本。
// GIFT CODEでしか手に入らないもの(MIFUNE/LOCAL V.S./BATTLE RUSH)は、解放した人にだけ項目として追加する
// (コードを持っていない人でも100%にできるようにするため)。
// ヒントの文面はRECORDS_HINTSにまとめてあり、ここだけ書き換えれば差し替えられる。
// 置き場所はタイトル画面のOPTION(最初から誰でも開けるため、隠し要素の存在自体を知らない人にもヒントが届く)。
// ゲームクリア後にタイトルへ戻った時、未発見の項目が残っていれば一度だけトーストでRECORDSへ誘導する(checkUnlockAnnouncements)。
const RECORDS_HINTS = {
    subStoryHow: (n) => `ストーリー${n}人目の会話中に隠しタップで発見`,
    subStoryHint: 'ストーリーの会話シーンのどこかをタップする',
    costumeHow: (name) => `EXTRA BATTLEで${name}として勝利`,
    costumeHint: 'SUB STORYの先にある戦いで手に入る',
    clearHow: 'ゲームクリアで解放',
    clearHint: 'ゲームクリアで解放',
    giftHow: 'GIFT CODEで解放',
};
// TECHNIQUES(技の記録、2026-09-30追加)。一度でも出した技はコマンドを表示し、未使用の技は「？？？」とヒントを出す。
// cmdの（パンチ）（アッパー）（ガード）はカードのアイコンに置き換わる(applyHowToCardIcons)。
const RECORDS_TECHNIQUES = [
    { key: 'charge',          name: 'CHARGE',        cmd: '（ガード）（ガード）',             hint: 'ガードを続けて決める' },
    { key: 'meteor',          name: 'METEOR!',       cmd: '（アッパー）（パンチ）（パンチ）（パンチ）', hint: 'アッパーの後、空中で攻め続ける' },
    { key: 'superUpper',      name: 'RISING!',       cmd: '（パンチ）（パンチ）（アッパー）',     hint: 'パンチを重ねてからアッパー' },
    { key: 'upperGuardUpper', name: 'RISING!',       cmd: '（アッパー）（ガード）（アッパー）',   hint: 'アッパーとガードの後、もう一度…' },
    { key: 'followUp',        name: 'RUSH!',         cmd: '（パンチ）（ガード）（パンチ）',       hint: 'パンチの間にガードを挟む' },
    { key: 'guardPunchUpper', name: 'BREAK!',        cmd: '（ガード）（パンチ）（アッパー）',     hint: '守って、打って、打ち上げる' },
    { key: 'finisher',        name: 'CRASH!',        cmd: '決まった並びの5枚',                   hint: '5枚を決まった並びで出す' },
    { key: 'feint',           name: 'FEINT!',        cmd: '（パンチ）（アッパー）（ガード）',     hint: '攻めると見せて、最後は守りで返す' },
    { key: 'parry',           name: 'PARRY!',        cmd: '（ガード）（アッパー）（ガード）',     hint: 'アッパーを守りで挟む' },
    { key: 'miracle',         name: 'MIRACLE!',      cmd: '同じカードを5枚',                     hint: '5枚すべてを…' },
];
function buildRecordsItems() {
    const items = [];
    for (let i = 0; i < ENEMY_ORDER.length; i++) {
        const got = unlockedSubStories.includes(i);
        items.push({ got, name: got ? `SUB STORY ${i + 1}` : '？？？', how: got ? RECORDS_HINTS.subStoryHow(i + 1) : RECORDS_HINTS.subStoryHint });
    }
    for (let i = 0; i < ENEMY_ORDER.length; i++) {
        const got = unlockedSkins.includes('enemy_' + (i + 1));
        const name = ENEMY_PRESETS[ENEMY_ORDER[i]].name;
        items.push({ got, name: got ? `COSTUME: ${name}` : 'COSTUME: ？？？', how: got ? RECORDS_HINTS.costumeHow(name) : RECORDS_HINTS.costumeHint });
    }
    const soundGot = gameClearedOnce || soundTestUnlocked;
    items.push({ got: soundGot, name: soundGot ? 'SOUND TEST' : '？？？', how: soundGot ? RECORDS_HINTS.clearHow : RECORDS_HINTS.clearHint });
    items.push({ got: gameClearedOnce, name: gameClearedOnce ? 'BATTLE SPEED' : '？？？', how: gameClearedOnce ? RECORDS_HINTS.clearHow : RECORDS_HINTS.clearHint });
    // GIFT CODE限定: 解放した人にだけ追加する
    Object.keys(EXTRA_COSTUME_LABELS).forEach(skin => {
        if (unlockedSkins.includes(skin)) items.push({ got: true, name: `COSTUME: ${EXTRA_COSTUME_LABELS[skin]}`, how: RECORDS_HINTS.giftHow, gift: true });
    });
    if (versusUnlocked) items.push({ got: true, name: 'LOCAL V.S.', how: RECORDS_HINTS.giftHow, gift: true });
    RECORDS_TECHNIQUES.forEach(t => {
        const got = !!specialsUsed[t.key];
        items.push({ got, tech: true, name: got ? t.name : '？？？', how: got ? t.cmd : t.hint });
    });
    if (rushUnlocked) items.push({ got: true, name: 'BATTLE RUSH', how: RECORDS_HINTS.giftHow, gift: true });
    return items;
}
function escapeRecordsText(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function recordsItemHtml(it) {
    return `<div class="records-item${it.got ? ' got' : ''}"><span class="records-item-name">${it.got ? '★' : '☆'} ${escapeRecordsText(it.name)}</span>`
        + `<span class="records-item-how">${escapeRecordsText(it.how)}</span></div>`;
}
function renderRecords() {
    const items = buildRecordsItems();
    const got = items.filter(it => it.got).length;
    const pct = Math.floor(got / items.length * 100);
    const storyCleared = gameClearedOnce;
    const defeated = defeatedEnemyIndices.length;
    let html = `<div class="records-rate"><span class="records-rate-num">${got} / ${items.length}</span><span class="records-rate-pct">${pct}%</span></div>`;
    // 各項目は見出しをタップすると開閉する(2026-10-01、項目が増えて長くなったため)。開閉状態はアプリを開いている間だけ覚えておく
    const section = (key, title, sub, inner) => {
        const open = recordsOpenSections.has(key);
        html += `<div class="records-section${open ? ' open' : ''}" data-key="${key}">`
            + `<button class="records-section-title" onclick="toggleRecordsSection('${key}')">`
            + `<span class="records-section-arrow">${open ? '▼' : '▶︎'}</span><span class="records-section-name">${title}</span>`
            + `<span class="records-section-sub">${sub}</span></button>`
            + `<div class="records-section-body">${inner}</div></div>`;
    };
    const stat = (label, value) => `<div class="records-stat"><span>${label}</span><span>${value}</span></div>`;
    const itemHtml = recordsItemHtml;
    const countSub = (list) => `${list.filter(it => it.got).length} / ${list.length}`;
    section('story', 'STORY MODE', storyCleared ? 'CLEAR' : `${defeated} / ${ENEMY_ORDER.length}`,
        stat('進行', storyCleared ? 'CLEAR' : `${defeated} / ${ENEMY_ORDER.length} 撃破`)
        + stat('最大COMBO', storyMaxCombo)
        + stat('PERFECT勝利', `${perfectWins}回`));
    if (rushUnlocked) {
        section('rush', 'BATTLE RUSH', `${rushBest.kills} / ${RUSH_TOTAL}`,
            stat('最多撃破', `${rushBest.kills} / ${RUSH_TOTAL}`)
            + stat('ベストタイム', rushBest.clearTimeMs === null ? '--:--.-' : formatRushTime(rushBest.clearTimeMs))
            + stat('最大COMBO', rushBest.maxCombo));
    }
    const techs = items.filter(it => it.tech);
    const unlocks = items.filter(it => !it.tech);
    section('tech', 'TECHNIQUES', countSub(techs), techs.map(itemHtml).join(''));
    section('unlocks', 'UNLOCKS', countSub(unlocks), unlocks.map(itemHtml).join(''));
    document.getElementById('recordsBody').innerHTML = html;
    applyHowToCardIcons(document.getElementById('recordsBody')); // 技のコマンドの（パンチ）等をカードのアイコンにする
}
const recordsOpenSections = new Set(); // RECORDSで開いている見出し(アプリを開いている間だけ保持)
function toggleRecordsSection(key) {
    if (recordsOpenSections.has(key)) recordsOpenSections.delete(key); else recordsOpenSections.add(key);
    const el = document.querySelector(`#recordsBody .records-section[data-key="${key}"]`);
    if (!el) return;
    const open = recordsOpenSections.has(key);
    el.classList.toggle('open', open);
    el.querySelector('.records-section-arrow').textContent = open ? '▼' : '▶︎';
    playSE('se_select');
}
// HOW TO BATTLEの一番上のワザ表(2026-10-01): RECORDSのTECHNIQUESと同じ内容。見出しをタップすると開閉する(最初は閉じている)
function renderHowToTechniques() {
    const techs = buildRecordsItems().filter(it => it.tech);
    const body = document.getElementById('howToTechBody');
    body.innerHTML = techs.map(recordsItemHtml).join('');
    applyHowToCardIcons(body);
    document.getElementById('howToTechCount').textContent = `${techs.filter(it => it.got).length} / ${techs.length}`;
    document.getElementById('howToTechSection').classList.toggle('open', howToOpenSections.tech);
    document.getElementById('howToTechArrow').textContent = howToOpenSections.tech ? '▼' : '▶\ufe0e';
}
function openRecords() {
    renderRecords();
    document.getElementById('recordsBody').scrollTop = 0;
    document.getElementById('recordsOverlay').classList.add('show');
}
function closeRecords() { document.getElementById('recordsOverlay').classList.remove('show'); }
function closeRecordsBackdrop(e) { if (e.target.id === 'recordsOverlay') closeRecords(); }
// 基本項目(GIFT CODE限定を除く)でまだ見つけていないものがあるか
function recordsHasUndiscovered() {
    return buildRecordsItems().some(it => !it.gift && !it.got);
}


// ============================================================
// HOW TO内のカード名をカードのアイコン画像に置き換える(2026-09-30追加)
// 「PUNCH」「UPPER」「GUARD」、および「（パンチ）」「（アッパー）」「（ガード）」の書き方を対象にする
// (今後HOW TOの文面を書き換える時は（ガード）のように書けばアイコンになる)。見出しの<b>内も対象。
// ============================================================
const HOWTO_CARD_ICON_PATTERNS = [
    { re: /（パンチ）|\(パンチ\)|（P）|\(P\)|PUNCH/g, img: 'card_P.PNG', label: 'PUNCH' },
    { re: /（アッパー）|\(アッパー\)|（U）|\(U\)|UPPER/g, img: 'card_U.PNG', label: 'UPPER' },
    { re: /（ガード）|\(ガード\)|（G）|\(G\)|GUARD/g, img: 'card_G.PNG', label: 'GUARD' },
];
function applyHowToCardIcons(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const anyRe = /（パンチ）|\(パンチ\)|（P）|\(P\)|PUNCH|（アッパー）|\(アッパー\)|（U）|\(U\)|UPPER|（ガード）|\(ガード\)|（G）|\(G\)|GUARD/g;
    nodes.forEach(node => {
        const text = node.nodeValue;
        if (!anyRe.test(text)) return;
        anyRe.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let pos = 0, m;
        while ((m = anyRe.exec(text))) {
            frag.appendChild(document.createTextNode(text.slice(pos, m.index)));
            const def = HOWTO_CARD_ICON_PATTERNS.find(d => { d.re.lastIndex = 0; return d.re.test(m[0]); });
            const img = document.createElement('img');
            img.className = 'howto-card-icon';
            img.src = 'assets/images/cards/' + def.img;
            img.alt = def.label;
            img.onerror = () => { img.replaceWith(document.createTextNode(def.label)); }; // 画像が無ければ文字に戻す
            frag.appendChild(img);
            pos = m.index + m[0].length;
        }
        frag.appendChild(document.createTextNode(text.slice(pos)));
        node.parentNode.replaceChild(frag, node);
    });
}
document.querySelectorAll('#howToOverlay .howto-page').forEach(el => applyHowToCardIcons(el));
