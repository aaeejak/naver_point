// ==UserScript==
// @name         네이버페이 포인트 자동 받기
// @namespace    http://adguard.com/
// @version      4.1.0
// @description  네이버페이 클릭적립 + 보험 클릭미션 + 쇼핑 지원금 + 카페 혜택 + 마이카 클릭미션 자동 수령
// @author       Feature Planner
// @match        https://campaign2.naver.com/npay/v2/click-point/*
// @match        https://insurance.pay.naver.com/*
// @match        https://mkt.naver.com/*
// @match        https://mycar.naver.com/*
// @match        https://campaign2.naver.com/npay/cafe/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/aaeejak/naver_point/main/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4.js
// @downloadURL  https://raw.githubusercontent.com/aaeejak/naver_point/main/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[NaverPay AP] 스크립트 로드됨 v4.1.0 — ' + window.location.href);

    // ── 백그라운드 미션 실행기 (보험 / 마이카 공통) ──
    function runBackgroundMissions(selectors, delayMs = 2500) {
        let found = false;
        let pollTimeout;
        let pollCount = 0;

        function poll() {
            if (found) return;
            pollCount++;
            const els = [];
            for (const sel of selectors) {
                document.querySelectorAll(sel).forEach(el => el.href && els.push(el));
                if (els.length) break;
            }
            console.log(`[NaverPay AP] 폴링 #${pollCount} — ${els.length}개 발견`);
            if (!els.length) { pollTimeout = setTimeout(poll, 1000); return; }

            found = true;
            const urls = els.map(el => el.href);
            console.log('[NaverPay AP] 미션 URL:', urls);

            // window.open으로 순차 방문 — 가장 확실한 브라우저 네비게이션
            let i = 0;
            function openNext() {
                if (i >= urls.length) {
                    console.log('[NaverPay AP] 모든 미션 클릭 적립 완료 ✅');
                    return;
                }
                const url = urls[i++];
                console.log(`[NaverPay AP] 미션 ${i}/${urls.length} 열기: ${url}`);
                const w = window.open(url, '_blank');
                if (w) {
                    setTimeout(() => { try { w.close(); } catch(e) {} }, 3000);
                }
                setTimeout(openNext, delayMs);
            }
            openNext();
        }

        // Next.js SPA라 렌더링이 늦음 — 3초 후 시작
        setTimeout(poll, 3000);
        setTimeout(() => { found = true; clearTimeout(pollTimeout); }, 30000);
    }

    // ── 캠페인 팝업 클릭적립 ──
    function runCampaignClaimer() {
        const check = () => {
            const popup = document.querySelector('.type_no_points');
            if (popup && popup.style.display !== 'none') {
                const btn = popup.querySelector('.popup_link');
                if (btn) { btn.click(); console.log('[NaverPay AP] 캠페인 팝업 클릭 ✅'); }
            }
        };
        const target = document.querySelector('.type_no_points');
        if (target) {
            new MutationObserver(check).observe(target, { attributes: true, attributeFilter: ['style'] });
        } else {
            const obs = new MutationObserver(() => {
                const el = document.querySelector('.type_no_points');
                if (el) { obs.disconnect(); check(); new MutationObserver(check).observe(el, { attributes: true, attributeFilter: ['style'] }); }
            });
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
        }
        check();
    }

    // ── 스토어 디스커버리 ──
    function runStoreClaimer() {
        const tryClick = () => {
            const btn = document.querySelector('button.btn_drawing') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('지원금 확인'));
            if (btn) { btn.click(); console.log('[NaverPay AP] 스토어 클릭 ✅'); return true; }
            return false;
        };
        if (!window.location.pathname.includes('store_discovery')) return;
        if (tryClick()) return;
        const iv = setInterval(() => { if (tryClick()) clearInterval(iv); }, 500);
        setTimeout(() => clearInterval(iv), 15000);
    }

    // ── 카페 혜택 ──
    function runCafeClaimer() {
        const tryClick = () => {
            const btn = document.querySelector('button.btn_benefit');
            if (btn && window.getComputedStyle(btn).display !== 'none' && !btn.disabled) {
                btn.click();
                console.log('[NaverPay AP] 카페 혜택 클릭 ✅');
                return true;
            }
            return false;
        };
        if (tryClick()) return;
        const iv = setInterval(() => { if (tryClick()) clearInterval(iv); }, 500);
        setTimeout(() => clearInterval(iv), 15000);
    }

    // ── 라우터 ──
    const host = window.location.hostname;
    const path = window.location.pathname;

    console.log(`[NaverPay AP] 라우팅: host=${host}, path=${path}`);

    if (host.includes('insurance.pay.naver.com')) {
        runBackgroundMissions([
            'a[data-au-element="clkMission"]',
            'a[href*="ica.pay.naver.com/inventory/r/click"]',
            'a[class*="type-click"][class*="PointMission"]'
        ]);
    } else if (host.includes('mycar.naver.com')) {
        if (path === '/' || path === '' || path === '/index.html') {
            runBackgroundMissions([
                'a[data-au="point.item"][data-au-service="mycar"]',
                'a[href*="ica.pay.naver.com/inventory/r/click/mycar"]'
            ]);
        }
    } else if (host.includes('campaign2.naver.com')) {
        if (path.includes('/npay/cafe')) runCafeClaimer();
        else runCampaignClaimer();
    } else if (host.includes('mkt.naver.com')) {
        runStoreClaimer();
    }
})();
