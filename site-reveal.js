/* site-reveal.js — スクロール表示演出（.reveal を画面に入ったら表示）。
   about.html と business/ 配下で共有。defer で読む。トップは index.html 内に持つ。 */
(function(){
  // スクロール表示演出（トップページと同じクラス名・しきい値）
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }
  const io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function(el){ io.observe(el); });
})();
