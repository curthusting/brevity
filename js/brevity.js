/*
 * Brevity 1.0
 *
 * Curt Husting
 * Copyright 2013
 * Creative Commons Attribution-NonCommercial 4.0 International License
 *
*/

function Brevity( container, options )
{

  'use strict';

    // debug flag
    var debug = options.debug !== undefined ? options.debug : true;

    // utilities
    // simple no operation function
    var noop = function() {};
    // offload a functions execution
    var offload = function(fn) { setTimeout( fn || noop, 0 ) };

    // check browser capabilities
    var browser = {
        // is addEventListener available?
        addEventListener: !!window.addEventListener,
        // is this a touch device?
        touch: ( 'ontouchstart' in window ) || window.DocumentTouch && document instanceof DocumentTouch,
        // are transitions supported?
        transitions: (function(temp) {
            var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
            for ( var i in props ) if (temp.style[ props[i] ] !== undefined) return true;
            return false;
        })(document.createElement('brevity'))
    };

    // set container element if not specified
    if ( ! container ) container = document.getElementById( 'brevity' );

    // set the first level element
    var collection = container.children[0];

    // set up some variable names for future reference
    var
        // deck elements
        decks       = document.querySelectorAll('.deck'),
        deckCount   = decks.length,
        deckIndex,
        deck,
        // slide elements
        slides      = document.querySelectorAll('.slide'),
        slideCount  = slides.length,
        slideIndex,
        // dom elements
        body        = document.querySelector( 'body' ),
        win         = window,
        ratio       = options.ratio !== undefined ? options.ratio : 3, // px/ms for transition timing
        animating   = false,
        winW, winH;

    // set up nav items
    var navNext = document.querySelector( '.nav-next' ),
        navPrev = document.querySelector( '.nav-prev' ),
    // select nav elements
        navUp = document.querySelector( '.up' ),
        navDown = document.querySelector( '.down' ),
        navLeft = document.querySelector( '.left' ),
        navRight = document.querySelector( '.right' );

    // initialize the options object
    options = options || {};

    // do we want to slide to the next deck
    // when the last slide of the previous deck is active
    options.continuous = options.continuous !== undefined ? options.continuous : true;

    // which events should we implement
    options.touch = options.touch !== undefined ? options.touch : browser.touch;
    options.mouse = options.mouse !== undefined ? options.mouse : true;
    options.keyboard = options.keyboard !== undefined ? options.keyboard : true;

    // initialize new instance
    function init() {
        // check url for active slide / deck
        var hash = window.location.hash,
            indexH, indexV;

        // Attempt to parse the hash as an index
        var parts = hash.slice( 2 ).split( '/' );

        // if both deckIndex and slideIndex are available
        if ( parts[0] && parts[1] ) {
            // Read the index components of the hash
            // OR set to 0 / 0 if not present
            var deckIndex = parseInt( parts[0], 10 ) - 1 || 0,
                slideIndex = parseInt( parts[1], 10 ) - 1 || 0;

        } else {
            // if starting deck / slide is not specified, let's start from the beginning
            deckIndex = parseInt( options.startDeck - 1, 10 ) || 0;
            slideIndex = parseInt( options.startSlide - 1, 10 ) || 0;

        }

        // set up active deck
        decks['active'] = deckIndex;

        // add deck children elements to decks array
        for (var i = 0, el; el = decks[i]; i++) {
            // get children for given deck
            var children = el.querySelectorAll('.slide');
            // nest the children in the decks nodeList
            decks[i]['slides'] = children;

            // set up slideIndex for each deck
            decks[i]['slides']['active'] = i == deckIndex ? slideIndex : 0;

        }

        // call the required build functions
        Build.layout();
        Build.navigation();

        // add the event listeners
        Handle.events();

        // lets only implement what we need
        // even if specified, only implement touch if this is a touch device
        if ( options.touch && browser.touch )
        {
            Handle.touch();
        }
        else if ( options.mouse || options.keyboard )
        {
            if ( options.keyboard ) Handle.keyboard();
            if ( options.mouse ) Handle.mouse();
        }

        Display.navigateTo( deckIndex, slideIndex, 0 )

    }

    // kills existing instance
    function kill() {

    }

    var Build = {
        // build the layout
        layout : function() {
            // need to set these here for resize to re-trigger
            winW = window.innerWidth,
            winH = window.innerHeight;

            // add necessary styling to dom elements
            // @TODO update the styling to be inline, or remove existing css prior to adding new css
            var css = document.createElement( 'style' );
            css.type = 'text/css';

            // transition spped styling
            var horizSpeed = ".collection {\n-webkit-transition: all " + winW / ratio + "ms;\n-moz-transition: all " + winW / ratio + "ms;\n-o-transition: all " + winW / ratio + "ms;\ntransition: all " + winW / ratio + "ms;\n}";
            var vertSpeed = ".deck {\n-webkit-transition: all " + winH / ratio + "ms;\n-moz-transition: all " + winH / ratio + "ms;\n-o-transition: all " + winH / ratio + "ms;\ntransition: all " + winH / ratio + "ms;\n}";

            // container element styling
            var containerCSS = ".container {\nwidth: " + winW + "px;\nheight: " + winH + "px;\n}";
            // collection element styling
            var collectionCSS = ".collection {\nwidth: " + deckCount * winW + "px;\nheight: " + winH + "px;\n}";
            // deck element styling
            var deckCSS = ".deck {\nwidth: " + winW + "px;\n}";
            // slide element styling
            var slideCSS = ".slide {\nwidth: " + winW + "px;\nheight: " + winH + "px;\n}\n.bg-image {\nmin-width: " + winW + "px;\nmin-height: " + winH + "px;\n}";

            // individual deck element styling
            for (var i = 0, el; el = decks[i]; i++) {
                var n = parseInt( i + 1 );
                var left = parseInt( i * winW );

                // add individual height based on number of slides contained in the deck
                deckCSS = deckCSS+"\n"+".deck:nth-child(" + n + ") {\nheight: " + decks[i]['slides']['length'] * winH + "px;\ntop: 0;\n}";

                // lets do some cosmetic surgery on the individual slides as well
                for (var ii = 0, el; el = decks[i]['slides'][ii]; ii++) {
                    var nn = parseInt( ii + 1 );
                    var top = parseInt( ii * winH );
                    // append the css on a per slide basis
                    slideCSS = slideCSS+"\n"+".deck:nth-child(" + n + ") .slide:nth-child(" + nn + ") {\ntop: " + top + "px;\n}";
                }

            }

            // append dynamically created css rules
            css.innerHTML = horizSpeed+'\n'+vertSpeed+'\n'+containerCSS+'\n'+collectionCSS+'\n'+deckCSS+'\n'+slideCSS;
            document.head.appendChild(css);

        },

        // dynamically add the navigation
        navigation : function() {
            /*
            */

        }

    }

    var Handle = {
        //  generic events
        events : function() {
            // Navigation click elements
            // up
            Handle.navClick( navUp, 'up' );

            // down
            Handle.navClick( navDown, 'down' );

            // left
            Handle.navClick( navLeft, 'left' );

            // right
            Handle.navClick( navRight, 'right' );

            // throttled window resize listener
            var resizeEnd;
            window.onresize = function() {
                // set up a timout trigger
                clearTimeout( resizeEnd );

                // check to see if window size has changed based on supplied interval
                resizeEnd = setTimeout(function() {
                    // refresh the Build.layout()
                    Build.layout();
                    // update the positions
                    Display.navigateTo( deckIndex, slideIndex );

                }, 250);

            };

        },

        // nav click
        navClick : function( el, direction ) {
            // add standard click event listener
            el.addEventListener( 'click', function( ev ) {
                ev.preventDefault();
                Display.navigate( direction, true );
            });

        },

        // keyboard events
        keyboard : function() {
            // add event listener
            document.addEventListener( 'keydown', function( ev )
            {
                var keyCode = ev.keyCode || ev.which;
                if ( debug ) console.log('key pressed ~ '+ ev.key +' - '+ keyCode);
                switch(keyCode) {
                    // left arrow
                    case 37:
                        // prevent default scrolling
                        ev.preventDefault();

                        Display.navigate( 'left', true );
                        break;

                    // up arrow
                    case 38:
                        // prevent default scrolling
                        ev.preventDefault();

                        Display.navigate( 'up', true );
                        break;

                    // right arrow
                    case 39:
                        // prevent default scrolling
                        ev.preventDefault();

                        Display.navigate( 'right', true );
                        break;

                    // down arrow
                    case 40:
                        // prevent default scrolling
                        ev.preventDefault();

                        Display.navigate( 'down', true );
                        break;

                    // space
                    case 32:
                        Display.navigate( 'down', true );
                        break;

                    // page up
                    case 33:
                        Display.navigate( 'up', true );
                        break;

                    // page down
                    case 34: Display.navigate( 'down', true );
                        break;

                    // home
                    case 36:
                        Display.navigateTo( 0, 0, 0 );
                        break;

                    // end
                    case 35:
                        // determine last deck & last slide index
                        var lastDeck = parseInt( decks.length - 1 );
                        var lastSlide = parseInt( decks[deckIndex]['slides'].length - 1 );

                        Display.navigateTo( lastDeck, lastSlide, 0 );
                        break;

                    // f
                    case 70:
                        Display.fullscreen();
                        break;

                    // o
                    case 79:
                    // esc
                    case 27:
                        Display.overview();
                        break;

                    // g
                    case 71:
                        Display.grid();
                        break;

                    // enter
                    case 13:
                        // if we are in overview mode, assume they are trying to activate current slide
                        if ( classie.hasClass( container, 'overview' ) )
                        {
                            Display.overview()
                        }
                        // if we are in grid mode, assume they are trying to activate current slide
                        else if ( classie.hasClass( container, 'grid' ) )
                        {
                            Display.grid()
                        }
                        else
                        {
                            // navigate to the nest slide
                            Display.navigate( 'down', true );
                        }
                        break;

                    default:
                        console.error('What did you do, Ray? Unsupported key pressed ~ '+ ev.key +' - '+ keyCode);
                        break;
                }
            })

        },

        // mouse events
        mouse : function() {
            // set up mousewheel event cross browser
            var mousewheelEvent = ( /Firefox/i.test( navigator.userAgent ) ) ? "DOMMouseScroll" : "mousewheel";
            // add event listener
            window.addEventListener( mousewheelEvent, function ( ev )
            {
                // let not waste any time
                if ( animating ) return;

                // boooooooring mousewheel event data
                var delta = 0;
                if (!ev) ev = window.event;

                // a little math to unify delta value
                if (ev.wheelDelta)
                {
                    delta = ev.wheelDelta/120;
                    if (window.opera) delta = -delta;

                }
                else if (ev.detail)
                {
                    delta = -ev.detail/3;
                }

                // based on delta value, handle accordingly
                if (delta)
                {
                    // scrolling down
                    if (delta < 0)
                    {
                        Display.navigate( 'down', true );

                    }
                    // scrolling up
                    else
                    {
                        Display.navigate( 'up', true );

                    }
                }
            })

        },

        // touch events
        touch : function() {
            var
                activeDeck,
                // prep for touch
                fingerCount     = 0,

                startX          = 0,
                startY          = 0,
                curX            = 0,
                curY            = 0,

                startT          = 0,
                diffT           = 0,
                curT            = 0,

                // the shortest distance the user may swipe to trigger actions
                minLength       = 20,

                lockDirection   = false,

                remaining       = 0,
                speed           = 0;
            //
            window.addEventListener( 'touchstart', function ( ev )
            {
                if ( animating ) return;

                // get the total number of fingers touching the screen
                fingerCount =  ev.touches.length;
                // since we're looking for a swipe (single finger) and not a gesture (multiple fingers),
                // check that only one finger was used
                if ( fingerCount == 1 )
                {
                    // get the coordinates
                    startX =  ev.touches[0].pageX;
                    startY =  ev.touches[0].pageY;

                    // set timestamp for start
                    startT = +Date.now();

                }
                else
                {
                    // more than one finger touched so cancel
                    touchCancel( ev );
                }

            })

            window.addEventListener( 'touchmove', function ( ev )
            {
                // let's not waste time
                if ( animating ) return;
                // check that only one finger was used
                if ( ev.touches.length == 1 ) {
                    // get the coordinates
                    curX = ev.touches[0].pageX;
                    curY = ev.touches[0].pageY;
                    // get timestamp
                    curT = +Date.now();

                    // calculate touch duration
                    diffT = curT - startT;

                    // calculate touch distance
                    var distance = {
                        x : startX - curX,
                        y : startY - curY

                    };

                    // disable the event default
                    ev.preventDefault();

                    // Lets make sure the user have surpassed the minLength
                    if ( Math.abs( distance.x ) < minLength && Math.abs( distance.y ) < minLength ) return false;

                    // determine if the user is swiping the "x" or "y" axis
                    if ( Math.abs( distance.x ) > Math.abs( distance.y ) )
                    {
                        // make sure we aren't already interaction on the opposite axis
                        // OR if we have already determined the axis
                        if ( ! lockDirection || lockDirection == 'right' || lockDirection == 'left' )
                        {
                            // handle the realtime animation
                            Display.move( -( distance.x ), 0 )
                            remaining = winW - Math.abs( distance.x );

                            // determine which direction on the "x" axis
                            // swiping from right to left
                            if ( distance.x > 0 )
                            {
                                // lock direction to avoid users touching in a circular motion
                                lockDirection = 'right';

                            }
                            // swiping from left to right
                            else if ( distance.x < 0 )
                            {
                                // lock direction to avoid users touching in a circular motion
                                lockDirection = 'left';

                            }
                        }

                    }
                    else
                    {
                        // make sure we aren't already interaction on the opposite axis
                        // OR if we have already determined the axis
                        if ( ! lockDirection || lockDirection == 'down' || lockDirection == 'up' )
                        {
                            // handle the realtime animation
                            Display.move( 0, -(distance.y) )
                            remaining = winH - Math.abs( distance.y );

                            // determine which direction on the "y" axis
                            // swiping from top to bottom
                            if ( distance.y > 0 )
                            {
                                // lock direction to avoid users touching in a circular motion
                                lockDirection = 'down';

                            }
                            // swiping from bottom to top
                            else if ( distance.y < 0 )
                            {
                                // lock direction to avoid users touching in a circular motion
                                lockDirection = 'up';

                            }

                        }

                    }

                } else {
                    // rest all variables
                    touchCancel( ev );
                }

            })

            window.addEventListener( 'touchend', function ( ev )
            {
                // lets make sure a direction has been set
                if ( ! lockDirection ) return;

                // set the speed for the animation
                speed = remaining / ratio;
                // handle the remaining navigation
                Display.navigate( lockDirection, speed );

                // rest all variables
                touchCancel( ev );

            })

            window.addEventListener( 'touchcancel', function ( ev )
            {
                // rest all variables
                touchCancel( ev );

            })

            function touchCancel()
            {
                // reset the variables back to default values
                fingerCount     = 0,
                startX          = 0,
                startY          = 0,
                startT          = 0,
                diffT           = 0,
                curX            = 0,
                curY            = 0,
                curT            = 0,
                minLength       = 20,
                lockDirection   = false,
                remaining       = 0,
                speed           = 0;

            }

        }

    }

    var Display = {
        // navigate based on specified direction
        navigate : function( direction, speed ) {
            // lets not waste any time
            if ( ! direction || animating ) {
                if ( debug ) console.error( direction, animating );
                return;
            }

            // handle passed direction accordingly
            switch( direction ) {
                case 'up':
                    // lets check to see if the active slide is the first deck
                    if ( ! slideIndex ) {
                        // this is the first slide in the active deck, handle accordingly
                        if ( ! options.touch && options.continuous ) {
                            // since this is the first slide, lets attempt to take them to the previous deck
                            direction = 'left';

                        } else {
                            // bounce layout similar to touch?

                            // nothing else to do here, this is the first slide
                            direction = 'none';
                            // clear animating flag
                            animating = false;

                        }

                    } else {
                        // decrement the slideIndex
                        slideIndex--

                    }

                    // conditionally break here just in case we over wrote the direction based on first
                    if ( direction == 'up' || direction == 'none' ) break;

                case 'left':
                    // lets check to see if the active deck is the first deck
                    if ( ! deckIndex ) {
                        // bounce layout similar to touch?

                        // nothing else to do here, this is the first deck
                        direction = 'none';
                        // clear animating flag
                        animating = false;

                    } else {
                        // decrement the deckIndex
                        deckIndex--
                        // update the slide index to match the active deck
                        slideIndex = decks[deckIndex]['slides']['active'];

                    }

                    // conditionally break here just in case we over wrote the direction based on first
                    if ( direction == 'left' || direction == 'none' ) break;

                case 'down':
                    // lets check to see if the active slide is the last deck
                    if ( slideIndex ==  decks[deckIndex]['slides'].length-1 ) {
                        // this is the last slide in the active deck, handle accordingly
                        if ( ! options.touch && options.continuous ) {
                            // since this is the last slide, lets attempt to take them to the next deck
                            direction = 'right';

                        } else {
                            // bounce layout similar to touch?

                            // nothing else to do here, this is the last slide
                            direction = 'none';
                            // clear animating flag
                            animating = false;

                        }

                    } else {
                        // increment slideIndex
                        slideIndex++

                    }

                    // conditionally break here just in case we overwrote the direction based on last
                    if ( direction == 'down' || direction == 'none' ) break;

                case 'right':
                    // lets check to see if the active deck is the last deck
                    if ( deckIndex == decks['length']-1 ) {
                        // bounce layout similar to touch?

                        // nothing else to do here, this is the last deck
                        direction = 'none';
                        // clear animating flag
                        animating = false;

                    } else {
                        // increment slideIndex
                        deckIndex++
                        // update the slide index to match the active deck
                        slideIndex = decks[deckIndex]['slides']['active'];

                    }

                    // conditionally break here just in case we overwrote the direction based on last
                    if ( direction == 'right' || direction == 'none' ) break;

                default:
                    if ( debug ) console.error('What did you do Ray? Invalid direction supplied ~ ' + direction);
                    // clear the animating flag to allow more interaction
                    animating = false;
                    break;

            }
            // handle the navigation
            Display.navigateTo( deckIndex, slideIndex, speed );

        },

        // navigate to specified x, y index
        navigateTo : function( x, y, speed ) {
            // calculate actual distance based on deckIndex / slideIndex
            var distX = -x * winW;
            var distY = -y * winH;

            // update the active deck and slide
            deckIndex = x;
            decks['active'] = deckIndex;
            slideIndex = y;
            decks[deckIndex]['slides']['active'] = slideIndex;

            // update the #/ url
            var h = parseInt( deckIndex + 1 ) ? parseInt( deckIndex + 1 ) : 1;
            var v = parseInt( slideIndex + 1 ) ? parseInt( slideIndex + 1 ) : 1;

            var url = '/';

            // Use the /h/v index
            if ( h > 0 || v > 0 ) url += h;
            if ( v > 0 ) url += '/' + v;

            // update the hash
            window.location.hash = url;

            // update the DOM object
            decks['active'] = deckIndex;
            decks[deckIndex]['slides']['active'] = slideIndex;

            // handle the movement
            Display.translate( distX, distY, speed );

        },

        // move by distance on x, y axis
        move : function( x, y ) {
            //calculate appropriate distance
            var distX = -deckIndex * winW + x;
            var distY = -slideIndex * winH + y;

            // handle the movement
            Display.translate( distX, distY, 0 );

        },

        translate : function( distX, distY, speed ) {
            // set the animating flag to true
            animating = true;

            // get existing active deck
            var active = document.querySelector( '.active' );
            // remove active class
            if ( active ) classie.removeClass( active, 'active' );

            // get existing current slide
            var current = document.querySelector( '.current' );
            // remove active class
            if ( current ) classie.removeClass( current, 'current' );

            // get the active deck
            var Decks = document.querySelectorAll( '.deck' );
            deck = Decks[deckIndex];

            // get the current slide
            var slide = deck.children[slideIndex];

            // add active class
            classie.addClass( deck, 'active' );
            // add active class
            classie.addClass( slide, 'current' );
            // classie.addClass( slide, 'animate' );

            // up and down = deck
            // handle the deck positioning
            deck.style.transform =
            deck.style.webkitTransform = 'translate(0, ' + distY + 'px)' + 'translateZ(0)';
            deck.style.msTransform =
            deck.style.MozTransform =
            deck.style.OTransform = 'translateY(' + distY + 'px)';

            // don't forget to overwirte the default transition duration to 0 so it's not choppy
            if ( ! speed ) {
                deck.style.transitionDuration = '0ms';
                deck.style.webkitTransitionDuration =
                deck.style.msTransitionDuration =
                deck.style.MozTransitionDuration =
                deck.style.OTransitionDuration = '0ms';

            // make sure we didn't attempt to modify duration
            } else if ( speed && speed > 0 ) {
                deck.style.transitionDuration = speed + 'ms';
                deck.style.webkitTransitionDuration =
                deck.style.msTransitionDuration =
                deck.style.MozTransitionDuration =
                deck.style.OTransitionDuration = speed + 'ms';

            }

            // clear the animating flag to allow more interaction
            deck.addEventListener( 'transitionend', function( ev ) {
                Display.clearAnimation();
            }, false );

            // left and right = collection
            // handle collection positioning
            collection.style.transform =
            collection.style.webkitTransform = 'translate(' + distX + 'px, 0)' + 'translateZ(0)';
            collection.style.msTransform =
            collection.style.MozTransform =
            collection.style.OTransform = 'translateX(' + distX + 'px)';

            // don't forget to overwirte the default transition duration to 0 so it's not choppy
            if ( ! speed ) {
                collection.style.transitionDuration = '0ms';
                collection.style.webkitTransitionDuration =
                collection.style.msTransitionDuration =
                collection.style.MozTransitionDuration =
                collection.style.OTransitionDuration = '0ms';

            // make sure we didn't attempt to modify duration
            } else if ( speed && speed > 0 ) {
                collection.style.transitionDuration = speed + 'ms';
                collection.style.webkitTransitionDuration =
                collection.style.msTransitionDuration =
                collection.style.MozTransitionDuration =
                collection.style.OTransitionDuration = speed + 'ms';

            }

            // clear the animating flag to allow more interaction
            collection.addEventListener( 'transitionend', function( ev ) {
                Display.clearAnimation();
            }, false );

            // need a few extra checks to ensure animation flag is cleared and inline css is reset
            if ( ! speed ) Display.clearAnimation();
            if ( ! distY || ! distX ) Display.clearAnimation();

            //
            if ( ! slideIndex ) {
                //
                if ( ! deckIndex ) {
                    //
                    navPrev.style.display = 'none';
                    navLeft.style.display = 'none';
                    navUp.style.display = 'none';

                } else {
                    //
                    navPrev.style.display = '';
                    navLeft.style.display = '';
                    navUp.style.display = 'none';

                }

            } else {
                //
                navPrev.style.display = '';
                navLeft.style.display = 'none';
                navUp.style.display = '';

            };

            //
            if ( slideIndex == decks[deckIndex]['slides']['length']-1 ) {
                //
                if ( deckIndex == decks['length']-1 ) {
                    //
                    navNext.style.display = 'none';
                    navRight.style.display = 'none';
                    navDown.style.display = 'none';

                } else {
                    //
                    navNext.style.display = '';
                    navRight.style.display = '';
                    navDown.style.display = 'none';

                }

            } else {
                //
                navNext.style.display = '';
                navRight.style.display = 'none';
                navDown.style.display = '';

            };

        },

        clearAnimation : function() {
            // reset the animation duration
            deck.style.transitionDuration = '';
            deck.style.webkitTransitionDuration =
            deck.style.msTransitionDuration =
            deck.style.MozTransitionDuration =
            deck.style.OTransitionDuration = '';
            collection.style.transitionDuration = '';
            collection.style.webkitTransitionDuration =
            collection.style.msTransitionDuration =
            collection.style.MozTransitionDuration =
            collection.style.OTransitionDuration = '';

            // reset the animatig flag
            animating = false;

        },

        /**
         * Handling the fullscreen functionality via the fullscreen API
         *
         * @see http://fullscreen.spec.whatwg.org/
         * @see https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
         */
        fullscreen : function()
        {
            var element = document.body;

            // Check which implementation is available
            var requestMethod = element.requestFullScreen ||
                                element.webkitRequestFullscreen ||
                                element.webkitRequestFullScreen ||
                                element.mozRequestFullScreen ||
                                element.msRequestFullScreen;

            if ( requestMethod )  requestMethod.apply( element );

        },

        //
        overview : function()
        {
            //
            classie.toggleClass( container, 'overview' );

        },

        //
        grid : function()
        {
            //
            classie.toggleClass( container, 'grid' );

        }

    }

    // initialize
    init();

    return {
        // init
        init: function() {

            init();

        },

        // reload
        reload : function() {

            kill();

            init();

        },

        // navigate
        navigate : function( direction ) {

            Display.navigate( direction );

        },

        // navigate to
        navigateTo : function( x, y, speed ) {

            Display.navigateTo( x, y, speed );

        },

        // prev
        prev : function(  ) {

            Display.navigate( 'up' );

        },

        // next
        next : function(  ) {

            Display.navigate( 'down' );

        },


    }

    // helper functions
    // add css rules to document instead of inline
    function addCSS( sheet, selector, rules, index ) {
        if ( sheet.insertRule ) {
            sheet.insertRule(selector + '{' + rules + '}', index);
        }
        else {
            sheet.addRule(selector, rules, index);
        }
    }

}

