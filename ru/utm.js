/**
 * UTM capture + скрытые поля формы + события-цели (Метрика / GA4)
 * Один и тот же файл для ru/ и kz/: счётчики вызываются только если инициализированы в index.html.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const utm = {};
  keys.forEach((k) => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });
  if (Object.keys(utm).length) {
    sessionStorage.setItem('validation_utm', JSON.stringify(utm));
  }

  function goal(name) {
    if (window.METRIKA_ID && window.ym) ym(window.METRIKA_ID, 'reachGoal', name);
    if (window.gtag) gtag('event', name);
  }

  // Маска телефона RU/KZ (обе страны +7): любой ввод → +7 (XXX) XXX-XX-XX.
  // Разделители добавляются только когда за ними есть цифра → Backspace не «залипает» на ) и -.
  function formatPhoneRuKz(raw) {
    let d = (raw || '').replace(/\D/g, '');
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d && d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    if (!d) return '';
    const r = d.slice(1);
    let out = '+7';
    if (r.length > 0) out += ' (' + r.slice(0, 3);
    if (r.length > 3) out += ') ' + r.slice(3, 6);
    if (r.length > 6) out += '-' + r.slice(6, 8);
    if (r.length > 8) out += '-' + r.slice(8, 10);
    return out;
  }

  // Проверка контакта по каналу (мягкая, чтобы отсеять явные опечатки)
  function validateContact(channel, contact) {
    const v = (contact || '').trim();
    if (!v) return 'Укажите контакт, чтобы мы могли написать.';
    if (channel === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Похоже, почта введена не полностью. Пример: mail@mail.com';
    } else if (channel === 'whatsapp') {
      if (v.replace(/\D/g, '').length !== 11) return 'Номер должен быть из 11 цифр: +7 и ещё 10.';
    } else if (channel === 'telegram') {
      if (!/^[a-zA-Z0-9_]{5,32}$/.test(v.replace(/^@+/, ''))) return 'Ник в Telegram — 5–32 символа: латиница, цифры, «_».';
    }
    return '';
  }

  // Готовая ссылка из канала + контакта: t.me / wa.me / mailto
  function buildContactLink(channel, contact) {
    const v = (contact || '').trim();
    if (!v) return '';
    if (channel === 'telegram') {
      const u = v.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').replace(/^@+/, '').replace(/\s+/g, '');
      return u ? 'https://t.me/' + u : '';
    }
    if (channel === 'whatsapp') {
      let d = v.replace(/\D/g, '');
      if (d.charAt(0) === '8') d = '7' + d.slice(1);
      return d ? 'https://wa.me/' + d : '';
    }
    if (channel === 'email') {
      return 'mailto:' + v;
    }
    return v;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // UTM из sessionStorage → скрытые поля формы (какой канал дал заявку)
    const saved = JSON.parse(sessionStorage.getItem('validation_utm') || '{}');
    Object.keys(saved).forEach(function (k) {
      document.querySelectorAll('input[name="' + k + '"]').forEach(function (el) {
        el.value = saved[k];
      });
    });

    // A/B цены: по умолчанию цена ПОКАЗАНА (базовая версия); скрывается только при utm_content=noprice
    // в ТЕКУЩЕМ URL (не из sessionStorage — иначе прошлый noprice-визит «прилипал» бы к базовым заходам).
    // Вариант пишется в скрытое поле price_shown → виден в заявке; в аналитике сегментируется по utm_content.
    const priceVariant = (params.get('utm_content') || '').toLowerCase() === 'noprice' ? 'noprice' : 'price';
    const pb = document.getElementById('price-block');
    if (pb && priceVariant === 'noprice') pb.classList.add('hidden');
    const psField = document.querySelector('input[name="price_shown"]');
    if (psField) psField.value = priceVariant;

    const input = document.querySelector('input[name="contact"]');
    const channelField = document.querySelector('input[name="channel"]');
    const linkField = document.querySelector('input[name="contact_link"]');
    const errEl = document.getElementById('contact-error');
    function clearError() { if (errEl) errEl.classList.add('hidden'); }

    // AJAX-отправка: цель успевает долететь, юзер видит «Спасибо» на русском вместо страницы Formspree
    const form = document.querySelector('form[action*="formspree"]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const channel = channelField ? channelField.value : '';
        // валидация контакта по выбранному каналу
        const err = validateContact(channel, input ? input.value : '');
        if (err) {
          if (errEl) { errEl.textContent = err; errEl.classList.remove('hidden'); }
          if (input) input.focus();
          return;
        }
        clearError();
        // готовая ссылка на контакт → скрытое поле (в заявке будет кликабельный t.me/wa.me/mailto)
        if (linkField) linkField.value = buildContactLink(channel, input ? input.value : '');
        const btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }
        fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        }).then(function (r) {
          if (!r.ok) throw new Error('formspree ' + r.status);
          goal('lead_submit');
          form.innerHTML = '<p class="text-lg text-zinc-100 font-medium text-center py-10">Спасибо! Заявка получена.<br><span class="text-zinc-400 text-base">Напишем, когда откроем доступ.</span></p>';
        }).catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Получить ранний доступ'; }
          alert('Не получилось отправить заявку. Попробуйте ещё раз чуть позже.');
        });
      });
    }

    document.querySelectorAll('a[href="#lead"]').forEach(function (el) {
      el.addEventListener('click', function () {
        goal('cta_click');
      });
    });

    // Channel selector: подсветка + placeholder/inputmode + скрытое поле channel + маска телефона
    const group = document.getElementById('channel-group');
    if (group) {
      const btns = group.querySelectorAll('.channel-btn');
      let currentMode = 'text';
      function setChannel(btn) {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        if (channelField) channelField.value = btn.dataset.channel;
        if (input) {
          input.placeholder = btn.dataset.ph;
          input.setAttribute('inputmode', btn.dataset.mode);
        }
      }
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          if (input && b.dataset.channel !== channelField.value) input.value = '';
          clearError();
          setChannel(b);
          if (input) input.focus();
        });
      });
      // формат телефона на лету только в режиме tel (WhatsApp) + скрытие ошибки при вводе
      if (input) {
        input.addEventListener('input', function () {
          if (currentMode === 'tel') input.value = formatPhoneRuKz(input.value);
          clearError();
        });
      }
      if (btns[0]) setChannel(btns[0]);
    }
  });
})();
