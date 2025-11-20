const DEFAULT_PERCENTAGE = 50;
const EASE_FACTOR = 0.4; // Snappier response (was 0.25)
const ANIMATION_THRESHOLD = 0.1;

class Slider {
  constructor(sliderElement) {
    this.slider = sliderElement;
    this.beforeImage = this.slider.querySelector('.before');
    this.afterImage = this.slider.querySelector('.after');
    this.percentage = parseFloat(this.slider.dataset.percentage) || DEFAULT_PERCENTAGE;
    this.targetPercentage = this.percentage;
    this.isDragging = false;
    this.animationFrame = null;

    this.init();
  }

  async init() {
    this.setupElements();

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

  updateSlider() {
    this.afterImage.style.clipPath = `inset(0 ${100 - this.percentage}% 0 0)`;
    this.sliderLine.style.left = `${this.percentage}%`;
  }

  attachEvents() {
    // Prevent default drag behavior
    this.beforeImage.draggable = false;
    this.afterImage.draggable = false;

    // Mouse events
    this.slider.addEventListener('mousedown', this.handleStart);
    this.slider.addEventListener('mousemove', this.handleMove);
    document.addEventListener('mouseup', this.handleEnd);

    // Touch events - iOS optimized
    this.slider.addEventListener('touchstart', this.handleStart, { passive: false });
    this.slider.addEventListener('touchmove', this.handleMove, { passive: false });
    document.addEventListener('touchend', this.handleEnd);

    // Resize handling with native debounce
    let resizeTimeout;
    this.handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.updateSlider(), 100);
    };
    window.addEventListener('resize', this.handleResize);
  }

  handleStart = (e) => {
    e.preventDefault();
    this.isDragging = true;
    this.slider.classList.add('dragging');
    this.handleMove(e);
  };

  handleMove = (e) => {
    if (!this.isDragging && e.type === 'mousemove') return;

    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = this.slider.getBoundingClientRect();

    this.targetPercentage = ((clientX - rect.left) / rect.width) * 100;
    this.targetPercentage = Math.max(0, Math.min(100, this.targetPercentage));

    if (!this.animationFrame) {
      this.animate();
    }
  };

  handleEnd = () => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.slider.classList.remove('dragging');
  };

  animate = () => {
    const diff = this.targetPercentage - this.percentage;

    // Snappier easing - animation continues even after mouse exit
    this.percentage += diff * EASE_FACTOR;
    this.slider.dataset.percentage = this.percentage;
    this.updateSlider();

    // Continue until close enough to target
    if (Math.abs(diff) > ANIMATION_THRESHOLD) {
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
    this.slider.removeEventListener('mousedown', this.handleStart);
    this.slider.removeEventListener('mousemove', this.handleMove);
    document.removeEventListener('mouseup', this.handleEnd);

    this.slider.removeEventListener('touchstart', this.handleStart);
    this.slider.removeEventListener('touchmove', this.handleMove);
    document.removeEventListener('touchend', this.handleEnd);

    window.removeEventListener('resize', this.handleResize);

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

// Initialize all sliders
function initializeSliders() {
  const sliders = document.querySelectorAll('.image-slider');
  sliders.forEach(slider => {
    new Slider(slider);
  });
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSliders);
} else {
  initializeSliders();
}

// Export for module usage
export { Slider, initializeSliders };
