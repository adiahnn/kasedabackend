#!/bin/bash
# KASEDA Market Backend — Security & Stress Test Suite
# Usage: bash security-test.sh <BASE_URL>
# Example: bash security-test.sh https://kasedabackend.vercel.app

BASE="${1:-http://localhost:5000}"
API="$BASE/api"
PASS=0
FAIL=0
WARN=0
REPORT=""

log_pass() { ((PASS++)); REPORT+="[PASS] $1\n"; echo -e "\033[32m[PASS]\033[0m $1"; }
log_fail() { ((FAIL++)); REPORT+="[FAIL] $1\n"; echo -e "\033[31m[FAIL]\033[0m $1"; }
log_warn() { ((WARN++)); REPORT+="[WARN] $1\n"; echo -e "\033[33m[WARN]\033[0m $1"; }
log_info() { echo -e "\033[36m[INFO]\033[0m $1"; }

# ─── Helper ───────────────────────────────────────────────────
admin_token() {
  curl -s --max-time 10 -X POST "$API/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaseda.gov.ng","password":"kaseda2026"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])' 2>/dev/null
}

echo "=========================================="
echo " KASEDA Market Security Test Suite"
echo " Target: $BASE"
echo " Date: $(date)"
echo "=========================================="
echo ""

# ═══════════════════════════════════════════════════════════════
# 1. AUTHENTICATION TESTS
# ═══════════════════════════════════════════════════════════════
log_info "=== 1. AUTHENTICATION TESTS ==="

# 1.1 Admin login with wrong credentials
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$API/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","password":"wrong"}')
[ "$CODE" = "401" ] && log_pass "Admin login rejects wrong credentials (401)" || log_fail "Admin login returned $CODE for wrong credentials (expected 401)"

# 1.2 Admin login with empty body
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$API/admin/auth/login" \
  -H "Content-Type: application/json" -d '{}')
[ "$CODE" = "400" ] && log_pass "Admin login rejects empty body (400)" || log_fail "Admin login returned $CODE for empty body (expected 400)"

# 1.3 Protected route without token
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API/admin/stats")
[ "$CODE" = "401" ] && log_pass "Protected route rejects missing token (401)" || log_fail "Protected route returned $CODE without token (expected 401)"

# 1.4 Protected route with invalid token
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API/admin/stats" \
  -H "Authorization: Bearer invalidtoken123")
[ "$CODE" = "401" ] && log_pass "Protected route rejects invalid token (401)" || log_fail "Protected route returned $CODE with invalid token (expected 401)"

# 1.5 Protected route with expired/tampered JWT
FAKE_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0FkbWluIjp0cnVlLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMX0.fakesignature"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API/admin/stats" \
  -H "Authorization: Bearer $FAKE_JWT")
[ "$CODE" = "401" ] && log_pass "Protected route rejects tampered JWT (401)" || log_fail "Protected route returned $CODE with tampered JWT (expected 401)"

# 1.6 User auth - missing fields
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$API/auth/login" \
  -H "Content-Type: application/json" -d '{}')
[ "$CODE" = "400" ] || [ "$CODE" = "401" ] && log_pass "User login handles empty body ($CODE)" || log_fail "User login returned $CODE for empty body"

# ═══════════════════════════════════════════════════════════════
# 2. NoSQL INJECTION TESTS
# ═══════════════════════════════════════════════════════════════
log_info "=== 2. NoSQL INJECTION TESTS ==="

# 2.1 Login with $gt operator injection
BODY='{"email":{"$gt":""},"password":{"$gt":""}}'
RESP=$(curl -s --max-time 10 -X POST "$API/auth/login" \
  -H "Content-Type: application/json" -d "$BODY")
if echo "$RESP" | grep -q "token"; then
  log_fail "CRITICAL: NoSQL injection on user login succeeded — attacker can bypass auth"
else
  log_pass "User login not vulnerable to \$gt injection"
fi

# 2.2 Admin login with $gt operator injection
RESP=$(curl -s --max-time 10 -X POST "$API/admin/auth/login" \
  -H "Content-Type: application/json" -d "$BODY")
