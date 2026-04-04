# Supabase 인증 메일 — 한글화 + 커스텀 발신 주소 (bill-io.com)

기본값은 **영문 템플릿**과 **`noreply@mail.app.supabase.io`** 발신입니다.  
**한글 본문**과 **`admin@bill-io.com`** 같은 브랜드 발신은 **코드가 아니라 Supabase 프로젝트 설정**에서 처리합니다.

> 도메인은 [https://www.bill-io.com/](https://www.bill-io.com/) 기준 **`bill-io.com`** 입니다.  
> 메일 주소는 **`admin@bill-io.com`** 을 권장합니다. (`bil-io`는 DNS·메일서버에 등록한 실제 도메인과 반드시 일치시키세요.)

---

## 1. 발신 주소를 바꾸려면 (필수: 커스텀 SMTP)

Supabase가 대신 보내는 기본 채널에서는 **임의의 From 주소만 바꿀 수 없습니다.**  
`admin@bill-io.com`으로내려면:

1. **`bill-io.com` 도메인**에서 실제로 메일을 발송할 수 있게 준비합니다.  
   - 예: **Google Workspace**, **Microsoft 365**, **Zoho Mail**, 또는 **Resend / SendGrid / AWS SES** 등 트랜잭션 메일 + 도메인 인증(SPF/DKIM).
2. Supabase 대시보드 → **Project Settings** → **Authentication** (또는 **Authentication** 메뉴 하위) → **SMTP Settings** 로 이동합니다.
3. **Enable custom SMTP** 를 켜고, 사용 중인 제공업체가 안내하는 값을 넣습니다.  
   - **Sender email**: `admin@bill-io.com`  
   - **Sender name**: 예) `FlowBill` 또는 `FlowBill AI`
4. SPF / DKIM / DMARC 를 제공업체 가이드대로 `bill-io.com` DNS에 추가합니다. (스팸함 방지에 중요)

SMTP 호스트·포트·계정은 **선택한 서비스마다 다릅니다.** (Resend·SendGrid 문서의 SMTP 섹션 참고)

---

## 2. 한글 이메일 템플릿 (복사해 대시보드에 붙여넣기)

**위치:** Supabase 대시보드 → **Authentication** → **Email Templates**

각 템플릿의 **Subject**와 **Body**를 아래로 바꿉니다.  
링크에는 Supabase가 채워 주는 변수 `{{ .ConfirmationURL }}` 을 그대로 사용합니다.

### 2.1 Confirm signup (회원가입 확인) — 제목

```
[FlowBill] 회원가입을 위해 이메일 인증을 완료해 주세요
```

### 2.2 Confirm signup — 본문 (HTML)

```html
<p>안녕하세요.</p>
<p><strong>FlowBill</strong>(bill-io.com) 회원가입이 접수되었습니다.</p>
<p>아래 버튼을 눌러 <strong>이메일 인증</strong>을 완료한 뒤, 서비스에 로그인해 주세요.</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    이메일 인증하기
  </a>
</p>
<p style="font-size:13px;color:#6b7280;">버튼이 동작하지 않으면 아래 주소를 브라우저에 복사해 붙여넣으세요.</p>
<p style="font-size:12px;word-break:break-all;color:#374151;">{{ .ConfirmationURL }}</p>
<p style="font-size:13px;color:#6b7280;margin-top:24px;">본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.</p>
<p style="font-size:13px;color:#9ca3af;">— FlowBill · <a href="https://www.bill-io.com/" style="color:#6b7280;">bill-io.com</a></p>
```

### 2.3 Reset password (비밀번호 재설정) — 제목

```
[FlowBill] 비밀번호 재설정 안내
```

### 2.4 Reset password — 본문 (HTML)

```html
<p>안녕하세요.</p>
<p><strong>FlowBill</strong> 계정 비밀번호 재설정을 요청하셨습니다.</p>
<p>아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 일정 시간 후 만료될 수 있습니다.</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    비밀번호 재설정하기
  </a>
</p>
<p style="font-size:13px;color:#6b7280;">버튼이 동작하지 않으면 아래 주소를 복사해 주세요.</p>
<p style="font-size:12px;word-break:break-all;color:#374151;">{{ .ConfirmationURL }}</p>
<p style="font-size:13px;color:#6b7280;margin-top:24px;">요청하지 않으셨다면 이 메일은 무시하세요. 비밀번호는 바뀌지 않습니다.</p>
<p style="font-size:13px;color:#9ca3af;">— FlowBill · <a href="https://www.bill-io.com/" style="color:#6b7280;">bill-io.com</a></p>
```

### 2.5 Magic Link (사용 시) — 제목

```
[FlowBill] 로그인 링크
```

### 2.6 Magic Link — 본문 (HTML)

```html
<p>아래 링크를 눌러 FlowBill에 로그인하세요.</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    로그인하기
  </a>
</p>
<p style="font-size:12px;word-break:break-all;color:#374151;">{{ .ConfirmationURL }}</p>
<p style="font-size:13px;color:#9ca3af;">— FlowBill · bill-io.com</p>
```

### 2.7 Change email address (이메일 변경) — 제목

```
[FlowBill] 이메일 주소 변경 확인
```

### 2.8 Change email address — 본문 (HTML)

```html
<p>이메일 주소 변경을 완료하려면 아래 링크를 눌러 주세요.</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    변경 확인하기
  </a>
</p>
<p style="font-size:12px;word-break:break-all;">{{ .ConfirmationURL }}</p>
```

---

## 3. Site URL과 앱 연동

인증 링크가 **프로덕션 도메인**으로 열리게 하려면:

- **Authentication → URL Configuration** 에서 **Site URL** 을 `https://www.bill-io.com` (또는 실제 로그인 진입 URL)로 맞춥니다.
- **Redirect URLs** 에 `https://www.bill-io.com/auth/callback` 등 실제 사용 주소를 등록합니다.  
  (자세한 항목은 [deployment.md](./deployment.md) 참고)

앱의 `NEXT_PUBLIC_SITE_URL` 도 동일한 공개 URL을 쓰는 것이 좋습니다. (`.env.example` 참고)

---

## 4. 정리

| 목적 | 어디서 설정 |
|------|-------------|
| 메일 **한글** | Authentication → **Email Templates** |
| 발신 **admin@bill-io.com** | **Custom SMTP** + 도메인 인증 |
| 링크가 bill-io.com으로 열림 | **URL Configuration** + 앱 `NEXT_PUBLIC_SITE_URL` |

**`admin@bill-io.com` “만들기”**는 Supabase가 아니라 **도메인 메일/트랜잭션 메일 서비스**에서 사서함 또는 발송 도메인을 등록하면 됩니다.
