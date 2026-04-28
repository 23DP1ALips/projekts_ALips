(function () {
    'use strict';

    var temasPogas = document.querySelectorAll('[data-tema-pec]');
    function piemerotTemu(tema) {
        var html = document.documentElement;
        if (tema && tema !== 'auto') {
            html.setAttribute('data-theme', tema);
        } else {
            html.removeAttribute('data-theme');
        }
        try { localStorage.setItem('tema', tema || 'auto'); } catch (_) {}
        temasPogas.forEach(function (p) {
            var akt = p.getAttribute('data-tema-pec');
            if (akt === (tema || 'auto')) {
                p.classList.add('aktivs');
                p.setAttribute('aria-pressed', 'true');
            } else {
                p.classList.remove('aktivs');
                p.setAttribute('aria-pressed', 'false');
            }
        });
    }
    temasPogas.forEach(function (p) {
        p.addEventListener('click', function () { piemerotTemu(p.getAttribute('data-tema-pec')); });
    });
    if (temasPogas.length) {
        var saglabata = 'auto';
        try { saglabata = localStorage.getItem('tema') || 'auto'; } catch (_) {}
        piemerotTemu(saglabata);
    }

    function dabutDialogu() {
        var d = document.getElementById('apstiprinajumu-dialogs');
        if (d) return d;
        d = document.createElement('dialog');
        d.id = 'apstiprinajumu-dialogs';
        d.className = 'apstiprinajums';
        d.innerHTML = ''
            + '<div class="dial-saturs">'
            + '<h2 class="dial-virsraksts" data-dial-virsraksts></h2>'
            + '<p class="dial-zinojums" data-dial-zinojums></p>'
            + '</div>'
            + '<form method="dialog" class="dial-darbibas">'
            + '<button value="atcelt" class="poga" data-dial-atcelt></button>'
            + '<button value="apstiprinat" class="poga bistama" data-dial-apstiprinat></button>'
            + '</form>';
        document.body.appendChild(d);
        return d;
    }

    function teksti(formaUzdevums) {
        var ds = formaUzdevums.dataset;
        return {
            virsraksts: ds.apstiprinatVirsraksts || (document.documentElement.lang === 'en' ? 'Confirm action' : (document.documentElement.lang === 'ru' ? 'Подтвердите действие' : 'Apstiprināt darbību')),
            zinojums: ds.apstiprinat || '',
            ok: ds.apstiprinatOk || (document.documentElement.lang === 'en' ? 'Confirm' : (document.documentElement.lang === 'ru' ? 'Подтвердить' : 'Apstiprināt')),
            cancel: ds.apstiprinatAtcelt || (document.documentElement.lang === 'en' ? 'Cancel' : (document.documentElement.lang === 'ru' ? 'Отмена' : 'Atcelt')),
        };
    }

    document.addEventListener('submit', function (event) {
        var form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (!form.dataset.apstiprinat) return;
        if (form.dataset.apstiprinatsApstiprinats === '1') {
            return;
        }

        event.preventDefault();
        var t = teksti(form);
        var d = dabutDialogu();
        d.querySelector('[data-dial-virsraksts]').textContent = t.virsraksts;
        d.querySelector('[data-dial-zinojums]').textContent = t.zinojums;
        d.querySelector('[data-dial-apstiprinat]').textContent = t.ok;
        d.querySelector('[data-dial-atcelt]').textContent = t.cancel;

        var apstiprinats = false;
        function uzAizverTo() {
            d.removeEventListener('close', uzAizverTo);
            if (d.returnValue === 'apstiprinat') {
                apstiprinats = true;
                form.dataset.apstiprinatsApstiprinats = '1';
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.submit();
            }
        }
        d.addEventListener('close', uzAizverTo);

        if (typeof d.showModal === 'function') {
            d.returnValue = '';
            d.showModal();
        } else {
            if (window.confirm(t.zinojums)) {
                apstiprinats = true;
                form.dataset.apstiprinatsApstiprinats = '1';
                form.submit();
            }
        }
    }, true);

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { /* ignore */ });
        });
    }

    var aiBlocks = document.querySelectorAll('[data-ai]');
    aiBlocks.forEach(function (bloks) {
        var i18n = {};
        try { i18n = JSON.parse(bloks.getAttribute('data-ai-i18n') || '{}'); } catch (_) { i18n = {}; }
        var t = function (k) { return i18n[k] || k; };

        var statuss = bloks.querySelector('[data-ai-statuss]');
        var rezultats = bloks.querySelector('[data-ai-rezultats]');
        var darbibas = bloks.querySelector('[data-ai-darbibas]');
        var saturaLauks = document.getElementById('saturs');
        var virsrakstaLauks = document.getElementById('virsraksts');
        var pedejaisRezultats = '';

        bloks.querySelectorAll('[data-ai-darbiba]').forEach(function (poga) {
            poga.addEventListener('click', function () {
                var darbiba = poga.getAttribute('data-ai-darbiba');
                var teksts = saturaLauks ? saturaLauks.value.trim() : '';
                if (!teksts || teksts.length < 5) {
                    statuss.textContent = t('need_more_text');
                    return;
                }
                statuss.textContent = t('processing');
                rezultats.hidden = true;
                darbibas.hidden = true;
                fetch('/ai/' + darbiba, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ teksts: teksts }),
                }).then(function (r) {
                    return r.json().then(function (d) { return { ok: r.ok, data: d }; });
                }).then(function (atb) {
                    if (!atb.ok) {
                        statuss.textContent = atb.data && atb.data.kluda ? atb.data.kluda : t('error_generic');
                        return;
                    }
                    pedejaisRezultats = atb.data.rezultats || '';
                    rezultats.textContent = pedejaisRezultats;
                    rezultats.hidden = false;
                    darbibas.hidden = false;
                    statuss.textContent = atb.data.avots === 'lokala' ? t('local_fallback') : t('ready');
                }).catch(function () {
                    statuss.textContent = t('network_error');
                });
            });
        });

        bloks.querySelector('[data-ai-piemerot]').addEventListener('click', function () {
            if (saturaLauks && pedejaisRezultats) {
                saturaLauks.value = pedejaisRezultats;
                statuss.textContent = t('content_replaced');
            }
        });
        bloks.querySelector('[data-ai-piemerot-virsrakstam]').addEventListener('click', function () {
            if (virsrakstaLauks && pedejaisRezultats) {
                virsrakstaLauks.value = pedejaisRezultats.slice(0, 150);
                statuss.textContent = t('title_replaced');
            }
        });
        bloks.querySelector('[data-ai-aizvert]').addEventListener('click', function () {
            rezultats.hidden = true;
            darbibas.hidden = true;
            statuss.textContent = '';
        });
    });
})();