if echo "$RESP" | grep -q "token"; then
  log_fail "CRITICAL: NoSQL injection on admin login succeeded"
else
  log_pass "Admin login not vulnerable to \$gt injection"
fi

# 2.3 Login with $ne injection
BODY='{"email":{"$ne":""},"password":{"$ne":""}}'
RESP=$(curl -s --max-time 10 -X POST "$API/auth/login" \
  -H "Content-Type: application/json" -d "$BODY")
if echo "$RESP" | grep -q "token"; then
  log_fail "CRITICAL: NoSQL injection via \$ne on user login"
else
  log_pass "User login not vulnerable to \$ne injection"
fi

# 2.4 Regex injection in search
TOKEN=$(admin_token)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
  "$API/admin/users?search=.*" -H "Authorization: Bearer $TOKEN")
[ "$CODE" = "200" ] && log_warn "Search accepts regex patterns — potential ReDoS vector" || log_pass "Search handles regex safely"

# 2.5 Evil regex for ReDoS
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  "$API/admin/users?search=(a%2B)%2B%24" -H "Authorization: Bearer $TOKEN")
[ "$CODE" = "200" ] && log_warn "Search accepts complex regex — ReDoS risk" || log_pass "Complex regex handled"

# ═══════════════════════════════════════════════════════════════
# 3. AUTHORIZATION TESTS
# ═══════════════════════════════════════════════════════════════
log_info "=== 3. AUTHORIZATION TESTS ==="

# 3.1 User token on admin routes
USER_RESP=$(curl -s --max-time 10 -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')
USER_TOKEN=$(echo "$USER_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))' 2>/dev/null)

if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "$API/admin/stats" -H "Authorization: Bearer $USER_TOKEN")
  [ "$CODE" = "401" ] || [ "$CODE" = "403" ] && log_pass "User token rejected on admin routes ($CODE)" || log_fail "User token accepted on admin route (returned $CODE)"
else
  log_info "No test user available — skipping user→admin escalation test"
fi

# ═══════════════════════════════════════════════════════════════
# 4. INPUT VALIDATION TESTS
# ═══════════════════════════════════════════════════════════════
log_info "=== 4. INPUT VALIDATION TESTS ==="

# 4.1 XSS in registration
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"<script>alert(1)</script>","email":"xss@test.com","password":"test123","phone":"1234567890","role":"buyer","lga":"Katsina"}')
log_warn "Registration accepts HTML in fullName — stored XSS risk (returned $CODE)"

# 4.2 Oversized payload
BIGDATA=$(python3 -c "print('{\"email\":\"' + 'A'*1000000 + '@test.com\",\"password\":\"test\"}')")
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$API/auth/login" \
  -H "Content-Type: application/json" -d "$BIGDATA")
[ "$CODE" = "413" ] && log_pass "Server rejects oversized payloads (413)" || log_warn "Server accepted 1MB payload (returned $CODE) — no payload size limit"

# 4.3 Invalid MongoDB ObjectId
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  "$API/admin/users/notavalidid" -H "Authorization: Bearer $TOKEN")
[ "$CODE" = "400" ] || [ "$CODE" = "500" ] && \
  { [ "$CODE" = "500" ] && log_warn "Invalid ObjectId causes 500 — should be 400" || log_pass "Invalid ObjectId handled (400)"; } \
  || log_pass "Invalid ObjectId handled ($CODE)"

