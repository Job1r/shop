const doubleRAF = (f) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            f();
        });
    });
};

const capitalize = (str) => str[0].toUpperCase() + str.slice(1);

/**
 * Как юзать:
 * 1. Создаем объект модалки:
 * const modal = new Modal({
 *     triggers,                    // массив html-элементов, по нажатию на которые будет открываться модалка
       layout,                      // html-элемент - лэйаут модалки, то есть вместе с фоном
       closeTriggers,               // массив html-элементов, по нажатию на которые будет закрываться модалка
       closeOnBackground,           // флаг, должна ли закрываться модалка по нажатию на область вокруг модалки
       animationClasses,            // объект из двух названий css-классов - displayed и appear. Почему не один?
                                    // Потому что изначально модалка - display: none, и в данном случае анимация
                                    // не сработает. Поэтому при откытии модалки сначала добавляется класс displayed,
                                    // а затем в следующем кадре добавляется класс appear, который отвечает за анимцию
 * });
 *
 * 2. Сейчас объект модалки создан, но она не инициализирована, то есть слушатели на клики не подключены
 * Чтобы запустить логику открытия/закрытия, нужно вызвать:
 * modal.listen();
 * Можно остановить все слушатели (хотя хз зачем это может понадобиться), нужно вызвать:
 * modal.stopListen();
 *
 * 3. Помимо автоматического срабатывания по кликам, можно открыть, закрыть или изменить состояние
 * модалки (открыть, если закрыта или закрыть, если открыта) следующими методами соответственно:
 * modal.open();
 * modal.close();
 * modal.toggle();
 *
 * 4. Также можно обновить все поля модалки, при этом перезапуск всех слушателей
 * произойдет автоматически и при необходимости.
 * Поля можно обновить как по отдельности, так и разом, если нужно обновить сразу несколько полей (не обязательно все)
 * 4.1. Обновить сразу несколько полей:
 * modal.update({triggers, layout, closeTriggers, closeOnBackground, animationClasses});
 * Здесь аргументы такие же, как в конструкторе класса с одним отличием - все они необязательные.
 * 4.2. Обновить поля по отдельности:
 * modal.updateTriggers(triggers);      // обновляются триггеры, по клику на которые открывается модалка на новые
 * modal.addTriggers(triggers);         // добавляются новые триггеры. Если в переданных триггерах есть те, которые
 *                                      // уже используются в модалке, они будут смерджены корректно,
 *                                      // то есть два раза одного и того же триггера не будет
 * modal.removeTriggers(triggers);      // удаляются триггеры
 * modal.updateLayout(layout);          // обновляется лэйаут (хз, зачем это может понадобиться). То есть по сути
 *                                      // привязываем к триггерам другую модалку, но нужно не забыть поменять тригеры
 *                                      // закрытия модалки
 * modal.updateCloseTriggers(triggers); // то же самое,
 * modal.addCloseTriggers(triggers);    //              что и с обычными триггерами,
 * modal.removeCloseTriggers(triggers); //                                           только это с триггерами закрытия модалки
 * updateCloseOnBackground(closeOnBackground);  // обновляет флаг, должна ли закрываться модалка по клику на область вокруг нее
 * updateAnimationClasses(animationClasses);    // обновляет классы, которые добавляются/удаляются элементу модалки при появлении/скрытии модалки
 */
class Modal {
    /**
     * @type HTMLElement[]
     */
    #triggers;
    /**
     * @type HTMLElement
     */
    #layout;
    /**
     * @type HTMLElement[]
     */
    #closeTriggers;
    /**
     * @type boolean
     */
    #closeOnBackground;
    /**
     * @type {{display: string, appear: string}}
     */
    #animationClasses;
    /**
     * @type boolean
     */
    #isOpened;
    /**
     * @type boolean
     */
    #isListening;

    /**
     * @type string[]
     */
    static animationClassList = ['display', 'appear'];

    constructor({
        triggers = [],
        layout,
        closeTriggers = [],
        closeOnBackground = true,
        animationClasses: {
            display = 'displayed',
            appear = 'opened',
        } = {},
    }) {
        this.#triggers = triggers;
        this.#layout = layout;
        this.#closeTriggers = closeTriggers;
        this.#closeOnBackground = closeOnBackground;
        this.#animationClasses = {display, appear};
        this.#isOpened = false;
        this.#isListening = false;
    }

