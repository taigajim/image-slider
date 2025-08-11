window.addEventListener("load", () => {
  // Default position of the slider line (50% means showing equal parts of before/after images)
  const DEFAULT_PERCENTAGE = 50;

  /**
   * Slider class implements a before/after image comparison widget
   * Allows users to drag or click to reveal different amounts of each image
   * Handles touch and mouse events, with smooth animations and error handling
   */
  class Slider {
    // Creates a new slider instance and initializes all required components
    constructor(sliderElement) {
      // Core elements and state
      this.slider = sliderElement;
      this.beforeImage = this.slider.querySelector(".before");
      this.afterImage = this.slider.querySelector(".after");
      this.percentage = parseInt(this.slider.dataset.percentage) || DEFAULT_PERCENTAGE;
      this.isDragging = false;
      this.animationFrame = null;
      this.isHovering = false;
      this.lastPercentage = this.percentage;
      this.targetPercentage = this.percentage;
      this.isAnimating = false;

      this.initBoundMethods();
      this.init();
    }

    /**
     * Binds class methods to maintain correct 'this' context
     * Uses debounce for resize handler to improve performance
     */
    initBoundMethods() {
      this.handleDragStart = this.handleDragStart.bind(this);
      this.handleMove = this.handleMove.bind(this);
      this.handleDragEnd = this.handleDragEnd.bind(this);
      this.handleMouseEnter = this.handleMouseEnter.bind(this);
      this.handleMouseLeave = this.handleMouseLeave.bind(this);
      this.handleResize = this.debounce(this.updateSlider.bind(this), 100);
    }

    /**
     * Initializes the slider by setting up DOM elements and loading images
     * Attaches event listeners only after images are successfully loaded
     */
    init() {
      this.setupElements();
      this.waitForImages()
        .then(() => {
          this.isReady = true;
          this.updateSlider();
          this.attachEvents();
          console.log("Slider initialized successfully");
        })
        .catch((error) => {
          console.error("Error loading images:", error);
          this.displayError();
        });
    }

    /**
     * Creates and adds the vertical slider line element to the DOM
     * This line visually separates the before/after images
     */
    setupElements() {
      this.sliderLine = document.createElement("div");
      this.sliderLine.classList.add("slider-line");
      this.slider.appendChild(this.sliderLine);
    }

    /**
     * Updates the visual state of the slider
     * Clips the after image and positions the slider line based on current percentage
     */
    updateSlider() {
      this.afterImage.style.clipPath = `inset(0 ${100 - this.percentage}% 0 0)`;
      this.sliderLine.style.left = `${this.percentage}%`;
    }

    /**
     * Sets up all event listeners for mouse/touch interactions
     * Prevents default drag behavior on images and stores initial percentage
     */
    attachEvents() {
      this.beforeImage.draggable = false;
      this.afterImage.draggable = false;

      this.addEvent(this.slider, "mousedown touchstart", this.handleDragStart);
      this.addEvent(this.slider, "mousemove touchmove", this.handleMove, { passive: false });
      this.addEvent(this.slider, "mouseenter", this.handleMouseEnter);
      this.addEvent(this.slider, "mouseleave", this.handleMouseLeave);
      this.addEvent(document, "mouseup touchend", this.handleDragEnd);
      this.addEvent(window, "resize", this.handleResize);

      this.slider.dataset.initialPercentage = this.slider.dataset.percentage || DEFAULT_PERCENTAGE;
    }

    // Helper method to attach multiple space-separated events to an element

    addEvent(element, events, handler, options = {}) {
      events.split(" ").forEach((event) => {
        element.addEventListener(event, handler, options);
      });
    }

    /**
     * Handles the start of a drag operation
     * Uses pointer capture API for better touch handling
     */
    handleDragStart(e) {
      e.preventDefault();
      this.isDragging = true;
      if (e.pointerId) this.slider.setPointerCapture(e.pointerId);
      this.handleMove(e);
    }

    /**
     * Processes mouse/touch movement to update slider position
     * Calculates percentage based on pointer position relative to slider width
     */
    handleMove(e) {
      if (e.type !== "mousemove" && !this.isDragging) return;
      e.preventDefault();

      const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
      const rect = this.slider.getBoundingClientRect();
      this.targetPercentage = ((clientX - rect.left) / rect.width) * 100;
      this.targetPercentage = Math.max(0, Math.min(100, this.targetPercentage));

      if (!this.isAnimating) {
        this.isAnimating = true;
        this.animate();
      }
    }

    // Mouse enter/leave handlers track hover state
    handleMouseEnter() {
      this.isHovering = true;
    }

    handleMouseLeave() {
      this.isHovering = false;
    }

    /**
     * Cleans up after drag operation ends
     * Releases pointer capture if it was being used
     */
    handleDragEnd(e) {
      this.isDragging = false;
      if (e.pointerId) this.slider.releasePointerCapture(e.pointerId);
    }

    /**
     * Smoothly animates the slider to a target percentage
     * Uses cubic easing for natural movement
     * @param {number} targetPercentage - Final slider position (0-100)
     * @param {number} duration - Animation duration in milliseconds
     */
    animateTo(targetPercentage, duration = 150) {
      const startPercentage = this.percentage;
      const change = targetPercentage - startPercentage;
      const startTime = performance.now();
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        this.percentage = startPercentage + change * easedProgress;
        this.slider.dataset.percentage = this.percentage;
        this.updateSlider();

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(this.animationFrame);
          this.animationFrame = null;
        }
      };

      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Ensures both before/after images are fully loaded before initialization
     * Uses requestAnimationFrame for efficient polling
     */
    waitForImages() {
      return new Promise((resolve) => {
        const checkImages = () => {
          const beforeLoaded = this.beforeImage.complete && this.beforeImage.naturalHeight !== 0;
          const afterLoaded = this.afterImage.complete && this.afterImage.naturalHeight !== 0;

          if (beforeLoaded && afterLoaded) {
            resolve();
          } else {
            requestAnimationFrame(checkImages);
          }
        };
        checkImages();
      });
    }

    /**
     * Displays an error message if images fail to load
     * Adds error message directly to slider container
     */
    displayError() {
      console.error("Error loading images for slider");
      this.slider.innerHTML += "<p style='color: red;'>Error loading images. Please refresh the page.</p>";
    }

    /**
     * Creates a debounced version of a function
     * Useful for handling resize events efficiently
     */
    debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    /**
     * Cleanup method to remove all event listeners
     * Should be called when slider instance is no longer needed
     */
    destroy() {
      this.removeEvent(this.slider, "mousedown touchstart", this.handleDragStart);
      this.removeEvent(this.slider, "mousemove touchmove", this.handleMove);
      this.removeEvent(this.slider, "mouseenter", this.handleMouseEnter);
      this.removeEvent(this.slider, "mouseleave", this.handleMouseLeave);
      this.removeEvent(document, "mouseup touchend", this.handleDragEnd);
      this.removeEvent(window, "resize", this.handleResize);
    }

    // Helper method to remove multiple space-separated events from an element
    removeEvent(element, events, handler) {
      events.split(" ").forEach((event) => {
        element.removeEventListener(event, handler);
      });
    }

    animate() {
      const easeAmount = 0.25;
      this.percentage = this.percentage + (this.targetPercentage - this.percentage) * easeAmount;

      this.lastPercentage = this.percentage;
      this.slider.dataset.percentage = this.percentage;
      this.updateSlider();

      // Continue animation if we haven't reached the target
      if (Math.abs(this.targetPercentage - this.percentage) > 0.01 && (this.isDragging || this.isHovering)) {
        requestAnimationFrame(() => this.animate());
      } else {
        this.isAnimating = false;
        // Snap to final position to avoid floating point imprecision
        if (!this.isDragging && !this.isHovering) {
          this.percentage = this.targetPercentage;
          this.updateSlider();
        }
      }
    }
  }

  /**
   * Creates Slider instances for all elements with class 'image-slider'
   * Stores slider instances on the DOM elements themselves
   */
  function initializeSliders() {
    console.log("Initializing sliders");
    const sliders = document.querySelectorAll(".image-slider");
    sliders.forEach((slider, index) => {
      console.log(`Initializing slider ${index + 1}`);
      slider.__slider = new Slider(slider);
    });
  }

  // Initialize sliders when window loads
  console.log("Window loaded, calling initializeSliders");
  initializeSliders();
});