# 4.4 Negative pagination
RESP=$(curl -s --max-time 10 "$API/admin/users?page=-1&limit=999999" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"users"'; then
  log_warn "Negative page / huge limit accepted — no pagination bounds"
else
  log_pass "Pagination bounds enforced"
fi

# ═══════════════════════════════════════════════════════════════
# 5. RATE LIMITING TESTS
# ═══════════════════════════════════════════════════════════════
log_info "=== 5. RATE LIMITING TESTS ==="

BLOCKED=0
for i in $(seq 1 20); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -X POST "$API/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"brute@force.com","password":"attempt'$i'"}')
  [ "$CODE" = "429" ] && BLOCKED=1 && break
done
[ "$BLOCKED" = "1" ] && log_pass "Rate limiting active on login (429 after rapid requests)" || log_fail "No rate limiting on login — brute force possible (20 attempts, no block)"

# ═══════════════════════════════════════════════════════════════
# 6. SECURITY HEADERS TEST
# ═══════════════════════════════════════════════════════════════
log_info "=== 6. SECURITY HEADERS ==="

HEADERS=$(curl -s -D - -o /dev/null --max-time 10 "$BASE/")

echo "$HEADERS" | grep -qi "x-content-type-options" && log_pass "X-Content-Type-Options header present" || log_fail "Missing X-Content-Type-Options header"
echo "$HEADERS" | grep -qi "x-frame-options" && log_pass "X-Frame-Options header present" || log_fail "Missing X-Frame-Options header"
echo "$HEADERS" | grep -qi "strict-transport-security" && log_pass "Strict-Transport-Security header present" || log_warn "Missing HSTS header (may be handled by Vercel)"
echo "$HEADERS" | grep -qi "x-xss-protection" && log_pass "X-XSS-Protection header present" || log_warn "Missing X-XSS-Protection header"
echo "$HEADERS" | grep -qi "x-powered-by" && log_fail "X-Powered-By header exposed (leaks tech stack)" || log_pass "X-Powered-By header hidden"

# ═══════════════════════════════════════════════════════════════
# 7. INFORMATION LEAKAGE
# ═══════════════════════════════════════════════════════════════
log_info "=== 7. INFORMATION LEAKAGE ==="

# 7.1 Error response on bad route
RESP=$(curl -s --max-time 10 "$API/nonexistent")
if echo "$RESP" | grep -qi "stack\|trace\|node_modules\|at "; then
  log_fail "Stack traces exposed in error responses"
else
  log_pass "No stack traces in error responses"
fi

# 7.2 Check if env vars leak
RESP=$(curl -s --max-time 10 "$BASE/")
if echo "$RESP" | grep -qi "mongo\|jwt_secret\|password\|cloudinary"; then
  log_fail "Sensitive info leaked in health endpoint"
else
  log_pass "No sensitive info in health endpoint"
fi

# ═══════════════════════════════════════════════════════════════
# 8. STRESS TEST (10 concurrent requests)
# ═══════════════════════════════════════════════════════════════
log_info "=== 8. STRESS TEST ==="

TOKEN=$(admin_token)
log_info "Sending 10 concurrent requests to /admin/stats..."
TIMES=""
ERRORS=0
for i in $(seq 1 10); do
  {
    START=$(date +%s%N)
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
      "$API/admin/stats" -H "Authorization: Bearer $TOKEN")
    END=$(date +%s%N)
    MS=$(( (END - START) / 1000000 ))
    [ "$CODE" != "200" ] && ((ERRORS++))
    echo "$MS"
  } &
done > /tmp/kaseda_stress_times.txt
wait

TIMES=$(cat /tmp/kaseda_stress_times.txt 2>/dev/null)
if [ -n "$TIMES" ]; then
  AVG=$(echo "$TIMES" | awk '{s+=$1} END {printf "%.0f", s/NR}')
  MAX=$(echo "$TIMES" | sort -n | tail -1)
  log_info "Avg response: ${AVG}ms | Max: ${MAX}ms | Errors: $ERRORS/10"
  [ "$ERRORS" -gt 3 ] && log_warn "High error rate under load ($ERRORS/10 failed)" || log_pass "Server handles concurrent load ($ERRORS/10 errors)"
else
  log_warn "Could not measure stress test times"
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "=========================================="
echo " TEST SUMMARY"
echo "=========================================="
echo -e "\033[32m PASSED: $PASS\033[0m"
echo -e "\033[33m WARNINGS: $WARN\033[0m"
echo -e "\033[31m FAILED: $FAIL\033[0m"
echo " TOTAL: $((PASS + WARN + FAIL))"
echo "=========================================="

rm -f /tmp/kaseda_stress_times.txt
