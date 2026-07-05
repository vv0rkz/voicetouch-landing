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

    const form = document.querySelector('form[action*="formspree"]');
    if (form) {
      form.addEventListener('submit', function () {
        goal('lead_submit');
      });
    }

    document.querySelectorAll('a[href="#lead"]').forEach(function (el) {
      el.addEventListener('click', function () {
        goal('cta_click');
      });
    });
  });
})();
