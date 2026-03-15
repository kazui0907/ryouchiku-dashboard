// ===========================
// ヘッダースクロール効果
// ===========================
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // スクロール位置によってヘッダーのスタイルを変更
    if (currentScroll > 100) {
        header.style.padding = '12px 0';
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
    } else {
        header.style.padding = '24px 0';
        header.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===========================
// スムーススクロール
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===========================
// メニュートグル（モバイル）
// ===========================
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        menuToggle.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });
}

// ===========================
// スクロールアニメーション
// ===========================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// アニメーション対象の要素を観察
const animateElements = document.querySelectorAll('.collection-item, .product-showcase, .story-grid, .info-grid');
animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
});

// ===========================
// ヒーローイメージのフェードイン
// ===========================
window.addEventListener('load', () => {
    const heroSlide = document.querySelector('.hero-slide');
    if (heroSlide) {
        heroSlide.classList.add('active');
    }
});

// ===========================
// 画像の遅延読み込み
// ===========================
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
            imageObserver.unobserve(img);
        }
    });
});

document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});

// ===========================
// パララックス効果（ヒーロー）
// ===========================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.hero-slide img');

    if (heroImage && scrolled < window.innerHeight) {
        heroImage.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// ===========================
// カートアイコンのアニメーション
// ===========================
const cartIcon = document.querySelector('.header-icons a[href="#cart"]');

if (cartIcon) {
    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        cartIcon.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartIcon.style.transform = 'scale(1)';
        }, 200);
    });
}

// ===========================
// コレクションアイテムのホバー効果
// ===========================
const collectionItems = document.querySelectorAll('.collection-item');

collectionItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-8px)';
    });

    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0)';
    });
});

// ===========================
// フォームバリデーション（将来の拡張用）
// ===========================
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

// ===========================
// パフォーマンス最適化：デバウンス
// ===========================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// スクロールイベントをデバウンス
const debouncedScroll = debounce(() => {
    // 追加のスクロール処理がある場合はここに記述
}, 100);

window.addEventListener('scroll', debouncedScroll);

console.log('茶の大胡 - ウェブサイト初期化完了');