/*!
* classie - class helper functions
* from bonzo https://github.com/ded/bonzo
*
* classie.has( elem, 'my-class' ) -> true/false
* classie.add( elem, 'my-new-class' )
* classie.remove( elem, 'my-unwanted-class' )
*/

/*jshint browser: true, strict: true, undef: true */

( function( window ) {

'use strict';

    // class helper functions from bonzo https://github.com/ded/bonzo
    function classReg( className ) {
        return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
    }

    // classList support for class management
    // altho to be fair, the api sucks because it won't accept multiple classes at once
    var hasClass, addClass, removeClass, toggleClass;

    if ( 'classList' in document.documentElement ) {
        hasClass = function( elem, c ) {
            return elem.classList.contains( c );
        };
        addClass = function( elem, c ) {
            elem.classList.add( c );
        };
        removeClass = function( elem, c ) {
            elem.classList.remove( c );
        };
    }
    else {
        hasClass = function( elem, c ) {
            return classReg( c ).test( elem.className );
        };
        addClass = function( elem, c ) {
            if ( !hasClass( elem, c ) ) {
                elem.className = elem.className + ' ' + c;
            }
        };
        removeClass = function( elem, c ) {
            elem.className = elem.className.replace( classReg( c ), ' ' );
        };
        toggleClass = function( elem, c ) {
            hasClass( elem, c ) ? elem.classList.remove( c ) : elem.classList.add( c );
        };
    }
    toggleClass = function( elem, c ) {
        hasClass( elem, c ) ? removeClass( elem, c ) : addClass( elem, c );
    };

    window.classie = {
        // full names
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        toggleClass: toggleClass,
        // short names
        has: hasClass,
        add: addClass,
        remove: removeClass,
        toggle: toggleClass
    };

})( window );

if ( window.jQuery || window.Zepto ) {
    (function($) {
        $.fn.Brevity = function( params ) {
            return this.each(function() {
                $(this).data( 'Brevity', new Brevity( $(this)[0], params ) );
            });
        }
    })( window.jQuery || window.Zepto )
}
