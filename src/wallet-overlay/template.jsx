/* @flow */
/** @jsx node */
/* eslint max-lines: off, react/jsx-max-depth: off */

import { isIos, animate, noop, destroyElement, uniqueID, supportsPopups, type EventEmitterType, toCSS } from 'belter/src';
import { EVENT, CONTEXT } from 'zoid/src';
import { node, type ElementNode } from 'jsx-pragmatic/src';
import { LOGO_COLOR, PPLogo, PayPalLogo } from '@paypal/sdk-logos/src';
import type { ZalgoPromise } from 'zalgo-promise/src';

import { getContainerStyle, getSandboxStyle, CLASS } from './style';

export type WalletOverlayProps = {|
    context : $Values<typeof CONTEXT>,
    close : () => ZalgoPromise<void>,
    focus : () => ZalgoPromise<void>,
    event : EventEmitterType,
    frame : ?HTMLElement,
    prerenderFrame : ?HTMLElement,
    content? : void | {|
        windowMessage? : string,
        continueMessage? : string
    |},
    autoResize? : boolean,
    hideCloseButton? : boolean
|};

export function WalletOverlay({ context, close, focus, event, frame, prerenderFrame, content = {}, autoResize, hideCloseButton } : WalletOverlayProps) : ElementNode {
    console.log('Wallet_overlay_prerenderer_frame: ', prerenderFrame);
    console.log('Wallet_overlay_frame: ', frame);

    const uid = `paypal-overlay-${ uniqueID() }`;

    function closeWallet(e) {
        e.preventDefault();
        e.stopPropagation();
        close();
    }

    function focusWallet(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!supportsPopups()) {
            return;
        }

        if (isIos()) {
            // eslint-disable-next-line no-alert
            window.alert('Please switch tabs to reactivate the PayPal window');
        } else {
            focus();
        }
    }

    const setupAnimations = (name) => {
        return (el) => {
            const showContainer = () => animate(el, `show-${ name }`, noop);
            const hideContainer = () => animate(el, `hide-${ name }`, noop);
            event.on(EVENT.DISPLAY, showContainer);
            event.on(EVENT.CLOSE, hideContainer);
        };
    };

    const setupAutoResize = (el) => {
        event.on(EVENT.RESIZE, ({ width: newWidth, height: newHeight }) => {
            if (typeof newWidth === 'number') {
                el.style.width = toCSS(newWidth);
            }

            if (typeof newHeight === 'number') {
                el.style.height = toCSS(newHeight);
            }
        });
    };

    const outletOnRender = (el) => {
        setupAnimations('component')(el);
        if (autoResize) {
            setupAutoResize(el);
        }
    };

    let outlet;

    if (frame && prerenderFrame) {
        frame.classList.add(CLASS.COMPONENT_FRAME);
        prerenderFrame.classList.add(CLASS.PRERENDER_FRAME);

        prerenderFrame.classList.add(CLASS.VISIBLE);
        frame.classList.add(CLASS.INVISIBLE);

        event.on(EVENT.RENDERED, () => {
            prerenderFrame.classList.remove(CLASS.VISIBLE);
            prerenderFrame.classList.add(CLASS.INVISIBLE);

            frame.classList.remove(CLASS.INVISIBLE);
            frame.classList.add(CLASS.VISIBLE);

            setTimeout(() => {
                destroyElement(prerenderFrame);
            }, 1);
        });

        outlet = (
            <div class={ CLASS.OUTLET } onRender={ outletOnRender }>
                <node el={ frame } />
                <node el={ prerenderFrame } />
            </div>
        );
    }

    return (
        <div id={ uid } onRender={ setupAnimations('container') } class="paypal-wallet-sandbox">
            <style>{ getSandboxStyle({ uid }) }</style>

            <iframe title="PayPal Wallet Overlay" name={ `__paypal_wallet_sandbox_${ uid }__` } scrolling="no" class="paypal-wallet-sandbox-iframe">
                <html>
                    <body>
                        <div id={ uid } onClick={ focusWallet } class={ `paypal-overlay-context-${ context } paypal-wallet-overlay` }>
                            { !hideCloseButton && <a href='#' class="paypal-wallet-close" onClick={ closeWallet } aria-label="close" role="button" /> }
                            <div class="paypal-wallet-iframe-container">
                                { outlet }
                            </div>

                            <style>{ getContainerStyle({ uid }) }</style>
                        </div>
                    </body>
                </html>
            </iframe>
        </div>
    );
}
