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

  document.addEventListener('DOMContentLoaded', function () {
    // UTM из sessionStorage → скрытые поля формы (какой канал дал заявку)
    const saved = JSON.parse(sessionStorage.getItem('validation_utm') || '{}');
    Object.keys(saved).forEach(function (k) {
      document.querySelectorAll('input[name="' + k + '"]').forEach(function (el) {
        el.value = saved[k];
      });
    });

    // AJAX-отправка: цель успевает долететь, юзер видит «Спасибо» на русском вместо страницы Formspree
    const form = document.querySelector('form[action*="formspree"]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
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

    // Channel selector: подсветка активного канала + placeholder/inputmode + скрытое поле channel
    const group = document.getElementById('channel-group');
    if (group) {
      const input = document.querySelector('input[name="contact"]');
      const hidden = document.querySelector('input[name="channel"]');
      const btns = group.querySelectorAll('.channel-btn');
      function setChannel(btn) {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (hidden) hidden.value = btn.dataset.channel;
        if (input) {
          input.placeholder = btn.dataset.ph;
          input.setAttribute('inputmode', btn.dataset.mode);
        }
      }
      btns.forEach(function (b) {
        b.addEventListener('click', function () { setChannel(b); if (input) input.focus(); });
      });
      if (btns[0]) setChannel(btns[0]);
    }
  });
})();
