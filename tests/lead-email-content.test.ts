import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLeadNotification,buildLeadReceipt,escapeEmailHtml,resolveLeadNotificationRecipient} from '../lib/lead-email-content';

test('dedicated lead notification address takes precedence without changing operator contact',()=>{
 assert.equal(resolveLeadNotificationRecipient(' asc.yw1233@gmail.com ','info@example.jp'),'asc.yw1233@gmail.com');
 assert.equal(resolveLeadNotificationRecipient('', 'info@example.jp'),'info@example.jp');
 assert.equal(resolveLeadNotificationRecipient(undefined, undefined),null);
});

test('email HTML escapes user-controlled text and dashboard URL',()=>{
 assert.equal(escapeEmailHtml(`<script a="b">&'`),'&lt;script a=&quot;b&quot;&gt;&amp;&#39;');
 const email=buildLeadNotification({kind:'inquiry',submissionId:'id',propertyName:'<img src=x>',inquiryType:'内見したい'},'https://garage.example/<admin>');
 assert.match(email.html,/&lt;img src=x&gt;/);
 assert.doesNotMatch(email.html,/<img src=x>/);
 assert.ok(email.html.includes('https://garage.example/&lt;admin&gt;'));
});

test('receipt email contains acknowledgement but no submitted contact details',()=>{
 const email=buildLeadReceipt('request','株式会社ASC');
 assert.match(email.subject,/物件リクエスト/);
 assert.match(email.text,/担当者より内容を確認/);
 assert.doesNotMatch(email.text,/example@email\.com|09012345678/);
});

test('request notification includes selected garage dimensions',()=>{
 const email=buildLeadNotification({kind:'request',submissionId:'id',prefecture:'osaka',mustHaves:'幅 5500 mm以上 / 奥行 6200 mm以上'},'https://garage.example/admin/requests');
 assert.match(email.text,/幅 5500 mm以上 \/ 奥行 6200 mm以上/);
 assert.match(email.html,/希望条件：幅 5500 mm以上 \/ 奥行 6200 mm以上/);
});
