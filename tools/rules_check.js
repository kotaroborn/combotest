// Firebase Realtime Databaseのセキュリティルール(database.rules.json)を、ダミー通信の中で判定するための簡易版。
// 2026-10-03、オンライン対戦 段階4。tools/online_test.html だけが読み込む(ゲーム本体は使わない)。
// ・本物のFirebaseの判定を完全に再現するものではない。ルールの式の書き間違い・ゲームの書き込みとの食い違いを
//   見つけるためのもの。本物のFirebaseよりも厳しめに判定する(書き込んだ場所の下の、変わっていない値の.validateも見る)。
// ・書き込み: 書いた場所かその上のどこかの.writeが通り、かつ書いた後のデータの、書いた場所とその上・下の
//   すべての値(nullを除く)で.validateが通れば許可。
// ・読み込み: 読む場所かその上のどこかの.readが通れば許可。
(function () {
    // 文字列の .matches(/正規表現/)(Firebaseのルールの書き方に合わせる)
    if (!String.prototype.matches) {
        Object.defineProperty(String.prototype, 'matches', { value: function (re) { return re.test(String(this)); } });
    }
    const split = p => String(p).split('/').filter(Boolean);
    const getAt = (root, keys) => {
        let cur = root;
        for (const k of keys) { if (cur === null || typeof cur !== 'object' || !(k in cur)) return null; cur = cur[k]; }
        return cur === undefined ? null : cur;
    };
    // RuleDataSnapshotの簡易版
    function Snap(root, keys) { this.root = root; this.keys = keys; }
    Snap.prototype.val = function () { const v = getAt(this.root, this.keys); return v === null ? null : JSON.parse(JSON.stringify(v)); };
    Snap.prototype.exists = function () { return getAt(this.root, this.keys) !== null; };
    Snap.prototype.child = function (p) { return new Snap(this.root, this.keys.concat(split(p))); };
    Snap.prototype.parent = function () { return new Snap(this.root, this.keys.slice(0, -1)); };
    Snap.prototype.hasChild = function (p) { return this.child(p).exists(); };
    Snap.prototype.hasChildren = function (arr) {
        const v = getAt(this.root, this.keys);
        if (v === null || typeof v !== 'object') return false;
        return (arr || []).every(k => this.child(k).exists());
    };
    Snap.prototype.isString = function () { return typeof getAt(this.root, this.keys) === 'string'; };
    Snap.prototype.isNumber = function () { return typeof getAt(this.root, this.keys) === 'number'; };
    Snap.prototype.isBoolean = function () { return typeof getAt(this.root, this.keys) === 'boolean'; };

    const fnCache = {};
    function evalRule(expr, ctx, vars) {
        if (expr === true || expr === false) return expr;
        const names = Object.keys(vars);
        const key = names.join(',') + '|' + expr;
        if (!fnCache[key]) fnCache[key] = new Function('auth', 'now', 'data', 'newData', 'root', 'query', ...names, 'return (' + expr + ');');
        try {
            return fnCache[key](ctx.auth, ctx.now, ctx.data, ctx.newData, ctx.root, ctx.query, ...names.map(n => vars[n])) === true;
        } catch (e) {
            return false; // Firebaseと同じく、式の途中でエラーになったら不許可
        }
    }
    // ルールの木を、キーの並びに沿ってたどる。各段の { node, vars } を返す(ルールが無くなったらそこで終わり)
    function walk(rules, keys) {
        const out = [{ node: rules, vars: {} }];
        let node = rules, vars = {};
        for (const k of keys) {
            if (!node || typeof node !== 'object') break;
            let next = null;
            if (Object.prototype.hasOwnProperty.call(node, k) && !k.startsWith('.')) next = node[k];
            else {
                const wild = Object.keys(node).find(n => n.startsWith('$'));
                if (wild) { next = node[wild]; vars = Object.assign({}, vars, { [wild]: k }); }
            }
            if (!next) { out.push(null); break; }
            node = next;
            out.push({ node, vars });
        }
        return out;
    }

    window.clash5MakeRulesCheck = function (rulesJson) {
        const rules = rulesJson.rules;
        const ctxBase = (uid, oldRoot, newRoot, query) => ({
            auth: uid ? { uid } : null, now: Date.now(), root: new Snap(oldRoot, []), query: query || {}
        });
        function canRead(uid, path, root, query) {
            const keys = split(path);
            const chain = walk(rules, keys);
            for (let i = 0; i <= keys.length; i++) {
                const step = chain[i];
                if (!step) break;
                if ('.read' in step.node) {
                    const ctx = ctxBase(uid, root, root, query);
                    ctx.data = new Snap(root, keys.slice(0, i));
                    ctx.newData = ctx.data;
                    if (evalRule(step.node['.read'], ctx, step.vars)) return true;
                }
            }
            return false;
        }
        function validateAt(uid, keys, oldRoot, newRoot, errors) {
            const step = walk(rules, keys)[keys.length];
            if (!step || !('.validate' in step.node)) return;
            const ctx = ctxBase(uid, oldRoot, newRoot);
            ctx.data = new Snap(oldRoot, keys);
            ctx.newData = new Snap(newRoot, keys);
            if (!evalRule(step.node['.validate'], ctx, step.vars)) errors.push('/' + keys.join('/'));
        }
        function validateTree(uid, keys, oldRoot, newRoot, errors) {
            const v = getAt(newRoot, keys);
            if (v === null) return;
            validateAt(uid, keys, oldRoot, newRoot, errors);
            if (typeof v === 'object') Object.keys(v).forEach(k => validateTree(uid, keys.concat(k), oldRoot, newRoot, errors));
        }
        function canWrite(uid, path, oldRoot, newRoot) {
            const keys = split(path);
            const chain = walk(rules, keys);
            let allowed = false;
            for (let i = 0; i <= keys.length && !allowed; i++) {
                const step = chain[i];
                if (!step) break;
                if ('.write' in step.node) {
                    const ctx = ctxBase(uid, oldRoot, newRoot);
                    ctx.data = new Snap(oldRoot, keys.slice(0, i));
                    ctx.newData = new Snap(newRoot, keys.slice(0, i));
                    allowed = evalRule(step.node['.write'], ctx, step.vars);
                }
            }
            if (!allowed) { window.__clash5RulesLog.push({ uid, path, why: 'write' }); return false; }
            const errors = [];
            for (let i = 0; i < keys.length; i++) {
                if (getAt(newRoot, keys.slice(0, i)) !== null) validateAt(uid, keys.slice(0, i), oldRoot, newRoot, errors);
            }
            validateTree(uid, keys, oldRoot, newRoot, errors);
            if (errors.length) { window.__clash5RulesLog.push({ uid, path, why: 'validate', at: errors }); return false; }
            return true;
        }
        return { canRead, canWrite };
    };
    window.__clash5RulesLog = [];
})();