    open = () => {
        if (!this.#isOpened) {
            this.#layout.classList.add(this.#animationClasses.display);
            doubleRAF(() => this.#layout.classList.add(this.#animationClasses.appear));
            this.#isOpened = true;
        }
    }

    close = () => {
        if (this.#isOpened) {
            this.#layout.classList.remove(this.#animationClasses.appear);
            this.#layout.addEventListener('transitionend', () => {
                this.#layout.classList.add(this.#animationClasses.display);
            }, { once: true });
            this.#isOpened = false;
        }
    }

    toggle = () => {
        if (this.#isOpened) {
            this.close();
        } else {
            this.open();
        }
    }

    #closeOnBackgroundListener = (e) => {
        if (e.target === this.#layout) {
            this.close();
        }
    }

    #listenTrigger(trigger) {
        trigger.addEventListener('click', this.open);
    }
    #stopListenTrigger(trigger) {
        trigger.removeEventListener('click', this.open);
    }

    #listenBackgroundTrigger() {
        this.#layout.addEventListener('click', this.#closeOnBackgroundListener);
    }
    #stopListenBackgroundTrigger() {
        this.#layout.removeEventListener('click', this.#closeOnBackgroundListener);
    }

    #listenCloseTrigger(closeTrigger) {
        closeTrigger.addEventListener('click', this.close);
    }
    #stopListenCloseTrigger(closeTrigger) {
        closeTrigger.removeEventListener('click', this.close);
    }

    listen() {
        this.#triggers.forEach((trigger) => {
            this.#listenTrigger(trigger);
        });
        if (this.#closeOnBackground) {
            this.#listenBackgroundTrigger();
        }
        if (Array.isArray(this.#closeTriggers)) {
            this.#closeTriggers.forEach((closeTrigger) => {
                this.#listenCloseTrigger(closeTrigger);
            })
        }
        this.#isListening = true;
    }
    stopListen() {
        this.#triggers.forEach((trigger) => {
            this.#stopListenTrigger(trigger);
        });
        if (this.#closeOnBackground) {
            this.#stopListenBackgroundTrigger();
        }
        if (Array.isArray(this.#closeTriggers)) {
            this.#closeTriggers.forEach((closeTrigger) => {
                this.#stopListenCloseTrigger(closeTrigger);
            })
        }
        this.#isListening = false;
    }

    updateTriggers(triggers) {
        if (Array.isArray(triggers)) {
            const addedTriggers = triggers.filter((trigger) => !this.#triggers.includes(trigger));
            const removedTriggers = this.#triggers.filter((trigger) => !triggers.includes(trigger));
            if (this.#isListening) {
                removedTriggers.forEach((trigger) => {
                    this.#stopListenTrigger(trigger);
                });
            }
            this.#triggers = this.#triggers
                .filter((trigger) => !removedTriggers.includes(trigger))
                .concat(addedTriggers);
            if (this.#isListening) {
                addedTriggers.forEach((trigger) => {
                    this.#listenTrigger(trigger);
                });
            }
        }
    }
    addTriggers(triggers) {
        this.updateTriggers([...new Set(this.#triggers.concat(triggers))]);
    }
    removeTriggers(triggers) {
        this.updateTriggers(this.#triggers.filter((trigger) => triggers.includes(trigger)));
    }

    updateLayout(layout) {
        if (layout && layout !== this.#layout) {
            if (this.#closeOnBackground && this.#isListening) {
                this.#stopListenBackgroundTrigger();
            }
            this.#layout = layout;
            if (this.#closeOnBackground && this.#isListening) {
                this.#listenBackgroundTrigger();
            }
        }
    }

    updateCloseTriggers(closeTriggers) {
        if (Array.isArray(closeTriggers)) {
            const addedTriggers = closeTriggers.filter((closeTrigger) => !this.#closeTriggers.includes(closeTrigger));
            const removedTriggers = this.#closeTriggers.filter((closeTrigger) => !closeTriggers.includes(closeTrigger));
            if (this.#isListening) {
                removedTriggers.forEach((closeTrigger) => {
                    this.#stopListenCloseTrigger(closeTrigger);
                });
            }
            this.#closeTriggers = this.#closeTriggers
                .filter((closeTrigger) => !removedTriggers.includes(closeTrigger))
                .concat(addedTriggers);
            if (this.#isListening) {
                addedTriggers.forEach((closeTrigger) => {
                    this.#listenCloseTrigger(closeTrigger);
                });
            }
        }
    }
    addCloseTriggers(closeTriggers) {
        this.updateCloseTriggers([...new Set(this.#closeTriggers.concat(closeTriggers))]);
    }
    removeCloseTriggers(closeTriggers) {
        this.updateCloseTriggers(this.#closeTriggers.filter((closeTrigger) => closeTriggers.includes(closeTrigger)));
    }

    updateCloseOnBackground(closeOnBackground) {
        if (closeOnBackground !== undefined && Boolean(closeOnBackground) !== Boolean(this.#closeOnBackground)) {
            this.#closeOnBackground = Boolean(closeOnBackground);
            if (this.#isListening) {
                if (this.#closeOnBackground) {
                    this.#listenBackgroundTrigger();
                } else {
                    this.#stopListenBackgroundTrigger();
                }
            }
        }
    }

    updateAnimationClasses(animationClasses) {
        if (animationClasses) {
            Modal.animationClassList.forEach((animationClass) => {
                if (animationClasses[animationClass] && animationClasses[animationClass] !== this.#animationClasses[animationClass]) {
                    if (this.#isOpened) {
                        this.#layout.classList.remove(this.#animationClasses[animationClass]);
                        this.#layout.classList.add(animationClasses[animationClass]);
                    }
                    this.#animationClasses[animationClass] = animationClasses[animationClass];
                }
            });
        }
    }

    update({
        triggers,
        layout,
        closeTriggers,
        closeOnBackground,
        animationClasses,
    }) {
        this.updateTriggers(triggers);
        this.updateLayout(layout);
        this.updateCloseTriggers(closeTriggers);
        this.updateCloseOnBackground(closeOnBackground);
        this.updateAnimationClasses(animationClasses);
    }
}





/**
 * Как юзать:
 * 1. Создаем объект тултипа:
 * const tooltip = new Tooltip({
 *     trigger,                     // html-элемент, по наведению на который будет открываться тултип
       tooltip,                     // html-элемент - тултип, а точнее обертка тултипа, так как она содержит педдинг - отступ тултипа от триггера
       margin,                      // отступ тултипа от триггера - передается число
       offset,                      // сдвиг тултипа относительно триггера. Передается строка - значение в пикселях или процентах.
                                    // Например, '50%' или '30px'
       side,                        // сторона, с которой будет показан тултип. Возможные варианты в Tooltip.SIDES
       triangleSettings,            // объект настроек треугольника тултипа. Содержит 2 поля - sideWidth и theme.
                                    // Первый - это если представить, что треугольник равнобедренный, то это длина бедра треугольника
                                    // Второй - тема - это просто название темы. Треугольнику будет ставиться класс 'theme-{эта тема}'
                                    // и с помощью css можно задавать стили этого треугольника - цвет, z-index, тень, радиус и т.д.
       animationClasses,            // объект из двух названий css-классов - displayed и appear. Почему не один?
                                    // Потому что изначально тултип - display: none, и в данном случае анимация
                                    // не сработает. Поэтому при откытии тултипа сначала добавляется класс displayed,
                                    // а затем в следующем кадре добавляется класс appear, который отвечает за анимцию
 * });
 *
 * 2. Сейчас объект тултипа создан, но он не инициализирован, то есть слушатели на клики не подключены
 * Чтобы запустить логику открытия/закрытия, нужно вызвать:
 * tooltip.listen();
 * Можно остановить все слушатели (хотя хз зачем это может понадобиться), нужно вызвать:
 * tooltip.stopListen();
 *
 * 3. Помимо автоматического срабатывания по кликам, можно открыть, закрыть или изменить состояние
 * тултипа (открыть, если закрыт или закрыть, если открыт) следующими методами соответственно:
 * tooltip.open();
 * tooltip.close();
 * tooltip.toggle();
 *
 * 4. Также можно обновить все поля тултипа:
 * modal.update({animationClasses, margin, offset,side, triangleSettings});
 * Здесь аргументы такие же, как в конструкторе класса с двумя отличиями - 1 - нет trigger и tooltip, 2 - все аргументы необязательные.
 */
class Tooltip {
    /**
     * @type HTMLElement
     */
    #trigger;
    /**
     * @type HTMLElement
     */
    #tooltip;
    /**
     * @type {{display: string, appear: string}}
     */
    #animationClasses;
    /**
     * @type number
     */
    #margin;
    /**
     * @type ('left'|'top'|'right'|'bottom')
     */
    #side;
    /**
     * @type string
     */
    #offset;
    /**
     * @type boolean
     */
    #isOpened;
    /**
     * @type {{sideWidth: number, theme: string}}
     */
    #triangleSettings;
    /**
     * @type HTMLElement
     */
    #triangle;
    /**
     * @type HTMLElement
     */
    #triangleWrapper;
    /**
     * @type {{LEFT: string, TOP: string, RIGHT: string, BOTTOM: string}}
     */
    static SIDES = {LEFT: 'left', TOP: 'top', RIGHT: 'right', BOTTOM: 'bottom'};
    /**
     * @type {{[key: Tooltip.SIDES]: number}}
     */
    static TRIANGLE_ROTATE_MAP = {
        [Tooltip.SIDES.RIGHT]: 45,
        [Tooltip.SIDES.BOTTOM]: 135,
        [Tooltip.SIDES.LEFT]: 225,
        [Tooltip.SIDES.TOP]: 315,
    }
    /**
     * @type string[]
     */
    static animationClassList = ['display', 'appear'];

    constructor({
        trigger,
        tooltip,
        animationClasses: {
            display = 'displayed',
            appear = 'opened',
        } = {},
        margin = 18,
        offset = '50%',
        side = Tooltip.SIDES.RIGHT,
        triangleSettings: {
            sideWidth: triangleSideWidth = 15,
            theme: triangleTheme = 'default',
        } = {},
    }) {
        this.#trigger = trigger;
        this.#tooltip = tooltip;
        this.#side = side;
        this.#animationClasses = {display, appear};
        this.#margin = margin;
        this.#offset = offset;
        this.#isOpened = false;
        this.#triangleSettings = {
            sideWidth: triangleSideWidth,
            theme: triangleTheme,
        };
        this.#createTriangle();
        this.#setTooltipPosition();
    }

    #getPaddingSide = (currentSide = this.#side) => {
        switch (currentSide) {
            case Tooltip.SIDES.LEFT: return Tooltip.SIDES.RIGHT;
            case Tooltip.SIDES.TOP: return Tooltip.SIDES.BOTTOM;
            case Tooltip.SIDES.RIGHT: return Tooltip.SIDES.LEFT;
            case Tooltip.SIDES.BOTTOM: return Tooltip.SIDES.TOP;
        }
    }

    static setStyles = (target, styles) => {
        Object.entries(styles).forEach(([property, value]) => {
            target.style[property] = value;
        })
    }

    #createTriangle = () => {
        this.#triangleWrapper = document.createElement('div');
        this.#triangle = document.createElement('div');

        const diagonalWidth = Math.ceil(Math.sqrt(2 * (this.#triangleSettings.sideWidth ** 2)));
        const triangleWrapperStyle = {
            width: `${diagonalWidth}px`,
            height: `${diagonalWidth}px`,
            [this.#side]: `-${this.#margin}px`,
        };
        const triangleStyle = {
            width: `${this.#triangleSettings.sideWidth}px`,
            height: `${this.#triangleSettings.sideWidth}px`,
            transform: `rotate(${Tooltip.TRIANGLE_ROTATE_MAP[this.#side]}deg)`,
            [this.#side]: `-${this.#triangleSettings.sideWidth / 2}px`,
        }
        Tooltip.setStyles(this.#triangleWrapper, triangleWrapperStyle);
        Tooltip.setStyles(this.#triangle, triangleStyle);

        this.#triangleWrapper.classList.add('tooltip-triangle-wrapper');
        this.#triangle.classList.add('tooltip-triangle', `theme-${this.#triangleSettings.theme}`);

        this.#triangleWrapper.append(this.#triangle);
        this.#trigger.prepend(this.#triangleWrapper);
    }

    #setTooltipPosition = () => {
        const oppositeSide = this.#getPaddingSide();
        const offsetAxis = [Tooltip.SIDES.LEFT, Tooltip.SIDES.RIGHT].includes(this.#side) ? 'y' : 'x';

        const tooltipStyle = {
            [`padding${capitalize(oppositeSide)}`]: `${this.#margin}px`,
            [oppositeSide]: '100%',
            [offsetAxis === 'x' ? Tooltip.SIDES.LEFT : Tooltip.SIDES.TOP]: this.#offset.endsWith('%') ? this.#offset : '0',
            transform: `translate${capitalize(offsetAxis)}(-${this.#offset})`,
        }
        Tooltip.setStyles(this.#tooltip, tooltipStyle);
    }

    open = () => {
        if (!this.#isOpened) {
            this.#trigger.classList.add(this.#animationClasses.display);
            doubleRAF(() => {
                this.#trigger.classList.add(this.#animationClasses.appear);
                this.#triangleWrapper.style.opacity = '1';
            });
            this.#isOpened = true;
        }
    }

    close = () => {
        if (this.#isOpened) {
            this.#trigger.classList.remove(this.#animationClasses.appear);
            this.#triangleWrapper.style.opacity = '0';
            this.#tooltip.addEventListener('transitionend', () => {
                this.#trigger.classList.add(this.#animationClasses.display);
            }, { once: true });
            this.#isOpened = false;
        }
    }

    toggle = () => {
        if (this.#isOpened) {
            this.close();
        } else {
            this.open();
        }
    }

    listen() {
        this.#trigger.addEventListener('mouseenter', this.open);
        this.#trigger.addEventListener('mouseleave', this.close);
    }

    stopListen() {
        this.#trigger.removeEventListener('mouseenter', this.open);
        this.#trigger.removeEventListener('mouseleave', this.close);
    }

    update({
        animationClasses,
        margin,
        offset,
        side,
        triangleSettings: {
            sideWidth: triangleSideWidth,
            theme: triangleTheme,
        } = {},
    }) {
        if (animationClasses) {
            Tooltip.animationClassList.forEach((animationClass) => {
                if (animationClasses[animationClass] && animationClasses[animationClass] !== this.#animationClasses[animationClass]) {
                    if (this.#isOpened) {
                        this.#trigger.classList.remove(this.#animationClasses[animationClass]);
                        this.#trigger.classList.add(animationClasses[animationClass]);
                    }
                    this.#animationClasses[animationClass] = animationClasses[animationClass];
                }
            });
        }
        const changed = {
            margin: margin !== undefined && margin !== this.#margin,
            offset: offset !== undefined && offset !== this.#offset,
            side: side !== undefined && side !== this.#side,
            triangleSideWidth: triangleSideWidth !== undefined && triangleSideWidth !== this.#triangleSettings.sideWidth,
            triangleTheme: triangleTheme !== undefined && triangleTheme !== this.#triangleSettings.theme,
        }
        const tempValues = {
            margin: changed.margin ? margin : this.#margin,
            offset: changed.offset ? offset : this.#offset,
            side: changed.side ? side : this.#side,
            triangleSideWidth: changed.triangleSideWidth ? triangleSideWidth : this.#triangleSettings.sideWidth,
            triangleTheme: changed.triangleTheme ? triangleTheme : this.#triangleSettings.theme,
        }
        let triangleWrapperStyle, triangleStyle, tooltipStyle;
        if (changed.triangleSideWidth || changed.side || changed.margin) {
            const diagonalWidth = Math.ceil(Math.sqrt(2 * (tempValues.triangleSideWidth ** 2)));
            triangleWrapperStyle = {
                width: `${diagonalWidth}px`,
                height: `${diagonalWidth}px`,
                [this.#side]: 'initial',
                [tempValues.side]: `-${tempValues.margin}px`,
            };
        }
        if (changed.triangleSideWidth || changed.side) {
            triangleStyle = {
                width: `${tempValues.triangleSideWidth}px`,
                height: `${tempValues.triangleSideWidth}px`,
                transform: `rotate(${Tooltip.TRIANGLE_ROTATE_MAP[tempValues.side]}deg)`,
                [this.#side]: 'initial',
                [tempValues.side]: `-${tempValues.triangleSideWidth / 2}px`,
            }
        }

        if (changed.side || changed.margin || changed.offset) {
            const prevOppositeSide = this.#getPaddingSide();
            const oppositeSide = this.#getPaddingSide(tempValues.side);
            const prevOffsetAxis = [Tooltip.SIDES.LEFT, Tooltip.SIDES.RIGHT].includes(this.#side) ? 'y' : 'x';
            const offsetAxis = [Tooltip.SIDES.LEFT, Tooltip.SIDES.RIGHT].includes(tempValues.side) ? 'y' : 'x';
            tooltipStyle = {
                [`padding${capitalize(prevOppositeSide)}`]: 'initial',
                [`padding${capitalize(oppositeSide)}`]: `${tempValues.margin}px`,
                [prevOppositeSide]: 'initial',
                [prevOffsetAxis === 'x' ? Tooltip.SIDES.LEFT : Tooltip.SIDES.TOP]: 'initial',
                [oppositeSide]: '100%',
                [offsetAxis === 'x' ? Tooltip.SIDES.LEFT : Tooltip.SIDES.TOP]: tempValues.offset.endsWith('%') ? tempValues.offset : '0',
                transform: `translate${capitalize(offsetAxis)}(-${tempValues.offset})`,
            }
        }

        if (changed.triangleTheme) {
            this.#triangle.classList.remove(`theme-${this.#triangleSettings.theme}`);
            this.#triangle.classList.add(`theme-${tempValues.triangleTheme}`);
        }

        this.#margin = tempValues.margin;
        this.#offset = tempValues.offset;
        this.#side = tempValues.side;
        this.#triangleSettings.sideWidth = tempValues.triangleSideWidth;
        this.#triangleSettings.theme = tempValues.triangleTheme;

        if (triangleWrapperStyle) {
            Tooltip.setStyles(this.#triangleWrapper, triangleWrapperStyle);
        }
        if (triangleStyle) {
            Tooltip.setStyles(this.#triangle, triangleStyle);
        }
        if (tooltipStyle) {
            Tooltip.setStyles(this.#tooltip, tooltipStyle);
        }
    }
}


const triggerNotAuthorized = document.getElementsByClassName('modal-trigger-not-authorized')[0];
const layoutNotAuthorized = document.getElementsByClassName('modal-layout-not-authorized')[0];
const closeNotAuthorized = document.querySelector('.modal-layout-not-authorized .modal-close');
const openAuth = document.querySelector('.modal-layout-not-authorized .modal-open-auth');

const triggerAuth = document.getElementsByClassName('modal-trigger-auth')[0];
const triggerAuthMain = document.getElementsByClassName('modal-trigger-auth-main')[0];
const layoutAuth = document.getElementsByClassName('modal-layout-auth')[0];
const closeAuth = document.querySelector('.modal-layout-auth .modal-close');

const triggerAuth2 = document.getElementsByClassName('modal-trigger-auth-2')[0];
const layoutAuth2 = document.getElementsByClassName('modal-layout-auth-2')[0];
const closeAuth2 = document.querySelector('.modal-layout-auth-2 .modal-close');

const triggerBonus = document.getElementsByClassName('modal-trigger-bonus')[0];
const layoutBonus = document.getElementsByClassName('modal-layout-bonus')[0];
const closeBonus = document.querySelector('.modal-layout-bonus .modal-close');

const modals = {
    ...triggerNotAuthorized && layoutNotAuthorized && closeNotAuthorized && openAuth ? {
     notAuthorized: new Modal({
            triggers: [triggerNotAuthorized],
            layout: layoutNotAuthorized,
            closeTriggers: [closeNotAuthorized, openAuth],
        }),
    } : {},
    ...triggerAuth && triggerAuthMain && layoutAuth && closeAuth ? {
     auth: new Modal({
            triggers: [triggerAuth, triggerAuthMain],
            layout: layoutAuth,
            closeTriggers: [closeAuth],
        }),
    } : {},
       // auth2: new Modal({
       //     triggers: [triggerAuth2],
       //     layout: layoutAuth2,
       //     closeTriggers: [closeAuth2],
       // }),
       // bonus: new Modal({
       //     triggers: [triggerBonus],
       //     layout: layoutBonus,
       //     closeTriggers: [closeBonus],
       // }),
   };

Object.values(modals).forEach(modal => {modal.listen();});

const triggerBurger = document.getElementsByClassName('burger-trigger')[0];
const layoutBurger = document.getElementsByClassName('burger-layout')[0];

if (triggerBurger && layoutBurger) {
    const burger = new Modal({
        triggers: [triggerBurger],
        layout: layoutBurger,
    });
    burger.listen();
}

