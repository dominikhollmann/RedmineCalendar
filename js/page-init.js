// @ts-nocheck
import { t } from './i18n.js';
import { attachLabelTooltip } from './anomaly-render.js';

const settingsLink = document.querySelector('.settings-link');
if (settingsLink) {
  const settingsTitle = t('page.settings_title');
  settingsLink.setAttribute('aria-label', settingsTitle);
  attachLabelTooltip(settingsLink, settingsTitle, 'settings-link-tooltip');
}
document.getElementById('error-settings-link').textContent = t('page.go_to_settings');
document.getElementById('error-retry').textContent = t('page.retry');
const docsBtn = document.querySelector('.docs-help-btn');
if (docsBtn) {
  docsBtn.setAttribute('aria-label', t('docs.open_btn'));
  attachLabelTooltip(docsBtn, t('docs.open_btn'), 'docs-help-tooltip');
}
const chatbotBtn = document.querySelector('.chatbot-open-btn');
if (chatbotBtn) {
  chatbotBtn.setAttribute('aria-label', t('chatbot.open_btn'));
  attachLabelTooltip(chatbotBtn, t('chatbot.open_btn'), 'chatbot-open-tooltip');
}
document
  .getElementById('clipboard-banner-clear')
  ?.setAttribute('aria-label', t('calendar.clipboard_clear_aria'));
document.getElementById('docs-panel')?.setAttribute('aria-label', t('docs.panel_title'));
document
  .querySelector('#docs-panel .docs-panel__close')
  ?.setAttribute('aria-label', t('docs.close_btn'));
document.getElementById('chatbot-panel')?.setAttribute('aria-label', t('chatbot.panel_title'));
document
  .querySelector('#chatbot-panel .chatbot-panel__close')
  ?.setAttribute('aria-label', t('a11y.chatbot.close'));
document.getElementById('chatbot-audio-btn')?.setAttribute('aria-label', t('voice.start'));
const chatbotInputLabel = document.getElementById('chatbot-input-label');
if (chatbotInputLabel) chatbotInputLabel.textContent = t('chatbot.input_placeholder');
