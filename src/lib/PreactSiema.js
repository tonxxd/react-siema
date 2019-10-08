import {h Component } from 'react';
import debounce from './utils/debounce';
import transformProperty from './utils/transformProperty';

class PreactSiema extends Component {
    

    events = [
        'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onMouseDown', 'onMouseUp', 'onMouseLeave', 'onMouseMove', 'onClick'
    ];

    constructor(props) {
        super();
        this.config = Object.assign({}, {
            resizeDebounce: 250,
            duration: 200,
            easing: 'ease-out',
            perPage: 1,
            startIndex: 0,
            draggable: true,
            threshold: 20,
            loop: false,
            onInit: () => {},
            onChange: () => {},
        }, props);

        this.events.forEach((handler) => {
            this[handler] = this[handler].bind(this);
        });
    }

    componentDidMount() {
        this.config.selector = this.selector;
        this.currentSlide = this.config.startIndex;

        this.init();

        this.onResize = debounce(() => {
            this.resize();
            this.slideToCurrent();
        }, this.config.resizeDebounce);

        window.addEventListener('resize', this.onResize);

        if (this.config.draggable) {
            this.pointerDown = false;
            this.drag = {
                startX: 0,
                endX: 0,
                startY: 0,
                letItGo: null
            };
        }
    }

