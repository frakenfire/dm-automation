export interface MessageData {
  name: string;
  recent_content_hint?: string;
  product_name: string;
  form_link?: string;
}

export const VARIANT_A_TEMPLATE = `안녕하세요 {{name}}님.
{{recent_content_hint}} 콘텐츠를 보고 연락드렸습니다.

피부 고민이나 스킨케어 루틴을 자연스럽게 소개하시는 톤이 P.CALM 제품과 잘 맞아 보여요.
현재 {{product_name}} 무가 시딩을 진행 중인데, 제품 체험에 관심 있으실까요?`;

export const VARIANT_B_TEMPLATE = `안녕하세요 {{name}}님.
P.CALM 시딩 담당자입니다.

현재 {{product_name}} 제품 체험 시딩을 진행 중입니다.
계정 분위기와 잘 맞아 보여 제안드립니다. 참여 가능하실까요?`;

export const POSITIVE_REPLY_TEMPLATE = `관심 가져주셔서 감사합니다.

아래 폼에 배송 정보와 업로드 가능 일정을 남겨주시면 확인 후 제품 발송드리겠습니다.
폼 안에는 제품 수령, 개인정보 수집, 콘텐츠 활용 동의 항목이 포함되어 있습니다.

배송/동의 폼:
{{form_link}}`;

export class MessageRenderer {
  public static render(template: string, data: MessageData): string {
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return rendered;
  }

  public static getVariantTemplate(variant: 'A' | 'B'): string {
    return variant === 'A' ? VARIANT_A_TEMPLATE : VARIANT_B_TEMPLATE;
  }
}
