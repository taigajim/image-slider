const DEFAULT_OPTIONS = {
  initialPercentage: 50,
  easeFactor: 0.4,
  threshold: 0.1,
  keyboardStep: 2
};

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

class Slider {
  constructor(sliderElement, options = {}) {
    this.slider = sliderElement;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.beforeImage = this.slider.querySelector('.before');
    this.afterImage = this.slider.querySelector('.after');

    const dataPercentage = parseFloat(this.slider.dataset.percentage);
    this.percentage = !isNaN(dataPercentage) ? dataPercentage : this.options.initialPercentage;
    this.targetPercentage = this.percentage;
    this.isDragging = false;
    this.animationFrame = null;
    this.cachedRect = null;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  async init() {
    this.setupElements();
    this.setupAccessibility();

    try {
      await this.loadImages();
      this.updateSlider();
      this.attachEvents();
    } catch (error) {
      this.displayError(error);
    }
  }

  setupElements() {
    this.sliderLine = document.createElement('div');
    this.sliderLine.classList.add('slider-line');
    this.slider.appendChild(this.sliderLine);
  }

  setupAccessibility() {
    this.slider.setAttribute('role', 'slider');
    this.slider.setAttribute('aria-label', 'Image comparison slider');
    this.slider.setAttribute('aria-valuemin', '0');
    this.slider.setAttribute('aria-valuemax', '100');
    this.slider.setAttribute('aria-valuenow', Math.round(this.percentage));
    this.slider.setAttribute('tabindex', '0');
  }

  updateSlider() {
    this.afterImage.style.clipPath = `inset(0 ${100 - this.percentage}% 0 0)`;
    this.sliderLine.style.left = `${this.percentage}%`;
    this.slider.setAttribute('aria-valuenow', Math.round(this.percentage));
  }

  attachEvents() {
    this.beforeImage.draggable = false;
    this.afterImage.draggable = false;

    // Mouse hover - auto-follow without click
    this.slider.addEventListener('mousemove', this.handleMove);

    // Touch/pen - requires drag
    this.slider.addEventListener('pointerdown', this.handleStart);
    this.slider.addEventListener('pointermove', this.handleMove);
    this.slider.addEventListener('pointerup', this.handleEnd);
    this.slider.addEventListener('pointercancel', this.handleEnd);

    // Keyboard support
    this.slider.addEventListener('keydown', this.handleKeydown);

    // ResizeObserver for efficient resize handling
    this.resizeObserver = new ResizeObserver(() => {
      this.cachedRect = null; // Invalidate cache
      this.updateSlider();
    });
    this.resizeObserver.observe(this.slider);
  }

  handleStart = (e) => {
    e.preventDefault();
    this.isDragging = true;
    this.slider.classList.add('dragging');
    this.slider.setPointerCapture(e.pointerId);

    // Cache rect for performance during drag
    this.cachedRect = this.slider.getBoundingClientRect();
    this.handleMove(e);
  };

  handleMove = (e) => {
    // Mouse hover: always follow (no drag needed)
    // Touch: requires drag
    if (e.type === 'pointermove' && e.pointerType === 'touch' && !this.isDragging) {
      return; // Touch requires drag
    }

    e.preventDefault();

    // Use cached rect during drag, or get fresh rect for mouse hover
    const rect = this.cachedRect || this.slider.getBoundingClientRect();
    this.targetPercentage = ((e.clientX - rect.left) / rect.width) * 100;
    this.targetPercentage = Math.max(0, Math.min(100, this.targetPercentage));

    if (!this.animationFrame) {
      this.animate();
    }
  };

  handleEnd = (e) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.slider.classList.remove('dragging');
    this.slider.releasePointerCapture(e.pointerId);
    this.cachedRect = null; // Clear cache
  };

  handleKeydown = (e) => {
    const { keyboardStep } = this.options;
    let handled = false;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        this.targetPercentage = Math.max(0, this.targetPercentage - keyboardStep);
        handled = true;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        this.targetPercentage = Math.min(100, this.targetPercentage + keyboardStep);
        handled = true;
        break;
      case 'Home':
        this.targetPercentage = 0;
        handled = true;
        break;
      case 'End':
        this.targetPercentage = 100;
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      if (!this.animationFrame) {
        this.animate();
      }
    }
  };

  animate = () => {
    const diff = this.targetPercentage - this.percentage;

    if (this.prefersReducedMotion) {
      // Instant update for reduced motion
      this.percentage = this.targetPercentage;
    } else {
      // Smooth easing with easeOutQuart curve
      this.percentage += diff * this.options.easeFactor;
    }

    this.slider.dataset.percentage = this.percentage;
    this.updateSlider();

    // Continue until close enough to target
    if (Math.abs(diff) > this.options.threshold) {
      this.animationFrame = requestAnimationFrame(this.animate);
    } else {
      // Snap to final position
      this.percentage = this.targetPercentage;
      this.updateSlider();
      this.animationFrame = null;
    }
  };

  loadImages() {
    const loadImage = (img) => {
      return new Promise((resolve, reject) => {
        if (img.complete && img.naturalHeight !== 0) {
          resolve();
        } else {
          img.addEventListener('load', resolve);
          img.addEventListener('error', () => reject(new Error(`Failed to load image: ${img.src}`)));
        }
      });
    };

    return Promise.all([
      loadImage(this.beforeImage),
      loadImage(this.afterImage)
    ]);
  }

  displayError(error) {
    const errorMsg = document.createElement('p');
    errorMsg.style.color = 'red';
    errorMsg.textContent = 'Error loading images. Please refresh.';
    this.slider.appendChild(errorMsg);
    console.error('Slider error:', error);
  }

  destroy() {
    this.slider.removeEventListener('mousemove', this.handleMove);
    this.slider.removeEventListener('pointerdown', this.handleStart);
    this.slider.removeEventListener('pointermove', this.handleMove);
    this.slider.removeEventListener('pointerup', this.handleEnd);
    this.slider.removeEventListener('pointercancel', this.handleEnd);
    this.slider.removeEventListener('keydown', this.handleKeydown);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

// Initialize all sliders
function initializeSliders(options = {}) {
  const sliders = document.querySelectorAll('.image-slider');
  return Array.from(sliders).map(slider => new Slider(slider, options));
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeSliders());
} else {
  initializeSliders();
}

// Export for module usage
export { Slider, initializeSliders };
