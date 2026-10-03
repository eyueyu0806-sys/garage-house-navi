import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLeadNotification,buildLeadReceipt,escapeEmailHtml} from '../lib/lead-email-content';

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
