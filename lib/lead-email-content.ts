export type LeadEmailSummary = {
  kind: 'inquiry' | 'request';
  propertyName?: string | null;
  inquiryType?: string | null;
  prefecture?: string | null;
  city?: string | null;
  mustHaves?: string | null;
  submissionId: string;
};

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]!);
}

export function buildLeadNotification(summary: LeadEmailSummary, adminUrl: string) {
  const isInquiry = summary.kind === 'inquiry';
  const subject = isInquiry
    ? '【GARAGE HOUSE NAVI】物件への新しいお問い合わせ'
    : '【GARAGE HOUSE NAVI】新しい物件リクエスト';
  const details = isInquiry
    ? `<p>対象物件：${escapeEmailHtml(summary.propertyName || '物件情報を管理画面でご確認ください')}</p><p>問い合わせ内容：${escapeEmailHtml(summary.inquiryType || '物件ページからのお問い合わせ')}</p>`
    : `<p>希望エリア：${escapeEmailHtml([summary.prefecture, summary.city].filter(Boolean).join(' ') || '指定なし')}</p><p>希望条件：${escapeEmailHtml(summary.mustHaves || '指定なし')}</p>`;
  const safeAdminUrl = escapeEmailHtml(adminUrl);
  const text = [
    isInquiry ? '物件への新しいお問い合わせを受け付けました。' : '新しい物件リクエストを受け付けました。',
    isInquiry ? `対象物件: ${summary.propertyName || '管理画面でご確認ください'}` : `希望エリア: ${[summary.prefecture, summary.city].filter(Boolean).join(' ') || '指定なし'}`,
    ...(!isInquiry && summary.mustHaves ? [`希望条件: ${summary.mustHaves}`] : []),
    `管理画面で詳細をご確認ください: ${adminUrl}`,
  ].join('\n');

  return {
    subject,
    html: `<div style="font-family:Arial,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;line-height:1.8;color:#222"><p>${isInquiry ? '物件への新しいお問い合わせ' : '新しい物件リクエスト'}を受け付けました。</p>${details}<p><a href="${safeAdminUrl}">管理画面で詳細を確認する</a></p></div>`,
    text,
  };
}

export function buildLeadReceipt(kind: 'inquiry' | 'request', operatorName: string) {
  const message = kind === 'inquiry'
    ? 'お問い合わせを受け付けました。担当者より内容を確認のうえご連絡いたします。'
    : '物件リクエストを受け付けました。担当者より内容を確認のうえご連絡いたします。';
  return {
    subject: kind === 'inquiry' ? 'お問い合わせを受け付けました | GARAGE HOUSE NAVI' : '物件リクエストを受け付けました | GARAGE HOUSE NAVI',
    html: `<div style="font-family:Arial,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;line-height:1.8;color:#222"><p>お問い合わせありがとうございます。</p><p>${message}</p><p>${escapeEmailHtml(operatorName)}<br/>GARAGE HOUSE NAVI</p></div>`,
    text: `お問い合わせありがとうございます。\n${message}\n${operatorName}\nGARAGE HOUSE NAVI`,
  };
}
