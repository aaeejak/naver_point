// ==UserScript==
// @name         네이버페이 포인트 자동 받기
// @namespace    http://adguard.com/
// @version      3.7.0
// @description  네이버페이 클릭적립 + 보험 클릭미션 + 쇼핑 지원금 + 카페 혜택 + 마이카 클릭미션 자동 수령
// @author       Feature Planner
// @match        https://campaign2.naver.com/npay/v2/click-point/*
// @match        https://insurance.pay.naver.com/*
// @match        https://mkt.naver.com/*
// @match        https://mycar.naver.com/*
// @match        https://campaign2.naver.com/npay/cafe/*
// @include      *://campaign2.naver.com/npay/v2/click-point/*
// @include      *://insurance.pay.naver.com/*
// @include      *://mkt.naver.com/*
// @include      *://mycar.naver.com/*
// @include      *://campaign2.naver.com/npay/cafe*
// @include      *campaign2.naver.com/npay/v2/click-point*
// @include      *insurance.pay.naver.com*
// @include      *mkt.naver.com*
// @include      *mycar.naver.com*
// @include      *campaign2.naver.com/npay/cafe*
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/aaeejak/naver_point/main/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4.js
// @downloadURL  https://raw.githubusercontent.com/aaeejak/naver_point/main/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ── 백그라운드 미션 실행기 (보험 / 마이카 공통) ──
    async function runBackgroundMissions(selectors, rounds = 2, delayMs = 1500) {
        let done = false;
        const interval = setInterval(async () => {
            if (done) return;
            const links = [];
            for (const sel of selectors) {
                document.querySelectorAll(sel).forEach(el => el.href && links.push(el.href));
                if (links.length) break;
            }
            if (!links.length) return;

            done = true;
            clearInterval(interval);
            clearTimeout(timeout);
            console.log(`[NaverPay AP] ${links.length}개 미션 발견. 백그라운드 적립 시작...`);

            for (let r = 1; r <= rounds; r++) {
                for (const url of links) {
                    fetch(url, { credentials: 'include', mode: 'no-cors' }).catch(() => {});
                    await new Promise(res => setTimeout(res, delayMs));
                }
            }
            console.log("[NaverPay AP] 모든 미션 백그라운드 처리 완료 ✅");
        }, 500);

        const timeout = setTimeout(() => clearInterval(interval), 20000);
    }

    // ── 캠페인 팝업 클릭적립 ──
    function runCampaignClaimer() {
        const check = () => {
            const popup = document.querySelector('.type_no_points');
            if (popup && popup.style.display !== 'none') {
                const btn = popup.querySelector('.popup_link');
                if (btn) btn.click();
            }
        };
        const obs = new MutationObserver(check);
        obs.observe(document.body || document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style'] });
        check();
    }

    // ── 스토어 디스커버리 ──
    function runStoreClaimer() {
        const tryClick = () => {
            const btn = document.querySelector('button.btn_drawing') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('지원금 확인'));
            if (btn) { btn.click(); return true; }
            return false;
        };
        const start = () => {
            if (!window.location.pathname.includes('store_discovery')) return;
            if (tryClick()) return;
            const iv = setInterval(() => { if (tryClick()) clearInterval(iv); }, 500);
            setTimeout(() => clearInterval(iv), 60000);
        };
        const origPush = history.pushState, origRepl = history.replaceState;
        history.pushState = function() { origPush.apply(this, arguments); setTimeout(start, 300); };
        history.replaceState = function() { origRepl.apply(this, arguments); setTimeout(start, 300); };
        window.addEventListener('popstate', () => setTimeout(start, 300));
        start();
    }

    // ── 카페 혜택 ──
    function runCafeClaimer() {
        const tryClick = () => {
            const btn = document.querySelector('button.btn_benefit');
            if (btn && window.getComputedStyle(btn).display !== 'none' && !btn.disabled) {
                btn.click();
                return true;
            }
            return false;
        };
        if (tryClick()) return;
        const iv = setInterval(() => { if (tryClick()) clearInterval(iv); }, 500);
        setTimeout(() => clearInterval(iv), 60000);
    }

    // ── 라우터 ──
    function bootstrap() {
        const host = window.location.hostname;
        const path = window.location.pathname;

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
