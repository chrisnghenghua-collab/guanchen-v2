@echo off
rem GUANCHEN V2 - full verification. Read-only on engine; writes only tests\last-run\, tests\last-p2\ and the .log files below.
cd /d "%~dp0"
set FAIL=0
echo ===== 1/10 New API v2 contract (42 real requests incl. time estimate) =====
rem --no-experimental-detect-module: same strict module loading as the Netlify runtime (2026-10-23)
node --no-experimental-detect-module tests\v2_api.mjs > tests\v2_api.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "V2_API" tests\v2_api.log
echo ===== 2/10 Interpretation quality (500 charts x 20 questions) =====
node tests\p3_distribution.mjs 500 > tests\p3_distribution.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "P3_DISTRIBUTION" tests\p3_distribution.log
echo ===== 3/10 Chris 10 true-solar cases =====
node tests\p2_user_cases.mjs > tests\user_cases.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "USER_CASES" tests\user_cases.log
echo ===== 4/10 Independent calculation cross-check (about 1600 charts) =====
node tests\p2_calc_crosscheck.mjs > tests\crosscheck.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "CROSSCHECK" tests\crosscheck.log
echo ===== 5/10 Legacy calculation guard (old interface, byte compare) =====
node tests\http_regression.mjs > tests\regression.log 2>&1
if errorlevel 1 (set FAIL=1 & echo Legacy guard: FAIL) else (echo Legacy guard: PASS)
echo ===== 6/10 Birth-time estimate model check (60 simulated people) =====
node tests\p4_estimate_eval.mjs 60 > tests\p4_estimate.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "P4_ESTIMATE" tests\p4_estimate.log
echo ===== 7/10 Website files (birthplace list in sync, page files, API calls) =====
node tests\p6_public_check.mjs > tests\p6_public.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "P6_PUBLIC" tests\p6_public.log
echo ===== 8/10 Professional chart tables vs tyme4ts (nayin, xunkong, 12 stages, hidden stems, ten gods, shensha) =====
node tests\p7_pro_check.mjs > tests\p7_pro.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "P7_PRO" tests\p7_pro.log
echo ===== 9/10 Usage counters (anonymous, counts only) =====
node tests\p8_stats_check.mjs > tests\p8_stats.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "P8_STATS" tests\p8_stats.log
echo ===== 10/10 Traditional Chinese (Taiwan) conversion =====
node tests\p8_tw_check.mjs > tests\p8_tw.log 2>&1
if errorlevel 1 (set FAIL=1)
findstr /B "P8_TW" tests\p8_tw.log
echo.
if %FAIL%==0 (echo RESULT: PASS) else (echo RESULT: FAIL - send the tests\*.log files to Claude)
pause
