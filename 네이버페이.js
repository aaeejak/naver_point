// ==UserScript==
// @name         네이버페이 포인트 자동 받기
// @namespace    http://adguard.com/
// @version      4.0.0
// @description  네이버페이 클릭적립 + 보험 클릭미션 + 쇼핑 지원금 + 카페 혜택 + 마이카 클릭미션 자동 수령
// @author       Feature Planner
// @match        https://campaign2.naver.com/npay/v2/click-point/*
// @match        https://insurance.pay.naver.com/*
// @match        https://mkt.naver.com/*
// @match        https://mycar.naver.com/*
// @match        https://campaign2.naver.com/npay/cafe/*
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/aaeejak/naver_point/main/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4.js
// @downloadURL  https://raw.githubusercontent.com/aaeejak/naver_point/main/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ── 백그라운드 미션 실행기 (보험 / 마이카 공통) ──
    async function runBackgroundMissions(selectors, delayMs = 2500) {
        let found = false;
        let pollTimeout;

        function poll() {
            if (found) return;
            const els = [];
            for (const sel of selectors) {
                document.querySelectorAll(sel).forEach(el => el.href && els.push(el));
                if (els.length) break;
            }
            if (!els.length) { pollTimeout = setTimeout(poll, 500); return; }

            found = true;
            console.log(`[NaverPay AP] ${els.length}개 미션 발견. 클릭 적립 시작...`);

            // 순차 클릭 — 새 탭으로 열어 리다이렉트 체인 + 쿠키 정상 처리
            (async () => {
                for (const el of els) {
                    const origTarget = el.target;
                    el.target = '_blank';
                    el.click();
                    el.target = origTarget;
                    await new Promise(r => setTimeout(r, delayMs));
                }
                console.log("[NaverPay AP] 모든 미션 클릭 적립 완료 ✅");
            })();
        }

        poll();
        setTimeout(() => { found = true; clearTimeout(pollTimeout); }, 20000);
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
        const target = document.querySelector('.type_no_points');
        if (target) {
            new MutationObserver(check).observe(target, { attributes: true, attributeFilter: ['style'] });
        } else {
            // 팝업이 아직 없으면 body에서 childList로 등장 감시
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
            if (btn) { btn.click(); return true; }
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
                return true;
            }
            return false;
        };
        if (tryClick()) return;
        const iv = setInterval(() => { if (tryClick()) clearInterval(iv); }, 500);
        setTimeout(() => clearInterval(iv), 15000);
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
