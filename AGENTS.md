# 🎯 AGENTS.md - 글로벌 하네스 & Apps Script / Flutter 지침

> **"검증되지 않은 코드는 존재하지 않는다. 완료 기준은 '실행'이 아니라 '물리적 검증'이다."**

---

## 1. 7단계 검증 하네스 (Harness Rules)

모든 작업은 코드 작성 전후로 아래 7단계 게이트를 거쳐 물리적 증거 기반으로만 완료를 선언한다.

1. **Intake Gate**: 목표, 수정/실행 범위, 수정 금지 범위를 확인한다. 확신도 95% 이하 시 질문한다.
2. **Plan Gate**: 변경 파일, 실행 명령, UI 흐름, 검증 성공 기준, 롤백 경로를 사전 수립한다.
3. **Reality Gate**: 기존 정상 동작, API 계약, 파일 상태, DB 스키마, 테스트 상태를 직접 확인한다.
4. **Execution Gate**: 최소(surgical) 변경을 수행한다. 정상 동작 중인 기존 코드를 임의로 전면 재작성하지 않는다.
5. **Verification Gate**: Lint/Test 실행, 생성 파일 내용 재조회, UI 변경 시 스크린샷 및 렌더링 검증을 수행한다.
   - 프로젝트 내 검증 스크립트(`check-quality.js`, `check-reality.js`, `verify-ui.js`)를 반드시 실행한다.
6. **Report Gate**: 하단 템플릿에 따라 실제 상태와 일치하는 증거 기반 보고서를 작성한다. (거짓/추정 보고 금지)
7. **Memory Gate**: 작업 종료 시 `walkthrough.md`를 동기화하고 재발 방지책을 기록한다.

---

## 2. 운영 자동화 / Apps Script / clasp 작업 원칙

1. **clasp 실행 권한 격리**: `clasp push` 업로드 성공이 원격 함수 실행 성공을 보장하지 않는다. `clasp run` 실패 시 반복 인증 전 `.clasp.json`의 `projectId`, API Executable 배포, access 설정, 프로젝트 스코프를 점검한다.
2. **자기복구 지향**: 사용자에게 OAuth URL, callback, 인증 코드를 요구하는 흐름은 최종 수단이다. 기존 트리거 및 실행 경로 내에서 안전하게 자기복구(Self-recovery)하도록 설계한다.
3. **임시 백도어 생성 금지**: 임시 공개 웹앱, 토큰식 maintenance 엔드포인트 등 보안 취약점을 사용자의 명시적 승인 없이 임의로 생성하지 않는다.
4. **멱등적 트리거 제어**: `ScriptApp.getProjectTriggers()`로 중복 트리거를 철저히 방지한다. 새 트리거 생성 전 기존 핸들러를 완전히 삭제하고, 생성 후 감사 로그를 남긴다.
5. **안전 발송 장치**: 메일/Chat 자동화는 발송 전 실제 전송이나 시트 변경을 하지 않는 `preview`/`dry-run` 함수를 필수로 둔다.
6. **Chat 채널 폭탄 방지**: 정상 제외 대상자(퇴직, 미도래 등)를 Chat 명단 폭탄으로 전송하지 않으며, 실제 발송/실패 및 조치가 필요한 오류 중심으로 알림을 제한한다.

---

## 3. Flutter 근본 아키텍처 규칙 (Survival Skills)

- **Presentation (MVI)**: freezed `State`와 sealed `Action` 정의. `ChangeNotifier` ViewModel은 단일 진입점 `onAction`을 두고 `BuildContext`/네비게이션에 의존하지 않으며, `Root`(DI/구독)와 `Screen`(순수 UI)을 엄격히 분리한다.
- **Data & DI**: interface 기반 `DataSource`(DTO 처리)와 `Repository`(*Impl 매핑) 분리. 공유 상태는 `rxdart` `BehaviorSubject` 스트림을 활용하고, `diSetup()`에서 **ViewModel은 항상 `registerFactory`**로 주입한다.
- **에러 & 라우팅**: 예외 대신 `Result<D, E extends Error>` sealed 객체로 성공/실패 분기를 컴파일 타임에 강제화. `RoutePaths`로 경로 상수를 중앙 관리하고 `go_router`로 제어한다.
- **Fake 테스트**: Mocking 대신 명시적인 인메모리 `Fake` 객체를 작성해 UseCase/ViewModel을 격리 검증한다.

---

## 4. 작업 보고 템플릿

```text
[핵심 결론] 작업 결과를 한 문장으로 말한다. (확신도 XX%)

1. 수정 범위: (변경된 파일 및 경로)
2. 수정 이유: (작업의 의도 및 아키텍처적 일치성)
3. 실행한 검증: (물리적 성공 증거, 테스트 로그 등)
4. 실패 또는 미검증 항목: (미검증 대상 및 사유)
5. 다음에 할 일: (후속 개선 또는 연계 작업)
```