    componentDidUpdate() {
        this.init();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize);
    }

    init() {
        this.setSelectorWidth();
        this.setInnerElements();
        this.resolveSlidesNumber();

        this.setStyle(this.sliderFrame, {
            width: `${(this.selectorWidth / this.perPage) * this.innerElements.length}px`,
            webkitTransition: `all ${this.config.duration}ms ${this.config.easing}`,
            transition: `all ${this.config.duration}ms ${this.config.easing}`
        });

        for (let i = 0; i < this.innerElements.length; i++) {
            this.setStyle(this.innerElements[i], {
                width: `${100 / this.innerElements.length}%`
            });
        }

        this.slideToCurrent();
        this.config.onInit.call(this);
    }

    setSelectorWidth() {
        this.selectorWidth = this.selector.getBoundingClientRect().width;
    }

    setInnerElements() {
        this.innerElements = [].slice.call(this.sliderFrame.children);
    }

    resolveSlidesNumber() {
        if (typeof this.config.perPage === 'number') {
            this.perPage = this.config.perPage;
        } else if (typeof this.config.perPage === 'object') {
            this.perPage = 1;
            for (let viewport in this.config.perPage) {
                if (window.innerWidth > viewport) {
                    this.perPage = this.config.perPage[viewport];
                }
            }
        }
    }

    prev(n = 1, callback) {
        if (this.currentSlide === 0 && this.config.loop) {
            this.currentSlide = this.innerElements.length - this.perPage;
        } else {
            this.currentSlide = Math.max(this.currentSlide - Number(n), 0);
        }
        this.slideToCurrent();
        this.config.onChange.call(this);
        
        if (typeof callback === 'function') {
            callback();
        }
    }

    next(n = 1, callback) {
        if (this.currentSlide === this.innerElements.length - this.perPage && this.config.loop) {
            this.currentSlide = 0;
        } else {
            this.currentSlide = Math.min(this.currentSlide + Number(n), this.innerElements.length - this.perPage);
        }
        this.slideToCurrent();
        this.config.onChange.call(this);

        if (typeof callback === 'function') {
            callback();
        }
    }

    goTo(index) {
        this.currentSlide = Math.min(Math.max(index, 0), this.innerElements.length - 1);
        this.slideToCurrent();
        this.config.onChange.call(this);
    }

    slideToCurrent() {
        this.sliderFrame.style[transformProperty] = `translate3d(-${Math.round(this.currentSlide * (this.selectorWidth / this.perPage))}px, 0, 0)`;
    }

    updateAfterDrag() {
        const movement = this.drag.endX - this.drag.startX;
        if (movement > 0 && Math.abs(movement) > this.config.threshold) {
            this.prev();
        } else if (movement < 0 && Math.abs(movement) > this.config.threshold) {
            this.next();
        }
        this.slideToCurrent();
    }

    resize() {
        this.resolveSlidesNumber();

        this.selectorWidth = this.selector.getBoundingClientRect().width;
        this.setStyle(this.sliderFrame, {
            width: `${(this.selectorWidth / this.perPage) * this.innerElements.length}px`
        });
    }

    clearDrag() {
        this.drag = {
            startX: 0,
            endX: 0,
            startY: 0,
            letItGo: null
        };
    }

    setStyle(target, styles) {
        Object.keys(styles).forEach((attribute) => {
            target.style[attribute] = styles[attribute];
        });
    }

    onTouchStart(e) {
        e.stopPropagation();
        this.pointerDown = true;
        this.drag.startX = e.touches[0].pageX;
        this.drag.startY = e.touches[0].pageY;
    }

    onTouchEnd(e) {
        e.stopPropagation();
        this.pointerDown = false;
        this.setStyle(this.sliderFrame, {
            webkitTransition: `all ${this.config.duration}ms ${this.config.easing}`,
            transition: `all ${this.config.duration}ms ${this.config.easing}`
        });
        if (this.drag.endX) {
            this.updateAfterDrag();
        }
        this.clearDrag();
    }

    onTouchMove(e) {
        e.stopPropagation();

        if (this.drag.letItGo === null) {
            this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX);
        }

        if (this.pointerDown && this.drag.letItGo) {
            this.drag.endX = e.touches[0].pageX;

            this.setStyle(this.sliderFrame, {
                webkitTransition: `all 0ms ${this.config.easing}`,
                transition: `all 0ms ${this.config.easing}`,
                [transformProperty]: `translate3d(${(this.currentSlide * (this.selectorWidth / this.perPage) + (this.drag.startX - this.drag.endX)) * -1}px, 0, 0)`
            });
        }
    }

    onMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        this.pointerDown = true;
        this.drag.start = e.pageX;
        this.wasDragged = false;
    }

    onMouseUp(e) {
        e.stopPropagation();
        this.pointerDown = false;
        this.setStyle(this.sliderFrame, {
            cursor: '-webkit-grab',
            webkitTransition: `all ${this.config.duration}ms ${this.config.easing}`,
            transition: `all ${this.config.duration}ms ${this.config.easing}`
        });
        if (this.drag.end) {
           // If drag.end has a value > 0, the slider has been dragged
           this.wasDragged = true;
           this.updateAfterDrag();
        }
        this.clearDrag();
    }

    onMouseMove(e) {
        e.preventDefault();
        if (this.pointerDown) {
            this.drag.endX = e.pageX;
            this.setStyle(this.sliderFrame, {
                cursor: '-webkit-grabbing',
                webkitTransition: `all 0ms ${this.config.easing}`,
                transition: `all 0ms ${this.config.easing}`,
                [transformProperty]: `translate3d(${(this.currentSlide * (this.selectorWidth / this.perPage) + (this.drag.startX - this.drag.endX)) * -1}px, 0, 0)`
            });
        }
    }

    onMouseLeave(e) {
        if (this.pointerDown) {
            this.pointerDown = false;
            this.drag.endX = e.pageX;
            this.setStyle(this.sliderFrame, {
                cursor: '-webkit-grab',
                webkitTransition: `all ${this.config.duration}ms ${this.config.easing}`,
                transition: `all ${this.config.duration}ms ${this.config.easing}`
            });
            this.updateAfterDrag();
            this.clearDrag();
        }
    }

    onClick(e) {
        if (!this.wasDragged && this.props.onClick) {
            this.props.onClick(e);
        }
    }

    render() {
        return (
            <div
                ref={(selector) => this.selector = selector}
                style={{ overflow: 'hidden' }}
                {...this.events.reduce((props, event) => Object.assign({}, props, { [event]: this[event] }), {})}
            >
                <div ref={(sliderFrame) => this.sliderFrame = sliderFrame}>
                    {React.Children.map(this.props.children, (children, index) =>
                        React.cloneElement(children, {
                            key: index,
                            style: { float: 'left' },
                            onClick: this.onClick,
                        })
                    )}
                </div>
            </div>
        );
    }
}

export default PreactSiema;
